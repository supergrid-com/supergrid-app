# One repo, one Worker per workspace

> A plan, not a reference. Written 2026-11-03 on the `workspace-monorepo` branch. It replaces "one Worker and one git repo
> per app" with "one repo and one Worker per workspace, apps as folders", adds installing and updating apps that other
> people build, puts admin-only tools in a second repo that runs on the Mac, and raises the desktop's Dev switch to a
> top-level Live / Dev mode. The in-app docs in `core/docs` still
> describe today's system; they are rewritten when the code lands.
>
> **Status 2026-11-03: step 1 of §11 is built and proven.** `@supergrid/workspace/worker` exports `createWorkspaceWorker`
> (core/workspace/src/compose.ts, registry.ts, router.ts); `@supergrid/app-kit/generate` and `/compose` are the generate
> step and the route composition; `core/templates/workspace` and `core/templates/app` are the two templates;
> `sg ws new | add | generate` make and maintain a repo. The test workspace at `dev/ws` (two apps, `notes` at /notes and
> `site` at /site with `/` as its home) runs locally on `pnpm dev` and is deployed as `sgdev-ws-w2nqwt` on the test
> account: public pages, admin screens behind the handoff, operations and MCP per app, and both apps' migrations through
> the ledger, all from one Worker. Things learned on the way are in §13.
>
> **Step 2 is built (2026-11-03).** The desktop (`app/`) works on a workspace repo: provisioning scaffolds
> `workspaces/<id>` from the template, builds it and deploys that build; opening a workspace finds or makes the repo; New
> App is `scaffoldAppFolder` plus a regenerate; one `react-router dev` per workspace; Deploy is one upload
> (`deployWorkspace` in `@supergrid/cloud`); Live / Dev sits in the title bar and is the mode the agent's tools read; the
> Code section (Files by app, Git, Server, Deploys) shows in Dev; the Database section reads the local D1 in Dev through
> the dev-only `/_ws/dev/sql`. The "local dev workspace" special case, `core/template`, `createAppWorker`, the per-app
> dev server and `installLocalApp`'s use are gone; `core/workspace/src/index.ts` (the router over service bindings) is
> still there until the old test Workers are deleted.

---

## 1. The decision

Two things were being decided as one: **where the code lives** (a repo per app, or one repo with `apps/<id>/` folders)
and **what gets deployed** (a Worker per app, or one Worker per workspace). They are separate. The desktop already keeps
`workspaces/<id>/apps/*` as one pnpm workspace on disk, so the repo side is nearly there; the deploy unit is the real change.

| | Today | After |
|---|---|---|
| Code | one git repo per app, cloned into `workspaces/<id>/apps/<app>` | one git repo per workspace; apps are folders under `apps/` |
| Workers | `sg-ws-<id>` + one `sg-app-<id>-<app>` per app, joined by a service binding and a route table | `sg-ws-<id>` only |
| Database | one D1, tables prefixed `app_<id>_` | the same |
| Shared code | packages published into the pnpm workspace, bundled per Worker, "stale consumer" bookkeeping | direct imports; nothing to publish, nothing goes stale |
| Cross-app server code | RPC over bindings, or a copy of the package per Worker | an import |
| Deploy | per app, plus a rewrite of the workspace's route table | one upload, atomic; rollback is one command |
| Updates from outside | signed release of a whole app repo | a folder-scoped merge from the app's upstream, gated (§6) |
| Dev | one Vite server per app, each hosting a copy of the workspace Worker | one Vite server for the workspace |

**Why one Worker.** Everything that cuts across apps (access and entitlements, sessions, theme, nav, search, the agent's
tools) is middleware-shaped and wants one process. The product's unit of trust is the Cloudflare account, and the person
installing apps also owns the account and the agent that reads every line. One Worker per workspace also keeps an agency
with thirty client workspaces under the account's Worker limit; today that is 1 + N Workers each.

**What stays exactly as designed.** The app folder (`supergrid.app.json`, `app/routes/{public,admin,api}`, `migrations/`,
`packages/`), the manifest and its data declaration, operations with their REST and MCP surfaces, the table prefix rule,
the admin layer and the admin SDK, the sitemap owning mounts, events and hooks. The manifest stops being a deploy
descriptor and becomes a registry entry the build reads.

**What this gives up, and the answer.**

- A broken app fails the whole build → an app can be `disabled` in the workspace file (§2) and drops out of the generated
  tree; the agent quarantines instead of blocking.
- The server bundle has a size limit (10 MB compressed on paid plans) → route modules are already split; heavy server-only
  code behind `import()`; the build reports the compressed size and warns at 7 MB. Measure once five or six real apps exist.
- Per-app secrets become Worker-wide → the workspace's `secrets` table, namespaced by app id, is the place for an app's
  keys; wrangler secrets stay for the workspace's own.
- A third-party app's code runs with everything's access → §7.

---

## 2. The workspace repo

```
workspaces/<id>/                         one git repo, one pnpm workspace
  supergrid.workspace.json               id, name, contract, apps: [{ id, disabled? }], mounts handed to the sitemap at first deploy
  supergrid.lock.json                    per app: upstream, version, commit or tree hash, state (managed | modified | forked), installed at
  package.json, pnpm-workspace.yaml      apps/*, apps/*/packages/*, shared/*
  wrangler.jsonc                         sg-ws-<id>, DB, queues, assets; no per-app bindings
  app/                                   the workspace's own React Router app: root layout, /_ws, /admin shell, the generated routes
  workers/index.ts                       createWorkspaceWorker(registry)
  .sg/                                   generated, committed: apps.ts (the registry), routes.ts, migrations.ts, operations.ts
  shared/                                the kits the template copies into every app today (components/ui, components/admin), once
  apps/
    notes/                               the app folder, exactly today's layout minus the Worker glue
      supergrid.app.json
      app/routes.ts                      exports { public, admin, api } route lists, relative
      app/routes/{public,admin,api}/
      migrations/
      packages/                          what the app hands to other apps (optional)
      CHANGELOG.md
```

The repo is created by the desktop from a `core/workspace-template` when a workspace is provisioned, and cloned when
a teammate opens a workspace that already exists (the repo's remote is the org's git host, or none: the desktop can keep
it local-only and still deploy). `core/template` becomes the template for an **app folder**; `wrangler.jsonc`,
`vite.config.ts`, `workers/app.ts` and `react-router.config.ts` move out of it into the workspace template.

---

## 3. The build

A generate step runs before `react-router build` and before the dev server, and whenever a manifest changes:

1. Read `supergrid.workspace.json`, then every `apps/*/supergrid.app.json` not disabled. `parseManifest` as today.
2. Write `.sg/apps.ts`: the registry. For each app its manifest, its route module imports, its migrations, and lazy
   imports of its `workers/app.ts` (operations, hooks, objects).
3. Write `.sg/routes.ts`: public routes under each app's mount (the sitemap's mount when the workspace has one, else the
   manifest's), admin routes under `/admin/<id>` inside the shared admin layout, API routes under `/api/<id>`. The site
   app's `home` is also `/`. Collisions are build errors with both app ids named.
4. Write `.sg/migrations.ts`: every app's migrations in order, each tagged with its app id so the ledger keeps the prefix rule.
5. Typecheck and build. Report the compressed server size.

`.sg/` is committed so a clone builds without the desktop and so diffs show what an install or update changed in the tree.

---

## 4. The runtime

`createWorkspaceWorker(registry)` in `@supergrid/app-kit` replaces `createAppWorker`. One fetch handler:

1. `/_ws/*`: the workspace's own routes (auth handoff, rpc, manifest, health), as in `core/workspace` today.
2. Resolve the user from the staff cookie or token, as the workspace does now; no `x-sg-user` header, it is a local.
3. Find the owning app from the path (the registry's mount table). Build the **app context** for it: `ctx.manifest`,
   `ctx.db`, `ctx.workspace` (the workspace API as a direct call, same `Workspace` type the RPC exposes today, so app code
   is unchanged), `ctx.events` stamped with the app id, `ctx.call` over that app's operations, `ctx.href` under its mount.
4. `/api/<id>/ops` and `/api/<id>/mcp` as today. New and free: `/_ws/mcp` lists every app's tools in one server for agents.
5. Everything else goes to React Router with the context set.

Hooks run in-process: the events module delivers a subscribed event to the handler in the registry, through the queue
when the workspace has one. `applyMigrations` runs once per isolate across the registry, in the same ledger. Object types
likewise. The `WORKSPACE` service binding, the `ROUTES` table, `x-sg-mount` and `x-sg-user` all go away.

**Cross-app code is an import.** The access app exports `can(user, "course:view", id)` and a `requireEntitlement()`
loader guard from `apps/access/packages/access`; the course app imports it. Same request, same database, same context.
The manifest's `packages.exports` stays as documentation for agents of what an app offers; `uses` and the package graph
are retired.

---

## 5. Shared code

| Today | After |
|---|---|
| `components/ui` and `components/admin` copied into every app at create | `shared/ui`, `shared/admin`, once per workspace, updated with core (§6) |
| `@supergrid/app-kit`, `admin-sdk`, `theme` linked from `core/` | the same, pinned in the workspace's `package.json` |
| app packages published to the pnpm workspace, versioned, consumers rebuilt | `apps/<id>/packages/<name>` imported by path; the workspace's `tsconfig` paths make `@sg-apps/<name>` resolve |
| `packages.uses` with the version built against | gone; the build is the version |

An app's package may still be published to npm for other workspaces; that is the builder's choice and outside this repo.

---

## 6. Apps from elsewhere

The value is installing something someone else built: our courses or community app, a project tracker from a third
party. The model is the one every plugin ecosystem of this kind runs on: **vendored source, visible to the owner and the
agent, updated by merge**.

**The builder's shape.** An app's upstream repo is the app folder and nothing else: manifest, `app/`, `migrations/`,
`packages/`, `CHANGELOG.md`. It is not runnable on its own; the builder develops it inside their own workspace repo as
`apps/<id>/` and publishes with `sg app publish <id>`: a `git subtree push` of the folder to the app's repo and a tag
equal to the manifest's `version`. One shape, not two.

**Install** (`sg app add <repo>@<tag>`, or the desktop's Apps page): `git subtree add --prefix apps/<id> <url> <tag>
--squash`, then the lock records the upstream, version, upstream commit and tree hash, `state: managed`. Then the gates
below, on a branch, and the first deploy runs the migrations.

**Update** (`sg app update <id> [version]`): the desktop compares upstream tags with the lock and marks the app. Applying
is a folder-scoped three-way merge on a branch `update/<id>-<version>`: base is the installed upstream tree, ours is the
folder as it is, theirs is the new tag. `git subtree pull --squash` does it and tracks the base; the lock keeps the base
too so nothing depends on subtree's commit messages. For a registry that serves tarballs instead of git, the same merge
runs file by file with `git merge-file`, the base tarball fetched by version. An untouched folder fast-forwards. A folder
the owner's agent changed produces ordinary conflicts, which the agent resolves and reports.

**Gates, before the branch merges.**

| Gate | What it checks | On failure |
|---|---|---|
| Manifest diff | new `permissions`, a changed mount, new `requires`, new or removed entities | shown to the owner; a new permission is consent, not a notice |
| Migrations | the ledger's applied migrations match the folder's files byte for byte; the update only appends | refused |
| Contract | `requires.workspace` ≤ the workspace's contract; `requires.apps` satisfied by the lock | refused, with what to update first |
| Build | generate, typecheck, build, size | the branch stays, the error attached; the agent may try a fix |
| Preview | upload a Workers version without routing traffic; open its preview URL | the owner looks before it goes live |
| Summary | the agent reads upstream's diff between the two versions and the merge, writes what changed and what it resolved | always shown |

**States.** `managed`: untouched since install, updates fast-forward. `modified`: the folder differs from upstream; the
desktop shows how many files, updates merge. `forked`: the owner claimed it (`sg app eject <id>`); the upstream stays in
the lock for reference and update checks stop. Start with "modify freely, merge on update"; add extension points for what
people actually change once that is visible, rather than guessing them now.

**Signing and the marketplace.** A release is a tree hash. The marketplace, when it exists, signs the hash of a reviewed
tree with its key; the desktop refuses a fetched tree whose hash is unsigned for a marketplace app. The feed and
signature code in `@supergrid/cloud` is reused; GitHub is where source lives, the hash is what was reviewed. A marketplace
entry is `{ id, name, upstream, versions: [{ version, tree, signature, changelog }] }`.

**Core updates use the same path.** `shared/ui`, `shared/admin` and the workspace's `app/` have upstream = us, pinned in
the lock, updated by the same merge and gates. One mechanism for our updates and theirs.

**Uninstall** removes the folder and the lock entry, leaves the tables, and offers to drop them. An update never drops a table.

---

## 7. Trust

In one Worker an installed app's code can reach the database, the secrets table and the workspace API like any other
code. The boundary is the account; the protection is review and visibility, as with npm packages and WordPress plugins.
Say so plainly; do not describe the manifest's `permissions` as a sandbox.

Cheap hardening that fits: the `ctx` an app receives is shaped by its manifest (no `ctx.contacts` without
`contacts:write`); an install-time lint flags `fetch` to other origins, direct `env` access and SQL outside the app's
prefix; the ledger already refuses tables outside `app_<id>_`.

When an app needs a hard boundary, add a tier rather than change the default: a **sandboxed** app runs in its own Worker
in a dispatch namespace and reaches the workspace only through operations and RPC, paying the cross-app plumbing cost.
Most vetted apps are **integrated** (vendored, above). Do not build the sandbox tier until a real app needs it.

---

## 8. Tools: a second repo

Some apps never go online: a video editor, an image AI tool, an exporter, a scraper. They need what a Worker cannot
have (ffmpeg, the GPU, the filesystem, a model on disk) and nobody but the person at the desktop uses them. Call them
**tools**, and keep them out of the workspace repo entirely. An organization has two repos:

| | Workspace repo | Tools repo |
|---|---|---|
| Holds | apps: public pages, admin screens, APIs, the Worker | tools: admin screens and a Node server, never deployed |
| Scope | one workspace | the organization; a tool is pointed at whichever workspace is open |
| Runs | the Worker (Live), or the workspace dev server (Dev) | this Mac, in both modes |
| Toolchain | workerd, `@cloudflare/workers-types` | Node, `@types/node` |
| Where | `workspaces/<id>/` | `orgs/<org>/tools/` |
| Imports the other | never | never; the contract is operations over HTTP, the Library, and tables by name |

Why a second repo and not a folder: with one repo the agent will see the project tracker's helper and import it into
the site, or pull a Node-only package into Worker code, and nothing stops it but a lint. A separate repo makes the
coupling impossible, keeps each `package.json` and `tsconfig` honest about its runtime, keeps the workspace repo's
history equal to its deploy history, and matches the scope: an image generator serves every workspace in the org.

```
orgs/<org>/tools/                        one git repo, one pnpm workspace
  supergrid.lock.json                    the same format and states as the workspace's (§6)
  shared/                                the admin layer and kit, vendored from core like the workspace's, updated the same way
  tools/
    clips/
      supergrid.app.json                 the same manifest type, kind: "tool"; public, api and mounts are refused
      screens/<id>/index.tsx             the admin screens: client components on the same kit and layer; no routes file, no SSR
      server/index.ts                    operations and hooks, run in Node
      migrations/                        optional; tables through the ledger (below)
```

```jsonc
{ "id": "clips", "name": "Clips", "kind": "tool",
  "admin": { "nav": [{ "id": "clips", "label": "Clips", "path": "/", "icon": "film" }] },
  "tool": { "permissions": ["shell", "fs", "network:api.openai.com"], "binaries": ["ffmpeg"] } }
```

| | App | Tool |
|---|---|---|
| Server code | `workers/app.ts`, in the Worker | `server/index.ts`, in a desktop utility process; the same `operations` shape |
| Screens | React Router under `/admin/<id>` in the Worker, in an iframe | client components in `screens/`, compiled by the desktop with esbuild and mounted in the desktop's own React tree (below) |
| Context | `ctx.db`, `ctx.workspace`, `ctx.events`, `ctx.call` | `ctx.workspace` over `/_ws/rpc` with the staff token, `ctx.assets` (upload to the Library), `ctx.events`, `ctx.call`, plus `ctx.fs` (a scratch folder) and `ctx.shell` (the declared binaries) |
| Data | its tables, migrated by the Worker build | its tables in the open workspace, registered through `applyMigrations` over rpc on first use (the ledger and the prefix rule are the same code); rows through rpc, scoped to its prefix |
| Reaches an app | an import | the app's operations over HTTP, with the served manifest for the shapes |
| Agent | tools under `/api/<id>/mcp` | its operations mounted in the desktop's MCP proxy, so "make a clip of this" is a tool call |
| Install, update, states | §6 | §6, with `pnpm install` and a build in place of the Worker build, and a `tool` diff as consent |
| Live and Dev | the Worker, or the dev server | Live mounts the bundle built at install; Dev watches the folder and rebuilds on save, with diagnostics in place; the Node server in both |

In the rail a tool sits with the apps and opens the same way; the person should not care which repo it came from. The
agent should: its context names the repo a thread works in, and the instructions say a tool imports nothing from the
workspace repo and an app nothing from the tools repo. An app and a tool that belong together (a gallery and its
generator) are published as a pair and share tables by name and the Library, not code.

**Screens, the lab's way.** `ide-supergrid-poc` (`~/superatlas/ide-supergrid-poc`, `docs/labs/admin-screens.md`)
already tested this. Main compiles a screen's entry with esbuild into one CommonJS bundle with the host's modules left
external (react, react-dom, react-router, lucide, the kit, the SDK); the renderer evaluates it with a `require` shim that
answers those with its own module instances. One React, one router, one kit: a screen's popups, tooltips, portals and
nested routes are the desktop's, and there is no seam and no iframe. The folder is watched, a save rebuilds and remounts
in under a second, and esbuild's diagnostics and runtime crashes show in place. Claude Code wrote a working screen from
the contract (folder layout, the modules the host provides, the kit's exports, the SDK hooks, the tokens, the API's
routes) in about 25 seconds. That contract is what the agent gets for tools. Two things the lab left for a real build:
compile the tool's Tailwind with its screens at build time rather than pointing the host's `@source` at the folder, and
a tool's UI dependencies are the host's versions, so a tool cannot pin its own React.

**The Node server.** workerd has no filesystem, no child processes and no GPU; the heavy part needs Node, and Electron
ships one. The desktop runs `server/index.ts` in a child process on Electron's Node with the tool's folder as its
working directory and a scoped environment, restarted when its files change in Dev (the lab ran its mock API the same
way). Its operations answer the screens' `useOperation` calls over a local port and are mounted as the agent's tools. The
same bundled runtime should run the workspace dev server and the package manager (`docs/node-runtime.md` in the POC:
`ELECTRON_RUN_AS_NODE`, npm as a dependency, `node` shims first on the child's PATH; esbuild, sharp and lightningcss
verified on it), which removes the "find Node on PATH" problem the desktop has today, at the cost of shipping vite, the
Cloudflare plugin and the workerd binary inside the app.

**Trust.** A tool runs Node on the person's machine and its screens run with the renderer's privileges (the lab notes
the CSP needs `unsafe-eval` for them): the npm `postinstall` problem twice over, and vetting matters more here than for
Worker apps. Since a tool's server already runs on the machine, in-process screens add no new trust, which is why they
are the default. `tool.permissions` and `binaries` are consent at install and at every update that changes them; the
server process gets the declared binaries on its PATH, a scratch folder, the staff token and nothing else, not the home
directory and not the Cloudflare login. A tool marked `isolated` gets the other path instead: its screens in an iframe
over the admin SDK from a local static server, with the seam that brings. A boundary, not a sandbox.

---

## 9. Live and Dev

The composer's per-thread Agent / Dev switch and the per-app Dev panel become one **mode for the whole desktop**, in the
top bar next to the sidebar toggle. The mode is an environment, so the names are the environments:

| | **Live** | **Dev** |
|---|---|---|
| Screens | the deployed Worker, in the iframe as today | the workspace's dev server on this Mac, started on entering Dev |
| Data | production D1 | local D1 by default; "Use live data" switches the dev server's `DB` binding to remote |
| Links | the real domain | `http://localhost:<port>` |
| Rail | Apps, Database, Workflows, Events, Library, Settings | the same, plus **Code**: Files (two roots: the workspace repo by app, the tools repo by tool), Git, Server (log), Deploys |
| Database section | D1 REST on the cloud, as today | the local SQLite through the local workspace's `/_ws/rpc` |
| Agent | workspace tools; `apps_create` and code tools answer with how to switch | everything; the thread records the mode each message was sent in |
| Tools (§8) | the built bundle and its Node server | the source with HMR and the same Node server |
| Migrations | run on deploy | run on dev server start against local D1; **Reset local data** and **Pull live data** (D1 export into the local file) |

"Agent" is not a good name for the first column because the agent is in both. A third environment, **Preview**, falls
out later: a Workers version with a preview URL, live data, not routed. That is also what the update gate (§6) opens.

**Should admin screens always come from the dev server?** No, from the dev server in Dev and from the Worker in Live.
The speed people want is the edit-and-see loop, which is a Dev concern: HMR, no build, no upload. Electron ships Node,
so this is not about Node being installed; the desktop should bundle the toolchain either way (§8). The reasons are
elsewhere: editors and viewers have no Cloudflare login, and a local server reaching live D1 needs one, since a remote
binding goes through the account's API; the local build is not the one teammates and the public site run; a remote
binding is a network hop per statement where the deployed Worker sits beside its database; and a workerd process would
run whenever the desktop is open for screens that are fine from the edge. The Live iframe can be made fast on its own terms: one handoff per workspace instead of one per app, one
iframe kept warm across apps since every admin screen is now one React Router app, and client-side navigation between
them. Dev starts one server per workspace, not one per app, so entering Dev costs a few seconds once.

The "local dev workspace" the desktop special-cases today (a workspace with no Worker, run from `core/workspace`)
is this mode for any workspace, and goes away as a separate thing.

---

## 10. What changes where

**core**

- `app-kit`: `createWorkspaceWorker`, the registry types, the generate step (`sg ws generate`), `ctx` shaped by permissions.
- `workspace/`: its routes, auth, rpc, events, ledger become the workspace's `app/` and modules the Worker composes;
  the service-binding entrypoint and `ROUTES` go.
- `template/` → the app folder template; new `workspace-template/`.
- `cloud`: `deployWorkspace` (build, upload one version, promote), `previewWorkspace`; `installLocalApp`, per-app upload
  and the route rewrite go. The signed feed stays for core and marketplace apps.
- CLI: `sg app add | update | publish | eject`, `sg ws generate | deploy | preview`.
- `docs/`: rewritten after the code lands (app-system, app-dev, packages, manifest's packages section).

**app (desktop)**

- Workspaces own a repo: provision creates it from the template, open clones or finds it.
- `apps.ts`: one dev server per workspace; files and git over the repo with an app filter; install becomes workspace deploy.
- The Dev panel's tabs become the Code section of the rail in Dev mode; the per-thread Dev switch and `suggest_dev_mode`
  become the top-bar mode.
- Apps page: upstream, version, state, "Update to x.y.z", the manifest diff and consent, the agent's summary.
- Database section in Dev reads the local workspace.
- Tools (§8): the org's tools repo, the utility-process host, the local static server for built screens, operations
  mounted in the MCP proxy, consent for `tool` permissions; the agent's context names the repo a thread is in.
- Bundle the Node toolchain the way `ide-supergrid-poc/src/main/runtime.ts` does (`ELECTRON_RUN_AS_NODE`, the package
  manager as a dependency, `node` shims on the child's PATH; its packaging checklist applies: keep the `runAsNode` fuse
  on, unpack the package manager from asar). Run pnpm, vite and workerd through it and drop the PATH search.
- Port the POC's screen compiler and loader (`src/main/screens.ts`, `src/renderer/src/admin/loader.ts`,
  `ScreenHost.tsx`) for tools' screens, with the kit and admin layer from core as the host modules.

---

## 11. Order of work

1. **Repo and build.** Workspace template, the app folder template, the generate step, `createWorkspaceWorker`. Prove it
   with two template apps and the sgdev test account: one Worker, both apps, public and admin and operations, migrations
   through the ledger.
2. **Desktop: one repo, one dev server, Live / Dev.** Provision and open create or clone the repo; Dev starts the
   workspace server; the Code section; deploy as one upload; retire the local-workspace special case.
3. **Install and update from upstream.** Lock file, `sg app add | update | eject`, subtree merges, the gates, the Apps
   page. Our own courses or forms app as the first upstream.
4. **Tools.** The org's tools repo, `kind: "tool"` in the manifest, the utility-process host, screens from a local
   port, operations as agent tools. One tool of ours as the first one (an image AI or a clip cutter), installed and
   updated through step 3.
5. **Signing and the marketplace feed.** Tree hashes, signatures, the entry format, refusal of unsigned trees.
6. **Preview environment**, then the sandbox tier only when an app needs it.

Existing per-app Workers on the test account are deleted once step 1 serves the same apps from the workspace Worker; no
migration tool is needed for them.

---

## 12. Open questions

- Admin screens as client apps: if a workspace app's screens were client-side React over its operations instead of
  SSR loaders on `ctx.db`, they could be served from the desktop for everyone, like a local app's. Big change to the
  admin layer; not for now, but it is where "always local" would become right.
- Where a workspace repo's remote lives for a team: the org's GitHub, a git host we run, or local-only with the deploy
  as the shared artifact. Step 2 can ship local-only.
- Whether `.sg/` is committed (reproducible clones, visible diffs) or ignored (no generated noise in PRs). This plan says committed.
- How far the permission-shaped `ctx` goes before it is theater. The lint is honest; a fake sandbox is not.
- A builder developing several apps against each other in one workspace, then publishing each: fine with subtree push,
  but the changelog and version live in each app folder, and the tooling should refuse to publish an app whose folder
  imports another app's internals rather than its `packages/`.

---

## 13. Notes from building step 1

- **Linked source packages must resolve their own imports.** Vite's config loader externalizes `@react-router/dev/routes`
  and Node then resolves it from `core/packages/app-kit`'s real path, where no copy lived. app-kit now carries its peers
  as devDependencies, and the workspace's Vite config dedupes `react`, `react-dom` and `react-router` so the bundle has one
  copy. The same applies to any package consumed as source over `link:`.
- **pnpm auto-installs peers from the registry.** `@supergrid/admin-ui` lists `@supergrid/admin-sdk` as a peer; pnpm 9 tried
  to fetch it from npm and hung. `core/.npmrc` turns `auto-install-peers` off.
- **Anything Node loads directly uses package paths.** `generate.ts` runs inside the Vite config under Node's own type
  stripping, so its imports go through `@supergrid/app-kit/manifest`, not `./manifest` (the same rule `vite.ts` follows).
- **Route files outside `app/` work.** React Router resolves a route's file against `appDirectory`, so `../apps/notes/app/...`
  is fine; typegen writes the `+types` next to the real folders and `rootDirs` finds them.
- **Secrets are not vars.** The workspace template keeps `SG_WORKSPACE_TOKEN` and `SG_SECRETS_KEY` out of `wrangler.jsonc`:
  `.dev.vars` for local dev, `wrangler secret put` for the deployed Worker.
- **The `.sg/` generate step runs as a Vite plugin** (`workspaceViteConfig` in app-kit), on config load and on changes to a
  manifest or an app's routes file, so `pnpm dev`, `pnpm build` and `react-router typegen` all see the current folders;
  `sg ws generate` is the same code for the terminal.
- **The old shape beside it**: `workspace/src/index.ts` (the router over service bindings) and `installLocalApp` in
  `@supergrid/cloud` are still there for the per-app Workers on the test account; the rest went with step 2.

## 14. Notes from building step 2

- **Provisioning builds first.** A new workspace's Worker is the repo's own build (no apps yet), uploaded through
  `provisionWorkspace` as the bundle; the signed workspace release is no longer what a workspace starts from. The repo's
  `wrangler.jsonc` gets the real D1 id and address afterwards, so `wrangler deploy` from a terminal targets the same database.
- **Dev data needs a path in.** The Database pages read D1 over Cloudflare's REST API; a local D1 has no API. The composed
  Worker answers `POST /_ws/dev/sql` with the workspace token in a dev session only (`import.meta.env.DEV`), in the REST
  API's shape, and `src/main/d1.ts` sends there when the target names the dev server. Time Travel, export and the database
  record stay Live-only.
- **The mode lives in main.** `workspace(wsId)` answers the dev summary (localhost, the repo's apps, `dev: true`) while the
  mode is Dev and the server is up, so the handoff, the served manifest, operations and the agent's tools follow the mode
  without each knowing about it; the renderer swaps the shell's workspace for that summary.
- **Old folders move aside.** A `workspaces/<id>` in the one-repo-per-app shape is renamed `<id>-before-repo-<stamp>` the
  first time the workspace opens, and the repo is made fresh; nothing is deleted.

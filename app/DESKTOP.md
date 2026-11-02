# SuperGrid desktop: the manager as an app

> A map, not a build plan. Written 2026-11-01 to explore replacing the self-hosted platform Worker (`core/platform`) with a branded Electron app that we ship, update and sign people into. The workspace Worker, the app Workers and everything else in the user's Cloudflare account stay exactly as they are. Companion to the earlier `supergrid-dev1/private/OPERATOR.md` and `TENANCY.md`, which reached a different conclusion (§8 below says what changes and why).

---

## 1. The one-line change

Today there are three runtimes in the user's account: **platform** (control panel, auth, Cloudflare token, flows), **workspace** (headless router, D1, RPC), **apps** (one Worker each, an Artifacts repo each). The platform is the only one that is "ours but runs in their account", and it is the one that makes updates, auth and quality control hard.

The pivot moves the platform's jobs out of their account and splits them between two places we own:

| Where | What it is | Who runs it |
|---|---|---|
| **SuperGrid desktop** (Electron, `app/`) | the manager: sign-in, orgs and workspaces, create and update, install apps, app admin screens, the coding agent over ACP, local clones, local preview, deploy | the user's machine |
| **Control plane** (one Worker + D1, ours) | WorkOS identity, orgs, members and roles, the directory of workspaces, the signed release feed and catalog, short-lived staff tokens, update notices, later billing | us |

What stays in the user's Cloudflare account: workspaces (`sg-ws-*` Worker + D1 + R2), app Workers (`sg-app-*`), Artifacts repos. Nothing there needs us to keep serving traffic.

---

## 2. Where each platform job goes

Everything `core/platform` does today, and its new home.

| Platform job today | Lives in | New home | Notes |
|---|---|---|---|
| Users, orgs, invites, roles | Better Auth on D1 | **WorkOS** (our account), orgs = WorkOS organizations, roles = WorkOS RBAC | Same four roles: owner, admin, editor, viewer (`platform/src/roles.ts`). Invites become WorkOS invites. `/setup` one-time link goes away. |
| Cloudflare token, sealed in D1 | `platform/src/cloud.ts` | **The machine**: wrangler's OAuth login, or an API token in the OS keychain (`safeStorage`) | We never hold it. Each admin signs in to Cloudflare on their own machine; the org records which account id it targets and the app checks `wrangler whoami` against it. |
| Workspace registry (`workspaces`, `installs`, `update_log`) | platform D1 | **Control plane directory**, rebuildable from the account | Metadata only: id, name, url, worker names, account id, version, contract, installed apps and versions, last seen. The workspace's own `info()` RPC and a Workers list filtered by prefix can rebuild it, so the directory is a cache we also use for fleet visibility. |
| Workspace token (`SG_WORKSPACE_TOKEN`, HMAC handoff) | platform D1, `handoff.ts` | **Asymmetric staff tokens** (§4) | The workspace trusts a public key instead of sharing a secret. Hackathon shortcut: keep the secret, store it in the keychain and sealed in the directory. |
| Flows: create workspace, install app, update workspace or app, rollback | `platform/src/flows.ts` on `@supergrid/cloud` | **Electron main process**, same `@supergrid/cloud` | The package is already runtime-neutral (fetch, Web Crypto, isomorphic-git on `MemoryFS`); the CLI proves it runs under Node. Long operations get real progress UI instead of one-request-per-step pages. |
| Admin shell, app iframes, `w/:id/apps/:app/frame` handoff | React Router routes | **Renderer** (React, same components), app admin pages in an iframe or `<webview>` at the workspace URL | `@supergrid/admin-sdk` is postMessage between a host page and an app iframe; the renderer is a web page, so it works unchanged. The handoff redirect route is replaced by the app opening `<ws>/admin/<app>?handoff=<token>` directly. |
| Registry API for the `sg` CLI (`api/me`, `api/workspaces`, `api/installs`) | platform routes, per-user key | **Control plane API**, per-user key from WorkOS | The CLI talks to the directory; provisioning from the CLI still runs `@supergrid/cloud` locally with the user's own wrangler login. |
| Platform self-update (upload version, health check, D1 restore point) | `updatePlatform` | **electron-updater** with our signed releases | Workspace and app updates keep the signed feed and the contract gate; only the executor moves to the desktop. |
| Release feed and pubkey as install settings | `SG_RELEASE_FEED`, `SG_RELEASE_PUBKEY` | **Baked into the app**; the feed is served by the control plane | Forks can still point at their own; it is a setting, not a rebuild. |
| Operator page, mode (creator, agency, reseller) | `routes/operator.tsx`, `SG_MODE` | **Org shape** (§3) | Mode becomes "how many orgs you have", not a switch. |

`core/platform` does not need to survive this. `packages/cloud`, `packages/app-kit`, `packages/admin-sdk`, `workspace/` and the CLI carry over as they are.

---

## 3. The user's world: orgs and workspaces

```
User (WorkOS)
  └─ Organization (WorkOS org)           one Cloudflare account, one prefix
       ├─ members, roles                 owner | admin | editor | viewer
       └─ Workspaces                     sg-ws-<id>, each with its D1, bindings, apps
            └─ Apps                      sg-app-<id>-<app>, one Worker and one Artifacts repo each
```

**Rule: one Cloudflare account per organization.** Workspaces inside an org share the account and the prefix; naming already supports many workspaces per account (`app-kit/src/names.ts`). A workspace-level account override is possible later and changes nothing above.

| Avatar | Shape | What the app shows |
|---|---|---|
| Solo creator, small team | one org, a few workspaces | the org as the home screen |
| Agency, sites in its own account | one org, a workspace per site | the same, with workspace folders or tags if the list grows |
| Agency, a client with its own Cloudflare account | **one org per client**, the agency's people are members | an org switcher; hand-over is removing the agency's memberships, no resources move |
| Reseller, managed | not now; §7 | |

Why one org per client with its own account beats one org with per-workspace accounts: roles, billing, hand-over and "whose bill is it" all fall on the org boundary, and WorkOS already models a user in many orgs.

**Roles and machines.** Owners and admins do things that touch Cloudflare, so they need a Cloudflare login on their machine. Editors and viewers never touch Cloudflare: they only need staff tokens to workspaces, which the control plane mints from their WorkOS session. That is the main reason for asymmetric staff tokens (§4): an editor's laptop holds no secret that reaches the account.

---

## 4. Trust: how the desktop reaches a workspace

Today the platform holds each workspace's secret and signs handoff tokens with it (`platform/src/handoff.ts`, HMAC). With no platform in the account, two options:

**A. Keep the secret (hackathon).** The desktop that provisions a workspace generates `SG_WORKSPACE_TOKEN`, sets it as a Worker secret, keeps it in the keychain and stores it sealed in the directory so teammates' desktops can fetch it. Zero changes to `workspace/`. Cost: we hold a sealed copy of a secret that reaches their data, and every teammate's machine ends up with it.

**B. Public key (the direction).** The workspace gets `SG_STAFF_KEYS`, a list of Ed25519 public keys it trusts, set at provision. The control plane holds the private key and mints short-lived staff tokens (`sub, org, role, permissions, aud = workspace id, exp`) from a WorkOS session; the desktop sends them to `/_ws/rpc` and in the admin handoff. `verifyToken` in `workspace/src/staff.ts` gains a signature check beside the HMAC one; the contract change is additive. The workspace never needs to call us: verification is offline against the baked key, so sites, APIs and portals keep working if the control plane is down. The owner can rotate the list with wrangler because they own the account, which keeps the self-hosted promise honest. The key list rather than a single key is what makes resellers (§7) and hand-over work: add the new manager's key, remove the old.

Machine-to-machine (workspace to workspace, an app's cron) keeps the secret token; it is only humans and the manager that move to signed tokens.

---

## 5. The desktop app

```
app/
  main/        Electron main: WorkOS sign-in window, keychain, wrangler, @supergrid/cloud flows,
               git clones, ACP client, local preview, electron-updater
  preload/     the typed bridge the renderer calls
  renderer/    the manager UI: ports core/platform/app (shell, org, workspace, app store, updates,
               app-frame) and adds the agent pane
  mcp/         a small stdio MCP server the agent gets: workspace RPC with the user's staff token
```

**Main process owns everything that needs a machine.** Cloudflare credential, git, wrangler, the agent subprocess, ports for local preview. The renderer is a plain web app that talks to main over the bridge, so a hosted "lite" shell with no agent is possible later without a rewrite (an editor who only wants to change content should not need a download; decide later, but do not design it out).

**Sign-in.** WorkOS AuthKit in a window, session kept by main. The control plane issues the app a session; the app asks it for staff tokens per workspace as needed. One account, many orgs, an org switcher.

**Cloudflare connection.** First choice: bundle wrangler and run `wrangler login` from the app (its OAuth client, its refresh); read the token with `wrangler auth token` when the flows need one. Second choice: API token paste from a template link, stored in the keychain. A Cloudflare OAuth client of our own is the clean version and is a later ask. The Workers Builds API needs a user token and only documents GitHub, so deploys do not go through Builds (next point).

**Deploy.** The app builds the app locally (`pnpm build` in the clone) and deploys with `putWorker` from `@supergrid/cloud`, then pushes the commit to Artifacts so the repo is the record. No Builds connection, no dashboard step, works with the token we already have. "Deploy managed in the app through the CLI" is this; wrangler is used for login and for `wrangler dev` in previews.

**Flows with real progress.** `createWorkspace`, `installApp`, `updateWorkspace`, `updateApp` run in main as one job each with step events to the renderer. The old one-request-per-step pattern existed because a Worker request is short; a desktop process is not.

**App admin screens.** The shell renders an iframe at the workspace's admin URL with a handoff token; `mountAppFrame` from admin-sdk handles ready, resize, navigate and title as today. Use `<iframe>` first; switch to `<webview>` only if a cross-origin problem forces it.

**Updates to us.** electron-updater against our release server (the control plane can serve the manifest). Updates to their workspaces and apps: the Updates screen as today, with the control plane able to show "3 of your workspaces are behind" and send a notice.

---

## 6. The agent: ACP and Muse Code

ACP (Agent Client Protocol, from Zed) is JSON-RPC over stdio: the client spawns the agent, calls `initialize`, `session/new`, `session/prompt`, `session/cancel`; the agent streams `session/update` and calls back for `fs/read_text_file`, `fs/write_text_file`, `session/request_permission` and terminals. Electron main is the client. This is the reason the manager is a desktop app and not a tab.

**One agent slot, any ACP binary.** A setting lists agents: Muse Code first, Claude Code (`claude-code-acp`), anything else that speaks ACP. The app ships none of them; it finds the binary or asks for the path.

**Muse Code over ACP works.** Muse 1.4.14 has its own `muse acp`, behind `MUSE_EXPERIMENTAL_ACP=1` and missing from `--help`. It reports login, modes, models, usage and cost, and needs no third-party adapter. Muse also has a native protocol, `muse serve` (MSP), which we do not use: ACP keeps the slot open for other agents. The flag means this mode can still change, so re-check it when Muse updates.

**What a session gets.**

| | |
|---|---|
| `cwd` | the local clone of the app's Artifacts repo (`sg-app-<ws>-<app>`), cloned with a repo token minted through the Cloudflare API |
| `mcpServers` | `app/mcp`: workspace RPC (schema, settings, contacts, events, migrations) with the user's staff token, plus the app-kit docs and the manifest, so the agent knows what an app is |
| fs and terminal | handled by main: reads and writes land in the clone, terminals run `pnpm build` and `pnpm dev` |
| permission prompts | rendered in the pane; "always allow" per session |
| after the turn | the app shows the diff, offers Preview (local `wrangler dev` of the workspace with this app) and Deploy (§5) |

The demo moment is the same one as before: the agent edits the app's code and reads the live workspace's data in one conversation, then the user clicks Deploy.

---

## 7. Agencies, portals, resellers

**Client portal = an app installed in the client's workspace.** app-kit already has `public.mount` and `admin.nav`, and the workspace already has staff tokens of type `staff` (`workspace/src/staff.ts`). A portal app is a public mount whose routes require a workspace-local login: client users live in the workspace's own D1, the app's routes check them, and the client gets a URL on their own site. Nothing about the portal needs the desktop or an account with us. We ship portal templates (analytics only, content editing, a simple dashboard) in the catalog, and an agency builds its own with the agent like any other app.

**Reseller and managed = the headless desktop.** Everything the desktop does to an account is `@supergrid/cloud` ops plus a credential. A coordinator is those same ops running in a Worker against a pool account, with Workers for Platforms namespaces for isolation, exactly as the earlier operator doc laid out (OPERATOR.md §14, §15). It creates orgs through the control plane API with a machine key, provisions workspaces with its own prefix, preloads data over workspace RPC, and hosts the SaaS front end the reseller built. The workspace does not know or care which manager created it: its trusted key list (§4 B) carries the coordinator's key, and later the customer's own key when they take the workspace with them.

So the architecture rule that makes all three avatars one codebase: **`packages/cloud` runs in three hosts, the desktop main process, the CLI, and later a coordinator Worker.** Keep it free of Node-only and Electron-only imports, which it is today.

---

## 8. What this reverses, and the honest cost

OPERATOR.md §1 decided "the operator is never a local database inside the desktop app" because a team needs state both reach. The pivot does not reintroduce a local store: the shared state goes to our control plane instead of a per-account Worker. What changes:

- **Managing a workspace needs us up.** Sites, APIs and portals do not; only the desktop's sign-in and staff tokens do. That is the trade for owning the experience.
- **We hold the directory**, not the data and not the Cloudflare credential. The directory is metadata and is rebuildable from the account.
- **No browser management** until a hosted lite shell exists. Editors need the download. Keeping the renderer a web app keeps that door open.
- **Updates and quality are ours**: one build of the manager for everyone, signed, auto-updated, with telemetry we choose to add.
- **Open source line.** `core/` minus `platform/` stays the open part (workspace, app-kit, admin-sdk, cloud, CLI); the desktop app and the control plane are the branded product. A fork can still run workspaces from the CLI alone.

---

## 9. Hackathon slice

Shortest path to the demo, in order. Each step is usable on its own.

1. **Spike Muse Code over ACP** in a bare Node script against the unofficial adapter. Decide pane versus terminal fallback the same day.
2. **Electron shell** in `app/`, renderer ported from `core/platform/app` (shell, home, workspace, app store, updates), bridge to main. Sign-in stubbed to a local profile; WorkOS when the shell works.
3. **Cloudflare connection** through bundled wrangler; `wrangler whoami` shown in Settings. Workspace list from the account (Workers with the prefix) plus a local directory JSON standing in for the control plane.
4. **Flows in main**: create workspace, install app from the feed, open its admin in the iframe with the HMAC handoff (§4 A).
5. **Open with agent**: clone the app repo, start the ACP session with the MCP server, show updates and diffs, Build, Deploy with `putWorker`, push.
6. **Control plane v0**: WorkOS sign-in, orgs, the directory, the feed moved under it. Replace the local directory JSON.

Deferred and not needed for the demo: asymmetric staff tokens, electron-updater, the Builds question, portals as templates, the coordinator.

---

## 10. Open questions

- WorkOS org per client versus one org with per-workspace Cloudflare accounts: this doc picks org per client (§3); check it against how an agency actually onboards a client who has no Cloudflare account yet (we may need "create the account for them" guidance in the app).
- Cloudflare login: is bundling wrangler's OAuth client acceptable for a shipped app, or is token paste the only honest v1 until we have our own client?
- Whether `core/platform` is kept alive as the fork's self-hosted manager or retired; maintaining both doubles every flow change.
- Where the signing key for staff tokens lives (control plane secret, rotation story) and whether the workspace also trusts the org owner's own key as an escape hatch.
- Portal apps: do client users live in the workspace's `contacts` or a new `users` table with roles of their own.

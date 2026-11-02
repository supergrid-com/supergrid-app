# The workspace sitemap

Where every app's pages live on the workspace's domain, what `/` serves, and the redirects that keep old links alive. Edited in the desktop app, owned by the workspace.

## What exists today

- **`ROUTES`** is a JSON binding on the workspace Worker, assembled by `packages/cloud/src/ops.ts` at install time from each app's manifest: app id, service binding, `public.mount`, `admin`, `api`, nav. The router in `src/index.ts` matches the longest public mount, and `/admin/<id>`, `/api/<id>`, `/_app/<id>` by app id.
- **An app's public routes are baked at build time** under its manifest mount: `app-kit/src/routes.ts` wraps them in `prefix(m.public.mount, …)`. The client-side React Router carries the same paths, so a page only works at the mount it was built for.
- **`/`** goes to whichever app declared `public.mount: "/"`. With none, the router answers a 404 that lists the installed apps.
- Changing a prefix today means editing the manifest in the app's repo, rebuilding, redeploying the app, and redeploying the workspace bindings. Nothing redirects the old path.

## The idea

Split the sitemap into **desired state** and **applied state**:

| | Lives in | Written by | Read by |
|---|---|---|---|
| Desired: mounts, home, redirect rules | `settings.sitemap` in the workspace D1 | the desktop over RPC (`setSitemap`) | the desktop, the router (rules only) |
| Applied: the mount and home alias each app was built with | `ROUTES` binding on the Worker | the desktop when it builds and deploys an app | the router, `info()` |

Redirects take effect at once. A mount or home change is a build of that one app, because React Router paths are fixed at build time. The desktop shows the difference between desired and applied as **Needs a build** and offers the build button there. The manifest's `public.mount` becomes the *default at install*; after that the sitemap owns the mount.

## The setting

```ts
type Sitemap = {
  version: 1;
  /** Configured public prefix per installed app. null = no public pages (admin only). */
  mounts: Record<string, string | null>;
  /** What "/" serves: a page of an app, or null for the app mounted at "/" (or the 404 listing). */
  home: { app: string; path: string } | null;
  /** Ordered. First match wins. */
  rules: Rule[];
};
type Rule = {
  id: string;                       // nid(15)
  from: string;                     // "/old-page" or "/f/*"
  to: string;                       // "/new-page" or "/funnels/*"; "*" is the captured rest
  status: 301 | 302;                // 302 by default; 301 is the "permanent" toggle
  enabled: boolean;
  note?: string;
  /** "rename" rules are added by the app when a mount changes, so old links keep working. */
  source: "user" | "rename";
  created_at: string;
};
```

Validation in `setSitemap`:
- A mount is `/` or `/[a-z0-9-]+(/[a-z0-9-]+)*`, no trailing slash. `/_ws`, `/_app`, `/admin`, `/api` and anything under them are refused.
- Two apps cannot share a mount. One app at `/` is fine; longest match still wins for the others.
- `home.app` must be installed and have public pages; `home.path` is relative to that app's mount (`/` for its index).
- `from` is an exact path or `<path>/*`. `to` is a path on this workspace or an absolute URL. A rule whose `from` is a reserved prefix is refused. Loops (`to` matching an earlier `from`) are refused.
- `mounts` entries for apps that are not installed are dropped on save.

## The router

`src/index.ts`, per request, in this order:

1. `/_ws/*` as today.
2. **Rules.** Read from D1 through a per-isolate cache (10 s TTL; `setSitemap` cannot reach other isolates, so the TTL is the propagation delay). First enabled match redirects with its status, the captured rest appended for `/*` rules, the query string preserved. Rules run before mounts so a renamed prefix redirects even while the old mount is still what is built.
3. **`/`.** The `ROUTES` entry with `home` set wins, then the entry with `public: "/"`, then the 404 listing. The home app serves `/` itself through the alias route below, so this is a plain forward, not a rewrite: the URL bar stays `/` and the client router matches.
4. **Mounts** as today, from `ROUTES`. Forward with `x-sg-mount: <public mount>` added next to `x-sg-app`, so an app learns its public address from the request and not from its manifest.

Why not rewrite at the edge: the router could map `/forms/x` to a Worker built for `/f/x`, and fix the `Location` header on the way back, but after hydration the client-side router matches `window.location` against the routes it was built with and finds nothing. React Router's `basename` is build-time config too. So a prefix change is a build, and the design accepts that rather than half-working.

## The app build

`app-kit/src/routes.ts` reads two build-time variables the desktop sets when it builds an app for a workspace:

- `SG_PUBLIC_MOUNT`: the mount from the sitemap; falls back to `manifest.public.mount`. Public routes are prefixed with it.
- `SG_HOME`: a path under the app's public routes. When set, `appRoutes` adds an **alias route at `/`** pointing at the same module as that path, so the one page is reachable at both and the client router knows both. Only the home app gets this.

`app-kit/src/context.ts` gains `mount: string` on `AppCtx` (from `x-sg-mount`, falling back to the manifest) and `href(path)` that joins it. The Hello sample and the agent's app-kit docs use `ctx.mount` instead of `manifest.public?.mount`. Links an app renders then follow a rename with no code change.

After a build, `installedFrom` records `mount` (what was built) and `home` (the aliased path or null) on the install, and `ROUTES` carries both. `info()` returns the applied values per app so the desktop can diff them against the sitemap.

## RPC

Added to the contract (`CONTRACT` 3):

- `getSitemap(): Sitemap` with defaults filled from `ROUTES` for a workspace that has none yet.
- `setSitemap(input): Sitemap` validates and stores the whole document; returns the saved version with ids and timestamps filled in.
- `info()` adds `sitemap: Sitemap` and, per app, `mount` and `home` as built.

A mount rename in `setSitemap` adds a `rename` rule `<old>/*` to `<new>/*` (301) unless one already covers it. Renaming back removes the rule it would loop with.

## The desktop

The **Sitemap** page (already a nav target in `nav-config.ts`, a placeholder today) is the editor. It is also linked from Settings so a user who looks there finds it; one page, two ways in.

Sections, top to bottom:

1. **Homepage.** A picker over every public page the installed apps declare, plus a free path field. The picker's list comes from the app bundle: `appRoutes` writes the public route paths it built into the bundle manifest, and `info()` passes them on. Choosing a page saves `home` and marks that app Needs a build. "No homepage" falls back to the app at `/` or the listing.
2. **Apps and their paths.** One row per installed app: name, mount (editable, validated inline), the pages under it, admin at `/admin/<id>`, API at `/api/<id>`. Editing a mount saves at once, shows the rename redirect it added, and marks the row Needs a build with a Build button that runs the existing build-and-deploy flow for that app. Until built, the row shows both: "built at `/f`, moving to `/forms`".
3. **Redirects.** The ordered rule list: from, to, status, enabled, note, source. Drag to reorder. Rename rules are shown with their origin and can be deleted once the old path can go. A test field ("where does `/f/pricing` go?") evaluates the rules and mounts in the renderer with the same matcher the Worker uses, exported from app-kit so the two cannot drift.

Everything saves through `setSitemap`; the page reloads `info()` after a build to clear the Needs a build state.

## Later, not now

- **Rewrites** (serve `/a` with the content of `/b`, URL unchanged). Works only for responses without a client-side router: API routes, assets, static HTML. Add as a rule kind once there is a page type it is safe for, and say so in the UI.
- **Per-app legacy paths** in the manifest, so an app update can ship its own redirects when it renames a page.
- **Custom domains and subdomains per app**: a mount that is a host instead of a path. The sitemap shape allows it (`mounts[app] = "https://shop.example.com"`) but the router and the build do not.
- Moving the rules into the `ROUTES` binding to drop the D1 read, if the per-isolate cache ever shows up in latency.

## Order of work

1. Worker: `Sitemap` types and validation, `getSitemap`/`setSitemap`, rules in the router, `x-sg-mount`, home forward. Contract 3.
2. app-kit: `SG_PUBLIC_MOUNT`, `SG_HOME` alias, `ctx.mount` and `href`, public route list in the bundle manifest. Hello sample updated.
3. cloud: build passes the variables; install records built mount and home; `ROUTES` carries them.
4. Desktop: the Sitemap page, the Needs a build state, the Build button on the row, the Settings link.
5. Smoke: rename Hello from `/hello` to `/hi`, confirm the redirect works before the build and the page works after; set its index as the homepage and load `/`.

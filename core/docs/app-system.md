# The app system

An app is the unit everything in SuperGrid is built from: a site, a form, a shop, a booking calendar, a design system
other apps share. Each one is a React Router app on its own Cloudflare Worker, installed into a workspace that gives it
a database, contacts, events, assets, themes and a place on the domain. This page is the map: what an app is made of,
what the core knows about it and how, and where to read more. Every app starts from the template (`core/template`), so
every app has the same shape.

```
supergrid.app.json        the manifest: the one file the core reads          → manifest.md
icon.svg                  the app's icon (iconify, 24×24, currentColor)
workers/app.ts            the Worker: migrations, operations, hooks           → manifest.md §Data, §Operations
app/routes.ts             public under the mount, admin under /admin/<id>, api under /api/<id>
app/routes/public/        public pages (optional)                             → public.md
app/routes/admin/         admin screens, inside the desktop                   → admin-ui.md
app/routes/api/           resource routes (JSON, webhooks)
app/lib/                  data helpers, one file per entity
app/components/ui/        the base-ui kit, copied in; themed at runtime      → ui (UI kit)
app/components/admin/     the admin layer: Page, Card, DataTable, AssetField  → admin-ui.md
app/components/site/      the public layer: SiteLayout, Container, PageTitle  → public.md
packages/                 shared packages other apps import                  → packages.md
.claude/skills/           what the coding agent reads first
GUIDE.md, CHANGELOG.md    the map of the repo; what changed, for people and for updates
```

## What the core knows, and when

The manifest is **declared at build time and served at run time**:

| Moment | Who reads what | What it gets |
|---|---|---|
| Build | `appRoutes`, `appViteConfig` read `supergrid.app.json` | the mount, the admin and API prefixes, the route entry for a local dev workspace |
| Install | the desktop reads the manifest, inlines the icon, deploys the Worker | the workspace's `ROUTES` binding gains the app's **route summary**: id, name, version, icon, color, mount, admin, api, operations, nav, subscribes, entity keys |
| Running | the app serves `/_app/<id>/manifest.json` | the **served manifest**: the manifest plus its operations (with schemas) and its entities (with columns) |
| In the desktop | the rail and menus read the route summary; the Dev panel and the agent read the served manifest | icons and menus with no request to the app; data and operations straight from the running code |

So a new screen, entity or operation ships with the app's own deploy. Nothing in the workspace or the desktop needs a
redeploy. The only thing fixed at install is the route summary, which the desktop rewrites on every deploy.

## The parts of an app

| Part | Required | Where it is declared | What the system does with it |
|---|---|---|---|
| **Identity**: id, name, version, description, icon, color | yes | manifest | the rail row, the app tile, the Worker's name (`sg-app-<ws>-<id>`), the table prefix (`app_<id>_`) |
| **Public pages** | no | `public.mount` in the manifest, `app/routes/public` | served under the mount on the workspace's domain; the sitemap can move the mount (a rebuild) and redirect the old one |
| **Admin screens** | no | `admin.nav` in the manifest, `app/routes/admin` | the menu beside the rail (groups from `children`, settings entries under Settings), the iframe at `/admin/<id>` signed in through the handoff |
| **API** | no | `api: true`, `app/routes/api` | routes under `/api/<id>`, open by default (webhooks live there) |
| **Operations** | no | `operations: true`, `operations` in `createAppWorker` | `ctx.call`, REST at `/api/<id>/ops`, MCP at `/api/<id>/mcp`, the agent's `app_call`; one access rule for all |
| **Data** | no | `data` in the manifest, migrations in the Worker | the Database pages group the tables under the app; the agent knows the columns; `locate` finds where a row is seen |
| **Hooks** | no | `subscribes` in the manifest, `hooks` in the Worker | the workspace POSTs each event to `/_app/<id>/hook` with retries |
| **Permissions** | no | `permissions` | what the app may do in the workspace (informational today; enforced with per-app tokens later) |
| **Shared packages** | no | `packages.exports`, `packages/<name>` | other apps import them; the desktop tracks who uses what and who is behind |

## Lifecycle

1. **Create.** `sg app new <folder> --id=<id>` or the desktop's **New App**: the template is copied, the kits are copied
   in beside it, the manifest gets the id, name, mount, icon and color, dependencies are installed, git starts.
2. **Run.** `pnpm dev` composes the local workspace Worker and the app in one server (the desktop's Dev panel runs it on
   a free port). Public at `http://localhost:<port><mount>`, admin standalone at `/admin/<id>`, the served manifest at
   `/_app/<id>/manifest.json`.
3. **Install.** The desktop builds the folder, uploads the Worker and adds the route summary to the workspace. The app's
   migrations run on its first request through the workspace, which keeps the ledger.
4. **Deploy.** The same as install, for an app already there. The route summary is rewritten, so a nav change shows at once.
5. **Update** (a maintained app from a feed): the signed release goes live when the install repo is untouched, merges
   when the user's changes fit, and marks the app Needs attention on a conflict (core/README.md).
6. **Uninstall.** The route goes, the Worker goes, the tables stay until dropped from the Database pages.

## Where the system touches an app

- **The workspace router** (`core/workspace/src/index.ts`): `/_ws/*` is the workspace; `/_app/<id>/*`, `/admin/<id>/*`
  and `/api/<id>/*` go to the app by id; the longest public mount wins; `/` goes to the app with a `home`. Admin
  requests need the staff cookie; operations calls take the workspace token as a bearer (the desktop) or the cookie.
- **The desktop** (`app/`): the rail lists installed apps with their icons; an app's menu is its `admin.nav`; the app's
  screen is an iframe with the admin SDK on both sides; the Dev panel runs, reads and deploys the folder; the agent gets
  `app_describe`, `app_call`, `app_locate`, `apps_local`, `apps_create`, `apps_install`.
- **The agent** reads `.claude/skills/supergrid-app/SKILL.md` in the app, the docs through `docs_read`, and the served
  manifest through `app_describe`. It builds screens from the admin layer and the kit, data from the declaration,
  behaviour as operations.

## Read next

- [manifest.md](manifest.md): every field, the data types, locate templates, operations, packages.
- [admin-ui.md](admin-ui.md): admin screens that look native, the admin SDK, the media picker.
- [public.md](public.md): public pages on the theme, the site layer, tracking and media.
- [packages.md](packages.md): one app's code in another.
- [app-dev.md](app-dev.md): creating, running, installing, mounts, the Dev panel.

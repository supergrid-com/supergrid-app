# Working in this app

This app was made from the SuperGrid template. It is one React Router app on one Cloudflare Worker, installed into a
workspace that gives it a database, contacts, events, a theme and a library. The full system is described in SuperGrid's
docs (open Docs in the desktop, or `core/docs/app-system.md`); this file is the map of *this* repo.

```
supergrid.app.json      the manifest: id, icon, mount, admin menu, data entities, packages. The core reads only this.
icon.svg                the app's icon (24×24, stroke currentColor). Paste one from icon-sets.iconify.design.
workers/app.ts          the Worker: migrations, operations, hooks
app/routes.ts           public routes under the mount, admin under /admin/<id>, api under /api/<id>
app/routes/public/      the public side. Optional: delete the folder and `public` in the manifest for an admin-only app
app/routes/admin/       the admin side, inside the SuperGrid shell (an iframe) or standalone
app/routes/api/         resource routes (JSON, webhooks). Operations are served by the Worker, not here
app/lib/                data helpers: one file per entity, plain SQL over its table
app/components/ui/      the base-ui kit, copied in. Yours to edit. Reads the theme's CSS variables
app/components/admin/   the admin layer: Page, Card, DataTable, AssetField, the shell. Copied in; yours to edit
app/components/site/    the public layer: SiteLayout (theme + tracking), Container, PageTitle
packages/               shared packages other apps can import (packages/README.md)
.claude/skills/         what a coding agent reads before changing this app
```

## The rules

1. **The manifest is the contract.** Add a screen → add it to `admin.nav`. Add an entity → add it to `data` and write a
   migration. Add an operation → declare it in `workers/app.ts`. The shell, the Database pages and the agent read the
   manifest and the served manifest (`/_app/<id>/manifest.json`), never the code.
2. **Tables are `app_<id>_*`.** The first migration is written from `data` (`initialMigration`); every change after is a
   new migration. Never edit one that shipped.
3. **Writes go through operations.** Screens call `ctx.call("items.create", …)` in actions; REST, MCP and the agent run the
   same function with the same access rule. Core data (contacts, events, assets, settings) goes through `ctx.workspace`.
4. **Looks come from tokens.** Public pages follow the workspace theme (`/_ws/theme.css`); admin screens follow the
   shell (`components/admin/admin.css`). No literal colors, fonts or radii anywhere.
5. **Record what happens.** `ctx.events.emit("item.created", …)` on the server; `useTrack()` in the browser. Reserved
   names (`contact.*`, `page.view`…) are the workspace's.

## Run it

```bash
pnpm install
pnpm dev          # the workspace Worker and this app in one server; public at http://localhost:5301<mount>, admin at /admin/<id>
pnpm typecheck
pnpm build
```

In the SuperGrid desktop the app's Dev panel runs the same commands, shows the files and the git history, and installs
or deploys the app into a workspace.

## Checklist for a change

- [ ] Manifest updated (nav, data, packages)
- [ ] Migration added for any table change
- [ ] Operation added or changed, with its input schema
- [ ] Screens built from `components/admin` and `components/ui`, public pages from `components/site`
- [ ] `pnpm typecheck` clean, `CHANGELOG.md` has a line, `version` bumped if other apps use this one's packages

---
name: supergrid-app
description: Create or change a SuperGrid app (a React Router app on a Cloudflare Worker, installed into a workspace). Use when asked to build an app, add a screen, a table, an operation, a public page or a shared package, or when working in a folder that has supergrid.app.json.
---

# Building a SuperGrid app

An app is one Worker and one React Router 8 project that plugs into a workspace through `@supergrid/app-kit`. The
workspace gives it a D1 database (shared with every app, tables prefixed `app_<id>_`), contacts, events, hooks,
workflows, assets, themes and the sitemap. The desktop shell shows the app's admin screens in an iframe and reads
everything it needs from the manifest. Start every app from the template (`sg app new`, or the desktop's New App).

## The parts, and where each lives

| Part | File(s) | Who reads it |
|---|---|---|
| Manifest | `supergrid.app.json` | the build (routes), the desktop (rail, menu, install), the agent (`app_describe`) |
| Icon | `icon.svg`, named by `icon` in the manifest | the rail; inlined into the manifest at release |
| Data | `data` in the manifest + migrations in `workers/app.ts` | the Database pages, the agent, `locate` |
| Operations | `operations` exported from `workers/app.ts` | `ctx.call`, `POST /api/<id>/ops/<name>`, `POST /api/<id>/mcp`, the agent's `app_call` |
| Public pages | `app/routes/public/*`, `components/site/*` | visitors, under the mount |
| Admin screens | `app/routes/admin/*`, `components/admin/*` | staff, inside the desktop at `/admin/<id>` |
| API | `app/routes/api/*` | anything, under `/api/<id>` |
| Hooks | `hooks` exported from `workers/app.ts`, `subscribes` in the manifest | the workspace, per event |
| Shared packages | `packages/<name>`, `packages.exports` in the manifest | other apps in the workspace |

## Do this, in order

1. **Manifest first.** Set `id`, `name`, `description`, `icon`, `color`. Decide `public.mount` (or delete `public` for
   admin-only). Write `admin.nav` for every screen you will build, with `children` for submenus and `place: "settings"`
   for a settings screen. Declare each entity under `data` with its fields and `admin`/`public` locate templates.
   Run `sg app check` (or `checkManifest`) until it is clean.
2. **Data.** Keep `app/lib/<entity>.ts` as the one place with the row type and the SQL. The first migration comes from
   `initialMigration(manifest)`; later changes are new migrations named `0002_…`. Never edit a shipped migration.
3. **Operations.** One per thing the app can do: `description`, `access` (`"public"`, `"staff"`, `"owner"` or a list of
   permissions like `["content:write"]`), a JSON Schema `input`, `confirm: true` for destructive ones, `run(input, ctx)`.
   Admin actions call `ctx.call(...)`; public forms post to actions that call them too.
4. **Admin screens** with `components/admin`: `<Page title actions>` → `<Card>`, `<DataTable>`, `<Row>`, `<AssetField>`,
   `<EmptyState>`. The shell shows the page title in its title bar and the one main action beside it. Read
   `.claude/skills/supergrid-admin-ui/SKILL.md` for the rules.
5. **Public pages** with `components/site` and `components/ui`: `SiteLayout` loads the theme and tracks page views; use
   `ctx.href("/path")` for links so they follow the mount; `<Img asset>` from `@supergrid/app-kit/media-react` for pictures.
6. **Events.** `ctx.events.emit("thing.happened", props)` after each thing worth counting; names are `<noun>.<verb>`.
7. **Check.** `pnpm typecheck`, `pnpm build`. Add a line to `CHANGELOG.md`. Bump `version` when a shared package changed.

## The context in loaders and actions

```ts
const { db, workspace, manifest, user, events, mount, href, call } = context.get(appContext);
```

- `db`: the workspace's D1. Read any table; write only `app_<id>_*`.
- `workspace`: the RPC (`WorkspaceRpc` in `@supergrid/app-kit/rpc`): contacts, objects, events, analytics, hooks,
  workflows, secrets, assets, themes, settings, sitemap. Core writes go here, never straight to core tables.
- `user`: the staff member on admin requests and on operations calls; `null` on public pages. `requirePermission(user, "content:write")`.
- `call(name, input)`: run one of the app's own operations as this user.

## Rules that do not bend

- Tables are `app_<id>_*`; the workspace refuses anything else.
- No literal colors, fonts or radii. Tokens only (`bg-primary`, `text-muted-foreground`, `rounded-lg`, `font-heading`).
- `/_ws`, `/_app`, `/admin`, `/api` are the workspace's; a mount cannot start there.
- Reserved event names (`page.view`, `contact.*`, `object.*`, `asset.*`, `app.*`) are the workspace's.
- An operation's access rule is the only access rule; a screen may hide a button, it may not be the check.
- The served manifest (`/_app/<id>/manifest.json`) is what the agent trusts. If a screen or entity is not in the manifest, it does not exist to the system.

## Shared packages

To let another app import code: put it in `packages/<name>/` with its own `package.json` (`"name": "@sg-apps/<name>"`),
list it under `packages.exports` in the manifest, and export a thin surface (components, hooks, a typed client over this
app's operations), never tables or internals. A consumer adds `"@sg-apps/<name>": "workspace:*"` and lists it under
`packages.uses` with the version it built against. The desktop keeps every app of a workspace in one pnpm workspace,
so `workspace:*` resolves on disk; when the exporter's version moves, the desktop marks consumers as behind and offers the rebuild.

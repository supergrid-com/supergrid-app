# Building an app

An app is a React Router 8 project that runs on its own Cloudflare Worker and plugs into a workspace through
`@supergrid/app-kit`. Start from the template (`sg app new`, or New App in the desktop); *The app system* is the map of
every part and *The manifest* the reference. This page is the short path.

## The files

```
supergrid.app.json     the manifest: id, icon, mount, admin menu, data entities, operations, packages
icon.svg               the icon, from icon-sets.iconify.design
vite.config.ts         appViteConfig(manifest, …) from @supergrid/app-kit/vite
react-router.config.ts appRouterConfig(manifest) from @supergrid/app-kit/config
wrangler.jsonc         the Worker; bindings WORKSPACE (RPC) and DB (the workspace's D1) are set at install
workers/app.ts         createAppWorker(manifest, { migrations, operations, hooks })
app/routes.ts          appRoutes(manifest, { public, admin, api })
app/routes/            public/, admin/, api/
app/lib/               data helpers, one file per entity
app/components/ui/     the UI kit, copied in (see UI kit)
app/components/admin/  the admin layer (see Admin screens)
app/components/site/   the public layer (see Public pages)
```

## The manifest

```json
{
  "id": "hello",
  "name": "Hello",
  "version": "0.1.0",
  "description": "A small sample app with a public page, an admin screen and an API.",
  "icon": "icon.svg",
  "color": "#e8604a",
  "public": { "mount": "/hello" },
  "admin": { "nav": [{ "label": "Overview", "path": "/", "icon": "home" }, { "label": "Notes", "path": "/notes", "icon": "sticky-note" }] },
  "api": true,
  "operations": true,
  "data": { "note": { "label": "Note", "fields": { "id": { "type": "id" }, "body": { "type": "text", "required": true }, "contact_id": { "type": "ref", "to": "core.contact" }, "created_at": { "type": "datetime" } }, "admin": { "list": "/notes" } } },
  "permissions": ["contacts:write", "events:emit"],
  "subscribes": ["contact.tagged"]
}
```

| Field | Meaning |
|---|---|
| `id` | lowercase, unique in the workspace; names the Worker (`sg-app-<ws>-<id>`) and prefixes the app's tables |
| `icon`, `color` | the rail glyph and tile; the SVG is inlined at install |
| `public.mount` | where the public pages live on the workspace's domain. The default at install; the sitemap owns it after |
| `admin.nav` | the admin screens' menu, under `/admin/<id>`; `children` for submenus, `place: "settings"` for a settings screen |
| `api`, `operations` | routes under `/api/<id>`; operations served as REST and MCP there |
| `data` | the app's entities: fields, the table, where rows are seen (the agent and the Database pages read this) |
| `permissions` | what the app may do in the workspace |
| `subscribes` | event names delivered to the app's hooks |

## Routes

```ts
// app/routes.ts
import { index, layout, route } from "@react-router/dev/routes";
import { appRoutes } from "@supergrid/app-kit/routes";
import manifest from "../supergrid.app.json";

export default appRoutes(manifest, {
  public: [index("routes/public/index.tsx")],
  admin: [layout("routes/admin/layout.tsx", [index("routes/admin/index.tsx"), route("notes", "routes/admin/notes.tsx")])],
  api: [route("ping", "routes/api/ping.ts")],
});
```

Paths are baked in at build time: public under the mount, admin under `/admin/<id>`, API under `/api/<id>`. A mount change
is a rebuild of the app.

## The app context

Every loader and action gets the workspace through `appContext`:

```ts
import { appContext } from "@supergrid/app-kit/context";

export async function loader({ context }: Route.LoaderArgs) {
  const { db, workspace, manifest, user, events } = context.get(appContext);
  // …
}
```

| | |
|---|---|
| `db` | the workspace's D1. Your tables and the shared ones (`contacts`, …) are in the same database, so a join is one query |
| `workspace` | RPC to the workspace: contacts, objects, events, analytics, hooks, workflows, secrets, assets, themes, sitemap (`WorkspaceRpc` in `@supergrid/app-kit/rpc`) |
| `manifest` | the app's manifest |
| `user` | the staff member on admin requests, `null` on public pages. Gate actions with `requirePermission(user, "…")` from `@supergrid/app-kit/user` |
| `events` | `events.emit("order.completed", { total })` records an event as this app (see *Events*) |
| `mount`, `href` | the public prefix this request came in at, and a link under it |
| `call` | `call("notes.create", input)`: one of the app's own operations, as this user |

## Tables and migrations

Declare migrations in `workers/app.ts`. The workspace applies them once, in order, and keeps the ledger (Database ›
Migrations). Name tables `app_<id>_<table>`; reference shared tables freely. The first migration comes from the
manifest's `data`; later ones are written by hand.

```ts
import { initialMigration } from "@supergrid/app-kit/data";
export default createAppWorker(manifest, {
  migrations: [
    initialMigration(manifest),   // 0001_init: CREATE TABLE for every entity in data
    { name: "0002_pinned", sql: `ALTER TABLE app_hello_notes ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0` },
  ],
  operations: {
    "notes.create": { description: "Add a note", access: ["content:write"], input: { type: "object", required: ["body"], properties: { body: { type: "string" } } }, run: (input, ctx) => addNote(ctx.db, input) },
  },
});
```

Never edit a migration that has shipped; add the next one, and update `data` so the declaration still matches.

## Reacting to events

List the event names in `subscribes` and handle them in `hooks`. The workspace delivers each one to the app's Worker.

```ts
hooks: {
  "contact.tagged": async (event, env) => {
    await env.DB.prepare("INSERT INTO app_hello_notes (id, contact_id, body) VALUES (?, ?, ?)")
      .bind(crypto.randomUUID(), event.contact_id, `Tagged ${String(event.props.tag)}`).run();
  },
},
```

*Hooks* and *Workflows* cover the rest: retries, conditions, and rules people set up without code.

## Screens

Admin screens: `Page`, `Card`, `DataTable`, `Row`, `AssetField` from `app/components/admin`, inside `AdminApp` (*Admin
screens*). Public pages: `SiteLayout`, `Container`, `PageTitle` from `app/components/site` (*Public pages*). Both on the
kit in `app/components/ui` and theme tokens (`bg-background`, `text-muted-foreground`, `bg-primary`…), never literal
colors or fonts. The workspace theme loads at runtime from `/_ws/theme.css` on public pages; admin screens take the
shell's tokens. *UI kit* has the rules; *Themes* covers changing the look itself.

## Checklist

1. Manifest first: id, icon, mount, admin nav, data, operations, packages.
2. Migrations for the app's tables, prefixed `app_<id>_`; the first from `initialMigration`.
3. Operations for every write; screens call them through `ctx.call`.
4. Routes through `appRoutes`, data through `appContext` in loaders and actions.
5. Admin layer, site layer, kit components and tokens only.
6. Emit an event for each thing that happens that someone may want to count, segment or automate on.

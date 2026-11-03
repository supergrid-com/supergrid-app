# Building an app

An app is a React Router 7 project that runs on its own Cloudflare Worker and plugs into a workspace through
`@supergrid/app-kit`. The sample app `dev/apps/hello` is the reference for everything below.

## The files

```
supergrid.app.json     the manifest: id, mounts, tables, permissions, events it subscribes to
vite.config.ts         appViteConfig(manifest, …) from @supergrid/app-kit/vite
react-router.config.ts appRouterConfig(manifest) from @supergrid/app-kit/config
wrangler.jsonc         the Worker; bindings WORKSPACE (RPC) and DB (the workspace's D1) are set at install
workers/app.ts         createAppWorker(manifest, { migrations, objects, hooks })
app/routes.ts          appRoutes(manifest, { public, admin, api })
app/routes/            public/, admin/, api/
app/components/ui/     the UI kit, copied in (see UI kit)
```

## The manifest

```json
{
  "id": "hello",
  "name": "Hello",
  "version": "0.1.0",
  "description": "A small sample app with a public page, an admin screen and an API.",
  "public": { "mount": "/hello" },
  "admin": { "nav": [{ "label": "Overview", "path": "/" }, { "label": "Notes", "path": "/notes" }] },
  "api": true,
  "tables": ["notes"],
  "permissions": ["contacts:write", "events:emit"],
  "subscribes": ["contact.tagged"]
}
```

| Field | Meaning |
|---|---|
| `id` | lowercase, unique in the workspace; names the Worker (`sg-app-<ws>-<id>`) and prefixes the app's tables |
| `public.mount` | where the public pages live on the workspace's domain. The default at install; the sitemap owns it after |
| `admin.nav` | the admin screens' menu, under `/admin/<id>` |
| `api` | `true` serves routes under `/api/<id>` |
| `tables` | the app's own tables, named `app_<id>_<table>` |
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

## Tables and migrations

Declare migrations in `workers/app.ts`. The workspace applies them once, in order, and keeps the ledger (Database ›
Migrations). Name tables `app_<id>_<table>`; reference shared tables freely.

```ts
export default createAppWorker(manifest, {
  migrations: [
    { name: "0001_notes", sql: `CREATE TABLE IF NOT EXISTS app_hello_notes (id TEXT PRIMARY KEY, contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL, body TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')))` },
  ],
});
```

Never edit a migration that has shipped; add the next one.

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

Build every screen with the kit in `app/components/ui` and theme tokens (`bg-background`, `text-muted-foreground`,
`bg-primary`…), never literal colors or fonts. The workspace theme loads at runtime from `/_ws/theme.css`, so one theme
change restyles every app. *UI kit* has the rules; *Themes* covers changing the look itself.

## Checklist

1. Manifest first: id, mounts, tables, permissions, subscribes.
2. Migrations for the app's tables, prefixed `app_<id>_`.
3. Routes through `appRoutes`, data through `appContext` in loaders and actions.
4. Kit components and tokens only.
5. Emit an event for each thing that happens that someone may want to count, segment or automate on.

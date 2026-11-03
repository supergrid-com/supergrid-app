# The manifest

`supergrid.app.json` is the contract between an app and everything around it: the build, the workspace, the desktop,
other apps and agents. The type is `AppManifest` in `@supergrid/app-kit/manifest`; `parseManifest` checks a document
and fills in defaults; `sg app check` runs it from the terminal. A running app serves the manifest with its operations
and entities filled in at `/_app/<id>/manifest.json` (`ServedManifest`).

```jsonc
{
  "id": "forms",                               // lowercase letters, digits, dashes; names the Worker, the tables, the admin path. Fixed once installed.
  "name": "Forms",
  "version": "0.4.0",                          // semver; bump it when a shared package's surface changes
  "description": "One-question forms; answers become contacts.",
  "icon": "icon.svg",                          // a file in the repo, or an inline <svg>; inlined into the manifest at install and release
  "color": "#e8604a",                          // the tile behind the icon
  "category": "marketing",
  "upstream": "https://…",                     // where updates come from; absent for the user's own app

  "public": { "mount": "/form", "home": "/" }, // omit for admin-only. `home`: a page under the mount also served as "/" (the site app)
  "admin": {
    "nav": [
      { "id": "forms", "label": "Forms", "path": "/", "icon": "list" },
      { "id": "answers", "label": "Answers", "path": "/answers", "icon": "inbox",
        "children": [{ "label": "Recent", "path": "/answers" }, { "label": "Export", "path": "/answers/export" }],
        "match": ["/answers/*"] },
      { "id": "settings", "label": "Settings", "path": "/settings", "icon": "settings", "place": "settings" }
    ],
    "create": [{ "label": "New Form", "path": "/?new=1" }]   // the shell's "+ New" entries for this app
  },
  "api": true,                                 // serves /api/forms/*
  "operations": true,                          // the Worker declares operations; served as REST and MCP under /api/forms

  "data": {                                    // every kind of row the app keeps; see Data below
    "form": {
      "label": "Form", "plural": "Forms", "title": "title",
      "fields": {
        "id": { "type": "id" },
        "slug": { "type": "slug", "label": "Slug", "unique": true, "required": true },
        "title": { "type": "string", "label": "Title", "required": true, "search": true },
        "question": { "type": "text", "label": "Question", "required": true },
        "status": { "type": "enum", "values": ["draft", "live"], "default": "'draft'" },
        "cover": { "type": "media", "media": ["image"] },
        "created_at": { "type": "datetime" }, "updated_at": { "type": "datetime" }
      },
      "admin": { "list": "/", "view": "/:id" },            // relative to /admin/forms
      "public": { "list": "/", "view": "/:slug" }          // relative to the mount
    },
    "response": {
      "label": "Response",
      "fields": {
        "id": { "type": "id" },
        "form_id": { "type": "ref", "to": "forms.form", "onDelete": "cascade", "required": true },
        "contact_id": { "type": "ref", "to": "core.contact", "onDelete": "set null" },
        "answer": { "type": "text", "search": true },
        "created_at": { "type": "datetime" }
      },
      "admin": { "list": "/:form_id", "view": "/:form_id#r-:id" }
    }
  },

  "packages": {
    "exports": [{ "name": "@sg-apps/forms-embed", "path": "packages/forms-embed", "description": "<FormEmbed slug>" }],
    "uses": [{ "name": "@sg-apps/design-system", "app": "design-system", "version": "1.2.0" }]
  },
  "permissions": ["contacts:write", "events:emit"],
  "subscribes": ["contact.tagged"],
  "requires": { "workspace": 3, "apps": { "pages": ">=1.0.0" } }
}
```

## Identity

| Field | Rule | Used for |
|---|---|---|
| `id` | `^[a-z][a-z0-9-]*$`, up to 40 characters | the Worker `sg-app-<ws>-<id>`, tables `app_<id>_*` (dashes become underscores), `/admin/<id>`, `/api/<id>`, `/_app/<id>` |
| `name` | any | the rail, titles, the catalog |
| `version` | semver | the route summary, the package graph, releases |
| `icon` | an inline `<svg>` with no scripts or handlers, or a path to one | the rail glyph and the app tile. Pick one at [icon-sets.iconify.design](https://icon-sets.iconify.design/) (lucide fits the desktop), copy its SVG, keep `currentColor` |
| `color` | `#rrggbb` | the tile; the active color when absent |

## Public, admin, API

- `public.mount` is `/` or `/lowercase/segments`; `/_ws`, `/_app`, `/admin` and `/api` are refused. It is the default
  at install; the **sitemap** owns the mount after that (a change is a rebuild, with a redirect from the old prefix).
  `public.home` names a page under the mount that the workspace also serves as `/`: that app is the site.
- `admin.nav` is the menu the desktop draws beside the rail. Paths are relative to `/admin/<id>`. `children` become a
  titled group; `match` keeps an item lit for paths not under its own; `place: "settings"` moves an item under a
  Settings group at the end; `icon` is a lucide name (`list`, `inbox`, `settings`, `file-text`). The app itself gets
  the same list through the admin SDK (`host.nav`) for its standalone menu. The desktop adds a **Dev Panel** row.
- `api: true` serves `app/routes/api` under `/api/<id>`. These routes are public unless the app checks the user.

## Data

`data` is **descriptive**: migrations create the tables, the declaration says what they mean. The first migration can be
written from the declaration (`initialMigration(manifest)` in `@supergrid/app-kit/data`); every change after is a new
migration. The workspace refuses tables outside `app_<id>_*`.

| `type` | Column | Notes |
|---|---|---|
| `id` | `TEXT PRIMARY KEY` | one per entity, required |
| `string` | `TEXT` | one line; `unique`, `required`, `default` |
| `slug` | `TEXT` | a URL-safe key; indexed |
| `text` | `TEXT` | many lines; `search: true` marks it for the workspace's search |
| `number`, `integer` | `REAL`, `INTEGER` | |
| `boolean` | `INTEGER` 0/1 | defaults to 0 |
| `datetime` | `TEXT` ISO-8601 | `created_at` and `updated_at` get `datetime('now')` defaults; keep both on every entity |
| `json` | `TEXT` | `schema` may hold a JSON Schema for agents; defaults to `{}` |
| `ref` | `TEXT` | `to: "<app>.<entity>"` or `core.contact`; `onDelete: cascade \| set null \| restrict`; a real foreign key when the table is in reach |
| `enum` | `TEXT` | `values`; `default: "'draft'"` (SQL) |
| `media` | `TEXT` | an asset reference as JSON (`AssetRef` in the admin layer); `media: ["image"]` says what the picker offers |

Every entity has `label`, optional `plural` (`<label>s`), `table` (`app_<id>_<key>`), `title` (the field that names a
row: `title`, `name` or the id) and `fields`. The served manifest adds `columns` in order, with labels.

**Locate templates.** `admin.list`, `admin.view`, `admin.edit` (relative to `/admin/<id>`) and `public.list`,
`public.view` (relative to the mount) are paths over the entity's fields: `/:form_id#r-:id`. `locate(manifest, entity,
row)` fills them; the agent's `app_locate` reads the row and answers with the admin page to open and the public URL.
That is how "open the form the user is talking about" works without the agent reading route files.

## Operations

`operations: true` says the Worker declares them. In `workers/app.ts`:

```ts
operations: {
  "forms.create": {
    description: "Create a form",
    access: ["content:write"],            // "public" | "staff" | "owner" | ["permission", …]
    input: { type: "object", required: ["title"], properties: { title: { type: "string", maxLength: 200 } } },
    output: { type: "object", properties: { id: { type: "string" } } },   // documents the result for agents
    confirm: false,                        // true: the desktop asks the user; MCP marks the tool destructive
    run: async (input, ctx) => createForm(ctx.db, input),
  },
}
```

| Surface | How | Who the app sees |
|---|---|---|
| In process | `ctx.call("forms.create", input)` in loaders and actions | the request's user |
| REST | `POST /api/<id>/ops/forms.create` (JSON in, `{ result }` or `{ error, problems }` out); `GET /api/<id>/ops` lists | the staff cookie, or `Authorization: Bearer <workspace token>` as an owner |
| MCP | `POST /api/<id>/mcp` (Streamable HTTP, stateless): `initialize`, `tools/list`, `tools/call`; tool names use underscores (`forms_create`) | same |
| The desktop's agent | `app_call` | an owner |

The input is checked against `input` (type, required, properties, enum, items, min/max, pattern, defaults) before
`run`; a public operation never sees a user. The access rule is the only access rule: a screen may hide a button, the
operation decides.

## Packages, permissions, requires

- `packages.exports`: `{ name, path: "packages/<folder>", description }`, the package lives in the repo and is published
  to the workspace's pnpm workspace by the desktop. `packages.uses`: `{ name, app, version }`, the version the consumer
  was last built against; the desktop marks it behind when the exporter's `version` moved. See [packages.md](packages.md).
- `permissions`: what the app does in the workspace (`contacts:write`, `events:emit`, `assets:write`). Informational
  today; the per-app token that enforces it is on the list.
- `subscribes`: event names delivered to the Worker's `hooks`.
- `requires.workspace`: the contract number (`CONTRACT` in `@supergrid/app-kit/rpc`); `requires.apps`: other apps and
  the versions this one was written against, shown at install.

## What is served

`GET /_app/<id>/manifest.json` returns the manifest with `served: true`, `operations: [{ name, description, access,
input, output, confirm }]`, `entities: [{ key, label, table, title, columns, admin, public }]` and `build: { mode, at }` (`at` is when it was
served; a Worker has no clock of its own before a request). The desktop's Dev panel shows it, `app_describe` returns it, and the workspace's `/_ws/manifest` lists the route
summaries of every installed app (`info()`).

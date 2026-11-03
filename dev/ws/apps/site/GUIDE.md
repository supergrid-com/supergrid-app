# This app

An app folder inside a SuperGrid workspace repo (`apps/<id>/`). The workspace builds every app into one Worker; this
folder holds only what is the app's own.

```
supergrid.app.json      the manifest: identity, mount, admin menu, data, permissions (core/docs/manifest.md)
app/routes.ts           the public, admin and api route lists, files relative to app/
app/routes/public/      pages under the mount
app/routes/admin/       screens inside the desktop, on the admin layer (~/components/admin) and the kit (~/components/ui)
app/routes/api/         resource routes under /api/<id>
app/lib/                the app's own code; import it with relative paths (../../lib/items)
workers/app.ts          migrations, operations and hooks, composed into the workspace Worker
packages/               what the app hands to other apps; import it by path
```

`~/` is the workspace's `app/` folder: the shared kit, the admin layer and the site frame live there. The rest of the
workspace's apps are siblings under `apps/`; reach their code through their `packages/`, their data through their
operations.

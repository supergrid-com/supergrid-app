# A SuperGrid workspace

One repo, one Worker. Every app is a folder under `apps/`; the build puts them all in `sg-ws-<id>`.

```
supergrid.workspace.json   the workspace: id, name, disabled apps, mounts the sitemap chose
apps/<id>/                 an app: manifest, routes, screens, migrations, operations (see its GUIDE.md)
app/                       the workspace's own React Router app: root, styles, the shared kit (components/ui), the admin layer (components/admin), the site frame (components/site)
workers/index.ts           the Worker entry: createWorkspaceWorker over the generated registry
.sg/                       generated from the manifests on every dev session and build: routes.ts, apps.ts
```

`pnpm dev` runs everything at http://localhost:5301 on a local D1. `pnpm build` builds the Worker; `pnpm deploy` uploads it.

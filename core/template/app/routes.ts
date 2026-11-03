import { index, layout, route } from "@react-router/dev/routes";
import { appRoutes } from "@supergrid/app-kit/routes";
import manifest from "../supergrid.app.json";

// Public routes live under the manifest's mount, admin under /admin/<id>, API under /api/<id>. Keep this list in step
// with `admin.nav` and the `data.*.admin` / `data.*.public` templates in the manifest: they are how the shell and the
// agent find these screens.
export default appRoutes(manifest, {
  public: [layout("routes/public/layout.tsx", [index("routes/public/index.tsx"), route(":id", "routes/public/item.tsx")])],
  admin: [layout("routes/admin/layout.tsx", [index("routes/admin/index.tsx"), route(":id", "routes/admin/item.tsx"), route("settings", "routes/admin/settings.tsx")])],
  api: [route("health", "routes/api/health.ts")],
});

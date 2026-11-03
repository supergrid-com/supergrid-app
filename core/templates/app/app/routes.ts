import { index, layout, route } from "@react-router/dev/routes";
import { defineAppRoutes } from "@supergrid/app-kit/compose";

// The app's routes, as three lists with files relative to this folder. The workspace's build puts the public ones
// under the app's mount, the admin ones under /admin/<id> and the api ones under /api/<id>. Keep this in step with
// `admin.nav` and the `data.*.admin` / `data.*.public` templates in the manifest: they are how the shell and the agent
// find these screens.
export default defineAppRoutes({
  public: [layout("routes/public/layout.tsx", [index("routes/public/index.tsx"), route(":id", "routes/public/item.tsx")])],
  admin: [layout("routes/admin/layout.tsx", [index("routes/admin/index.tsx"), route(":id", "routes/admin/item.tsx"), route("settings", "routes/admin/settings.tsx")])],
  api: [route("health", "routes/api/health.ts")],
});

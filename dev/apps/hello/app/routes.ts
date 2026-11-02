import { index, layout, route } from "@react-router/dev/routes";
import { appRoutes } from "@supergrid/app-kit/routes";
import manifest from "../supergrid.app.json";

export default appRoutes(manifest, {
  public: [index("routes/public/index.tsx")],
  admin: [layout("routes/admin/layout.tsx", [index("routes/admin/index.tsx"), route("notes", "routes/admin/notes.tsx")])],
  api: [route("ping", "routes/api/ping.ts")],
});

import { index, layout, route } from "@react-router/dev/routes";
import { appRoutes } from "@supergrid/app-kit/routes";
import manifest from "../supergrid.app.json";

export default appRoutes(manifest, {
  public: [index("routes/public/index.tsx"), route(":slug", "routes/public/form.tsx")],
  admin: [layout("routes/admin/layout.tsx", [index("routes/admin/index.tsx"), route(":id", "routes/admin/form.tsx")])],
  api: [route(":slug/responses", "routes/api/responses.ts")],
});

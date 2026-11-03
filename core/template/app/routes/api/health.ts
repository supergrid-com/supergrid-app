import { appContext } from "@supergrid/app-kit/context";
import type { Route } from "./+types/health";

/** GET /api/<id>/health: a plain resource route, beside the operations the Worker serves under /api/<id>/ops. */
export async function loader({ context }: Route.LoaderArgs) {
  const { manifest, mount } = context.get(appContext);
  return Response.json({ ok: true, app: manifest.id, version: manifest.version, mount });
}

import { appContext } from "@supergrid/app-kit/context";
import type { Route } from "./+types/ping";

export async function loader({ context, request }: Route.LoaderArgs) {
  const { manifest } = context.get(appContext);
  return Response.json({ app: manifest.id, version: manifest.version, workspace: request.headers.get("x-sg-workspace"), at: new Date().toISOString() });
}

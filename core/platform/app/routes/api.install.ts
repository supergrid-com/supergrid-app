import { requireWorkspace } from "../../src/access";
import { platformContext, requireActor } from "../../src/context";
import { removeInstall } from "../../src/db";
import type { Route } from "./+types/api.install";

export async function action({ request, context, params }: Route.ActionArgs) {
  const p = requireActor(context.get(platformContext));
  if (request.method !== "DELETE") return new Response("Method not allowed", { status: 405 });
  await requireWorkspace(p.env, p.actor, params.id, "app:uninstall");
  await removeInstall(p.env, params.id, params.app);
  return Response.json({ ok: true });
}

import { requireWorkspace } from "../../src/access";
import { platformContext, requireActor } from "../../src/context";
import { listInstalls, upsertInstall } from "../../src/db";
import type { Route } from "./+types/api.installs";

export async function loader({ context, params }: Route.LoaderArgs) {
  const p = requireActor(context.get(platformContext));
  await requireWorkspace(p.env, p.actor, params.id);
  return Response.json(await listInstalls(p.env, params.id));
}

export async function action({ request, context, params }: Route.ActionArgs) {
  const p = requireActor(context.get(platformContext));
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  await requireWorkspace(p.env, p.actor, params.id, "app:install");
  const b = (await request.json()) as { app: string; name: string; version: string; worker: string; repo?: string | null; mount?: string | null; upstream?: string | null };
  if (!b?.app || !b.worker) return Response.json({ error: "app and worker are required" }, { status: 400 });
  await upsertInstall(p.env, { workspace_id: params.id, app_id: b.app, name: b.name || b.app, version: b.version || "0.0.0", worker: b.worker, repo: b.repo ?? null, mount: b.mount ?? null, upstream: b.upstream ?? null });
  return Response.json({ ok: true });
}

// The one endpoint the Updates and App Store pages post to. One thing per request, so "update all" is the page calling this once per
// workspace: each step gets its own time budget and a failure stops the rollout where it happened.
import { requireWorkspace } from "../../src/access";
import { checkReleases } from "../../src/cloud";
import { platformContext, requireActor } from "../../src/context";
import { installAppFlow, updateAppFlow, updatePlatformFlow, updateWorkspaceFlow } from "../../src/flows";
import { errorMessage } from "../ui";
import type { Route } from "./+types/run";

export async function action({ request, context }: Route.ActionArgs) {
  const p = requireActor(context.get(platformContext));
  const f = await request.formData();
  const s = (k: string) => String(f.get(k) ?? "");
  const operatorOnly = () => { if (!p.actor.operator) throw new Response("Operators only", { status: 403 }); };
  try {
    switch (s("intent")) {
      case "check": operatorOnly(); await checkReleases(p.env); return { ok: true };
      case "platform": operatorOnly(); await updatePlatformFlow(p.env); return { ok: true };
      case "workspace": await requireWorkspace(p.env, p.actor, s("workspace"), "workspace:deploy"); await updateWorkspaceFlow(p.env, s("workspace")); return { ok: true };
      case "install-app": { await requireWorkspace(p.env, p.actor, s("workspace"), "app:install"); return { ok: true, warning: await installAppFlow(p.env, s("workspace"), s("app")) }; }
      case "update-app": { await requireWorkspace(p.env, p.actor, s("workspace"), "app:update"); return { ok: true, outcome: await updateAppFlow(p.env, s("workspace"), s("app")) }; }
    }
  } catch (e) {
    if (e instanceof Response) throw e;
    console.error("run failed", s("intent"), e, (e as Error)?.stack);
    return { ok: false, error: errorMessage(e) };
  }
  return { ok: false, error: "Unknown request." };
}

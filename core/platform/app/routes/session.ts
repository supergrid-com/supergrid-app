// Session-level actions the side nav posts to: switch the active organization, stop impersonating.
import { redirect } from "react-router";
import { platformContext, requireActor } from "../../src/context";
import type { Route } from "./+types/session";

export async function action({ request, context }: Route.ActionArgs) {
  const p = requireActor(context.get(platformContext));
  const f = await request.formData();
  const intent = String(f.get("intent"));
  if (intent === "switch-org") {
    const organizationId = String(f.get("organizationId") || "");
    if (p.actor.operator || p.memberships.some((m) => m.organizationId === organizationId)) {
      await p.auth.api.setActiveOrganization({ body: { organizationId }, headers: request.headers });
    }
    return redirect("/");
  }
  if (intent === "stop-impersonating") {
    const { headers } = await p.auth.api.stopImpersonating({ headers: request.headers, returnHeaders: true });
    return redirect("/operator", { headers });
  }
  return new Response("Unknown intent", { status: 400 });
}

export const loader = () => redirect("/");

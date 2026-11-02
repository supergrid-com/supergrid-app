// The iframe's first hop. Checks access, mints a 5-minute handoff token signed with the workspace's token, and sends the
// iframe to the workspace's /_ws/auth, which sets its own staff cookie and continues to the admin path.
import { redirect } from "react-router";
import { requireWorkspace } from "../../src/access";
import { platformContext, requireActor } from "../../src/context";
import { mintToken } from "../../src/handoff";
import type { Route } from "./+types/frame";

export async function loader({ request, context, params }: Route.LoaderArgs) {
  const p = requireActor(context.get(platformContext));
  const { ws, grant } = await requireWorkspace(p.env, p.actor, params.id, "content:read");
  const wanted = new URL(request.url).searchParams.get("path") || "";
  const next = `/admin/${params.app}${wanted.startsWith("/") ? wanted : ""}`;
  const token = await mintToken(ws.token, {
    typ: "handoff", aud: ws.id, exp: Math.floor(Date.now() / 1000) + 300,
    sub: p.actor.user.id, name: p.actor.user.name, email: p.actor.user.email, org: ws.organization_id, role: grant.role, permissions: grant.permissions,
  });
  const target = new URL("/_ws/auth", ws.url);
  target.searchParams.set("token", token);
  target.searchParams.set("next", next);
  return redirect(target.href, { headers: { "cache-control": "no-store" } });
}

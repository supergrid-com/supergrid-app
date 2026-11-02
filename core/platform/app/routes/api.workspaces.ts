import { can, orgGrant, visibleWorkspaces } from "../../src/access";
import { platformContext, requireActor } from "../../src/context";
import { createWorkspace, getOrgBySlug, getWorkspace, listOrgs, listWorkspaces } from "../../src/db";
import type { Route } from "./+types/api.workspaces";

export async function loader({ context }: Route.LoaderArgs) {
  const p = requireActor(context.get(platformContext));
  const visible = await visibleWorkspaces(p.env, p.actor, await listWorkspaces(p.env));
  return Response.json(visible.map(({ ws: { token: _t, ...w }, grant }) => ({ ...w, role: grant.role })));
}

/** Registers (or re-registers) a workspace. New ones need an organization: `organization` (slug), else the caller's only one. */
export async function action({ request, context }: Route.ActionArgs) {
  const p = requireActor(context.get(platformContext));
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const body = (await request.json()) as { id: string; name: string; url: string; token: string; repo?: string; organization?: string };
  if (!body?.id || !body.url || !body.token) return Response.json({ error: "id, url and token are required" }, { status: 400 });
  const existing = await getWorkspace(p.env, body.id);
  let orgId = existing?.organization_id ?? null;
  if (!orgId) {
    if (body.organization) orgId = (await getOrgBySlug(p.env, body.organization))?.id ?? null;
    else if (p.memberships.length === 1) orgId = p.memberships[0].organizationId;
    else if (p.memberships.length === 0 && p.actor.operator) { const orgs = await listOrgs(p.env); if (orgs.length === 1) orgId = orgs[0].id; }
    if (!orgId) return Response.json({ error: body.organization ? `no organization with slug ${body.organization}` : "which organization? pass organization=<slug> (you are in several, or none)" }, { status: 400 });
  }
  const grant = await orgGrant(p.env, p.actor, orgId);
  if (!can(grant, existing ? "workspace:update" : "workspace:create")) return Response.json({ error: `forbidden: needs workspace:${existing ? "update" : "create"} in that organization` }, { status: 403 });
  await createWorkspace(p.env, { id: body.id, name: body.name || body.id, url: body.url, token: body.token, repo: body.repo ?? null, organization_id: orgId });
  return Response.json({ ok: true, organization: orgId });
}

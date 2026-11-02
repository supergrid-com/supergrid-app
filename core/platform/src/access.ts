// Who may do what, resolved from Better Auth memberships plus the platform's own rules (ARCHITECTURE.md §6):
// the organization role applies to every workspace in the organization, unless the workspace is assigned to a team,
// in which case only that team's members plus owners and admins see it. The operator is an owner everywhere.
import type { Actor } from "./auth";
import { getCustomRole, getWorkspace, listMemberships, userTeamIds, type Membership } from "./db";
import { isRoleName, permissionsOf, permissionsOfStatements, ROLE_ORDER, type RoleName } from "./roles";
import type { Env, Workspace } from "./types";

export type Grant = { role: string; permissions: string[]; organizationId: string | null };

/** The strongest of a member's comma-separated roles, with custom roles resolved from the organizationRole table. */
export async function grantFor(env: Env, orgId: string, roleList: string): Promise<Grant> {
  const names = roleList.split(",").map((r) => r.trim()).filter(Boolean);
  const fixed = ROLE_ORDER.find((r) => names.includes(r));
  const perms = new Set<string>();
  let role: string = fixed ?? names[0] ?? "viewer";
  if (fixed) for (const p of permissionsOf(fixed)) perms.add(p);
  for (const n of names) {
    if (isRoleName(n)) continue;
    const custom = await getCustomRole(env, orgId, n);
    if (custom) for (const p of permissionsOfStatements(JSON.parse(custom.permission))) perms.add(p);
  }
  return { role, permissions: [...perms], organizationId: orgId };
}

export const operatorGrant = (orgId: string | null): Grant => ({ role: "owner", permissions: permissionsOf("owner"), organizationId: orgId });

export async function orgGrant(env: Env, actor: Actor, orgId: string): Promise<Grant | null> {
  if (actor.operator) return operatorGrant(orgId);
  const m = (await listMemberships(env, actor.user.id)).find((x) => x.organizationId === orgId);
  return m ? grantFor(env, orgId, m.role) : null;
}

export async function workspaceGrant(env: Env, actor: Actor, ws: Workspace): Promise<Grant | null> {
  if (actor.operator) return operatorGrant(ws.organization_id);
  if (!ws.organization_id) return null;
  const grant = await orgGrant(env, actor, ws.organization_id);
  if (!grant) return null;
  if (ws.team_id && !["owner", "admin"].includes(grant.role)) {
    const teams = await userTeamIds(env, actor.user.id, ws.organization_id);
    if (!teams.includes(ws.team_id)) return null;
  }
  return grant;
}

export const can = (grant: Grant | null | undefined, permission: string) => !!grant?.permissions.includes(permission);

/** The workspaces an actor can open, with their grant. */
export async function visibleWorkspaces(env: Env, actor: Actor, all: Workspace[]) {
  const out: { ws: Workspace; grant: Grant }[] = [];
  for (const ws of all) {
    const grant = await workspaceGrant(env, actor, ws);
    if (grant) out.push({ ws, grant });
  }
  return out;
}

export async function requireWorkspace(env: Env, actor: Actor, id: string, permission?: string) {
  const ws = await getWorkspace(env, id);
  if (!ws) throw new Response("Not found", { status: 404 });
  const grant = await workspaceGrant(env, actor, ws);
  if (!grant) throw new Response("Not found", { status: 404 });
  if (permission && !can(grant, permission)) throw new Response(`Forbidden: needs ${permission}`, { status: 403 });
  return { ws, grant };
}

export async function requireOrg(env: Env, actor: Actor, orgId: string, permission?: string) {
  const grant = await orgGrant(env, actor, orgId);
  if (!grant) throw new Response("Not found", { status: 404 });
  if (permission && !can(grant, permission)) throw new Response(`Forbidden: needs ${permission}`, { status: 403 });
  return grant;
}

export type { Membership, RoleName };

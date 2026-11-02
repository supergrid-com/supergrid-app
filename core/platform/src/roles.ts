// The access-control statement and the four fixed roles. Shared by the server plugin, the client plugin and the handoff
// claims, so one definition decides what "editor" means everywhere. Imported by browser code: keep it free of server imports.
import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/organization/access";

export const statement = {
  ...defaultStatements, // organization, member, invitation, team, ac (custom roles)
  workspace: ["create", "update", "delete", "deploy"],
  app: ["install", "uninstall", "update"],
  settings: ["update"],
  secrets: ["update"],
  data: ["read", "export", "write"],
  content: ["read", "write"],
} as const;

export const ac = createAccessControl(statement);

export const roles = {
  owner: ac.newRole({
    organization: ["update", "delete"], member: ["create", "update", "delete"], invitation: ["create", "cancel"], team: ["create", "update", "delete"], ac: ["create", "read", "update", "delete"],
    workspace: ["create", "update", "delete", "deploy"], app: ["install", "uninstall", "update"], settings: ["update"], secrets: ["update"], data: ["read", "export", "write"], content: ["read", "write"],
  }),
  admin: ac.newRole({
    organization: ["update"], member: ["create", "update", "delete"], invitation: ["create", "cancel"], team: ["create", "update", "delete"], ac: ["create", "read", "update", "delete"],
    workspace: ["create", "update", "delete", "deploy"], app: ["install", "uninstall", "update"], settings: ["update"], data: ["read", "export", "write"], content: ["read", "write"],
  }),
  editor: ac.newRole({ data: ["read"], content: ["read", "write"] }),
  viewer: ac.newRole({ data: ["read"], content: ["read"] }),
};

export type RoleName = keyof typeof roles;
export const ROLE_ORDER: RoleName[] = ["owner", "admin", "editor", "viewer"];
export const isRoleName = (r: string): r is RoleName => r in roles;

/** "resource:action" strings for a static role, the form carried in handoff claims and checked by apps. */
export function permissionsOf(role: RoleName): string[] {
  const out: string[] = [];
  for (const [resource, actions] of Object.entries(roles[role].statements)) for (const a of actions as string[]) out.push(`${resource}:${a}`);
  return out;
}
/** Same, for a per-organization custom role stored by dynamic access control ({ resource: [actions] }). */
export function permissionsOfStatements(s: Record<string, string[]>): string[] {
  return Object.entries(s).flatMap(([resource, actions]) => actions.map((a) => `${resource}:${a}`));
}

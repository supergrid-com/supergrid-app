// The staff member behind an admin request, forwarded by the workspace as `x-sg-user` after it verified the staff cookie
// (or the desktop's bearer token on an operations call). Public pages have no user. Permissions are "resource:action"
// strings from the platform's roles; `*` is everything, which is what an owner and the desktop carry.
export type SgUser = { id: string; name: string; email: string; org: string | null; role: string; permissions: string[] };

export function parseUser(header: string | null): SgUser | null {
  if (!header) return null;
  try {
    const u = JSON.parse(header) as SgUser;
    return u && typeof u.id === "string" && Array.isArray(u.permissions) ? u : null;
  } catch { return null; }
}
export const can = (user: SgUser | null | undefined, permission: string) => !!user && (user.permissions.includes("*") || user.permissions.includes(permission));
/** Throws a 403 Response (caught by React Router as an error boundary) when the user lacks the permission. */
export function requirePermission(user: SgUser | null | undefined, permission: string): SgUser {
  if (!user) throw new Response("Sign in on the platform to use this screen.", { status: 401 });
  if (!can(user, permission)) throw new Response(`Your role (${user.role}) cannot do this: needs ${permission}.`, { status: 403 });
  return user;
}

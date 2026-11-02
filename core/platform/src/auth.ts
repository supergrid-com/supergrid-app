// The Better Auth instance for a request, and the "actor": who is calling, from a browser session or a CLI API key.
import { betterAuth } from "better-auth";
import { createAuthOptions, type AuthOptions } from "./auth-options";
import { getSetting } from "./db";
import type { Env } from "./types";

export type Auth = ReturnType<typeof betterAuth<AuthOptions>>;
export type AuthUser = { id: string; name: string; email: string; role?: string | null; banned?: boolean | null };
export type Actor = {
  user: AuthUser;
  /** Platform operator (Better Auth admin role). */
  operator: boolean;
  /** "session" for a browser, "apikey" for the CLI. */
  via: "session" | "apikey";
  session?: { id: string; activeOrganizationId?: string | null; impersonatedBy?: string | null };
};

export type Invite = { id: string; email: string; organization: { name: string }; inviter: { user: { email: string } } };

let cached: { key: string; auth: Auth } | null = null;
export function createAuth(env: Env, request: Request): Auth {
  const baseURL = env.BETTER_AUTH_URL || new URL(request.url).origin;
  const key = `${baseURL}|${env.BETTER_AUTH_SECRET.length}`;
  if (cached?.key === key) return cached.auth;
  const auth = betterAuth(createAuthOptions({
    database: env.PLATFORM_DB,
    secret: env.BETTER_AUTH_SECRET,
    baseURL,
    allowUserToCreateOrganization: async (user) => {
      // Creator and agency installs have one organization; reseller customers each create their own. The operator always may.
      const mode = await getSetting(env, "mode", env.SG_MODE ?? "creator");
      if (mode === "reseller") return true;
      const u = await env.PLATFORM_DB.prepare('SELECT role FROM "user" WHERE id = ?').bind(user.id).first<{ role: string | null }>();
      if (u?.role === "admin") return true;
      const orgs = await env.PLATFORM_DB.prepare('SELECT COUNT(*) AS n FROM "organization"').first<{ n: number }>();
      return (orgs?.n ?? 0) === 0;
    },
    afterCreateOrganization: async (orgId) => {
      // Better Auth creates a default team named after the organization; here a team is a client, so start with none.
      await env.PLATFORM_DB.prepare('DELETE FROM "team" WHERE organizationId = ?').bind(orgId).run();
    },
    initialOrganizationId: async (userId) => {
      const m = await env.PLATFORM_DB.prepare('SELECT organizationId FROM "member" WHERE userId = ? ORDER BY createdAt LIMIT 1').bind(userId).first<{ organizationId: string }>();
      return m?.organizationId ?? null;
    },
  }));
  cached = { key, auth };
  return auth;
}

/** Browser session, or a CLI API key in `x-api-key`. Never both. */
export async function getActor(auth: Auth, request: Request): Promise<Actor | null> {
  const key = request.headers.get("x-api-key");
  if (key) {
    const v = await auth.api.verifyApiKey({ body: { key } }).catch(() => null);
    if (!v?.valid || !v.key) return null;
    const user = await auth.$context.then((c) => c.internalAdapter.findUserById(v.key!.referenceId));
    if (!user || (user as AuthUser).banned) return null;
    return { user: user as AuthUser, operator: isOperator(user as AuthUser), via: "apikey" };
  }
  const s = await auth.api.getSession({ headers: request.headers }).catch(() => null);
  if (!s) return null;
  return { user: s.user as AuthUser, operator: isOperator(s.user as AuthUser), via: "session", session: s.session as Actor["session"] };
}
export const isOperator = (u: AuthUser) => (u.role ?? "").split(",").includes("admin");

/** Headers that let server-side auth.api calls run as the current browser session (Better Auth reads the cookie). */
export const asSession = (request: Request) => ({ headers: request.headers });

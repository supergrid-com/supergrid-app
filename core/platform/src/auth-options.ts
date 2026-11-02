// Better Auth configuration for the platform. `createAuthOptions` is pure: the worker passes the D1 binding and secrets,
// the schema script passes an in-memory SQLite. Everything about who may sign up is decided outside Better Auth (workers/app.ts).
import { apiKey } from "@better-auth/api-key";
import { passkey } from "@better-auth/passkey";
import type { BetterAuthOptions } from "better-auth";
import { admin, organization } from "better-auth/plugins";
import { ac, roles } from "./roles";

export type AuthDeps = {
  database: BetterAuthOptions["database"];
  secret: string;
  baseURL: string;
  /** Called when a member is invited; the platform shows the link in the UI instead of emailing it (no mailer yet). */
  onInvitation?: (data: { id: string; email: string; organization: { name: string }; inviter: { user: { email: string } } }) => Promise<void> | void;
  allowUserToCreateOrganization?: (user: { id: string; email: string }) => Promise<boolean> | boolean;
  /** Runs after an organization is created: the platform drops the default team Better Auth adds (teams mean clients here). */
  afterCreateOrganization?: (orgId: string) => Promise<void>;
  /** The organization a new session starts in (the user's first membership). */
  initialOrganizationId?: (userId: string) => Promise<string | null>;
};

const enc = new TextEncoder();
const PBKDF2_ITERATIONS = 100_000; // the Workers runtime caps PBKDF2 at 100k iterations; native WebCrypto, ~tens of ms
const b64 = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function derive(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  return crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations }, key, 256);
}
/** `pbkdf2$<iterations>$<salt>$<hash>`; scrypt (Better Auth's default) is too CPU-heavy inside a Worker. */
export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${PBKDF2_ITERATIONS}$${b64(salt)}$${b64(await derive(password, salt, PBKDF2_ITERATIONS))}`;
}
export async function verifyPassword({ hash, password }: { hash: string; password: string }) {
  const [scheme, iter, salt, expected] = hash.split("$");
  if (scheme !== "pbkdf2" || !iter || !salt || !expected) return false;
  const actual = new Uint8Array(await derive(password, unb64(salt), Number(iter)));
  const want = unb64(expected);
  if (actual.length !== want.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ want[i];
  return diff === 0;
}

export type AuthOptions = ReturnType<typeof createAuthOptions>;
export function createAuthOptions(deps: AuthDeps) {
  const url = new URL(deps.baseURL);
  return {
    appName: "SuperGrid",
    database: deps.database,
    secret: deps.secret,
    baseURL: deps.baseURL,
    basePath: "/api/auth",
    trustedOrigins: [url.origin],
    emailAndPassword: { enabled: true, minPasswordLength: 10, password: { hash: hashPassword, verify: verifyPassword } },
    session: { expiresIn: 60 * 60 * 24 * 14, updateAge: 60 * 60 * 24, cookieCache: { enabled: false } },
    advanced: { useSecureCookies: url.protocol === "https:", database: { generateId: () => crypto.randomUUID() } },
    databaseHooks: {
      session: {
        create: {
          before: async (session) => ({ data: { ...session, activeOrganizationId: (await deps.initialOrganizationId?.(session.userId)) ?? null } }),
        },
      },
    },
    plugins: [
      organization({
        ac,
        roles,
        creatorRole: "owner",
        teams: { enabled: true, maximumTeams: 100, allowRemovingAllTeams: true },
        dynamicAccessControl: { enabled: true, maximumRolesPerOrganization: 20 },
        allowUserToCreateOrganization: deps.allowUserToCreateOrganization ?? true,
        invitationExpiresIn: 60 * 60 * 24 * 7,
        requireEmailVerificationOnInvitation: false, // no mailer yet: the invitation link itself is what the invitee holds, and the email is fixed to the invited one
        cancelPendingInvitationsOnReInvite: true,
        sendInvitationEmail: async (data) => { await deps.onInvitation?.(data); },
        organizationHooks: { afterCreateOrganization: async ({ organization }) => { await deps.afterCreateOrganization?.(organization.id); } },
      }),
      admin({ defaultRole: "user", adminRoles: ["admin"], impersonationSessionDuration: 60 * 60 }),
      passkey({ rpID: url.hostname, rpName: "SuperGrid", origin: url.origin }),
      apiKey({ defaultPrefix: "sg_", enableMetadata: true, rateLimit: { enabled: false } }),
    ],
  } satisfies BetterAuthOptions;
}

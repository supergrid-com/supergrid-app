import { createRequestHandler, RouterContextProvider } from "react-router";
import { CONTRACT } from "@supergrid/app-kit/rpc";
import { createAuth, getActor } from "../src/auth";
import { checkReleases } from "../src/cloud";
import { platformContext, type Platform } from "../src/context";
import { ensurePlatform, getMode, getSetting, listMemberships, pendingInvitationFor, userCount } from "../src/db";
import type { Env } from "../src/types";

const handler = createRequestHandler(() => import("virtual:react-router/server-build"), import.meta.env.MODE);
const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);
const PUBLIC = [/^\/login$/, /^\/signup$/, /^\/setup$/, /^\/invite\/[^/]+$/, /^\/favicon\.ico$/];
const isPublic = (path: string) => PUBLIC.some((re) => re.test(path.replace(/\.data$/, "")));

function withHeaders(res: Response, https: boolean) {
  const out = new Response(res.body, res);
  out.headers.set("content-security-policy", "frame-ancestors 'none'");
  out.headers.set("x-content-type-options", "nosniff");
  out.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  if (https) out.headers.set("strict-transport-security", "max-age=31536000");
  return out;
}

let hasUsers = false; // sticky per isolate once true
async function setupPending(env: Env) {
  if (hasUsers) return false;
  hasUsers = (await userCount(env)) > 0;
  return !hasUsers;
}

/** Who may create an account through Better Auth's own sign-up endpoint. The setup page signs the first user up server-side. */
async function signUpAllowed(env: Env, request: Request) {
  const mode = await getMode(env);
  if (mode === "reseller") return true;
  const body = await request.clone().json().catch(() => null) as { email?: string } | null;
  if (!body?.email) return false;
  return !!(await pendingInvitationFor(env, body.email));
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    const https = url.protocol === "https:";
    if (!env.BETTER_AUTH_SECRET) return new Response("BETTER_AUTH_SECRET is not set. Refusing to serve.", { status: 503 });
    if (url.pathname === "/favicon.ico") return Response.redirect(new URL("/favicon.svg", url).href, 301);
    await ensurePlatform(env);
    // Public, and after migrations: a new version that answers here has also finished migrating.
    if (url.pathname === "/api/health") return Response.json({ ok: true, version: env.SG_VERSION, contract: CONTRACT });
    const auth = createAuth(env, request);

    // Better Auth's own endpoints (sign-in, passkeys, organizations, API keys …). It does its own CSRF and origin checks.
    if (url.pathname.startsWith("/api/auth/")) {
      if (url.pathname === "/api/auth/sign-up/email" && !(await signUpAllowed(env, request))) {
        return Response.json({ message: "Sign-up is by invitation on this platform." }, { status: 403 });
      }
      return withHeaders(await auth.handler(request), https);
    }

    const actor = await getActor(auth, request);
    if (url.pathname.startsWith("/api/")) {
      // The CLI and jobs: an API key in x-api-key (or a browser session). Routes check permissions themselves.
      if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });
    } else {
      if (!SAFE.has(request.method)) {
        const origin = request.headers.get("origin");
        if (!origin || origin !== url.origin) return withHeaders(new Response("Forbidden", { status: 403 }), https);
      }
      const path = url.pathname.replace(/\.data$/, "");
      if (await setupPending(env)) {
        if (path !== "/setup") return withHeaders(Response.redirect(new URL("/setup", url).href, 302), https);
      } else if (!actor && !isPublic(path)) {
        const next = url.pathname === "/" ? "" : `?next=${encodeURIComponent(url.pathname + url.search)}`;
        return withHeaders(Response.redirect(new URL(`/login${next}`, url).href, 302), https);
      }
    }

    const [mode, branding, memberships] = await Promise.all([
      getMode(env), getSetting(env, "branding", { name: "SuperGrid", accent: "#3b5bdb" }), actor ? listMemberships(env, actor.user.id) : Promise.resolve([]),
    ]);
    const activeOrg = memberships.find((m) => m.organizationId === actor?.session?.activeOrganizationId) ?? memberships[0] ?? null;
    const platform: Platform = { env, auth, actor, mode, memberships, activeOrg, branding };
    const context = new RouterContextProvider();
    context.set(platformContext, platform);
    return withHeaders(await handler(request, context), https);
  },
  /** The daily look at the release feed. Only reads public files; it installs nothing. */
  async scheduled(_event: unknown, env: Env) {
    await ensurePlatform(env);
    if (env.SG_RELEASE_FEED) await checkReleases(env).catch((e) => console.error("release check failed", e));
  },
};

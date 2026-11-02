import { CONTRACT } from "@supergrid/app-kit/rpc";
import { tokensToCss } from "@supergrid/theme";
import { WorkspaceApi } from "./api";
import { ensureCore } from "./db";
import { handoff, notStaffResponse, staffUser } from "./staff";
import type { Env, RouteEntry } from "./types";

export { WorkspaceApi };

const RPC_METHODS = new Set(["info", "getTheme", "getSetting", "setSetting", "listContacts", "upsertContact", "emitEvent", "applyMigrations"]);

/**
 * Longest public mount wins; /admin/<id>, /api/<id> and /_app/<id> are exact by app id.
 * React Router's client-side data requests append `.data` to the page path (`/form.data`, `/admin/forms.data`),
 * so that suffix is ignored when matching: it must reach the same app as the page.
 */
function match(routes: RouteEntry[], path: string): RouteEntry | undefined {
  const pathname = path.endsWith(".data") ? path.slice(0, -".data".length) : path;
  const seg = pathname.match(/^\/(?:_app|admin|api)\/([^/]+)/);
  if (seg) {
    const r = routes.find((x) => x.app === seg[1]);
    if (r && (pathname.startsWith("/_app/") || (pathname.startsWith("/admin/") && r.admin) || (pathname.startsWith("/api/") && r.api))) return r;
    return undefined;
  }
  return routes.filter((r) => r.public && (r.public === "/" || pathname === r.public || pathname.startsWith(r.public + "/")))
    .sort((a, b) => b.public!.length - a.public!.length)[0];
}

const SPOOFABLE = ["x-sg-workspace", "x-sg-app", "x-sg-user"];

async function forward(request: Request, env: Env, route: RouteEntry, user?: unknown): Promise<Response> {
  const headers = new Headers(request.headers);
  for (const h of SPOOFABLE) headers.delete(h);
  headers.set("x-sg-workspace", env.WORKSPACE_ID);
  headers.set("x-sg-app", route.app);
  if (user) headers.set("x-sg-user", JSON.stringify(user));
  const app = env[route.binding] as Fetcher | undefined;
  if (!app) return new Response(`No service binding ${route.binding} for app ${route.app}`, { status: 502 });
  const res = await app.fetch(new Request(request, { headers }));
  const out = new Response(res.body, res);
  out.headers.set("x-sg-served-by", route.app);
  return out;
}

async function handleWs(request: Request, env: Env, path: string): Promise<Response> {
  const api = new WorkspaceApi({} as ExecutionContext, env);
  if (path === "health") return Response.json({ ok: true, workspace: env.WORKSPACE_ID, version: env.SG_VERSION, contract: CONTRACT });
  if (path === "auth") return handoff(request, env.SG_WORKSPACE_TOKEN, env.WORKSPACE_ID);
  if (path === "manifest") return Response.json(await api.info());
  if (path === "theme.css") {
    return new Response(tokensToCss(await api.getTheme()), { headers: { "content-type": "text/css; charset=utf-8", "cache-control": "no-cache" } });
  }
  if (path === "rpc" && request.method === "POST") {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!env.SG_WORKSPACE_TOKEN || !token || token !== env.SG_WORKSPACE_TOKEN) return Response.json({ error: "unauthorized" }, { status: 401 });
    const { method, args } = (await request.json()) as { method: string; args?: unknown[] };
    if (!RPC_METHODS.has(method)) return Response.json({ error: `unknown method ${method}` }, { status: 400 });
    try {
      const result = await (api as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>)[method](...(args ?? []));
      return Response.json({ result: result ?? null });
    } catch (e) {
      return Response.json({ error: String((e as Error).message ?? e) }, { status: 400 });
    }
  }
  return new Response("Not found", { status: 404 });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    await ensureCore(env.DB);
    if (url.pathname.startsWith("/_ws/")) return handleWs(request, env, url.pathname.slice(5));
    const route = match(env.ROUTES, url.pathname);
    if (route) {
      // Admin screens need the staff cookie the platform's handoff set; the app gets the user as x-sg-user. Everything else is public.
      if (url.pathname.startsWith("/admin/")) {
        const staff = await staffUser(request, env.SG_WORKSPACE_TOKEN, env.WORKSPACE_ID);
        if (!staff) return notStaffResponse(env.WORKSPACE_NAME);
        const { sub, name, email, org, role, permissions } = staff;
        return forward(request, env, route, { id: sub, name, email, org, role, permissions });
      }
      return forward(request, env, route);
    }
    const apps = env.ROUTES.map((r) => r.public ? `<li><a href="${r.public}">${r.app}</a> at <code>${r.public}</code></li>` : `<li>${r.app} (admin only)</li>`).join("");
    return new Response(`<!doctype html><html><head><meta charset="utf-8"><title>${env.WORKSPACE_NAME}</title><link rel="stylesheet" href="/_ws/theme.css"></head>
<body style="max-width:40rem;margin:4rem auto;padding:0 1rem"><h1>${env.WORKSPACE_NAME}</h1><p class="sg-muted">No site app is mounted at <code>/</code>. Installed apps:</p><ul>${apps}</ul></body></html>`,
      { status: 404, headers: { "content-type": "text/html; charset=utf-8" } });
  },
};

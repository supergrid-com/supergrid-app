// The request path every workspace shares, whichever shape it has: the route match, the /_ws/* endpoints (auth handoff,
// rpc, events, uploads, themes), the headers forwarded to an app, and the page shown when no app owns a path. index.ts
// (one Worker per app, reached over service bindings) and compose.ts (every app in this Worker) both build on it.
import { CONTRACT, RPC_METHOD_NAMES } from "@supergrid/app-kit/rpc";
import { publicOwner } from "@supergrid/app-kit/sitemap";
import { WorkspaceApi } from "./api";
import { handleFile, handleUpload } from "./assets";
import { anonymousIdOf, handleIngest } from "./events";
import { handoff } from "./staff";
import { readThemeRecord, themeCssResponse } from "./themes";
import type { Env, RouteEntry } from "./types";

const RPC_METHODS = new Set<string>(RPC_METHOD_NAMES);
/** Apps only, over the service binding: a secret's value never leaves over HTTP, the desktop and the platform see hints. */
const RPC_HTTP_DENIED = new Set<string>(["getSecret"]);

/**
 * "/" goes to the app built with a home page, else the longest public mount wins; /admin/<id>, /api/<id> and /_app/<id> are
 * exact by app id. React Router's client-side data requests append `.data` to the page path (`/form.data`, `/admin/forms.data`,
 * `/_root.data` for "/"), so that suffix is ignored when matching: it must reach the same app as the page.
 */
export function match(routes: RouteEntry[], path: string): RouteEntry | undefined {
  const pathname = path.endsWith(".data") ? path.slice(0, -".data".length) : path;
  const seg = pathname.match(/^\/(?:_app|admin|api)\/([^/]+)/);
  if (seg) {
    const r = routes.find((x) => x.app === seg[1]);
    if (r && (pathname.startsWith("/_app/") || (pathname.startsWith("/admin/") && r.admin) || (pathname.startsWith("/api/") && r.api))) return r;
    return undefined;
  }
  if (pathname === "/" || pathname === "/_root") {
    const home = routes.find((r) => r.home && r.public);
    if (home) return home;
  }
  const owner = publicOwner(routes.filter((r) => r.public).map((r) => ({ app: r.app, mount: r.public! })), pathname);
  return owner ? routes.find((r) => r.app === owner) : undefined;
}

export const SPOOFABLE = ["x-sg-workspace", "x-sg-app", "x-sg-mount", "x-sg-user", "x-sg-anon"];

/** The desktop (or a script with the workspace's token) calling an app's operations: it acts as an owner. */
export const DESKTOP_USER = { id: "desktop", name: "SuperGrid", email: "", org: null, role: "owner", permissions: ["*"] };
export const bearerOf = (request: Request) => request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
/** `/api/<id>/ops*` and `/api/<id>/mcp` with the workspace token: the app sees an owner. Without it they stay public (the app's own access rules apply). */
export const isOpsPath = (pathname: string) => /^\/api\/[^/]+\/(ops(\/|$)|mcp$)/.test(pathname);

export async function forward(request: Request, env: Env, route: RouteEntry, user?: unknown): Promise<Response> {
  const headers = new Headers(request.headers);
  for (const h of SPOOFABLE) headers.delete(h);
  headers.set("x-sg-workspace", env.WORKSPACE_ID);
  headers.set("x-sg-app", route.app);
  // The public prefix the app is served at, so its links follow a rename without reading the manifest.
  if (route.public) headers.set("x-sg-mount", route.public);
  if (user) headers.set("x-sg-user", JSON.stringify(user));
  // The visitor cookie, so an app's server-side emits attribute to the same visitor as the browser's.
  const anon = anonymousIdOf(request);
  if (anon) headers.set("x-sg-anon", anon);
  const app = env[route.binding] as Fetcher | undefined;
  if (!app) return new Response(`No service binding ${route.binding} for app ${route.app}`, { status: 502 });
  const res = await app.fetch(new Request(request, { headers }));
  const out = new Response(res.body, res);
  out.headers.set("x-sg-served-by", route.app);
  return out;
}

export async function handleWs(request: Request, env: Env, exec: ExecutionContext, path: string): Promise<Response> {
  const api = new WorkspaceApi(exec, env);
  if (path === "events") return handleIngest(request, env, exec);
  // Assets in the workspace's own bucket: the signed PUT an upload ticket hands out, and the files themselves (see assets.ts).
  if (path.startsWith("upload/")) return handleUpload(request, env, exec, path.slice(7));
  if (path.startsWith("files/")) return handleFile(request, env, path.slice(6));
  if (path === "health") return Response.json({ ok: true, workspace: env.WORKSPACE_ID, version: env.SG_VERSION, contract: CONTRACT });
  if (path === "auth") return handoff(request, env.SG_WORKSPACE_TOKEN, env.WORKSPACE_ID);
  if (path === "manifest") return Response.json(await api.info());
  // The design theme, for every page an app serves: the default as CSS, one by id, or the document itself.
  if (path === "theme.css") return themeCssResponse(env.DB, request);
  const themed = path.match(/^theme\/([a-z][a-z0-9-]{0,39})\.css$/);
  if (themed) return themeCssResponse(env.DB, request, themed[1]);
  if (path === "theme.json") {
    const rec = await readThemeRecord(env.DB);
    return Response.json(rec?.theme ?? null, { headers: { "cache-control": "public, max-age=120, stale-while-revalidate=86400", "access-control-allow-origin": "*" } });
  }
  if (path === "rpc" && request.method === "POST") {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!env.SG_WORKSPACE_TOKEN || !token || token !== env.SG_WORKSPACE_TOKEN) return Response.json({ error: "unauthorized" }, { status: 401 });
    const { method, args } = (await request.json()) as { method: string; args?: unknown[] };
    if (!RPC_METHODS.has(method)) return Response.json({ error: `unknown method ${method}` }, { status: 400 });
    if (RPC_HTTP_DENIED.has(method)) return Response.json({ error: `${method} is only available to apps over the service binding` }, { status: 403 });
    try {
      const result = await (api as unknown as Record<string, (...a: unknown[]) => Promise<unknown>>)[method](...(args ?? []));
      return Response.json({ result: result ?? null });
    } catch (e) {
      return Response.json({ error: String((e as Error).message ?? e) }, { status: 400 });
    }
  }
  return new Response("Not found", { status: 404 });
}


/** The page a workspace shows for a path no app owns. */
export function noAppPage(env: Env, entries: RouteEntry[]): Response {
  const apps = entries.map((r) => r.public ? `<li><a href="${r.public}">${r.app}</a> at <code>${r.public}</code></li>` : `<li>${r.app} (admin only)</li>`).join("");
  return new Response(`<!doctype html><html><head><meta charset="utf-8"><title>${env.WORKSPACE_NAME}</title><link rel="stylesheet" href="/_ws/theme.css"></head>
<body style="max-width:40rem;margin:4rem auto;padding:0 1rem"><h1>${env.WORKSPACE_NAME}</h1><p class="sg-muted">No site app is mounted at <code>/</code>. Installed apps:</p><ul>${apps}</ul></body></html>`,
    { status: 404, headers: { "content-type": "text/html; charset=utf-8" } });
}

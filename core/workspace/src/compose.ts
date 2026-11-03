// The workspace as one Worker with every app built in (WORKSPACE-REPO.md §4). The generated `.sg/apps.ts` lists the
// apps (manifest and `workers/app.ts` module); `createWorkspaceWorker` turns them into the registry, serves the
// workspace's own endpoints, matches each request to its app and runs that app's routes, operations and hooks in
// process with a context built here. Nothing crosses a service binding: `ctx.workspace` is the WorkspaceApi itself.
import { createRequestHandler, RouterContextProvider } from "react-router";
import { appContext, type AppCtx, type AppEnv } from "@supergrid/app-kit/context";
import { describeData } from "@supergrid/app-kit/data";
import { createEvents } from "@supergrid/app-kit/events";
import { apiMount, parseManifest, routeSummary, underMount } from "@supergrid/app-kit/manifest";
import { handleMcpRequest, handleOpsRequest, runOperation, summarize } from "@supergrid/app-kit/operations";
import type { EventRow } from "@supergrid/app-kit/rpc";
import { matchRule } from "@supergrid/app-kit/sitemap";
import type { SgUser } from "@supergrid/app-kit/user";
import type { ServedManifest } from "@supergrid/app-kit/worker";
import { rollupDaily } from "./analytics";
import { WorkspaceApi } from "./api";
import { ensureCore } from "./db";
import { anonymousIdOf, handleQueue } from "./events";
import { setRegistry, type AppModule, type ComposedApp } from "./registry";
import { bearerOf, DESKTOP_USER, handleWs, isOpsPath, match, noAppPage, SPOOFABLE } from "./router";
import { notStaffResponse, staffUser } from "./staff";
import { activeRules } from "./sitemap";
import type { Env } from "./types";

export { WorkspaceApi };
export { HookRun } from "./workflows";
export type { AppModule } from "./registry";

function compose(apps: AppModule[]): ComposedApp[] {
  const out = apps.map((a): ComposedApp => {
    const manifest = parseManifest(a.manifest);
    return { id: manifest.id, raw: a.manifest, manifest, summary: routeSummary(a.manifest), operations: a.worker?.operations ?? {}, hooks: a.worker?.hooks ?? {}, migrations: a.worker?.migrations ?? [], objects: a.worker?.objects ?? [] };
  });
  const seen = new Set<string>();
  for (const a of out) {
    if (seen.has(a.id)) throw new Error(`Two apps are composed with id "${a.id}".`);
    seen.add(a.id);
  }
  return out;
}

const staffAsUser = ({ sub, name, email, org, role, permissions }: { sub: string; name: string; email: string; org: string | null; role: string; permissions: string[] }): SgUser => ({ id: sub, name, email, org, role, permissions });

/** The request as the app sees it: the same headers the router used to forward, so app code reading them keeps working. */
function requestFor(request: Request, env: Env, app: ComposedApp, user: SgUser | null): Request {
  const headers = new Headers(request.headers);
  for (const h of SPOOFABLE) headers.delete(h);
  headers.set("x-sg-workspace", env.WORKSPACE_ID);
  headers.set("x-sg-app", app.id);
  if (app.summary.public) headers.set("x-sg-mount", app.summary.public);
  if (user) headers.set("x-sg-user", JSON.stringify(user));
  const anon = anonymousIdOf(request);
  if (anon) headers.set("x-sg-anon", anon);
  return new Request(request, { headers });
}

/**
 * The fetch, queue and scheduled handlers of a composed workspace Worker.
 * - `/_ws/*` is the workspace's own (auth handoff, rpc, events, uploads, themes), as in index.ts.
 * - Redirect rules from the sitemap apply before anything else.
 * - Then the path is matched to an app by mount, `/admin/<id>`, `/api/<id>` or `/_app/<id>`; admin screens need the staff
 *   cookie, operations take the workspace token (an owner) or the cookie, everything else is public.
 * - The app's migrations and object types are registered once per isolate, through the same ledger as before.
 * - `/_app/<id>/manifest.json`, `/api/<id>/ops*` and `/api/<id>/mcp` are served here; every other path goes to React Router
 *   with the app's context set.
 */
export function createWorkspaceWorker(apps: AppModule[]) {
  // composed every time the entry evaluates: once in a deployed Worker, and again in a dev session whenever a manifest or a
  // workers/app.ts changes, so the served manifests, operations and hooks follow the edit without a restart
  const registry = compose(apps);
  setRegistry(registry);
  const handler = createRequestHandler(() => import("virtual:react-router/server-build"), import.meta.env.MODE);
  let prepared: Promise<void> | null = null;
  const prepare = (env: Env, exec: ExecutionContext) => (prepared ??= (async () => {
    const api = new WorkspaceApi(exec, env);
    for (const app of registry) {
      if (app.migrations.length) await api.applyMigrations(app.id, app.migrations);
      for (const o of app.objects) await api.saveObjectType(app.id, o);
    }
  })().catch((e) => { prepared = null; throw e; }));
  // Workers have no clock before the first request, so `at` is when this copy of the manifest was served, not built.
  const served = (app: ComposedApp): ServedManifest => ({ ...app.raw, served: true, operations: summarize(app.operations), entities: describeData(app.manifest), build: { mode: import.meta.env.MODE, at: new Date().toISOString() } });

  return {
    async fetch(request: Request, env: Env, exec: ExecutionContext): Promise<Response> {
      const url = new URL(request.url);
      await ensureCore(env.DB);
      // Dev only: the desktop's Database pages read and write the local D1 through here while the workspace runs on this Mac.
      if (import.meta.env.DEV && url.pathname === "/_ws/dev/sql" && request.method === "POST") return handleDevSql(request, env);
      if (url.pathname.startsWith("/_ws/")) return handleWs(request, env, exec, url.pathname.slice(5));
      await prepare(env, exec);
      const hit = matchRule(await activeRules(env), url.pathname, url.search);
      if (hit) return Response.redirect(new URL(hit.to, url).toString(), hit.status);
      // React Router's lazy route discovery asks for the manifest outside any app's paths.
      if (url.pathname === "/__manifest") return handler(request, new RouterContextProvider());
      const entries = registry.map((a) => ({ ...a.summary, binding: "" }));
      const route = match(entries, url.pathname);
      const app = route && registry.find((a) => a.id === route.app);
      if (!app) return noAppPage(env, entries);

      let user: SgUser | null = null;
      if (url.pathname.startsWith("/admin/")) {
        const staff = await staffUser(request, env.SG_WORKSPACE_TOKEN, env.WORKSPACE_ID);
        if (!staff) return notStaffResponse(env.WORKSPACE_NAME);
        user = staffAsUser(staff);
      } else if (isOpsPath(url.pathname)) {
        const token = bearerOf(request);
        if (token && env.SG_WORKSPACE_TOKEN && token === env.SG_WORKSPACE_TOKEN) user = DESKTOP_USER;
        else {
          const staff = await staffUser(request, env.SG_WORKSPACE_TOKEN, env.WORKSPACE_ID);
          if (staff) user = staffAsUser(staff);
        }
      }

      const api = new WorkspaceApi(exec, env);
      const appEnv: AppEnv = { WORKSPACE: api, DB: env.DB };
      const req = requestFor(request, env, app, user);
      const mount = app.summary.public ?? null;
      const ctx: AppCtx = {
        env: appEnv, manifest: app.raw, workspace: api, db: env.DB, user, events: createEvents(api, app.id, req),
        mount, href: (path: string) => (mount === null ? path : underMount(mount, path)),
        call: <O,>(name: string, input?: unknown): Promise<O> => runOperation(app.operations, name, input, ctx) as Promise<O>,
      };

      const own = `/_app/${app.id}`;
      if (url.pathname === `${own}/manifest.json`) return Response.json(served(app), { headers: { "cache-control": "no-store", "access-control-allow-origin": "*" } });
      const apiBase = apiMount(app.manifest);
      if (app.manifest.operations && url.pathname.startsWith(`${apiBase}/ops`)) return withServedBy(await handleOpsRequest(app.operations, req, url.pathname.slice(`${apiBase}/ops`.length), ctx), app.id);
      if (app.manifest.operations && url.pathname === `${apiBase}/mcp`) return withServedBy(await handleMcpRequest(app.operations, app.manifest.name, app.manifest.version, req, ctx), app.id);
      const context = new RouterContextProvider();
      context.set(appContext, ctx);
      return withServedBy(await handler(req, context), app.id);
    },
    async queue(batch: MessageBatch<EventRow>, env: Env): Promise<void> {
      await ensureCore(env.DB);
      await handleQueue(batch, env);
    },
    async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
      await ensureCore(env.DB);
      await rollupDaily(env);
    },
  };
}

/** Statements of a script, split on the semicolons outside quotes, so the Query page can run several at once as it does on D1's API. */
function splitSql(sql: string): string[] {
  const out: string[] = [];
  let cur = "", quote: string | null = null;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i]!;
    if (quote) { cur += c; if (c === quote) quote = sql[i + 1] === quote ? (cur += sql[++i]!, quote) : null; continue; }
    if (c === "'" || c === '"' || c === "`") { quote = c; cur += c; continue; }
    if (c === "-" && sql[i + 1] === "-") { const end = sql.indexOf("\n", i); if (end === -1) break; i = end; continue; }
    if (c === ";") { if (cur.trim()) out.push(cur.trim()); cur = ""; continue; }
    cur += c;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/**
 * `POST /_ws/dev/sql` with the workspace token: `{ sql, params?, raw? }` run on the local D1, answered in the shape of D1's REST
 * API (one entry per statement; `raw` gives columns and rows as arrays). Only built into a dev session: `import.meta.env.DEV`
 * is false in a build, so the deployed Worker has no such path.
 */
async function handleDevSql(request: Request, env: Env): Promise<Response> {
  const token = bearerOf(request);
  if (!env.SG_WORKSPACE_TOKEN || token !== env.SG_WORKSPACE_TOKEN) return Response.json({ error: "unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { sql?: string; params?: unknown[]; raw?: boolean } | null;
  if (!body || typeof body.sql !== "string" || !body.sql.trim()) return Response.json({ error: "Nothing to run." }, { status: 400 });
  const statements = splitSql(body.sql);
  const params = Array.isArray(body.params) ? body.params : [];
  const out: unknown[] = [];
  try {
    for (const sql of statements) {
      const stmt = statements.length === 1 && params.length ? env.DB.prepare(sql).bind(...params) : env.DB.prepare(sql);
      if (body.raw) {
        const [columns = [], ...rows] = await stmt.raw({ columnNames: true });
        out.push({ results: { columns, rows }, meta: {} });
      } else {
        const r = await stmt.all();
        out.push({ results: r.results, meta: r.meta });
      }
    }
  } catch (e) {
    return Response.json({ error: String((e as Error).message ?? e).replace(/^D1_ERROR:\s*/, "").replace(/: SQLITE_[A-Z_]+$/, "") }, { status: 400 });
  }
  return Response.json(out);
}

function withServedBy(res: Response, app: string): Response {
  const out = new Response(res.body, res);
  out.headers.set("x-sg-served-by", app);
  return out;
}

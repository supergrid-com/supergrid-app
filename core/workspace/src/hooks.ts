// Hooks: what reacts to an event. One table whether the reaction is a workflow, an HTTP call or an app's handler.
// The consumer matches a batch's event names against enabled hooks and starts one run per event × hook, exactly once.
import type { EventRow, Hook, HookCatalog, HookInput, HookRunRow } from "@supergrid/app-kit/rpc";
import { eventNames } from "./events";
import { nid, now, runIdFor } from "./ids";
import { secretsFor } from "./secrets";
import { STEPS } from "./steps";
import type { Env } from "./types";
import { bool, EVENT_NAME, invalid, matches, obj, oneOf, opt, str, tpl, whenList } from "./validate";
import { executeHook, type HookRunParams } from "./workflows";
import { appOf, routes } from "./registry";

type Row = { id: string; name: string | null; event: string; app_id: string | null; action: Hook["action"]; config: string; when_filter: string | null; enabled: number; created_at: string; updated_at: string };
const hookOf = (r: Row): Hook => ({ id: r.id, name: r.name, event: r.event, app_id: r.app_id, action: r.action, config: JSON.parse(r.config || "{}"), when: r.when_filter ? JSON.parse(r.when_filter) : null, enabled: !!r.enabled, created_at: r.created_at, updated_at: r.updated_at });

/** Hooks an app declared in its manifest (`subscribes`): read-only, delivered to the app Worker. */
function manifestHooks(env: Env, names: Set<string>): Hook[] {
  const ts = "";
  return routes(env).flatMap((r) => (r.subscribes ?? []).filter((e) => names.has(e)).map((event): Hook => ({
    id: `app:${r.app}:${event}`, name: `${r.app} handles ${event}`, event, app_id: r.app, action: "app", config: { app: r.app }, when: null, enabled: true, readonly: true, created_at: ts, updated_at: ts,
  })));
}

async function hooksFor(env: Env, names: string[]): Promise<Hook[]> {
  const out: Hook[] = [];
  for (let i = 0; i < names.length; i += 90) {
    const chunk = names.slice(i, i + 90);
    out.push(...(await env.DB.prepare(`SELECT * FROM hooks WHERE enabled = 1 AND event IN (${chunk.map(() => "?").join(",")})`).bind(...chunk).all<Row>()).results.map(hookOf));
  }
  return [...out, ...manifestHooks(env, new Set(names))];
}

const delivered = async (db: D1Database, eventId: string, target: string) => !!(await db.prepare("SELECT 1 FROM event_deliveries WHERE event_id = ? AND target = ?").bind(eventId, target).first());
const markDelivered = (db: D1Database, eventId: string, target: string) => db.prepare("INSERT OR IGNORE INTO event_deliveries (event_id, target) VALUES (?, ?)").bind(eventId, target).run();

/** Called after a batch is stored. Queues deliver at least once, so each event × hook is recorded once it has started. */
export async function dispatchHooks(env: Env, rows: EventRow[]): Promise<void> {
  const names = [...new Set(rows.map((r) => r.name))];
  const hooks = await hooksFor(env, names);
  if (!hooks.length) return;
  const byEvent = new Map<string, Hook[]>();
  for (const h of hooks) byEvent.set(h.event, [...(byEvent.get(h.event) ?? []), h]);
  for (const row of rows) {
    for (const hook of byEvent.get(row.name) ?? []) {
      if (!matches(hook.when, row as unknown as Record<string, unknown>)) continue;
      if (await delivered(env.DB, row.id, hook.id)) continue;
      await startRun(env, hook, row);
      await markDelivered(env.DB, row.id, hook.id);
    }
  }
}

/** Snapshot the hook (and its workflow) into the run so edits never change a run in flight. */
export async function startRun(env: Env, hook: Hook, event: EventRow, runId?: string): Promise<string> {
  const id = runId ?? (await runIdFor(event.id, hook.id));
  let workflow: { id: string; version: number; definition: HookRunParams["definition"] } | null = null;
  if (hook.action === "workflow") {
    const wf = await env.DB.prepare("SELECT id, version, definition, enabled FROM workflows WHERE id = ?").bind(hook.config.workflowId ?? "").first<{ id: string; version: number; definition: string; enabled: number }>();
    if (!wf || !wf.enabled) return id;
    workflow = { id: wf.id, version: wf.version, definition: JSON.parse(wf.definition) };
  }
  const inserted = await env.DB.prepare("INSERT OR IGNORE INTO hook_runs (id, hook_id, workflow_id, workflow_version, event_id, event_name, contact_id, status, started_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'queued', ?)")
    .bind(id, hook.id, workflow?.id ?? null, workflow?.version ?? null, event.id, event.name, event.contact_id, now()).run();
  if (!inserted.meta.changes) return id;
  const params: HookRunParams = { runId: id, hookId: hook.id, action: hook.action, config: hook.config, definition: workflow?.definition ?? null, event };
  if (env.HOOK_RUN) {
    try { await env.HOOK_RUN.create({ id, params }); }
    catch (e) {
      if (String(e).includes("already")) return id;
      // Nothing started: forget the run, so the queue's retry of this batch can start it instead of finding it "queued" forever.
      await env.DB.prepare("DELETE FROM hook_runs WHERE id = ? AND status = 'queued'").bind(id).run();
      throw e;
    }
  } else {
    await executeHook(env, params);
  }
  return id;
}

// ---- Actions ------------------------------------------------------------------------------------------------------

/**
 * POST the event as JSON, signed with the hook's secret when it has one. The URL, headers, body template and signing secret
 * may name workspace secrets as `{{secrets.NAME}}`; those are unsealed for this call only and never recorded.
 */
export async function executeHttp(env: Env, config: Hook["config"], event: EventRow, vars: Record<string, unknown>): Promise<unknown> {
  const rawUrl = str(config.url, "url", { max: 2000, re: /^https?:\/\// });
  const v = { ...vars, secrets: await secretsFor(env, [rawUrl, ...Object.values(config.headers ?? {}), config.bodyTemplate, config.secret]) };
  const url = tpl(rawUrl, v);
  const body = config.bodyTemplate ? tpl(config.bodyTemplate, v) : JSON.stringify({ event });
  const headers = new Headers({ "content-type": "application/json", "x-sg-event": event.name, "x-sg-event-id": event.id });
  for (const [k, h] of Object.entries(config.headers ?? {})) headers.set(k, tpl(h, v));
  if (config.secret) {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(tpl(config.secret, v)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    headers.set("x-sg-signature", [...new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)))].map((b) => b.toString(16).padStart(2, "0")).join(""));
  }
  const res = await fetch(url, { method: (config.method ?? "POST").toUpperCase(), headers, body });
  const text = await res.text().catch(() => "");
  if (!res.ok) throw new Error(`${res.status} from ${rawUrl}: ${text.slice(0, 200)}`);
  return { status: res.status, body: text.slice(0, 2000) };
}

/** Hand the event to the app Worker that subscribed to it. */
export async function executeApp(env: Env, app: string, event: EventRow): Promise<unknown> {
  // Composed into this Worker: call the handler. The WorkspaceApi needs no ExecutionContext here (see `exec()` in api.ts).
  const composed = appOf(app);
  if (composed) {
    const hook = composed.hooks[event.name];
    if (!hook) throw new Error(`app ${app} has no handler for ${event.name}`);
    const { WorkspaceApi } = await import("./api");
    await hook(event, { WORKSPACE: new WorkspaceApi(undefined as unknown as ExecutionContext, env), DB: env.DB });
    return { status: 204 };
  }
  const route = routes(env).find((r) => r.app === app);
  const binding = route && (env[route.binding] as Fetcher | undefined);
  if (!binding) throw new Error(`no binding for app ${app}`);
  const res = await binding.fetch(new Request(`https://app/_app/${app}/hook`, {
    method: "POST", headers: { "content-type": "application/json", "x-sg-workspace": env.WORKSPACE_ID, "x-sg-app": app, "x-sg-event": event.name }, body: JSON.stringify({ event }),
  }));
  if (!res.ok) throw new Error(`app ${app} answered ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
  return { status: res.status };
}

// ---- CRUD ---------------------------------------------------------------------------------------------------------

export async function listHooks(env: Env): Promise<Hook[]> {
  const rows = (await env.DB.prepare("SELECT * FROM hooks ORDER BY event, created_at").all<Row>()).results.map(hookOf);
  const declared = manifestHooks(env, new Set(routes(env).flatMap((r) => r.subscribes ?? [])));
  return [...rows, ...declared];
}

export async function saveHook(env: Env, appId: string | null, input: HookInput): Promise<Hook> {
  const i = obj(input, "hook");
  const id = i.id == null ? nid() : str(i.id, "id", { max: 64 });
  if (id.startsWith("app:")) invalid("app hooks come from the app's manifest");
  const action = oneOf(i.action, "action", ["workflow", "http"] as const);
  const config = obj(i.config, "config");
  if (action === "workflow") {
    const wf = await env.DB.prepare("SELECT 1 FROM workflows WHERE id = ?").bind(str(config.workflowId, "config.workflowId", { max: 64 })).first();
    if (!wf) invalid("unknown workflow");
  } else {
    str(config.url, "config.url", { max: 2000, re: /^https?:\/\// });
    if (config.headers != null) for (const [k, v] of Object.entries(obj(config.headers, "config.headers"))) if (typeof v !== "string" || k.length > 100 || v.length > 1000) invalid("bad header");
  }
  const when = i.when == null ? null : whenList(i.when);
  await env.DB.prepare(`INSERT INTO hooks (id, name, event, app_id, action, config, when_filter, enabled, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET name = excluded.name, event = excluded.event, action = excluded.action, config = excluded.config, when_filter = excluded.when_filter, enabled = excluded.enabled, updated_at = excluded.updated_at`)
    .bind(id, opt(i.name, "name", { max: 100 }), str(i.event, "event", { max: 100, re: EVENT_NAME }), appId, action, JSON.stringify(config), when ? JSON.stringify(when) : null, bool(i.enabled, true) ? 1 : 0, now()).run();
  return hookOf((await env.DB.prepare("SELECT * FROM hooks WHERE id = ?").bind(id).first<Row>())!);
}

export const removeHook = (db: D1Database, id: string) => db.prepare("DELETE FROM hooks WHERE id = ? AND id NOT LIKE 'wf:%'").bind(str(id, "id", { max: 64 })).run().then(() => {});

export async function hookCatalog(env: Env): Promise<HookCatalog> {
  const [events, workflows] = await Promise.all([eventNames(env.DB), env.DB.prepare("SELECT id, name FROM workflows ORDER BY name").all<{ id: string; name: string }>()]);
  return { events, workflows: workflows.results, steps: Object.entries(STEPS).map(([type, s]) => ({ type, label: s.label, description: s.description, fields: s.fields })) };
}

// ---- Runs ---------------------------------------------------------------------------------------------------------

type RunRow = Omit<HookRunRow, "steps">;
export async function listRuns(db: D1Database, v: unknown): Promise<HookRunRow[]> {
  const q = obj(v, "query");
  const clauses: string[] = [];
  const binds: unknown[] = [];
  if (q.workflowId) { clauses.push("workflow_id = ?"); binds.push(str(q.workflowId, "workflowId", { max: 64 })); }
  if (q.hookId) { clauses.push("hook_id = ?"); binds.push(str(q.hookId, "hookId", { max: 64 })); }
  const limit = Math.min(200, Math.max(1, Number(q.limit) || 50));
  return (await db.prepare(`SELECT * FROM hook_runs ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""} ORDER BY started_at DESC LIMIT ?`).bind(...binds, limit).all<RunRow>()).results;
}
export async function getRun(db: D1Database, id: string): Promise<HookRunRow | null> {
  const run = await db.prepare("SELECT * FROM hook_runs WHERE id = ?").bind(str(id, "id", { max: 64 })).first<RunRow>();
  if (!run) return null;
  const steps = (await db.prepare("SELECT * FROM hook_run_steps WHERE run_id = ? ORDER BY idx").bind(id).all<{ run_id: string; idx: number; step_id: string | null; type: string; status: string; output: string | null; finished_at: string | null }>()).results;
  return { ...run, steps: steps.map((s) => ({ ...s, output: s.output ? JSON.parse(s.output) : null })) };
}

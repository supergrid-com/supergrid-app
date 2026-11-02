// Events: one shape for everything that happens, written through the queue when there is one and straight to D1 when not.
// Browsers post to /_ws/events with a first-party visitor cookie; apps call `emit` over their binding.
import { RESERVED_EVENTS, type EventInput, type EventName, type EventPage, type EventQuery, type EventRow } from "@supergrid/app-kit/rpc";
import { dispatchHooks } from "./hooks";
import { isId, nid, now } from "./ids";
import type { Env } from "./types";
import { EVENT_NAME, int, invalid, iso, list, obj, opt, str, strings } from "./validate";

export const ANON_COOKIE = "sg_aid";
const RESERVED = new Set<string>(RESERVED_EVENTS);
/** Reserved names a browser or app may still send: they describe the visitor, not the workspace's own records. */
const OPEN = new Set(["page.view", "session.start"]);
const MAX_PROPS = 8_000;
const BOT = /bot|crawl|spider|slurp|headless|preview|lighthouse/i;
const COLUMNS = ["id", "name", "app_id", "ts", "contact_id", "anonymous_id", "session_id", "url", "path", "referrer", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "country", "region", "city", "timezone", "user_agent", "device", "props"] as const;

const device = (ua: string | null) => (!ua ? null : /tablet|ipad/i.test(ua) ? "tablet" : /mobi|android|iphone/i.test(ua) ? "mobile" : "desktop");
const clip = (v: unknown, max: number) => (v == null || v === "" ? null : String(v).slice(0, max));

/** Fills in what the caller left out. Only the core (`opts.core`) may use reserved names, apart from the page and session ones. */
export function normalize(appId: string, input: EventInput, request?: Request, opts: { core?: boolean } = {}): EventRow {
  const name = str(input.name, "name", { max: 100, re: EVENT_NAME });
  if (RESERVED.has(name) && !OPEN.has(name) && !opts.core) invalid(`${name} is reserved for the workspace`);
  const props = obj(input.props, "props");
  const json = JSON.stringify(props);
  if (json.length > MAX_PROPS) invalid(`props are limited to ${MAX_PROPS / 1000} KB`);
  const cf = (request as unknown as { cf?: Record<string, unknown> } | undefined)?.cf ?? {};
  const url = clip(input.url, 2000);
  let path = clip(input.path, 1000);
  const utm: Record<string, string | undefined> = { ...input.utm };
  if (url) {
    try {
      const u = new URL(url);
      path ??= u.pathname;
      // utm_* in the URL count when the caller didn't name them: server-side emits only see the URL.
      for (const k of ["source", "medium", "campaign", "term", "content"]) utm[k] ??= u.searchParams.get(`utm_${k}`) ?? undefined;
    } catch { /* not a url */ }
  }
  const ua = clip(input.userAgent, 500) ?? clip(request?.headers.get("user-agent"), 500);
  return {
    id: nid(), name, app_id: appId, ts: iso(input.ts, "ts") ?? now(),
    contact_id: clip(input.contactId, 64), anonymous_id: isId(input.anonymousId) ? input.anonymousId : null, session_id: clip(input.sessionId, 64),
    url, path, referrer: clip(input.referrer, 2000),
    utm_source: clip(utm.source, 200), utm_medium: clip(utm.medium, 200), utm_campaign: clip(utm.campaign, 200), utm_term: clip(utm.term, 200), utm_content: clip(utm.content, 200),
    country: clip(cf.country, 8), region: clip(cf.region ?? cf.regionCode, 100), city: clip(cf.city, 100), timezone: clip(cf.timezone, 64),
    user_agent: ua, device: device(ua), props,
  };
}

/** Through the queue when bound, else written now. `appId` says who caused the event; `core` lets the workspace's own modules use reserved names. */
export async function publish(env: Env, exec: ExecutionContext | undefined, appId: string, inputs: EventInput[], opts: { request?: Request; core?: boolean } = {}): Promise<string[]> {
  const rows = inputs.map((i) => normalize(appId, i, opts.request, { core: opts.core }));
  if (!rows.length) return [];
  if (env.EVENTS) {
    for (let i = 0; i < rows.length; i += 100) await env.EVENTS.sendBatch(rows.slice(i, i + 100).map((body) => ({ body })));
  } else {
    const work = processBatch(env, rows).catch((e) => console.error("events: direct write failed", e));
    if (exec) exec.waitUntil(work); else await work;
  }
  return rows.map((r) => r.id);
}

/** What the consumer does with a batch: claim anonymous events for known contacts, insert, dispatch hooks. */
export async function processBatch(env: Env, rows: EventRow[]): Promise<void> {
  const db = env.DB;
  const anon = [...new Set(rows.filter((r) => !r.contact_id && r.anonymous_id).map((r) => r.anonymous_id!))];
  if (anon.length) {
    const known = new Map<string, string>();
    for (let i = 0; i < anon.length; i += 90) {
      const chunk = anon.slice(i, i + 90);
      for (const r of (await db.prepare(`SELECT anonymous_id, contact_id FROM identities WHERE anonymous_id IN (${chunk.map(() => "?").join(",")})`).bind(...chunk).all<{ anonymous_id: string; contact_id: string }>()).results) known.set(r.anonymous_id, r.contact_id);
    }
    for (const r of rows) if (!r.contact_id && r.anonymous_id) r.contact_id = known.get(r.anonymous_id) ?? null;
  }
  const sql = `INSERT OR IGNORE INTO events (${COLUMNS.join(", ")}) VALUES (${COLUMNS.map(() => "?").join(", ")})`;
  for (let i = 0; i < rows.length; i += 50) {
    await db.batch(rows.slice(i, i + 50).map((r) => db.prepare(sql).bind(...COLUMNS.map((c) => (c === "props" ? JSON.stringify(r.props) : r[c])))));
  }
  await dispatchHooks(env, rows);
}

export async function handleQueue(batch: MessageBatch<EventRow>, env: Env): Promise<void> {
  if (batch.queue.endsWith("-dlq")) {
    await env.DB.batch(batch.messages.map((m) => env.DB.prepare("INSERT OR IGNORE INTO dead_letters (id, body, attempts) VALUES (?, ?, ?)").bind(m.body.id ?? nid(), JSON.stringify(m.body), m.attempts)));
    batch.ackAll();
    return;
  }
  try {
    await processBatch(env, batch.messages.map((m) => m.body));
    batch.ackAll();
  } catch (e) {
    console.error("events: batch failed, retrying", e);
    batch.retryAll({ delaySeconds: Math.min(60, 2 ** (batch.messages[0]?.attempts ?? 1)) });
  }
}

const cookieValue = (request: Request) => request.headers.get("cookie")?.match(new RegExp(`(?:^|;\\s*)${ANON_COOKIE}=([A-Za-z0-9_-]{6,64})`))?.[1] ?? null;
export const anonymousIdOf = cookieValue;

function cors(env: Env, request: Request): Record<string, string> {
  const origin = request.headers.get("origin");
  let allowed = "";
  try { if (origin && new URL(origin).host === new URL(env.WORKSPACE_URL).host) allowed = origin; } catch { /* no origin */ }
  return allowed ? { "access-control-allow-origin": allowed, "access-control-allow-credentials": "true", "access-control-allow-headers": "content-type", vary: "origin" } : {};
}

/**
 * POST /_ws/events from a browser: `{ events: [{name, props, url, path, referrer, utm, ts}], identify?: {email, name?} }`.
 * text/plain so sendBeacon skips the preflight. The visitor gets a first-party cookie; identify links it to a contact.
 */
export async function handleIngest(request: Request, env: Env, exec: ExecutionContext): Promise<Response> {
  const headers = cors(env, request);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "POST") return new Response("POST only", { status: 405, headers });
  if (BOT.test(request.headers.get("user-agent") ?? "")) return new Response(null, { status: 204, headers });
  let body: { events?: unknown; identify?: unknown; app?: unknown };
  try { body = JSON.parse(await request.text()); } catch { return Response.json({ error: "bad json" }, { status: 400, headers }); }
  const existing = cookieValue(request);
  const anonymousId = existing ?? nid();
  const appId = opt(body.app, "app", { max: 40, re: /^[a-z][a-z0-9-]*$/ }) ?? "site";
  try {
    const inputs = list(body.events, "events", 20).map((e) => ({ ...obj(e, "event"), anonymousId })) as EventInput[];
    if (body.identify) {
      const { upsertContact } = await import("./contacts");
      const who = obj(body.identify, "identify");
      const contact = await upsertContact(env, exec, appId, { email: str(who.email, "identify.email", { max: 320 }), name: opt(who.name, "identify.name", { max: 200 }), anonymousId });
      for (const i of inputs) i.contactId = contact.id;
      await publish(env, exec, appId, [{ name: "contact.identified", contactId: contact.id, anonymousId, props: { email: contact.email } }], { request, core: true });
    }
    await publish(env, exec, appId, inputs, { request });
  } catch (e) {
    return Response.json({ error: String((e as Error).message ?? e) }, { status: 400, headers });
  }
  const out = new Headers(headers);
  if (!existing) {
    const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
    out.set("set-cookie", `${ANON_COOKIE}=${anonymousId}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax${secure}`);
  }
  return new Response(null, { status: 204, headers: out });
}

// ---- Reading ----------------------------------------------------------------------------------------------------

const hydrate = (r: Record<string, unknown>): EventRow => ({ ...(r as unknown as EventRow), props: JSON.parse((r.props as string) || "{}") });

export async function listEvents(db: D1Database, v: unknown): Promise<EventPage> {
  const q = obj(v, "query") as EventQuery;
  const clauses: string[] = [];
  const binds: unknown[] = [];
  const names = q.name == null ? [] : typeof q.name === "string" ? [q.name] : strings(q.name, "name", 50);
  if (names.length) { clauses.push(`name IN (${names.map(() => "?").join(",")})`); binds.push(...names); }
  if (q.appId) { clauses.push("app_id = ?"); binds.push(str(q.appId, "appId", { max: 40 })); }
  if (q.contactId) { clauses.push("contact_id = ?"); binds.push(str(q.contactId, "contactId", { max: 64 })); }
  if (q.anonymousId) { clauses.push("anonymous_id = ?"); binds.push(str(q.anonymousId, "anonymousId", { max: 64 })); }
  const from = iso(q.from, "from"), to = iso(q.to, "to");
  if (from) { clauses.push("ts >= ?"); binds.push(from); }
  if (to) { clauses.push("ts < ?"); binds.push(to); }
  if (q.search) { clauses.push("(name LIKE ? ESCAPE '\\' OR path LIKE ? ESCAPE '\\' OR props LIKE ? ESCAPE '\\')"); const like = `%${str(q.search, "search", { max: 200 }).replace(/[%_\\]/g, "\\$&")}%`; binds.push(like, like, like); }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const limit = int(q.limit, "limit", { min: 1, max: 500, dflt: 50 }), offset = int(q.offset, "offset", { min: 0, max: 1_000_000, dflt: 0 });
  const [rows, count] = await db.batch([
    db.prepare(`SELECT * FROM events ${where} ORDER BY ts DESC, id LIMIT ? OFFSET ?`).bind(...binds, limit, offset),
    db.prepare(`SELECT COUNT(*) AS n FROM events ${where}`).bind(...binds),
  ]);
  return { items: (rows.results as Record<string, unknown>[]).map(hydrate), total: (count.results[0] as { n: number })?.n ?? 0 };
}

/** Names seen in the last 90 days plus the reserved ones, so pickers work on an empty workspace. */
export async function eventNames(db: D1Database): Promise<EventName[]> {
  const since = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const seen = (await db.prepare("SELECT name, app_id, COUNT(*) AS count FROM events WHERE ts >= ? GROUP BY name, app_id ORDER BY count DESC").bind(since).all<{ name: string; app_id: string; count: number }>()).results;
  const out: EventName[] = seen.map((s) => ({ ...s, reserved: RESERVED.has(s.name) }));
  for (const name of RESERVED_EVENTS) if (!out.some((o) => o.name === name)) out.push({ name, app_id: null, count: 0, reserved: true });
  return out;
}

export const isReserved = (name: string) => RESERVED.has(name);

// Analytics over the events table. A spec compiles to a fixed set of SQL shapes: column names come from whitelists here,
// prop keys are bound, and the time range is always bound so the (name, ts) and (app_id, ts) indexes do the work.
import type { AnalyticsRow, AnalyticsSpec, FunnelSpec, FunnelStep } from "@supergrid/app-kit/rpc";
import type { Env } from "./types";
import { int, invalid, iso, list, obj, oneOf, opt, str, strings, whenList, whenSql } from "./validate";

const DAY = 86_400_000;
const GROUPS: Record<string, string> = { name: "name", app_id: "app_id", path: "path", referrer: "referrer", utm_source: "utm_source", utm_medium: "utm_medium", utm_campaign: "utm_campaign", country: "country", device: "device" };
const FILTERABLE = new Set([...Object.keys(GROUPS), "contact_id", "anonymous_id", "session_id", "region", "city", "url", "utm_term", "utm_content", "ts"]);
const column = (f: string) => (FILTERABLE.has(f) ? f : null);
const PROP = /^[a-zA-Z_][\w.]{0,60}$/;
const ROLLUP_AFTER_DAYS = 90;

export function parseSpec(v: unknown): Required<Pick<AnalyticsSpec, "metric" | "from" | "to" | "limit">> & AnalyticsSpec {
  const s = obj(v, "spec");
  const to = iso(s.to, "to") ?? new Date().toISOString();
  const days = int(s.days, "days", { min: 1, max: 3650, dflt: 30 });
  const from = iso(s.from, "from") ?? new Date(new Date(to).getTime() - days * DAY).toISOString();
  const groupBy = opt(s.groupBy, "groupBy", { max: 70 });
  if (groupBy && !GROUPS[groupBy] && !(groupBy.startsWith("prop:") && PROP.test(groupBy.slice(5)))) invalid(`groupBy must be one of ${Object.keys(GROUPS).join(", ")} or prop:<key>`);
  const prop = opt(s.prop, "prop", { max: 60, re: PROP });
  const metric = oneOf(s.metric, "metric", ["count", "unique_contacts", "unique_visitors", "sum"] as const, "count");
  if (metric === "sum" && !prop) invalid("sum needs a prop");
  return {
    metric, prop: prop ?? undefined, events: s.events == null ? undefined : strings(s.events, "events", 50), appId: opt(s.appId, "appId", { max: 40 }) ?? undefined,
    from, to, interval: s.interval == null ? undefined : oneOf(s.interval, "interval", ["day", "week", "month"] as const),
    groupBy: (groupBy ?? undefined) as AnalyticsSpec["groupBy"], filters: s.filters == null ? undefined : whenList(s.filters, "filters"), limit: int(s.limit, "limit", { min: 1, max: 1000, dflt: 50 }),
  };
}

const bucketSql = (interval: AnalyticsSpec["interval"]) =>
  interval === "day" ? "substr(ts, 1, 10)" : interval === "week" ? "strftime('%Y-%m-%d', ts, 'weekday 0', '-6 days')" : interval === "month" ? "substr(ts, 1, 7)" : "NULL";

function valueSql(spec: AnalyticsSpec): { sql: string; binds: unknown[] } {
  switch (spec.metric) {
    case "unique_contacts": return { sql: "COUNT(DISTINCT contact_id)", binds: [] };
    case "unique_visitors": return { sql: "COUNT(DISTINCT COALESCE(contact_id, anonymous_id))", binds: [] };
    case "sum": return { sql: "COALESCE(SUM(json_extract(props, '$.' || ?)), 0)", binds: [spec.prop] };
    default: return { sql: "COUNT(*)", binds: [] };
  }
}

function whereSql(spec: AnalyticsSpec): { sql: string; binds: unknown[] } {
  const clauses = ["ts >= ?", "ts < ?"];
  const binds: unknown[] = [spec.from, spec.to];
  if (spec.events?.length) { clauses.push(`name IN (${spec.events.map(() => "?").join(",")})`); binds.push(...spec.events); }
  if (spec.appId) { clauses.push("app_id = ?"); binds.push(spec.appId); }
  for (const w of spec.filters ?? []) { const p = whenSql(w, column); if (p) { clauses.push(p.sql); binds.push(...p.binds); } }
  return { sql: `WHERE ${clauses.join(" AND ")}`, binds };
}

/** Rows of {bucket, key, value}. Long `count` ranges without filters read the daily rollups instead of raw events. */
export async function query(db: D1Database, input: unknown): Promise<AnalyticsRow[]> {
  const spec = parseSpec(input);
  const span = (new Date(spec.to).getTime() - new Date(spec.from).getTime()) / DAY;
  const simpleGroup = !spec.groupBy || ["name", "app_id", "path"].includes(spec.groupBy);
  if (span > ROLLUP_AFTER_DAYS && !spec.filters?.length && simpleGroup && (spec.interval ?? "day") !== "week") {
    if (spec.metric === "sum") invalid(`sum over more than ${ROLLUP_AFTER_DAYS} days isn't available`);
    return rollupQuery(db, spec);
  }
  const value = valueSql(spec);
  const where = whereSql(spec);
  let group = "NULL";
  const groupBinds: unknown[] = [];
  if (spec.groupBy?.startsWith("prop:")) { group = "json_extract(props, '$.' || ?)"; groupBinds.push(spec.groupBy.slice(5)); }
  else if (spec.groupBy) group = GROUPS[spec.groupBy];
  const bucket = bucketSql(spec.interval);
  const sql = `SELECT ${bucket} AS bucket, ${group} AS key, ${value.sql} AS value FROM events ${where.sql} GROUP BY 1, 2 ORDER BY ${bucket === "NULL" ? "value DESC" : "1, value DESC"} LIMIT ?`;
  const limit = bucket === "NULL" ? spec.limit : Math.max(spec.limit, 2000);
  return (await db.prepare(sql).bind(...groupBinds, ...value.binds, ...where.binds, limit).all<AnalyticsRow>()).results;
}

async function rollupQuery(db: D1Database, spec: ReturnType<typeof parseSpec>): Promise<AnalyticsRow[]> {
  const col = spec.metric === "unique_contacts" ? "contacts" : spec.metric === "unique_visitors" ? "visitors" : "count";
  if (col !== "count" && spec.groupBy) invalid(`unique ${spec.groupBy} breakdowns over ${ROLLUP_AFTER_DAYS} days aren't available`);
  const clauses = ["day >= ?", "day < ?"];
  const binds: unknown[] = [spec.from.slice(0, 10), spec.to.slice(0, 10)];
  if (spec.events?.length) { clauses.push(`name IN (${spec.events.map(() => "?").join(",")})`); binds.push(...spec.events); }
  if (spec.appId) { clauses.push("app_id = ?"); binds.push(spec.appId); }
  const bucket = spec.interval === "day" ? "day" : spec.interval === "month" ? "substr(day, 1, 7)" : "NULL";
  const group = spec.groupBy ? GROUPS[spec.groupBy] : "NULL";
  return (await db.prepare(`SELECT ${bucket} AS bucket, ${group} AS key, SUM(${col}) AS value FROM rollups_daily WHERE ${clauses.join(" AND ")} GROUP BY 1, 2 ORDER BY 1, value DESC LIMIT ?`).bind(...binds, 2000).all<AnalyticsRow>()).results;
}

/** Ordered steps: who did step 1, then step 2 within the window after their first step 1, and so on. */
export async function funnel(db: D1Database, input: unknown): Promise<FunnelStep[]> {
  const s = obj(input, "spec");
  const steps = list(s.steps, "steps", 6).map((x, i) => { const o = obj(x, `steps[${i}]`); return { event: str(o.event, `steps[${i}].event`, { max: 100 }), filters: o.filters == null ? [] : whenList(o.filters, `steps[${i}].filters`) }; });
  if (steps.length < 2) invalid("a funnel needs at least two steps");
  const to = iso(s.to, "to") ?? new Date().toISOString();
  const from = iso(s.from, "from") ?? new Date(new Date(to).getTime() - int(s.days, "days", { min: 1, max: 365, dflt: 30 }) * DAY).toISOString();
  const actor = oneOf(s.by, "by", ["contact", "visitor"] as const, "visitor") === "contact" ? "e.contact_id" : "COALESCE(e.contact_id, e.anonymous_id)";
  const window = int(s.windowHours, "windowHours", { min: 1, max: 24 * 90, dflt: 24 * 7 });
  const ctes: string[] = [];
  const binds: unknown[] = [];
  steps.forEach((step, i) => {
    const extra = step.filters.map((w) => whenSql(w, (f) => (column(f) ? `e.${f}` : null), "e.props")).filter(Boolean) as { sql: string; binds: unknown[] }[];
    const where = ["e.name = ?", "e.ts >= ?", "e.ts < ?", `${actor} IS NOT NULL`, ...extra.map((x) => x.sql)].join(" AND ");
    if (i === 0) {
      ctes.push(`s0 AS (SELECT ${actor} AS actor, MIN(e.ts) AS t FROM events e WHERE ${where} GROUP BY 1)`);
      binds.push(step.event, from, to, ...extra.flatMap((x) => x.binds));
    } else {
      ctes.push(`s${i} AS (SELECT p.actor AS actor, MIN(e.ts) AS t FROM s${i - 1} p JOIN events e ON ${actor} = p.actor AND e.ts > p.t AND e.ts <= strftime('%Y-%m-%dT%H:%M:%fZ', p.t, ?) WHERE ${where} GROUP BY 1)`);
      binds.push(`+${window} hours`, step.event, from, to, ...extra.flatMap((x) => x.binds));
    }
  });
  const sql = `WITH ${ctes.join(", ")} SELECT ${steps.map((_, i) => `(SELECT COUNT(*) FROM s${i}) AS c${i}`).join(", ")}`;
  const row = (await db.prepare(sql).bind(...binds).first<Record<string, number>>()) ?? {};
  const first = row.c0 ?? 0;
  return steps.map((step, i) => ({ event: step.event, count: row[`c${i}`] ?? 0, rate: first ? (row[`c${i}`] ?? 0) / first : 0 }));
}

/** Nightly: roll up the last three days into rollups_daily, then prune raw rows past retention. */
export async function rollupDaily(env: Env): Promise<void> {
  const db = env.DB;
  const today = new Date().toISOString().slice(0, 10);
  const since = new Date(Date.now() - 3 * DAY).toISOString().slice(0, 10);
  const setting = await db.prepare("SELECT value FROM settings WHERE key = 'events.retention_days'").first<{ value: string }>();
  const retention = Math.max(7, Number(setting ? JSON.parse(setting.value) : 90) || 90);
  await db.batch([
    db.prepare(`INSERT OR REPLACE INTO rollups_daily (day, name, app_id, path, count, contacts, visitors)
      SELECT substr(ts, 1, 10), name, app_id, COALESCE(path, ''), COUNT(*), COUNT(DISTINCT contact_id), COUNT(DISTINCT COALESCE(contact_id, anonymous_id))
      FROM events WHERE ts >= ? AND ts < ? GROUP BY 1, 2, 3, 4`).bind(`${since}T00:00:00.000Z`, `${today}T00:00:00.000Z`),
    db.prepare("DELETE FROM events WHERE ts < ?").bind(new Date(Date.now() - retention * DAY).toISOString()),
    db.prepare("DELETE FROM event_deliveries WHERE created_at < datetime('now', '-14 days')"),
    db.prepare("DELETE FROM hook_run_steps WHERE run_id IN (SELECT id FROM hook_runs WHERE started_at < datetime('now', '-90 days'))"),
    db.prepare("DELETE FROM hook_runs WHERE started_at < datetime('now', '-90 days')"),
    db.prepare("DELETE FROM dead_letters WHERE created_at < datetime('now', '-30 days')"),
  ]);
}

import { CfApiError, getSettings, type Cf } from "@supergrid/cloud";
import { shell } from "electron";
import type { D1Database, D1ExportResult, D1RawResult, D1Result, D1Target } from "../shared/bridge";
import { cfClient } from "./cf-api";

// The workspace's D1, read and written straight through Cloudflare's D1 REST API on cf's login,
// the same way the dashboard's data studio does it. The database is found from the workspace
// Worker's DB binding and remembered per Worker. Every SQL statement the renderer runs comes
// through here; what a table allows (read only, rows only, everything) is the renderer's rule
// (lib/db.ts), the way a Worker's own code decides what it writes.

const ids = new Map<string, Promise<string>>();

async function databaseId(cf: Cf, worker: string): Promise<string> {
  const key = `${cf.accountId}/${worker}`;
  let p = ids.get(key);
  if (!p) {
    p = getSettings(cf, worker).then(({ bindings }) => {
      const db = bindings.find((b) => b.type === "d1" && (b as { name: string }).name === "DB") as { id?: string } | undefined;
      if (!db?.id) throw new Error(`${worker} has no DB binding.`);
      return db.id;
    });
    ids.set(key, p);
    p.catch(() => ids.delete(key));
  }
  return p;
}

async function open(target: D1Target): Promise<{ cf: Cf; base: string }> {
  const cf = await cfClient(target.accountId);
  const id = await databaseId(cf, target.worker);
  return { cf, base: cf.acct(`/d1/database/${id}`) };
}

/** D1's own error text, without the API's wrapping: "no such table: foo" rather than "Cloudflare API 400 on …". */
function unwrap(e: unknown): never {
  if (e instanceof CfApiError) {
    const msg = e.errors.map((x) => x.message).join("; ") || e.message;
    throw new Error(msg.replace(/^D1_ERROR:\s*/, "").replace(/: SQLITE_[A-Z_]+$/, ""));
  }
  throw e;
}

type Meta = D1Result["meta"];
const meta = (m: Partial<Meta> | undefined): Meta => ({ duration: m?.duration ?? 0, changes: m?.changes ?? 0, last_row_id: m?.last_row_id ?? 0, rows_read: m?.rows_read ?? 0, rows_written: m?.rows_written ?? 0, size_after: m?.size_after ?? 0 });

/** One statement; rows come back as objects keyed by column. */
export async function query(target: D1Target, sql: string, params: unknown[] = []): Promise<D1Result> {
  const { cf, base } = await open(target);
  const out = await cf.post<{ results: Record<string, unknown>[]; meta?: Partial<Meta> }[]>(`${base}/query`, { sql, params }).catch(unwrap);
  const first = out[0];
  return { results: first?.results ?? [], meta: meta(first?.meta) };
}

/** One statement; columns and rows as arrays, so a query with two columns of one name keeps both. */
export async function raw(target: D1Target, sql: string, params: unknown[] = []): Promise<D1RawResult> {
  const { cf, base } = await open(target);
  const out = await cf.post<{ results: { columns: string[]; rows: unknown[][] }; meta?: Partial<Meta> }[]>(`${base}/raw`, { sql, params }).catch(unwrap);
  // the API answers one entry per statement; a script of several returns the last one's rows, with the work of all of them added up
  const last = out[out.length - 1];
  const sum = out.reduce((m, o) => ({ ...m, duration: m.duration + (o.meta?.duration ?? 0), changes: m.changes + (o.meta?.changes ?? 0), rows_read: m.rows_read + (o.meta?.rows_read ?? 0), rows_written: m.rows_written + (o.meta?.rows_written ?? 0) }), meta(last?.meta));
  return { columns: last?.results?.columns ?? [], rows: last?.results?.rows ?? [], meta: { ...sum, duration: out.length > 1 ? sum.duration : (last?.meta?.duration ?? 0) }, statements: out.length, all: out.map((o) => ({ columns: o.results?.columns ?? [], rows: o.results?.rows ?? [] })) };
}

/** The database itself: its name, size and when it was made. */
export async function info(target: D1Target): Promise<D1Database> {
  const { cf, base } = await open(target);
  const d = await cf.get<{ uuid: string; name: string; version?: string; num_tables?: number; file_size?: number; created_at?: string }>(base);
  return { id: d.uuid, name: d.name, tables: d.num_tables ?? 0, size: d.file_size ?? 0, createdAt: d.created_at ?? null, accountId: cf.accountId };
}

/** Time Travel: the bookmark for now, or for a moment in the last thirty days. */
export async function bookmark(target: D1Target, timestamp?: string): Promise<string> {
  const { cf, base } = await open(target);
  const r = await cf.get<{ bookmark: string }>(`${base}/time_travel/bookmark${timestamp ? `?timestamp=${encodeURIComponent(timestamp)}` : ""}`).catch(unwrap);
  return r.bookmark;
}

/** Rolls the whole database back to a bookmark or a moment. Returns the bookmark of the state it restored. */
export async function restore(target: D1Target, to: { bookmark?: string; timestamp?: string }): Promise<string> {
  const { cf, base } = await open(target);
  const q = to.bookmark ? `bookmark=${encodeURIComponent(to.bookmark)}` : to.timestamp ? `timestamp=${encodeURIComponent(to.timestamp)}` : "";
  if (!q) throw new Error("Pick a bookmark or a time to restore to.");
  const r = await cf.post<{ bookmark?: string }>(`${base}/time_travel/restore?${q}`).catch(unwrap);
  return r?.bookmark ?? to.bookmark ?? "";
}

/**
 * A SQL dump of the whole database, as D1's export makes it: started, polled until Cloudflare has
 * written it, then opened in the browser so it downloads. Up to a couple of minutes on a big database.
 */
export async function exportSql(target: D1Target): Promise<D1ExportResult> {
  const { cf, base } = await open(target);
  type Poll = { at_bookmark?: string; status?: "active" | "complete" | "error"; result?: { filename?: string; signed_url?: string }; success?: boolean; error?: string; messages?: string[] };
  let current: string | undefined;
  const started = Date.now();
  for (;;) {
    const r = await cf.post<Poll>(`${base}/export`, { output_format: "polling", ...(current ? { current_bookmark: current } : {}) }).catch(unwrap);
    if (r.status === "error" || r.error) throw new Error(r.error ?? r.messages?.join(" ") ?? "The export failed.");
    if (r.status === "complete" && r.result?.signed_url) {
      await shell.openExternal(r.result.signed_url);
      return { filename: r.result.filename ?? "export.sql", bookmark: r.at_bookmark ?? current ?? "" };
    }
    current = r.at_bookmark ?? current;
    if (Date.now() - started > 180_000) throw new Error("The export is taking longer than three minutes. Try again in a moment.");
    await new Promise((res) => setTimeout(res, 1500));
  }
}

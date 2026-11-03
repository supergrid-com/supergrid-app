import { formatQuery, type RuleGroupType } from "react-querybuilder";
import type { D1Target } from "../../../shared/bridge";
import { sg } from "~/lib/bridge";
import type { DbTable } from "~/lib/db";
import { invalidate, useRemote } from "~/lib/library";
import { clean } from "~/lib/workspaces";

// Reports: a page of blocks, each a saved query over one table of the workspace's database, shown
// as a number, a table or a chart. The query is react-querybuilder's rule group; it is turned into
// a parameterized WHERE at run time and run through the D1 API like the Database pages. A report is
// kept in the workspace's `settings` table under `report:<id>`, so it lives with the data it reads
// and needs no table of its own.

export type BlockKind = "number" | "table" | "bar" | "line";
export type Metric = "count" | "sum" | "avg" | "min" | "max";
export type ReportBlock = {
  id: string;
  title: string;
  kind: BlockKind;
  table: string;
  query: RuleGroupType;
  metric: Metric;
  /** The column `sum`, `avg`, `min` and `max` work on. */
  field?: string;
  /** Bar: the column whose values are the bars. Line: the date column the series runs along. */
  groupBy?: string;
  /** Table and bar: how many rows. */
  limit?: number;
  /** How wide the block is on the page, in halves. */
  span?: 1 | 2;
};
export type Report = { id: string; name: string; description?: string; blocks: ReportBlock[]; created_at: string; updated_at: string };

const PREFIX = "report:";
const MAX_REPORTS = 50;
let n = 0;
export const newId = (p = "r") => `${p}${Date.now().toString(36)}${(n++).toString(36)}`;
const key = (t: D1Target | null) => (t ? `reports:${t.accountId}:${t.worker}` : null);

export const kindLabels: Record<BlockKind, string> = { number: "Number", table: "Table", bar: "Bar Chart", line: "Line Chart" };
export const metricLabels: Record<Metric, string> = { count: "Count", sum: "Sum", avg: "Average", min: "Minimum", max: "Maximum" };

export const emptyQuery = (): RuleGroupType => ({ combinator: "and", rules: [] });

export function newBlock(table: string, kind: BlockKind = "number"): ReportBlock {
  return { id: newId("b"), title: kindLabels[kind], kind, table, query: emptyQuery(), metric: "count", limit: 10, span: kind === "number" ? 1 : 2 };
}

async function run(target: D1Target, sql: string, params: unknown[] = []) {
  if (!sg) throw new Error("Reports open inside the SuperGrid app.");
  try {
    return await sg.d1.query(target, sql, params);
  } catch (e) {
    throw new Error(clean(e));
  }
}

type Row = { key: string; value: string; updated_at: string };
const parse = (r: Row): Report | null => {
  try {
    const v = JSON.parse(r.value) as Report;
    return v && typeof v === "object" && Array.isArray(v.blocks) ? { ...v, id: r.key.slice(PREFIX.length) } : null;
  } catch {
    return null;
  }
};

export async function listReports(target: D1Target): Promise<Report[]> {
  const { results } = await run(target, "SELECT key, value, updated_at FROM settings WHERE key LIKE ? ORDER BY key", [`${PREFIX}%`]);
  return (results as Row[]).map(parse).filter((r): r is Report => !!r).sort((a, b) => a.name.localeCompare(b.name));
}

export function useReports(target: D1Target | null) {
  return useRemote(key(target), () => listReports(target!));
}

export async function saveReport(target: D1Target, report: Report): Promise<Report> {
  const existing = (await run(target, "SELECT 1 FROM settings WHERE key = ?", [PREFIX + report.id])).results[0];
  if (!existing) {
    const count = Number((await run(target, "SELECT COUNT(*) AS n FROM settings WHERE key LIKE ?", [`${PREFIX}%`])).results[0]?.n ?? 0);
    if (count >= MAX_REPORTS) throw new Error(`A workspace holds up to ${MAX_REPORTS} reports.`);
  }
  const now = new Date().toISOString();
  const next: Report = { ...report, name: report.name.trim() || "Untitled Report", created_at: report.created_at || now, updated_at: now };
  await run(target, `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`, [PREFIX + next.id, JSON.stringify(next)]);
  invalidate("reports:");
  return next;
}

export async function removeReport(target: D1Target, id: string): Promise<void> {
  await run(target, "DELETE FROM settings WHERE key = ?", [PREFIX + id]);
  invalidate("reports:");
}

// ---- running a block ----

export type BlockResult = { value?: number | null; rows?: Record<string, unknown>[]; columns?: string[]; points?: { key: string; value: number }[]; ms: number };

const ident = (s: string) => `"${s.replace(/"/g, '""')}"`;

/** The WHERE a block's rules make, with `?` placeholders. No rules at all is no WHERE. */
export function whereOf(query: RuleGroupType): { sql: string; params: unknown[] } {
  if (!query.rules.length) return { sql: "", params: [] };
  const out = formatQuery(query, { format: "parameterized", quoteFieldNamesWith: '"' });
  return { sql: ` WHERE ${out.sql}`, params: out.params };
}

function metricSql(block: ReportBlock): string {
  if (block.metric === "count" || !block.field) return "count(*)";
  return `${block.metric}(${ident(block.field)})`;
}

export async function runBlock(target: D1Target, block: ReportBlock, table: DbTable | undefined): Promise<BlockResult> {
  if (!table) throw new Error(`There is no ${block.table} table in this workspace.`);
  const w = whereOf(block.query);
  const t = ident(table.name);
  const started = performance.now();
  const limit = Math.max(1, Math.min(500, block.limit ?? 10));
  if (block.kind === "number") {
    const r = await run(target, `SELECT ${metricSql(block)} AS value FROM ${t}${w.sql}`, w.params);
    const v = r.results[0]?.value;
    return { value: v == null ? null : Number(v), ms: performance.now() - started };
  }
  if (block.kind === "table") {
    const cols = table.columns.map((c) => ident(c.name)).join(", ");
    const r = await run(target, `SELECT ${cols} FROM ${t}${w.sql} LIMIT ?`, [...w.params, limit]);
    return { rows: r.results, columns: table.columns.map((c) => c.name), ms: performance.now() - started };
  }
  const by = block.groupBy ?? table.columns[0]?.name ?? "";
  if (!by) throw new Error("Pick a column to group by.");
  if (block.kind === "bar") {
    const r = await run(target, `SELECT COALESCE(CAST(${ident(by)} AS TEXT), '') AS key, ${metricSql(block)} AS value FROM ${t}${w.sql} GROUP BY ${ident(by)} ORDER BY value DESC LIMIT ?`, [...w.params, Math.min(limit, 24)]);
    return { points: r.results.map((x) => ({ key: String(x.key ?? ""), value: Number(x.value ?? 0) })), ms: performance.now() - started };
  }
  // line: one point per day along a date column, the newest 90 days of data
  const r = await run(target, `SELECT substr(${ident(by)}, 1, 10) AS key, ${metricSql(block)} AS value FROM ${t}${w.sql} GROUP BY key ORDER BY key DESC LIMIT 90`, w.params);
  return { points: r.results.map((x) => ({ key: String(x.key ?? ""), value: Number(x.value ?? 0) })).reverse(), ms: performance.now() - started };
}

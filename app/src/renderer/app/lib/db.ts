import * as React from "react";
import type { D1Database, D1Result, D1Target, WorkspaceSummary } from "../../../shared/bridge";
import type { Field, FieldType, GridRow } from "~/components/data-grid/types";
import { sg } from "~/lib/bridge";
import { useSession } from "~/lib/session";
import { clean } from "~/lib/workspaces";
import { useShell } from "~/shell/context";
import { CORE_TABLES, groupOf, ident, isIdent, modeOf, reservedTableIds, toIdent, type TableGroup, type TableMode } from "../../../shared/tables";

// The workspace's database, as the Database pages see it: every table in its D1, read through the
// main process (src/main/d1.ts), sorted into groups with a rule each about what the pages may do
// to it. Core and app tables have a shape their owner keeps (the workspace release, the app's
// migrations), so the pages change rows in them but never columns; system tables are the
// workspace's own bookkeeping and are read only; custom tables are the user's, made here, and
// take everything.

export type { D1Target };

export type { TableGroup, TableMode } from "../../../shared/tables";
export { groupLabels, isIdent, modeLabels, reservedTableIds, tableLabel, tableNoun, toIdent } from "../../../shared/tables";

export type Column = {
  name: string;
  /** The declared type, as written: TEXT, INTEGER, REAL, BLOB, or nothing. */
  type: string;
  notNull: boolean;
  /** The default expression as written in the schema, null when there is none. */
  dflt: string | null;
  /** 0 when not part of the primary key, else its position in it (1-based). */
  pk: number;
  field: Field;
};

export type DbTable = {
  name: string;
  group: TableGroup;
  /** The app that owns an app table (`app_<id>_*`). */
  app?: string;
  mode: TableMode;
  columns: Column[];
  pk: string[];
  /** WITHOUT ROWID tables are keyed by their primary key; the rest by rowid. */
  withoutRowid: boolean;
  virtual: boolean;
  sql: string;
  indexes: { name: string; sql: string | null }[];
  count: number | null;
};

/** The rowid column, selected alongside the table's own. */
export const ROWID = "$rowid";
/** Where a grid row carries its key (rowKey), apart from any `id` column the table has. */
export const KEY = "$key";


// ---- which tables are which: shared/tables.ts, so the agent's tools agree ----

export const modeAbout: Record<TableMode, { title: string; body: string }> = {
  custom: { title: "Custom table", body: "Made in this workspace. Rows and columns change here, and the table can be dropped. Every app can read it." },
  crud: { title: "Rows change here, columns don't", body: "Its shape belongs to the workspace release or the app that made it. Add, edit and delete rows here; columns change where the shape lives." },
  locked: { title: "Read only", body: "The workspace's own bookkeeping. It shows here and changes only through the workspace itself." },
};

/** What a table allows: `rows` is editing, adding and deleting rows; `schema` is columns and the table itself. */
export const allows = (t: Pick<DbTable, "mode" | "virtual">, what: "rows" | "schema"): boolean => !t.virtual && (what === "rows" ? t.mode !== "locked" : t.mode === "custom");

// ---- columns as grid fields ----

const JSON_NAMES = new Set(["props", "doc", "filter", "config", "definition", "meta", "tables", "fields", "options", "payload", "body", "output", "when_filter", "tags", "nav", "value"]);
const BOOL_NAMES = /^(is_|has_|enabled$|active$|required$|indexed$|archived$|verified$|published$|subscribed$|default$)/;

function fieldTypeFor(c: Omit<Column, "field">): FieldType {
  const t = c.type.toUpperCase();
  const d = c.dflt?.trim();
  if (/INT|REAL|NUM|DOUBLE|FLOAT|DEC/.test(t)) {
    if (/INT/.test(t) && (d === "0" || d === "1") && BOOL_NAMES.test(c.name)) return "checkbox";
    return "number";
  }
  if (d === "'{}'" || d === "'[]'" || (t === "TEXT" && JSON_NAMES.has(c.name) && c.name !== "value")) return "json";
  if (c.name === "value" && d === "'{}'") return "json";
  if (/_at$/.test(c.name) || c.name === "ts" || c.name === "timestamp") return "datetime";
  if (c.name === "email") return "email";
  if (c.name === "url" || c.name === "domain") return "url";
  return "text";
}

function labelOf(name: string): string {
  return name.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase()).replace(/\bId\b/g, "ID").replace(/\bUrl\b/g, "URL").replace(/\bUtm\b/g, "UTM");
}

function fieldFor(c: Omit<Column, "field">, primary: boolean, mode: TableMode): Field {
  const type = fieldTypeFor(c);
  const blob = c.type.toUpperCase() === "BLOB";
  return {
    id: c.name,
    label: labelOf(c.name),
    type,
    primary,
    // a key column is never edited in place where the shape is someone else's; custom tables may
    readOnly: blob || (c.pk > 0 && mode !== "custom"),
    width: primary ? 200 : type === "json" ? 260 : type === "datetime" ? 190 : type === "checkbox" ? 110 : type === "number" ? 120 : c.name.endsWith("_id") || c.name === "id" ? 170 : undefined,
  };
}

// ---- reading the schema ----


type MasterRow = { type: string; name: string; tbl_name: string; sql: string | null };
type PragmaRow = { cid: number; name: string; type: string; notnull: number; dflt_value: string | null; pk: number };

async function run(target: D1Target, sql: string, params: unknown[] = []): Promise<D1Result> {
  if (!sg) throw new Error("The database opens inside the SuperGrid app.");
  try {
    return await sg.d1.query(target, sql, params);
  } catch (e) {
    throw new Error(clean(e));
  }
}

export async function readSchema(target: D1Target): Promise<DbTable[]> {
  // D1's own tables (_cf_KV and the like) refuse every read, so they are left out altogether
  const master = (await run(target, "SELECT type, name, tbl_name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' AND name NOT LIKE '\\_cf\\_%' ESCAPE '\\' AND tbl_name NOT LIKE '\\_cf\\_%' ESCAPE '\\' ORDER BY name")).results as MasterRow[];
  const tables = master.filter((r) => r.type === "table");
  const indexes = master.filter((r) => r.type === "index");
  // every table's columns in one round trip: a script of PRAGMAs, one answer each
  const plain = tables.filter((t) => !/^\s*CREATE\s+VIRTUAL/i.test(t.sql ?? ""));
  const infos = new Map<string, PragmaRow[]>();
  if (plain.length && sg) {
    const script = await sg.d1.raw(target, plain.map((t) => `PRAGMA table_info(${ident(t.name)})`).join(";\n")).catch((e) => {
      throw new Error(clean(e));
    });
    plain.forEach((t, i) => {
      const a = script.all[i];
      if (a) infos.set(t.name, a.rows.map((r) => Object.fromEntries(a.columns.map((c, j) => [c, r[j]])) as PragmaRow));
    });
  }
  const out = tables.map((t): DbTable => {
      const { group, app } = groupOf(t.name);
      const virtual = !plain.includes(t);
      const mode = virtual ? "locked" : modeOf(t.name, group);
      const info = infos.get(t.name) ?? [];
      const cols = info.map((c) => ({ name: c.name, type: c.type ?? "", notNull: !!c.notnull, dflt: c.dflt_value ?? null, pk: c.pk }));
      const pk = cols.filter((c) => c.pk > 0).sort((a, b) => a.pk - b.pk).map((c) => c.name);
      const primaryName = pk.length === 1 ? pk[0] : cols[0]?.name;
      return {
        name: t.name,
        group,
        app,
        mode,
        columns: cols.map((c) => ({ ...c, field: fieldFor(c, c.name === primaryName, mode) })),
        pk,
        withoutRowid: /WITHOUT\s+ROWID\s*;?\s*$/i.test(t.sql ?? ""),
        virtual,
        sql: t.sql ?? "",
        indexes: indexes.filter((i) => i.tbl_name === t.name).map((i) => ({ name: i.name, sql: i.sql })),
        count: null,
      };
  });
  // one count per statement: D1 caps the terms of a compound SELECT well under a workspace's table count
  const countable = out.filter((t) => !t.virtual);
  if (countable.length && sg) {
    const script = await sg.d1.raw(target, countable.map((t) => `SELECT count(*) AS n FROM ${ident(t.name)}`).join(";\n")).catch(() => null);
    countable.forEach((t, i) => {
      const n = script?.all[i]?.rows[0]?.[0];
      t.count = typeof n === "number" ? n : null;
    });
  }
  const order: Record<TableGroup, number> = { core: 0, app: 1, custom: 2, system: 3 };
  return out.sort((a, b) => order[a.group] - order[b.group] || (a.group === "core" ? CORE_TABLES.indexOf(a.name) - CORE_TABLES.indexOf(b.name) : 0) || (a.app ?? "").localeCompare(b.app ?? "") || a.name.localeCompare(b.name));
}

// ---- the schema store, one per workspace ----

type Entry = { tables: DbTable[] | null; error?: string; loading: boolean };
const store = new Map<string, Entry>();
const listeners = new Set<() => void>();
const keyOf = (t: D1Target) => `${t.accountId}/${t.worker}${t.local ? `@${t.local.url}` : ""}`;

function set(key: string, next: Entry): void {
  store.set(key, next);
  for (const l of listeners) l();
}

export async function refreshSchema(target: D1Target): Promise<DbTable[] | null> {
  const key = keyOf(target);
  const cur = store.get(key);
  set(key, { tables: cur?.tables ?? null, loading: true });
  try {
    const tables = await readSchema(target);
    set(key, { tables, loading: false });
    return tables;
  } catch (e) {
    set(key, { tables: cur?.tables ?? null, error: clean(e), loading: false });
    return null;
  }
}

/** The account and Worker whose D1 the open workspace is; in Dev mode, the dev server too, whose local D1 answers instead (src/main/d1.ts). */
export function useD1Target(): D1Target | null {
  const { ws } = useShell();
  const { org } = useSession();
  const accountId = org?.cloudflare?.accountId;
  return React.useMemo(() => d1TargetFor(ws, accountId), [accountId, ws.worker, ws.id, ws.url, ws.dev]);
}
export function d1TargetFor(ws: Pick<WorkspaceSummary, "id" | "worker" | "url" | "dev">, accountId: string | undefined): D1Target | null {
  if (!ws.worker) return null;
  // in Dev the dev server's local D1 answers, so no account is needed (a workspace that lives only on this Mac has none)
  if (ws.dev && ws.url) return { accountId: accountId ?? "", worker: ws.worker, local: { ws: ws.id, url: ws.url } };
  if (!accountId) return null;
  return { accountId, worker: ws.worker };
}

const empty: Entry = { tables: null, loading: false };

/** The workspace's tables, read on first use. `tables` is null until the first answer. */
export function useSchema(target: D1Target | null): Entry & { refresh: () => Promise<DbTable[] | null> } {
  const key = target ? keyOf(target) : "";
  const entry = React.useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => store.get(key),
    () => store.get(key),
  );
  React.useEffect(() => {
    if (target && !store.get(key)) void refreshSchema(target);
  }, [key]);
  const refresh = React.useCallback(() => (target ? refreshSchema(target) : Promise.resolve(null)), [key]);
  return { ...(entry ?? (target ? { tables: null, loading: true } : empty)), refresh };
}

// ---- reading rows ----

export type FilterOp = "eq" | "ne" | "contains" | "starts" | "gt" | "gte" | "lt" | "lte" | "empty" | "notEmpty";
export type Filter = { id: string; column: string; op: FilterOp; value: string };
export const filterOps: { op: FilterOp; label: string; needsValue: boolean }[] = [
  { op: "eq", label: "is", needsValue: true },
  { op: "ne", label: "is not", needsValue: true },
  { op: "contains", label: "contains", needsValue: true },
  { op: "starts", label: "starts with", needsValue: true },
  { op: "gt", label: "greater than", needsValue: true },
  { op: "gte", label: "at least", needsValue: true },
  { op: "lt", label: "less than", needsValue: true },
  { op: "lte", label: "at most", needsValue: true },
  { op: "empty", label: "is empty", needsValue: false },
  { op: "notEmpty", label: "is not empty", needsValue: false },
];

export type RowQuery = { search: string; filters: Filter[]; sort: { id: string; desc: boolean } | null; offset: number; limit: number };
export type RowPage = { rows: GridRow[]; total: number; meta: D1Result["meta"] };

const esc = (s: string) => s.replace(/[\\%_]/g, (ch) => `\\${ch}`);

function where(table: DbTable, q: RowQuery): { sql: string; params: unknown[] } {
  const parts: string[] = [];
  const params: unknown[] = [];
  const search = q.search.trim();
  if (search && table.columns.length) {
    parts.push(`(${table.columns.map((c) => `CAST(${ident(c.name)} AS TEXT) LIKE ? ESCAPE '\\'`).join(" OR ")})`);
    for (const _ of table.columns) params.push(`%${esc(search)}%`);
  }
  for (const f of q.filters) {
    const col = table.columns.find((c) => c.name === f.column);
    if (!col) continue;
    const id = ident(col.name);
    const numeric = col.field.type === "number" || col.field.type === "checkbox";
    const v: unknown = numeric && f.value.trim() !== "" && Number.isFinite(Number(f.value)) ? Number(f.value) : f.value;
    switch (f.op) {
      case "eq": parts.push(`${id} IS ?`); params.push(v); break;
      case "ne": parts.push(`${id} IS NOT ?`); params.push(v); break;
      case "contains": parts.push(`CAST(${id} AS TEXT) LIKE ? ESCAPE '\\'`); params.push(`%${esc(f.value)}%`); break;
      case "starts": parts.push(`CAST(${id} AS TEXT) LIKE ? ESCAPE '\\'`); params.push(`${esc(f.value)}%`); break;
      case "gt": parts.push(`${id} > ?`); params.push(v); break;
      case "gte": parts.push(`${id} >= ?`); params.push(v); break;
      case "lt": parts.push(`${id} < ?`); params.push(v); break;
      case "lte": parts.push(`${id} <= ?`); params.push(v); break;
      case "empty": parts.push(`(${id} IS NULL OR ${id} = '')`); break;
      case "notEmpty": parts.push(`(${id} IS NOT NULL AND ${id} != '')`); break;
    }
  }
  return { sql: parts.length ? ` WHERE ${parts.join(" AND ")}` : "", params };
}

/** The row's key: its rowid, or its primary key's values as JSON on a table without rowid. */
export function rowKey(table: DbTable, row: Record<string, unknown>): string {
  if (!table.withoutRowid) return String(row[ROWID]);
  return JSON.stringify(table.pk.map((k) => row[k]));
}

function whereKey(table: DbTable, key: string): { sql: string; params: unknown[] } {
  if (!table.withoutRowid) return { sql: "rowid = ?", params: [Number(key)] };
  const values = JSON.parse(key) as unknown[];
  return { sql: `(${table.pk.map((k) => `${ident(k)} IS ?`).join(" AND ")})`, params: values };
}

/** A D1 value as the grid shows it: 0/1 become booleans on checkbox fields; the rest stays. */
function toGrid(table: DbTable, row: Record<string, unknown>): GridRow {
  const out: Record<string, unknown> = { ...row, [KEY]: rowKey(table, row) };
  for (const c of table.columns) if (c.field.type === "checkbox" && row[c.name] != null) out[c.name] = !!row[c.name];
  return out as GridRow;
}

/** A grid value as D1 stores it: booleans become 0/1; "" on a nullable column becomes NULL. */
export function toDb(col: Column, value: unknown): unknown {
  if (value === undefined) return null;
  if (col.field.type === "checkbox") return value ? 1 : 0;
  if (value === "" && !col.notNull) return null;
  if (col.field.type === "number" && typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  return value;
}

export async function readRows(target: D1Target, table: DbTable, q: RowQuery): Promise<RowPage> {
  const w = where(table, q);
  const sortCol = q.sort && table.columns.find((c) => c.name === q.sort!.id);
  const order = sortCol ? ` ORDER BY ${ident(sortCol.name)} ${q.sort!.desc ? "DESC" : "ASC"}` : table.withoutRowid ? "" : " ORDER BY rowid";
  const select = table.withoutRowid ? "*" : `rowid AS ${ident(ROWID)}, *`;
  const [page, count] = await Promise.all([
    run(target, `SELECT ${select} FROM ${ident(table.name)}${w.sql}${order} LIMIT ? OFFSET ?`, [...w.params, q.limit, q.offset]),
    run(target, `SELECT count(*) AS n FROM ${ident(table.name)}${w.sql}`, w.params),
  ]);
  return { rows: page.results.map((r) => toGrid(table, r)), total: Number((count.results[0] as { n?: number })?.n ?? 0), meta: page.meta };
}

// ---- changing rows ----

function need(table: DbTable, what: "rows" | "schema"): void {
  if (!allows(table, what)) throw new Error(what === "rows" ? `${table.name} is read only.` : `${table.name}'s columns are kept by ${table.group === "app" ? `the ${table.app} app` : "the workspace"}, not here.`);
}

export async function updateCell(target: D1Target, table: DbTable, key: string, column: string, value: unknown): Promise<void> {
  need(table, "rows");
  const col = table.columns.find((c) => c.name === column);
  if (!col) throw new Error(`No column ${column}.`);
  const k = whereKey(table, key);
  await run(target, `UPDATE ${ident(table.name)} SET ${ident(col.name)} = ? WHERE ${k.sql}`, [toDb(col, value), ...k.params]);
}

/** Writes several columns of one row at once, as the record drawer saves. */
export async function updateRow(target: D1Target, table: DbTable, key: string, values: Record<string, unknown>): Promise<void> {
  need(table, "rows");
  const cols = table.columns.filter((c) => c.name in values);
  if (!cols.length) return;
  const k = whereKey(table, key);
  await run(target, `UPDATE ${ident(table.name)} SET ${cols.map((c) => `${ident(c.name)} = ?`).join(", ")} WHERE ${k.sql}`, [...cols.map((c) => toDb(c, values[c.name])), ...k.params]);
}

/** Inserts a row from the columns given; the rest take their defaults. Returns the new row's key. */
export async function insertRow(target: D1Target, table: DbTable, values: Record<string, unknown>): Promise<string> {
  need(table, "rows");
  const cols = table.columns.filter((c) => c.name in values && values[c.name] !== undefined);
  const sql = cols.length ? `INSERT INTO ${ident(table.name)} (${cols.map((c) => ident(c.name)).join(", ")}) VALUES (${cols.map(() => "?").join(", ")})` : `INSERT INTO ${ident(table.name)} DEFAULT VALUES`;
  const r = await run(target, sql, cols.map((c) => toDb(c, values[c.name])));
  if (!table.withoutRowid) return String(r.meta.last_row_id);
  return JSON.stringify(table.pk.map((k) => toDb(table.columns.find((c) => c.name === k)!, values[k])));
}

export async function deleteRows(target: D1Target, table: DbTable, keys: string[]): Promise<void> {
  need(table, "rows");
  if (!keys.length) return;
  if (!table.withoutRowid) {
    await run(target, `DELETE FROM ${ident(table.name)} WHERE rowid IN (${keys.map(() => "?").join(", ")})`, keys.map(Number));
    return;
  }
  const parts = keys.map((k) => whereKey(table, k));
  await run(target, `DELETE FROM ${ident(table.name)} WHERE ${parts.map((p) => p.sql).join(" OR ")}`, parts.flatMap((p) => p.params));
}

// ---- changing the shape: custom tables only ----

const SQL_TYPES: Record<FieldType, string> = { text: "TEXT", number: "REAL", currency: "REAL", date: "TEXT", datetime: "TEXT", select: "TEXT", multiselect: "TEXT", person: "TEXT", record: "TEXT", email: "TEXT", url: "TEXT", phone: "TEXT", checkbox: "INTEGER NOT NULL DEFAULT 0", rating: "INTEGER", json: "TEXT NOT NULL DEFAULT '{}'" };


export async function addColumn(target: D1Target, table: DbTable, column: { name: string; type: FieldType }): Promise<void> {
  need(table, "schema");
  const name = toIdent(column.name);
  if (!isIdent(name)) throw new Error("A column name is letters, digits and underscores.");
  if (table.columns.some((c) => c.name === name)) throw new Error(`${table.name} already has a ${name} column.`);
  await run(target, `ALTER TABLE ${ident(table.name)} ADD COLUMN ${ident(name)} ${SQL_TYPES[column.type] ?? "TEXT"}`);
}

/** A new custom table: an id, a name, notes and a created time. Returns its name. */
export async function createTable(target: D1Target, tables: DbTable[], label: string): Promise<string> {
  const name = toIdent(label);
  if (!isIdent(name)) throw new Error("A table name is letters, digits and underscores.");
  if (reservedTableIds.has(name)) throw new Error(`${name} is a page of its own here; pick another name.`);
  if (groupOf(name).group !== "custom") throw new Error(`${name} is a name the workspace or an app keeps. Pick another.`);
  if (tables.some((t) => t.name === name)) throw new Error(`There is already a ${name} table.`);
  await run(target, `CREATE TABLE ${ident(name)} (id TEXT PRIMARY KEY, name TEXT, notes TEXT, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')))`);
  return name;
}

export async function dropTable(target: D1Target, table: DbTable): Promise<void> {
  need(table, "schema");
  await run(target, `DROP TABLE ${ident(table.name)}`);
}

// ---- the tools pages ----

export type LedgerRow = { app_id: string; name: string; applied_at: string };

export async function readLedger(target: D1Target): Promise<LedgerRow[]> {
  const r = await run(target, "SELECT app_id, name, applied_at FROM migrations_ledger ORDER BY applied_at, app_id, name").catch(() => ({ results: [] }));
  return r.results as LedgerRow[];
}

export async function readInfo(target: D1Target): Promise<D1Database> {
  if (!sg) throw new Error("The database opens inside the SuperGrid app.");
  return sg.d1.info(target).catch((e) => {
    throw new Error(clean(e));
  });
}

/** A short id for rows made here: 10 lowercase letters and digits, like a Stripe id without its prefix. */
export function shortId(size = 10): string {
  const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
  let out = "";
  while (out.length < size) {
    // 252 is the largest multiple of 36 under 256, so every character is as likely as the next
    for (const b of crypto.getRandomValues(new Uint8Array(size * 2))) if (b < 252 && out.length < size) out += alphabet[b % 36];
  }
  return out;
}

/** A new id the way the workspace makes them: 15 url-safe characters. */
export function newId(size = 15): string {
  const alphabet = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  let out = "";
  for (const b of bytes) out += alphabet[b & 63];
  return out;
}

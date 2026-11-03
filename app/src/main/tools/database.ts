import { groupLabels, ident, isIdent, modeLabels, reservedTableIds, toIdent, groupOf } from "../../shared/tables";
import { list, num, obj, requireDev, str, tabular, ToolError, type Json, type Tool, type ToolCtx } from "./index";
import { readTable, readTables, type Column, type Table } from "./schema";

// The database tools: every table in the workspace's D1, its rows, and changes to them. Reads are
// free. Adding rows is free up to a batch; updating and deleting always ask the user first, with a
// preview of what changes. System tables and `events` are read only. Changing the shape of a
// custom table, and running write SQL by hand, need Dev mode.

const MAX_ROWS = 200;
const FREE_INSERTS = 20;

type Where = { column: string; op: "eq" | "ne" | "contains" | "starts" | "gt" | "gte" | "lt" | "lte" | "empty" | "notEmpty" | "in"; value?: unknown };

const whereSchema = {
  type: "array",
  description: "Conditions, all of which must hold. Compare a column with eq, ne, contains, starts, gt, gte, lt, lte, in (value is a list), empty or notEmpty.",
  items: { type: "object", required: ["column", "op"], properties: { column: { type: "string" }, op: { enum: ["eq", "ne", "contains", "starts", "gt", "gte", "lt", "lte", "empty", "notEmpty", "in"] }, value: {} } },
};
const idsSchema = { type: "array", items: { type: "string" }, description: "Primary key values of the rows (the id column on most tables). Use this or where." };

const esc = (s: string) => s.replace(/[\\%_]/g, (ch) => `\\${ch}`);

function whereSql(table: Table, where: Where[], ids: string[]): { sql: string; params: unknown[] } {
  const parts: string[] = [];
  const params: unknown[] = [];
  if (ids.length) {
    const key = table.pk.length === 1 ? table.pk[0]! : table.withoutRowid ? null : "rowid";
    if (!key) throw new ToolError(`${table.name} has a compound key (${table.pk.join(", ")}); use where instead of ids.`);
    parts.push(`${ident(key)} IN (${ids.map(() => "?").join(", ")})`);
    params.push(...ids);
  }
  for (const w of where) {
    const col = table.columns.find((c) => c.name === w.column);
    if (!col) throw new ToolError(`${table.name} has no column ${w.column}. Columns: ${table.columns.map((c) => c.name).join(", ")}.`);
    const id = ident(col.name);
    switch (w.op) {
      case "eq": parts.push(`${id} IS ?`); params.push(w.value ?? null); break;
      case "ne": parts.push(`${id} IS NOT ?`); params.push(w.value ?? null); break;
      case "contains": parts.push(`CAST(${id} AS TEXT) LIKE ? ESCAPE '\\'`); params.push(`%${esc(String(w.value ?? ""))}%`); break;
      case "starts": parts.push(`CAST(${id} AS TEXT) LIKE ? ESCAPE '\\'`); params.push(`${esc(String(w.value ?? ""))}%`); break;
      case "gt": parts.push(`${id} > ?`); params.push(w.value); break;
      case "gte": parts.push(`${id} >= ?`); params.push(w.value); break;
      case "lt": parts.push(`${id} < ?`); params.push(w.value); break;
      case "lte": parts.push(`${id} <= ?`); params.push(w.value); break;
      case "empty": parts.push(`(${id} IS NULL OR ${id} = '')`); break;
      case "notEmpty": parts.push(`(${id} IS NOT NULL AND ${id} != '')`); break;
      case "in": {
        const vals = Array.isArray(w.value) ? w.value : [w.value];
        parts.push(`${id} IN (${vals.map(() => "?").join(", ")})`);
        params.push(...vals);
        break;
      }
      default: throw new ToolError(`Unknown op ${String((w as { op: string }).op)}.`);
    }
  }
  return { sql: parts.length ? ` WHERE ${parts.join(" AND ")}` : "", params };
}

const describe = (t: Table) => ({
  table: t.name,
  label: t.label,
  group: t.group === "app" ? `app:${t.app}` : t.group,
  access: t.mode === "locked" ? "read only" : t.mode === "crud" ? "rows editable, columns fixed" : "rows and columns editable (Dev mode for columns)",
  rows: t.count,
  primaryKey: t.pk,
  columns: t.columns.map((c) => `${c.name} ${c.type || "ANY"}${c.pk ? " PK" : ""}${c.notNull ? " NOT NULL" : ""}${c.dflt !== null ? ` DEFAULT ${c.dflt}` : ""}`),
});

/** A value as D1 stores it: booleans to 0/1, objects to JSON. */
function toDb(col: Column, v: unknown): unknown {
  if (v === undefined) return null;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (v !== null && typeof v === "object") return JSON.stringify(v);
  if (v === "" && !col.notNull) return null;
  return v;
}

function writable(table: Table): void {
  if (table.mode === "locked") throw new ToolError(`${table.name} is read only${table.name === "events" ? ": events are recorded by the workspace as they happen" : ": it is the workspace's own bookkeeping"}.`);
}

async function affected(ctx: ToolCtx, table: Table, w: { sql: string; params: unknown[] }): Promise<{ total: number; preview: { columns: string[]; rows: unknown[][]; total: number } }> {
  const total = Number((await ctx.query(`SELECT count(*) AS n FROM ${ident(table.name)}${w.sql}`, w.params)).results[0]?.n ?? 0);
  const rows = total ? (await ctx.query(`SELECT * FROM ${ident(table.name)}${w.sql} LIMIT 8`, w.params)).results : [];
  const cols = table.columns.map((c) => c.name).slice(0, 8);
  return { total, preview: { ...tabular(rows, cols, 8), total } };
}

/** SQL the agent may run freely: one SELECT (or WITH, EXPLAIN, PRAGMA), nothing after it. */
function readOnly(sql: string): string {
  const s = sql.trim().replace(/;\s*$/, "");
  if (/;/.test(s)) throw new ToolError("One statement at a time.");
  if (!/^(select|with|explain|pragma)\b/i.test(s)) throw new ToolError("db_query runs SELECT only. Use db_insert, db_update and db_delete to change rows, or db_execute in Dev mode.");
  return s;
}

export const databaseTools: Tool[] = [
  {
    name: "db_tables",
    description: "Every table in the workspace's database with its group (core, an app, custom, system), what may be done to it, its columns and its row count. Start here before reading or changing rows.",
    inputSchema: { type: "object", properties: { group: { enum: ["core", "app", "custom", "system"], description: "Only one group." } } },
    run: async (ctx, { group }) => {
      const tables = await readTables(ctx);
      const shown = group ? tables.filter((t) => t.group === group) : tables;
      ctx.widget({ type: "rows", title: "Tables", columns: ["table", "group", "access", "rows"], rows: shown.map((t) => [t.name, t.group === "app" ? `App · ${t.app}` : groupLabels[t.group], modeLabels[t.mode], t.count]), total: shown.length });
      return shown.map(describe);
    },
  },
  {
    name: "db_describe",
    description: "One table in full: columns with types, keys and defaults, and its CREATE statement.",
    inputSchema: { type: "object", required: ["table"], properties: { table: { type: "string" } } },
    run: async (ctx, { table }) => {
      const t = await readTable(ctx, str(table, "table"));
      return { ...describe(t), sql: t.sql };
    },
  },
  {
    name: "db_rows",
    description: "Rows of a table: search across every column, filter with where, sort, page. Shows them as a table in the chat.",
    inputSchema: {
      type: "object",
      required: ["table"],
      properties: {
        table: { type: "string" },
        search: { type: "string", description: "Text to find in any column." },
        where: whereSchema,
        ids: idsSchema,
        columns: { type: "array", items: { type: "string" }, description: "Only these columns (default all)." },
        sort: { type: "string", description: "A column name, with a leading - for descending." },
        limit: { type: "integer", minimum: 1, maximum: MAX_ROWS, default: 25 },
        offset: { type: "integer", minimum: 0, default: 0 },
      },
    },
    run: async (ctx, args) => {
      const t = await readTable(ctx, str(args.table, "table"));
      const where = list<Where>(args.where, "where", { optional: true });
      const ids = list<string>(args.ids, "ids", { optional: true, max: 500 }).map(String);
      const search = str(args.search, "search", { optional: true }).trim();
      const w = whereSql(t, where, ids);
      if (search && t.columns.length) {
        const like = `(${t.columns.map((c) => `CAST(${ident(c.name)} AS TEXT) LIKE ? ESCAPE '\\'`).join(" OR ")})`;
        w.sql = w.sql ? `${w.sql} AND ${like}` : ` WHERE ${like}`;
        w.params.push(...t.columns.map(() => `%${esc(search)}%`));
      }
      const limit = num(args.limit, "limit", { min: 1, max: MAX_ROWS, dflt: 25 });
      const offset = num(args.offset, "offset", { min: 0, dflt: 0 });
      const sortRaw = str(args.sort, "sort", { optional: true });
      const desc = sortRaw.startsWith("-");
      const sortCol = sortRaw ? t.columns.find((c) => c.name === sortRaw.replace(/^-/, "")) : undefined;
      if (sortRaw && !sortCol) throw new ToolError(`No column ${sortRaw.replace(/^-/, "")} to sort by.`);
      const wanted = list<string>(args.columns, "columns", { optional: true });
      const cols = wanted.length ? t.columns.filter((c) => wanted.includes(c.name)) : t.columns;
      if (wanted.length && !cols.length) throw new ToolError(`None of those columns exist on ${t.name}.`);
      const select = cols.map((c) => ident(c.name)).join(", ") || "*";
      const order = sortCol ? ` ORDER BY ${ident(sortCol.name)} ${desc ? "DESC" : "ASC"}` : t.withoutRowid ? "" : " ORDER BY rowid DESC";
      const [page, count] = await Promise.all([ctx.query(`SELECT ${select} FROM ${ident(t.name)}${w.sql}${order} LIMIT ? OFFSET ?`, [...w.params, limit, offset]), ctx.query(`SELECT count(*) AS n FROM ${ident(t.name)}${w.sql}`, w.params)]);
      const total = Number((count.results[0] as { n?: number })?.n ?? 0);
      ctx.widget({ type: "rows", title: t.label, ...tabular(page.results, cols.map((c) => c.name), limit), total });
      return { table: t.name, total, offset, rows: page.results };
    },
  },
  {
    name: "db_query",
    description: "Run a read-only SQL statement (SELECT, WITH, EXPLAIN, PRAGMA) against the workspace's database, with ? placeholders bound from params. For aggregates, joins and anything db_rows can't express. Rows are capped at 200.",
    inputSchema: { type: "object", required: ["sql"], properties: { sql: { type: "string" }, params: { type: "array", items: {} }, title: { type: "string", description: "What the result shows, for its card in the chat." } } },
    run: async (ctx, { sql, params, title }) => {
      const s = readOnly(str(sql, "sql"));
      const capped = /^(select|with)\b/i.test(s) && !/\blimit\b/i.test(s) ? `${s} LIMIT ${MAX_ROWS}` : s;
      const r = await ctx.raw(capped, list(params, "params", { optional: true, max: 100 }));
      const rows = r.rows.slice(0, MAX_ROWS);
      const label = str(title, "title", { optional: true }) || "Query";
      if (r.columns.length === 1 && rows.length === 1 && typeof rows[0]![0] === "number") ctx.widget({ type: "metric", label, value: rows[0]![0] as number, hint: r.columns[0] });
      else ctx.widget({ type: "rows", title: label, columns: r.columns, rows: rows.slice(0, 50), total: rows.length });
      return { columns: r.columns, rows, rowsRead: r.meta.rows_read, ms: r.meta.duration };
    },
  },
  {
    name: "db_insert",
    description: "Add rows to a table: one object of column values, or a list of them (up to 100). Columns left out take their defaults. More than 20 rows at once asks the user first. Not for events or system tables.",
    inputSchema: { type: "object", required: ["table", "rows"], properties: { table: { type: "string" }, rows: { description: "An object, or a list of objects, keyed by column.", oneOf: [{ type: "object" }, { type: "array", items: { type: "object" }, maxItems: 100 }] } } },
    run: async (ctx, args) => {
      const t = await readTable(ctx, str(args.table, "table"));
      writable(t);
      const rows = (Array.isArray(args.rows) ? args.rows : [args.rows]).map((r, i) => obj(r, `rows[${i}]`));
      if (!rows.length) throw new ToolError("Nothing to insert.");
      if (rows.length > 100) throw new ToolError("Up to 100 rows at once.");
      for (const r of rows) for (const k of Object.keys(r)) if (!t.columns.some((c) => c.name === k)) throw new ToolError(`${t.name} has no column ${k}. Columns: ${t.columns.map((c) => c.name).join(", ")}.`);
      if (rows.length > FREE_INSERTS) {
        const a = await ctx.ask({ kind: "confirm", title: `Add ${rows.length} rows to ${t.label}?`, preview: { ...tabular(rows, undefined, 8), total: rows.length }, confirmLabel: `Add ${rows.length} Rows` });
        if (!a.ok) return `The user declined adding ${rows.length} rows to ${t.name}.${a.note ? ` They said: ${a.note}` : ""}`;
      }
      const keys: unknown[] = [];
      for (const r of rows) {
        const cols = t.columns.filter((c) => c.name in r);
        const sql = cols.length ? `INSERT INTO ${ident(t.name)} (${cols.map((c) => ident(c.name)).join(", ")}) VALUES (${cols.map(() => "?").join(", ")})` : `INSERT INTO ${ident(t.name)} DEFAULT VALUES`;
        const res = await ctx.query(sql, cols.map((c) => toDb(c, r[c.name])));
        keys.push(t.pk.length === 1 && t.pk[0]! in r ? r[t.pk[0]!] : res.meta.last_row_id);
      }
      ctx.widget({ type: "note", text: `Added ${rows.length} ${rows.length === 1 ? "row" : "rows"} to ${t.label}.` });
      return { inserted: rows.length, keys };
    },
  },
  {
    name: "db_update",
    description: "Change columns on the rows that match ids or where. Always shows the user which rows change and waits for their approval. Not for events or system tables.",
    inputSchema: { type: "object", required: ["table", "set"], properties: { table: { type: "string" }, set: { type: "object", description: "The new values, keyed by column." }, ids: idsSchema, where: whereSchema } },
    run: async (ctx, args) => {
      const t = await readTable(ctx, str(args.table, "table"));
      writable(t);
      const set = obj(args.set, "set");
      const cols = t.columns.filter((c) => c.name in set);
      if (!cols.length) throw new ToolError("set names no column of this table.");
      const w = whereSql(t, list<Where>(args.where, "where", { optional: true }), list<string>(args.ids, "ids", { optional: true, max: 500 }).map(String));
      if (!w.sql) throw new ToolError("Give ids or where: an update needs to say which rows. To change every row, pass where: [{column: <pk>, op: notEmpty}].");
      const { total, preview } = await affected(ctx, t, w);
      if (!total) return `No rows of ${t.name} match.`;
      const detail = cols.map((c) => `${c.name} → ${JSON.stringify(set[c.name])}`).join("\n");
      const a = await ctx.ask({ kind: "confirm", title: `Update ${total} ${total === 1 ? "row" : "rows"} in ${t.label}?`, detail, preview, confirmLabel: "Update" });
      if (!a.ok) return `The user declined the update of ${total} rows in ${t.name}.${a.note ? ` They said: ${a.note}` : ""}`;
      const r = await ctx.query(`UPDATE ${ident(t.name)} SET ${cols.map((c) => `${ident(c.name)} = ?`).join(", ")}${w.sql}`, [...cols.map((c) => toDb(c, set[c.name])), ...w.params]);
      ctx.widget({ type: "note", text: `Updated ${r.meta.changes} ${r.meta.changes === 1 ? "row" : "rows"} in ${t.label}.` });
      return { updated: r.meta.changes };
    },
  },
  {
    name: "db_delete",
    description: "Delete the rows that match ids or where. Always shows the user the rows and waits for their approval. Not for events or system tables.",
    inputSchema: { type: "object", required: ["table"], properties: { table: { type: "string" }, ids: idsSchema, where: whereSchema } },
    run: async (ctx, args) => {
      const t = await readTable(ctx, str(args.table, "table"));
      writable(t);
      const w = whereSql(t, list<Where>(args.where, "where", { optional: true }), list<string>(args.ids, "ids", { optional: true, max: 500 }).map(String));
      if (!w.sql) throw new ToolError("Give ids or where: a delete needs to say which rows.");
      const { total, preview } = await affected(ctx, t, w);
      if (!total) return `No rows of ${t.name} match.`;
      const a = await ctx.ask({ kind: "confirm", title: `Delete ${total} ${total === 1 ? "row" : "rows"} from ${t.label}?`, detail: "This cannot be undone here. Backups can restore the database to an earlier point.", preview, danger: true, confirmLabel: "Delete" });
      if (!a.ok) return `The user declined deleting ${total} rows from ${t.name}.${a.note ? ` They said: ${a.note}` : ""}`;
      const r = await ctx.query(`DELETE FROM ${ident(t.name)}${w.sql}`, w.params);
      ctx.widget({ type: "note", text: `Deleted ${r.meta.changes} ${r.meta.changes === 1 ? "row" : "rows"} from ${t.label}.` });
      return { deleted: r.meta.changes };
    },
  },
  {
    name: "db_execute",
    description: "Dev mode: run any SQL statement (INSERT, UPDATE, DELETE, CREATE, ALTER, DROP) after the user approves it. For what the row tools can't do.",
    inputSchema: { type: "object", required: ["sql"], properties: { sql: { type: "string" }, params: { type: "array", items: {} } } },
    dev: true,
    run: async (ctx, { sql, params }) => {
      requireDev(ctx, "Running SQL by hand");
      const s = str(sql, "sql").trim();
      const a = await ctx.ask({ kind: "confirm", title: "Run this SQL?", detail: s, danger: /^\s*(drop|delete|truncate)\b/i.test(s), confirmLabel: "Run" });
      if (!a.ok) return `The user declined running the statement.${a.note ? ` They said: ${a.note}` : ""}`;
      const r = await ctx.raw(s, list(params, "params", { optional: true, max: 100 }));
      return { columns: r.columns, rows: r.rows.slice(0, MAX_ROWS), changes: r.meta.changes, ms: r.meta.duration };
    },
  },
  {
    name: "db_create_table",
    description: "Dev mode: a new custom table with an id, a name, notes, a created time, and the columns given. Custom tables are the user's own; apps can read them.",
    inputSchema: { type: "object", required: ["name"], properties: { name: { type: "string" }, columns: { type: "array", items: { type: "object", required: ["name"], properties: { name: { type: "string" }, type: { enum: ["text", "number", "checkbox", "datetime", "json"] } } } } } },
    dev: true,
    run: async (ctx, args) => {
      requireDev(ctx, "Creating a table");
      const name = toIdent(str(args.name, "name"));
      if (!isIdent(name)) throw new ToolError("A table name is letters, digits and underscores.");
      if (reservedTableIds.has(name) || groupOf(name).group !== "custom") throw new ToolError(`${name} is a name the workspace or an app keeps. Pick another.`);
      const tables = await readTables(ctx, false);
      if (tables.some((t) => t.name === name)) throw new ToolError(`There is already a ${name} table.`);
      const types: Record<string, string> = { text: "TEXT", number: "REAL", checkbox: "INTEGER NOT NULL DEFAULT 0", datetime: "TEXT", json: "TEXT NOT NULL DEFAULT '{}'" };
      const extra = list<Json>(args.columns, "columns", { optional: true, max: 40 }).map((c) => {
        const n = toIdent(str(c.name, "column name"));
        if (!isIdent(n) || ["id", "name", "notes", "created_at"].includes(n)) throw new ToolError(`Column ${n} is not allowed.`);
        return `${ident(n)} ${types[String(c.type ?? "text")] ?? "TEXT"}`;
      });
      const sql = `CREATE TABLE ${ident(name)} (id TEXT PRIMARY KEY, name TEXT, notes TEXT, created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))${extra.map((e) => `, ${e}`).join("")})`;
      const a = await ctx.ask({ kind: "confirm", title: `Create the ${name} table?`, detail: sql, confirmLabel: "Create" });
      if (!a.ok) return `The user declined creating ${name}.`;
      await ctx.query(sql);
      ctx.navigate(`database/${name}`);
      return { created: name, sql };
    },
  },
  {
    name: "db_add_column",
    description: "Dev mode: add a column to a custom table.",
    inputSchema: { type: "object", required: ["table", "name"], properties: { table: { type: "string" }, name: { type: "string" }, type: { enum: ["text", "number", "checkbox", "datetime", "json"], default: "text" } } },
    dev: true,
    run: async (ctx, args) => {
      requireDev(ctx, "Adding a column");
      const t = await readTable(ctx, str(args.table, "table"));
      if (t.mode !== "custom") throw new ToolError(`${t.name}'s columns are kept by ${t.group === "app" ? `the ${t.app} app` : "the workspace"}, not here.`);
      const name = toIdent(str(args.name, "name"));
      if (!isIdent(name)) throw new ToolError("A column name is letters, digits and underscores.");
      if (t.columns.some((c) => c.name === name)) throw new ToolError(`${t.name} already has a ${name} column.`);
      const types: Record<string, string> = { text: "TEXT", number: "REAL", checkbox: "INTEGER NOT NULL DEFAULT 0", datetime: "TEXT", json: "TEXT NOT NULL DEFAULT '{}'" };
      await ctx.query(`ALTER TABLE ${ident(t.name)} ADD COLUMN ${ident(name)} ${types[String(args.type ?? "text")] ?? "TEXT"}`);
      return { table: t.name, added: name };
    },
  },
  {
    name: "db_drop_table",
    description: "Dev mode: drop a custom table and everything in it, after the user approves.",
    inputSchema: { type: "object", required: ["table"], properties: { table: { type: "string" } } },
    dev: true,
    run: async (ctx, args) => {
      requireDev(ctx, "Dropping a table");
      const t = await readTable(ctx, str(args.table, "table"));
      if (t.mode !== "custom") throw new ToolError(`${t.name} belongs to ${t.group === "app" ? `the ${t.app} app` : "the workspace"} and can't be dropped here.`);
      const a = await ctx.ask({ kind: "confirm", title: `Drop the ${t.name} table?`, detail: `${t.count ?? "Its"} rows go with it. This cannot be undone here.`, danger: true, confirmLabel: "Drop Table" });
      if (!a.ok) return `The user kept ${t.name}.`;
      await ctx.query(`DROP TABLE ${ident(t.name)}`);
      return { dropped: t.name };
    },
  },
];

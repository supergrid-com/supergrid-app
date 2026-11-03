import { groupOf, ident, modeOf, tableLabel, type TableGroup, type TableMode } from "../../shared/tables";
import type { ToolCtx } from "./index";

// The workspace's tables as the agent's database tools see them: the same reading of sqlite_master
// and PRAGMA table_info the Database pages do (renderer lib/db.ts), with the same groups and rules.

export type Column = { name: string; type: string; notNull: boolean; dflt: string | null; pk: number };
export type Table = { name: string; label: string; group: TableGroup; app?: string; mode: TableMode; columns: Column[]; pk: string[]; withoutRowid: boolean; virtual: boolean; sql: string; count: number | null };

type MasterRow = { type: string; name: string; tbl_name: string; sql: string | null };
type PragmaRow = { cid: number; name: string; type: string; notnull: number; dflt_value: string | null; pk: number };

export async function readTables(ctx: ToolCtx, withCounts = true): Promise<Table[]> {
  const master = (await ctx.query("SELECT type, name, tbl_name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '\\_cf\\_%' ESCAPE '\\' ORDER BY name")).results as MasterRow[];
  const plain = master.filter((t) => !/^\s*CREATE\s+VIRTUAL/i.test(t.sql ?? ""));
  const infos = new Map<string, PragmaRow[]>();
  if (plain.length) {
    const script = await ctx.raw(plain.map((t) => `PRAGMA table_info(${ident(t.name)})`).join(";\n"));
    plain.forEach((t, i) => {
      const a = script.all[i];
      if (a) infos.set(t.name, a.rows.map((r) => Object.fromEntries(a.columns.map((c, j) => [c, r[j]])) as PragmaRow));
    });
  }
  const out = master.map((t): Table => {
    const { group, app } = groupOf(t.name);
    const virtual = !plain.includes(t);
    const cols = (infos.get(t.name) ?? []).map((c) => ({ name: c.name, type: c.type ?? "", notNull: !!c.notnull, dflt: c.dflt_value ?? null, pk: c.pk }));
    const pk = cols.filter((c) => c.pk > 0).sort((a, b) => a.pk - b.pk).map((c) => c.name);
    return { name: t.name, label: tableLabel({ name: t.name, group, app }), group, app, mode: virtual ? "locked" : modeOf(t.name, group), columns: cols, pk, withoutRowid: /WITHOUT\s+ROWID\s*;?\s*$/i.test(t.sql ?? ""), virtual, sql: t.sql ?? "", count: null };
  });
  if (withCounts) {
    // one count per statement: D1 caps the terms of a compound SELECT well under a workspace's table count
    const countable = out.filter((t) => !t.virtual);
    if (countable.length) {
      const script = await ctx.raw(countable.map((t) => `SELECT count(*) AS n FROM ${ident(t.name)}`).join(";\n")).catch(() => null);
      countable.forEach((t, i) => {
        const n = script?.all[i]?.rows[0]?.[0];
        t.count = typeof n === "number" ? n : null;
      });
    }
  }
  const order: Record<TableGroup, number> = { core: 0, app: 1, custom: 2, system: 3 };
  return out.sort((a, b) => order[a.group] - order[b.group] || (a.app ?? "").localeCompare(b.app ?? "") || a.name.localeCompare(b.name));
}

export async function readTable(ctx: ToolCtx, name: string): Promise<Table> {
  const tables = await readTables(ctx, false);
  const t = tables.find((x) => x.name === name) ?? tables.find((x) => x.label.toLowerCase() === name.toLowerCase());
  if (!t) throw new Error(`There is no ${name} table. db_tables lists them.`);
  return t;
}

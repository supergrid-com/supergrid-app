// Which tables in a workspace's database are which, and what may be done to each. Shared by the
// Database pages (renderer lib/db.ts) and the agent's database tools (main/tools/database.ts), so
// the two never disagree about what is editable.
//
// Core and app tables have a shape their owner keeps (the workspace release, the app's migrations),
// so rows change but never columns; system tables are the workspace's own bookkeeping and are read
// only; custom tables are the user's, made in the app, and take everything. `events` is core but
// written only by real events: the pages and the agent read it, never write it.

export type TableGroup = "core" | "app" | "custom" | "system";
/** `custom` everything, `crud` rows only (no schema changes), `locked` read only. */
export type TableMode = "custom" | "crud" | "locked";

export const SYSTEM_TABLES = new Set(["migrations_ledger", "settings", "apps", "secrets", "hooks", "hook_runs", "hook_run_steps", "workflows", "event_deliveries", "dead_letters", "rollups_daily", "identities", "themes", "assets", "asset_tags", "contact_fields", "object_types", "d1_migrations"]);
export const CORE_TABLES = ["contacts", "contact_tags", "segments", "segment_members", "events"];
/** Tables only the workspace itself writes, whatever their group: a row added by hand would be a lie. */
export const EVENT_ONLY_TABLES = new Set(["events"]);
const APP = /^app_([a-z0-9]+)_/;

export function groupOf(name: string): { group: TableGroup; app?: string } {
  if (SYSTEM_TABLES.has(name) || name.startsWith("sqlite_") || name.startsWith("_cf_")) return { group: "system" };
  if (CORE_TABLES.includes(name) || name.startsWith("obj_")) return { group: "core" };
  const m = APP.exec(name);
  if (m) return { group: "app", app: m[1] };
  return { group: "custom" };
}

const modeOfGroup: Record<TableGroup, TableMode> = { system: "locked", core: "crud", app: "crud", custom: "custom" };

/** What a table allows, by its name alone. */
export function modeOf(name: string, group: TableGroup = groupOf(name).group): TableMode {
  if (EVENT_ONLY_TABLES.has(name)) return "locked";
  return modeOfGroup[group];
}

export const groupLabels: Record<TableGroup, string> = { core: "Core", app: "Apps", custom: "Custom", system: "System" };
export const modeLabels: Record<TableMode, string> = { custom: "Custom", crud: "Editable", locked: "Read Only" };

/** Paths under database/ that are pages of their own, not tables. */
export const reservedTableIds = new Set(["query", "migrations", "backups"]);

/** A table's name for people: contacts → Contacts, contact_tags → Contact Tags, app_hello_posts → Posts, obj_testimonials → Testimonials. */
export function tableLabel(t: { name: string; group: TableGroup; app?: string }): string {
  let n = t.name;
  if (t.group === "app" && t.app) n = n.slice(`app_${t.app}_`.length) || n;
  else if (n.startsWith("obj_")) n = n.slice(4);
  return n
    .split("_")
    .filter(Boolean)
    .map((w) => (w === "id" ? "ID" : w === "url" ? "URL" : w === "utm" ? "UTM" : w[0]!.toUpperCase() + w.slice(1)))
    .join(" ");
}

/** What one row and many rows of a table are called: contacts → contact, contacts; contact_tags → contact tag, contact tags. */
export function tableNoun(t: { name: string; group: TableGroup; app?: string }): { one: string; many: string } {
  const many = tableLabel(t).toLowerCase();
  const one = many.endsWith("ies") ? `${many.slice(0, -3)}y` : many.endsWith("ses") || many.endsWith("xes") ? many.slice(0, -2) : many.endsWith("s") && !many.endsWith("ss") ? many.slice(0, -1) : many;
  return { one, many };
}

export const isIdent = (s: string): boolean => /^[a-z_][a-z0-9_]*$/.test(s);
export const toIdent = (s: string): string => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").replace(/^(\d)/, "_$1");
/** A quoted SQL identifier. */
export const ident = (s: string): string => `"${s.replace(/"/g, '""')}"`;

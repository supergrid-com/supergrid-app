// The data declaration, put to work: the SQL for an entity's table (the first migration writes itself), the shape
// the agent and the Database pages read (describeData), and the column each field type maps to. Migrations stay
// the source of the physical schema; this is how the declaration and the schema start out agreeing.
import { type Entity, type Field, type FieldType, type Manifest, parseManifest, type AppManifest } from "./manifest";
import type { Migration } from "./rpc";

/** The D1 column a field type becomes. */
export const COLUMN: Record<FieldType, string> = {
  id: "TEXT PRIMARY KEY",
  string: "TEXT",
  slug: "TEXT",
  text: "TEXT",
  number: "REAL",
  integer: "INTEGER",
  boolean: "INTEGER",
  datetime: "TEXT",
  json: "TEXT",
  ref: "TEXT",
  enum: "TEXT",
  media: "TEXT",
};

const refTable = (m: Manifest, to: string): string | null => {
  const [app, entity] = to.split(".") as [string, string];
  if (app === "core") return entity === "contact" ? "contacts" : null;
  if (app === m.id) return m.entities[entity]?.table ?? null;
  return `app_${app.replace(/-/g, "_")}_${entity}`;
};

function columnSql(m: Manifest, key: string, f: Field): string {
  const type = COLUMN[f.type as FieldType] ?? "TEXT";
  const parts = [key, type];
  if (f.type === "id") return parts.join(" ");
  if (f.required) parts.push("NOT NULL");
  if (f.unique) parts.push("UNIQUE");
  if (f.default !== undefined) parts.push(`DEFAULT ${f.default}`);
  else if (f.type === "datetime" && (key === "created_at" || key === "updated_at")) parts.push("NOT NULL DEFAULT (datetime('now'))");
  else if (f.type === "boolean") parts.push("NOT NULL DEFAULT 0");
  else if (f.type === "json") parts.push("NOT NULL DEFAULT '{}'");
  if (f.type === "ref" && f.to) {
    const table = refTable(m, f.to);
    if (table) parts.push(`REFERENCES ${table}(id) ON DELETE ${(f.onDelete ?? "set null").toUpperCase()}`);
  }
  return parts.join(" ");
}

/** CREATE TABLE and its indexes for one entity: refs and unique slugs get an index, `created_at` too. */
export function createTableSql(m: Manifest, entityKey: string): string {
  const e = m.entities[entityKey];
  if (!e) throw new Error(`No entity "${entityKey}" in ${m.id}`);
  const cols = Object.entries(e.fields).map(([k, f]) => columnSql(m, k, f));
  const indexes = Object.entries(e.fields)
    .filter(([k, f]) => (f.type === "ref" || f.type === "slug" || k === "created_at") && !f.unique && f.type !== "id")
    .map(([k]) => `CREATE INDEX IF NOT EXISTS ${e.table}_${k} ON ${e.table}(${k});`);
  return [`CREATE TABLE IF NOT EXISTS ${e.table} (${cols.join(", ")});`, ...indexes].join("\n");
}

/** One migration that creates every declared table, for an app's first migration. Name it `0001_init`. */
export function initialMigration(manifest: AppManifest | Manifest, name = "0001_init"): Migration {
  const m = "entities" in manifest ? manifest : parseManifest(manifest);
  return { name, sql: Object.keys(m.entities).map((k) => createTableSql(m, k)).join("\n") };
}

/** An entity as the served manifest and the agent see it: the key, its table, the fields in order, where rows live. */
export type EntityDescription = Entity & { key: string; table: string; plural: string; title: string; columns: { key: string; type: string; label: string; required: boolean; to?: string; values?: string[] }[] };
export function describeData(m: Manifest): EntityDescription[] {
  return Object.values(m.entities).map((e) => ({
    ...e,
    columns: Object.entries(e.fields).map(([key, f]) => ({ key, type: f.type, label: f.label ?? key.replace(/_/g, " "), required: !!f.required || f.type === "id", ...(f.to ? { to: f.to } : {}), ...(f.values ? { values: f.values } : {}) })),
  }));
}

/** A row's title, by the entity's title field. */
export const rowTitle = (e: Pick<Entity, "title"> & { title: string }, row: Record<string, unknown>): string => String(row[e.title] ?? row.id ?? "");

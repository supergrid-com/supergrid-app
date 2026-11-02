// Custom objects: a type is a field list; each type gets its own table with a JSON doc and indexes on the fields marked for it.
// Users define types from the UI, apps register them from code; both go through saveObjectType.
import type { FieldDef, ObjectInput, ObjectPage, ObjectQuery, ObjectRow, ObjectType, ObjectTypeInput } from "@supergrid/app-kit/rpc";
import { coerce } from "./contacts";
import { nid, now } from "./ids";
import { publish } from "./events";
import type { Env } from "./types";
import { fieldDef, int, invalid, list, obj, oneOf, opt, SLUG, str, strings, whenList, whenSql } from "./validate";

type TypeRow = { id: string; label: string; plural: string; title_field: string; fields: string; app_id: string | null; version: number; created_at: string; updated_at: string };
type Row = { id: string; contact_id: string | null; rev: number; doc: string; created_at: string; updated_at: string };
const MAX_DOC = 500_000;

export const tableOf = (type: string) => `obj_${type}`;
const extract = (key: string) => `json_extract(doc, '$.${key}')`;
const typeOf = (r: TypeRow): ObjectType => ({ ...r, fields: JSON.parse(r.fields || "[]") });
const hydrate = (type: string, r: Row): ObjectRow => ({ id: r.id, type, contact_id: r.contact_id, rev: r.rev, doc: JSON.parse(r.doc || "{}"), created_at: r.created_at, updated_at: r.updated_at });

export const listObjectTypes = async (db: D1Database) => (await db.prepare("SELECT * FROM object_types ORDER BY label").all<TypeRow>()).results.map(typeOf);
export async function getType(db: D1Database, id: string): Promise<ObjectType> {
  const row = await db.prepare("SELECT * FROM object_types WHERE id = ?").bind(str(id, "type", { re: SLUG })).first<TypeRow>();
  if (!row) invalid(`unknown object type ${id}`);
  return typeOf(row!);
}

/** Idempotent DDL; adding an index to a large type writes one row per record. */
function ddl(db: D1Database, type: string, fields: FieldDef[]): D1PreparedStatement[] {
  const t = tableOf(type);
  return [
    db.prepare(`CREATE TABLE IF NOT EXISTS ${t} (id TEXT PRIMARY KEY, contact_id TEXT REFERENCES contacts(id) ON DELETE SET NULL, rev INTEGER NOT NULL DEFAULT 1, doc TEXT NOT NULL CHECK (json_valid(doc)), created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS ${t}__contact ON ${t}(contact_id, created_at)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS ${t}__updated ON ${t}(updated_at)`),
    ...fields.filter((f) => f.indexed).map((f) => db.prepare(`CREATE INDEX IF NOT EXISTS ${t}__${f.key} ON ${t}(${extract(f.key)})`)),
  ];
}

export async function saveObjectType(db: D1Database, appId: string | null, input: ObjectTypeInput): Promise<ObjectType> {
  const id = str(input.id, "id", { re: SLUG });
  const fields = list(input.fields, "fields", 60).map(fieldDef);
  if (new Set(fields.map((f) => f.key)).size !== fields.length) invalid("duplicate field keys");
  const label = str(input.label, "label", { max: 60 });
  const title = opt(input.title_field, "title_field") ?? fields[0]?.key ?? "name";
  const existing = await db.prepare("SELECT app_id, version FROM object_types WHERE id = ?").bind(id).first<{ app_id: string | null; version: number }>();
  if (existing && existing.app_id && existing.app_id !== appId) invalid(`object type ${id} belongs to ${existing.app_id}`);
  await db.batch([
    ...ddl(db, id, fields),
    db.prepare(`INSERT INTO object_types (id, label, plural, title_field, fields, app_id, version, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)
      ON CONFLICT(id) DO UPDATE SET label = excluded.label, plural = excluded.plural, title_field = excluded.title_field, fields = excluded.fields, version = object_types.version + 1, updated_at = excluded.updated_at`)
      .bind(id, label, opt(input.plural, "plural", { max: 60 }) ?? `${label}s`, title, JSON.stringify(fields), appId, now()),
  ]);
  return getType(db, id);
}

export async function removeObjectType(db: D1Database, id: string): Promise<void> {
  const type = await getType(db, id);
  await db.batch([db.prepare(`DROP TABLE IF EXISTS ${tableOf(type.id)}`), db.prepare("DELETE FROM object_types WHERE id = ?").bind(type.id)]);
}

function parseQuery(v: unknown, type: ObjectType): ObjectQuery {
  const q = obj(v, "query");
  const sort = q.sort == null ? "created_at" : String(q.sort);
  if (sort !== "created_at" && sort !== "updated_at" && !(sort.startsWith("doc:") && type.fields.some((f) => f.key === sort.slice(4)))) invalid("sort must be created_at, updated_at or doc:<field>");
  return {
    where: q.where == null ? undefined : whenList(q.where, "where"), search: opt(q.search, "search", { max: 200 }) ?? undefined,
    contactId: q.contactId === undefined ? undefined : q.contactId === null ? null : str(q.contactId, "contactId", { max: 64 }),
    sort: sort as ObjectQuery["sort"], dir: oneOf(q.dir, "dir", ["asc", "desc"] as const, "desc"),
    limit: int(q.limit, "limit", { min: 1, max: 500, dflt: 50 }), offset: int(q.offset, "offset", { min: 0, max: 1_000_000, dflt: 0 }),
  };
}

export async function listObjects(db: D1Database, typeId: string, query: unknown): Promise<ObjectPage> {
  const type = await getType(db, typeId);
  const q = parseQuery(query, type);
  const t = tableOf(type.id);
  const clauses: string[] = [];
  const binds: unknown[] = [];
  const keys = new Set(type.fields.map((f) => f.key));
  for (const w of q.where ?? []) {
    const field = w.field.startsWith("doc.") ? w.field.slice(4) : w.field;
    if (!keys.has(field) && field !== "contact_id") invalid(`cannot filter on ${w.field}`);
    const part = whenSql(field === "contact_id" ? w : { ...w, field: `props.${field}` }, (f) => (f === "contact_id" ? "contact_id" : null), "doc");
    if (part) { clauses.push(part.sql); binds.push(...part.binds); }
  }
  if (q.search) {
    const text = type.fields.filter((f) => f.type === "text" || f.type === "select" || f.type === "url").map((f) => `${extract(f.key)} LIKE ? ESCAPE '\\'`);
    if (text.length) { clauses.push(`(${text.join(" OR ")})`); const like = `%${q.search.replace(/[%_\\]/g, "\\$&")}%`; binds.push(...text.map(() => like)); }
  }
  if (q.contactId !== undefined) { if (q.contactId === null) clauses.push("contact_id IS NULL"); else { clauses.push("contact_id = ?"); binds.push(q.contactId); } }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const sort = q.sort?.startsWith("doc:") ? extract(q.sort.slice(4)) : q.sort ?? "created_at";
  const [rows, count] = await db.batch([
    db.prepare(`SELECT * FROM ${t} ${where} ORDER BY ${sort} ${q.dir === "asc" ? "ASC" : "DESC"}, id LIMIT ? OFFSET ?`).bind(...binds, q.limit, q.offset),
    db.prepare(`SELECT COUNT(*) AS n FROM ${t} ${where}`).bind(...binds),
  ]);
  return { items: (rows.results as Row[]).map((r) => hydrate(type.id, r)), total: (count.results[0] as { n: number })?.n ?? 0 };
}

/** Every object linked to a contact, by type. For the contact page. */
export async function listObjectsFor(db: D1Database, contactId: string): Promise<Record<string, ObjectRow[]>> {
  const types = await listObjectTypes(db);
  if (!types.length) return {};
  const results = await db.batch(types.map((t) => db.prepare(`SELECT * FROM ${tableOf(t.id)} WHERE contact_id = ? ORDER BY created_at DESC LIMIT 50`).bind(contactId)));
  return Object.fromEntries(types.map((t, i) => [t.id, (results[i].results as Row[]).map((r) => hydrate(t.id, r))]).filter(([, rows]) => (rows as ObjectRow[]).length));
}

export async function getObject(db: D1Database, typeId: string, id: string): Promise<ObjectRow | null> {
  const type = await getType(db, typeId);
  const row = await db.prepare(`SELECT * FROM ${tableOf(type.id)} WHERE id = ?`).bind(str(id, "id", { max: 64 })).first<Row>();
  return row ? hydrate(type.id, row) : null;
}

function cleanDoc(type: ObjectType, doc: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of type.fields) {
    const v = coerce(f, doc[f.key]);
    if (v == null && f.required) invalid(`${f.label} is required`);
    out[f.key] = v;
  }
  for (const k of Object.keys(doc)) if (!type.fields.some((f) => f.key === k)) invalid(`unknown field ${k} on ${type.id}`);
  return out;
}

export async function saveObject(env: Env, exec: ExecutionContext | undefined, appId: string, typeId: string, input: ObjectInput): Promise<ObjectRow> {
  const db = env.DB;
  const type = await getType(db, typeId);
  const t = tableOf(type.id);
  const json = JSON.stringify(cleanDoc(type, obj(input.doc, "doc")));
  if (json.length > MAX_DOC) invalid(`documents are limited to ${MAX_DOC / 1000} KB`);
  const ts = now();
  const contactId = input.contactId === undefined ? undefined : input.contactId === null ? null : str(input.contactId, "contactId", { max: 64 });
  let row: Row | null = null;
  let created = false;
  if (input.id) {
    const id = str(input.id, "id", { max: 64 });
    const rev = input.rev == null ? null : int(input.rev, "rev", { min: 1 });
    row = await db.prepare(`UPDATE ${t} SET doc = ?, contact_id = CASE WHEN ? THEN ? ELSE contact_id END, rev = rev + 1, updated_at = ? WHERE id = ? AND (? IS NULL OR rev = ?) RETURNING *`)
      .bind(json, contactId === undefined ? 0 : 1, contactId ?? null, ts, id, rev, rev).first<Row>();
    if (!row) {
      const exists = await db.prepare(`SELECT rev FROM ${t} WHERE id = ?`).bind(id).first<{ rev: number }>();
      if (exists) invalid(`this record changed since you loaded it (now rev ${exists.rev}); reload and try again`);
    }
  }
  if (!row) {
    row = (await db.prepare(`INSERT INTO ${t} (id, contact_id, rev, doc, created_at, updated_at) VALUES (?, ?, 1, ?, ?, ?) RETURNING *`)
      .bind(input.id ?? nid(), contactId ?? null, json, ts, ts).first<Row>())!;
    created = true;
  }
  await publish(env, exec, appId, [{ name: created ? "object.created" : "object.updated", contactId: row.contact_id, props: { type: type.id, id: row.id, rev: row.rev } }], { core: true });
  return hydrate(type.id, row);
}

export async function removeObjects(env: Env, exec: ExecutionContext | undefined, appId: string, typeId: string, ids: string[]): Promise<void> {
  const type = await getType(env.DB, typeId);
  const list = strings(ids, "ids", 500);
  if (!list.length) return;
  const rows = (await env.DB.prepare(`DELETE FROM ${tableOf(type.id)} WHERE id IN (${list.map(() => "?").join(",")}) RETURNING id, contact_id`).bind(...list).all<{ id: string; contact_id: string | null }>()).results;
  await publish(env, exec, appId, rows.map((r) => ({ name: "object.deleted", contactId: r.contact_id, props: { type: type.id, id: r.id } })), { core: true });
}

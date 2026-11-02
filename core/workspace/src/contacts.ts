// Contacts: the CRM's one table plus tags, custom fields, segments and the anonymous-visitor link.
import type { Contact, ContactDetail, ContactFull, ContactInput, ContactPage, ContactQuery, FieldDef, Segment, SegmentInput, When } from "@supergrid/app-kit/rpc";
import { isId, nid, now } from "./ids";
import { publish } from "./events";
import { listObjectsFor } from "./objects";
import type { Env } from "./types";
import { bool, fieldDef, int, invalid, iso, KEY, list, obj, oneOf, opt, str, strings, whenList, whenSql } from "./validate";

type Row = { id: string; email: string; name: string | null; source: string | null; props: string; created_at: string; updated_at: string; tags?: string | null };
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const SORTS = ["created_at", "updated_at", "email", "name"] as const;

const hydrate = (r: Row): ContactFull => ({
  id: r.id, email: r.email, name: r.name, source: r.source, props: JSON.parse(r.props || "{}"), created_at: r.created_at, updated_at: r.updated_at,
  tags: r.tags ? r.tags.split("\u001f").filter(Boolean).sort() : [],
});
const TAGS = "(SELECT GROUP_CONCAT(tag, char(31)) FROM contact_tags t WHERE t.contact_id = c.id) AS tags";
const column = (field: string) => (field === "email" || field === "name" || field === "source" || field === "created_at" || field === "updated_at" || field === "id" ? `c.${field}` : null);

/** A date-only `createdTo` means "through that day", so it becomes the next midnight for the `<` comparison. */
const dayEnd = (v: unknown) => {
  const t = iso(v, "createdTo");
  return t && /^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? new Date(new Date(t).getTime() + 86_400_000).toISOString() : t;
};

export function parseQuery(v: unknown): ContactQuery {
  const q = obj(v, "query");
  const did = q.did == null ? undefined : obj(q.did, "did");
  const sort = q.sort == null ? "created_at" : String(q.sort);
  if (!SORTS.includes(sort as (typeof SORTS)[number]) && !/^prop:[a-z][a-z0-9_]{0,59}$/.test(sort)) invalid("sort must be a column or prop:<key>");
  return {
    search: opt(q.search, "search", { max: 200 }) ?? undefined,
    tags: q.tags == null ? undefined : strings(q.tags, "tags", 20), anyTags: q.anyTags == null ? undefined : strings(q.anyTags, "anyTags", 20),
    source: opt(q.source, "source", { max: 100 }) ?? undefined,
    createdFrom: iso(q.createdFrom, "createdFrom") ?? undefined, createdTo: dayEnd(q.createdTo) ?? undefined,
    props: q.props == null ? undefined : whenList(q.props, "props"),
    did: did && { event: str(did.event, "did.event", { max: 100 }), min: int(did.min, "did.min", { min: 1, max: 10_000, dflt: 1 }), days: int(did.days, "did.days", { min: 1, max: 3650, dflt: 30 }) },
    segment: opt(q.segment, "segment", { max: 64 }) ?? undefined,
    sort: sort as ContactQuery["sort"], dir: oneOf(q.dir, "dir", ["asc", "desc"] as const, "desc"),
    limit: int(q.limit, "limit", { min: 1, max: 500, dflt: 50 }), offset: int(q.offset, "offset", { min: 0, max: 1_000_000, dflt: 0 }),
  };
}

/** One SELECT for list pages, segment counts and `did` filters. Tags are EXISTS subqueries, props go through json_extract. */
async function where(db: D1Database, q: ContactQuery, depth = 0): Promise<{ sql: string; binds: unknown[] }> {
  const clauses: string[] = [];
  const binds: unknown[] = [];
  if (q.search) { clauses.push("(c.email LIKE ? ESCAPE '\\' OR c.name LIKE ? ESCAPE '\\')"); const like = `%${q.search.replace(/[%_\\]/g, "\\$&")}%`; binds.push(like, like); }
  for (const tag of q.tags ?? []) { clauses.push("EXISTS (SELECT 1 FROM contact_tags t WHERE t.contact_id = c.id AND t.tag = ?)"); binds.push(tag); }
  if (q.anyTags?.length) { clauses.push(`EXISTS (SELECT 1 FROM contact_tags t WHERE t.contact_id = c.id AND t.tag IN (${q.anyTags.map(() => "?").join(",")}))`); binds.push(...q.anyTags); }
  if (q.source) { clauses.push("c.source = ?"); binds.push(q.source); }
  if (q.createdFrom) { clauses.push("c.created_at >= ?"); binds.push(q.createdFrom); }
  if (q.createdTo) { clauses.push("c.created_at < ?"); binds.push(q.createdTo); }
  for (const w of q.props ?? []) {
    const part = whenSql(w.field.startsWith("props.") ? w : { ...w, field: column(w.field) ? w.field : `props.${w.field}` }, column, "c.props");
    if (part) { clauses.push(part.sql); binds.push(...part.binds); }
  }
  if (q.did) {
    clauses.push("c.id IN (SELECT contact_id FROM events WHERE name = ? AND ts >= ? AND contact_id IS NOT NULL GROUP BY contact_id HAVING COUNT(*) >= ?)");
    binds.push(q.did.event, new Date(Date.now() - (q.did.days ?? 30) * 86_400_000).toISOString(), q.did.min ?? 1);
  }
  if (q.segment) {
    if (depth > 0) invalid("segments cannot nest");
    const seg = await db.prepare("SELECT kind, filter FROM segments WHERE id = ?").bind(q.segment).first<{ kind: string; filter: string }>();
    if (!seg) invalid("unknown segment");
    if (seg!.kind === "static") { clauses.push("c.id IN (SELECT contact_id FROM segment_members WHERE segment_id = ?)"); binds.push(q.segment); }
    else { const inner = await where(db, parseQuery(JSON.parse(seg!.filter)), depth + 1); if (inner.sql) { clauses.push(`(${inner.sql.slice(6)})`); binds.push(...inner.binds); } }
  }
  return { sql: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "", binds };
}

export async function queryContacts(db: D1Database, q: ContactQuery): Promise<ContactPage> {
  const w = await where(db, q);
  const sort = q.sort?.startsWith("prop:") ? `json_extract(c.props, '$.${q.sort.slice(5)}')` : `c.${q.sort ?? "created_at"}`;
  const dir = q.dir === "asc" ? "ASC" : "DESC";
  const [rows, count] = await db.batch([
    db.prepare(`SELECT c.*, ${TAGS} FROM contacts c ${w.sql} ORDER BY ${sort} ${dir}, c.id LIMIT ? OFFSET ?`).bind(...w.binds, q.limit ?? 50, q.offset ?? 0),
    db.prepare(`SELECT COUNT(*) AS n FROM contacts c ${w.sql}`).bind(...w.binds),
  ]);
  return { items: (rows.results as Row[]).map(hydrate), total: (count.results[0] as { n: number })?.n ?? 0 };
}

export const countContacts = async (db: D1Database, q: ContactQuery) => (await queryContacts(db, { ...q, limit: 1, offset: 0 })).total;

export async function getFull(db: D1Database, idOrEmail: string): Promise<ContactFull | null> {
  const row = await db.prepare(`SELECT c.*, ${TAGS} FROM contacts c WHERE c.id = ? OR c.email = ?`).bind(idOrEmail, idOrEmail.toLowerCase()).first<Row>();
  return row ? hydrate(row) : null;
}

export async function getContact(db: D1Database, idOrEmail: string): Promise<ContactDetail | null> {
  const contact = await getFull(db, str(idOrEmail, "id", { max: 320 }));
  if (!contact) return null;
  const [timeline, members, dynamic] = await db.batch([
    db.prepare("SELECT * FROM events WHERE contact_id = ? ORDER BY ts DESC LIMIT 50").bind(contact.id),
    db.prepare("SELECT s.id, s.name FROM segment_members m JOIN segments s ON s.id = m.segment_id WHERE m.contact_id = ?").bind(contact.id),
    db.prepare("SELECT id, name, filter FROM segments WHERE kind = 'dynamic' ORDER BY name"),
  ]);
  // A dynamic segment holds this contact when its filter, narrowed to this one id, still finds a row.
  const checks = await Promise.all((dynamic.results as { id: string; name: string; filter: string }[]).map(async (s) => {
    const w = await where(db, parseQuery(JSON.parse(s.filter)));
    return db.prepare(`SELECT 1 FROM contacts c ${w.sql ? `${w.sql} AND` : "WHERE"} c.id = ?`).bind(...w.binds, contact.id);
  }));
  const hits = checks.length ? await db.batch(checks) : [];
  const inDynamic = (dynamic.results as { id: string; name: string }[]).filter((_, i) => hits[i]?.results.length).map((s) => ({ id: s.id, name: s.name }));
  return {
    contact,
    timeline: (timeline.results as (Record<string, unknown> & { props: string })[]).map((e) => ({ ...e, props: JSON.parse(e.props || "{}") })) as ContactDetail["timeline"],
    objects: await listObjectsFor(db, contact.id),
    segments: [...(members.results as { id: string; name: string }[]), ...inDynamic],
  };
}

const CORE_PROPS = new Set(["notes"]);
/** Props must be declared fields (or `notes`), so the UI can always render what is stored. Values are coerced to the field's type. */
async function cleanProps(db: D1Database, props: Record<string, unknown>): Promise<Record<string, unknown>> {
  const fields = await listContactFields(db);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    const f = fields.find((x) => x.key === k);
    if (!f) { if (CORE_PROPS.has(k)) out[k] = v == null ? null : String(v).slice(0, 20_000); else invalid(`unknown field ${k}; declare it first`); continue; }
    out[k] = coerce(f, v);
  }
  return out;
}
export function coerce(f: FieldDef, v: unknown): unknown {
  if (v == null || v === "") return null;
  switch (f.type) {
    case "number": { const n = Number(v); if (Number.isNaN(n)) invalid(`${f.key} must be a number`); return n; }
    case "bool": return bool(v);
    case "date": return iso(v, f.key);
    case "select": { const s = String(v); if (f.options?.length && !f.options.includes(s)) invalid(`${f.key} must be one of ${f.options.join(", ")}`); return s; }
    case "url": { const s = String(v).slice(0, 2000); if (!/^https?:\/\//.test(s)) invalid(`${f.key} must be a URL`); return s; }
    default: return String(v).slice(0, 4000);
  }
}

/** Create or update by email: the shape apps use. Props merge into what is stored. */
export async function upsertContact(env: Env, exec: ExecutionContext | undefined, appId: string, input: { email: string; name?: string | null; source?: string | null; props?: Record<string, unknown>; anonymousId?: string | null }): Promise<ContactFull> {
  const email = str(input.email, "email", { max: 320 }).trim().toLowerCase();
  if (!EMAIL.test(email)) invalid("Invalid email");
  const props = await cleanProps(env.DB, obj(input.props, "props"));
  const existing = await env.DB.prepare("SELECT id FROM contacts WHERE email = ?").bind(email).first<{ id: string }>();
  const id = existing?.id ?? nid();
  const ts = now();
  await env.DB.prepare(`INSERT INTO contacts (id, email, name, source, props, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET name = COALESCE(excluded.name, contacts.name), source = COALESCE(contacts.source, excluded.source),
    props = json_patch(contacts.props, excluded.props), updated_at = excluded.updated_at`)
    .bind(id, email, opt(input.name, "name", { max: 200 }), opt(input.source, "source", { max: 100 }), JSON.stringify(props), ts, ts).run();
  if (input.anonymousId) await link(env.DB, id, input.anonymousId);
  const row = (await getFull(env.DB, id))!;
  await publish(env, exec, appId, [{ name: existing ? "contact.updated" : "contact.created", contactId: id, anonymousId: input.anonymousId ?? null, props: { email, source: row.source } }], { core: true });
  return row;
}

/** The admin's save: by id when given, else by email. Props and tags replace what is stored. */
export async function saveContact(env: Env, exec: ExecutionContext | undefined, appId: string, input: ContactInput): Promise<ContactFull> {
  const db = env.DB;
  const id = input.id == null ? null : str(input.id, "id", { max: 64 });
  const current = id ? await getFull(db, id) : null;
  if (id && !current) invalid("unknown contact");
  if (!current) return tagsAndReturn(env, exec, appId, await upsertContact(env, exec, appId, { email: input.email ?? "", name: input.name, source: input.source, props: input.props }), input.tags);
  const email = input.email == null ? current!.email : str(input.email, "email", { max: 320 }).trim().toLowerCase();
  if (!EMAIL.test(email)) invalid("Invalid email");
  // Props patch what is stored, so a form that shows some fields never wipes the rest. A null value clears a key.
  const props = input.props == null ? current!.props : { ...current!.props, ...(await cleanProps(db, obj(input.props, "props"))) };
  await db.prepare("UPDATE contacts SET email = ?, name = ?, source = ?, props = ?, updated_at = ? WHERE id = ?")
    .bind(email, input.name === undefined ? current!.name : opt(input.name, "name", { max: 200 }), input.source === undefined ? current!.source : opt(input.source, "source", { max: 100 }), JSON.stringify(props), now(), current!.id).run();
  await publish(env, exec, appId, [{ name: "contact.updated", contactId: current!.id, props: { email } }], { core: true });
  return tagsAndReturn(env, exec, appId, (await getFull(db, current!.id))!, input.tags);
}
async function tagsAndReturn(env: Env, exec: ExecutionContext | undefined, appId: string, c: ContactFull, tags: string[] | undefined): Promise<ContactFull> {
  if (tags === undefined) return c;
  const want = new Set(strings(tags, "tags", 50).map(cleanTag));
  await tagContacts(env, exec, appId, [c.id], [...want].filter((t) => !c.tags.includes(t)), c.tags.filter((t) => !want.has(t)));
  return (await getFull(env.DB, c.id))!;
}

const cleanTag = (t: string) => { const s = t.trim().toLowerCase().slice(0, 60); if (!s) invalid("empty tag"); return s; };

export async function tagContacts(env: Env, exec: ExecutionContext | undefined, appId: string, ids: string[], add: string[] = [], remove: string[] = []): Promise<void> {
  const contacts = strings(ids, "ids", 500);
  const plus = strings(add, "add", 50).map(cleanTag), minus = strings(remove, "remove", 50).map(cleanTag);
  if (!contacts.length || (!plus.length && !minus.length)) return;
  const stmts: D1PreparedStatement[] = [];
  for (const id of contacts) {
    for (const t of plus) stmts.push(env.DB.prepare("INSERT OR IGNORE INTO contact_tags (contact_id, tag) VALUES (?, ?)").bind(id, t));
    for (const t of minus) stmts.push(env.DB.prepare("DELETE FROM contact_tags WHERE contact_id = ? AND tag = ?").bind(id, t));
  }
  for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));
  await env.DB.prepare(`UPDATE contacts SET updated_at = ? WHERE id IN (${contacts.map(() => "?").join(",")})`).bind(now(), ...contacts).run();
  await publish(env, exec, appId, contacts.flatMap((id) => [
    ...plus.map((tag) => ({ name: "contact.tagged", contactId: id, props: { tag } })),
    ...minus.map((tag) => ({ name: "contact.untagged", contactId: id, props: { tag } })),
  ]), { core: true });
}

export async function deleteContacts(env: Env, exec: ExecutionContext | undefined, appId: string, ids: string[]): Promise<void> {
  const contacts = strings(ids, "ids", 500);
  if (!contacts.length) return;
  const rows = (await env.DB.prepare(`SELECT id, email FROM contacts WHERE id IN (${contacts.map(() => "?").join(",")})`).bind(...contacts).all<{ id: string; email: string }>()).results;
  await env.DB.prepare(`DELETE FROM contacts WHERE id IN (${contacts.map(() => "?").join(",")})`).bind(...contacts).run();
  await publish(env, exec, appId, rows.map((r) => ({ name: "contact.deleted", props: { id: r.id, email: r.email } })), { core: true });
}

export const listTags = async (db: D1Database) =>
  (await db.prepare("SELECT tag, COUNT(*) AS count FROM contact_tags GROUP BY tag ORDER BY count DESC, tag").all<{ tag: string; count: number }>()).results;

// ---- Fields ------------------------------------------------------------------------------------------------------

type FieldRow = { key: string; label: string; type: FieldDef["type"]; options: string | null; required: number; indexed: number; app_id: string | null };
const fieldOf = (r: FieldRow): FieldDef => ({ key: r.key, label: r.label, type: r.type, options: r.options ? JSON.parse(r.options) : undefined, required: !!r.required, indexed: !!r.indexed, app_id: r.app_id });
export const listContactFields = async (db: D1Database) => (await db.prepare("SELECT * FROM contact_fields ORDER BY created_at, key").all<FieldRow>()).results.map(fieldOf);
export async function saveContactField(db: D1Database, appId: string | null, input: unknown): Promise<FieldDef> {
  const f = fieldDef(input);
  if (CORE_PROPS.has(f.key) || ["id", "email", "name", "source", "tags", "created_at", "updated_at"].includes(f.key)) invalid(`${f.key} is a built-in field`);
  await db.prepare(`INSERT INTO contact_fields (key, label, type, options, required, indexed, app_id) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET label = excluded.label, type = excluded.type, options = excluded.options, required = excluded.required, indexed = excluded.indexed`)
    .bind(f.key, f.label, f.type, f.options ? JSON.stringify(f.options) : null, f.required ? 1 : 0, f.indexed ? 1 : 0, appId).run();
  return { ...f, app_id: appId };
}
export const removeContactField = (db: D1Database, key: string) => db.prepare("DELETE FROM contact_fields WHERE key = ?").bind(str(key, "key", { re: KEY })).run().then(() => {});

// ---- Segments ----------------------------------------------------------------------------------------------------

type SegRow = { id: string; name: string; kind: "dynamic" | "static"; filter: string; created_at: string; updated_at: string };
const segOf = (r: SegRow): Segment => ({ id: r.id, name: r.name, kind: r.kind, filter: JSON.parse(r.filter || "{}"), created_at: r.created_at, updated_at: r.updated_at });

/** Each segment with its current size: dynamic ones run their filter, static ones count members. */
export async function listSegments(db: D1Database): Promise<Segment[]> {
  const rows = (await db.prepare("SELECT * FROM segments ORDER BY name").all<SegRow>()).results.map(segOf);
  return Promise.all(rows.map(async (s) => ({ ...s, count: await countContacts(db, { segment: s.id }).catch(() => 0) })));
}
export async function saveSegment(db: D1Database, input: SegmentInput): Promise<Segment> {
  const id = input.id == null ? nid() : str(input.id, "id", { max: 64 });
  const kind = oneOf(input.kind, "kind", ["dynamic", "static"] as const, "dynamic");
  const filter = parseQuery(input.filter ?? {});
  if (filter.segment) invalid("a segment cannot filter by another segment");
  const { limit: _l, offset: _o, ...stored } = filter;
  await db.prepare(`INSERT INTO segments (id, name, kind, filter, updated_at) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET name = excluded.name, kind = excluded.kind, filter = excluded.filter, updated_at = excluded.updated_at`)
    .bind(id, str(input.name, "name", { max: 100 }), kind, JSON.stringify(stored), now()).run();
  const row = (await db.prepare("SELECT * FROM segments WHERE id = ?").bind(id).first<SegRow>())!;
  return { ...segOf(row), count: await countContacts(db, { segment: id }) };
}
export const removeSegment = (db: D1Database, id: string) => db.prepare("DELETE FROM segments WHERE id = ?").bind(str(id, "id", { max: 64 })).run().then(() => {});
export async function addToSegment(db: D1Database, id: string, contactIds: string[]): Promise<void> {
  const ids = strings(contactIds, "contactIds", 500);
  const seg = await db.prepare("SELECT kind FROM segments WHERE id = ?").bind(str(id, "id", { max: 64 })).first<{ kind: string }>();
  if (!seg) invalid("unknown segment");
  if (seg!.kind !== "static") invalid("only static segments take members");
  for (let i = 0; i < ids.length; i += 50) await db.batch(ids.slice(i, i + 50).map((c) => db.prepare("INSERT OR IGNORE INTO segment_members (segment_id, contact_id) VALUES (?, ?)").bind(id, c)));
}

// ---- Identities ---------------------------------------------------------------------------------------------------

/** Ties a visitor cookie to a contact and claims the visitor's earlier events (bounded, newest first). */
export async function link(db: D1Database, contactId: string, anonymousId: string): Promise<void> {
  if (!isId(anonymousId)) return;
  await db.batch([
    db.prepare("INSERT OR REPLACE INTO identities (anonymous_id, contact_id) VALUES (?, ?)").bind(anonymousId, contactId),
    db.prepare("UPDATE events SET contact_id = ? WHERE id IN (SELECT id FROM events WHERE anonymous_id = ? AND contact_id IS NULL ORDER BY ts DESC LIMIT 1000)").bind(contactId, anonymousId),
  ]);
}

export const legacyList = async (db: D1Database, limit: number): Promise<Contact[]> =>
  (await db.prepare("SELECT * FROM contacts ORDER BY created_at DESC LIMIT ?").bind(int(limit, "limit", { min: 1, max: 500, dflt: 50 })).all<Row>()).results.map((r) => { const { tags: _t, ...c } = hydrate(r); return c; });

export { list, whenList };
export type { When };

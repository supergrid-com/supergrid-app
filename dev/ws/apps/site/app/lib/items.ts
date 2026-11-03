// The app's own rows, as plain SQL over its table. Loaders, actions and operations all go through here, so the shape
// of a row is written once. `app_blank_items` is what the manifest declares under data.item (see workers/app.ts).
import type { D1Database } from "@cloudflare/workers-types/experimental";
import { parseManifest } from "@supergrid/app-kit/manifest";
import manifest from "../../supergrid.app.json";

export const m = parseManifest(manifest);
export const TABLE = m.entities.item!.table;

export type Item = { id: string; title: string; body: string | null; status: "draft" | "published"; image: string | null; contact_id: string | null; created_at: string; updated_at: string };
export type ItemInput = { title: string; body?: string | null; status?: "draft" | "published"; image?: string | null; contact_id?: string | null };

export const listItems = async (db: D1Database, opts: { status?: Item["status"]; limit?: number } = {}): Promise<Item[]> =>
  (await db.prepare(`SELECT * FROM ${TABLE} ${opts.status ? "WHERE status = ?1" : ""} ORDER BY created_at DESC LIMIT ${opts.limit ?? 200}`).bind(...(opts.status ? [opts.status] : [])).all<Item>()).results;

export const getItem = (db: D1Database, id: string): Promise<Item | null> => db.prepare(`SELECT * FROM ${TABLE} WHERE id = ?`).bind(id).first<Item>();

export async function createItem(db: D1Database, input: ItemInput): Promise<Item> {
  const id = crypto.randomUUID();
  await db.prepare(`INSERT INTO ${TABLE} (id, title, body, status, image, contact_id) VALUES (?, ?, ?, ?, ?, ?)`).bind(id, input.title, input.body ?? null, input.status ?? "draft", input.image ?? null, input.contact_id ?? null).run();
  return (await getItem(db, id))!;
}

export async function updateItem(db: D1Database, id: string, input: Partial<ItemInput>): Promise<Item | null> {
  const sets: string[] = [];
  const args: unknown[] = [];
  for (const k of ["title", "body", "status", "image", "contact_id"] as const) if (input[k] !== undefined) { sets.push(`${k} = ?`); args.push(input[k]); }
  if (!sets.length) return getItem(db, id);
  await db.prepare(`UPDATE ${TABLE} SET ${sets.join(", ")}, updated_at = datetime('now') WHERE id = ?`).bind(...args, id).run();
  return getItem(db, id);
}

export const deleteItem = async (db: D1Database, id: string): Promise<boolean> => ((await db.prepare(`DELETE FROM ${TABLE} WHERE id = ?`).bind(id).run()).meta.changes ?? 0) > 0;

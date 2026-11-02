// Themes: one row per theme, one marked default. The document is validated by @supergrid/theme on
// every write, so what is stored always compiles. With no rows, the built-in default theme stands in.
import { defaultTheme, parseTheme, themeToCss, themeVersion, type Theme, type ThemeRecord, type ThemeSummary } from "@supergrid/theme";
import { ensureCore } from "./db";

type Row = { id: string; name: string; doc: string; is_default: number; created_at: string; updated_at: string };
const MAX_THEMES = 24;

const record = (r: Row): ThemeRecord => ({ theme: JSON.parse(r.doc) as Theme, isDefault: r.is_default === 1, created_at: r.created_at, updated_at: r.updated_at });
const summary = (rec: ThemeRecord): ThemeSummary => ({ id: rec.theme.id, name: rec.theme.name, mode: rec.theme.mode, isDefault: rec.isDefault, updated_at: rec.updated_at, primary: rec.theme.colors.primary });
const builtIn: ThemeRecord = { theme: defaultTheme, isDefault: true, created_at: null, updated_at: null };

export async function listThemes(db: D1Database): Promise<ThemeSummary[]> {
  await ensureCore(db);
  const rows = (await db.prepare("SELECT * FROM themes ORDER BY is_default DESC, name").all<Row>()).results;
  return rows.length ? rows.map((r) => summary(record(r))) : [summary(builtIn)];
}

/** A theme by id, or the default when `id` is empty. Null when no such theme exists. */
export async function readThemeRecord(db: D1Database, id?: string | null): Promise<ThemeRecord | null> {
  await ensureCore(db);
  const row = id
    ? await db.prepare("SELECT * FROM themes WHERE id = ?").bind(id).first<Row>()
    : await db.prepare("SELECT * FROM themes ORDER BY is_default DESC, created_at LIMIT 1").first<Row>();
  if (row) return record(row);
  return !id || id === "default" ? builtIn : null;
}

export async function readTheme(db: D1Database, id?: string | null): Promise<Theme> {
  const rec = await readThemeRecord(db, id);
  if (!rec) throw new Error(`unknown theme ${id}`);
  return rec.theme;
}

/** Create or replace. Input is a full document; `patch` of an existing theme happens in the caller with `parseTheme(patch, base)`. */
export async function saveTheme(db: D1Database, input: unknown): Promise<ThemeRecord> {
  await ensureCore(db);
  const id = typeof (input as { id?: unknown })?.id === "string" ? String((input as { id: string }).id).trim().toLowerCase() : "";
  const existing = id ? await readThemeRecord(db, id) : null;
  const theme = parseTheme(input, existing?.theme);
  const count = (await db.prepare("SELECT COUNT(*) AS n FROM themes").first<{ n: number }>())?.n ?? 0;
  if (!existing?.updated_at && count >= MAX_THEMES) throw new Error(`a workspace holds up to ${MAX_THEMES} themes`);
  // the first stored theme becomes the default, so the built-in stand-in retires cleanly
  const makeDefault = count === 0 ? 1 : 0;
  await db.prepare(`INSERT INTO themes (id, name, doc, is_default, updated_at) VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET name = excluded.name, doc = excluded.doc, updated_at = excluded.updated_at`)
    .bind(theme.id, theme.name, JSON.stringify(theme), makeDefault).run();
  return (await readThemeRecord(db, theme.id))!;
}

export async function removeTheme(db: D1Database, id: string): Promise<void> {
  const rec = await readThemeRecord(db, id);
  if (!rec || !rec.updated_at) throw new Error(`unknown theme ${id}`);
  if (rec.isDefault) throw new Error("the default theme cannot be removed; make another the default first");
  await db.prepare("DELETE FROM themes WHERE id = ?").bind(id).run();
}

export async function setDefaultTheme(db: D1Database, id: string): Promise<ThemeSummary[]> {
  await ensureCore(db);
  let rec = await readThemeRecord(db, id);
  if (!rec) throw new Error(`unknown theme ${id}`);
  // the built-in default gets stored the first time it is chosen, so the flag has a row to sit on
  if (!rec.updated_at) rec = await saveTheme(db, rec.theme);
  await db.batch([db.prepare("UPDATE themes SET is_default = 0 WHERE is_default = 1"), db.prepare("UPDATE themes SET is_default = 1 WHERE id = ?").bind(rec.theme.id)]);
  return listThemes(db);
}

/** The stylesheet for a theme, with an ETag from its content so a conditional request costs one D1 read. */
export async function themeCssResponse(db: D1Database, request: Request, id?: string | null): Promise<Response> {
  const rec = await readThemeRecord(db, id);
  if (!rec) return new Response(`/* no theme ${id} */`, { status: 404, headers: { "content-type": "text/css; charset=utf-8" } });
  const etag = `"${themeVersion(rec.theme)}"`;
  const headers = { etag, "content-type": "text/css; charset=utf-8", "cache-control": "public, max-age=120, stale-while-revalidate=86400", "access-control-allow-origin": "*" };
  if (request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers });
  return new Response(themeToCss(rec.theme), { headers });
}

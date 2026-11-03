import { defaultTheme, parseTheme, THEME_ID, type Theme, type ThemeRecord } from "@supergrid/theme";
import type { D1Target } from "../../../shared/bridge";
import { sg } from "~/lib/bridge";
import { invalidate, useRemote } from "~/lib/library";

// The workspace's themes, read and written in its own database through the D1 API (the `themes`
// table the workspace migrates, core/workspace/src/themes.ts): the same rows the workspace serves
// at /_ws/theme.css, so a save here is what every app of the workspace loads next. The document is
// validated with @supergrid/theme before it is written, so what is stored always compiles.

type Row = { id: string; name: string; doc: string; is_default: number; created_at: string; updated_at: string };
const MAX_THEMES = 24;
const builtIn: ThemeRecord = { theme: defaultTheme, isDefault: true, created_at: null, updated_at: null };

const record = (r: Row): ThemeRecord => ({ theme: JSON.parse(r.doc) as Theme, isDefault: r.is_default === 1, created_at: r.created_at, updated_at: r.updated_at });
const key = (t: D1Target | null) => (t ? `themes:${t.accountId}:${t.worker}` : null);

export async function listThemes(target: D1Target): Promise<ThemeRecord[]> {
  if (!sg) return [builtIn];
  const { results } = await sg.d1.query(target, "SELECT * FROM themes ORDER BY is_default DESC, name");
  const rows = results as Row[];
  return rows.length ? rows.map(record) : [builtIn];
}

/** The workspace's themes, the default first. With none stored yet, the built-in default stands in. */
export function useThemes(target: D1Target | null) {
  return useRemote(key(target), () => listThemes(target!));
}

/** Create or replace. The first theme stored becomes the default, so the built-in stand-in retires. */
export async function saveTheme(target: D1Target, input: Theme): Promise<Theme> {
  if (!sg) throw new Error("Themes save inside the app.");
  const theme = parseTheme(input);
  const existing = (await sg.d1.query(target, "SELECT updated_at FROM themes WHERE id = ?", [theme.id])).results[0];
  const count = Number((await sg.d1.query(target, "SELECT COUNT(*) AS n FROM themes")).results[0]?.n ?? 0);
  if (!existing && count >= MAX_THEMES) throw new Error(`A workspace holds up to ${MAX_THEMES} themes.`);
  const upsert = `INSERT INTO themes (id, name, doc, is_default, updated_at) VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, doc = excluded.doc, updated_at = excluded.updated_at`;
  // the first theme stored becomes the default; when that is a new theme, the built-in Default is stored beside it as the default, so it stays
  const first = count === 0;
  if (first && theme.id !== defaultTheme.id) await sg.d1.query(target, upsert, [defaultTheme.id, defaultTheme.name, JSON.stringify(defaultTheme), 1]);
  await sg.d1.query(target, upsert, [theme.id, theme.name, JSON.stringify(theme), first && theme.id === defaultTheme.id ? 1 : 0]);
  invalidate("themes:");
  return theme;
}

export async function removeTheme(target: D1Target, id: string): Promise<void> {
  if (!sg) return;
  await sg.d1.query(target, "DELETE FROM themes WHERE id = ? AND is_default = 0", [id]);
  invalidate("themes:");
}

export async function setDefaultTheme(target: D1Target, theme: Theme): Promise<void> {
  if (!sg) return;
  const stored = (await sg.d1.query(target, "SELECT id FROM themes WHERE id = ?", [theme.id])).results[0];
  if (!stored) await saveTheme(target, theme);
  await sg.d1.query(target, "UPDATE themes SET is_default = 0 WHERE is_default = 1");
  await sg.d1.query(target, "UPDATE themes SET is_default = 1 WHERE id = ?", [theme.id]);
  invalidate("themes:");
}

/** A theme id from a name, not yet used in the list. */
export function freeThemeId(name: string, taken: string[]): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").replace(/^[^a-z]+/, "").slice(0, 32) || "theme";
  let id = base;
  for (let n = 2; taken.includes(id) || !THEME_ID.test(id); n++) id = `${base}-${n}`;
  return id;
}

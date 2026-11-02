import { darkTheme, defaultTheme, parseTheme, type Theme, type ThemeRecord, type ThemeSummary } from "@supergrid/theme";
import * as React from "react";
import { sg } from "~/lib/bridge";
import type { Workspace } from "~/lib/mock";

// A workspace's themes, for the Design page. Inside the app they come from the workspace over RPC
// (listThemes, readTheme, saveTheme…); in a browser, or when the workspace cannot be reached, a
// local in-memory copy stands in so the editor still works, with `source` saying which it is.

export type ThemesSource = "workspace" | "local";
export type ThemesState = { records: ThemeRecord[]; loading: boolean; error: string | null; source: ThemesSource; loaded: boolean };

type Store = {
  state: ThemesState;
  listeners: Set<() => void>;
  inflight: Promise<void> | null;
};

const stores = new Map<string, Store>();
const localDocs = new Map<string, Map<string, ThemeRecord>>();
const stamp = () => new Date().toISOString();

function seedLocal(ws: Workspace): Map<string, ThemeRecord> {
  let docs = localDocs.get(ws.id);
  if (docs) return docs;
  docs = new Map();
  // the mock workspace's old accent becomes the primary of its default theme, so each mock workspace differs
  const seed = ws.theme ? { ...defaultTheme, name: `${ws.name} default`, colors: { ...defaultTheme.colors, primary: ws.theme.accent, background: ws.theme.bg, foreground: ws.theme.fg } } : defaultTheme;
  docs.set("default", { theme: parseTheme(seed), isDefault: true, created_at: stamp(), updated_at: stamp() });
  docs.set("dark", { theme: { ...darkTheme, colors: { ...darkTheme.colors } }, isDefault: false, created_at: stamp(), updated_at: stamp() });
  localDocs.set(ws.id, docs);
  return docs;
}

function store(ws: Workspace): Store {
  let s = stores.get(ws.id);
  if (!s) {
    s = { state: { records: [], loading: false, error: null, source: sg ? "workspace" : "local", loaded: false }, listeners: new Set(), inflight: null };
    stores.set(ws.id, s);
  }
  return s;
}

function set(s: Store, patch: Partial<ThemesState>) {
  s.state = { ...s.state, ...patch };
  for (const l of s.listeners) l();
}

async function rpc<T>(ws: Workspace, method: string, args: unknown[] = []): Promise<T> {
  if (!sg) throw new Error("not in the app");
  return (await sg.ws.rpc(ws.id, method, args)) as T;
}

const sortRecords = (list: ThemeRecord[]) => [...list].sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.theme.name.localeCompare(b.theme.name));

async function load(ws: Workspace, s: Store): Promise<void> {
  if (!sg) {
    set(s, { records: sortRecords([...seedLocal(ws).values()]), source: "local", loaded: true, loading: false, error: null });
    return;
  }
  set(s, { loading: true });
  try {
    const summaries = await rpc<ThemeSummary[]>(ws, "listThemes");
    const records = await Promise.all(summaries.map(async (sum) => ({ theme: await rpc<Theme>(ws, "readTheme", [sum.id]), isDefault: sum.isDefault, created_at: null, updated_at: sum.updated_at })));
    set(s, { records: sortRecords(records), source: "workspace", loaded: true, loading: false, error: null });
  } catch (e) {
    // keep editing against a local copy, and say so
    set(s, { records: sortRecords([...seedLocal(ws).values()]), source: "local", loaded: true, loading: false, error: (e as Error).message });
  }
}

export function refreshThemes(ws: Workspace): Promise<void> {
  const s = store(ws);
  s.inflight ??= load(ws, s).finally(() => { s.inflight = null; });
  return s.inflight;
}

export async function saveTheme(ws: Workspace, theme: Theme): Promise<ThemeRecord> {
  const s = store(ws);
  const clean = parseTheme(theme);
  let rec: ThemeRecord;
  if (s.state.source === "workspace") {
    rec = await rpc<ThemeRecord>(ws, "saveTheme", [clean]);
  } else {
    const docs = seedLocal(ws);
    const prev = docs.get(clean.id);
    rec = { theme: clean, isDefault: prev?.isDefault ?? docs.size === 0, created_at: prev?.created_at ?? stamp(), updated_at: stamp() };
    docs.set(clean.id, rec);
  }
  set(s, { records: sortRecords([...s.state.records.filter((r) => r.theme.id !== rec.theme.id), rec]) });
  return rec;
}

export async function removeTheme(ws: Workspace, id: string): Promise<void> {
  const s = store(ws);
  if (s.state.source === "workspace") await rpc(ws, "removeTheme", [id]);
  else {
    const docs = seedLocal(ws);
    if (docs.get(id)?.isDefault) throw new Error("the default theme cannot be removed; make another the default first");
    docs.delete(id);
  }
  set(s, { records: s.state.records.filter((r) => r.theme.id !== id) });
}

export async function setDefaultTheme(ws: Workspace, id: string): Promise<void> {
  const s = store(ws);
  if (s.state.source === "workspace") await rpc(ws, "setDefaultTheme", [id]);
  else for (const [k, r] of seedLocal(ws)) r.isDefault = k === id;
  set(s, { records: sortRecords(s.state.records.map((r) => ({ ...r, isDefault: r.theme.id === id }))) });
}

/** A free id for a copy: `name` slugged, numbered if taken. */
export function freeThemeId(records: ThemeRecord[], name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 36) || "theme";
  const taken = new Set(records.map((r) => r.theme.id));
  if (!taken.has(base)) return base;
  for (let i = 2; i < 100; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
  return `${base}-${Date.now().toString(36)}`;
}

export function useThemes(ws: Workspace): ThemesState & { refresh: () => Promise<void> } {
  const s = store(ws);
  const state = React.useSyncExternalStore(
    React.useCallback((cb) => { s.listeners.add(cb); return () => { s.listeners.delete(cb); }; }, [s]),
    () => s.state,
    () => s.state,
  );
  React.useEffect(() => { if (!s.state.loaded && !s.inflight) void refreshThemes(ws); }, [ws, s]);
  return { ...state, refresh: React.useCallback(() => refreshThemes(ws), [ws]) };
}

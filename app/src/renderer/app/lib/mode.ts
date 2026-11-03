import * as React from "react";
import type { WorkspaceMode, WorkspaceSummary } from "../../../shared/bridge";
import { refreshLocalApps } from "~/lib/apps";
import { sg } from "~/lib/bridge";
import { clean } from "~/lib/workspaces";

// Live or Dev, per workspace (WORKSPACE-REPO.md §9): the desktop's mode for it, kept here and in localStorage so a
// relaunch comes back in the same mode. Dev starts the workspace's dev server on this Mac through the main process
// (src/main/apps.ts) and keeps the summary it answers with (localhost URL, the repo's apps); the shell shows that
// workspace instead of the deployed one while the mode is Dev. Live stops the server.

export type { WorkspaceMode };

type Entry = {
  mode: WorkspaceMode;
  /** The Dev summary from main, once the dev server answers; null in Live or while Dev is starting. */
  summary: WorkspaceSummary | null;
  switching: boolean;
  error: string | null;
};

const store = new Map<string, Entry>();
const listeners = new Set<() => void>();
const key = (wsId: string) => `sg.mode.${wsId}`;
const stored = (wsId: string): WorkspaceMode => { try { return localStorage.getItem(key(wsId)) === "dev" ? "dev" : "live"; } catch { return "live"; } };
const entry = (wsId: string): Entry => store.get(wsId) ?? { mode: stored(wsId), summary: null, switching: false, error: null };
function patch(wsId: string, p: Partial<Entry>): void {
  store.set(wsId, { ...entry(wsId), ...p });
  for (const l of listeners) l();
}

/** The mode the shell is in for a workspace right now, for code outside React (the agent's context block). */
export const currentMode = (wsId: string): WorkspaceMode => entry(wsId).mode;

/** Switches a workspace's mode. Dev resolves once the dev server answers; the error stays in the entry and is thrown. */
export async function setMode(wsId: string, mode: WorkspaceMode): Promise<void> {
  if (!sg) return;
  patch(wsId, { switching: true, error: null });
  try {
    const summary = await sg.ws.setMode(wsId, mode);
    try { localStorage.setItem(key(wsId), mode); } catch {}
    patch(wsId, { mode, summary: mode === "dev" ? summary : null, switching: false });
  } catch (e) {
    patch(wsId, { switching: false, error: clean(e) });
    throw e;
  }
}

/** Reads the Dev summary again (after an app was added, the dev server restarted). */
export async function refreshMode(wsId: string): Promise<void> {
  if (!sg || entry(wsId).mode !== "dev") return;
  const summary = await sg.ws.get(wsId).catch(() => null);
  patch(wsId, { summary: summary?.dev ? summary : null });
}

/**
 * Tells the main process the mode this window remembers for a workspace, once per open: a relaunch in Dev starts the
 * dev server again, and the repo on this Mac is found or made either way.
 */
const ensured = new Set<string>();
export function ensureMode(wsId: string): void {
  if (!sg || ensured.has(wsId)) return;
  ensured.add(wsId);
  const e = entry(wsId);
  if (e.mode === "dev" && !e.summary) void setMode(wsId, "dev").catch(() => undefined);
  else void sg.apps.repo(wsId).catch(() => undefined);
}

// main says when what a workspace serves changed (the agent added an app, a deploy, the dev server went away): read it again
sg?.ws.onChanged((wsId) => {
  refreshLocalApps(wsId);
  void refreshMode(wsId);
});

export function useMode(wsId: string): Entry & { setMode: (mode: WorkspaceMode) => Promise<void>; refresh: () => Promise<void> } {
  const e = React.useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => store.get(wsId),
    () => store.get(wsId),
  );
  const set = React.useCallback((mode: WorkspaceMode) => setMode(wsId, mode), [wsId]);
  const refresh = React.useCallback(() => refreshMode(wsId), [wsId]);
  return { ...(e ?? entry(wsId)), setMode: set, refresh };
}

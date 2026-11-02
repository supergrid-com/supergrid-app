import * as React from "react";
import type { CloudflareLink, LocalState, Org } from "../../../shared/bridge";
import { sg } from "~/lib/bridge";

// Organizations and the one that is open. Inside the app they live in the main process's config
// file, written to disk at once, so they survive restarts (a dev restart can kill the window
// before Chromium flushes localStorage) and don't depend on the page's address. In a plain browser
// they fall back to localStorage. An organization is a name for a set of workspaces on one
// Cloudflare account; nothing here holds a credential, cf keeps its own login.

export type { CloudflareLink, Org };

const KEY = "sg.orgs";
const CURRENT = "sg.org";
const listeners = new Set<() => void>();
/** Null until loaded. */
let state: LocalState | null = null;

function emit(next: LocalState): void {
  state = next;
  for (const l of listeners) l();
}

function fromLocalStorage(): LocalState {
  try {
    const orgs = JSON.parse(localStorage.getItem(KEY) ?? "[]") as unknown;
    return { orgs: Array.isArray(orgs) ? (orgs as Org[]) : [], currentOrg: localStorage.getItem(CURRENT) };
  } catch {
    return { orgs: [], currentOrg: null };
  }
}

function persist(patch: Partial<LocalState>): void {
  if (sg) {
    void sg.state.write(patch);
    return;
  }
  try {
    if (patch.orgs) localStorage.setItem(KEY, JSON.stringify(patch.orgs));
    if (patch.currentOrg !== undefined) localStorage.setItem(CURRENT, patch.currentOrg ?? "");
  } catch {}
}

/** In dev, a reload can land a moment before the main process restarts with its handlers: retry briefly. */
async function readSaved(): Promise<LocalState | null> {
  for (let i = 0; i < 10; i++) {
    try {
      return await sg!.state.read();
    } catch {
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  return null;
}

async function load(): Promise<void> {
  if (!sg) return emit(fromLocalStorage());
  const saved = await readSaved();
  if (!saved) return emit(fromLocalStorage());
  // Organizations made before they moved to the config file are carried over once.
  const old = fromLocalStorage();
  if (!saved.orgs.length && old.orgs.length) {
    await sg.state.write(old);
    return emit(old);
  }
  emit(saved);
}
void load();

function update(patch: Partial<LocalState>): void {
  const next = { ...(state ?? { orgs: [], currentOrg: null }), ...patch };
  emit(next);
  persist(patch);
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

/** Everything kept, or null while it loads. */
export function useLocalState(): LocalState | null {
  return React.useSyncExternalStore(subscribe, () => state, () => state);
}

export function useOrgs(): Org[] {
  return useLocalState()?.orgs ?? [];
}

export function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32);
}

export function setCurrentOrg(id: string): void {
  update({ currentOrg: id });
}

export function addOrg(name: string, cloudflare: CloudflareLink | null): Org {
  const orgs = state?.orgs ?? [];
  const base = slugify(name) || "org";
  let slug = base;
  for (let n = 2; orgs.some((o) => o.slug === slug); n++) slug = `${base}-${n}`;
  const org: Org = { id: slug, name, slug, createdAt: new Date().toISOString().slice(0, 10), cloudflare };
  update({ orgs: [...orgs, org], currentOrg: org.id });
  return org;
}

export function updateOrg(id: string, patch: Partial<Omit<Org, "id">>): void {
  update({ orgs: (state?.orgs ?? []).map((o) => (o.id === id ? { ...o, ...patch } : o)) });
}

export function removeOrg(id: string): void {
  const orgs = (state?.orgs ?? []).filter((o) => o.id !== id);
  update({ orgs, currentOrg: state?.currentOrg === id ? (orgs[0]?.id ?? null) : (state?.currentOrg ?? null) });
}

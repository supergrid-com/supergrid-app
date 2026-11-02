import * as React from "react";
import { navIcons, type NavIconName } from "~/components/workspace/nav-icons";
import type { WorkspacePage } from "~/lib/workspace-page";
import type { Workspace } from "~/lib/mock";
import navJson from "~/lib/nav.json";

// The main nav is data: an ordered list of entries the workspace owner can arrange.
// An item points at a section (`home`, `contacts`, `media`…) and may override its label, icon
// and icon color. A group is a titled run of items with optional dividers, inline in the rail.
// A menu is one rail item that opens a second panel, like Settings, with a title and its own
// items. Kept in memory for now; the default is the hard-coded layout in nav.json.
//
// Only sections that talk to the workspace are targets. App admin screens (an iframe at the
// app's admin URL), data tables, files, integrations, logging and the sitemap come back here
// once they have something real behind them.

export type NavTarget = "home" | "contacts" | "analytics" | "media" | "design" | "workflows" | "hooks" | "secrets";

export type NavItemConfig = { kind: "item"; target: NavTarget; label?: string; icon?: NavIconName; color?: string };
export type NavGroupConfig = { kind: "group"; id: string; title?: string; dividerAbove?: boolean; dividerBelow?: boolean; items: NavItemConfig[] };
export type NavMenuConfig = { kind: "menu"; id: string; label: string; icon?: NavIconName; color?: string; title?: string; items: NavItemConfig[] };
export type NavEntry = NavItemConfig | NavGroupConfig | NavMenuConfig;
export type NavConfig = { version: 1; entries: NavEntry[] };

export type TargetMeta = { target: NavTarget; label: string; icon: NavIconName; page: WorkspacePage };

// Every section, in default order.
const sections: TargetMeta[] = [
  { target: "home", label: "Home", icon: "home", page: { kind: "home" } },
  { target: "contacts", label: "Contacts", icon: "users", page: { kind: "contacts" } },
  { target: "analytics", label: "Analytics", icon: "chart", page: { kind: "analytics" } },
  { target: "media", label: "Assets", icon: "image", page: { kind: "media" } },
  { target: "design", label: "Design", icon: "palette", page: { kind: "design" } },
  { target: "workflows", label: "Workflows", icon: "workflow", page: { kind: "workflows" } },
  { target: "hooks", label: "Hooks", icon: "zap", page: { kind: "hooks" } },
  { target: "secrets", label: "Secrets", icon: "key", page: { kind: "secrets" } },
];

// Everything a workspace's nav can point at. Takes the workspace so per-workspace targets (the
// installed apps' admin screens) can slot in later without changing callers.
export function targetsFor(_ws: Workspace): TargetMeta[] {
  return sections;
}

export function targetMeta(ws: Workspace, target: NavTarget): TargetMeta | undefined {
  return targetsFor(ws).find((t) => t.target === target);
}

const defaults = new Map<string, NavConfig>();

// The default nav is nav.json: plain rows up top, a titled "Content" group and a "Developer"
// group with a line above it. Sanitizing drops anything the JSON names that is not a target.
// Stable per workspace: useSyncExternalStore wants the same object back.
export function defaultNavConfig(ws: Workspace): NavConfig {
  let cfg = defaults.get(ws.id);
  if (cfg) return cfg;
  cfg = sanitize(ws, navJson);
  defaults.set(ws.id, cfg);
  return cfg;
}

// The menu, if any, that the current page belongs to: it keeps its panel open.
export function menuFor(config: NavConfig, page: WorkspacePage): NavMenuConfig | undefined {
  return config.entries.find((e): e is NavMenuConfig => e.kind === "menu" && e.items.some((it) => isPageFor(it.target, page)));
}

export function isPageFor(target: NavTarget, page: WorkspacePage): boolean {
  // custom objects live under Contacts, so the rail keeps that row lit
  if (target === "contacts") return page.kind === "contacts" || page.kind === "objects";
  return page.kind === target;
}

// Keeps a stored config honest: known targets only, known icons only, no duplicates.
export function sanitize(ws: Workspace, raw: unknown): NavConfig {
  const known = new Set(targetsFor(ws).map((t) => t.target));
  const seen = new Set<NavTarget>();
  const item = (x: unknown): NavItemConfig | null => {
    if (!x || typeof x !== "object") return null;
    const o = x as Record<string, unknown>;
    const target = o.target as NavTarget;
    if (!known.has(target) || seen.has(target)) return null;
    seen.add(target);
    const out: NavItemConfig = { kind: "item", target };
    if (typeof o.label === "string" && o.label.trim()) out.label = o.label.trim();
    if (typeof o.icon === "string" && o.icon in navIcons) out.icon = o.icon as NavIconName;
    if (typeof o.color === "string" && /^#[0-9a-f]{6}$/i.test(o.color)) out.color = o.color;
    return out;
  };
  const entries: NavEntry[] = [];
  const list = raw && typeof raw === "object" && Array.isArray((raw as { entries?: unknown }).entries) ? ((raw as { entries: unknown[] }).entries) : [];
  let n = 0;
  for (const e of list) {
    if (!e || typeof e !== "object") continue;
    const o = e as Record<string, unknown>;
    if (o.kind === "menu") {
      const items = (Array.isArray(o.items) ? o.items : []).map(item).filter((i): i is NavItemConfig => !!i);
      entries.push({
        kind: "menu",
        id: typeof o.id === "string" && o.id ? o.id : `m${++n}`,
        label: typeof o.label === "string" && o.label.trim() ? o.label.trim() : "Menu",
        icon: typeof o.icon === "string" && o.icon in navIcons ? (o.icon as NavIconName) : undefined,
        color: typeof o.color === "string" && /^#[0-9a-f]{6}$/i.test(o.color) ? o.color : undefined,
        title: typeof o.title === "string" && o.title.trim() ? o.title.trim() : undefined,
        items,
      });
    } else if (o.kind === "group") {
      const items = (Array.isArray(o.items) ? o.items : []).map(item).filter((i): i is NavItemConfig => !!i);
      entries.push({
        kind: "group",
        id: typeof o.id === "string" && o.id ? o.id : `g${++n}`,
        title: typeof o.title === "string" && o.title.trim() ? o.title.trim() : undefined,
        dividerAbove: !!o.dividerAbove,
        dividerBelow: !!o.dividerBelow,
        items,
      });
    } else {
      const i = item(o);
      if (i) entries.push(i);
    }
  }
  return { version: 1, entries };
}

// ---- storage: in memory for now, so every load starts from the default and the editor's
// changes last until the page reloads. (localStorage persistence was here; it can come back
// once the shape settles.) The subscription keeps the rail and the editor in step. ----

const listeners = new Set<() => void>();
const overrides = new Map<string, NavConfig>();

export function readNavConfig(ws: Workspace): NavConfig {
  return overrides.get(ws.id) ?? defaultNavConfig(ws);
}

export function writeNavConfig(ws: Workspace, cfg: NavConfig): void {
  overrides.set(ws.id, sanitize(ws, cfg));
  for (const l of listeners) l();
}

export function resetNavConfig(ws: Workspace): void {
  overrides.delete(ws.id);
  for (const l of listeners) l();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useNavConfig(ws: Workspace): { config: NavConfig; isDefault: boolean; set: (cfg: NavConfig) => void; reset: () => void } {
  const config = React.useSyncExternalStore(
    subscribe,
    () => readNavConfig(ws),
    () => defaultNavConfig(ws),
  );
  const isDefault = React.useSyncExternalStore(
    subscribe,
    () => !overrides.has(ws.id),
    () => true,
  );
  return {
    config,
    isDefault,
    set: React.useCallback((cfg: NavConfig) => writeNavConfig(ws, cfg), [ws]),
    reset: React.useCallback(() => resetNavConfig(ws), [ws]),
  };
}

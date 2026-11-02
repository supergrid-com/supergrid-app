import * as React from "react";
import { navIcons, type NavIconName } from "~/components/workspace/nav-icons";
import type { WorkspacePage } from "~/lib/workspace-page";
import { type AppId, catalog, type Workspace } from "~/lib/mock";

// The main nav is data: an ordered list of entries the workspace owner can arrange.
// An item points at a section (`home`, `data`, `app:pages`…) and may override its label, icon
// and icon color. A group is a titled run of items with optional dividers, inline in the rail.
// A menu is one rail item that opens a second panel, like Settings, with a title and its own
// items. Kept in memory for now, with a default built from what the workspace
// has installed.

export type NavTarget = "home" | "data" | "analytics" | "contacts" | "workflows" | "integrations" | "media" | "sitemap" | "design" | "files" | "secrets" | "logging" | `app:${AppId}`;

export type NavItemConfig = { kind: "item"; target: NavTarget; label?: string; icon?: NavIconName; color?: string };
export type NavGroupConfig = { kind: "group"; id: string; title?: string; dividerAbove?: boolean; dividerBelow?: boolean; items: NavItemConfig[] };
export type NavMenuConfig = { kind: "menu"; id: string; label: string; icon?: NavIconName; color?: string; title?: string; items: NavItemConfig[] };
export type NavEntry = NavItemConfig | NavGroupConfig | NavMenuConfig;
export type NavConfig = { version: 1; entries: NavEntry[] };

export type TargetMeta = { target: NavTarget; label: string; icon: NavIconName; page: WorkspacePage };

// The sections before the apps and after them, in default order.
const before: TargetMeta[] = [
  { target: "home", label: "Home", icon: "home", page: { kind: "home" } },
  { target: "analytics", label: "Analytics", icon: "chart", page: { kind: "analytics" } },
  { target: "contacts", label: "Contacts", icon: "users", page: { kind: "contacts" } },
  { target: "data", label: "Data", icon: "table", page: { kind: "data" } },
];
const after: TargetMeta[] = [
  { target: "workflows", label: "Workflows", icon: "workflow", page: { kind: "workflows" } },
  { target: "integrations", label: "Integrations", icon: "plug", page: { kind: "integrations" } },
  { target: "media", label: "Media", icon: "image", page: { kind: "media" } },
  { target: "sitemap", label: "Sitemap", icon: "sitemap", page: { kind: "sitemap" } },
  { target: "design", label: "Design", icon: "palette", page: { kind: "design" } },
  { target: "files", label: "Files", icon: "file", page: { kind: "files" } },
  { target: "secrets", label: "Secrets", icon: "key", page: { kind: "secrets" } },
  { target: "logging", label: "Logging", icon: "logs", page: { kind: "logging" } },
];

const appIcon: Record<AppId, NavIconName> = { pages: "pages", funnels: "funnel", forms: "forms", hello: "hand" };

// Everything a workspace's nav can point at.
export function targetsFor(ws: Workspace): TargetMeta[] {
  const apps = ws.installs
    .map((i) => catalog.find((a) => a.id === i.app))
    .filter((a): a is NonNullable<typeof a> => !!a && a.admin)
    .map<TargetMeta>((a) => ({ target: `app:${a.id}`, label: a.name, icon: appIcon[a.id] ?? "star", page: { kind: "app", app: a.id } }));
  return [...before, ...apps, ...after];
}

export function targetMeta(ws: Workspace, target: NavTarget): TargetMeta | undefined {
  return targetsFor(ws).find((t) => t.target === target);
}

const defaults = new Map<string, NavConfig>();

// The default nav shows what the config can do: plain rows up top, a titled "Content" group,
// a "Marketing" menu that opens its own panel, and a "Developer" group with lines around it.
// Apps land where they fit: Pages with content, Funnels and Forms in marketing, anything
// else with content. Stable per workspace: useSyncExternalStore wants the same object back.
export function defaultNavConfig(ws: Workspace): NavConfig {
  let cfg = defaults.get(ws.id);
  if (cfg) return cfg;
  const installed = new Set(targetsFor(ws).map((t) => t.target));
  const has = (t: NavTarget) => installed.has(t);
  const item = (target: NavTarget, extra: Partial<NavItemConfig> = {}): NavItemConfig => ({ kind: "item", target, ...extra });
  const marketing: NavItemConfig[] = [...(has("app:funnels") ? [item("app:funnels", { color: "#8b5cf6" })] : []), ...(has("app:forms") ? [item("app:forms", { color: "#14b8a6" })] : []), item("workflows")];
  const otherApps = [...installed].filter((t) => t.startsWith("app:") && !["app:pages", "app:funnels", "app:forms"].includes(t)).map((t) => item(t));
  cfg = {
    version: 1,
    entries: [
      item("home"),
      item("analytics"),
      item("contacts"),
      {
        kind: "group",
        id: "content",
        title: "Content",
        dividerAbove: true,
        items: [...(has("app:pages") ? [item("app:pages", { color: "#3b82f6" })] : []), item("media"), item("design"), item("sitemap"), ...otherApps],
      },
      { kind: "menu", id: "marketing", label: "Marketing", icon: "rocket", color: "#f59e0b", title: "Marketing", items: marketing },
      {
        kind: "group",
        id: "developer",
        title: "Developer",
        dividerAbove: true,
        items: [item("data"), item("integrations"), item("files"), item("secrets"), item("logging")],
      },
    ],
  };
  cfg = sanitize(ws, cfg);
  defaults.set(ws.id, cfg);
  return cfg;
}

// The menu, if any, that the current page belongs to: it keeps its panel open.
export function menuFor(config: NavConfig, page: WorkspacePage): NavMenuConfig | undefined {
  return config.entries.find((e): e is NavMenuConfig => e.kind === "menu" && e.items.some((it) => isPageFor(it.target, page)));
}

export function isPageFor(target: NavTarget, page: WorkspacePage): boolean {
  if (target.startsWith("app:")) return page.kind === "app" && page.app === target.slice(4);
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

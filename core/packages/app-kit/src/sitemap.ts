// The sitemap: where each app's pages live on the workspace domain, what "/" serves, and the redirects that keep old
// links alive. Pure functions only, shared by the workspace router and the desktop's Sitemap page, so the tester in the
// UI and the Worker cannot disagree. Validation and storage live in workspace/src/sitemap.ts.

export type SitemapRule = {
  id: string;
  /** An exact path (`/old-page`) or a prefix with everything under it (`/f/*`). */
  from: string;
  /** A path on this workspace or an absolute URL; `*` stands for what `/*` captured. */
  to: string;
  /** 302 unless the user marks it permanent. */
  status: 301 | 302;
  enabled: boolean;
  note?: string;
  /** `rename` rules are added when a mount changes, so the old prefix keeps working. */
  source: "user" | "rename";
  created_at: string;
};

export type Sitemap = {
  version: 1;
  /** Configured public prefix per installed app; null means no public pages. */
  mounts: Record<string, string | null>;
  /** What "/" serves: a page of an app (path relative to its mount), or null for the app mounted at "/". */
  home: { app: string; path: string } | null;
  /** Ordered; the first enabled match wins. */
  rules: SitemapRule[];
};

/** What `setSitemap` accepts: any part may be left out and keeps its current value; rule ids and timestamps are filled in. */
export type SitemapInput = {
  mounts?: Record<string, string | null>;
  home?: { app: string; path: string } | null;
  rules?: (Partial<SitemapRule> & { from: string; to: string })[];
};

/** Prefixes the workspace itself owns. A mount or a rule may not start at or under one. */
export const RESERVED_PREFIXES = ["/_ws", "/_app", "/admin", "/api"] as const;
/** `/`, or lowercase segments of letters, digits and dashes, no trailing slash. */
export const MOUNT_RE = /^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$/;

export const isReserved = (path: string): boolean => RESERVED_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));

/** Drops a trailing slash so `/old/` and `/old` are the same page. */
export const normalizePath = (path: string): string => (path.length > 1 && path.endsWith("/") ? path.replace(/\/+$/, "") || "/" : path);

/** Joins a mount and a path under it: `("/forms", "/thanks")` is `/forms/thanks`, `("/", "/thanks")` is `/thanks`. */
export function joinMount(mount: string, path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (mount === "/" || mount === "") return p;
  return p === "/" ? mount : mount + p;
}

/** The first enabled rule a path hits, with its target resolved. The query string travels unless the target has one. */
export function matchRule(rules: readonly SitemapRule[], pathname: string, search = ""): { rule: SitemapRule; to: string; status: 301 | 302 } | null {
  const path = normalizePath(pathname);
  for (const rule of rules) {
    if (!rule.enabled) continue;
    let to: string | null = null;
    if (rule.from.endsWith("/*")) {
      const prefix = rule.from.slice(0, -2) || "/";
      const under = prefix === "/" ? path !== "/" : path === prefix || path.startsWith(prefix + "/");
      if (!under) continue;
      const rest = prefix === "/" ? path : path.slice(prefix.length); // "" or "/something"
      to = rule.to.includes("*") ? rule.to.replace(/\/?\*/, rest) : rule.to;
    } else if (path === normalizePath(rule.from)) {
      to = rule.to;
    }
    if (to == null) continue;
    if (search && !to.includes("?")) to += search;
    return { rule, to, status: rule.status };
  }
  return null;
}

/** Which app's public mount owns a path: the longest mount that is the path or a parent of it. */
export function publicOwner(mounts: readonly { app: string; mount: string }[], pathname: string): string | null {
  const path = normalizePath(pathname);
  const hit = mounts
    .filter(({ mount }) => mount === "/" || path === mount || path.startsWith(mount + "/"))
    .sort((a, b) => b.mount.length - a.mount.length)[0];
  return hit?.app ?? null;
}

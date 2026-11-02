// The sitemap setting: what the workspace wants its paths to be. Mounts and the homepage are desired state that an app
// build applies (ROUTES then carries what was built); redirect rules apply here, on every request. See ../SITEMAP.md.
import type { Sitemap, SitemapInput, SitemapRule } from "@supergrid/app-kit/rpc";
import { isReserved, matchRule, MOUNT_RE, normalizePath } from "@supergrid/app-kit/sitemap";
import { nid, now } from "./ids";
import type { Env } from "./types";
import { bool, invalid, list, obj, oneOf, opt, str } from "./validate";

const KEY = "sitemap";
const MAX_RULES = 500;
const PATH_RE = /^\/[A-Za-z0-9\-._~%/]*$/;
const TARGET_RE = /^\/[A-Za-z0-9\-._~%/*]*(\?[^\s#]*)?$/;

/** What a workspace with no setting yet looks like: every app at the mount it was built with. */
export function defaultSitemap(env: Env): Sitemap {
  const mounts = Object.fromEntries(env.ROUTES.map((r) => [r.app, r.public ?? null]));
  const home = env.ROUTES.find((r) => r.home && r.public);
  return { version: 1, mounts, home: home ? { app: home.app, path: home.home! } : null, rules: [] };
}

/** The stored document over the defaults. Apps no longer installed drop out; apps installed since appear at their built mount. */
function merge(env: Env, stored: Partial<Sitemap> | null): Sitemap {
  const base = defaultSitemap(env);
  if (!stored) return base;
  const mounts = { ...base.mounts };
  for (const app of Object.keys(mounts)) if (stored.mounts && app in stored.mounts) mounts[app] = stored.mounts[app] ?? null;
  const home = stored.home && stored.home.app in mounts && mounts[stored.home.app] ? stored.home : stored.home === null ? null : base.home;
  return { version: 1, mounts, home, rules: Array.isArray(stored.rules) ? stored.rules : [] };
}

// One isolate reads the setting at most every CACHE_TTL ms; a save elsewhere shows up within that.
const CACHE_TTL = 10_000;
let cache: { at: number; value: Promise<Sitemap> } | null = null;

export function getSitemap(env: Env): Promise<Sitemap> {
  if (cache && Date.now() - cache.at < CACHE_TTL) return cache.value;
  const at = Date.now();
  const value = env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind(KEY).first<{ value: string }>()
    .then((row) => merge(env, row ? (JSON.parse(row.value) as Partial<Sitemap>) : null));
  cache = { at, value };
  value.catch(() => { if (cache?.at === at) cache = null; });
  return value;
}

/** The rules the router applies, in order. */
export async function activeRules(env: Env): Promise<SitemapRule[]> {
  return (await getSitemap(env)).rules.filter((r) => r.enabled);
}

function mount(v: unknown, name: string): string | null {
  if (v == null || v === "") return null;
  const m = normalizePath(str(v, name, { max: 200 }));
  if (!MOUNT_RE.test(m)) return invalid(`${name} must be / or lowercase segments like /forms or /shop/eu`);
  if (isReserved(m)) return invalid(`${name} may not start with ${m.split("/")[1] ? "/" + m.split("/")[1] : m}, the workspace uses it`);
  return m;
}

function path(v: unknown, name: string): string {
  const p = normalizePath(str(v, name, { max: 500 }));
  if (!PATH_RE.test(p) || p.includes("..")) return invalid(`${name} must be a path such as /thanks`);
  return p;
}

function rule(v: unknown, i: number, existing: Map<string, SitemapRule>): SitemapRule {
  const r = obj(v, `rules[${i}]`);
  const name = `rules[${i}]`;
  const id = typeof r.id === "string" && existing.has(r.id) ? r.id : nid();
  const was = existing.get(id);
  const raw = str(r.from, `${name}.from`, { max: 500 });
  const wild = raw.endsWith("/*");
  const prefix = normalizePath(wild ? raw.slice(0, -2) || "/" : raw);
  if (!PATH_RE.test(prefix) || prefix.includes("..")) return invalid(`${name}.from must be a path such as /old-page or /f/*`);
  if (wild && prefix === "/") return invalid(`${name}.from /* would catch every page`);
  const from = wild ? `${prefix}/*` : prefix;
  if (isReserved(prefix)) return invalid(`${name}.from may not start under ${prefix.split("/").slice(0, 2).join("/")}, the workspace uses it`);
  const to = str(r.to, `${name}.to`, { max: 2000 });
  if (!/^https?:\/\/[^\s]+$/.test(to) && !(TARGET_RE.test(to) && !to.includes(".."))) return invalid(`${name}.to must be a path on this site or an http(s) URL`);
  const status = r.status == null ? (was?.status ?? 302) : Number(r.status);
  if (status !== 301 && status !== 302) return invalid(`${name}.status must be 301 or 302`);
  return {
    id, from, to, status, enabled: bool(r.enabled, true), note: opt(r.note, `${name}.note`, { max: 200 }) ?? undefined,
    source: oneOf(r.source, `${name}.source`, ["user", "rename"], was?.source ?? "user"), created_at: was?.created_at ?? now(),
  };
}

/** Checks a document against what is installed and returns it normalized. Parts left out keep their current value. */
export function parseSitemap(env: Env, input: SitemapInput, current: Sitemap): Sitemap {
  const installed = new Set(env.ROUTES.map((r) => r.app));
  const mounts = { ...current.mounts };
  if (input.mounts != null) {
    for (const [app, v] of Object.entries(obj(input.mounts, "mounts"))) if (installed.has(app)) mounts[app] = mount(v, `mounts.${app}`);
  }
  const seen = new Map<string, string>();
  for (const [app, m] of Object.entries(mounts)) {
    if (!m) continue;
    const other = seen.get(m);
    if (other) return invalid(`${app} and ${other} cannot both be mounted at ${m}`);
    seen.set(m, app);
  }

  let home = current.home;
  if (input.home !== undefined) {
    if (input.home === null) home = null;
    else {
      const h = obj(input.home, "home");
      const app = str(h.app, "home.app", { max: 40 });
      if (!installed.has(app)) return invalid(`home.app ${app} is not installed`);
      if (!mounts[app]) return invalid(`${app} has no public pages to use as the homepage`);
      home = { app, path: path(h.path ?? "/", "home.path") };
    }
  }

  const existing = new Map(current.rules.map((r) => [r.id, r]));
  const rules = input.rules == null ? current.rules : list(input.rules, "rules", MAX_RULES).map((r, i) => rule(r, i, existing));
  return { version: 1, mounts, home, rules };
}

/** A mount change keeps the old prefix alive with a permanent redirect; renaming again points the older ones at the newest. */
function withRenames(before: Sitemap, next: Sitemap): SitemapRule[] {
  let rules = [...next.rules];
  for (const [app, to] of Object.entries(next.mounts)) {
    const from = before.mounts[app];
    if (!from || !to || from === to || from === "/" || to === "/") continue;
    rules = rules.map((r) => (r.source === "rename" && r.to === `${from}/*` ? { ...r, to: `${to}/*` } : r));
    // Coming back to a prefix: the rule that sent it away would now hide the app.
    rules = rules.filter((r) => !(r.source === "rename" && r.from === `${to}/*`));
    if (!rules.some((r) => r.from === `${from}/*`)) {
      rules.push({ id: nid(), from: `${from}/*`, to: `${to}/*`, status: 301, enabled: true, source: "rename", note: `${app} moved from ${from} to ${to}`, created_at: now() });
    }
  }
  return rules;
}

/** The rules a save ends up with: the input's plus the renames it implies, refused when one would hide an app or chain. */
export function planRules(before: Sitemap, next: Sitemap): SitemapRule[] {
  const rules = withRenames(before, next);
  check({ ...next, rules });
  return rules;
}

function check(next: Sitemap): void {
  const taken = new Map(Object.entries(next.mounts).filter(([, m]) => m).map(([app, m]) => [m!, app]));
  for (const r of next.rules) {
    if (!r.enabled) continue;
    if (r.from.endsWith("/*")) {
      const app = taken.get(r.from.slice(0, -2));
      if (app) return invalid(`rule ${r.from} would hide every page of ${app}; delete it or move the app first`);
    }
    if (r.to.startsWith("/")) {
      const again = matchRule(next.rules, r.to.split("?")[0]);
      if (again) return invalid(`rule ${r.from} sends to ${r.to}, which rule ${again.rule.from} redirects again`);
    }
  }
}

export async function setSitemap(env: Env, input: SitemapInput): Promise<Sitemap> {
  const current = await getSitemap(env);
  const next = parseSitemap(env, input, current);
  next.rules = planRules(current, next);
  await env.DB.prepare("INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at")
    .bind(KEY, JSON.stringify(next)).run();
  cache = null;
  return next;
}

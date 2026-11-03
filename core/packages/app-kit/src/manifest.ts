// The manifest: the one file that tells the core everything about an app (docs/manifest.md). Declared in the
// repo as supergrid.app.json, read by the app's own build, by the desktop at install, and served back by the
// running app at /_app/<id>/manifest.json with what only the code knows (its operations).
//
// `AppManifest` is the loose shape a JSON import has (every string widened). `parseManifest` checks a document
// and returns `Manifest`, the strict one the rest of the kit works with.

/** One admin menu entry. Paths are relative to /admin/<id>; `/` is the app's first screen. */
export type NavItem = {
  /** Stable key for the shell to remember folds and order by; defaults to the path. */
  id?: string;
  label: string;
  path: string;
  /** A name from the shell's icon set (lucide), so every app's menu reads the same. */
  icon?: string;
  /** Nested entries, drawn as a titled group under this one. */
  children?: NavItem[];
  /** Extra paths that keep this item lit (`/answers/*`). */
  match?: string[];
  /** `settings`: shown under the workspace's settings for this app rather than in its menu. */
  place?: string;
};

export type FieldType = "id" | "string" | "slug" | "text" | "number" | "integer" | "boolean" | "datetime" | "json" | "ref" | "enum" | "media";

/** One column of an entity, in words the agent, the Database pages and a form can all use. */
export type Field = {
  type: FieldType | (string & {});
  label?: string;
  description?: string;
  required?: boolean;
  unique?: boolean;
  /** `enum`: the allowed values. */
  values?: string[];
  /** `ref`: `<app>.<entity>` or `core.contact`; `onDelete` is what the generated table does. */
  to?: string;
  onDelete?: "cascade" | "set null" | "restrict" | (string & {});
  /** `json`: a JSON Schema for the value, for agents. */
  schema?: Record<string, unknown>;
  /** A default the generated column carries, as SQL (`'draft'`, `0`, `(datetime('now'))`). */
  default?: string;
  /** `text`: marks the field as worth searching. */
  search?: boolean;
  /** `media`: which kinds the picker offers. */
  media?: ("image" | "video" | "audio" | "file" | (string & {}))[];
};

/** Where an entity's rows are seen: templates over its fields (`/:id`, `/form/:slug`). Admin paths are under /admin/<id>; public ones under the mount. */
export type Locate = { list?: string; view?: string; edit?: string };

/** One kind of row the app keeps, descriptive: migrations still create the table (data.ts can write the first one). */
export type Entity = {
  label: string;
  plural?: string;
  description?: string;
  /** The table, `app_<id>_<something>`; defaults to `app_<id>_<key>`. */
  table?: string;
  /** The field that names a row. */
  title?: string;
  fields: Record<string, Field>;
  admin?: Locate;
  public?: Locate;
};

export type PackageExport = { name: string; /** Folder inside the app repo. */ path: string; description?: string };
export type PackageUse = { name: string; /** The app that exports it, when it is one of ours. */ app?: string; version?: string };

export type AppManifest = {
  id: string;
  name: string;
  version: string;
  description?: string;
  /** An inline SVG (24×24, `currentColor`), as from icon-sets.iconify.design, or a file in the repo the release inlines. */
  icon?: string;
  /** The tile color behind the icon, a hex. */
  color?: string;
  category?: string;
  /** Where updates come from; absent for an app that is the user's own. */
  upstream?: string;
  /** Omit for an admin-only app. `home` is a page under the mount that is also served as `/`. */
  public?: { mount: string; home?: string };
  admin?: { nav: NavItem[]; /** The "+ New" entries the shell offers for this app. */ create?: { label: string; path: string }[] };
  /** Serves /api/<id>/*: resource routes, and the operations endpoints when `operations` is on. */
  api?: boolean;
  /** The app declares operations in workers/app.ts; they are served as REST and MCP under /api/<id>. */
  operations?: boolean;
  data?: Record<string, Entity>;
  /** Kept for apps written before `data`; the tables the app creates. */
  tables?: string[];
  packages?: { exports?: PackageExport[]; uses?: PackageUse[] };
  permissions?: string[];
  /** Event names the app handles; the workspace POSTs each to /_app/<id>/hook. */
  subscribes?: string[];
  requires?: { workspace?: number; apps?: Record<string, string> };
};

import type { EntityDescription } from "./data";
import type { OperationSummary } from "./operations";
/** What the running app adds to its manifest when it serves it at /_app/<id>/manifest.json: the operations, the data as columns, and the build. */
export type ServedManifest = Omit<AppManifest, "operations"> & { served: true; operations: OperationSummary[]; entities: EntityDescription[]; build: { mode: string; at: string } };

/** A checked manifest: the same fields, with the ones the kit relies on made definite. */
export type Manifest = AppManifest & { nav: NavItem[]; entities: Record<string, Entity & { key: string; table: string; plural: string; title: string }>; tables: string[] };

export const assetPrefix = (m: Pick<AppManifest, "id">) => `/_app/${m.id}/assets/`;
export const adminMount = (m: Pick<AppManifest, "id">) => `/admin/${m.id}`;
export const apiMount = (m: Pick<AppManifest, "id">) => `/api/${m.id}`;
/** Where the running app serves its manifest, with the operations filled in. */
export const manifestPath = (m: Pick<AppManifest, "id">) => `/_app/${m.id}/manifest.json`;
export const tablePrefix = (m: Pick<AppManifest, "id">) => `app_${m.id.replace(/-/g, "_")}_`;

export const FIELD_TYPES: FieldType[] = ["id", "string", "slug", "text", "number", "integer", "boolean", "datetime", "json", "ref", "enum", "media"];
const ID_RE = /^[a-z][a-z0-9-]*$/;
const KEY_RE = /^[a-z][a-z0-9_]*$/;
const MOUNT_RE = /^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$/;

export class ManifestError extends Error {
  problems: string[];
  constructor(problems: string[]) {
    super(`The manifest has problems:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
    this.problems = problems;
  }
}

/** The problems with a manifest document, or none. */
export function checkManifest(raw: unknown): string[] {
  const out: string[] = [];
  const m = raw as AppManifest;
  if (!m || typeof m !== "object") return ["not an object"];
  if (typeof m.id !== "string" || !ID_RE.test(m.id) || m.id.length > 40) out.push("id: lowercase letters, digits and dashes, starting with a letter, up to 40 characters");
  if (typeof m.name !== "string" || !m.name.trim()) out.push("name: required");
  if (typeof m.version !== "string" || !/^\d+\.\d+\.\d+$/.test(m.version)) out.push("version: semver like 0.1.0");
  if (m.icon !== undefined && (typeof m.icon !== "string" || !(m.icon.trimStart().startsWith("<svg") || /\.svg$/.test(m.icon)))) out.push("icon: an inline <svg> or a path to an .svg file");
  if (m.icon && m.icon.trimStart().startsWith("<svg") && /<script|\son[a-z]+=/i.test(m.icon)) out.push("icon: no scripts or event handlers in the SVG");
  if (m.color !== undefined && !/^#[0-9a-f]{6}$/i.test(m.color)) out.push("color: a hex like #e8604a");
  if (m.public !== undefined) {
    if (!m.public || typeof m.public.mount !== "string" || !MOUNT_RE.test(m.public.mount)) out.push("public.mount: `/` or `/lowercase-segments`, no trailing slash");
    else if (/^\/(_ws|_app|admin|api)(\/|$)/.test(m.public.mount)) out.push("public.mount: /_ws, /_app, /admin and /api are the workspace's");
    if (m.public?.home !== undefined && (typeof m.public.home !== "string" || !m.public.home.startsWith("/"))) out.push("public.home: a path under the mount, starting with /");
  }
  if (m.admin !== undefined) {
    if (!m.admin || !Array.isArray(m.admin.nav)) out.push("admin.nav: a list of { label, path }");
    else {
      const walk = (items: NavItem[], where: string) => {
        for (const [i, it] of items.entries()) {
          const at = `${where}[${i}]`;
          if (!it || typeof it.label !== "string" || !it.label.trim()) out.push(`${at}.label: required`);
          if (!it || typeof it.path !== "string" || !it.path.startsWith("/")) out.push(`${at}.path: starts with /, relative to /admin/${m.id}`);
          if (it?.children) {
            if (!Array.isArray(it.children)) out.push(`${at}.children: a list`);
            else walk(it.children, `${at}.children`);
          }
        }
      };
      walk(m.admin.nav, "admin.nav");
    }
  }
  if (m.data !== undefined) {
    if (!m.data || typeof m.data !== "object" || Array.isArray(m.data)) out.push("data: an object of entities by key");
    else {
      const prefix = tablePrefix(m);
      for (const [key, e] of Object.entries(m.data)) {
        const at = `data.${key}`;
        if (!KEY_RE.test(key)) out.push(`${at}: keys are lowercase with underscores`);
        if (!e || typeof e !== "object") { out.push(`${at}: an entity`); continue; }
        if (typeof e.label !== "string" || !e.label.trim()) out.push(`${at}.label: required`);
        if (e.table !== undefined && (typeof e.table !== "string" || !e.table.startsWith(prefix))) out.push(`${at}.table: must start with ${prefix}`);
        if (!e.fields || typeof e.fields !== "object") { out.push(`${at}.fields: an object of fields`); continue; }
        if (!Object.values(e.fields).some((f) => f?.type === "id")) out.push(`${at}.fields: one field of type id`);
        for (const [fk, f] of Object.entries(e.fields)) {
          const fat = `${at}.fields.${fk}`;
          if (!KEY_RE.test(fk)) out.push(`${fat}: field keys are lowercase with underscores`);
          if (!f || typeof f.type !== "string" || !FIELD_TYPES.includes(f.type as FieldType)) out.push(`${fat}.type: one of ${FIELD_TYPES.join(", ")}`);
          if (f?.type === "ref" && (typeof f.to !== "string" || !/^[a-z][a-z0-9-]*\.[a-z][a-z0-9_]*$/.test(f.to))) out.push(`${fat}.to: <app>.<entity> or core.contact`);
          if (f?.type === "enum" && (!Array.isArray(f.values) || !f.values.length)) out.push(`${fat}.values: the allowed values`);
        }
        if (e.title !== undefined && !(e.title in e.fields)) out.push(`${at}.title: not a field`);
        for (const side of ["admin", "public"] as const) {
          const loc = e[side];
          if (loc === undefined) continue;
          for (const k of ["list", "view", "edit"] as const) {
            const t = loc[k];
            if (t === undefined) continue;
            if (typeof t !== "string" || !t.startsWith("/")) { out.push(`${at}.${side}.${k}: a path template starting with /`); continue; }
            for (const p of t.matchAll(/:([a-z_][a-z0-9_]*)/g)) if (!(p[1]! in e.fields)) out.push(`${at}.${side}.${k}: :${p[1]} is not a field`);
          }
        }
      }
    }
  }
  if (m.packages?.exports) for (const [i, p] of m.packages.exports.entries()) {
    if (!p || typeof p.name !== "string" || !/^(@[a-z0-9-]+\/)?[a-z0-9-]+$/.test(p.name)) out.push(`packages.exports[${i}].name: an npm package name`);
    if (!p || typeof p.path !== "string" || !/^packages\/[a-z0-9-]+$/.test(p.path)) out.push(`packages.exports[${i}].path: packages/<folder>`);
  }
  if (m.packages?.uses) for (const [i, p] of m.packages.uses.entries()) if (!p || typeof p.name !== "string") out.push(`packages.uses[${i}].name: required`);
  if (m.requires?.workspace !== undefined && typeof m.requires.workspace !== "number") out.push("requires.workspace: the contract number");
  for (const k of ["permissions", "subscribes", "tables"] as const) if (m[k] !== undefined && !Array.isArray(m[k])) out.push(`${k}: a list of strings`);
  return out;
}

/** The manifest, checked and filled in; throws ManifestError with every problem at once. */
export function parseManifest(raw: unknown): Manifest {
  const problems = checkManifest(raw);
  if (problems.length) throw new ManifestError(problems);
  const m = raw as AppManifest;
  const prefix = tablePrefix(m);
  const entities: Manifest["entities"] = {};
  for (const [key, e] of Object.entries(m.data ?? {})) {
    const idField = Object.entries(e.fields).find(([, f]) => f.type === "id")?.[0] ?? "id";
    const title = e.title ?? (("title" in e.fields && "title") || ("name" in e.fields && "name") || idField);
    entities[key] = { ...e, key, table: e.table ?? `${prefix}${key}`, plural: e.plural ?? `${e.label}s`, title };
  }
  const tables = [...new Set([...(m.tables ?? []).map((t) => (t.startsWith(prefix) ? t : `${prefix}${t}`)), ...Object.values(entities).map((e) => e.table)])];
  return { ...m, nav: m.admin?.nav ?? [], entities, tables };
}

/** Every nav item, depth first, with the path it opens. */
export function flattenNav(items: NavItem[]): NavItem[] {
  return items.flatMap((it) => [it, ...(it.children ? flattenNav(it.children) : [])]);
}

/** Fills a locate template from a row: `/:form_id#r-:id` with `{ form_id: "a", id: "b" }` is `/a#r-b`. Null when a field is missing. */
export function fillTemplate(template: string, row: Record<string, unknown>): string | null {
  let missing = false;
  const out = template.replace(/:([a-z_][a-z0-9_]*)/g, (_, k: string) => {
    const v = row[k];
    if (v === undefined || v === null) { missing = true; return ""; }
    return encodeURIComponent(String(v));
  });
  return missing ? null : out;
}

/** Joins a mount and a path under it: `("/forms", "/thanks")` is `/forms/thanks`, `("/", "/thanks")` is `/thanks`. */
export const underMount = (mount: string, path: string): string => (mount === "/" || mount === "" ? (path.startsWith("/") ? path : `/${path}`) : path === "/" ? mount : `${mount}${path.startsWith("/") ? path : `/${path}`}`);

/** Where a row of an entity is seen, as paths: admin under /admin/<id>, public under the mount (the built one, or the manifest's). */
export function locate(m: Manifest, entity: string, row: Record<string, unknown>, opts: { mount?: string | null } = {}): { admin: { list: string | null; view: string | null; edit: string | null }; public: { list: string | null; view: string | null } } {
  const e = m.entities[entity];
  const mount = opts.mount === undefined ? (m.public?.mount ?? null) : opts.mount;
  const fill = (t: string | undefined, base: string | null) => {
    if (!t || base === null) return null;
    const p = fillTemplate(t, row);
    return p === null ? null : base === "" ? p : underMount(base, p);
  };
  if (!e) return { admin: { list: null, view: null, edit: null }, public: { list: null, view: null } };
  return {
    admin: { list: fill(e.admin?.list, adminMount(m)), view: fill(e.admin?.view, adminMount(m)), edit: fill(e.admin?.edit, adminMount(m)) },
    public: { list: fill(e.public?.list, mount), view: fill(e.public?.view, mount) },
  };
}

/** The entry the workspace keeps for an installed app in its ROUTES binding: what the shell needs before it asks the app anything. */
export type RouteSummary = { app: string; name: string; version?: string; icon?: string; color?: string; public?: string; home?: string; admin: boolean; api: boolean; operations?: boolean; nav?: NavItem[]; subscribes?: string[]; entities?: string[] };
export function routeSummary(m: AppManifest): RouteSummary {
  const full: RouteSummary = { app: m.id, name: m.name, version: m.version, icon: m.icon?.trimStart().startsWith("<svg") ? m.icon : undefined, color: m.color, public: m.public?.mount, home: m.public?.home, admin: !!m.admin, api: !!m.api, operations: !!m.operations, nav: m.admin?.nav, subscribes: m.subscribes, entities: m.data ? Object.keys(m.data) : undefined };
  // no undefined values: the entry goes into a Worker binding and a wrangler config, which take JSON values only
  return Object.fromEntries(Object.entries(full).filter(([, v]) => v !== undefined)) as RouteSummary;
}

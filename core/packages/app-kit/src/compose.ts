// Build-time composition of a workspace's apps into one React Router route tree (WORKSPACE-REPO.md §3). An app folder's
// `app/routes.ts` exports its three route lists with files relative to its own `app/`; the generated `.sg/routes.ts`
// hands them here with the folder they live in, and this rebases every file onto the workspace's `app/` and mounts the
// public ones where the workspace says. Runs under Node when React Router reads the route config, never in the Worker.
import { prefix, route, type RouteConfigEntry } from "@react-router/dev/routes";
import { adminMount, apiMount, type AppManifest } from "./manifest";

/** What an app folder's `app/routes.ts` exports: public pages, admin screens and resource routes, each optional. */
export type AppRouteParts = { public?: RouteConfigEntry[]; admin?: RouteConfigEntry[]; api?: RouteConfigEntry[] };
/** Identity with a type, so an app's routes file reads the same whichever build picks it up. */
export const defineAppRoutes = (parts: AppRouteParts): AppRouteParts => parts;

export type ComposeEntry = { manifest: AppManifest; parts: AppRouteParts; /** The app's `app/` folder, relative to the workspace's `app/`: `../apps/notes/app`. */ dir: string };
export type ComposeOptions = {
  /** Where each app's public pages go, overriding the manifests (the sitemap's choice, written by the desktop). `null` unmounts an app's pages. */
  mounts?: Record<string, string | null>;
  /** The page served as `/`: an app and a path under its mount. Overrides any manifest's `public.home`. `null` for none. */
  home?: { app: string; path: string } | null;
};

const join = (dir: string, file: string) => `${dir.replace(/\/$/, "")}/${file.replace(/^\.?\//, "")}`;
const rebase = (dir: string, entries: RouteConfigEntry[]): RouteConfigEntry[] =>
  entries.map((e) => ({ ...e, file: join(dir, e.file), ...(e.children ? { children: rebase(dir, e.children) } : {}) }));

/** The module file of the public route at `path` (`""` for the index), looking through layouts. */
function findRoute(entries: RouteConfigEntry[], path: string): string | undefined {
  for (const e of entries) {
    const own = e.path ?? (e.index ? "" : undefined);
    if (own !== undefined && own.replace(/^\//, "") === path) return e.file;
    if (e.children) { const hit = findRoute(e.children, path); if (hit) return hit; }
  }
  return undefined;
}

/** Every app's routes in one tree: public under its mount (and the home page as `/`), admin under /admin/<id>, api under /api/<id>. */
export function composeRoutes(apps: ComposeEntry[], opts: ComposeOptions = {}): RouteConfigEntry[] {
  const out: RouteConfigEntry[] = [];
  const taken = new Map<string, string>();
  const homeOf = (m: AppManifest, mount: string | null): string | null => {
    if (opts.home !== undefined) return opts.home && opts.home.app === m.id ? opts.home.path : null;
    return mount ? (m.public?.home ?? null) : null;
  };
  let homeDone = false;
  for (const { manifest: m, parts, dir } of apps) {
    const mount = opts.mounts && m.id in opts.mounts ? opts.mounts[m.id]! : (m.public?.mount ?? null);
    if (mount && parts.public) {
      const other = taken.get(mount);
      if (other) throw new Error(`Apps "${other}" and "${m.id}" both want their pages at ${mount}; give one another mount in supergrid.workspace.json.`);
      taken.set(mount, m.id);
      const pub = rebase(dir, parts.public);
      out.push(...prefix(mount, pub));
      const home = homeOf(m, mount);
      if (home && mount !== "/" && !homeDone) {
        const page = findRoute(pub, home.replace(/^\//, ""));
        if (!page) throw new Error(`App "${m.id}": its home page ${home} is not one of its public routes.`);
        out.push(route("/", page, { id: "sg-home" }));
        homeDone = true;
      }
    }
    if (parts.admin) out.push(...prefix(adminMount(m), rebase(dir, parts.admin)));
    if (parts.api) out.push(...prefix(apiMount(m), rebase(dir, parts.api)));
  }
  return out;
}

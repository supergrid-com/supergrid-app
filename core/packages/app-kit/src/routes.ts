import { prefix, route, type RouteConfigEntry } from "@react-router/dev/routes";
import { adminMount, apiMount, type AppManifest } from "./manifest";

/**
 * Public routes under the app's mount, admin under /admin/<id>, api under /api/<id>. All baked in at build time.
 * `SG_PUBLIC_MOUNT` in the environment overrides the manifest's mount (the desktop sets it when the sitemap moved the
 * app); `public.home` (or `SG_HOME`) names a public page also served as `/`, for the app that is the site.
 */
export function appRoutes(m: AppManifest, parts: { public?: RouteConfigEntry[]; admin?: RouteConfigEntry[]; api?: RouteConfigEntry[] }): RouteConfigEntry[] {
  const mount = process.env.SG_PUBLIC_MOUNT || m.public?.mount;
  const home = process.env.SG_HOME || m.public?.home;
  const out: RouteConfigEntry[] = [];
  if (mount && parts.public) {
    out.push(...prefix(mount, parts.public));
    if (home && mount !== "/") {
      const page = findRoute(parts.public, home.replace(/^\//, ""));
      if (page) out.push(route("/", page, { id: "sg-home" }));
    }
  }
  if (parts.admin) out.push(...prefix(adminMount(m), parts.admin));
  if (parts.api) out.push(...prefix(apiMount(m), parts.api));
  return out;
}

/** The module file of the public route at `path` (`""` for the index), looking through layouts. */
function findRoute(entries: RouteConfigEntry[], path: string): string | undefined {
  for (const e of entries) {
    const own = (e.path ?? (e.index ? "" : undefined));
    if (own !== undefined && own.replace(/^\//, "") === path) return e.file;
    if (e.children) { const hit = findRoute(e.children, path); if (hit) return hit; }
  }
  return undefined;
}

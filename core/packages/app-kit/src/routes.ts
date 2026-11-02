import { prefix, type RouteConfigEntry } from "@react-router/dev/routes";
import { adminMount, apiMount, type AppManifest } from "./manifest";

/** Public routes under the app's mount, admin under /admin/<id>, api under /api/<id>. All baked in at build time. */
export function appRoutes(m: AppManifest, parts: { public?: RouteConfigEntry[]; admin?: RouteConfigEntry[]; api?: RouteConfigEntry[] }): RouteConfigEntry[] {
  return [
    ...(m.public && parts.public ? prefix(m.public.mount, parts.public) : []),
    ...(parts.admin ? prefix(adminMount(m), parts.admin) : []),
    ...(parts.api ? prefix(apiMount(m), parts.api) : []),
  ];
}

import type { Config } from "@react-router/dev/config";
import type { AppManifest } from "./manifest";

/**
 * React Router config for an app.
 * Route discovery stays lazy, but the manifest is served under /_app/<id>/ so the workspace router forwards it to this app.
 * The default /__manifest is not under any app's mount, so the workspace would answer it with a 404 and client-side
 * navigation would break for routes the initial page did not already know about.
 */
export function appRouterConfig(m: AppManifest, overrides: Config = {}): Config {
  return { ssr: true, routeDiscovery: { mode: "lazy", manifestPath: `/_app/${m.id}/__manifest` }, ...overrides };
}

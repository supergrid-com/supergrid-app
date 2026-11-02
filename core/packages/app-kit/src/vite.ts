/// <reference types="node" />
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { AppManifest } from "./manifest";

type RouteEntry = { app: string; name?: string; binding: string; public?: string; admin?: boolean; api?: boolean; nav?: { label: string; path: string }[] };
const bindingName = (id: string) => `APP_${id.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;

/**
 * Vite config for an app.
 * Dev: one Vite server runs the workspace router as the entry Worker and this app as an auxiliary Worker, sharing one local D1
 *      (only one runtime can open the SQLite file). The app adds itself to the workspace's route table and bindings for the session.
 * Build: the app builds alone. Assets land under /_app/<id>/assets/ so every app's assets are unique on the shared domain.
 */
export function appViteConfig(manifest: AppManifest, command: "serve" | "build", plugins: { cloudflare: (o?: any) => any; reactRouter: () => any }, opts: { workspaceConfig?: string; persistState?: string } = {}) {
  const workspaceConfig = resolve(opts.workspaceConfig ?? "../../workspace/wrangler.jsonc");
  const compose = command === "serve" && existsSync(workspaceConfig);
  const entry: RouteEntry = { app: manifest.id, name: manifest.name, binding: bindingName(manifest.id), public: manifest.public?.mount, admin: !!manifest.admin, api: !!manifest.api, nav: manifest.admin?.nav };
  const cloudflareOptions = compose
    ? {
        configPath: workspaceConfig,
        config: (c: any) => ({
          ...c,
          services: [...(c.services ?? []).filter((s: any) => s.binding !== entry.binding), { binding: entry.binding, service: `app-${manifest.id}` }],
          vars: { ...c.vars, ROUTES: [...((c.vars?.ROUTES as RouteEntry[]) ?? []).filter((r) => r.app !== manifest.id), entry] },
        }),
        auxiliaryWorkers: [{ configPath: "./wrangler.jsonc", viteEnvironment: { name: "ssr" } }],
        persistState: { path: opts.persistState ?? "../../.state" },
        inspectorPort: false,
      }
    : { viteEnvironment: { name: "ssr" }, inspectorPort: false };
  return {
    build: { assetsDir: `_app/${manifest.id}/assets` },
    plugins: [plugins.cloudflare(cloudflareOptions), plugins.reactRouter()],
  };
}

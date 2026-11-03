/// <reference types="node" />
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
// Loaded by Node itself (Vite leaves package imports to it), so the runtime import goes through the package name.
import { routeSummary, type AppManifest } from "@supergrid/app-kit/manifest";

const bindingName = (id: string) => `APP_${id.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;

/** The manifest with an `icon` file read in, so a dev route entry and a release carry the SVG itself. */
export function withInlineIcon(manifest: AppManifest, dir: string): AppManifest {
  if (!manifest.icon || manifest.icon.trimStart().startsWith("<svg")) return manifest;
  const path = resolve(dir, manifest.icon);
  return existsSync(path) ? { ...manifest, icon: readFileSync(path, "utf8").trim() } : manifest;
}

/**
 * Vite config for an app.
 * Dev: one Vite server runs the workspace router as the entry Worker and this app as an auxiliary Worker, sharing one local D1
 *      (only one runtime can open the SQLite file). The app adds itself to the workspace's route table and bindings for the session.
 * Build: the app builds alone. Assets land under /_app/<id>/assets/ so every app's assets are unique on the shared domain.
 * `opts.dir` is the app folder (for the icon file); pass `import.meta.dirname` or leave it to the working directory.
 */
export function appViteConfig(manifest: AppManifest, command: "serve" | "build", plugins: { cloudflare: (o?: any) => any; reactRouter: () => any; tailwindcss?: () => any }, opts: { workspaceConfig?: string; persistState?: string; dir?: string } = {}) {
  const workspaceConfig = resolve(opts.workspaceConfig ?? "../../workspace/wrangler.jsonc");
  const compose = command === "serve" && existsSync(workspaceConfig);
  const entry = { ...routeSummary(withInlineIcon(manifest, opts.dir ?? process.cwd())), binding: bindingName(manifest.id) };
  const cloudflareOptions = compose
    ? {
        configPath: workspaceConfig,
        config: (c: any) => ({
          ...c,
          services: [...(c.services ?? []).filter((s: any) => s.binding !== entry.binding), { binding: entry.binding, service: `app-${manifest.id}` }],
          vars: { ...c.vars, ROUTES: [...((c.vars?.ROUTES as { app: string }[]) ?? []).filter((r) => r.app !== manifest.id), entry] },
        }),
        auxiliaryWorkers: [{ configPath: "./wrangler.jsonc", viteEnvironment: { name: "ssr" } }],
        // the local D1 and bucket: two folders up from the app (dev/.state for the sample apps; the workspace's folder for apps the desktop makes)
        persistState: { path: opts.persistState ?? "../../.state" },
        inspectorPort: false,
      }
    : { viteEnvironment: { name: "ssr" }, inspectorPort: false };
  return {
    build: { assetsDir: `_app/${manifest.id}/assets` },
    plugins: [...(plugins.tailwindcss ? [plugins.tailwindcss()] : []), plugins.cloudflare(cloudflareOptions), plugins.reactRouter()],
  };
}

/**
 * Vite config for a workspace repo (WORKSPACE-REPO.md): one Worker, every app under apps/ built in. Regenerates `.sg/`
 * when the config loads and whenever a manifest or an app's routes file changes during a dev session, so the route tree
 * and the registry always match the folders. `opts.dir` is the repo root (pass `import.meta.dirname`).
 */
export function workspaceViteConfig(command: "serve" | "build", plugins: { cloudflare: (o?: any) => any; reactRouter: () => any; tailwindcss?: () => any }, opts: { dir?: string; persistState?: string } = {}) {
  const dir = resolve(opts.dir ?? process.cwd());
  const regenerate = async () => {
    const { generateWorkspace } = await import("@supergrid/app-kit/generate");
    const g = generateWorkspace(dir);
    return g;
  };
  const sgPlugin = {
    name: "supergrid-workspace",
    async config() { await regenerate(); },
    configureServer(server: any) {
      const watched = (file: string) => /[\\/]apps[\\/][^\\/]+[\\/](supergrid\.app\.json|app[\\/]routes\.ts)$/.test(file) || /[\\/]supergrid\.workspace\.json$/.test(file);
      server.watcher.on("all", async (_event: string, file: string) => {
        if (!watched(file)) return;
        try { await regenerate(); server.config.logger.info("[supergrid] .sg/ regenerated"); }
        catch (e) { server.config.logger.error(`[supergrid] ${(e as Error).message}`); }
      });
    },
  };
  return {
    plugins: [sgPlugin, ...(plugins.tailwindcss ? [plugins.tailwindcss()] : []), plugins.cloudflare({ viteEnvironment: { name: "ssr" }, inspectorPort: false, ...(opts.persistState ? { persistState: { path: opts.persistState } } : {}) }), plugins.reactRouter()],
    // `.sg/` and `apps/` sit beside `app/`; nothing here is outside the repo
    server: { fs: { allow: [dir] } },
  };
}

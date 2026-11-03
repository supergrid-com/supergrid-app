/// <reference types="node" />
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
// Loaded by Node itself (Vite leaves package imports to it), so the runtime import goes through the package name.
import type { AppManifest } from "@supergrid/app-kit/manifest";

/** The manifest with an `icon` file read in, so a dev route entry and a release carry the SVG itself. */
export function withInlineIcon(manifest: AppManifest, dir: string): AppManifest {
  if (!manifest.icon || manifest.icon.trimStart().startsWith("<svg")) return manifest;
  const path = resolve(dir, manifest.icon);
  return existsSync(path) ? { ...manifest, icon: readFileSync(path, "utf8").trim() } : manifest;
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

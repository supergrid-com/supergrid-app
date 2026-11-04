/// <reference types="node" />
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
// Loaded by Node itself (Vite leaves package imports to it), so the runtime import goes through the package name.
import type { AppManifest } from "@supergrid/app-kit/manifest";

/** The manifest with an `icon` file read in, so a dev route entry and a release carry the SVG itself. */
export function withInlineIcon(manifest: AppManifest, dir: string): AppManifest {
  if (!manifest.icon || manifest.icon.trimStart().startsWith("<svg")) return manifest;
  const path = resolve(dir, manifest.icon);
  return existsSync(path) ? { ...manifest, icon: readFileSync(path, "utf8").trim() } : manifest;
}

/** The UI packages the kit and the apps' screens import, which the browser side should get pre-bundled. */
const UI_PACKAGE = /^(@base-ui\/react(\/[\w-]+)?|lucide-react|class-variance-authority|clsx|tailwind-merge|@daypicker\/react)$/;

/**
 * Every UI package entry the repo's screens import (`app/` and each `apps/<id>/app/`), so Vite pre-bundles them when
 * the dev server starts. Left to discovery, the first page that needs one makes Vite optimize and reload the page,
 * and an app's admin screen in the desktop's frame never says it is ready (its first load is thrown away).
 */
function uiDeps(dir: string): string[] {
  const found = new Set<string>();
  const walk = (d: string) => {
    if (!existsSync(d)) return;
    for (const f of readdirSync(d)) {
      if (f === "node_modules" || f.startsWith(".")) continue;
      const p = join(d, f);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(t|j)sx?$/.test(f)) for (const m of readFileSync(p, "utf8").matchAll(/from\s+["']([^"']+)["']/g)) if (UI_PACKAGE.test(m[1]!)) found.add(m[1]!);
    }
  };
  walk(join(dir, "app"));
  if (existsSync(join(dir, "apps"))) for (const a of readdirSync(join(dir, "apps"))) walk(join(dir, "apps", a, "app"));
  return [...found].sort();
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
    ...(command === "serve" ? { optimizeDeps: { include: uiDeps(dir) } } : {}),
  };
}

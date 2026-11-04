/// <reference types="node" />
// Starting a workspace repo and the app folders in it (WORKSPACE-REPO.md), for the CLI (`sg ws new | add`) and the desktop
// (provisioning, New App): the templates' files, the two copied-in kits (components/ui, components/admin), the agent's
// skills, and a manifest with the id, name, mount and icon asked for. Package links point back at core/ from wherever the
// repo lands, until the packages are on npm.
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { checkManifest, type AppManifest } from "@supergrid/app-kit/manifest";
import { isAppId } from "@supergrid/app-kit/names";

const TEMPLATE_SKIP = /^(node_modules|build|\.react-router|\.wrangler|dist|\.state)(\/|$)|(^|\/)\.DS_Store$|^pnpm-lock\.yaml$/;
const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const files = (dir: string, keep: (rel: string) => boolean) => walk(dir).map((p) => relative(dir, p)).filter(keep);
const copyDir = (from: string, to: string, keep: (rel: string) => boolean) => {
  for (const rel of files(from, keep)) { mkdirSync(dirname(join(to, rel)), { recursive: true }); writeFileSync(join(to, rel), readFileSync(join(from, rel))); }
};
const posix = (p: string) => p.split("\\").join("/");
export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").replace(/^[^a-z]+/, "");
const titleCase = (s: string) => s.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// ---- Workspace repos (WORKSPACE-REPO.md) ---------------------------------------------------------------------------
// A workspace repo from core/templates/workspace, and app folders from core/templates/app into its apps/. The kits land
// once, in the workspace's app/components; apps import them as `~/components/...`.

export type WorkspaceScaffoldOptions = {
  core: string;
  /** Where the repo goes; must be empty or absent. */
  dest: string;
  id: string;
  name: string;
  /** The Worker's name and the local D1's; `sg-ws-<id>` when absent. */
  worker?: string;
  /**
   * Copy the core packages into the repo (vendor/) as pnpm workspace packages instead of linking back to core/. For a
   * core that cannot be installed into, like the copy inside the packaged desktop: a link would reach packages whose
   * own dependencies are not there. The repo then stands alone.
   */
  vendor?: boolean;
};

export function scaffoldWorkspace(opts: WorkspaceScaffoldOptions): { dir: string } {
  const CORE = resolve(opts.core);
  const dir = resolve(opts.dest);
  if (existsSync(dir) && readdirSync(dir).length) throw new Error(`${dir} is not empty.`);
  copyDir(join(CORE, "templates/workspace"), dir, (rel) => !TEMPLATE_SKIP.test(rel));
  copyDir(join(CORE, "packages/ui/src"), join(dir, "app/components/ui"), (rel) => rel !== "app.css");
  copyDir(join(CORE, "packages/admin-ui/src"), join(dir, "app/components/admin"), () => true);
  mkdirSync(join(dir, "apps"), { recursive: true });
  mkdirSync(join(dir, ".claude/skills/supergrid-app"), { recursive: true });
  writeFileSync(join(dir, ".claude/skills/supergrid-app/SKILL.md"), readFileSync(join(CORE, "packages/app-kit/SKILL.md")));
  mkdirSync(join(dir, ".claude/skills/supergrid-admin-ui"), { recursive: true });
  writeFileSync(join(dir, ".claude/skills/supergrid-admin-ui/SKILL.md"), readFileSync(join(CORE, "packages/admin-ui/SKILL.md")));
  const worker = opts.worker ?? `sg-ws-${opts.id}`;
  writeFileSync(join(dir, "supergrid.workspace.json"), `${JSON.stringify({ id: opts.id, name: opts.name }, null, 2)}\n`);
  // the package: its name, and the core packages linked from wherever the repo sits
  const pkgPath = join(dir, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { name: string; dependencies: Record<string, string> };
  pkg.name = worker;
  const linked: string[] = [];
  for (const [dep, spec] of Object.entries(pkg.dependencies)) {
    const m = /^link:\.\.\/(.+)$/.exec(spec);
    if (!m) continue;
    linked.push(m[1]!);
    pkg.dependencies[dep] = opts.vendor ? "workspace:*" : `link:${posix(relative(dir, join(CORE, m[1]!)))}`;
  }
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  if (opts.vendor) vendorCore(CORE, dir, linked);
  const wranglerPath = join(dir, "wrangler.jsonc");
  writeFileSync(wranglerPath, readFileSync(wranglerPath, "utf8").replaceAll("sg-ws-local", worker).replace('"WORKSPACE_ID": "local"', `"WORKSPACE_ID": ${JSON.stringify(opts.id)}`).replace('"WORKSPACE_NAME": "Local workspace"', `"WORKSPACE_NAME": ${JSON.stringify(opts.name)}`));
  return { dir };
}

/** The core folders a workspace links (`packages/app-kit`, `workspace`), and the ones they reach through `workspace:*`. */
function coreClosure(CORE: string, start: string[]): string[] {
  const where = new Map<string, string>();
  for (const rel of [...readdirSync(join(CORE, "packages")).map((n) => `packages/${n}`), "workspace"]) {
    const pj = join(CORE, rel, "package.json");
    if (existsSync(pj)) where.set((JSON.parse(readFileSync(pj, "utf8")) as { name: string }).name, rel);
  }
  const seen = new Set<string>();
  const visit = (rel: string) => {
    if (seen.has(rel)) return;
    seen.add(rel);
    const pj = JSON.parse(readFileSync(join(CORE, rel, "package.json"), "utf8")) as { dependencies?: Record<string, string> };
    for (const [dep, spec] of Object.entries(pj.dependencies ?? {})) if (spec.startsWith("workspace:") && where.has(dep)) visit(where.get(dep)!);
  };
  start.forEach(visit);
  return [...seen].sort();
}

/** Copies the core packages into vendor/ and lists them in pnpm-workspace.yaml, so `pnpm install` installs their dependencies too. */
function vendorCore(CORE: string, dir: string, linked: string[]): void {
  const rels = coreClosure(CORE, linked);
  for (const rel of rels) copyDir(join(CORE, rel), join(dir, "vendor", rel), (r) => !TEMPLATE_SKIP.test(r));
  // what the packages' own tsconfigs extend, at the same place relative to them (Vite reads them)
  if (existsSync(join(CORE, "tsconfig.base.json"))) writeFileSync(join(dir, "vendor/tsconfig.base.json"), readFileSync(join(CORE, "tsconfig.base.json")));
  const yamlPath = join(dir, "pnpm-workspace.yaml");
  const lines = readFileSync(yamlPath, "utf8").split("\n");
  const at = lines.findIndex((l) => l.trim() === "packages:");
  if (at < 0) throw new Error(`${yamlPath} has no packages: list.`);
  lines.splice(at + 1, 0, ...rels.map((rel) => `  - vendor/${rel}`));
  writeFileSync(yamlPath, lines.join("\n"));
  writeFileSync(join(dir, "vendor/README.md"), "# vendor\n\nThe SuperGrid core packages this workspace runs on, copied in when the desktop made it. They are pnpm workspace\npackages (`workspace:*`), so the repo installs and builds on its own.\n");
}

export type AppFolderOptions = {
  core: string;
  /** The workspace repo. */
  workspace: string;
  id: string;
  name?: string;
  /** The public prefix; null for an admin-only app; absent for `/<id>`. */
  mount?: string | null;
  /** A page under the mount also served as `/`: this app is the site. */
  home?: string;
  description?: string;
  color?: string;
  /** An inline `<svg>` or a path to one. */
  icon?: string;
};

/** An app folder under the workspace's apps/, from core/templates/app. */
export function scaffoldAppFolder(opts: AppFolderOptions): { dir: string; manifest: AppManifest } {
  const CORE = resolve(opts.core);
  const ws = resolve(opts.workspace);
  if (!existsSync(join(ws, "supergrid.workspace.json"))) throw new Error(`${ws} is not a workspace repo (no supergrid.workspace.json).`);
  const id = slug(opts.id);
  if (!isAppId(id)) throw new Error(`"${opts.id}" does not make a valid app id (lowercase letters, digits, dashes).`);
  const dir = join(ws, "apps", id);
  if (existsSync(dir) && readdirSync(dir).length) throw new Error(`${dir} is not empty.`);
  copyDir(join(CORE, "templates/app"), dir, (rel) => !TEMPLATE_SKIP.test(rel));
  const name = opts.name?.trim() || titleCase(id);
  const manifest = JSON.parse(readFileSync(join(dir, "supergrid.app.json"), "utf8")) as AppManifest;
  manifest.id = id;
  manifest.name = name;
  manifest.description = opts.description ?? `${name}: a SuperGrid app.`;
  if (opts.color) manifest.color = opts.color;
  if (opts.mount === null) delete manifest.public;
  else manifest.public = { mount: opts.mount ?? `/${id}`, ...(opts.home ? { home: opts.home } : {}) };
  if (opts.icon) {
    const svg = opts.icon.trimStart().startsWith("<svg") ? opts.icon : readFileSync(resolve(opts.icon), "utf8");
    writeFileSync(join(dir, "icon.svg"), `${svg.trim()}\n`);
  }
  const problems = checkManifest(manifest);
  if (problems.length) throw new Error(`The manifest came out wrong:\n${problems.map((x) => `  - ${x}`).join("\n")}`);
  writeFileSync(join(dir, "supergrid.app.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  const pkgPath = join(dir, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { name: string };
  pkg.name = `app-${id}`;
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  writeFileSync(join(dir, "README.md"), `# ${name}\n\nAn app in this workspace. Start with [GUIDE.md](GUIDE.md); the manifest is \`supergrid.app.json\`.\n`);
  return { dir, manifest };
}

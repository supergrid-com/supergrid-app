/// <reference types="node" />
// Starting an app from core/template, for the CLI (`sg app new`) and the desktop (New App): the template's files, the
// two copied-in kits (components/ui, components/admin), the agent's skills, and a manifest with the id, name, mount and
// icon asked for. Package links point back at core/packages from wherever the app lands, until the packages are on npm.
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

export type ScaffoldOptions = {
  /** The core folder (holds template/, packages/, workspace/). */
  core: string;
  /** Where the app goes; must be empty or absent. */
  dest: string;
  id: string;
  name?: string;
  /** The public prefix; null for an admin-only app; absent for `/<id>`. */
  mount?: string | null;
  description?: string;
  color?: string;
  /** An inline `<svg>` or a path to one. */
  icon?: string;
};

export function scaffoldApp(opts: ScaffoldOptions): { dir: string; manifest: AppManifest } {
  const CORE = resolve(opts.core);
  const dir = resolve(opts.dest);
  const id = slug(opts.id);
  if (!isAppId(id)) throw new Error(`"${opts.id}" does not make a valid app id (lowercase letters, digits, dashes).`);
  if (existsSync(dir) && readdirSync(dir).length) throw new Error(`${dir} is not empty.`);
  copyDir(join(CORE, "template"), dir, (rel) => !TEMPLATE_SKIP.test(rel));
  copyDir(join(CORE, "packages/ui/src"), join(dir, "app/components/ui"), (rel) => rel !== "app.css");
  copyDir(join(CORE, "packages/admin-ui/src"), join(dir, "app/components/admin"), () => true);
  mkdirSync(join(dir, ".claude/skills/supergrid-app"), { recursive: true });
  writeFileSync(join(dir, ".claude/skills/supergrid-app/SKILL.md"), readFileSync(join(CORE, "packages/app-kit/SKILL.md")));
  mkdirSync(join(dir, ".claude/skills/supergrid-admin-ui"), { recursive: true });
  writeFileSync(join(dir, ".claude/skills/supergrid-admin-ui/SKILL.md"), readFileSync(join(CORE, "packages/admin-ui/SKILL.md")));
  const name = opts.name?.trim() || titleCase(id);
  const manifest = JSON.parse(readFileSync(join(dir, "supergrid.app.json"), "utf8")) as AppManifest;
  manifest.id = id;
  manifest.name = name;
  manifest.description = opts.description ?? `${name}: a SuperGrid app.`;
  if (opts.color) manifest.color = opts.color;
  if (opts.mount === null) delete manifest.public;
  else manifest.public = { mount: opts.mount ?? `/${id}` };
  if (opts.icon) {
    const svg = opts.icon.trimStart().startsWith("<svg") ? opts.icon : readFileSync(resolve(opts.icon), "utf8");
    writeFileSync(join(dir, "icon.svg"), `${svg.trim()}\n`);
  }
  const problems = checkManifest(manifest);
  if (problems.length) throw new Error(`The manifest came out wrong:\n${problems.map((x) => `  - ${x}`).join("\n")}`);
  writeFileSync(join(dir, "supergrid.app.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  // the package: its name, and the core packages linked from wherever the app sits
  const pkgPath = join(dir, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { name: string; dependencies: Record<string, string> };
  pkg.name = `app-${id}`;
  for (const [dep, spec] of Object.entries(pkg.dependencies)) {
    const m = /^link:\.\.\/packages\/(.+)$/.exec(spec);
    if (m) pkg.dependencies[dep] = `link:${posix(relative(dir, join(CORE, "packages", m[1]!)))}`;
  }
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  for (const f of ["wrangler.jsonc", "vite.config.ts"]) {
    const path = join(dir, f);
    let text = readFileSync(path, "utf8").replace(/"name": "app-blank"/, `"name": "app-${id}"`);
    if (f === "vite.config.ts") text = text.replace('"../workspace/wrangler.jsonc"', JSON.stringify(posix(relative(dir, join(CORE, "workspace/wrangler.jsonc")))));
    writeFileSync(path, text);
  }
  writeFileSync(join(dir, "README.md"), `# ${name}\n\nA SuperGrid app. Start with [GUIDE.md](GUIDE.md); the manifest is \`supergrid.app.json\`.\n`);
  return { dir, manifest };
}

/** The apps in a folder: every child with a manifest, read (not checked). */
export function listApps(dir: string): { dir: string; manifest: AppManifest; problems: string[] }[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((f) => {
    const path = join(dir, f, "supergrid.app.json");
    if (!existsSync(path)) return [];
    try {
      const manifest = JSON.parse(readFileSync(path, "utf8")) as AppManifest;
      return [{ dir: join(dir, f), manifest, problems: checkManifest(manifest) }];
    } catch (e) {
      return [{ dir: join(dir, f), manifest: { id: f, name: f, version: "0.0.0" }, problems: [`supergrid.app.json: ${(e as Error).message}`] }];
    }
  });
}

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
  for (const [dep, spec] of Object.entries(pkg.dependencies)) {
    const m = /^link:\.\.\/(.+)$/.exec(spec);
    if (m) pkg.dependencies[dep] = `link:${posix(relative(dir, join(CORE, m[1]!)))}`;
  }
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  const wranglerPath = join(dir, "wrangler.jsonc");
  writeFileSync(wranglerPath, readFileSync(wranglerPath, "utf8").replaceAll("sg-ws-local", worker).replace('"WORKSPACE_ID": "local"', `"WORKSPACE_ID": ${JSON.stringify(opts.id)}`).replace('"WORKSPACE_NAME": "Local workspace"', `"WORKSPACE_NAME": ${JSON.stringify(opts.name)}`));
  return { dir };
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

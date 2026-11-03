import { listApps, scaffoldApp } from "@supergrid/app-kit/scaffold";
import { packageGraph } from "@supergrid/app-kit/packages";
import { installLocalApp, readWorkspace, uninstallApp as cloudUninstall, type Compiled } from "@supergrid/cloud";
import { app, ipcMain, shell, type WebContents } from "electron";
import { execFile, spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { accessSync, constants, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { connect, createServer } from "node:net";
import { homedir } from "node:os";
import { delimiter, join, relative, resolve } from "node:path";
import { createInterface } from "node:readline";
import { channels, type AppDeployProgress, type DevLogLine, type DevServerStatus, type FileEntry, type GitStatus, type InstalledApp, type LocalApp, type NewAppInput } from "../shared/bridge";
import { cfClient } from "./cf-api";
import { readState } from "./config";
import * as workspaceApi from "./workspace-api";

// Apps on this Mac. Each workspace has a folder under the app's data folder, and that folder is a pnpm workspace whose
// members are the apps (workspaces/<id>/apps/<app>) and the packages they export (apps/<app>/packages/*), so a shared
// package resolves on disk with `workspace:*`. From here an app is created from core/template, run with its dev server,
// read (files, git), built and installed into the workspace as its own Worker (installLocalApp in @supergrid/cloud).

const ID_RE = /^[a-z][a-z0-9-]*$/;
const checkId = (v: unknown, what: string): string => { if (typeof v !== "string" || !ID_RE.test(v)) throw new Error(`Not ${what}.`); return v; };

/** The core folder: the repo's in development, the bundled copy in a packaged build. */
export function coreDir(): string {
  const candidates = [resolve(app.getAppPath(), "../core"), join(process.resourcesPath ?? "", "core")];
  const hit = candidates.find((d) => existsSync(join(d, "template/supergrid.app.json")));
  if (!hit) throw new Error(`SuperGrid core (with template/) was not found beside the app: looked in ${candidates.join(", ")}.`);
  return hit;
}

/** The workspace's folder on this Mac, set up as a pnpm workspace the first time. */
export function workspaceRoot(wsId: string): string {
  const dir = join(app.getPath("userData"), "workspaces", checkId(wsId, "a workspace id"));
  mkdirSync(join(dir, "apps"), { recursive: true });
  if (!existsSync(join(dir, "pnpm-workspace.yaml"))) writeFileSync(join(dir, "pnpm-workspace.yaml"), "packages:\n  - apps/*\n  - apps/*/packages/*\n");
  if (!existsSync(join(dir, "package.json"))) writeFileSync(join(dir, "package.json"), `${JSON.stringify({ name: `ws-${wsId}`, private: true }, null, 2)}\n`);
  if (!existsSync(join(dir, ".gitignore"))) writeFileSync(join(dir, ".gitignore"), "node_modules\n");
  return dir;
}
export const appsDir = (wsId: string): string => join(workspaceRoot(wsId), "apps");
function appDir(wsId: string, appId: string): string {
  const dir = join(appsDir(wsId), checkId(appId, "an app id"));
  if (!existsSync(join(dir, "supergrid.app.json"))) throw new Error(`There is no app folder for ${appId} in this workspace.`);
  return dir;
}

/** A GUI app gets a bare PATH on macOS, so look where installers put binaries too. */
function findBin(name: string): string | null {
  const home = homedir();
  const dirs = [...(process.env.PATH ?? "").split(delimiter), join(home, ".local/bin"), join(home, "Library/pnpm"), "/opt/homebrew/bin", "/usr/local/bin", "/usr/bin"];
  for (const dir of dirs) {
    if (!dir) continue;
    const path = join(dir, name);
    try { accessSync(path, constants.X_OK); return path; } catch { /* keep looking */ }
  }
  return null;
}
const needBin = (name: string, hint: string): string => { const bin = findBin(name); if (!bin) throw new Error(`${name} was not found on this Mac. ${hint}`); return bin; };
const PNPM_HINT = "Install it with `npm i -g pnpm` (or `brew install pnpm`), then try again.";

/** Version-sorted, newest first: `v24.20.0` before `v22.23.2`. */
const byVersionDesc = (a: string, b: string) => { const p = (v: string) => v.replace(/^v/, "").split(".").map(Number); const [x, y] = [p(a), p(b)]; for (let i = 0; i < 3; i++) { const d = (y[i] ?? 0) - (x[i] ?? 0); if (d) return d; } return 0; };

/**
 * The Node the user's own shell would run, since a GUI app's PATH stops at /usr/local/bin and the Node there can be
 * years behind: nvm's default alias (or its newest version), then volta and fnm. React Router needs a current one.
 */
function preferredNodeDir(): string | null {
  const home = homedir();
  const nvm = join(home, ".nvm/versions/node");
  if (existsSync(nvm)) {
    const versions = readdirSync(nvm).filter((v) => /^v\d/.test(v)).sort(byVersionDesc);
    let alias = "";
    try { alias = readFileSync(join(home, ".nvm/alias/default"), "utf8").trim(); } catch { /* no default */ }
    const pick = (alias && versions.find((v) => v === alias || v === `v${alias}` || v.startsWith(`v${alias.replace(/^v/, "")}.`))) ?? versions[0];
    if (pick) return join(nvm, pick, "bin");
  }
  for (const dir of [join(home, ".volta/bin"), join(home, ".local/share/fnm/aliases/default/bin"), join(home, "Library/Application Support/fnm/aliases/default/bin")]) if (existsSync(join(dir, "node"))) return dir;
  return null;
}

function childEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, CI: "1", WRANGLER_SEND_METRICS: "false", FORCE_COLOR: "0", NO_COLOR: "1" };
  for (const key of Object.keys(env)) if (/^(ELECTRON_|CLAUDE|ANTHROPIC_)/.test(key)) delete env[key];
  // the user's usual tool folders first, so pnpm runs the Node their shell runs and wrangler finds pnpm
  const node = preferredNodeDir();
  env.PATH = [...(node ? [node] : []), join(homedir(), ".local/bin"), join(homedir(), "Library/pnpm"), "/opt/homebrew/bin", "/usr/local/bin", env.PATH ?? ""].join(delimiter);
  return env;
}

function run(bin: string, args: string[], cwd: string, timeoutMs = 600_000): Promise<{ code: number; out: string }> {
  return new Promise((resolve) => {
    execFile(bin, args, { cwd, env: childEnv(), timeout: timeoutMs, maxBuffer: 16 * 1024 * 1024 }, (error, stdout, stderr) => {
      const code = error && "code" in error && typeof error.code === "number" ? error.code : error ? 1 : 0;
      resolve({ code, out: `${stdout}${stderr}` });
    });
  });
}
async function must(bin: string, args: string[], cwd: string, what: string): Promise<string> {
  const r = await run(bin, args, cwd);
  if (r.code !== 0) throw new Error(`${what} failed:\n${r.out.trim().split("\n").slice(-25).join("\n")}`);
  return r.out;
}

// ---- listing, creating ----

export async function list(wsId: string): Promise<LocalApp[]> {
  const installed = await workspaceApi.workspace(wsId).then((w) => w.apps, () => [] as InstalledApp[]);
  return listApps(appsDir(wsId)).map((a) => {
    const hit = installed.find((i) => i.app === a.manifest.id);
    return { dir: a.dir, manifest: a.manifest, problems: a.problems, installed: !!hit, installedVersion: hit?.version ?? null };
  });
}

export async function create(wsId: string, input: NewAppInput): Promise<LocalApp> {
  const root = workspaceRoot(wsId);
  const core = coreDir();
  const { dir, manifest } = scaffoldApp({ core, dest: join(root, "apps", input.id), id: input.id, name: input.name, mount: input.mount, description: input.description, color: input.color, icon: input.icon });
  // the core packages are linked from wherever this folder sits; a packaged build ships them beside the template
  const pnpm = needBin("pnpm", PNPM_HINT);
  await must(pnpm, ["install"], root, "Installing the app's dependencies");
  const git = findBin("git");
  if (git && !existsSync(join(dir, ".git"))) {
    await run(git, ["init", "-q"], dir);
    await run(git, ["add", "-A"], dir);
    await run(git, ["-c", "user.name=SuperGrid", "-c", "user.email=desktop@supergrid.local", "commit", "-q", "-m", `Create ${manifest.name} from the SuperGrid template`], dir);
  }
  return { dir, manifest, problems: [], installed: false, installedVersion: null };
}

// ---- files ----

const SKIP = new Set(["node_modules", ".git", "build", ".react-router", ".wrangler", "dist", ".DS_Store"]);
export function files(wsId: string, appId: string, path = ""): FileEntry[] {
  const root = appDir(wsId, appId);
  const dir = resolve(root, path);
  if (relative(root, dir).startsWith("..")) throw new Error("Outside the app.");
  return readdirSync(dir)
    .filter((n) => !SKIP.has(n))
    .map((name): FileEntry => { const p = join(dir, name); const st = statSync(p); return { name, path: relative(root, p), kind: st.isDirectory() ? "dir" : "file", size: st.isDirectory() ? undefined : st.size }; })
    .sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === "dir" ? -1 : 1));
}
export function read(wsId: string, appId: string, path: string): { text: string; size: number; truncated: boolean } {
  const root = appDir(wsId, appId);
  const file = resolve(root, path);
  if (relative(root, file).startsWith("..")) throw new Error("Outside the app.");
  const size = statSync(file).size;
  const max = 200_000;
  const text = readFileSync(file, "utf8");
  return { text: size > max ? text.slice(0, max) : text, size, truncated: size > max };
}

// ---- dev servers ----

type Dev = { child: ChildProcessWithoutNullStreams; port: number; startedAt: string; log: DevLogLine[]; owner: WebContents | null };
const devs = new Map<string, Dev>();
const devKey = (wsId: string, appId: string) => `${wsId}/${appId}`;

/** True when something answers on the port, over IPv4 or IPv6 (a Vite server often listens on ::1 only). */
const inUse = (port: number, host: string) => new Promise<boolean>((resolve) => { const c = connect({ port, host }); c.once("connect", () => { c.destroy(); resolve(true); }); c.once("error", () => resolve(false)); c.setTimeout(300, () => { c.destroy(); resolve(false); }); });
async function freePort(from = 5310): Promise<number> {
  for (let port = from; port <= 5400; port++) {
    if (await inUse(port, "127.0.0.1") || await inUse(port, "::1")) continue;
    const ok = await new Promise<boolean>((resolve) => { const srv = createServer(); srv.once("error", () => resolve(false)); srv.listen(port, () => srv.close(() => resolve(true))); });
    if (ok) return port;
  }
  throw new Error("No free port between 5310 and 5400.");
}
const devStatusOf = (d: Dev | undefined): DevServerStatus => (d ? { running: true, pid: d.child.pid, port: d.port, url: `http://localhost:${d.port}`, startedAt: d.startedAt } : { running: false });
export const devStatus = (wsId: string, appId: string): DevServerStatus => devStatusOf(devs.get(devKey(wsId, appId)));
export const devLog = (wsId: string, appId: string): DevLogLine[] => devs.get(devKey(wsId, appId))?.log ?? [];

export async function devStart(wsId: string, appId: string, owner: WebContents): Promise<DevServerStatus> {
  const key = devKey(wsId, appId);
  const have = devs.get(key);
  if (have) { have.owner = owner; return devStatusOf(have); }
  const dir = appDir(wsId, appId);
  const pnpm = needBin("pnpm", PNPM_HINT);
  const port = await freePort();
  const env = { ...childEnv(), SG_WORKSPACE_CONFIG: join(coreDir(), "workspace/wrangler.jsonc") };
  const child = spawn(pnpm, ["exec", "react-router", "dev", "--port", String(port)], { cwd: dir, env, stdio: ["pipe", "pipe", "pipe"] });
  const d: Dev = { child, port, startedAt: new Date().toISOString(), log: [], owner };
  devs.set(key, d);
  const push = (stream: DevLogLine["stream"], line: string) => {
    const entry: DevLogLine = { wsId, app: appId, stream, line: line.replace(/\x1b\[[0-9;]*[A-Za-z]/g, ""), at: new Date().toISOString() };
    d.log.push(entry);
    if (d.log.length > 500) d.log.splice(0, d.log.length - 500);
    if (d.owner && !d.owner.isDestroyed()) d.owner.send(channels.appsDevLogLine, entry);
  };
  push("sys", `pnpm exec react-router dev --port ${port}  (in ${dir})`);
  createInterface({ input: child.stdout }).on("line", (l) => push("out", l));
  createInterface({ input: child.stderr }).on("line", (l) => push("err", l));
  child.on("error", (e) => push("sys", `could not start: ${e.message}`));
  child.on("exit", (code) => { push("sys", `exited with ${code ?? "signal"}`); if (devs.get(key) === d) devs.delete(key); });
  return devStatusOf(d);
}
export function devStop(wsId: string, appId: string): DevServerStatus {
  const key = devKey(wsId, appId);
  const d = devs.get(key);
  if (d) { devs.delete(key); try { d.child.kill("SIGTERM"); } catch { /* gone */ } }
  return { running: false };
}
export function stopAllDev(): void {
  for (const key of [...devs.keys()]) { const [ws, a] = key.split("/"); devStop(ws!, a!); }
}

// ---- git ----

export async function git(wsId: string, appId: string): Promise<GitStatus> {
  const dir = appDir(wsId, appId);
  const bin = findBin("git");
  if (!bin || !existsSync(join(dir, ".git"))) return { branch: null, changed: 0, ahead: 0, behind: 0, remote: null, commits: [] };
  const branch = (await run(bin, ["rev-parse", "--abbrev-ref", "HEAD"], dir)).out.trim() || null;
  const changed = (await run(bin, ["status", "--porcelain"], dir)).out.split("\n").filter(Boolean).length;
  const remoteRun = await run(bin, ["remote", "get-url", "origin"], dir);
  const remote = remoteRun.code === 0 ? remoteRun.out.trim() || null : null;
  const ab = (await run(bin, ["rev-list", "--left-right", "--count", "HEAD...@{upstream}"], dir)).out.trim().split(/\s+/);
  const log = (await run(bin, ["log", "-n", "30", "--format=%H%x1f%h%x1f%aI%x1f%an%x1f%s"], dir)).out;
  const commits = log.split("\n").filter(Boolean).map((l) => { const [hash, short, date, author, message] = l.split("\x1f"); return { hash: hash!, short: short!, date: date!, author: author!, message: message ?? "" }; });
  return { branch, changed, ahead: Number(ab[0]) || 0, behind: Number(ab[1]) || 0, remote, commits };
}

// ---- build, install, uninstall ----

const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
/** React Router's output as a Worker upload: server modules plus client assets (the same shape `sg release` makes). */
function compiledBuild(dir: string): Compiled {
  const server = join(dir, "build/server"), client = join(dir, "build/client");
  if (!existsSync(join(server, "index.js"))) throw new Error("The build produced no build/server/index.js.");
  const cfg = JSON.parse(readFileSync(join(server, "wrangler.json"), "utf8")) as { compatibility_date: string; compatibility_flags?: string[] };
  const rel = (root: string, p: string) => relative(root, p).split("\\").join("/");
  return {
    main: "index.js",
    modules: Object.fromEntries(walk(server).filter((f) => f.endsWith(".js")).map((f) => [rel(server, f), readFileSync(f, "utf8")])),
    assets: existsSync(client) ? Object.fromEntries(walk(client).filter((f) => !relative(client, f).startsWith(".")).map((f) => [rel(client, f), readFileSync(f).toString("base64")])) : {},
    compatibilityDate: cfg.compatibility_date,
    compatibilityFlags: cfg.compatibility_flags ?? [],
  };
}

function linkFor(wsId: string): { accountId: string; prefix: string } {
  const { orgs, currentOrg } = readState();
  const org = orgs.find((o) => o.id === currentOrg && o.cloudflare) ?? orgs.find((o) => o.cloudflare);
  if (!org?.cloudflare) throw new Error("No Cloudflare account is connected to an organization.");
  return { accountId: org.cloudflare.accountId, prefix: org.cloudflare.prefix };
}

export async function install(wsId: string, appId: string, sender: WebContents): Promise<InstalledApp> {
  let current: AppDeployProgress["step"] = "build";
  const report = (p: Omit<AppDeployProgress, "wsId" | "app">) => { current = p.step; if (!sender.isDestroyed()) sender.send(channels.appsDeploy, { wsId, app: appId, ...p }); };
  const dir = appDir(wsId, appId);
  const ws = await workspaceApi.workspace(wsId);
  if (!ws.worker) throw new Error("The local dev workspace runs apps from their folders (pnpm dev); installing is for cloud workspaces.");
  const { manifest } = listApps(appsDir(wsId)).find((a) => a.manifest.id === appId)!;
  try {
    report({ step: "build" });
    const pnpm = needBin("pnpm", PNPM_HINT);
    if (!existsSync(join(dir, "node_modules"))) await must(pnpm, ["install"], workspaceRoot(wsId), "Installing dependencies");
    await must(pnpm, ["build"], dir, "Building the app");
    const compiled = compiledBuild(dir);
    report({ step: "upload", detail: `${Object.keys(compiled.modules).length} modules, ${Object.keys(compiled.assets).length} assets` });
    const { accountId, prefix } = linkFor(wsId);
    const cf = await cfClient(accountId);
    const { facts, apps } = await readWorkspace(cf, ws.worker);
    const inlined = (await import("@supergrid/app-kit/vite")).withInlineIcon(manifest, dir);
    const app = await installLocalApp(cf, { ws: facts, apps, prefix, manifest: inlined, compiled });
    report({ step: "route" });
    workspaceApi.invalidate(accountId, prefix);
    report({ step: "done" });
    const { worker: _w, mount, ...summary } = app;
    return { ...summary, public: mount ?? undefined, admin: !!app.admin, api: !!app.api };
  } catch (e) {
    // the error lands on the step that was running, so the list shows where it stopped
    report({ step: current, error: (e as Error).message });
    throw e;
  }
}

export async function uninstall(wsId: string, appId: string): Promise<void> {
  const ws = await workspaceApi.workspace(wsId);
  if (!ws.worker) throw new Error("The local dev workspace has nothing to uninstall.");
  const { accountId, prefix } = linkFor(wsId);
  const cf = await cfClient(accountId);
  const { facts, apps } = await readWorkspace(cf, ws.worker);
  await cloudUninstall(cf, { ws: facts, apps, app: checkId(appId, "an app id") });
  workspaceApi.invalidate(accountId, prefix);
}

export async function packages(wsId: string) {
  const local = listApps(appsDir(wsId)).map((a) => a.manifest);
  const installed = await workspaceApi.workspace(wsId).then((w) => w.apps, () => [] as InstalledApp[]);
  // installed apps without a folder here count with what their route summary knows (no packages); local folders win
  const manifests = [...local, ...installed.filter((i) => !local.some((l) => l.id === i.app)).map((i) => ({ id: i.app, name: i.name, version: i.version ?? "0.0.0" }))];
  return packageGraph(manifests);
}

export function registerApps(): void {
  ipcMain.handle(channels.appsList, (_e, wsId: unknown) => list(checkId(wsId, "a workspace id")));
  ipcMain.handle(channels.appsDir, (_e, wsId: unknown) => appsDir(checkId(wsId, "a workspace id")));
  ipcMain.handle(channels.appsCreate, (_e, wsId: unknown, input: unknown) => {
    const i = (input ?? {}) as Partial<NewAppInput>;
    if (typeof i.id !== "string" || typeof i.name !== "string") throw new Error("A new app needs an id and a name.");
    return create(checkId(wsId, "a workspace id"), { id: i.id, name: i.name, mount: i.mount === null ? null : typeof i.mount === "string" ? i.mount : undefined, description: typeof i.description === "string" ? i.description : undefined, color: typeof i.color === "string" ? i.color : undefined, icon: typeof i.icon === "string" ? i.icon : undefined });
  });
  ipcMain.handle(channels.appsReveal, (_e, wsId: unknown, appId: unknown) => { shell.showItemInFolder(appDir(checkId(wsId, "a workspace id"), checkId(appId, "an app id"))); });
  ipcMain.handle(channels.appsFiles, (_e, wsId: unknown, appId: unknown, path: unknown) => files(checkId(wsId, "a workspace id"), checkId(appId, "an app id"), typeof path === "string" ? path : ""));
  ipcMain.handle(channels.appsRead, (_e, wsId: unknown, appId: unknown, path: unknown) => { if (typeof path !== "string") throw new Error("Which file?"); return read(checkId(wsId, "a workspace id"), checkId(appId, "an app id"), path); });
  ipcMain.handle(channels.appsInstall, (e, wsId: unknown, appId: unknown) => install(checkId(wsId, "a workspace id"), checkId(appId, "an app id"), e.sender));
  ipcMain.handle(channels.appsUninstall, (_e, wsId: unknown, appId: unknown) => uninstall(checkId(wsId, "a workspace id"), checkId(appId, "an app id")));
  ipcMain.handle(channels.appsDevStatus, (_e, wsId: unknown, appId: unknown) => devStatus(checkId(wsId, "a workspace id"), checkId(appId, "an app id")));
  ipcMain.handle(channels.appsDevStart, (e, wsId: unknown, appId: unknown) => devStart(checkId(wsId, "a workspace id"), checkId(appId, "an app id"), e.sender));
  ipcMain.handle(channels.appsDevStop, (_e, wsId: unknown, appId: unknown) => devStop(checkId(wsId, "a workspace id"), checkId(appId, "an app id")));
  ipcMain.handle(channels.appsDevLog, (_e, wsId: unknown, appId: unknown) => devLog(checkId(wsId, "a workspace id"), checkId(appId, "an app id")));
  ipcMain.handle(channels.appsGit, (_e, wsId: unknown, appId: unknown) => git(checkId(wsId, "a workspace id"), checkId(appId, "an app id")));
  ipcMain.handle(channels.appsPackages, (_e, wsId: unknown) => packages(checkId(wsId, "a workspace id")));
  ipcMain.handle(channels.wsAdminUrl, (_e, wsId: unknown, appId: unknown, next: unknown) => workspaceApi.adminUrl(checkId(wsId, "a workspace id"), checkId(appId, "an app id"), typeof next === "string" ? next : "/"));
  ipcMain.handle(channels.wsAppManifest, (_e, wsId: unknown, appId: unknown) => workspaceApi.appManifest(checkId(wsId, "a workspace id"), checkId(appId, "an app id")));
  ipcMain.handle(channels.wsAppCall, (_e, wsId: unknown, appId: unknown, op: unknown, input: unknown) => { if (typeof op !== "string") throw new Error("Which operation?"); return workspaceApi.appCall(checkId(wsId, "a workspace id"), checkId(appId, "an app id"), op, input); });
  app.on("before-quit", stopAllDev);
}

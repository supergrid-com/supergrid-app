import { generateWorkspace, readApps, readWorkspaceFile, type GeneratedApp } from "@supergrid/app-kit/generate";
import { routeSummary, type RouteSummary } from "@supergrid/app-kit/manifest";
import { packageGraph } from "@supergrid/app-kit/packages";
import { scaffoldAppFolder, scaffoldWorkspace } from "@supergrid/app-kit/scaffold";
import { withInlineIcon } from "@supergrid/app-kit/vite";
import { activeVersion, deployWorkspace, readWorkspace, type Compiled } from "@supergrid/cloud";
import { app, BrowserWindow, ipcMain, shell, type WebContents } from "electron";
import { execFile, spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { accessSync, constants, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { connect, createServer } from "node:net";
import { homedir } from "node:os";
import { delimiter, join, relative, resolve } from "node:path";
import { createInterface } from "node:readline";
import { channels, type DeployProgress, type DeployVersion, type DevLogLine, type DevServerStatus, type FileEntry, type GitStatus, type InstalledApp, type LocalApp, type LocalWorkspace, type NewAppInput, type RepoInfo, type WorkspaceMode, type WorkspaceSummary } from "../shared/bridge";
import { cfClient } from "./cf-api";
import { readState } from "./config";
import { localWorker, localWorkspace } from "./local";
import * as workspaceApi from "./workspace-api";

// The workspace's repo on this Mac (WORKSPACE-REPO.md): `workspaces/<id>` under the app's data folder is one git repo and
// one pnpm workspace made from core/templates/workspace, with every app a folder under apps/. From here the repo is
// found or made, an app folder is added (core/templates/app), its files and git are read, its one dev server runs
// (`react-router dev`, the whole workspace on one port), and the repo is built and uploaded as the workspace Worker.
//
// Live or Dev is a mode per workspace, kept here so the main process answers alike for the renderer and the agent's
// tools: in Dev the workspace's URL is the dev server's and its apps are the folders (workspace-api.ts `workspace`).

const ID_RE = /^[a-z][a-z0-9-]*$/;
const checkId = (v: unknown, what: string): string => { if (typeof v !== "string" || !ID_RE.test(v)) throw new Error(`Not ${what}.`); return v; };

/** The core folder: the repo's in development, the bundled copy in a packaged build. */
export function coreDir(): string {
  const candidates = [resolve(app.getAppPath(), "../core"), join(process.resourcesPath ?? "", "core")];
  const hit = candidates.find((d) => existsSync(join(d, "templates/workspace/supergrid.workspace.json")));
  if (!hit) throw new Error(`SuperGrid core (with templates/) was not found beside the app: looked in ${candidates.join(", ")}.`);
  return hit;
}

/** Where a workspace's repo lives, made or not. */
export const repoDir = (wsId: string): string => join(app.getPath("userData"), "workspaces", checkId(wsId, "a workspace id"));
const isRepo = (dir: string) => existsSync(join(dir, "supergrid.workspace.json"));
function repo(wsId: string): string {
  const dir = repoDir(wsId);
  if (!isRepo(dir)) throw new Error("This workspace has no repo on this Mac yet; open it once (or switch to Dev) and it is made.");
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
/** A commit of everything in the repo, as the desktop; nothing happens without git on the Mac. */
async function commit(dir: string, message: string): Promise<void> {
  const git = findBin("git");
  if (!git) return;
  if (!existsSync(join(dir, ".git"))) await run(git, ["init", "-q", "-b", "main"], dir);
  await run(git, ["add", "-A"], dir);
  await run(git, ["-c", "user.name=SuperGrid", "-c", "user.email=desktop@supergrid.local", "commit", "-q", "-m", message], dir);
}

// ---- the repo ----

/** The deployed Worker's facts a repo's wrangler.jsonc carries, so `wrangler deploy` from a terminal targets the same database. */
export type RepoFacts = { name: string; worker: string; url: string; d1Id?: string };

/** Writes the Worker's name, address and database into the repo's wrangler.jsonc (string replaces: the file is JSONC with comments). */
export function writeRepoFacts(wsId: string, facts: Partial<RepoFacts>): void {
  const path = join(repo(wsId), "wrangler.jsonc");
  let text = readFileSync(path, "utf8");
  if (facts.d1Id) text = text.replace(/"database_id":\s*"[^"]*"/, `"database_id": ${JSON.stringify(facts.d1Id)}`);
  if (facts.url) text = text.replace(/"WORKSPACE_URL":\s*"[^"]*"/, `"WORKSPACE_URL": ${JSON.stringify(facts.url)}`);
  if (facts.name) text = text.replace(/"WORKSPACE_NAME":\s*"[^"]*"/, `"WORKSPACE_NAME": ${JSON.stringify(facts.name)}`);
  writeFileSync(path, text);
}

const installs = new Map<string, Promise<void>>();
/** `pnpm install` in the repo once its node_modules are missing; one at a time per repo. */
function installed(dir: string): Promise<void> {
  if (existsSync(join(dir, "node_modules/.pnpm")) || existsSync(join(dir, "node_modules/@supergrid"))) return Promise.resolve();
  let p = installs.get(dir);
  if (!p) {
    p = must(needBin("pnpm", PNPM_HINT), ["install"], dir, "Installing the repo's dependencies").then(() => undefined);
    installs.set(dir, p);
    p.finally(() => installs.delete(dir));
  }
  return p;
}

const makes = new Map<string, Promise<RepoInfo>>();
/**
 * The repo for a workspace, made the first time: from core/templates/workspace with the Worker's name and address, the
 * database id when the account can be read, `.sg/` generated, dependencies installed, one commit. A folder in the old
 * shape (one repo per app, before WORKSPACE-REPO.md) is moved aside, not deleted. `facts` come from provisioning; for a
 * workspace that already exists they are read from its Worker.
 */
export function ensureRepo(wsId: string, facts?: RepoFacts): Promise<RepoInfo> {
  const dir = repoDir(wsId);
  let p = makes.get(wsId);
  if (!p) {
    p = (async () => {
      if (!isRepo(dir)) {
        if (existsSync(dir) && readdirSync(dir).length) {
          const aside = `${dir}-before-repo-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "")}`;
          renameSync(dir, aside);
        }
        const known = facts ?? (await repoFactsFor(wsId));
        scaffoldWorkspace({ core: coreDir(), dest: dir, id: wsId, name: known.name, worker: known.worker });
        generateWorkspace(dir);
        writeRepoFacts(wsId, known);
        // the lockfile is part of the repo, so the first commit comes after the install
        await installed(dir);
        await commit(dir, `Create the ${known.name} workspace from the SuperGrid template`);
      }
      await installed(dir);
      return { dir, apps: await list(wsId) };
    })();
    makes.set(wsId, p);
    p.finally(() => makes.delete(wsId));
  }
  return p;
}

/** `pnpm install` in the repo again, after folders were added to it outside the New App flow (the demo's apps). */
export async function installRepo(wsId: string): Promise<void> {
  await must(needBin("pnpm", PNPM_HINT), ["install"], repo(wsId), "Installing the repo's dependencies");
}

/**
 * The Worker's facts for a workspace that exists in the account: its name and address from the listing, its database
 * when the account answers. A workspace that lives only on this Mac has its name and a Worker name for a later deploy.
 */
async function repoFactsFor(wsId: string): Promise<RepoFacts> {
  const local = localWorkspace(wsId);
  if (local) return { name: local.name, worker: localWorker(wsId), url: "" };
  const ws = await workspaceApi.cloudWorkspace(wsId);
  const facts: RepoFacts = { name: ws.name, worker: ws.worker, url: ws.url };
  try {
    const { accountId } = linkFor(wsId);
    const cf = await cfClient(accountId);
    facts.d1Id = (await readWorkspace(cf, ws.worker)).facts.d1Id;
  } catch { /* the placeholder id stays until a deploy reads it */ }
  return facts;
}

/** A commit of the repo as the desktop (after provisioning wrote the Worker's facts into it). */
export const commitRepo = (wsId: string, message: string): Promise<void> => commit(repo(wsId), message);

/** `SG_WORKSPACE_TOKEN` from the repo's .dev.vars: what the dev server trusts. */
export function devToken(wsId: string): string {
  const path = join(repo(wsId), ".dev.vars");
  const m = existsSync(path) ? /^SG_WORKSPACE_TOKEN=(.*)$/m.exec(readFileSync(path, "utf8")) : null;
  const token = m?.[1]?.trim().replace(/^["']|["']$/g, "");
  if (!token) throw new Error("The repo's .dev.vars has no SG_WORKSPACE_TOKEN.");
  return token;
}

/** Tells every window that what a workspace serves changed (the agent added an app, a deploy landed, the dev server stopped). */
export function changed(wsId: string): void {
  workspaceApi.invalidate();
  for (const w of BrowserWindow.getAllWindows()) if (!w.isDestroyed()) w.webContents.send(channels.wsChanged, wsId);
}

// ---- apps in the repo ----

const generated = (wsId: string): GeneratedApp[] => { const dir = repo(wsId); return readApps(dir, readWorkspaceFile(dir)); };

export async function list(wsId: string): Promise<LocalApp[]> {
  if (!isRepo(repoDir(wsId))) return [];
  const deployed = localWorkspace(wsId) ? [] : await workspaceApi.cloudWorkspace(wsId).then((w) => w.apps, () => [] as InstalledApp[]);
  return generated(wsId).map((a) => {
    const hit = deployed.find((i) => i.app === a.id);
    return { dir: a.dir, manifest: a.manifest, problems: a.problems, disabled: a.disabled, installed: !!hit, installedVersion: hit?.version ?? null };
  });
}

/** The apps the build composes, as the deployed Worker's ROUTES would list them: what the Dev summary shows. */
export function builtApps(wsId: string): InstalledApp[] {
  if (!isRepo(repoDir(wsId))) return [];
  return generated(wsId).filter((a) => !a.disabled && !a.problems.length).map((a) => summaryOf(a));
}
const summaryOf = (a: GeneratedApp): RouteSummary => routeSummary(withInlineIcon(a.manifest, a.dir));

export async function create(wsId: string, input: NewAppInput): Promise<LocalApp> {
  const { dir: ws } = await ensureRepo(wsId);
  const { dir, manifest } = scaffoldAppFolder({ core: coreDir(), workspace: ws, id: input.id, name: input.name, mount: input.mount, home: input.home, description: input.description, color: input.color, icon: input.icon });
  generateWorkspace(ws);
  await commit(ws, `Add ${manifest.name}`);
  changed(wsId);
  return { dir, manifest, problems: [], disabled: false, installed: false, installedVersion: null };
}

// ---- files ----

const SKIP = new Set(["node_modules", ".git", "build", ".react-router", ".wrangler", "dist", ".DS_Store"]);
export function files(wsId: string, path = ""): FileEntry[] {
  const root = repo(wsId);
  const dir = resolve(root, path);
  if (relative(root, dir).startsWith("..")) throw new Error("Outside the repo.");
  return readdirSync(dir)
    .filter((n) => !SKIP.has(n))
    .map((name): FileEntry => { const p = join(dir, name); const st = statSync(p); return { name, path: relative(root, p), kind: st.isDirectory() ? "dir" : "file", size: st.isDirectory() ? undefined : st.size }; })
    .sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === "dir" ? -1 : 1));
}
export function read(wsId: string, path: string): { text: string; size: number; truncated: boolean } {
  const root = repo(wsId);
  const file = resolve(root, path);
  if (relative(root, file).startsWith("..")) throw new Error("Outside the repo.");
  const size = statSync(file).size;
  const max = 200_000;
  const text = readFileSync(file, "utf8");
  return { text: size > max ? text.slice(0, max) : text, size, truncated: size > max };
}

// ---- the dev server: one per workspace ----

type Dev = { child: ChildProcessWithoutNullStreams; port: number; startedAt: string; ready: boolean; log: DevLogLine[]; owner: WebContents | null; starting: Promise<DevServerStatus> | null };
/** Where a dev server's log lines go: the window that started it, or nowhere when the agent's tools or the demo did. */
type Owner = WebContents | null;
const devs = new Map<string, Dev>();

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
const devUrl = (port: number) => `http://localhost:${port}`;
const devStatusOf = (d: Dev | undefined): DevServerStatus => (d ? { running: true, ready: d.ready, pid: d.child.pid, port: d.port, url: devUrl(d.port), startedAt: d.startedAt } : { running: false });
export const devStatus = (wsId: string): DevServerStatus => devStatusOf(devs.get(wsId));
export const devLog = (wsId: string): DevLogLine[] => devs.get(wsId)?.log ?? [];

/** Polls the dev server's health until it answers, or the process is gone, or two minutes pass (the first start compiles the workspace). */
async function waitReady(wsId: string, d: Dev, push: (stream: DevLogLine["stream"], line: string) => void): Promise<DevServerStatus> {
  const started = Date.now();
  while (Date.now() - started < 120_000) {
    if (devs.get(wsId) !== d) throw new Error(`The dev server stopped while starting:\n${d.log.filter((l) => l.stream !== "sys").slice(-15).map((l) => l.line).join("\n")}`);
    try {
      const res = await fetch(`${devUrl(d.port)}/_ws/health`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) { d.ready = true; push("sys", `ready at ${devUrl(d.port)}`); return devStatusOf(d); }
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("The dev server did not answer within two minutes. Its log is on the Server page.");
}

export async function devStart(wsId: string, owner: Owner): Promise<DevServerStatus> {
  const have = devs.get(wsId);
  if (have) { if (owner) have.owner = owner; return have.starting ? have.starting : devStatusOf(have); }
  const { dir } = await ensureRepo(wsId);
  const pnpm = needBin("pnpm", PNPM_HINT);
  const port = await freePort();
  const child = spawn(pnpm, ["exec", "react-router", "dev", "--port", String(port)], { cwd: dir, env: childEnv(), stdio: ["pipe", "pipe", "pipe"] });
  const d: Dev = { child, port, startedAt: new Date().toISOString(), ready: false, log: [], owner, starting: null };
  devs.set(wsId, d);
  const push = (stream: DevLogLine["stream"], line: string) => {
    const entry: DevLogLine = { wsId, stream, line: line.replace(/\x1b\[[0-9;]*[A-Za-z]/g, ""), at: new Date().toISOString() };
    d.log.push(entry);
    if (d.log.length > 500) d.log.splice(0, d.log.length - 500);
    if (d.owner && !d.owner.isDestroyed()) d.owner.send(channels.appsDevLogLine, entry);
  };
  push("sys", `pnpm exec react-router dev --port ${port}  (in ${dir})`);
  createInterface({ input: child.stdout }).on("line", (l) => push("out", l));
  createInterface({ input: child.stderr }).on("line", (l) => push("err", l));
  child.on("error", (e) => push("sys", `could not start: ${e.message}`));
  child.on("exit", (code) => { const was = devs.get(wsId) === d; if (was) devs.delete(wsId); push("sys", `exited with ${code ?? "signal"}`); if (was) changed(wsId); });
  d.starting = waitReady(wsId, d, push).finally(() => { d.starting = null; });
  return d.starting;
}
export function devStop(wsId: string): DevServerStatus {
  const d = devs.get(wsId);
  if (d) { devs.delete(wsId); try { d.child.kill("SIGTERM"); } catch { /* gone */ } }
  return { running: false };
}
export function stopAllDev(): void {
  for (const key of [...devs.keys()]) devStop(key);
}

// ---- Live / Dev ----

const modes = new Map<string, WorkspaceMode>();
/** A workspace that lives only on this Mac is always in Dev: it has nothing deployed to be live on. */
export const modeOf = (wsId: string): WorkspaceMode => (localWorkspace(wsId) ? "dev" : (modes.get(wsId) ?? "live"));
/** Dev starts the dev server first, so the summary that comes back already points at it; Live stops the server. */
export async function setMode(wsId: string, mode: WorkspaceMode, owner: WebContents) {
  if (mode === "live" && localWorkspace(wsId)) throw new Error("This workspace lives only on this Mac, so it has no live version.");
  if (mode === "dev") await devStart(wsId, owner);
  modes.set(wsId, mode);
  if (mode === "live") devStop(wsId);
  workspaceApi.invalidate();
  return workspaceApi.workspace(wsId);
}

/**
 * A workspace that lives only on this Mac, as the desktop sees it: its repo and its dev server. `start` starts the server
 * when it isn't running (the shell opening it, a tool of the agent's); without it the URL is empty until something does.
 */
export async function localSummary(rec: LocalWorkspace, start: boolean, owner: Owner = null): Promise<WorkspaceSummary> {
  let dev = devStatus(rec.id);
  if (start && !(dev.running && dev.ready)) dev = await devStart(rec.id, owner);
  return { id: rec.id, name: rec.name, url: dev.running && dev.url ? dev.url : "", worker: localWorker(rec.id), version: "dev", apps: builtApps(rec.id), dev: true, local: true, ...(rec.demo ? { demo: true } : {}) };
}

// ---- git ----

export async function git(wsId: string): Promise<GitStatus> {
  const dir = repo(wsId);
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

// ---- build and deploy ----

const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
/** React Router's output as a Worker upload: server modules plus client assets (the same shape `sg release` makes). */
export function compiledBuild(dir: string): Compiled {
  const server = join(dir, "build/server"), client = join(dir, "build/client");
  if (!existsSync(join(server, "index.js"))) throw new Error("The build produced no build/server/index.js.");
  const cfg = JSON.parse(readFileSync(join(server, "wrangler.json"), "utf8")) as { compatibility_date: string; compatibility_flags?: string[]; assets?: { html_handling?: string; not_found_handling?: string; run_worker_first?: boolean | string[] } };
  const rel = (root: string, p: string) => relative(root, p).split("\\").join("/");
  const { html_handling, not_found_handling, run_worker_first } = cfg.assets ?? {};
  const assetsConfig = Object.fromEntries(Object.entries({ html_handling, not_found_handling, run_worker_first }).filter(([, v]) => v !== undefined));
  return {
    main: "index.js",
    modules: Object.fromEntries(walk(server).filter((f) => f.endsWith(".js")).map((f) => [rel(server, f), readFileSync(f, "utf8")])),
    assets: existsSync(client) ? Object.fromEntries(walk(client).filter((f) => !relative(client, f).startsWith(".")).map((f) => [rel(client, f), readFileSync(f).toString("base64")])) : {},
    ...(Object.keys(assetsConfig).length ? { assetsConfig } : {}),
    compatibilityDate: cfg.compatibility_date,
    compatibilityFlags: cfg.compatibility_flags ?? [],
  };
}

/** `pnpm build` in the repo after `.sg/` is regenerated; what goes up, and the apps it holds. */
export async function build(wsId: string): Promise<{ compiled: Compiled; apps: RouteSummary[] }> {
  const { dir } = await ensureRepo(wsId);
  const g = generateWorkspace(dir);
  await must(needBin("pnpm", PNPM_HINT), ["build"], dir, "Building the workspace");
  return { compiled: compiledBuild(dir), apps: g.apps.filter((a) => !a.disabled).map(summaryOf) };
}

/** What a deploy is called: the day and the commit it was built from, `-dirty` when the tree has changes. */
export async function buildVersion(wsId: string): Promise<string> {
  const dir = repo(wsId);
  const day = new Date().toISOString().slice(0, 10);
  const bin = findBin("git");
  if (!bin || !existsSync(join(dir, ".git"))) return `${day}.local`;
  const short = (await run(bin, ["rev-parse", "--short", "HEAD"], dir)).out.trim() || "local";
  const dirty = (await run(bin, ["status", "--porcelain"], dir)).out.trim() ? "-dirty" : "";
  return `${day}.${short}${dirty}`;
}

function linkFor(wsId: string): { accountId: string; prefix: string } {
  const { orgs, currentOrg } = readState();
  const org = orgs.find((o) => o.id === currentOrg && o.cloudflare) ?? orgs.find((o) => o.cloudflare);
  if (!org?.cloudflare) throw new Error("No Cloudflare account is connected to an organization.");
  return { accountId: org.cloudflare.accountId, prefix: org.cloudflare.prefix };
}

/** The repo built and uploaded as the workspace Worker, one version, with the steps reported to the window that asked. */
export async function deploy(wsId: string, sender: WebContents): Promise<{ version: string }> {
  let current: DeployProgress["step"] = "generate";
  const report = (p: Omit<DeployProgress, "wsId">) => { current = p.step; if (!sender.isDestroyed()) sender.send(channels.appsDeployProgress, { wsId, ...p }); };
  const ws = await workspaceApi.cloudWorkspace(wsId);
  try {
    report({ step: "generate" });
    const { dir } = await ensureRepo(wsId);
    const bad = generateWorkspace(dir).apps.filter((a) => !a.disabled && a.problems.length);
    if (bad.length) throw new Error(`Fix the manifest of ${bad.map((a) => a.id).join(", ")} first.`);
    report({ step: "build" });
    const { compiled, apps } = await build(wsId);
    const version = await buildVersion(wsId);
    report({ step: "upload", detail: `${version}: ${apps.length} app${apps.length === 1 ? "" : "s"}, ${Object.keys(compiled.modules).length} modules, ${Object.keys(compiled.assets).length} assets` });
    const { accountId, prefix } = linkFor(wsId);
    const cf = await cfClient(accountId);
    const { facts } = await readWorkspace(cf, ws.worker);
    await deployWorkspace(cf, { ws: facts, apps, compiled, version });
    writeRepoFacts(wsId, { d1Id: facts.d1Id, url: facts.url, name: facts.name });
    workspaceApi.invalidate(accountId, prefix);
    changed(wsId);
    report({ step: "done", detail: version });
    return { version };
  } catch (e) {
    // the error lands on the step that was running, so the list shows where it stopped
    report({ step: current, error: (e as Error).message });
    throw e;
  }
}

/** The Worker's versions as Cloudflare lists them, newest first, with the one serving traffic marked. */
export async function deploys(wsId: string): Promise<DeployVersion[]> {
  const ws = await workspaceApi.cloudWorkspace(wsId);
  const cf = await cfClient(linkFor(wsId).accountId);
  type Item = { id: string; number?: number; metadata?: { created_on?: string }; annotations?: Record<string, string> };
  const r = await cf.get<{ items?: Item[] } | Item[]>(cf.acct(`/workers/scripts/${ws.worker}/versions?per_page=25`));
  const items = Array.isArray(r) ? r : (r.items ?? []);
  const active = await activeVersion(cf, ws.worker).catch(() => null);
  return items.map((v) => ({ id: v.id, number: v.number ?? 0, createdAt: v.metadata?.created_on ?? null, message: v.annotations?.["workers/message"] ?? null, active: v.id === active })).sort((a, b) => b.number - a.number);
}

export async function packages(wsId: string) {
  const local = isRepo(repoDir(wsId)) ? generated(wsId).map((a) => a.manifest) : [];
  const deployed = await workspaceApi.cloudWorkspace(wsId).then((w) => w.apps, () => [] as InstalledApp[]);
  // deployed apps without a folder here count with what their route summary knows (no packages); local folders win
  const manifests = [...local, ...deployed.filter((i) => !local.some((l) => l.id === i.app)).map((i) => ({ id: i.app, name: i.name, version: i.version ?? "0.0.0" }))];
  return packageGraph(manifests);
}

export function registerApps(): void {
  const ws = (v: unknown) => checkId(v, "a workspace id");
  ipcMain.handle(channels.appsRepo, (_e, wsId: unknown) => ensureRepo(ws(wsId)));
  ipcMain.handle(channels.appsList, (_e, wsId: unknown) => list(ws(wsId)));
  ipcMain.handle(channels.appsDir, (_e, wsId: unknown) => repoDir(ws(wsId)));
  ipcMain.handle(channels.appsCreate, (_e, wsId: unknown, input: unknown) => {
    const i = (input ?? {}) as Partial<NewAppInput>;
    if (typeof i.id !== "string" || typeof i.name !== "string") throw new Error("A new app needs an id and a name.");
    return create(ws(wsId), { id: i.id, name: i.name, mount: i.mount === null ? null : typeof i.mount === "string" ? i.mount : undefined, home: typeof i.home === "string" ? i.home : undefined, description: typeof i.description === "string" ? i.description : undefined, color: typeof i.color === "string" ? i.color : undefined, icon: typeof i.icon === "string" ? i.icon : undefined });
  });
  ipcMain.handle(channels.appsReveal, (_e, wsId: unknown, path: unknown) => { const root = repo(ws(wsId)); const p = typeof path === "string" ? resolve(root, path) : root; if (relative(root, p).startsWith("..")) throw new Error("Outside the repo."); shell.showItemInFolder(p); });
  ipcMain.handle(channels.appsFiles, (_e, wsId: unknown, path: unknown) => files(ws(wsId), typeof path === "string" ? path : ""));
  ipcMain.handle(channels.appsRead, (_e, wsId: unknown, path: unknown) => { if (typeof path !== "string") throw new Error("Which file?"); return read(ws(wsId), path); });
  ipcMain.handle(channels.appsDeploy, (e, wsId: unknown) => deploy(ws(wsId), e.sender));
  ipcMain.handle(channels.appsDeploys, (_e, wsId: unknown) => deploys(ws(wsId)));
  ipcMain.handle(channels.appsDevStatus, (_e, wsId: unknown) => devStatus(ws(wsId)));
  ipcMain.handle(channels.appsDevStart, (e, wsId: unknown) => devStart(ws(wsId), e.sender));
  ipcMain.handle(channels.appsDevStop, (_e, wsId: unknown) => devStop(ws(wsId)));
  ipcMain.handle(channels.appsDevLog, (_e, wsId: unknown) => devLog(ws(wsId)));
  ipcMain.handle(channels.appsGit, (_e, wsId: unknown) => git(ws(wsId)));
  ipcMain.handle(channels.appsPackages, (_e, wsId: unknown) => packages(ws(wsId)));
  ipcMain.handle(channels.wsGet, (_e, wsId: unknown) => workspaceApi.workspace(ws(wsId)));
  ipcMain.handle(channels.wsSetMode, (e, wsId: unknown, mode: unknown) => { if (mode !== "live" && mode !== "dev") throw new Error("Live or Dev."); return setMode(ws(wsId), mode, e.sender); });
  ipcMain.handle(channels.wsAdminUrl, (_e, wsId: unknown, appId: unknown, next: unknown) => workspaceApi.adminUrl(ws(wsId), checkId(appId, "an app id"), typeof next === "string" ? next : "/"));
  ipcMain.handle(channels.wsAppManifest, (_e, wsId: unknown, appId: unknown) => workspaceApi.appManifest(ws(wsId), checkId(appId, "an app id")));
  ipcMain.handle(channels.wsAppCall, (_e, wsId: unknown, appId: unknown, op: unknown, input: unknown) => { if (typeof op !== "string") throw new Error("Which operation?"); return workspaceApi.appCall(ws(wsId), checkId(appId, "an app id"), op, input); });
  app.on("before-quit", stopAllDev);
}

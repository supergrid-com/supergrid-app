import { ipcMain, type WebContents } from "electron";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DEMO_APPS, DEMO_NAME, demoSeed } from "../../../core/demo/seed";
import { channels, type DemoProgress, type WorkspaceSummary } from "../shared/bridge";
import * as apps from "./apps";
import * as d1 from "./d1";
import { forgetLocalWorkspace, localWorker, localWorkspace, localWorkspaces, saveLocalWorkspace } from "./local";
import * as workspaceApi from "./workspace-api";

// The demo workspace: a workspace that lives only on this Mac (local.ts), made from the same template as any other, with
// the demo's apps added as folders and its local D1 filled from core/demo/seed.ts. Nothing about it is simulated: the
// repo, the dev server, the Database pages and the agent's tools all work on it the way they work on a real workspace in
// Dev. It needs no Cloudflare account, and a packaged build brings its own Node and pnpm (toolchain.ts); git is optional.

const DEMO_ID = "demo";
const SEEDED = "demo.seeded";

const jobs = new Map<string, Promise<WorkspaceSummary>>();
function once(key: string, run: () => Promise<WorkspaceSummary>): Promise<WorkspaceSummary> {
  let p = jobs.get(key);
  if (!p) {
    p = run();
    jobs.set(key, p);
    p.finally(() => jobs.delete(key)).catch(() => undefined);
  }
  return p;
}

/** The dev server's local D1, as the Database pages reach it. */
const targetOf = (ws: WorkspaceSummary) => ({ accountId: "", worker: localWorker(ws.id), local: { ws: ws.id, url: ws.url } });

/** Statements in a few requests rather than thousands: the dev server runs each one in turn. */
async function run(ws: WorkspaceSummary, statements: string[]): Promise<void> {
  for (let i = 0; i < statements.length; i += 8) await d1.raw(targetOf(ws), statements.slice(i, i + 8).join(";\n"));
}

/** Renames the template's one entity and its screens in the manifest, so the app reads as what it is (Posts, not Items). */
function relabel(dir: string, label: string, plural: string): void {
  const path = join(dir, "supergrid.app.json");
  const m = JSON.parse(readFileSync(path, "utf8")) as { data?: Record<string, { label?: string; plural?: string }>; admin?: { nav?: { id: string; label: string }[]; create?: { label: string }[] } };
  if (m.data?.item) Object.assign(m.data.item, { label, plural });
  for (const n of m.admin?.nav ?? []) if (n.id === "items") n.label = plural;
  for (const c of m.admin?.create ?? []) c.label = `New ${label}`;
  writeFileSync(path, `${JSON.stringify(m, null, 2)}\n`);
}

/** The demo's apps, added once: a folder per app from core/templates/app, renamed, then one install and one commit. */
async function addApps(wsId: string, dir: string): Promise<boolean> {
  const missing = DEMO_APPS.filter((a) => !existsSync(join(dir, "apps", a.id, "supergrid.app.json")));
  for (const a of missing) {
    const made = await apps.create(wsId, { id: a.id, name: a.name, mount: a.mount, description: a.description, color: a.color });
    relabel(made.dir, a.label, a.plural);
  }
  if (!missing.length) return false;
  await apps.installRepo(wsId);
  await apps.commitRepo(wsId, `Add the demo's apps: ${missing.map((a) => a.name).join(", ")}`);
  return true;
}

/** Fills the local D1, once per database: the core rows, then (after a page load has run the apps' migrations) theirs, then workflows. */
async function seed(ws: WorkspaceSummary, report: (p: Omit<DemoProgress, "id">) => void, force = false): Promise<void> {
  if (!force) {
    const done = await d1.query(targetOf(ws), "SELECT value FROM settings WHERE key = ?", [SEEDED]).catch(() => null);
    if (done?.results.length) return;
  }
  const data = demoSeed();
  report({ step: "data", detail: `${data.counts.contacts} contacts, ${data.counts.events.toLocaleString("en-US")} events` });
  await run(ws, data.core);
  // the apps' tables are made by their migrations, which run on the first request that reaches an app
  await fetch(`${ws.url}/`).catch(() => undefined);
  for (const a of DEMO_APPS) await fetch(`${ws.url}${a.mount}`).catch(() => undefined);
  await run(ws, data.apps);
  for (const call of data.rpc) await workspaceApi.rpc(ws.id, call.method, call.args);
  await d1.query(targetOf(ws), "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [SEEDED, JSON.stringify(new Date().toISOString())]);
}

/** Makes the demo workspace for an organization, or brings the one this Mac has to it and opens that. */
export function create(orgId: string, sender: WebContents | null): Promise<WorkspaceSummary> {
  return once(DEMO_ID, async () => {
    const report = (p: Omit<DemoProgress, "id">) => { if (sender && !sender.isDestroyed()) sender.send(channels.demoProgress, { id: DEMO_ID, ...p }); };
    const have = localWorkspace(DEMO_ID);
    saveLocalWorkspace({ id: DEMO_ID, name: have?.name ?? DEMO_NAME, org: orgId, demo: true, createdAt: have?.createdAt ?? new Date().toISOString() });
    report({ step: "repo" });
    const { dir } = await apps.ensureRepo(DEMO_ID);
    report({ step: "apps" });
    const added = await addApps(DEMO_ID, dir);
    // a running server compiled the repo before the apps were in it
    if (added) apps.devStop(DEMO_ID);
    report({ step: "server" });
    await apps.devStart(DEMO_ID, sender);
    const ws = await apps.localSummary(localWorkspace(DEMO_ID)!, true, sender);
    await seed(ws, report);
    report({ step: "done" });
    apps.changed(DEMO_ID);
    return apps.localSummary(localWorkspace(DEMO_ID)!, true, sender);
  });
}

/** Throws the demo's local database away and seeds it again. The repo (apps, code, commits) stays as it is. */
export function reset(wsId: string, sender: WebContents | null): Promise<WorkspaceSummary> {
  const rec = localWorkspace(wsId);
  if (!rec?.demo) return Promise.reject(new Error("Only the demo workspace can be reset."));
  return once(wsId, async () => {
    const report = (p: Omit<DemoProgress, "id">) => { if (sender && !sender.isDestroyed()) sender.send(channels.demoProgress, { id: wsId, ...p }); };
    report({ step: "server" });
    apps.devStop(wsId);
    // give the server a moment to let go of its database files
    await new Promise((r) => setTimeout(r, 800));
    rmSync(join(apps.repoDir(wsId), ".wrangler/state"), { recursive: true, force: true });
    await apps.devStart(wsId, sender);
    const ws = await apps.localSummary(rec, true, sender);
    await seed(ws, report, true);
    report({ step: "done" });
    apps.changed(wsId);
    return apps.localSummary(rec, true, sender);
  });
}

/** Removes the demo from this Mac: its dev server, its repo and its record. */
export function remove(wsId: string): void {
  const rec = localWorkspace(wsId);
  if (!rec?.demo) throw new Error("Only the demo workspace can be removed here.");
  apps.devStop(wsId);
  rmSync(apps.repoDir(wsId), { recursive: true, force: true });
  forgetLocalWorkspace(wsId);
  apps.changed(wsId);
}

export function registerDemo(): void {
  const ws = (v: unknown) => { if (typeof v !== "string" || !localWorkspaces().some((w) => w.id === v)) throw new Error("Not a workspace on this Mac."); return v; };
  ipcMain.handle(channels.demoCreate, (e, orgId: unknown) => { if (typeof orgId !== "string" || !orgId) throw new Error("Which organization?"); return create(orgId, e.sender); });
  ipcMain.handle(channels.demoReset, (e, wsId: unknown) => reset(ws(wsId), e.sender));
  ipcMain.handle(channels.demoRemove, (_e, wsId: unknown) => remove(ws(wsId)));
}

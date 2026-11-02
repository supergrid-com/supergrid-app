// The things a platform does to an account: pure functions over a client and the facts they need, so the caller decides where those facts live.
import { CONTRACT } from "@supergrid/app-kit/rpc";
import { appBinding, resourceNames } from "@supergrid/app-kit/names";
import type { AppManifest } from "@supergrid/app-kit/manifest";
import type { Cf } from "./client";
import { activeVersion, deployVersion, getSettings, putWorker, setBindings, uploadVersion, type Binding, type Compiled } from "./deploy";
import type { Bundle } from "./release";
import { accountSubdomain, d1Bookmark, enableWorkersDev, ensureD1, ensureNamespace, ensureRepo, repoToken } from "./resources";
import { seedRepo, updateRepo, type RepoUpdate } from "./repo";

export type WorkspaceFacts = { id: string; name: string; url: string; token: string; d1Id: string; worker: string };
export type InstalledApp = { app: string; name: string; worker: string; mount: string | null; admin: boolean; api: boolean; nav?: { label: string; path: string }[] };

const plain = (name: string, text: string): Binding => ({ type: "plain_text", name, text });

export function installedFrom(manifest: AppManifest, worker: string): InstalledApp {
  return { app: manifest.id, name: manifest.name, worker, mount: manifest.public?.mount ?? null, admin: !!manifest.admin, api: !!manifest.api, nav: manifest.admin?.nav };
}

function workspaceBindings(ws: WorkspaceFacts, apps: InstalledApp[], version: string): Binding[] {
  return [
    { type: "d1", name: "DB", id: ws.d1Id },
    plain("WORKSPACE_ID", ws.id), plain("WORKSPACE_NAME", ws.name), plain("WORKSPACE_URL", ws.url), plain("SG_VERSION", version),
    { type: "secret_text", name: "SG_WORKSPACE_TOKEN", text: ws.token },
    { type: "json", name: "ROUTES", json: apps.map((a) => ({ app: a.app, name: a.name, binding: appBinding(a.app), public: a.mount ?? undefined, admin: a.admin, api: a.api, nav: a.nav })) },
    ...apps.map((a): Binding => ({ type: "service", name: appBinding(a.app), service: a.worker })),
  ];
}

/** Waits for a Worker's health URL to report a version. A new workers.dev host takes a moment to answer. */
export async function waitForVersion(url: string, version: string, tries = 15) {
  let last = "no answer";
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(`${url}?t=${Date.now()}`);
      const body = (await res.json().catch(() => null)) as { version?: string } | null;
      if (res.ok && body?.version === version) return;
      last = `${res.status} ${JSON.stringify(body)}`;
    } catch (e) { last = String(e); }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`Never saw ${version} at ${url}: ${last}`);
}

/** Create a workspace: its D1, its Worker from the signed bundle, its workers.dev URL. */
export async function provisionWorkspace(cf: Cf, opts: { id: string; name: string; prefix: string; bundle: Bundle }): Promise<WorkspaceFacts> {
  const worker = resourceNames(opts.prefix).workspace(opts.id);
  const d1 = await ensureD1(cf, worker);
  const subdomain = await accountSubdomain(cf, opts.prefix);
  const token = Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, "0")).join("");
  const ws: WorkspaceFacts = { id: opts.id, name: opts.name, url: `https://${worker}.${subdomain}.workers.dev`, token, d1Id: d1.uuid, worker };
  await putWorker(cf, worker, opts.bundle, workspaceBindings(ws, [], opts.bundle.version), `Create workspace, ${opts.bundle.version}`);
  await enableWorkersDev(cf, worker);
  await waitForVersion(`${ws.url}/_ws/health`, opts.bundle.version);
  return ws;
}

export type Rollout = { previous: string | null; bookmark: string };

/** Run a new version of one Worker with a restore point taken first. Rolls the code back if `check` fails. */
async function rollOut(cf: Cf, worker: string, d1Id: string, compiled: Compiled, bindings: Binding[], message: string, check: () => Promise<void>): Promise<Rollout> {
  const bookmark = await d1Bookmark(cf, d1Id);
  const previous = await activeVersion(cf, worker);
  const next = await uploadVersion(cf, worker, compiled, bindings, message);
  await deployVersion(cf, worker, next, message);
  try { await check(); }
  catch (e) {
    if (previous) await deployVersion(cf, worker, previous, `Rolled back: ${message}`);
    throw new Error(`Update failed its health check and was rolled back. ${(e as Error).message}`);
  }
  return { previous, bookmark };
}

export const updateWorkspace = (cf: Cf, ws: WorkspaceFacts, apps: InstalledApp[], bundle: Bundle) =>
  rollOut(cf, ws.worker, ws.d1Id, bundle, workspaceBindings(ws, apps, bundle.version), `Workspace ${bundle.version}`, () => waitForVersion(`${ws.url}/_ws/health`, bundle.version));

/** A running platform replacing itself. Whatever is bound today stays bound, and secrets keep values the platform never reads. */
export async function updatePlatform(cf: Cf, opts: { worker: string; d1Id: string; url: string; bundle: Bundle }) {
  const { bindings } = await getSettings(cf, opts.worker);
  const next = bindings.filter((b) => b.name !== "SG_VERSION").map((b): Binding => (b.type === "secret_text" ? { type: "inherit", name: b.name } : b));
  next.push(plain("SG_VERSION", opts.bundle.version));
  return rollOut(cf, opts.worker, opts.d1Id, opts.bundle, next, `Platform ${opts.bundle.version}`, () => waitForVersion(`${opts.url}/api/health`, opts.bundle.version));
}

const appBindings = (ws: WorkspaceFacts, version: string): Binding[] => [
  { type: "service", name: "WORKSPACE", service: ws.worker, entrypoint: "WorkspaceApi" },
  { type: "d1", name: "DB", id: ws.d1Id },
  plain("SG_VERSION", version),
];

const installConfig = (ws: WorkspaceFacts, worker: string, b: Bundle) => JSON.stringify({
  name: worker, main: "./workers/app.ts", compatibility_date: b.compatibilityDate, compatibility_flags: b.compatibilityFlags, workers_dev: false,
  services: [{ binding: "WORKSPACE", service: ws.worker, entrypoint: "WorkspaceApi" }],
  d1_databases: [{ binding: "DB", database_name: ws.worker, database_id: ws.d1Id }],
  observability: { enabled: true },
}, null, 2) + "\n";

export type AppInstall = { app: InstalledApp; repo: string | null; commit: string | null; warning?: string };

/** Install an app into a workspace: deploy the signed build, give the user the source in an Artifacts repo, route to it. */
export async function installApp(cf: Cf, opts: { ws: WorkspaceFacts; apps: InstalledApp[]; prefix: string; manifest: AppManifest; bundle: Bundle }): Promise<AppInstall> {
  const { ws, manifest, bundle, prefix } = opts;
  const names = resourceNames(prefix);
  const worker = names.app(ws.id, manifest.id);
  await putWorker(cf, worker, bundle, appBindings(ws, bundle.version), `Install ${manifest.id} ${bundle.version}`);
  const app = installedFrom(manifest, worker);
  await setWorkspaceApps(cf, ws, [...opts.apps.filter((a) => a.app !== app.app), app]);

  // The app works without its repo, so a problem here is reported rather than undoing the install.
  try {
    await ensureNamespace(cf, names.namespace);
    const repo = await ensureRepo(cf, names.namespace, worker, `${manifest.name} for workspace ${ws.id}`);
    const token = await repoToken(cf, names.namespace, worker);
    const commit = await seedRepo({ remote: repo.remote, token, source: bundle.source ?? {}, version: bundle.version, install: { "wrangler.jsonc": installConfig(ws, worker, bundle) } });
    return { app, repo: `${names.namespace}/${worker}`, commit };
  } catch (e) {
    return { app, repo: null, commit: null, warning: `The app is live, but its source repo could not be created: ${(e as Error).message}` };
  }
}

export type AppUpdate = RepoUpdate & { deployed: boolean };

/** Update an installed app. The signed build only goes live when main holds exactly what it was built from. */
export async function updateApp(cf: Cf, opts: { ws: WorkspaceFacts; prefix: string; worker: string; repo: string | null; commit: string | null; bundle: Bundle }): Promise<AppUpdate> {
  const { ws, bundle, worker, prefix } = opts;
  const deploy = async () => { const v = await uploadVersion(cf, worker, bundle, appBindings(ws, bundle.version), `App ${bundle.version}`); await deployVersion(cf, worker, v, `App ${bundle.version}`); };
  if (!opts.repo) { await deploy(); return { outcome: "untouched", commit: "", deployed: true }; }
  const namespace = resourceNames(prefix).namespace;
  const repo = await ensureRepo(cf, namespace, worker, "");
  const token = await repoToken(cf, namespace, worker);
  const result = await updateRepo({ remote: repo.remote, token, source: bundle.source ?? {}, version: bundle.version, lastCommit: opts.commit });
  if (result.outcome === "untouched") await deploy();
  return { ...result, deployed: result.outcome === "untouched" };
}

/** Point a workspace at its apps. Keeps the running code and version; only bindings change. */
export async function setWorkspaceApps(cf: Cf, ws: WorkspaceFacts, apps: InstalledApp[]) {
  const { bindings } = await getSettings(cf, ws.worker);
  const version = (bindings.find((b) => b.name === "SG_VERSION") as { text?: string } | undefined)?.text ?? "unknown";
  await setBindings(cf, ws.worker, workspaceBindings(ws, apps, version));
}

export { CONTRACT };

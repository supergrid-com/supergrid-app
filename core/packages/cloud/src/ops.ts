// The things a platform does to an account: pure functions over a client and the facts they need, so the caller decides where those facts live.
import { CONTRACT } from "@supergrid/app-kit/rpc";
import { appBinding, resourceNames } from "@supergrid/app-kit/names";
import type { AppManifest } from "@supergrid/app-kit/manifest";
import type { Cf } from "./client";
import { activeVersion, deployVersion, getSettings, putWorker, setBindings, uploadVersion, type Binding, type Compiled } from "./deploy";
import type { Bundle } from "./release";
import { CfApiError } from "./client";
import { accountSubdomain, d1Bookmark, enableWorkersDev, ensureConsumer, ensureD1, ensureNamespace, ensureQueue, ensureR2Bucket, ensureRepo, putSchedules, putWorkflow, repoToken } from "./resources";
import { seedRepo, updateRepo, type RepoUpdate } from "./repo";
import { mintToken } from "./resources";
import { MEDIA_PERMISSIONS } from "./scopes";

/** `queue` is null on accounts without Queues: the Worker then writes events straight to D1. */
export type WorkspaceFacts = { id: string; name: string; url: string; token: string; d1Id: string; worker: string; queue?: string | null; /** The R2 bucket, or null when the account has no R2. */ files?: string | null; /** Filled from the client when absent. */ accountId?: string; /** How the media token was set, when this run set it. */ media?: MediaSource };
export type InstalledApp = { app: string; name: string; worker: string; mount: string | null; admin: boolean; api: boolean; nav?: { label: string; path: string }[]; subscribes?: string[] };

const plain = (name: string, text: string): Binding => ({ type: "plain_text", name, text });
const hex = (bytes: number) => Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(16).padStart(2, "0")).join("");
/** Seals the workspace's secrets table. Set at creation and never read again; every later deploy carries it as `inherit`. */
const SECRETS_KEY = "SG_SECRETS_KEY";
const WORKSPACE_TOKEN = "SG_WORKSPACE_TOKEN";

export function installedFrom(manifest: AppManifest, worker: string): InstalledApp {
  return { app: manifest.id, name: manifest.name, worker, mount: manifest.public?.mount ?? null, admin: !!manifest.admin, api: !!manifest.api, nav: manifest.admin?.nav, subscribes: manifest.subscribes };
}

function workspaceBindings(ws: WorkspaceFacts, apps: InstalledApp[], version: string, keep: Binding[] = []): Binding[] {
  return [
    ...keep,
    { type: "d1", name: "DB", id: ws.d1Id },
    plain("WORKSPACE_ID", ws.id), plain("WORKSPACE_NAME", ws.name), plain("WORKSPACE_URL", ws.url), plain("SG_VERSION", version),
    // The token is written once, at creation; an update inherits whatever is deployed, since the desktop may have minted its own since.
    ...(keep.some((b) => b.name === WORKSPACE_TOKEN) ? [] : [{ type: "secret_text", name: WORKSPACE_TOKEN, text: ws.token } as Binding]),
    { type: "json", name: "ROUTES", json: apps.map((a) => ({ app: a.app, name: a.name, binding: appBinding(a.app), public: a.mount ?? undefined, admin: a.admin, api: a.api, nav: a.nav, subscribes: a.subscribes })) },
    ...apps.map((a): Binding => ({ type: "service", name: appBinding(a.app), service: a.worker })),
    ...(ws.queue ? [{ type: "queue", name: "EVENTS", queue_name: ws.queue } as Binding] : []),
    { type: "workflow", name: "HOOK_RUN", workflow_name: hooksWorkflow(ws), class_name: HOOKS_CLASS },
    // Assets: the bucket for files, and the account id the Images and Stream APIs need beside the media token the desktop sets (workspace/ASSETS.md).
    ...(ws.files ? [{ type: "r2_bucket", name: "FILES", bucket_name: ws.files } as Binding] : []),
    plain("CF_ACCOUNT_ID", cfAccountId(ws)),
  ];
}

/** `<worker>-files`, the workspace's R2 bucket. */
export const filesBucket = (ws: Pick<WorkspaceFacts, "worker">) => `${ws.worker}-files`;
/** The bucket when the account has R2; without it the workspace keeps Images and Stream and refuses plain files until an update finds R2 enabled. */
async function ensureFiles(cf: Cf, ws: WorkspaceFacts): Promise<string | null> {
  const name = filesBucket(ws);
  try { await ensureR2Bucket(cf, name); return name; }
  catch (e) {
    if (e instanceof CfApiError) { console.warn(`R2 unavailable for ${ws.worker}; no file storage. ${e.message}`); return null; }
    throw e;
  }
}
const cfAccountId = (ws: WorkspaceFacts) => ws.accountId ?? "";
/** The media token, a secret, so the workspace can call Images, Stream and Analytics (workspace/ASSETS.md). */
export const MEDIA_TOKEN = "SG_MEDIA_TOKEN";
/** Where a workspace's media token comes from: minted here as a token of its own (Images, Stream, analytics and nothing else)
 * when the caller's credential may create tokens, else `shared`, the caller's own token, written as is. */
export type MediaCredential = { shared?: string };
export type MediaSource = "minted" | "shared" | null;
export async function mediaToken(cf: Cf, ws: Pick<WorkspaceFacts, "worker">, cred?: MediaCredential): Promise<{ text: string; source: MediaSource } | null> {
  try { return { text: (await mintToken(cf, `${ws.worker} media`, MEDIA_PERMISSIONS)).value, source: "minted" }; }
  catch (e) {
    if (!(e instanceof CfApiError || e instanceof Error)) throw e;
    if (cred?.shared) { console.warn(`No token of its own for ${ws.worker}; it gets the shared one. ${e.message}`); return { text: cred.shared, source: "shared" }; }
    console.warn(`No media token for ${ws.worker}: files only until an update can set one. ${e.message}`);
    return null;
  }
}

const QUEUE_CONSUMER = { batch_size: 50, max_retries: 5, max_wait_time_ms: 2000 };
/** `<worker>-hooks`, the Workflow that runs the workspace's hooks; its class lives in the workspace Worker. */
export const hooksWorkflow = (ws: Pick<WorkspaceFacts, "worker">) => `${ws.worker}-hooks`;
const HOOKS_CLASS = "HookRun";
const ROLLUP_CRON = "17 3 * * *";

/**
 * The queue and its dead-letter queue, created when the account allows it. Queues are a paid feature, so an account
 * without them gets a workspace that writes events directly; the facts record which.
 */
async function ensureQueues(cf: Cf, ws: WorkspaceFacts): Promise<{ queue: string; dlq: string } | null> {
  const queue = `${ws.worker}-events`, dlq = `${ws.worker}-events-dlq`;
  try {
    await ensureQueue(cf, dlq);
    await ensureQueue(cf, queue);
    return { queue, dlq };
  } catch (e) {
    if (e instanceof CfApiError) { console.warn(`Queues unavailable for ${ws.worker}; events will be written directly. ${e.message}`); return null; }
    throw e;
  }
}
/** After the script exists: the consumers, the hooks Workflow (which must be re-pointed at every new script version), and the nightly rollup. */
async function attachQueues(cf: Cf, ws: WorkspaceFacts, queues: { queue: string; dlq: string } | null) {
  await putWorkflow(cf, hooksWorkflow(ws), ws.worker, HOOKS_CLASS);
  if (queues) {
    const [q, d] = await Promise.all([ensureQueue(cf, queues.queue), ensureQueue(cf, queues.dlq)]);
    await ensureConsumer(cf, q.queue_id, ws.worker, QUEUE_CONSUMER, queues.dlq);
    await ensureConsumer(cf, d.queue_id, ws.worker, { ...QUEUE_CONSUMER, max_retries: 1 });
  }
  await putSchedules(cf, ws.worker, [ROLLUP_CRON]);
}

/** The secrets a workspace Worker holds that nothing here can be sure of the value of, kept as they are across a redeploy. */
const keptSecrets = (bindings: Binding[]): Binding[] => bindings.filter((b) => b.type === "secret_text" && (b.name === SECRETS_KEY || b.name === WORKSPACE_TOKEN || b.name === MEDIA_TOKEN)).map((b): Binding => ({ type: "inherit", name: b.name }));

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

/** The steps provisionWorkspace reports, in order, for a caller that shows progress. */
export const PROVISION_STEPS = ["database", "queues", "files", "media", "worker", "wiring", "url", "health"] as const;
export type ProvisionStep = (typeof PROVISION_STEPS)[number];

/** Create a workspace: its D1, its Worker from the signed bundle, its workers.dev URL. `onStep` hears each step as it starts. */
export async function provisionWorkspace(cf: Cf, opts: { id: string; name: string; prefix: string; bundle: Bundle; media?: MediaCredential; onStep?: (step: ProvisionStep) => void }): Promise<WorkspaceFacts> {
  const step = opts.onStep ?? (() => {});
  const worker = resourceNames(opts.prefix).workspace(opts.id);
  step("database");
  const d1 = await ensureD1(cf, worker);
  const subdomain = await accountSubdomain(cf, opts.prefix);
  const token = hex(24);
  const ws: WorkspaceFacts = { id: opts.id, name: opts.name, url: `https://${worker}.${subdomain}.workers.dev`, token, d1Id: d1.uuid, worker, accountId: cf.accountId };
  step("queues");
  const queues = await ensureQueues(cf, ws);
  ws.queue = queues?.queue ?? null;
  step("files");
  ws.files = await ensureFiles(cf, ws);
  step("media");
  const media = await mediaToken(cf, ws, opts.media);
  ws.media = media?.source ?? null;
  const secrets: Binding[] = [{ type: "secret_text", name: SECRETS_KEY, text: hex(32) }, ...(media ? [{ type: "secret_text", name: MEDIA_TOKEN, text: media.text } as Binding] : [])];
  step("worker");
  await putWorker(cf, worker, opts.bundle, workspaceBindings(ws, [], opts.bundle.version, secrets), `Create workspace, ${opts.bundle.version}`);
  step("wiring");
  await attachQueues(cf, ws, queues);
  step("url");
  await enableWorkersDev(cf, worker);
  step("health");
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

/** A workspace from before queues gets them here, so an update is also how older workspaces grow the event pipeline. */
export async function updateWorkspace(cf: Cf, ws: WorkspaceFacts, apps: InstalledApp[], bundle: Bundle, media?: MediaCredential): Promise<Rollout> {
  const queues = ws.queue === null ? null : await ensureQueues(cf, ws);
  ws.queue = queues?.queue ?? null;
  ws.accountId ??= cf.accountId;
  ws.files = await ensureFiles(cf, ws);
  const { bindings } = await getSettings(cf, ws.worker);
  // A workspace from before media gets its token here, the same way it grows queues and the bucket.
  const kept = keptSecrets(bindings);
  if (!kept.some((b) => b.name === MEDIA_TOKEN)) {
    const m = await mediaToken(cf, ws, media);
    if (m) { kept.push({ type: "secret_text", name: MEDIA_TOKEN, text: m.text }); ws.media = m.source; }
  }
  const rollout = await rollOut(cf, ws.worker, ws.d1Id, bundle, workspaceBindings(ws, apps, bundle.version, kept), `Workspace ${bundle.version}`, () => waitForVersion(`${ws.url}/_ws/health`, bundle.version));
  await attachQueues(cf, ws, queues);
  return rollout;
}

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
  await setBindings(cf, ws.worker, workspaceBindings(ws, apps, version, keptSecrets(bindings)));
}

export { CONTRACT };

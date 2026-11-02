// Runs the platform's own code against a real Cloudflare account, as the signed-in wrangler user. Needs a published feed.
//   pnpm smoke create            create a workspace, install hello, check it serves
//   pnpm smoke update <id>       run the workspace, app and platform updates against what the feed offers
//   pnpm smoke destroy <id>      delete that workspace and everything in it
//   pnpm smoke app <id>          update only its app
//   pnpm smoke edit <id> <file> <text>  push a user's edit to the app's repo
//   pnpm smoke broken <id>       try a broken workspace release; it must roll back
//   pnpm smoke tamper            try an edited pointer and a wrong hash; both must be refused
//   pnpm smoke platform          update only the installed platform
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { resourceNames, newWorkspaceId } from "@supergrid/app-kit/names";
import { activeVersion, createCf, deleteD1, deleteRepo, deleteWorker, ensureD1, ensureRepo, fetchBundle, fetchRelease, installApp, provisionWorkspace, repoToken, updateApp, updatePlatform, updateWorkspace, verifySigned, type AppInstall, type InstalledApp, type Release, type Signed, type WorkspaceFacts } from "@supergrid/cloud";

const PREFIX = "sgdev", ACCOUNT = "fc84d234400f2316c52025fe91ed5289";
const FEED = process.env.FEED ?? "https://sgdev-feed.supergrid-operator.workers.dev";
const PUB = readFileSync(new URL("./keys/release.pub", import.meta.url), "utf8").trim();
const token = spawnSync("../core/node_modules/.bin/wrangler", ["auth", "token"], { encoding: "utf8" }).stdout.trim().split("\n").pop()!;
const cf = createCf(token, ACCOUNT);
const stateFile = (id: string) => new URL(`./.state-${id}.json`, import.meta.url);
type State = { ws: WorkspaceFacts; apps: InstalledApp[]; repo: string | null; commit: string | null };
const log = (m: string) => console.log(`• ${m}`);
const get = async (url: string) => { const r = await fetch(`${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`); return { status: r.status, text: await r.text() }; };

async function create() {
  const id = newWorkspaceId();
  const rel = await fetchRelease(FEED, "workspace", PUB);
  log(`creating workspace ${id} from ${rel.version}`);
  const ws = await provisionWorkspace(cf, { id, name: "Smoke test", prefix: PREFIX, bundle: await fetchBundle(FEED, rel) });
  log(`live at ${ws.url}`);
  const appRel = await fetchRelease(FEED, "app-hello", PUB);
  const r: AppInstall = await installApp(cf, { ws, apps: [], prefix: PREFIX, manifest: appRel.manifest!, bundle: await fetchBundle(FEED, appRel) });
  log(`hello installed; repo ${r.repo}${r.warning ? `; WARNING ${r.warning}` : ""}`);
  writeFileSync(stateFile(id), JSON.stringify({ ws, apps: [r.app], repo: r.repo, commit: r.commit } satisfies State));
  for (let i = 0; i < 10; i++) { const p = await get(`${ws.url}/hello`); log(`GET /hello: ${p.status}`); if (p.status === 200) break; await new Promise((r) => setTimeout(r, 3000)); }
  console.log(`id=${id}`);
}

async function update(id: string) {
  const s = JSON.parse(readFileSync(stateFile(id), "utf8")) as State;
  const wsRel = await fetchRelease(FEED, "workspace", PUB);
  log(`workspace to ${wsRel.version}`);
  const r = await updateWorkspace(cf, s.ws, s.apps, await fetchBundle(FEED, wsRel));
  log(`done; previous version ${r.previous}, restore point ${r.bookmark}`);
  log(`GET /hello after workspace update: ${(await get(`${s.ws.url}/hello`)).status}`);
  const appRel = await fetchRelease(FEED, "app-hello", PUB);
  log(`hello to ${appRel.version}`);
  const a = await updateApp(cf, { ws: s.ws, prefix: PREFIX, worker: s.apps[0]!.worker, repo: s.repo, commit: s.commit, bundle: await fetchBundle(FEED, appRel) });
  log(`outcome ${a.outcome}, deployed ${a.deployed}`);
  if (a.commit) s.commit = a.commit;
  writeFileSync(stateFile(id), JSON.stringify(s));
  log(`GET /hello after app update: ${(await get(`${s.ws.url}/hello`)).status}`);
  const pRel = await fetchRelease(FEED, "platform", PUB);
  const names = resourceNames(PREFIX);
  const url = `https://${names.platform}.supergrid-operator.workers.dev`;
  const before = JSON.parse((await get(`${url}/api/health`)).text) as { version: string };
  if (before.version === pRel.version) { log(`platform already ${pRel.version}`); return; }
  log(`platform ${before.version} to ${pRel.version}`);
  const db = await ensureD1(cf, names.platform);
  const p = await updatePlatform(cf, { worker: names.platform, d1Id: db.uuid, url, bundle: await fetchBundle(FEED, pRel) });
  log(`done; previous version ${p.previous}`);
  log(`health ${(await get(`${url}/api/health`)).text}; /login ${(await get(`${url}/login`)).status}`);
}

async function destroy(id: string) {
  const s = JSON.parse(readFileSync(stateFile(id), "utf8")) as State;
  for (const a of s.apps) await deleteWorker(cf, a.worker);
  if (s.repo) await deleteRepo(cf, PREFIX, s.apps[0]!.worker);
  await deleteWorker(cf, s.ws.worker);
  await deleteD1(cf, s.ws.d1Id);
  if (existsSync(stateFile(id))) rmSync(stateFile(id));
  log(`deleted workspace ${id}`);
}

/** Update only the app, reporting what the repo did. */
async function appOnly(id: string) {
  const s = JSON.parse(readFileSync(stateFile(id), "utf8")) as State;
  const rel = await fetchRelease(FEED, "app-hello", PUB);
  const a = await updateApp(cf, { ws: s.ws, prefix: PREFIX, worker: s.apps[0]!.worker, repo: s.repo, commit: s.commit, bundle: await fetchBundle(FEED, rel) });
  log(`hello to ${rel.version}: outcome ${a.outcome}, deployed ${a.deployed}`);
  if (a.commit) s.commit = a.commit;
  writeFileSync(stateFile(id), JSON.stringify(s));
}

/** Change a file in the install's repo, the way a user or their agent would. */
async function edit(id: string, file: string, text: string) {
  const s = JSON.parse(readFileSync(stateFile(id), "utf8")) as State;
  const worker = s.apps[0]!.worker;
  const repo = await ensureRepo(cf, PREFIX, worker, "");
  const secret = (await repoToken(cf, PREFIX, worker)).split("?")[0]!;
  const dir = `/tmp/sg-smoke-${id}`;
  rmSync(dir, { recursive: true, force: true });
  const git = (...a: string[]) => { const r = spawnSync("git", a, { encoding: "utf8", cwd: existsSync(dir) ? dir : undefined }); if (r.status !== 0) throw new Error(`git ${a[0]} failed: ${r.stderr.replaceAll(secret, "<token>")}`); return r.stdout; };
  git("clone", "-q", "-b", "main", repo.remote.replace("https://", `https://x:${secret}@`), dir);
  const path = `${dir}/${file}`;
  writeFileSync(path, `${text}\n${readFileSync(path, "utf8")}`);
  git("-c", "user.name=Smoke", "-c", "user.email=s@example.com", "commit", "-qam", "A user edit");
  git("push", "-q", "origin", "main");
  rmSync(dir, { recursive: true, force: true });
  log(`pushed an edit to ${file}`);
}

/** A broken release must not stay live. */
async function broken(id: string) {
  const s = JSON.parse(readFileSync(stateFile(id), "utf8")) as State;
  const b = await fetchBundle(FEED, await fetchRelease(FEED, "workspace", PUB));
  const bad = { ...b, version: "9.9.9", modules: { "index.js": `export class WorkspaceApi {} ; export default { fetch() { return new Response("boom", { status: 500 }); } };` } };
  const before = await activeVersion(cf, s.ws.worker);
  try { await updateWorkspace(cf, s.ws, s.apps, bad); log("FAIL: the broken release was accepted"); }
  catch (e) { log(`refused: ${(e as Error).message.slice(0, 110)}`); }
  log(`active version unchanged: ${(await activeVersion(cf, s.ws.worker)) === before}; health ${(await get(`${s.ws.url}/_ws/health`)).text}`);
}

/** Tampering with a pointer or a bundle must be refused. */
async function tamper() {
  const signed = await (await fetch(`${FEED}/workspace.json`)).json() as Signed;
  const rel = await verifySigned(signed, PUB) as Release;
  log(`valid pointer accepted: ${rel.version}`);
  await verifySigned({ ...signed, payload: signed.payload.replace(rel.sha256, "0".repeat(64)) }, PUB).then(() => log("FAIL: edited pointer accepted"), (e) => log(`edited pointer: ${e.message}`));
  await fetchBundle(FEED, { ...rel, sha256: "0".repeat(64) }).then(() => log("FAIL: wrong hash accepted"), (e) => log(`wrong hash: ${e.message}`));
}

/** Update only the installed platform to what the feed offers. */
async function platformOnly() {
  const names = resourceNames(PREFIX);
  const url = `https://${names.platform}.supergrid-operator.workers.dev`;
  const rel = await fetchRelease(FEED, "platform", PUB);
  const db = await ensureD1(cf, names.platform);
  await updatePlatform(cf, { worker: names.platform, d1Id: db.uuid, url, bundle: await fetchBundle(FEED, rel) });
  log(`health ${(await get(`${url}/api/health`)).text}`);
}

const [cmd, id, ...more] = process.argv.slice(2);
const cmds: Record<string, () => Promise<unknown>> = { create, update: () => update(id!), destroy: () => destroy(id!), app: () => appOnly(id!), edit: () => edit(id!, more[0]!, more[1]!), broken: () => broken(id!), tamper, platform: platformOnly };
await (cmds[cmd!] ?? (() => Promise.reject(new Error(Object.keys(cmds).join(" | ")))))();

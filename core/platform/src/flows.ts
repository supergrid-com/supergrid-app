// What the UI asks for. Each flow runs in one request so a rollout across workspaces is many small requests, driven by the page.
import { newWorkspaceId, resourceNames } from "@supergrid/app-kit/names";
import { fetchBundle, installApp, provisionWorkspace, updateApp, updatePlatform, updateWorkspace } from "@supergrid/cloud";
import { appsOf, cachedReleases, checkReleases, factsOf, feedOf, isNewer, prefixOf, requireCf } from "./cloud";
import { createWorkspace, getWorkspace, listInstalls, listWorkspaces, logUpdate, setInstallRelease, setWorkspaceRelease, upsertInstall } from "./db";
import type { Env, Workspace } from "./types";

const releases = async (env: Env) => (await cachedReleases(env)) ?? checkReleases(env);

async function unusedId(env: Env) {
  for (let i = 0; i < 8; i++) { const id = newWorkspaceId(); if (!(await getWorkspace(env, id))) return id; }
  throw new Error("Could not find a free workspace id.");
}

export async function createWorkspaceFlow(env: Env, opts: { name: string; organizationId: string }) {
  const cf = await requireCf(env);
  const { feed } = feedOf(env);
  const release = (await checkReleases(env)).workspace;
  if (!release) throw new Error("The release feed has no workspace release.");
  const id = await unusedId(env);
  const bundle = await fetchBundle(feed, release);
  const ws = await provisionWorkspace(cf, { id, name: opts.name, prefix: prefixOf(env), bundle });
  await createWorkspace(env, { id, name: ws.name, url: ws.url, token: ws.token, organization_id: opts.organizationId, worker: ws.worker, d1_id: ws.d1Id, version: bundle.version, contract: release.contract });
  return id;
}

/** Why this update cannot run yet, in words for the page. */
export function blockedBy(requiredContract: number | undefined, workspaces: Pick<Workspace, "name" | "contract">[]) {
  const behind = workspaces.filter((w) => w.contract !== null && w.contract < (requiredContract ?? 0));
  return behind.length ? `Update ${behind.map((w) => w.name).join(", ")} first.` : null;
}

export async function updatePlatformFlow(env: Env) {
  const release = (await checkReleases(env)).platform;
  if (!release || !isNewer(release.version, env.SG_VERSION)) throw new Error("Already up to date.");
  const blocked = blockedBy(release.requires?.workspace, await listWorkspaces(env));
  if (blocked) throw new Error(blocked);
  const cf = await requireCf(env);
  const { feed } = feedOf(env);
  const worker = resourceNames(prefixOf(env)).platform;
  const db = (await cf.get<{ uuid: string; name: string }[]>(cf.acct(`/d1/database?name=${worker}`))).find((d) => d.name === worker);
  if (!db || !env.BETTER_AUTH_URL) throw new Error("This platform was not installed by the installer, so it cannot update itself.");
  const log = { part: "platform", target: worker, from_version: env.SG_VERSION, to_version: release.version };
  const bundle = await fetchBundle(feed, release);
  try {
    const r = await updatePlatform(cf, { worker, d1Id: db.uuid, url: env.BETTER_AUTH_URL, bundle });
    await logUpdate(env, { ...log, status: "done", detail: `restore point ${r.bookmark}` });
  } catch (e) { await logUpdate(env, { ...log, status: "failed", detail: (e as Error).message }); throw e; }
}

export async function updateWorkspaceFlow(env: Env, id: string) {
  const ws = await getWorkspace(env, id);
  if (!ws) throw new Error("No such workspace.");
  const release = (await checkReleases(env)).workspace;
  if (!release || !isNewer(release.version, ws.version)) throw new Error(`${ws.name} is already up to date.`);
  const cf = await requireCf(env);
  const log = { part: "workspace", target: ws.id, from_version: ws.version, to_version: release.version };
  const bundle = await fetchBundle(feedOf(env).feed, release);
  try {
    const r = await updateWorkspace(cf, factsOf(ws), await appsOf(env, ws.id), bundle);
    await setWorkspaceRelease(env, ws.id, release.version, release.contract);
    await logUpdate(env, { ...log, status: "done", detail: `restore point ${r.bookmark}` });
  } catch (e) { await logUpdate(env, { ...log, status: "failed", detail: (e as Error).message }); throw e; }
}

export async function installAppFlow(env: Env, wsId: string, appId: string) {
  const ws = await getWorkspace(env, wsId);
  if (!ws) throw new Error("No such workspace.");
  const release = (await checkReleases(env)).apps[appId];
  if (!release?.manifest) throw new Error(`No release for ${appId}.`);
  const blocked = blockedBy(release.requires?.workspace, [ws]);
  if (blocked) throw new Error(blocked);
  const cf = await requireCf(env);
  const bundle = await fetchBundle(feedOf(env).feed, release);
  const r = await installApp(cf, { ws: factsOf(ws), apps: await appsOf(env, ws.id), prefix: prefixOf(env), manifest: release.manifest, bundle });
  await upsertInstall(env, { workspace_id: ws.id, app_id: appId, name: release.manifest.name, version: release.version, worker: r.app.worker, repo: r.repo, mount: r.app.mount, upstream: null, route: JSON.stringify(r.app), commit_sha: r.commit, status: null });
  return r.warning ?? null;
}

export async function updateAppFlow(env: Env, wsId: string, appId: string) {
  const ws = await getWorkspace(env, wsId);
  const install = (await listInstalls(env, wsId)).find((i) => i.app_id === appId);
  if (!ws || !install) throw new Error("No such install.");
  const release = (await checkReleases(env)).apps[appId];
  if (!release || !isNewer(release.version, install.version)) throw new Error(`${install.name} is already up to date.`);
  const blocked = blockedBy(release.requires?.workspace, [ws]);
  if (blocked) throw new Error(blocked);
  const cf = await requireCf(env);
  const log = { part: `app-${appId}`, target: ws.id, from_version: install.version, to_version: release.version };
  const bundle = await fetchBundle(feedOf(env).feed, release);
  try {
    const r = await updateApp(cf, { ws: factsOf(ws), prefix: prefixOf(env), worker: install.worker, repo: install.repo, commit: install.commit_sha, bundle });
    const status = r.outcome === "untouched" ? null : r.outcome === "merged" ? "needs_build" : "conflict";
    // A conflict leaves the running version where it is, so the install stays on it and keeps offering the update.
    await setInstallRelease(env, ws.id, appId, { version: r.outcome === "conflict" ? install.version : release.version, commit_sha: r.commit || null, status });
    await logUpdate(env, { ...log, status: r.outcome, detail: null });
    return r.outcome;
  } catch (e) { await logUpdate(env, { ...log, status: "failed", detail: (e as Error).message }); throw e; }
}

export { releases };

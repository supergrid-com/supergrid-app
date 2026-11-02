// Account resources. Every create looks up by name first, so a failed step can simply run again.
import { CfApiError, type Cf } from "./client";

export type D1Info = { uuid: string; name: string };

export async function ensureD1(cf: Cf, name: string): Promise<D1Info> {
  const list = await cf.get<D1Info[]>(cf.acct(`/d1/database?name=${encodeURIComponent(name)}&per_page=100`));
  return list.find((d) => d.name === name) ?? cf.post<D1Info>(cf.acct("/d1/database"), { name });
}

/** A restore point: restoring to this bookmark undoes every write made after it. */
export async function d1Bookmark(cf: Cf, databaseId: string): Promise<string> {
  const r = await cf.get<{ bookmark: string }>(cf.acct(`/d1/database/${databaseId}/time_travel/bookmark`));
  return r.bookmark;
}
export const d1Restore = (cf: Cf, databaseId: string, bookmark: string) =>
  cf.post(cf.acct(`/d1/database/${databaseId}/time_travel/restore?bookmark=${encodeURIComponent(bookmark)}`));

/** The account's workers.dev subdomain, creating one if the account has none. */
export async function accountSubdomain(cf: Cf, wanted: string): Promise<string> {
  try {
    const r = await cf.get<{ subdomain: string }>(cf.acct("/workers/subdomain"));
    if (r?.subdomain) return r.subdomain;
  } catch (e) {
    if (!(e instanceof CfApiError && (e.has(10007) || e.status === 404))) throw e;
  }
  return (await cf.put<{ subdomain: string }>(cf.acct("/workers/subdomain"), { subdomain: wanted })).subdomain;
}

export const enableWorkersDev = (cf: Cf, script: string) => cf.post(cf.acct(`/workers/scripts/${script}/subdomain`), { enabled: true, previews_enabled: false });
export const putSecret = (cf: Cf, script: string, name: string, text: string) => cf.put(cf.acct(`/workers/scripts/${script}/secrets`), { name, text, type: "secret_text" });
export const putSchedules = (cf: Cf, script: string, crons: string[]) => cf.put(cf.acct(`/workers/scripts/${script}/schedules`), crons.map((cron) => ({ cron })));

export async function deleteWorker(cf: Cf, script: string) {
  await cf.request("DELETE", cf.acct(`/workers/scripts/${script}?force=true`)).catch((e) => { if (!(e instanceof CfApiError && e.notFound)) throw e; });
}
export async function deleteD1(cf: Cf, databaseId: string) {
  await cf.request("DELETE", cf.acct(`/d1/database/${databaseId}`)).catch((e) => { if (!(e instanceof CfApiError && e.notFound)) throw e; });
}

export type ArtifactsRepo = { name: string; default_branch?: string; remote: string };

export async function ensureNamespace(cf: Cf, namespace: string) {
  try { await cf.get(cf.acct(`/artifacts/namespaces/${namespace}`)); return; } catch (e) { if (!(e instanceof CfApiError && e.notFound)) throw e; }
  await cf.post(cf.acct("/artifacts/namespaces"), { namespace });
}
export async function ensureRepo(cf: Cf, namespace: string, name: string, description: string): Promise<ArtifactsRepo> {
  const path = cf.acct(`/artifacts/namespaces/${namespace}/repos`);
  try { return await cf.get<ArtifactsRepo>(`${path}/${name}`); } catch (e) { if (!(e instanceof CfApiError && e.notFound)) throw e; }
  return cf.post<ArtifactsRepo>(path, { name, description, default_branch: "main" });
}
/** A short-lived token for git over HTTPS against one repo. */
export async function repoToken(cf: Cf, namespace: string, repo: string, scope: "read" | "write" = "write") {
  const r = await cf.post<{ plaintext: string }>(cf.acct(`/artifacts/namespaces/${namespace}/tokens`), { repo, scope, ttl: 900 });
  return r.plaintext;
}
export async function deleteRepo(cf: Cf, namespace: string, name: string) {
  await cf.request("DELETE", cf.acct(`/artifacts/namespaces/${namespace}/repos/${name}`)).catch((e) => { if (!(e instanceof CfApiError && e.notFound)) throw e; });
}

// Account resources. Every create looks up by name first, so a failed step can simply run again.
import { CfApiError, type Cf } from "./client";
import { activeVersion, deployVersion } from "./deploy";

export type D1Info = { uuid: string; name: string };

export async function ensureD1(cf: Cf, name: string): Promise<D1Info> {
  const list = await cf.get<D1Info[]>(cf.acct(`/d1/database?name=${encodeURIComponent(name)}&per_page=100`));
  return list.find((d) => d.name === name) ?? cf.post<D1Info>(cf.acct("/d1/database"), { name });
}

/** An R2 bucket by name; exists is fine. */
export async function ensureR2Bucket(cf: Cf, name: string): Promise<void> {
  try { await cf.get(cf.acct(`/r2/buckets/${name}`)); return; } catch (e) { if (!(e instanceof CfApiError && e.notFound)) throw e; }
  await cf.post(cf.acct("/r2/buckets"), { name });
}
export async function deleteR2Bucket(cf: Cf, name: string) {
  await cf.request("DELETE", cf.acct(`/r2/buckets/${name}`)).catch((e) => { if (!(e instanceof CfApiError && e.notFound)) throw e; });
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

export type QueueInfo = { queue_id: string; queue_name: string };
/** Queues need Workers Paid; the caller decides what to do when the account hasn't got it (CfApiError). */
export async function ensureQueue(cf: Cf, name: string): Promise<QueueInfo> {
  const find = async () => (await cf.get<QueueInfo[]>(cf.acct("/queues?per_page=100"))).find((q) => q.queue_name === name);
  const have = await find();
  if (have) return have;
  try { return await cf.post<QueueInfo>(cf.acct("/queues"), { queue_name: name }); }
  catch (e) {
    // The API has answered 500 to a create that went through ("name already taken" on the next try): look again before giving up.
    if (!(e instanceof CfApiError && e.status >= 500)) throw e;
    await new Promise((r) => setTimeout(r, 2000));
    return (await find()) ?? Promise.reject(e);
  }
}
type Consumer = { consumer_id: string; script_name?: string; /** What the list endpoint calls script_name. */ script?: string; type: string };
/** Point a queue at a Worker's `queue()` handler. The script must already exist. */
export async function ensureConsumer(cf: Cf, queueId: string, script: string, settings: { batch_size: number; max_retries: number; max_wait_time_ms: number }, deadLetterQueue?: string) {
  const body = { type: "worker", script_name: script, settings, dead_letter_queue: deadLetterQueue };
  const list = await cf.get<Consumer[]>(cf.acct(`/queues/${queueId}/consumers`));
  const mine = list.find((c) => c.type === "worker" && (c.script_name ?? c.script) === script);
  if (mine) await cf.put(cf.acct(`/queues/${queueId}/consumers/${mine.consumer_id}`), body);
  else await cf.post(cf.acct(`/queues/${queueId}/consumers`), body);
}
export async function deleteQueue(cf: Cf, name: string) {
  const list = await cf.get<QueueInfo[]>(cf.acct("/queues?per_page=100"));
  const q = list.find((x) => x.queue_name === name);
  if (q) await cf.request("DELETE", cf.acct(`/queues/${q.queue_id}`));
}

export const enableWorkersDev = (cf: Cf, script: string) => cf.post(cf.acct(`/workers/scripts/${script}/subdomain`), { enabled: true, previews_enabled: false });
export const putSecret = (cf: Cf, script: string, name: string, text: string) => cf.put(cf.acct(`/workers/scripts/${script}/secrets`), { name, text, type: "secret_text" });
export type EnvValue = { type: "secret_text" | "plain_text"; text: string };
/** Set secrets and vars on a running Worker and ship them. The plain secrets API is the quick way; it refuses (10215) when the
 * Worker's latest version is not the live one, as after a rollback, since it would build on the version left behind. Then,
 * and for vars, a new version is branched off the live one with the values merged in, and deployed. */
export async function setSecrets(cf: Cf, script: string, env: Record<string, EnvValue>, message = "Set secrets"): Promise<void> {
  const entries = Object.entries(env);
  if (entries.every(([, v]) => v.type === "secret_text")) {
    try { for (const [name, v] of entries) await putSecret(cf, script, name, v.text); return; }
    catch (e) { if (!(e instanceof CfApiError && e.has(10215))) throw e; }
  }
  const base = (await activeVersion(cf, script)) ?? "latest";
  const v = await cf.request<{ id?: string }>("PATCH", cf.acct(`/workers/workers/${script}/versions/${base}`), { env, annotations: { "workers/message": message.slice(0, 100) } }, { "content-type": "application/merge-patch+json" });
  if (!v?.id) throw new Error(`Cloudflare made no new version of ${script} for its secrets.`);
  await deployVersion(cf, script, v.id, message);
}
export const putSchedules = (cf: Cf, script: string, crons: string[]) => cf.put(cf.acct(`/workers/scripts/${script}/schedules`), crons.map((cron) => ({ cron })));
/** A Workflow is a named thing on the account, not just a binding: it points at a class in a script version, so this runs after every deploy of that script. */
export const putWorkflow = (cf: Cf, name: string, script: string, className: string) => cf.put(cf.acct(`/workflows/${name}`), { script_name: script, class_name: className });
export async function deleteWorkflow(cf: Cf, name: string) {
  await cf.request("DELETE", cf.acct(`/workflows/${name}`)).catch((e) => { if (!(e instanceof CfApiError && e.notFound)) throw e; });
}

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

// ---- Account API tokens: what "Connect Cloudflare" mints so nobody pastes a token (app/CONNECT.md). ----

export type PermissionGroup = { id: string; name: string };
/** Every permission group this account can put in a token. Needs Account API Tokens Write (or the `account_api_tokens:create` OAuth scope). */
export const permissionGroups = (cf: Cf) => cf.get<PermissionGroup[]>(cf.acct("/tokens/permission_groups"));

/** A permission as a list of the names Cloudflare has used for it, newest first; the first one the account knows wins. */
export type PermissionNames = { label: string; names: string[]; required?: boolean };

/** The group ids for a set of permissions. Throws when a required one is unknown, warns about the rest. */
export function resolvePermissions(groups: PermissionGroup[], wanted: PermissionNames[]): { ids: string[]; missing: string[] } {
  const byName = new Map(groups.map((g) => [g.name, g.id]));
  const ids: string[] = [];
  const missing: string[] = [];
  for (const p of wanted) {
    const id = p.names.map((n) => byName.get(n)).find(Boolean);
    if (id) ids.push(id);
    else if (p.required !== false) throw new Error(`This account has no "${p.label}" permission (looked for ${p.names.join(", ")}).`);
    else missing.push(p.label);
  }
  return { ids, missing };
}

export type MintedToken = { id: string; name: string; /** The secret, returned once at creation and never again. */ value: string; missing: string[] };
/** Create an account-owned API token for this account. The caller's credential needs Account API Tokens Write. */
export async function mintToken(cf: Cf, name: string, wanted: PermissionNames[]): Promise<MintedToken> {
  const { ids, missing } = resolvePermissions(await permissionGroups(cf), wanted);
  const r = await cf.post<{ id: string; value: string }>(cf.acct("/tokens"), {
    name,
    policies: [{ effect: "allow", resources: { [`com.cloudflare.api.account.${cf.accountId}`]: "*" }, permission_groups: ids.map((id) => ({ id })) }],
  });
  if (!r?.value) throw new Error("Cloudflare created the token but returned no value.");
  return { id: r.id, name, value: r.value, missing };
}

export type TokenInfo = { id: string; name: string; status: string; issued_on?: string; last_used_on?: string };
export const listTokens = (cf: Cf) => cf.get<TokenInfo[]>(cf.acct("/tokens?per_page=100"));
export async function deleteToken(cf: Cf, id: string) {
  await cf.request("DELETE", cf.acct(`/tokens/${id}`)).catch((e) => { if (!(e instanceof CfApiError && e.notFound)) throw e; });
}

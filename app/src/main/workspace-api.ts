import { randomBytes } from "node:crypto";
import { type Cf, getSettings, mediaToken, setSecrets, type EnvValue } from "@supergrid/cloud";
import { RPC_METHOD_NAMES } from "@supergrid/app-kit/rpc";
import type { ServedManifest, WorkspaceSummary } from "../shared/bridge";
import { cfClient } from "./cf-api";
import * as cloudflare from "./cloudflare";
import { readConfig, readState, writeConfig } from "./config";
import * as apps from "./apps";
import { listWorkspaces } from "./workspaces";

// The desktop's path into a workspace: POST `/_ws/rpc` on its public URL with the workspace token.
// The token is minted here on first use (32 random bytes, written as the Worker's
// SG_WORKSPACE_TOKEN secret) and kept in the config file; a 401 means someone else minted one
// since, so it is minted again once. In Dev mode the workspace is its dev server on this Mac
// (apps.ts): the URL is localhost, the apps are the repo's folders, and the token is the one in
// the repo's .dev.vars; nothing is minted.
//
// The secrets key (SG_SECRETS_KEY, what the workspace seals its secrets table with) is set the
// same way, once: a workspace that answers SECRETS_KEY_MISSING gets the key this machine remembers
// for it, or a fresh one when there is none. It is never minted again on its own, because a new
// key would make every stored secret unreadable.

const CACHE_TTL = 60_000;
const KEY_MISSING = "SECRETS_KEY_MISSING";
const methods = new Set<string>(RPC_METHOD_NAMES);

const caches = new Map<string, { at: number; list: Promise<WorkspaceSummary[]> }>();

const isLocal = (ws: Pick<WorkspaceSummary, "dev">): boolean => !!ws.dev;

function listed(accountId: string, prefix: string): Promise<WorkspaceSummary[]> {
  const key = `${accountId}/${prefix}`;
  let c = caches.get(key);
  if (!c || Date.now() - c.at > CACHE_TTL) {
    const at = Date.now();
    const list = listWorkspaces(accountId, prefix);
    c = { at, list };
    caches.set(key, c);
    list.catch(() => { if (caches.get(key)?.at === at) caches.delete(key); });
  }
  return c.list;
}

/** Forgets a listing, so the next look at the account reads it again (after an app install changed a Worker's bindings). */
export function invalidate(accountId?: string, prefix?: string): void {
  if (accountId && prefix) caches.delete(`${accountId}/${prefix}`);
  else caches.clear();
}

/** The account each workspace was found in, so later calls (secrets, tokens) go to the same one. */
const accountOf = new Map<string, string>();

/** The organizations' Cloudflare links, the current one first, then the app's own connection when it has one. */
async function links(): Promise<{ accountId: string; prefix: string }[] > {
  const { orgs, currentOrg } = readState();
  const out = orgs.filter((o) => o.cloudflare).sort((a, b) => (a.id === currentOrg ? -1 : b.id === currentOrg ? 1 : 0)).map((o) => ({ accountId: o.cloudflare!.accountId, prefix: o.cloudflare!.prefix }));
  const own = await cloudflare.client().catch(() => null);
  if (own) out.push({ accountId: own.cf.accountId, prefix: own.prefix });
  const seen = new Set<string>();
  return out.filter((l) => { const k = `${l.accountId}/${l.prefix}`; if (seen.has(k)) return false; seen.add(k); return true; });
}

/** An API client for an account: cf's login (the way the pages reach it), else the app's own token when it is for that account. */
async function clientFor(accountId: string): Promise<Cf> {
  try {
    return await cfClient(accountId);
  } catch (e) {
    const own = await cloudflare.client().catch(() => null);
    if (own && own.cf.accountId === accountId) return own.cf;
    throw e;
  }
}

/**
 * A workspace as the desktop sees it in its current mode: the deployed Worker, or in Dev mode its dev server on this Mac
 * with the repo's apps (the deployed Worker's name stays, for the account-side things: its database, its bucket, its secrets).
 */
export async function workspace(wsId: string): Promise<WorkspaceSummary> {
  const cloud = await cloudWorkspace(wsId);
  if (apps.modeOf(wsId) !== "dev") return cloud;
  const dev = apps.devStatus(wsId);
  if (!dev.running || !dev.url) return cloud;
  return { ...cloud, url: dev.url, version: "dev", apps: apps.builtApps(wsId), dev: true };
}

/**
 * A workspace by id as its Worker describes it, found among the Workers of the organizations' accounts under their
 * prefixes, the way the renderer lists them (src/renderer/app/lib/workspaces.ts); the app's own connection is looked at last.
 */
export async function cloudWorkspace(wsId: string): Promise<WorkspaceSummary> {
  const all = await links();
  if (!all.length) throw new Error("No Cloudflare account to look in: connect one on the Cloudflare page.");
  let lastError: unknown = null;
  for (const fresh of [false, true]) {
    for (const l of all) {
      // a workspace made since the list was read is looked for once more with a fresh list
      if (fresh) caches.delete(`${l.accountId}/${l.prefix}`);
      const ws = (await listed(l.accountId, l.prefix).catch((e) => { lastError = e; return [] as WorkspaceSummary[]; })).find((w) => w.id === wsId);
      if (ws) {
        accountOf.set(ws.id, l.accountId);
        return ws;
      }
    }
  }
  const where = all.map((l) => `${l.prefix}-ws-* on ${l.accountId}`).join(", ");
  throw new Error(`Unknown workspace ${wsId}: not among ${where}.${lastError ? ` ${String((lastError as Error).message ?? lastError)}` : ""}`);
}

/** The client for the account a workspace was found in. */
const clientOf = async (ws: WorkspaceSummary): Promise<Cf> => clientFor(accountOf.get(ws.id) ?? (await links())[0]?.accountId ?? (await cloudflare.client()).cf.accountId);

async function tokenFor(ws: WorkspaceSummary, fresh = false): Promise<string> {
  if (isLocal(ws)) return apps.devToken(ws.id);
  const cfg = readConfig();
  const have = cfg.wsTokens?.[ws.id];
  if (have && !fresh) return have;
  const token = randomBytes(32).toString("hex");
  const cf = await clientOf(ws);
  await setSecrets(cf, ws.worker, { SG_WORKSPACE_TOKEN: { type: "secret_text", text: token } }, "Workspace token");
  writeConfig({ wsTokens: { ...readConfig().wsTokens, [ws.id]: token } });
  return token;
}

export function resetToken(wsId: string): void {
  const { wsTokens = {} } = readConfig();
  if (!(wsId in wsTokens)) return;
  const { [wsId]: _, ...rest } = wsTokens;
  writeConfig({ wsTokens: rest });
}

/** Sets the workspace's secrets key, then waits for the Worker to run with it: a new secret lands a few seconds after the API takes it. */
async function installSecretsKey(ws: WorkspaceSummary): Promise<void> {
  const key = readConfig().wsSecretKeys?.[ws.id] ?? randomBytes(32).toString("hex");
  // remembered before it is set, so a failure after this point reuses the same key instead of minting a second one
  writeConfig({ wsSecretKeys: { ...readConfig().wsSecretKeys, [ws.id]: key } });
  const cf = await clientOf(ws);
  await setSecrets(cf, ws.worker, { SG_SECRETS_KEY: { type: "secret_text", text: key } }, "Secrets key");
  for (let i = 0; i < 20; i++) {
    const status = (await send(ws, "secretsStatus", []).catch(() => null)) as { ready?: boolean } | null;
    if (status?.ready) return;
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error("The secrets key is set, but the workspace has not picked it up yet. Try again in a moment.");
}

async function send(ws: WorkspaceSummary, method: string, args: unknown[]): Promise<unknown> {
  const post = async (token: string): Promise<Response> => {
    try {
      return await fetch(`${ws.url.replace(/\/$/, "")}/_ws/rpc`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ method, args }),
      });
    } catch (e) {
      throw new Error(`Workspace unreachable: ${(e as Error).message}`);
    }
  };
  let res = await post(await tokenFor(ws));
  // a 401 on the deployed Worker means its secret no longer matches ours: mint once and retry
  if (res.status === 401 && !isLocal(ws)) res = await post(await tokenFor(ws, true));
  const text = await res.text();
  type Reply = { result?: unknown; error?: unknown };
  let json: Reply | null = null;
  try {
    json = text ? (JSON.parse(text) as Reply) : null;
  } catch {
    json = null;
  }
  const err = json && typeof json === "object" ? json.error : undefined;
  if (err !== undefined) throw new Error(typeof err === "string" ? err : String((err as { message?: string })?.message ?? JSON.stringify(err)));
  if (!res.ok) throw new Error(`Workspace answered ${res.status}${text ? `: ${text.slice(0, 200)}` : ""}`);
  return json && typeof json === "object" && "result" in json ? json.result : json;
}

export async function rpc(wsId: string, method: string, args: unknown[]): Promise<unknown> {
  if (!methods.has(method)) throw new Error(`Unknown workspace method ${method}.`);
  const ws = await workspace(wsId);
  try {
    return await send(ws, method, args);
  } catch (e) {
    if (!String((e as Error).message).startsWith(KEY_MISSING)) throw e;
    if (isLocal(ws)) throw new Error("The dev server has no SG_SECRETS_KEY. Add it to the repo's .dev.vars.");
    await installSecretsKey(ws);
    return send(ws, method, args);
  }
}

/**
 * The media token (Images: Edit, Stream: Edit, Account Analytics: Read) and the account id, as the Worker's secrets, so the
 * workspace can hold pictures and video (core/workspace/ASSETS.md). New workspaces get it at provisioning; this is for the ones
 * from before. The token is one minted for this workspace when the app's own token may create tokens, else the app's own
 * token, or `token` when the user pasted one. Written and forgotten: the Worker is the only place it lives. Then wait until
 * `mediaConfig` says the Worker runs with it.
 */
export async function setMediaToken(wsId: string, token?: string): Promise<void> {
  const ws = await workspace(wsId);
  if (isLocal(ws)) throw new Error("The media token is set on the deployed Worker: switch to Live. The dev server reads CF_ACCOUNT_ID and SG_MEDIA_TOKEN from the repo's .dev.vars.");
  // the app's own token is a shared fallback only where it is for this account; cf's OAuth login is never written to a Worker
  const cf = await clientOf(ws);
  const own = await cloudflare.client().catch(() => null);
  const text = token ?? (await mediaToken(cf, ws, own && own.cf.accountId === cf.accountId ? { shared: own.token } : undefined))?.text;
  if (!text) throw new Error("Could not set a media token for this workspace.");
  // the account id is a plain var on workspaces made since media; older ones get it here
  const { bindings } = await getSettings(cf, ws.worker);
  const env: Record<string, EnvValue> = { SG_MEDIA_TOKEN: { type: "secret_text", text } };
  if (!bindings.some((b) => b.name === "CF_ACCOUNT_ID")) env.CF_ACCOUNT_ID = { type: "plain_text", text: cf.accountId };
  await setSecrets(cf, ws.worker, env, "Media token");
  for (let i = 0; i < 20; i++) {
    const cfg = (await send(ws, "mediaConfig", []).catch(() => null)) as { images?: boolean } | null;
    if (cfg?.images) return;
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error("The token is set, but the workspace has not picked it up yet. Try again in a moment.");
}

/** What a child process needs to reach a workspace on its own: the URL and the token the desktop holds for it. */
export async function connection(wsId: string): Promise<{ url: string; token: string; name: string }> {
  const ws = await workspace(wsId);
  return { url: ws.url, token: await tokenFor(ws), name: ws.name };
}

// ---- Apps: the admin handoff, the served manifest, and operations with the workspace's token ----

const b64u = (b: ArrayBuffer | Uint8Array) => Buffer.from(new Uint8Array(b)).toString("base64url");
async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64u(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data)));
}

/**
 * The URL that opens an app's admin screen signed in: a handoff token (HMAC with the workspace's token, five minutes,
 * the same shape core/workspace/src/staff.ts verifies) that `/_ws/auth` swaps for the staff cookie before it redirects
 * to the screen. The desktop acts as an owner; a real staff identity comes with the control plane.
 */
export async function adminUrl(wsId: string, app: string, next = "/"): Promise<string> {
  const ws = await workspace(wsId);
  if (!/^[a-z][a-z0-9-]*$/.test(app)) throw new Error("Not an app id.");
  const claims = { sub: "desktop", name: "SuperGrid", email: "", org: null, role: "owner", permissions: ["*"], aud: ws.id, exp: Math.floor(Date.now() / 1000) + 300, typ: "handoff" };
  const body = b64u(new TextEncoder().encode(JSON.stringify(claims)));
  const token = `${body}.${await hmac(await tokenFor(ws), body)}`;
  const path = `/admin/${app}${next.startsWith("/") ? next : `/${next}`}`.replace(/\/$/, "") || `/admin/${app}`;
  return `${ws.url.replace(/\/$/, "")}/_ws/auth?token=${encodeURIComponent(token)}&next=${encodeURIComponent(path)}`;
}

/** An installed app's served manifest: what its running code says about its data, operations and screens. */
export async function appManifest(wsId: string, app: string): Promise<ServedManifest> {
  const ws = await workspace(wsId);
  if (!/^[a-z][a-z0-9-]*$/.test(app)) throw new Error("Not an app id.");
  const res = await fetch(`${ws.url.replace(/\/$/, "")}/_app/${app}/manifest.json`, { headers: { accept: "application/json" } }).catch((e) => { throw new Error(`Workspace unreachable: ${(e as Error).message}`); });
  if (res.status === 404) throw new Error(`${app} is not installed in ${ws.name}, or runs code from before served manifests.`);
  if (!res.ok) throw new Error(`${app} answered ${res.status} for its manifest.`);
  return (await res.json()) as ServedManifest;
}

/** Runs one of an app's operations through `POST /api/<app>/ops/<name>` with the workspace's token, so the app sees an owner. */
export async function appCall(wsId: string, app: string, operation: string, input: unknown): Promise<unknown> {
  const ws = await workspace(wsId);
  if (!/^[a-z][a-z0-9-]*$/.test(app)) throw new Error("Not an app id.");
  if (!/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/.test(operation)) throw new Error("Not an operation name.");
  const res = await fetch(`${ws.url.replace(/\/$/, "")}/api/${app}/ops/${operation}`, {
    method: "POST",
    headers: { authorization: `Bearer ${await tokenFor(ws)}`, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(input ?? {}),
  }).catch((e) => { throw new Error(`Workspace unreachable: ${(e as Error).message}`); });
  const text = await res.text();
  let json: { result?: unknown; error?: string; problems?: string[] } | null = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }
  if (!res.ok || json?.error) throw new Error(json?.error ? [json.error, ...(json.problems ?? [])].join("\n") : `${app} answered ${res.status}${text ? `: ${text.slice(0, 200)}` : ""}`);
  return json?.result ?? null;
}

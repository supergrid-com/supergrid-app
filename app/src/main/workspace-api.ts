import { randomBytes } from "node:crypto";
import { getSettings, mediaToken, setSecrets, type EnvValue } from "@supergrid/cloud";
import { RPC_METHOD_NAMES } from "@supergrid/app-kit/rpc";
import type { WorkspaceSummary } from "../shared/bridge";
import * as cloudflare from "./cloudflare";
import { readConfig, readState, writeConfig } from "./config";
import { listWorkspaces } from "./workspaces";

// The desktop's path into a workspace: POST `/_ws/rpc` on its public URL with the workspace token.
// The token is minted here on first use (32 random bytes, written as the Worker's
// SG_WORKSPACE_TOKEN secret) and kept in the config file; a 401 means someone else minted one
// since, so it is minted again once. The local dev workspace never mints: its token comes from
// the environment or the config, the way `dev/` starts it.
//
// The secrets key (SG_SECRETS_KEY, what the workspace seals its secrets table with) is set the
// same way, once: a workspace that answers SECRETS_KEY_MISSING gets the key this machine remembers
// for it, or a fresh one when there is none. It is never minted again on its own, because a new
// key would make every stored secret unreadable.

const LOCAL_URL = "http://localhost:5301";
const CACHE_TTL = 60_000;
const KEY_MISSING = "SECRETS_KEY_MISSING";
const methods = new Set<string>(RPC_METHOD_NAMES);

const caches = new Map<string, { at: number; list: Promise<WorkspaceSummary[]> }>();

function isLocal(ws: Pick<WorkspaceSummary, "id" | "url">): boolean {
  return ws.id === "local" || /^http:\/\/localhost(:\d+)?(\/|$)/.test(ws.url);
}

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

/**
 * A workspace by id, found among the Workers of the account. The install prefix is the connection's,
 * and each organization's own when it differs (an organization picks its prefix in its settings).
 */
export async function workspace(wsId: string): Promise<WorkspaceSummary> {
  if (wsId === "local") return { id: "local", name: "Local dev", url: process.env.SG_WORKSPACE_URL ?? LOCAL_URL, worker: "", version: null, apps: [] };
  const { cf, prefix } = await cloudflare.client();
  const prefixes = [...new Set([prefix, ...readState().orgs.map((o) => o.cloudflare?.prefix ?? "").filter(Boolean)])];
  for (const p of prefixes) {
    const ws = (await listed(cf.accountId, p).catch(() => [] as WorkspaceSummary[])).find((w) => w.id === wsId);
    if (ws) return ws;
  }
  throw new Error(`Unknown workspace ${wsId}.`);
}

async function tokenFor(ws: WorkspaceSummary, fresh = false): Promise<string> {
  const cfg = readConfig();
  if (isLocal(ws)) {
    const token = process.env.SG_WORKSPACE_TOKEN ?? cfg.wsTokens?.[ws.id];
    if (!token) throw new Error("Set SG_WORKSPACE_TOKEN to reach the local workspace.");
    return token;
  }
  const have = cfg.wsTokens?.[ws.id];
  if (have && !fresh) return have;
  const token = randomBytes(32).toString("hex");
  const { cf } = await cloudflare.client();
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
  const { cf } = await cloudflare.client();
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
  // a 401 on a cloud workspace means its secret no longer matches ours: mint once and retry
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
    if (isLocal(ws)) throw new Error("The local workspace has no SG_SECRETS_KEY. Add it to the vars in core/workspace/wrangler.jsonc.");
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
  if (isLocal(ws)) throw new Error("The local workspace reads CF_ACCOUNT_ID and SG_MEDIA_TOKEN from core/workspace/.dev.vars (see .dev.vars.example).");
  const { cf, token: own } = await cloudflare.client();
  const text = token ?? (await mediaToken(cf, ws, { shared: own }))?.text;
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

// The platform's link to its Cloudflare account and its release feed.
import { checkToken, compareVersions, createCf, fetchCatalog, fetchRelease, type Catalog, type Cf, type InstalledApp, type Release, type WorkspaceFacts } from "@supergrid/cloud";
import { getSetting, listInstalls, setSetting } from "./db";
import type { Env, Workspace } from "./types";

const b64 = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

// The token is encrypted with a key derived from the platform's own secret, so a copy of the database alone is no use.
async function key(env: Env) {
  const raw = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`sg-cloudflare:${env.BETTER_AUTH_SECRET}`));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}
async function seal(env: Env, text: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await key(env), new TextEncoder().encode(text));
  return `${b64(iv)}.${b64(data)}`;
}
async function open(env: Env, sealed: string) {
  const [iv, data] = sealed.split(".");
  return new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(iv!) }, await key(env), unb64(data!)));
}

type Connection = { accountId: string; token: string };
const stored = (env: Env) => getSetting<Connection | null>(env, "cloudflare", null);

export const prefixOf = (env: Env) => env.SG_PREFIX ?? "sg";

export async function getCf(env: Env): Promise<Cf | null> {
  if (env.SG_CF_TOKEN && env.SG_ACCOUNT_ID) return createCf(env.SG_CF_TOKEN, env.SG_ACCOUNT_ID);
  const c = await stored(env);
  return c ? createCf(await open(env, c.token), c.accountId) : null;
}
export const isConnected = async (env: Env) => !!(env.SG_CF_TOKEN && env.SG_ACCOUNT_ID) || !!(await stored(env));
export async function requireCf(env: Env): Promise<Cf> {
  const cf = await getCf(env);
  if (!cf) throw new Error("Connect Cloudflare first, in Platform settings.");
  return cf;
}

/** Throws if Cloudflare refuses the token; nothing is stored in that case. */
export async function connect(env: Env, accountId: string, token: string) {
  await checkToken(createCf(token, accountId));
  await setSetting(env, "cloudflare", { accountId, token: await seal(env, token) } satisfies Connection);
}
export const disconnect = (env: Env) => env.PLATFORM_DB.prepare("DELETE FROM settings WHERE key = ?").bind("cloudflare").run();

export function feedOf(env: Env) {
  if (!env.SG_RELEASE_FEED || !env.SG_RELEASE_PUBKEY) throw new Error("This platform has no release feed configured.");
  return { feed: env.SG_RELEASE_FEED, key: env.SG_RELEASE_PUBKEY };
}

export type Latest = { platform: Release | null; workspace: Release | null; apps: Record<string, Release>; catalog: Catalog["apps"]; checkedAt: string; error?: string };

/** Read the feed and remember the answer, so pages can show it without calling out. Every file read here is verified. */
export async function checkReleases(env: Env): Promise<Latest> {
  const { feed, key: pub } = feedOf(env);
  const [platform, workspace, catalog] = await Promise.all([fetchRelease(feed, "platform", pub), fetchRelease(feed, "workspace", pub), fetchCatalog(feed, pub)]);
  const apps = await Promise.all(catalog.apps.map((a) => fetchRelease(feed, `app-${a.id}`, pub)));
  const latest: Latest = { platform, workspace, apps: Object.fromEntries(apps.map((r) => [r.part.slice(4), r])), catalog: catalog.apps, checkedAt: new Date().toISOString() };
  await setSetting(env, "latest_releases", latest);
  return latest;
}
export const cachedReleases = (env: Env) => getSetting<Latest | null>(env, "latest_releases", null);

export const isNewer = (candidate: string, current: string | null) => compareVersions(candidate, current ?? "dev") > 0;

export function factsOf(ws: Workspace): WorkspaceFacts {
  if (!ws.worker || !ws.d1_id) throw new Error(`Workspace ${ws.id} was not created by this platform, so it cannot be changed from here.`);
  return { id: ws.id, name: ws.name, url: ws.url, token: ws.token, d1Id: ws.d1_id, worker: ws.worker };
}
export async function appsOf(env: Env, wsId: string): Promise<InstalledApp[]> {
  return (await listInstalls(env, wsId)).flatMap((i) => (i.route ? [JSON.parse(i.route) as InstalledApp] : []));
}

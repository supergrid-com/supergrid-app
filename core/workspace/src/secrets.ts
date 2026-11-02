// Secrets: named values a workspace keeps for its apps, hooks and workflows, like STRIPE_SECRET_KEY. Each value is sealed with
// AES-GCM under SG_SECRETS_KEY, a Worker secret the desktop sets once per workspace, so the D1 alone reveals nothing. Values are
// write-only from outside: `listSecrets` shows a hint, `setSecret` replaces, and only an app over the service binding can
// `getSecret`. HTTP hooks and steps reach them as `{{secrets.NAME}}` (see `secretsFor`).
//
// Why not Cloudflare's Secrets Store: a Worker reads it through one binding per secret, fixed at deploy time, and an account
// holds 100 of them across every workspace. Adding a secret from the app would mean a redeploy each time.
import type { SecretInput, SecretMeta, SecretsStatus } from "@supergrid/app-kit/rpc";
import { now } from "./ids";
import type { Env } from "./types";
import { invalid, obj, opt, str } from "./validate";

export const SECRET_NAME = /^[A-Z][A-Z0-9_]{0,63}$/;
/** The error prefix the desktop looks for: the workspace cannot seal anything until the key is set. */
export const KEY_MISSING = "SECRETS_KEY_MISSING";
const MAX_VALUE = 65_536;
const MAX_SECRETS = 200;
const TEMPLATE = /\{\{\s*secrets\.([A-Z][A-Z0-9_]{0,63})\s*\}\}/g;

type Row = { name: string; value: string; hint: string; description: string | null; app_id: string | null; created_at: string; updated_at: string };
const metaOf = (r: Omit<Row, "value">): SecretMeta => ({ name: r.name, hint: r.hint, description: r.description, app_id: r.app_id, created_at: r.created_at, updated_at: r.updated_at });
/** The last four characters when the value is long enough that they say nothing, else dots. */
const hintOf = (value: string) => (value.length >= 12 ? `…${value.slice(-4)}` : "••••");

const enc = new TextEncoder();
function b64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

let cached: { raw: string; key: Promise<CryptoKey> } | null = null;
/** The AES key: the 32 bytes when SG_SECRETS_KEY is 64 hex characters, otherwise the SHA-256 of whatever was set (local dev). */
function keyOf(env: Env): Promise<CryptoKey> {
  const raw = env.SG_SECRETS_KEY;
  if (!raw) throw new Error(`${KEY_MISSING}: this workspace has no secrets key yet`);
  if (cached?.raw !== raw) {
    const bytes = /^[0-9a-f]{64}$/i.test(raw)
      ? Promise.resolve(Uint8Array.from(raw.match(/../g)!, (h) => parseInt(h, 16)))
      : crypto.subtle.digest("SHA-256", enc.encode(raw)).then((d) => new Uint8Array(d));
    cached = { raw, key: bytes.then((b) => crypto.subtle.importKey("raw", b, "AES-GCM", false, ["encrypt", "decrypt"])) };
  }
  return cached.key;
}

/** iv || ciphertext, base64. The name is bound in as additional data, so one row's value cannot be moved under another name. */
async function seal(env: Env, name: string, value: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: enc.encode(name) }, await keyOf(env), enc.encode(value)));
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv);
  out.set(ct, iv.length);
  return b64(out);
}
async function unseal(env: Env, name: string, sealed: string): Promise<string> {
  const bytes = unb64(sealed);
  const key = await keyOf(env);
  try {
    return new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes.subarray(0, 12), additionalData: enc.encode(name) }, key, bytes.subarray(12)));
  } catch {
    throw new Error(`secret ${name} cannot be read: it was sealed under a different secrets key`);
  }
}

export async function status(env: Env): Promise<SecretsStatus> {
  const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM secrets").first<{ n: number }>();
  return { ready: !!env.SG_SECRETS_KEY, count: row?.n ?? 0 };
}

export const listSecrets = async (db: D1Database): Promise<SecretMeta[]> =>
  (await db.prepare("SELECT name, hint, description, app_id, created_at, updated_at FROM secrets ORDER BY name").all<Omit<Row, "value">>()).results.map(metaOf);

/** Create or replace. A replace keeps the description unless one is given; it never returns the value. */
export async function setSecret(env: Env, appId: string | null, input: SecretInput): Promise<SecretMeta> {
  const i = obj(input, "secret");
  const name = str(i.name, "name", { max: 64, re: SECRET_NAME });
  if (typeof i.value !== "string" || !i.value) invalid("value is required");
  const value = i.value as string;
  if (value.length > MAX_VALUE) invalid(`value is longer than ${MAX_VALUE} characters`);
  const sealed = await seal(env, name, value);
  const current = await env.DB.prepare("SELECT description FROM secrets WHERE name = ?").bind(name).first<{ description: string | null }>();
  if (!current && (await status(env)).count >= MAX_SECRETS) invalid(`a workspace holds at most ${MAX_SECRETS} secrets`);
  const description = i.description === undefined ? (current?.description ?? null) : opt(i.description, "description", { max: 200 });
  const ts = now();
  await env.DB.prepare(`INSERT INTO secrets (name, value, hint, description, app_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(name) DO UPDATE SET value = excluded.value, hint = excluded.hint, description = excluded.description, app_id = excluded.app_id, updated_at = excluded.updated_at`)
    .bind(name, sealed, hintOf(value), description, appId, ts, ts).run();
  return metaOf((await env.DB.prepare("SELECT name, hint, description, app_id, created_at, updated_at FROM secrets WHERE name = ?").bind(name).first<Omit<Row, "value">>())!);
}

export const removeSecret = (db: D1Database, name: string) => db.prepare("DELETE FROM secrets WHERE name = ?").bind(str(name, "name", { max: 64, re: SECRET_NAME })).run().then(() => {});

/** The value, or null when there is no such secret. Apps only: `/_ws/rpc` refuses this method. */
export async function getSecret(env: Env, name: string): Promise<string | null> {
  const row = await env.DB.prepare("SELECT value FROM secrets WHERE name = ?").bind(str(name, "name", { max: 64, re: SECRET_NAME })).first<{ value: string }>();
  return row ? unseal(env, name, row.value) : null;
}

/** The secrets the given texts mention as `{{secrets.NAME}}`, and only those, so a run never unseals more than it uses. */
export async function secretsFor(env: Env, texts: (string | null | undefined)[]): Promise<Record<string, string>> {
  const names = new Set<string>();
  for (const t of texts) if (t) for (const m of t.matchAll(TEMPLATE)) names.add(m[1]);
  const out: Record<string, string> = {};
  for (const name of names) {
    const value = await getSecret(env, name);
    if (value == null) invalid(`unknown secret ${name}`);
    out[name] = value!;
  }
  return out;
}

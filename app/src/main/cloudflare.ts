import { APP_PERMISSIONS, CfApiError, checkToken, createCf, mintable, mintToken, tokenTemplateLink, type Cf } from "@supergrid/cloud";
import { isPrefix } from "@supergrid/app-kit/names";
import { hostname } from "node:os";
import type { CfAccount, CloudflareStatus } from "../shared/bridge";
import { forgetToken, readConfig, readToken, writeConfig, writeToken } from "./config";
import { authorize, type OAuthSession } from "./oauth";

// The link from this machine to a Cloudflare account (app/CONNECT.md). "Connect" is one browser
// visit: an OAuth login whose only job is to mint an API token for the chosen account, with
// everything the app and its workspaces need, Images and Stream included. The token is what the
// app keeps and uses from then on; the login is forgotten. An account that will not let this
// user mint (no token provisioning rights) gets the fallback: a template link and a paste box.
// `client()` is what every account operation starts from.

const defaults = () => ({ accountId: process.env.SG_ACCOUNT_ID, prefix: process.env.SG_PREFIX });
const api = async <T>(token: string, path: string): Promise<T> => createCf(token, "-").get<T>(path);

/** The OAuth login, kept only while it is fresh, so switching accounts right after connecting needs no second visit. */
let session: OAuthSession | null = null;
const live = () => (session && session.expiresAt - Date.now() > 60_000 ? session : null);

const prefixOf = (cfg: { prefix?: string }) => (cfg.prefix && isPrefix(cfg.prefix) ? cfg.prefix : "sg");

export async function status(fresh = false): Promise<CloudflareStatus> {
  const cfg = { ...defaults(), ...readConfig() };
  const accounts = cfg.accounts ?? [];
  const accountId = cfg.accountId ?? accounts[0]?.id ?? "";
  const stored = accountId ? await readToken(accountId) : null;
  if (!stored) {
    if (accountId && accounts.some((a) => a.id === accountId)) return needsToken(accountId, accounts, cfg.email ?? null, "No token for this account yet.");
    return { state: "logged-out" };
  }
  if (fresh || !checked.has(stored.value)) {
    try {
      await checkToken(createCf(stored.value, accountId));
      checked.add(stored.value);
    } catch (e) {
      if (e instanceof CfApiError && (e.status === 401 || e.status === 403)) return { state: "logged-out", detail: "The token for this account no longer works. Connect again." };
      throw e;
    }
  }
  return { state: "connected", email: cfg.email ?? null, accounts: accounts.length ? accounts : [{ id: accountId, name: accountId }], accountId, prefix: prefixOf(cfg), token: { name: stored.name, minted: !!stored.id, without: stored.without ?? [] } };
}
/** Tokens this run has seen work, so the Home screen does not hit the API on every status call. */
const checked = new Set<string>();

const needsToken = (accountId: string, accounts: CfAccount[], email: string | null, detail: string): CloudflareStatus => ({
  state: "needs-token", accountId, accounts, email, detail, link: tokenTemplateLink(tokenName()), permissions: APP_PERMISSIONS.map((p) => p.label),
});

const tokenName = () => `SuperGrid on ${hostname().replace(/\.local$/, "")}`;

/** Runs the OAuth login, then mints the token for the account this app manages. */
export async function connect(): Promise<CloudflareStatus> {
  session = await authorize();
  const list = await api<{ id: string; name: string }[]>(session.token, "/accounts?per_page=50");
  const accounts = list.map((a) => ({ id: a.id, name: a.name }));
  if (!accounts.length) throw new Error("This Cloudflare login can see no account.");
  const email = await api<{ email?: string }>(session.token, "/user").then((u) => u.email ?? null).catch(() => null);
  const cfg = { ...defaults(), ...readConfig() };
  const accountId = accounts.some((a) => a.id === cfg.accountId) ? cfg.accountId! : accounts[0].id;
  writeConfig({ accounts, email, accountId });
  return mintFor(accountId);
}

/** Mints the app's token for one account with the live login, or says what to do when the account will not let us. */
async function mintFor(accountId: string): Promise<CloudflareStatus> {
  const s = live();
  const cfg = readConfig();
  if (!s) return needsToken(accountId, cfg.accounts ?? [], cfg.email ?? null, "Connect again to create a token for this account.");
  try {
    // only the groups the login was granted a scope for: Cloudflare refuses the whole mint otherwise
    const { perms, left } = mintable(s.scopes);
    if (!perms.length) throw new Error("The login granted none of the scopes the token needs.");
    const minted = await mintToken(createCf(s.token, accountId), tokenName(), perms);
    await writeToken(accountId, { value: minted.value, id: minted.id, name: minted.name, without: [...left, ...minted.missing] });
    if (left.length || minted.missing.length) console.warn(`Token minted without ${[...left, ...minted.missing].join(", ")}.`);
    return status(true);
  } catch (e) {
    const why = e instanceof CfApiError ? (e.status === 403 || e.has(9109) || e.has(10000) ? "This login may not create API tokens in this account (it needs token provisioning rights, or to be its owner)." : e.message) : (e as Error).message;
    return needsToken(accountId, cfg.accounts ?? [], cfg.email ?? null, `${why} Create one from the template instead and paste it here.`);
  }
}

/** The fallback: a token the user made from the template link. Checked against the account before it is kept. */
export async function setToken(token: string): Promise<CloudflareStatus> {
  const cfg = { ...defaults(), ...readConfig() };
  const accountId = cfg.accountId ?? cfg.accounts?.[0]?.id;
  if (!accountId) throw new Error("Connect Cloudflare first, so the app knows which account the token is for.");
  await checkToken(createCf(token, accountId)).catch((e) => {
    throw new Error(e instanceof CfApiError && (e.status === 401 || e.status === 403) ? "That token cannot see this account. Check its permissions and that it is for the right account." : (e as Error).message);
  });
  await writeToken(accountId, { value: token, name: "pasted token" });
  return status(true);
}

export async function select(opts: { accountId?: string; prefix?: string }): Promise<CloudflareStatus> {
  const patch: { accountId?: string; prefix?: string } = {};
  if (opts.accountId) patch.accountId = opts.accountId;
  if (opts.prefix !== undefined) {
    if (!isPrefix(opts.prefix)) throw new Error("A prefix is one to eight lowercase letters or digits, starting with a letter.");
    patch.prefix = opts.prefix;
  }
  writeConfig(patch);
  // another account: mint for it too, while the login is fresh; otherwise the status asks to connect again
  if (opts.accountId && !(await readToken(opts.accountId))) return mintFor(opts.accountId);
  return status();
}

/** Drops the stored token for the selected account; the token itself stays valid until deleted in the dashboard. */
export async function disconnect(): Promise<CloudflareStatus> {
  const cfg = readConfig();
  if (cfg.accountId) forgetToken(cfg.accountId);
  writeConfig({ accounts: [], email: null });
  session = null;
  return status();
}

/** A client for the selected account, or an error that says what to do. `token` is what the client calls with, for the workspaces that get it as their media token. */
export async function client(): Promise<{ cf: Cf; prefix: string; token: string }> {
  const s = await status();
  if (s.state !== "connected") throw new Error(s.state === "needs-token" ? "Finish connecting Cloudflare: this account has no token yet." : "Connect Cloudflare first.");
  const token = (await readToken(s.accountId))!.value;
  return { cf: createCf(token, s.accountId), prefix: s.prefix, token };
}

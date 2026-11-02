import { CfApiError, createCf, type Cf } from "@supergrid/cloud";
import { isPrefix } from "@supergrid/app-kit/names";
import type { CfAccount, CloudflareStatus } from "../shared/bridge";
import { readConfig, writeConfig } from "./config";
import { authToken, login, wranglerBin } from "./wrangler";

// The link from this machine to a Cloudflare account: wrangler's login plus the app's choice of
// account and prefix. `client()` is what every account operation starts from.

const api = async <T>(token: string, path: string): Promise<T> => createCf(token, "-").get<T>(path);

const defaults = () => ({ accountId: process.env.SG_ACCOUNT_ID, prefix: process.env.SG_PREFIX });

export async function status(fresh = false): Promise<CloudflareStatus> {
  if (!wranglerBin()) return { state: "no-wrangler", detail: "wrangler is not bundled with this build" };
  const token = await authToken(fresh);
  if (!token) return { state: "logged-out" };
  let accounts: CfAccount[];
  try {
    const list = await api<{ id: string; name: string }[]>(token, "/accounts?per_page=50");
    accounts = list.map((a) => ({ id: a.id, name: a.name }));
  } catch (e) {
    if (e instanceof CfApiError && (e.status === 401 || e.status === 403)) return { state: "logged-out", detail: "The login has expired. Connect again." };
    throw e;
  }
  const email = await api<{ email?: string }>(token, "/user").then((u) => u.email ?? null).catch(() => null);
  const cfg = { ...defaults(), ...readConfig() };
  const accountId = accounts.some((a) => a.id === cfg.accountId) ? cfg.accountId! : (accounts[0]?.id ?? "");
  const prefix = cfg.prefix && isPrefix(cfg.prefix) ? cfg.prefix : "sg";
  return { state: "connected", email, accounts, accountId, prefix };
}

export async function select(opts: { accountId?: string; prefix?: string }): Promise<CloudflareStatus> {
  const patch: { accountId?: string; prefix?: string } = {};
  if (opts.accountId) patch.accountId = opts.accountId;
  if (opts.prefix !== undefined) {
    if (!isPrefix(opts.prefix)) throw new Error("A prefix is one to eight lowercase letters or digits, starting with a letter.");
    patch.prefix = opts.prefix;
  }
  writeConfig(patch);
  return status();
}

export async function connect(): Promise<CloudflareStatus> {
  await login();
  return status(true);
}

/** A client for the selected account, or an error that says what to do. */
export async function client(): Promise<{ cf: Cf; prefix: string }> {
  const s = await status();
  if (s.state !== "connected") throw new Error(s.state === "no-wrangler" ? s.detail : "Connect Cloudflare first.");
  if (!s.accountId) throw new Error("This login can see no Cloudflare account.");
  const token = (await authToken())!;
  return { cf: createCf(token, s.accountId), prefix: s.prefix };
}

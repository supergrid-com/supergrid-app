import { createCf, type Cf } from "@supergrid/cloud";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { status } from "./cf-cli";

// Cloudflare API calls ride on cf's own login. Before each job, `cf auth whoami` runs (cf refreshes
// its OAuth token then if it is about to expire), and the token is read from cf's config for that
// one job. SuperGrid never writes it anywhere. When cf is signed in with CLOUDFLARE_API_TOKEN
// instead, that token is used.

type CfConfig = { oauth_token?: string; expiration_time?: string };

function configPath(authSource: string | null): string {
  const m = authSource ? /OAuth token from (.+)$/.exec(authSource) : null;
  return m?.[1]?.trim() || join(homedir(), "Library/Preferences/cloudflare/config/default.json");
}

/** An API client for one account, on cf's current login. Throws a readable error when cf can't be used. */
export async function cfClient(accountId: string): Promise<Cf> {
  const s = await status();
  if (s.state === "no-cli") throw new Error("The Cloudflare CLI (cf) isn't installed on this Mac.");
  if (s.state !== "signed-in") throw new Error("cf is signed out. Sign in again on the Cloudflare page.");
  if (!s.accounts.some((a) => a.id === accountId)) throw new Error("cf's login can't reach this organization's Cloudflare account. Sign in again with a user that can, on the Cloudflare page.");
  if (s.authSource?.startsWith("CLOUDFLARE_API_TOKEN") && process.env.CLOUDFLARE_API_TOKEN) return createCf(process.env.CLOUDFLARE_API_TOKEN, accountId);
  let config: CfConfig;
  try {
    config = JSON.parse(readFileSync(configPath(s.authSource), "utf8")) as CfConfig;
  } catch {
    throw new Error("Couldn't read cf's login. Sign in again on the Cloudflare page.");
  }
  if (!config.oauth_token) throw new Error("cf has no login token. Sign in again on the Cloudflare page.");
  if (config.expiration_time && Date.parse(config.expiration_time) < Date.now()) throw new Error("cf's login has expired. Sign in again on the Cloudflare page.");
  return createCf(config.oauth_token, accountId);
}

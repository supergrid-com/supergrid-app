import { app, safeStorage } from "electron";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CfAccount } from "../shared/bridge";

// What the app remembers between runs: which Cloudflare account it manages and under which prefix,
// the API token it holds for each account, and the RPC token it minted for each workspace. Later
// this is the org's record in the control plane; for now it is a file in userData.
// `wsSecretKeys` is the copy of each workspace's SG_SECRETS_KEY, what seals its secrets table: set once and kept, so it
// can be put back if a redeploy ever drops it. A new key would make every stored secret unreadable.
// `cfTokens` holds one API token per account, sealed with the OS keychain (`safeStorage`) where there is one: what
// "Connect Cloudflare" minted, or what the user pasted (app/CONNECT.md).
export type StoredToken = { value: string; id?: string; name: string; /** Permissions a minted token had to leave out. */ without?: string[] };
export type Config = {
  accountId?: string;
  prefix?: string;
  /** Who connected, and the accounts they could see, from the last OAuth login. */
  email?: string | null;
  accounts?: CfAccount[];
  cfTokens?: Record<string, StoredToken>;
  wsTokens?: Record<string, string>;
  wsSecretKeys?: Record<string, string>;
};

const file = () => join(app.getPath("userData"), "config.json");

export function readConfig(): Config {
  try {
    return existsSync(file()) ? (JSON.parse(readFileSync(file(), "utf8")) as Config) : {};
  } catch {
    return {};
  }
}

export function writeConfig(patch: Config): Config {
  const next = { ...readConfig(), ...patch };
  mkdirSync(app.getPath("userData"), { recursive: true });
  writeFileSync(file(), `${JSON.stringify(next, null, 2)}\n`);
  return next;
}

const seal = async (text: string) => ((await safeStorage.isAsyncEncryptionAvailable()) ? `enc:${(await safeStorage.encryptStringAsync(text)).toString("base64")}` : `raw:${text}`);
const open = async (stored: string) => {
  if (stored.startsWith("raw:")) return stored.slice(4);
  if (stored.startsWith("enc:")) return (await safeStorage.isAsyncEncryptionAvailable()) ? (await safeStorage.decryptStringAsync(Buffer.from(stored.slice(4), "base64"))).result : null;
  return stored;
};

export async function readToken(accountId: string): Promise<StoredToken | null> {
  const t = readConfig().cfTokens?.[accountId];
  if (!t) return null;
  try {
    const value = await open(t.value);
    return value ? { ...t, value } : null;
  } catch {
    return null;
  }
}

export async function writeToken(accountId: string, token: StoredToken): Promise<void> {
  writeConfig({ cfTokens: { ...readConfig().cfTokens, [accountId]: { ...token, value: await seal(token.value) } } });
}

export function forgetToken(accountId: string): void {
  const { [accountId]: _, ...rest } = readConfig().cfTokens ?? {};
  writeConfig({ cfTokens: rest });
}

import { app } from "electron";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// What the app remembers between runs: which Cloudflare account it manages and under which prefix.
// Later this is the org's record in the control plane; for now it is a file in userData.
export type Config = { accountId?: string; prefix?: string };

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

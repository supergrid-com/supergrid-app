import { app } from "electron";
import { execFile, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

// The app ships wrangler and runs it as a Node script through Electron's own binary, so no Node
// on the user's PATH is needed. wrangler's login (OAuth, refreshed by wrangler itself) is the
// Cloudflare credential; the app never stores a token of its own.

// wrangler's own `bin/wrangler.js` re-spawns Node for its CLI, which under Electron loses the
// argv layout yargs expects; the app runs the CLI module directly behind a small preload instead.
export function wranglerBin(): string | null {
  const bin = join(app.getAppPath(), "node_modules/wrangler/wrangler-dist/cli.js");
  return existsSync(bin) ? bin : null;
}
const shim = () => join(app.getAppPath(), "resources/wrangler-shim.cjs");
const nodeArgs = (bin: string, args: string[]) => ["-r", shim(), bin, ...args];

const env = () => ({ ...process.env, ELECTRON_RUN_AS_NODE: "1", WRANGLER_SEND_METRICS: "false", CI: "1" });

/** Runs wrangler with the given arguments from the user's home, so no project config is picked up. */
export function wrangler(args: string[], timeoutMs = 30_000): Promise<{ code: number; stdout: string; stderr: string }> {
  const bin = wranglerBin();
  if (!bin) return Promise.reject(new Error("wrangler is not bundled with this build"));
  return new Promise((resolve) => {
    execFile(process.execPath, nodeArgs(bin, args), { env: env(), cwd: app.getPath("home"), timeout: timeoutMs, maxBuffer: 4 * 1024 * 1024 }, (error, stdout, stderr) => {
      const code = error && "code" in error && typeof error.code === "number" ? error.code : error ? 1 : 0;
      resolve({ code, stdout: String(stdout), stderr: String(stderr) });
    });
  });
}

let cached: { token: string; at: number } | null = null;
const TOKEN_TTL = 20 * 60 * 1000;

/** The OAuth access token behind `wrangler login`, from `wrangler auth token`. Null when there is no login. */
export async function authToken(fresh = false): Promise<string | null> {
  if (!fresh && cached && Date.now() - cached.at < TOKEN_TTL) return cached.token;
  const r = await wrangler(["auth", "token"]);
  // The token is the last non-empty line; everything before it is wrangler's banner.
  const token = r.stdout.trim().split("\n").map((l) => l.trim()).filter(Boolean).pop();
  if (r.code !== 0 || !token || /not logged in|wrangler login/i.test(r.stdout + r.stderr) || token.length < 20) {
    cached = null;
    return null;
  }
  cached = { token, at: Date.now() };
  return token;
}

export const forgetToken = () => { cached = null; };

/** `wrangler login`: opens the browser and waits for the callback. Resolves when wrangler exits. */
export function login(timeoutMs = 5 * 60 * 1000): Promise<void> {
  const bin = wranglerBin();
  if (!bin) return Promise.reject(new Error("wrangler is not bundled with this build"));
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, nodeArgs(bin, ["login"]), { env: env(), cwd: app.getPath("home"), stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    child.stdout.on("data", (d) => { out += String(d); });
    child.stderr.on("data", (d) => { out += String(d); });
    const timer = setTimeout(() => { child.kill(); reject(new Error("Timed out waiting for the Cloudflare login to finish.")); }, timeoutMs);
    child.on("error", (e) => { clearTimeout(timer); reject(e); });
    child.on("exit", (code) => {
      clearTimeout(timer);
      forgetToken();
      if (code === 0) resolve();
      else reject(new Error(`wrangler login exited with ${code}: ${out.trim().split("\n").slice(-3).join(" ")}`));
    });
  });
}

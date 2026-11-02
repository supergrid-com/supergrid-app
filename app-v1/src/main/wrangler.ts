import { app } from "electron";
import { execFile, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

// The app ships wrangler and runs it as a Node script through Electron's own binary, so no Node
// on the user's PATH is needed. It is for `wrangler dev` in previews; the Cloudflare credential
// is the app's own token (cloudflare.ts, app/CONNECT.md), not wrangler's login.

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

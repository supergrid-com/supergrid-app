import { execFile, spawn, type ChildProcess } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import type { CfAccount, CfCliStatus } from "../shared/bridge";

// The Cloudflare CLI (`cf`) on this Mac. The app runs it instead of holding a Cloudflare token:
// `cf auth login` opens the browser and keeps the login in cf's own store, `cf auth whoami` says who
// is signed in, which accounts that login reaches and which OAuth scopes it has. Nothing here is
// stored by the app.

type Run = { code: number; stdout: string; stderr: string };

/**
 * What SuperGrid asks cf's login for, instead of cf's default of every scope it knows. Fewer
 * permissions, and a callback URL short enough for cf's local server: with all ~470 scopes echoed
 * back, the redirect to localhost:8877 passed Node's 16 KB header limit and failed with HTTP 431.
 * Each name must be registered for cf's OAuth client (`offline` is, `offline_access` is not).
 */
export const CF_SCOPES = [
  "openid",
  "offline",
  "user:read",
  "account:read",
  "zone:read",
  "workers:write",
  "workers_scripts:write",
  "workers_routes:write",
  "workers_tail:read",
  "workers_kv:write",
  "d1:write",
  "queues:write",
  "workers-r2.write",
  "artifacts.write",
  "images:read",
  "images:write",
  "images.write",
  "stream.read",
  "stream.write",
  "account-analytics.read",
];

// A Mac app started from the Dock gets a bare PATH, without nvm, Homebrew or npm's global bin. So
// cf is looked for on PATH, then in the folders those installers use, and only then through the
// user's own shell (stdin closed, so nothing in .zshrc can wait on input). cf is a Node script
// (#!/usr/bin/env node), so its folder, which holds the node it was installed with, goes on PATH
// when it runs.
let found: Promise<{ path: string | null; searched: string[] }> | null = null;

function candidates(): string[] {
  const home = homedir();
  const dirs = (process.env.PATH ?? "").split(delimiter).filter(Boolean);
  const nvm = join(process.env.NVM_DIR ?? join(home, ".nvm"), "versions/node");
  if (existsSync(nvm)) {
    // newest Node first
    const versions = readdirSync(nvm).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
    dirs.push(...versions.map((v) => join(nvm, v, "bin")));
  }
  dirs.push("/opt/homebrew/bin", "/usr/local/bin", join(home, ".volta/bin"), join(home, "Library/pnpm"), join(home, ".local/share/pnpm"), join(home, ".bun/bin"), join(home, ".npm-global/bin"), join(home, ".local/bin"));
  return [...new Set(dirs)];
}

function fromShell(): Promise<string | null> {
  return new Promise((resolve) => {
    const shell = process.env.SHELL || "/bin/zsh";
    const child = spawn(shell, ["-ilc", "command -v cf"], { stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, HOME: homedir() } });
    let out = "";
    child.stdout.on("data", (d) => (out += String(d)));
    const timer = setTimeout(() => child.kill(), 15_000);
    child.on("close", () => {
      clearTimeout(timer);
      const path = out.trim().split("\n").pop()?.trim() ?? "";
      resolve(path.startsWith("/") && existsSync(path) ? path : null);
    });
    child.on("error", () => resolve(null));
  });
}

async function lookUp(): Promise<{ path: string | null; searched: string[] }> {
  const dirs = candidates();
  for (const dir of dirs) {
    const path = join(dir, "cf");
    if (existsSync(path)) return { path, searched: dirs };
  }
  const path = await fromShell();
  if (!path) console.warn(`[cf] not found. Looked on PATH and in: ${dirs.join(", ")}; then asked ${process.env.SHELL || "/bin/zsh"}.`);
  return { path, searched: [...dirs, `${process.env.SHELL || "/bin/zsh"} (command -v cf)`] };
}

export async function cfPath(refresh = false): Promise<string | null> {
  if (!found || refresh) found = lookUp();
  return (await found).path;
}

function run(bin: string, args: string[], timeoutMs = 30_000, onChild?: (child: ChildProcess) => void): Promise<Run> {
  const env = {
    ...process.env,
    PATH: [dirname(bin), process.env.PATH ?? ""].join(delimiter),
    // A backstop for the login callback: localhost cookies from other dev servers count toward the same limit.
    NODE_OPTIONS: [process.env.NODE_OPTIONS, "--max-http-header-size=65536"].filter(Boolean).join(" "),
    NO_COLOR: "1",
    CF_TELEMETRY_DISABLED: "1",
  };
  return new Promise((resolve) => {
    const child = execFile(bin, args, { env, cwd: homedir(), timeout: timeoutMs, maxBuffer: 4 * 1024 * 1024 }, (error, stdout, stderr) => {
      const code = error && "code" in error && typeof error.code === "number" ? error.code : error ? 1 : 0;
      resolve({ code, stdout: String(stdout), stderr: String(stderr) });
    });
    onChild?.(child);
  });
}

// The login in progress. cf listens on localhost:8877 until the browser comes back, so a login left
// behind (a closed window, a restart in dev) would hold the port; a new login or quitting stops it.
let pending: ChildProcess | null = null;

export function stopLogin(): void {
  if (pending && pending.exitCode === null) pending.kill();
  pending = null;
}

const CALLBACK_PORT = 8877;

/**
 * A restart in dev can end the app before it stops its login, leaving an orphaned `cf auth login`
 * on the callback port. Stops any process on that port that is a cf login, and nothing else.
 */
export function stopOrphanedLogin(): Promise<void> {
  return new Promise((resolve) => {
    execFile("/usr/sbin/lsof", ["-t", `-iTCP:${CALLBACK_PORT}`, "-sTCP:LISTEN"], (_e, stdout) => {
      const pids = String(stdout).split("\n").map((l) => Number(l.trim())).filter((n) => n > 0);
      if (!pids.length) return resolve();
      execFile("/bin/ps", ["-o", "pid=,command=", "-p", pids.join(",")], (_e2, out) => {
        for (const line of String(out).split("\n")) {
          const m = /^\s*(\d+)\s+(.*)$/.exec(line);
          if (m && /\bcf\b.*\bauth login\b/.test(m[2])) {
            try {
              process.kill(Number(m[1]));
            } catch {}
          }
        }
        setTimeout(resolve, 300);
      });
    });
  });
}

/** cf frames its errors in box-drawing characters; keep the words. */
function errorText(out: Run): string {
  const text = (out.stderr || out.stdout).replace(/[┌└│─┐┘]/g, " ").replace(/^\s*Error\s+/, "").replace(/\s+/g, " ").trim();
  return text || "cf auth login failed";
}

/** whoami prints one JSON object; find it even if a notice is printed around it. */
function parseJson(text: string): Record<string, unknown> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function accountsOf(value: unknown): CfAccount[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((a) => {
    const o = a as Record<string, unknown>;
    return typeof o?.id === "string" ? [{ id: o.id, name: typeof o.name === "string" ? o.name : o.id }] : [];
  });
}

export async function status(refresh = false): Promise<CfCliStatus> {
  const bin = await cfPath(refresh);
  if (!bin) return { state: "no-cli", searched: (await found)?.searched ?? [] };
  const [ver, who] = await Promise.all([run(bin, ["--version"]), run(bin, ["auth", "whoami"])]);
  const version = /v?(\d+\.\d+\.\d+)/.exec(ver.stdout + ver.stderr)?.[1] ?? null;
  const json = parseJson(who.stdout);
  if (!json?.authenticated) return { state: "signed-out", path: bin, version, detail: typeof json?.error === "string" ? json.error : undefined };
  return {
    state: "signed-in",
    path: bin,
    version,
    email: typeof json.email === "string" ? json.email : null,
    accounts: accountsOf(json.accounts),
    scopes: Array.isArray(json.scopes) ? json.scopes.filter((s): s is string => typeof s === "string") : null,
    tokenValid: json.tokenValid !== false,
    authSource: typeof json.authSource === "string" ? json.authSource : null,
  };
}

/**
 * `cf auth login` with the localhost callback (no device code to type): cf opens the browser and
 * exits once Cloudflare redirects back. Resolves with the status afterwards.
 */
export async function login(): Promise<CfCliStatus> {
  const bin = await cfPath();
  if (!bin) return status();
  stopLogin();
  await stopOrphanedLogin();
  const out = await run(bin, ["auth", "login", "--no-device", "--scopes", ...CF_SCOPES], 5 * 60_000, (child) => (pending = child));
  pending = null;
  const after = await status();
  if (after.state !== "signed-in" && out.code !== 0) throw new Error(errorText(out));
  return after;
}

export async function logout(): Promise<CfCliStatus> {
  const bin = await cfPath();
  if (!bin) return status();
  await run(bin, ["auth", "logout"]);
  return status();
}

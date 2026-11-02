import { app, ipcMain, type WebContents } from "electron";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { accessSync, constants, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, join } from "node:path";
import { createInterface } from "node:readline";
import { channels, type AgentStatus, type JsonRpcMessage } from "../shared/bridge";

// The coding agent, as a child process speaking ACP. Main is deliberately a pipe: it starts the
// agent, writes newline-delimited JSON-RPC to its stdin and forwards every line it prints to the
// renderer, which owns the protocol (lib/agent). Muse Code is the one agent for now; the agent's
// own login pays for the model, so the app holds no model account.

const AUTH_HINT = "Run `muse login` in a terminal, or set META_API_KEY.";

/** A GUI app gets a bare PATH on macOS, so look where installers put the binary too. */
function findMuse(): string | null {
  const home = homedir();
  const dirs = [...(process.env.PATH ?? "").split(delimiter), join(home, ".local/bin"), "/opt/homebrew/bin", "/usr/local/bin"];
  for (const dir of dirs) {
    if (!dir) continue;
    const path = join(dir, "muse");
    try {
      accessSync(path, constants.X_OK);
      return path;
    } catch {
      // keep looking
    }
  }
  return null;
}

function museAuthPath(): string {
  if (process.env.MUSE_AUTH_PATH) return process.env.MUSE_AUTH_PATH;
  return join(process.env.XDG_CONFIG_HOME || join(homedir(), ".config"), "muse", "auth.json");
}

function status(): AgentStatus {
  return { name: "Muse Code", available: findMuse() !== null, authDetected: !!process.env.META_API_KEY || existsSync(museAuthPath()), authHint: AUTH_HINT };
}

/** Our environment, without what a parent agent or Electron leaves in it. */
function childEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, MUSE_EXPERIMENTAL_ACP: "1" };
  for (const key of Object.keys(env)) {
    if (/^(CLAUDE|ANTHROPIC_|ELECTRON_)/.test(key)) delete env[key];
  }
  return env;
}

let running: { child: ChildProcessWithoutNullStreams; owner: WebContents } | null = null;

function emit(owner: WebContents, channel: string, payload: unknown) {
  if (!owner.isDestroyed()) owner.send(channel, payload);
}

export function stopAgent(): void {
  const current = running;
  running = null;
  try {
    current?.child.kill("SIGTERM");
  } catch {
    // already gone
  }
}

function startAgent(owner: WebContents): void {
  const bin = findMuse();
  if (!bin) throw new Error(`Muse Code is not installed. ${AUTH_HINT}`);
  stopAgent();
  const child = spawn(bin, ["acp"], { env: childEnv(), cwd: homedir(), stdio: ["pipe", "pipe", "pipe"] });
  const self = { child, owner };
  running = self;

  createInterface({ input: child.stderr }).on("line", (line) => emit(owner, channels.agentLog, line));
  createInterface({ input: child.stdout }).on("line", (raw) => {
    const line = raw.trim();
    if (!line) return;
    try {
      emit(owner, channels.agentMessage, JSON.parse(line) as JsonRpcMessage);
    } catch {
      emit(owner, channels.agentLog, raw);
    }
  });
  child.on("error", (err) => emit(owner, channels.agentLog, `spawn error: ${err.message}`));
  child.on("exit", (code) => {
    // A stopped or replaced agent has nothing to report: its exit would land on the new connection.
    if (running !== self) return;
    running = null;
    emit(owner, channels.agentExit, code);
  });
}

/** The folder a workspace's agent sessions run in, until apps are cloned locally. */
function workspaceDir(id: unknown): string {
  if (typeof id !== "string" || !/^[\w-]+$/.test(id)) throw new Error("Not a workspace id.");
  const dir = join(app.getPath("userData"), "workspaces", id);
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function registerAgent(): void {
  ipcMain.handle(channels.agentStatus, () => status());
  ipcMain.handle(channels.agentStart, (e) => startAgent(e.sender));
  ipcMain.handle(channels.agentStop, () => stopAgent());
  ipcMain.handle(channels.agentDir, (_e, id: unknown) => workspaceDir(id));
  ipcMain.handle(channels.agentSend, (_e, message: JsonRpcMessage) => {
    if (!running) throw new Error("The agent is not running.");
    running.child.stdin.write(`${JSON.stringify(message)}\n`);
  });
  app.on("before-quit", stopAgent);
}

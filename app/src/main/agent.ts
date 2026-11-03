import { app, ipcMain, type WebContents } from "electron";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { accessSync, constants, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, join } from "node:path";
import { createInterface } from "node:readline";
import { channels, type AgentAnswer, type AgentStatus, type AppContext, type JsonRpcMessage, type McpServerConfig } from "../shared/bridge";
import { MCP_SERVER_NAME } from "../shared/agent";
import * as bridge from "./agent-bridge";

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

/** The folder a workspace's agent sessions run in: its repo (src/main/apps.ts), made on first open. */
function workspaceDir(id: unknown): string {
  if (typeof id !== "string" || !/^[\w-]+$/.test(id)) throw new Error("Not a workspace id.");
  const dir = join(app.getPath("userData"), "workspaces", id);
  mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * The MCP servers a session gets: our own stdio proxy (built beside this file as mcp.js) run by
 * this Electron binary as plain Node, pointed back at the app's tool bridge with the client id the
 * renderer made for the session. The tools run in this process (src/main/agent-bridge.ts); the
 * agent sees tools, never a token.
 */
function mcpServersFor(id: unknown, client: unknown, sender: WebContents): McpServerConfig[] {
  if (typeof id !== "string" || !/^[\w-]+$/.test(id)) return [];
  if (typeof client !== "string" || !/^[\w-]+$/.test(client)) throw new Error("A session needs a client id.");
  bridge.registerClient(client, id, sender);
  return [{
    name: MCP_SERVER_NAME,
    command: process.execPath,
    args: [join(__dirname, "mcp.js")],
    env: [
      { name: "ELECTRON_RUN_AS_NODE", value: "1" },
      { name: "SG_BRIDGE", value: bridge.startBridge() },
      { name: "SG_CLIENT", value: client },
    ],
  }];
}

export function registerAgent(): void {
  ipcMain.handle(channels.agentMcp, (e, id: unknown, client: unknown) => mcpServersFor(id, client, e.sender));
  ipcMain.handle(channels.agentBind, (_e, client: unknown, opts: unknown) => {
    const o = (opts ?? {}) as { sessionId?: unknown };
    if (typeof client === "string") bridge.bindClient(client, { sessionId: typeof o.sessionId === "string" ? o.sessionId : null });
  });
  ipcMain.handle(channels.agentContext, (_e, wsId: unknown, context: unknown) => {
    if (typeof wsId === "string" && context && typeof context === "object") bridge.setContext(wsId, context as AppContext);
  });
  ipcMain.handle(channels.agentAnswer, (_e, answer: unknown) => {
    const a = answer as Partial<AgentAnswer> | undefined;
    if (a && typeof a.id === "string") bridge.answer({ id: a.id, ok: a.ok === true, uploaded: Array.isArray(a.uploaded) ? a.uploaded : undefined, note: typeof a.note === "string" ? a.note : undefined });
  });
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

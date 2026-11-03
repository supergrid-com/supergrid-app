import { app, type WebContents } from "electron";
import { randomUUID } from "node:crypto";
import { existsSync, readdirSync, unlinkSync } from "node:fs";
import { createServer, type Server, type Socket } from "node:net";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { channels, type AgentAnswer, type AgentAsk, type AgentWidget, type AppContext, type AskInput } from "../shared/bridge";
import { appTools } from "./tools/app";
import { appsTools } from "./tools/apps";
import { analyticsTools } from "./tools/analytics";
import { databaseTools } from "./tools/database";
import { asText, makeCtx, ToolError, type Json, type Tool } from "./tools/index";
import { libraryTools } from "./tools/library";
import { themeTools } from "./tools/themes";
import { modeOf } from "./apps";
import { workspace } from "./workspace-api";

// The bridge between the agent's MCP server and the app. Muse spawns our stdio MCP server
// (src/main/mcp.ts) once per session, as a plain Node process that holds no credential and no
// state: it connects back here over a local socket, says which client it is, and forwards every
// tools/list and tools/call. The tools run in this process, with the Cloudflare login, the
// workspace tokens and the window all in reach: a tool can ask the user a question through a card
// in the chat (ask), draw its result as a card (widget) and move the app to a page (navigate).
//
// A client is one agent session. The renderer makes the client id when it asks for the session's
// MCP config, then binds it to the session id once the session exists, so what a tool does
// reaches the thread that called it. Whether Dev tools answer is the workspace's mode (apps.ts).

export const tools: Tool[] = [...appTools, ...appsTools, ...databaseTools, ...libraryTools, ...themeTools, ...analyticsTools];

type Rpc = { jsonrpc: "2.0"; id?: number | string | null; method?: string; params?: Json; result?: unknown; error?: { code: number; message: string } };
type Client = { wsId: string; sender: WebContents; sessionId: string | null };

const clients = new Map<string, Client>();
const contexts = new Map<string, AppContext>();
const asks = new Map<string, { resolve: (a: AgentAnswer) => void; timer: NodeJS.Timeout }>();
let server: Server | null = null;

const ASK_TIMEOUT = 15 * 60_000;

/** Where the socket lives: a path in the app's data folder, or a named pipe on Windows. */
export function socketPath(): string {
  if (process.platform === "win32") return `\\\\.\\pipe\\supergrid-agent-${process.pid}`;
  return join(app.getPath("userData"), `agent-${process.pid}.sock`);
}

export function registerClient(client: string, wsId: string, sender: WebContents): void {
  clients.set(client, { wsId, sender, sessionId: null });
}

export function bindClient(client: string, opts: { sessionId: string | null }): void {
  const c = clients.get(client);
  if (c) clients.set(client, { ...c, ...opts });
}

export function setContext(wsId: string, context: AppContext): void {
  contexts.set(wsId, context);
}

export function answer(a: AgentAnswer): void {
  const pending = asks.get(a.id);
  if (!pending) return;
  asks.delete(a.id);
  clearTimeout(pending.timer);
  pending.resolve(a);
}

function send(c: Client, channel: string, payload: unknown): void {
  if (!c.sender.isDestroyed()) c.sender.send(channel, payload);
}

function ask(client: string, c: Client, tool: string, q: AskInput): Promise<AgentAnswer> {
  const id = randomUUID();
  const full = { ...q, id, client, sessionId: c.sessionId, wsId: c.wsId, tool } as AgentAsk;
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      asks.delete(id);
      resolve({ id, ok: false, note: "No answer after fifteen minutes." });
    }, ASK_TIMEOUT);
    asks.set(id, { resolve, timer });
    send(c, channels.agentAsk, full);
  });
}

const instructions = (wsName: string) =>
  [
    `You are the agent inside SuperGrid, a desktop app that manages the workspace "${wsName}" on the user's own Cloudflare account. The tools here are the workspace itself: its database tables and rows, its themes, its library (pictures, video, files), its skills, the events it records and analytics over them, and the app's own navigation.`,
    "Every prompt arrives with a context resource (supergrid://context): the workspace, whether the desktop is in Live or Dev mode for it, and the page the user is on. Use it: a question about 'this table' means the one in the context. app_context reads it again. Live is the deployed Worker and its data; Dev is the workspace's repo on this Mac, served by its dev server with its own local data, where code changes show at once.",
    "Before doing something the user may have a way of doing, call skills_search. Before writing an app or app code, read docs_list and build-an-app, and make sure the desktop is in Dev mode (suggest_dev_mode). When the user asks to build an app or change code while in Live mode, call suggest_dev_mode with why, then carry on with what they decide. Code lives in the workspace repo (apps_local says where); a change goes live with ws_deploy.",
    "Reads are free. Adding rows is free up to a batch. Updating and deleting rows, dropping tables and running SQL by hand always go through the user, who sees a card and approves or declines: never work around a decline. events and the system tables are read only.",
    "Tool results draw cards in the chat (tables, charts, pictures, themes). When a card shows the data, keep your words short and point at it rather than repeating it. Prefer app_navigate over describing where something is in the app.",
  ].join("\n\n");

async function call(client: string, c: Client, name: string, args: Json): Promise<{ content: { type: "text"; text: string }[]; isError?: boolean }> {
  const tool = tools.find((t) => t.name === name);
  if (!tool) return { content: [{ type: "text", text: `Unknown tool ${name}.` }], isError: true };
  const ctx = makeCtx({
    wsId: c.wsId,
    client,
    tool: name,
    dev: modeOf(c.wsId) === "dev",
    context: contexts.get(c.wsId) ?? null,
    ask: (q) => ask(client, c, name, q),
    widget: (widget: AgentWidget) => send(c, channels.agentWidget, { client, sessionId: c.sessionId, wsId: c.wsId, tool: name, widget }),
    navigate: (to) => send(c, channels.agentNavigate, { client, sessionId: c.sessionId, wsId: c.wsId, to }),
    sender: () => c.sender,
  });
  try {
    const out = await tool.run(ctx, args);
    return { content: [{ type: "text", text: asText(out) }] };
  } catch (e) {
    const message = e instanceof ToolError ? e.message : String((e as Error)?.message ?? e).replace(/^Error invoking remote method '[^']*': (?:Error: )?/, "");
    return { content: [{ type: "text", text: message }], isError: true };
  }
}

async function handle(socket: Socket, msg: Rpc, state: { client: string | null }): Promise<void> {
  const reply = (result: unknown): void => void socket.write(`${JSON.stringify({ jsonrpc: "2.0", id: msg.id, result })}\n`);
  const fail = (code: number, message: string): void => void socket.write(`${JSON.stringify({ jsonrpc: "2.0", id: msg.id, error: { code, message } })}\n`);
  const p = msg.params ?? {};
  try {
    switch (msg.method) {
      case "hello": {
        const client = typeof p.client === "string" ? p.client : "";
        const c = clients.get(client);
        if (!c) return fail(-32001, "Unknown client: the app did not start this session.");
        state.client = client;
        const ws = await workspace(c.wsId).catch(() => null);
        return reply({ tools: tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })), instructions: instructions(ws?.name ?? "this workspace") });
      }
      case "call": {
        const c = state.client ? clients.get(state.client) : undefined;
        if (!c || !state.client) return fail(-32001, "Say hello first.");
        return reply(await call(state.client, c, String(p.name ?? ""), (p.arguments as Json) ?? {}));
      }
      default:
        return fail(-32601, `Method not found: ${String(msg.method)}`);
    }
  } catch (e) {
    fail(-32603, String((e as Error)?.message ?? e));
  }
}

/** Removes this path and the sockets of app processes that are gone (a crash leaves them behind). */
function sweepSockets(path: string): void {
  const dir = app.getPath("userData");
  for (const name of readdirSync(dir).filter((n) => /^agent-\d+\.sock$/.test(n))) {
    const pid = Number(name.slice(6, -5));
    let alive = pid !== process.pid;
    if (alive) {
      try {
        process.kill(pid, 0);
      } catch {
        alive = false;
      }
    }
    if (!alive) {
      try {
        unlinkSync(join(dir, name));
      } catch {}
    }
  }
  if (existsSync(path)) unlinkSync(path);
}

/** Starts the socket server once; the path is what mcpServersFor hands each session. */
export function startBridge(): string {
  const path = socketPath();
  if (server) return path;
  if (process.platform !== "win32") sweepSockets(path);
  server = createServer((socket) => {
    const state = { client: null as string | null };
    createInterface({ input: socket }).on("line", (line) => {
      const raw = line.trim();
      if (!raw) return;
      let msg: Rpc;
      try {
        msg = JSON.parse(raw) as Rpc;
      } catch {
        return;
      }
      void handle(socket, msg, state);
    });
    socket.on("error", () => undefined);
  });
  server.listen(path);
  app.on("before-quit", () => {
    server?.close();
    if (process.platform !== "win32" && existsSync(path)) {
      try {
        unlinkSync(path);
      } catch {}
    }
  });
  return path;
}

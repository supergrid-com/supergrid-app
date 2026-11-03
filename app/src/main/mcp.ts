// The MCP server the coding agent spawns for a workspace: a stdio proxy back to the running app.
// Muse starts this as a plain Node script (ELECTRON_RUN_AS_NODE, no Electron loaded) once per
// session, with the app's socket (SG_BRIDGE) and this session's client id (SG_CLIENT) in the
// environment. Every tools/list and tools/call goes over the socket to src/main/agent-bridge.ts,
// where the tools run with the app's credentials; nothing lives here but the two protocols.
//
// Agent side: MCP 2025-06-18 over newline-delimited JSON-RPC (initialize, tools/list, tools/call).
// App side: our own JSON-RPC over the socket (hello, call).
import { connect, type Socket } from "node:net";
import { createInterface } from "node:readline";

const BRIDGE = process.env.SG_BRIDGE ?? "";
const CLIENT = process.env.SG_CLIENT ?? "";

type Json = Record<string, unknown>;
type Rpc = { jsonrpc: "2.0"; id?: number | string | null; method?: string; params?: Json; result?: unknown; error?: { code: number; message: string } };
type ToolInfo = { name: string; description: string; inputSchema: Json };

const out = (msg: Rpc) => process.stdout.write(`${JSON.stringify(msg)}\n`);

// ---- the socket to the app ----

let socket: Socket | null = null;
let nextId = 1;
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();

function open(): Promise<Socket> {
  return new Promise((resolve, reject) => {
    if (!BRIDGE || !CLIENT) return reject(new Error("SuperGrid did not start this server (SG_BRIDGE and SG_CLIENT are not set)."));
    const s = connect(BRIDGE);
    s.once("connect", () => {
      socket = s;
      resolve(s);
    });
    s.once("error", (e) => {
      if (socket !== s) reject(new Error(`Could not reach SuperGrid: ${e.message}`));
    });
    s.on("close", () => {
      if (socket === s) socket = null;
      for (const p of pending.values()) p.reject(new Error("SuperGrid closed the connection."));
      pending.clear();
    });
    createInterface({ input: s }).on("line", (line) => {
      let msg: Rpc;
      try {
        msg = JSON.parse(line) as Rpc;
      } catch {
        return;
      }
      const p = typeof msg.id === "number" ? pending.get(msg.id) : undefined;
      if (!p) return;
      pending.delete(msg.id as number);
      if (msg.error) p.reject(new Error(msg.error.message));
      else p.resolve(msg.result);
    });
  });
}

async function app<T>(method: string, params: Json): Promise<T> {
  const s = socket ?? (await open());
  const id = nextId++;
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve: (v) => resolve(v as T), reject });
    s.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
  });
}

let hello: Promise<{ tools: ToolInfo[]; instructions: string }> | null = null;
const greet = () => (hello ??= app<{ tools: ToolInfo[]; instructions: string }>("hello", { client: CLIENT }).catch((e) => {
  hello = null;
  throw e;
}));

// ---- the MCP side ----

async function handle(msg: Rpc): Promise<void> {
  const { id, method, params = {} } = msg;
  if (method === undefined) return;
  const reply = (result: unknown) => {
    if (id !== undefined && id !== null) out({ jsonrpc: "2.0", id, result });
  };
  try {
    switch (method) {
      case "initialize": {
        const h = await greet().catch((e: Error) => ({ tools: [] as ToolInfo[], instructions: `The SuperGrid tools are unavailable: ${e.message}` }));
        return reply({ protocolVersion: (params.protocolVersion as string) || "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "supergrid", version: "0.2.0" }, instructions: h.instructions });
      }
      case "notifications/initialized":
      case "notifications/cancelled":
        return;
      case "ping":
        return reply({});
      case "tools/list":
        return reply({ tools: (await greet().catch(() => ({ tools: [] as ToolInfo[] }))).tools });
      case "tools/call": {
        await greet();
        return reply(await app("call", { name: params.name, arguments: params.arguments ?? {} }));
      }
      default:
        if (id !== undefined && id !== null) out({ jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } });
    }
  } catch (e) {
    if (method === "tools/call" && id !== undefined && id !== null) return reply({ content: [{ type: "text", text: (e as Error).message }], isError: true });
    if (id !== undefined && id !== null) out({ jsonrpc: "2.0", id, error: { code: -32603, message: (e as Error).message } });
  }
}

createInterface({ input: process.stdin }).on("line", (line) => {
  const raw = line.trim();
  if (!raw) return;
  let msg: Rpc;
  try {
    msg = JSON.parse(raw) as Rpc;
  } catch {
    return out({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
  }
  void handle(msg);
});
process.stdin.on("end", () => process.exit(0));

// Operations: what an app can do, declared once in workers/app.ts and reached four ways with one access rule.
//   in process   ctx.call("forms.create", input)            loaders and actions
//   REST         POST /api/<id>/ops/forms.create             the admin UI's own fetches, scripts, other apps
//   MCP          POST /api/<id>/mcp                          any MCP client; one tool per operation
//   the desktop  app_call through the agent's tools          the same REST route with the workspace's token
// The served manifest lists them with their schemas, so an agent reads what an app can do without its source.
import type { AppCtx } from "./context";
import { checkSchema, withDefaults, type JsonSchema } from "./schema";
import { can, type SgUser } from "./user";

/** Who may run an operation: anyone, any staff member, owners, or staff with every listed permission. */
export type Access = "public" | "staff" | "owner" | string[];

export type Operation<I = unknown, O = unknown> = {
  description: string;
  access: Access;
  input?: JsonSchema;
  /** Documents the result for agents; not checked. */
  output?: JsonSchema;
  /** The desktop asks the user before running it, and MCP marks the tool destructive. */
  confirm?: boolean;
  run: (input: I, ctx: AppCtx) => Promise<O> | O;
};
export type Operations = Record<string, Operation<any, any>>;

export const OPERATION_NAME = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;

/** An operation as the served manifest and tools/list show it. */
export type OperationSummary = { name: string; description: string; access: Access; input: JsonSchema; output?: JsonSchema; confirm: boolean };
export const summarize = (ops: Operations): OperationSummary[] =>
  Object.entries(ops).map(([name, op]) => ({ name, description: op.description, access: op.access, input: op.input ?? { type: "object", properties: {} }, ...(op.output ? { output: op.output } : {}), confirm: !!op.confirm }));

export class OperationError extends Error {
  status: number;
  problems: string[];
  constructor(message: string, status = 400, problems: string[] = []) {
    super(message);
    this.status = status;
    this.problems = problems;
  }
}

export function allowed(access: Access, user: SgUser | null): boolean {
  if (access === "public") return true;
  if (!user) return false;
  if (access === "staff") return true;
  if (access === "owner") return user.role === "owner" || can(user, "*");
  return access.every((p) => can(user, p));
}

/** Runs one operation for a context: checks who is calling and what they sent, then runs it. */
export async function runOperation(ops: Operations, name: string, rawInput: unknown, ctx: AppCtx): Promise<unknown> {
  const op = ops[name];
  if (!op) throw new OperationError(`No operation "${name}".`, 404);
  if (!allowed(op.access, ctx.user)) throw new OperationError(ctx.user ? `Your role (${ctx.user.role}) cannot run ${name}.` : `${name} needs a signed-in staff member.`, ctx.user ? 403 : 401);
  const input = withDefaults(op.input, rawInput ?? {});
  const problems = checkSchema(op.input, input);
  if (problems.length) throw new OperationError(`Bad input for ${name}.`, 400, problems);
  return op.run(input, ctx);
}

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });

/** `GET /api/<id>/ops` lists; `POST /api/<id>/ops/<name>` runs one with a JSON body. */
export async function handleOpsRequest(ops: Operations, request: Request, rest: string, ctx: AppCtx): Promise<Response> {
  if (rest === "" && request.method === "GET") return json({ operations: summarize(ops) });
  const name = rest.replace(/^\//, "");
  if (!name || !OPERATION_NAME.test(name)) return json({ error: "Not found" }, 404);
  if (request.method !== "POST") return json({ error: "POST a JSON body" }, 405);
  let input: unknown = {};
  const text = await request.text();
  if (text.trim()) {
    try { input = JSON.parse(text); } catch { return json({ error: "The body is not JSON" }, 400); }
  }
  try {
    return json({ result: (await runOperation(ops, name, input, ctx)) ?? null });
  } catch (e) {
    if (e instanceof OperationError) return json({ error: e.message, problems: e.problems }, e.status);
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
}

// ---- MCP: Streamable HTTP, stateless, JSON responses. One tool per operation; names use underscores. ----

const toolName = (op: string) => op.replace(/[.-]/g, "_");
type Rpc = { jsonrpc?: string; id?: number | string | null; method?: string; params?: Record<string, unknown> };

/** `POST /api/<id>/mcp`: initialize, tools/list and tools/call for the app's operations, as a plain MCP server. */
export async function handleMcpRequest(ops: Operations, appName: string, version: string, request: Request, ctx: AppCtx): Promise<Response> {
  if (request.method === "GET") return new Response("This MCP endpoint answers POST only (no server-sent stream).", { status: 405 });
  if (request.method !== "POST") return new Response(null, { status: 405 });
  let body: Rpc | Rpc[];
  try { body = (await request.json()) as Rpc | Rpc[]; } catch { return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, 400); }
  const reply = async (msg: Rpc): Promise<Rpc & { result?: unknown; error?: unknown } | null> => {
    const id = msg.id ?? null;
    if (msg.id === undefined) return null; // a notification
    switch (msg.method) {
      case "initialize":
        return { jsonrpc: "2.0", id, result: { protocolVersion: "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: appName, version } } };
      case "ping":
        return { jsonrpc: "2.0", id, result: {} };
      case "tools/list":
        return { jsonrpc: "2.0", id, result: { tools: summarize(ops).map((o) => ({ name: toolName(o.name), description: o.description, inputSchema: o.input, annotations: { destructiveHint: o.confirm, readOnlyHint: false } })) } };
      case "tools/call": {
        const p = msg.params ?? {};
        const name = Object.keys(ops).find((k) => toolName(k) === p.name) ?? String(p.name);
        try {
          const result = await runOperation(ops, name, p.arguments ?? {}, ctx);
          return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: typeof result === "string" ? result : JSON.stringify(result ?? null, null, 2) }], structuredContent: result && typeof result === "object" ? result : undefined } };
        } catch (e) {
          const text = e instanceof OperationError ? [e.message, ...e.problems].join("\n") : String((e as Error)?.message ?? e);
          return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text }], isError: true } };
        }
      }
      default:
        return { jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${msg.method}` } };
    }
  };
  if (Array.isArray(body)) {
    const out = (await Promise.all(body.map(reply))).filter((r) => r !== null);
    return out.length ? json(out) : new Response(null, { status: 202 });
  }
  const out = await reply(body);
  return out ? json(out) : new Response(null, { status: 202 });
}

import type { AgentAnswer, AgentWidget, AppContext, AskInput, D1RawResult, D1Result, D1Target, WorkspaceSummary } from "../../shared/bridge";
import * as cloudflare from "../cloudflare";
import { localWorkspace } from "../local";
import * as d1 from "../d1";
import * as workspaceApi from "../workspace-api";

// The agent's tools, defined once here and served to the MCP proxy (src/main/mcp.ts) through the
// bridge (src/main/agent-bridge.ts). A tool runs in the main process, where the Cloudflare login,
// the workspace tokens and the window all are: it reads the workspace's database through the same
// path the Database pages use, asks the user through a card in the chat, and draws its result as a
// widget beside the call. `dev` tools answer only while the desktop is in Dev mode for the workspace.

export type Json = Record<string, unknown>;

export type ToolResult = { text: string; isError?: boolean };

export type ToolCtx = {
  wsId: string;
  client: string;
  tool: string;
  /** Whether the desktop is in Dev mode for the workspace (the repo's dev server on this Mac, local data). */
  dev: boolean;
  /** What is open in the app for this workspace, or null before the window has said. */
  context: AppContext | null;
  ws(): Promise<WorkspaceSummary>;
  /** The account and Worker whose D1 the workspace is; in Dev mode, the dev server whose local D1 answers instead. */
  target(): Promise<D1Target>;
  /** One statement on the workspace's D1, rows as objects. */
  query(sql: string, params?: unknown[]): Promise<D1Result>;
  /** One statement or a script, rows as arrays. */
  raw(sql: string, params?: unknown[]): Promise<D1RawResult>;
  /** The workspace's own RPC surface, with its token. */
  rpc<T = unknown>(method: string, args?: unknown[]): Promise<T>;
  /** The Cloudflare account the organization is on. */
  accountId(): Promise<string>;
  /** Puts a question to the user in the chat and waits for the answer. */
  ask(ask: AskInput): Promise<AgentAnswer>;
  /** Draws a card beside this call in the chat. */
  widget(widget: AgentWidget): void;
  /** Moves the app to a page inside the workspace. */
  navigate(to: string): void;
  /** The window the calling thread is in, for work that reports progress to it. */
  sender(): import("electron").WebContents;
};

export type Tool = {
  name: string;
  description: string;
  inputSchema: Json;
  /** Only in Dev mode; in Live mode the call answers with how to switch. */
  dev?: boolean;
  run: (ctx: ToolCtx, args: Json) => Promise<unknown>;
};

/** A tool's answer as MCP content. A string stays as it is; anything else is JSON. */
export const asText = (v: unknown): string => (typeof v === "string" ? v : JSON.stringify(v, null, 2));

export class ToolError extends Error {}

/** Throws unless the desktop is in Dev mode for the workspace, telling the agent what to do instead. */
export function requireDev(ctx: ToolCtx, what: string): void {
  if (ctx.dev) return;
  throw new ToolError(`${what} needs Dev mode, and the desktop is in Live mode for this workspace. Call suggest_dev_mode with why, and the user can switch; or do what Live mode allows.`);
}

// ---- argument helpers ----

export const str = (v: unknown, what: string, opts: { optional?: boolean; max?: number } = {}): string => {
  if (v === undefined || v === null || v === "") {
    if (opts.optional) return "";
    throw new ToolError(`Missing ${what}.`);
  }
  if (typeof v !== "string") throw new ToolError(`${what} must be a string.`);
  if (opts.max && v.length > opts.max) throw new ToolError(`${what} is too long (max ${opts.max}).`);
  return v;
};
export const num = (v: unknown, what: string, opts: { min?: number; max?: number; dflt: number }): number => {
  if (v === undefined || v === null) return opts.dflt;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) throw new ToolError(`${what} must be a number.`);
  return Math.max(opts.min ?? -Infinity, Math.min(opts.max ?? Infinity, Math.trunc(n)));
};
export const bool = (v: unknown, dflt = false): boolean => (typeof v === "boolean" ? v : dflt);
export const obj = (v: unknown, what: string): Json => {
  if (!v || typeof v !== "object" || Array.isArray(v)) throw new ToolError(`${what} must be an object.`);
  return v as Json;
};
export const list = <T = unknown>(v: unknown, what: string, opts: { optional?: boolean; max?: number } = {}): T[] => {
  if (v === undefined || v === null) {
    if (opts.optional) return [];
    throw new ToolError(`Missing ${what}.`);
  }
  if (!Array.isArray(v)) throw new ToolError(`${what} must be a list.`);
  if (opts.max && v.length > opts.max) throw new ToolError(`${what} holds up to ${opts.max} items.`);
  return v as T[];
};

/** Rows as arrays with their columns, for a widget: the first `limit` rows, cells shortened. */
export function tabular(rows: Record<string, unknown>[], columns?: string[], limit = 50): { columns: string[]; rows: unknown[][] } {
  const cols = columns ?? [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const cell = (v: unknown): unknown => {
    if (v === null || v === undefined) return null;
    if (typeof v === "object") return JSON.stringify(v).slice(0, 200);
    if (typeof v === "string" && v.length > 200) return `${v.slice(0, 200)}…`;
    return v;
  };
  return { columns: cols, rows: rows.slice(0, limit).map((r) => cols.map((c) => cell(r[c]))) };
}

/** The context a tool runs with, built by the bridge for one call. */
export function makeCtx(base: Pick<ToolCtx, "wsId" | "client" | "tool" | "dev" | "context" | "ask" | "widget" | "navigate" | "sender">): ToolCtx {
  let ws: Promise<WorkspaceSummary> | null = null;
  let target: Promise<D1Target> | null = null;
  const ctx: ToolCtx = {
    ...base,
    ws: () => (ws ??= workspaceApi.workspace(base.wsId)),
    accountId: async () => {
      if (localWorkspace(base.wsId)) throw new Error("This workspace runs only on this Mac, so it has no Cloudflare account: Images, Media and Files aren't available in it.");
      return (await cloudflare.client()).cf.accountId;
    },
    target: () =>
      (target ??= (async () => {
        const w = await ctx.ws();
        // in Dev the dev server's local D1 answers, with no account (a workspace that lives only on this Mac has none)
        return w.dev ? { accountId: "", worker: w.worker, local: { ws: w.id, url: w.url } } : { accountId: await ctx.accountId(), worker: w.worker };
      })()),
    query: async (sql, params = []) => d1.query(await ctx.target(), sql, params),
    raw: async (sql, params = []) => d1.raw(await ctx.target(), sql, params),
    rpc: <T,>(method: string, args: unknown[] = []) => workspaceApi.rpc(base.wsId, method, args) as Promise<T>,
  };
  return ctx;
}

import type { JsonRpcMessage } from "../../../../shared/bridge";
import { sg } from "~/lib/bridge";

// A small JSON-RPC 2.0 client for the agent process. Main relays lines both ways; this adds
// request and response matching, answers what the agent asks us (session/request_permission),
// and routes notifications (session/update) to the caller.

export class AcpError extends Error {
  constructor(public readonly code: number, message: string, public readonly data?: unknown) {
    super(message);
    this.name = "AcpError";
  }
}

export type ConnectionHandlers = {
  onNotification: (method: string, params: unknown) => void;
  /** Return the result, or throw an AcpError to answer with a JSON-RPC error. */
  onRequest: (method: string, params: unknown) => Promise<unknown>;
  onLog?: (line: string) => void;
  onExit?: (code: number | null) => void;
};

type Pending = { resolve: (value: unknown) => void; reject: (err: AcpError) => void };

export class AcpConnection {
  private nextId = 1;
  private pending = new Map<number, Pending>();
  private unsubscribers: Array<() => void> = [];
  private closed = false;

  constructor(private readonly handlers: ConnectionHandlers) {}

  async start(): Promise<void> {
    if (!sg) throw new AcpError(-32000, "The agent runs in the desktop app.");
    this.unsubscribers.push(
      sg.agent.onMessage((m) => void this.handleIncoming(m)),
      sg.agent.onLog((line) => this.handlers.onLog?.(line)),
      sg.agent.onExit((code) => {
        if (this.closed) return;
        this.failAllPending("The agent process exited.");
        this.handlers.onExit?.(code);
      }),
    );
    try {
      await sg.agent.start();
    } catch (err) {
      await this.stop();
      throw new AcpError(-32000, errorMessage(err));
    }
  }

  async stop(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    for (const un of this.unsubscribers) un();
    this.unsubscribers = [];
    this.failAllPending("The connection closed.");
    await sg?.agent.stop().catch(() => undefined);
  }

  get isClosed(): boolean {
    return this.closed;
  }

  request<T>(method: string, params?: unknown): Promise<T> {
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: (v) => resolve(v as T), reject });
      this.send({ jsonrpc: "2.0", id, method, params }).catch((err) => {
        this.pending.delete(id);
        reject(new AcpError(-32000, errorMessage(err)));
      });
    });
  }

  notify(method: string, params?: unknown): Promise<void> {
    return this.send({ jsonrpc: "2.0", method, params });
  }

  private send(message: JsonRpcMessage): Promise<void> {
    if (this.closed || !sg) return Promise.reject(new Error("The connection closed."));
    return sg.agent.send(message);
  }

  private failAllPending(reason: string) {
    for (const [, p] of this.pending) p.reject(new AcpError(-32000, reason));
    this.pending.clear();
  }

  private async handleIncoming(msg: JsonRpcMessage) {
    const hasId = msg.id !== undefined && msg.id !== null;
    const method = typeof msg.method === "string" ? msg.method : null;

    // a request from the agent
    if (hasId && method) {
      let reply: JsonRpcMessage;
      try {
        reply = { jsonrpc: "2.0", id: msg.id, result: (await this.handlers.onRequest(method, msg.params)) ?? null };
      } catch (err) {
        const e = err instanceof AcpError ? err : new AcpError(-32603, errorMessage(err));
        reply = { jsonrpc: "2.0", id: msg.id, error: { code: e.code, message: e.message, data: e.data } };
      }
      await this.send(reply).catch(() => undefined);
      return;
    }
    // a response to one of ours
    if (hasId) {
      const p = this.pending.get(msg.id as number);
      if (!p) return;
      this.pending.delete(msg.id as number);
      if (msg.error) p.reject(new AcpError(msg.error.code, msg.error.message, msg.error.data));
      else p.resolve(msg.result);
      return;
    }
    if (method) this.handlers.onNotification(method, msg.params);
  }
}

/** IPC errors arrive as `Error invoking remote method 'x': Error: message`; keep the tail. */
export function errorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  return raw.replace(/^Error invoking remote method '[^']+': (Error: )?/, "");
}

// The contract between the renderer and the main process. One place, imported by both sides.
export type AppInfo = { version: string; platform: "darwin" | "win32" | "linux" | string; arch: string; electron: string };

export type CfAccount = { id: string; name: string };

/** Where the app stands with Cloudflare, as the Home screen shows it. */
export type CloudflareStatus =
  /** No wrangler binary next to the app: nothing can run. */
  | { state: "no-wrangler"; detail: string }
  /** wrangler has no login on this machine, or its token no longer works. */
  | { state: "logged-out"; detail?: string }
  /** A working token. `accountId` and `prefix` say which account and which install the app manages. */
  | { state: "connected"; email: string | null; accounts: CfAccount[]; accountId: string; prefix: string };

/** A workspace as read back from its Worker's bindings: what the account itself knows, no directory needed. */
export type WorkspaceSummary = {
  id: string;
  name: string;
  url: string;
  worker: string;
  version: string | null;
  apps: { app: string; name: string; admin: boolean; api: boolean; public?: string; nav?: { label: string; path: string }[] }[];
};

export type AgentStatus = { name: string; available: boolean; authDetected: boolean; authHint: string };
/** One JSON-RPC 2.0 message to or from the agent. The renderer owns the protocol; main only relays it. */
export type JsonRpcMessage = { jsonrpc?: string; id?: number | string | null; method?: string; params?: unknown; result?: unknown; error?: { code: number; message: string; data?: unknown } };

export type Bridge = {
  /** Version and platform of the running app. */
  info(): Promise<AppInfo>;
  /** Opens a URL in the user's default browser (sites, the Cloudflare dashboard). */
  openExternal(url: string): Promise<void>;
  cloudflare: {
    status(): Promise<CloudflareStatus>;
    /** Runs `wrangler login`, which opens the browser. Resolves with the status once it finishes. */
    login(): Promise<CloudflareStatus>;
    /** Picks the account and the install prefix this app manages. */
    select(opts: { accountId?: string; prefix?: string }): Promise<CloudflareStatus>;
  };
  workspaces: {
    /** The workspaces in the selected account under the selected prefix. */
    list(): Promise<WorkspaceSummary[]>;
  };
  /** The coding agent: a child process speaking ACP, relayed line by line. */
  agent: {
    status(): Promise<AgentStatus>;
    start(): Promise<void>;
    stop(): Promise<void>;
    send(message: JsonRpcMessage): Promise<void>;
    /** The folder a workspace's sessions run in. */
    workspaceDir(id: string): Promise<string>;
    /** Each returns its unsubscribe. */
    onMessage(cb: (message: JsonRpcMessage) => void): () => void;
    onLog(cb: (line: string) => void): () => void;
    onExit(cb: (code: number | null) => void): () => void;
  };
};

// Channel names, so a typo fails in one place.
export const channels = {
  info: "sg:info",
  openExternal: "sg:open-external",
  cfStatus: "sg:cloudflare:status",
  cfLogin: "sg:cloudflare:login",
  cfSelect: "sg:cloudflare:select",
  wsList: "sg:workspaces:list",
  agentStatus: "sg:agent:status",
  agentStart: "sg:agent:start",
  agentStop: "sg:agent:stop",
  agentSend: "sg:agent:send",
  agentDir: "sg:agent:workspace-dir",
  agentMessage: "sg:agent:message",
  agentLog: "sg:agent:log",
  agentExit: "sg:agent:exit",
} as const;

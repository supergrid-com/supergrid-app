// The contract between the renderer and the main process. One place, imported by both sides.
export type AppInfo = { version: string; platform: "darwin" | "win32" | "linux" | string; arch: string; electron: string };

export type CfAccount = { id: string; name: string };

/** Where the app stands with Cloudflare, as the Home screen shows it (app/CONNECT.md). */
export type CloudflareStatus =
  /** No token on this machine, or the one it had no longer works. */
  | { state: "logged-out"; detail?: string }
  /** Logged in, but the account would not let the app mint its token: `link` opens the dashboard's token form filled in with `permissions`. */
  | { state: "needs-token"; email: string | null; accounts: CfAccount[]; accountId: string; detail: string; link: string; permissions: string[] }
  /** A working token. `accountId` and `prefix` say which account and which install the app manages; `token.minted` when connect made it. */
  | { state: "connected"; email: string | null; accounts: CfAccount[]; accountId: string; prefix: string; token: { name: string; minted: boolean; /** Permissions a minted token could not carry (no OAuth scope exists for them). */ without: string[] } };

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
/** An MCP server for an ACP session, in ACP's stdio shape. */
export type McpServerConfig = { name: string; command: string; args: string[]; env: { name: string; value: string }[] };
/** One JSON-RPC 2.0 message to or from the agent. The renderer owns the protocol; main only relays it. */
export type JsonRpcMessage = { jsonrpc?: string; id?: number | string | null; method?: string; params?: unknown; result?: unknown; error?: { code: number; message: string; data?: unknown } };

export type Bridge = {
  /** Version and platform of the running app. */
  info(): Promise<AppInfo>;
  /** Opens a URL in the user's default browser (sites, the Cloudflare dashboard). */
  openExternal(url: string): Promise<void>;
  cloudflare: {
    status(): Promise<CloudflareStatus>;
    /** Opens Cloudflare in the browser, then mints the app's API token for the account. Resolves with the status once it finishes. */
    login(): Promise<CloudflareStatus>;
    /** The fallback when minting is not allowed: a token the user made from the template link. */
    setToken(token: string): Promise<CloudflareStatus>;
    /** Forgets the stored token for the selected account. */
    disconnect(): Promise<CloudflareStatus>;
    /** Picks the account and the install prefix this app manages. */
    select(opts: { accountId?: string; prefix?: string }): Promise<CloudflareStatus>;
  };
  workspaces: {
    /** The workspaces in the selected account under the selected prefix. */
    list(): Promise<WorkspaceSummary[]>;
  };
  /** A workspace's RPC surface (`/_ws/rpc`), called with its token from the main process. */
  ws: {
    rpc(wsId: string, method: string, args: unknown[]): Promise<unknown>;
    /** Forgets the stored token so the next call mints a new one. */
    resetToken(wsId: string): Promise<void>;
    /** Writes the Images/Stream/Analytics token (and the account id) as the workspace Worker's secrets, for assets. */
    /** Gives a workspace its media token: one minted for it, the app's own, or `token` when the user pastes one. */
    setMediaToken(wsId: string, token?: string): Promise<void>;
  };
  /** The coding agent: a child process speaking ACP, relayed line by line. */
  agent: {
    status(): Promise<AgentStatus>;
    start(): Promise<void>;
    stop(): Promise<void>;
    send(message: JsonRpcMessage): Promise<void>;
    /** The folder a workspace's sessions run in. */
    workspaceDir(id: string): Promise<string>;
    /** The MCP servers a session for this workspace gets (src/main/mcp.ts with the workspace's connection). */
    mcpServers(id: string): Promise<McpServerConfig[]>;
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
  cfSetToken: "sg:cloudflare:set-token",
  cfDisconnect: "sg:cloudflare:disconnect",
  cfSelect: "sg:cloudflare:select",
  wsList: "sg:workspaces:list",
  wsRpc: "sg:ws:rpc",
  wsResetToken: "sg:ws:reset-token",
  wsMediaToken: "sg:ws:media-token",
  agentStatus: "sg:agent:status",
  agentStart: "sg:agent:start",
  agentStop: "sg:agent:stop",
  agentSend: "sg:agent:send",
  agentDir: "sg:agent:workspace-dir",
  agentMcp: "sg:agent:mcp-servers",
  agentMessage: "sg:agent:message",
  agentLog: "sg:agent:log",
  agentExit: "sg:agent:exit",
} as const;

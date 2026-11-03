// The contract between the renderer and the main process. One place, imported by both sides.
export type AppInfo = { version: string; platform: "darwin" | "win32" | "linux" | string; arch: string; electron: string };

export type CfAccount = { id: string; name: string };

/** An organization, kept on this Mac: a name for a set of workspaces on one Cloudflare account. */
export type CloudflareLink = { accountId: string; accountName: string; email: string | null; prefix: string };
export type Org = { id: string; name: string; slug: string; createdAt: string; cloudflare: CloudflareLink | null; /** The workspace opened last, reopened on launch. */ lastWorkspace?: string; /** Each workspace's accent color, by workspace id (renderer lib/accent.ts). */ accents?: Record<string, string>; /** Which side of the page each workspace's agent panel sits on, by workspace id; left when unset (renderer lib/chat-side.ts). */ chatSides?: Record<string, "left" | "right"> };
/** What the app keeps between runs about the user's organizations (src/main/config.ts). */
export type LocalState = { orgs: Org[]; currentOrg: string | null };

/** Where the app stands with Cloudflare, as the Home screen shows it (app/CONNECT.md). */
export type CloudflareStatus =
  /** No token on this machine, or the one it had no longer works. */
  | { state: "logged-out"; detail?: string }
  /** Logged in, but the account would not let the app mint its token: `link` opens the dashboard's token form filled in with `permissions`. */
  | { state: "needs-token"; email: string | null; accounts: CfAccount[]; accountId: string; detail: string; link: string; permissions: string[] }
  /** A working token. `accountId` and `prefix` say which account and which install the app manages; `token.minted` when connect made it. */
  | { state: "connected"; email: string | null; accounts: CfAccount[]; accountId: string; prefix: string; token: { name: string; minted: boolean; /** Permissions a minted token could not carry (no OAuth scope exists for them). */ without: string[] } };

/** The cf CLI on this Mac and its login, from `cf --version` and `cf auth whoami` (src/main/cf-cli.ts). */
export type CfCliStatus =
  /** `searched` lists the folders and the shell lookup that came up empty. */
  | { state: "no-cli"; searched: string[] }
  | { state: "signed-out"; path: string; version: string | null; detail?: string }
  | {
      state: "signed-in";
      path: string;
      version: string | null;
      email: string | null;
      accounts: CfAccount[];
      /** The OAuth scopes of cf's login; null when it signs in with CLOUDFLARE_API_TOKEN instead. */
      scopes: string[] | null;
      tokenValid: boolean;
      authSource: string | null;
    };

import type { AppManifest, NavItem, ServedManifest } from "@supergrid/app-kit/manifest";
import type { PackageGraph } from "@supergrid/app-kit/packages";
export type { AppManifest, NavItem, PackageGraph, ServedManifest };

/** An installed app as the workspace's ROUTES binding records it: the manifest's route summary. */
export type InstalledApp = { app: string; name: string; version?: string; icon?: string; color?: string; admin: boolean; api: boolean; operations?: boolean; public?: string; home?: string; nav?: NavItem[]; subscribes?: string[]; entities?: string[] };

/** A workspace as read back from its Worker's bindings: what the account itself knows, no directory needed. */
export type WorkspaceSummary = {
  id: string;
  name: string;
  url: string;
  worker: string;
  version: string | null;
  apps: InstalledApp[];
};

// ---- Apps on this Mac: the folders under the workspace's own folder, one app each (src/main/apps.ts) ----

/** An app folder on disk, with its manifest and whether it is installed in the workspace. */
export type LocalApp = { dir: string; manifest: AppManifest; problems: string[]; installed: boolean; /** The installed version, when it differs from the folder's. */ installedVersion?: string | null };
export type NewAppInput = { id: string; name: string; /** The public prefix; null for admin-only; absent for `/<id>`. */ mount?: string | null; description?: string; color?: string; icon?: string };
export type FileEntry = { name: string; path: string; kind: "file" | "dir"; size?: number };
export type DevServerStatus = { running: boolean; pid?: number; port?: number; url?: string; startedAt?: string };
export type DevLogLine = { wsId: string; app: string; stream: "out" | "err" | "sys"; line: string; at: string };
export type GitCommit = { hash: string; short: string; date: string; author: string; message: string };
export type GitStatus = { branch: string | null; changed: number; ahead: number; behind: number; remote: string | null; commits: GitCommit[] };
/** A step of an install or deploy as it starts, then `done`; `error` when it stopped. */
export type AppDeployProgress = { wsId: string; app: string; step: "build" | "upload" | "route" | "done"; detail?: string; error?: string };

/** A provisioning step as it starts: `release` (verify and download), the steps of provisionWorkspace, then `done`. */
export type WorkspaceProgress = { id: string; step: "release" | "database" | "queues" | "files" | "media" | "worker" | "wiring" | "url" | "health" | "done" };
/** What creating a workspace made. `queues`, `files` and `media` are false or null when the account didn't allow them. */
export type WorkspaceCreated = { id: string; name: string; worker: string; url: string; version: string; queues: boolean; files: boolean; media: "minted" | "shared" | null };

/** Which workspace database a D1 call is for: the account and the workspace Worker whose DB binding names it. */
export type D1Target = { accountId: string; worker: string };
export type D1Meta = { duration: number; changes: number; last_row_id: number; rows_read: number; rows_written: number; size_after: number };
/** One statement's rows as objects, one per row, keyed by column. */
export type D1Result = { results: Record<string, unknown>[]; meta: D1Meta };
/** One statement's rows as arrays, with the columns in the order the query named them. `statements` counts the statements run. */
export type D1RawResult = { columns: string[]; rows: unknown[][]; meta: D1Meta; statements: number; /** Every statement's answer, in order. */ all: { columns: string[]; rows: unknown[][] }[] };
export type D1Database = { id: string; name: string; tables: number; size: number; createdAt: string | null; accountId: string };
export type D1ExportResult = { filename: string; bookmark: string };


// ---- Library: the account's Images and Stream, and the workspace's R2 bucket, straight from the Cloudflare API on cf's login (src/main/library.ts) ----

/** A picture in Cloudflare Images. `base` is its delivery URL without a variant: `https://imagedelivery.net/<hash>/<id>`. */
export type LibraryImage = { id: string; filename: string; uploaded: string; requireSignedURLs: boolean; meta: Record<string, unknown>; base: string | null };
/** What the account holds in Images. `enabled` is false until Images is turned on in the dashboard (uploads are refused until then). */
export type ImagesListing = { enabled: boolean; hash: string | null; /** Whether `w=,h=,fit=` URLs work; switched on at the first upload. */ flexible: boolean; current: number; allowed: number; images: LibraryImage[] };

/** A video or audio in Cloudflare Stream. URLs are null until it is ready. */
export type LibraryVideo = {
  uid: string;
  name: string;
  created: string;
  modified: string;
  size: number;
  duration: number;
  state: "pendingupload" | "downloading" | "queued" | "inprogress" | "ready" | "error" | string;
  pctComplete: number;
  error: string | null;
  readyToStream: boolean;
  thumbnail: string | null;
  preview: string | null;
  hls: string | null;
  dash: string | null;
  width: number | null;
  height: number | null;
  requireSignedURLs: boolean;
  meta: Record<string, string>;
};
/** `enabled` is false until Stream has storage on the account; `customer` is the `customer-<code>` host the player and the URLs use. */
export type StreamListing = { enabled: boolean; customer: string | null; videoCount: number; minutes: number; minutesLimit: number; videos: LibraryVideo[] };
export type StreamAnalyticsRow = { key: string | null; minutes: number; views: number };

/** An object in the workspace's R2 bucket, as the API lists it. */
export type LibraryFile = { key: string; size: number; etag: string; modified: string; contentType: string | null };
export type FilesListing = { files: LibraryFile[]; /** True when the bucket holds more than the pages read. */ more: boolean };

/** A file on this Mac, from the picker or a drop. */
export type LocalFile = { path: string; name: string; size: number; type?: string | null };
/** An upload as it goes: `job` is the id the renderer gave it. */
export type UploadProgress = { job: string; loaded: number; total: number; status: "uploading" | "done" | "error"; error?: string };

import type { AgentAnswer, AgentAsk, AgentNavigateEvent, AgentWidgetEvent, AppContext } from "./agent";
export type { AgentAnswer, AgentAsk, AgentNavigateEvent, AgentWidget, AgentWidgetEvent, AppContext, AskInput, UploadedItem } from "./agent";

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
  /** The organizations, kept in the app's config file so they survive restarts. */
  state: {
    read(): Promise<LocalState>;
    write(patch: Partial<LocalState>): Promise<void>;
  };
  /** The cf CLI on this Mac: the app signs in through it and holds no token itself. */
  cf: {
    /** `refresh` looks for the cf binary again, after the user installs it. */
    status(refresh?: boolean): Promise<CfCliStatus>;
    /** Runs `cf auth login` (opens the browser) and resolves once it finishes. */
    login(): Promise<CfCliStatus>;
    logout(): Promise<CfCliStatus>;
  };
  workspaces: {
    /** The `<prefix>-ws-*` workspaces in the account, read from their Workers. Runs on cf's login. */
    list(accountId: string, prefix: string): Promise<WorkspaceSummary[]>;
    /** The workspace release a new workspace gets, from the signed feed. */
    release(): Promise<{ version: string; notes: string; publishedAt: string }>;
    /** A workspace id not yet used in the account under this prefix. */
    freshId(accountId: string, prefix: string): Promise<string>;
    /** Creates a workspace in the account; progress arrives through onProgress. */
    create(opts: { accountId: string; prefix: string; id: string; name: string }): Promise<WorkspaceCreated>;
    /** Returns its unsubscribe. */
    onProgress(cb: (p: WorkspaceProgress) => void): () => void;
  };
  /** A workspace's RPC surface (`/_ws/rpc`), called with its token from the main process. */
  ws: {
    rpc(wsId: string, method: string, args: unknown[]): Promise<unknown>;
    /** The URL that opens an app's admin screen signed in: the workspace's handoff with a token minted here. `next` is relative to /admin/<app>. */
    adminUrl(wsId: string, app: string, next?: string): Promise<string>;
    /** An installed app's served manifest (/_app/<id>/manifest.json): data, operations, nav as the running code reports them. */
    appManifest(wsId: string, app: string): Promise<ServedManifest>;
    /** Runs one of an app's operations through its REST route with the workspace's token (an owner). */
    appCall(wsId: string, app: string, operation: string, input: unknown): Promise<unknown>;
    /** Forgets the stored token so the next call mints a new one. */
    resetToken(wsId: string): Promise<void>;
    /** Writes the Images/Stream/Analytics token (and the account id) as the workspace Worker's secrets, for assets. */
    /** Gives a workspace its media token: one minted for it, the app's own, or `token` when the user pastes one. */
    setMediaToken(wsId: string, token?: string): Promise<void>;
  };
  /** The workspace's D1, through Cloudflare's D1 API on cf's login (src/main/d1.ts). */
  d1: {
    /** Runs one statement; rows as objects. `params` bind to its ? placeholders. */
    query(target: D1Target, sql: string, params?: unknown[]): Promise<D1Result>;
    /** Runs a statement or a script of them; the last one's columns and rows as arrays. */
    raw(target: D1Target, sql: string, params?: unknown[]): Promise<D1RawResult>;
    info(target: D1Target): Promise<D1Database>;
    /** The Time Travel bookmark for now, or for a moment (ISO-8601) in the last 30 days. */
    bookmark(target: D1Target, timestamp?: string): Promise<string>;
    /** Restores the database to a bookmark or a moment. Everything after it is gone. */
    restore(target: D1Target, to: { bookmark?: string; timestamp?: string }): Promise<string>;
    /** Makes a SQL dump and opens it in the browser to download. Waits for Cloudflare to write it. */
    export(target: D1Target): Promise<D1ExportResult>;
  };
  /** The Library pages: Images and Stream in the account, files in the workspace's bucket. Uploads report through onProgress under the job id the call names. */
  library: {
    /** The native file picker. */
    pick(opts: { kind: "image" | "media" | "file" | "any"; multiple?: boolean }): Promise<LocalFile[]>;
    /** The path of a File dropped on the window. */
    pathOf(file: File): string;
    cancel(job: string): Promise<void>;
    onProgress(cb: (p: UploadProgress) => void): () => void;
    images: {
      list(accountId: string): Promise<ImagesListing>;
      upload(accountId: string, job: string, file: LocalFile, meta: Record<string, unknown>): Promise<LibraryImage>;
      update(accountId: string, id: string, meta: Record<string, unknown>): Promise<LibraryImage>;
      remove(accountId: string, ids: string[]): Promise<void>;
    };
    stream: {
      list(accountId: string): Promise<StreamListing>;
      get(accountId: string, uid: string): Promise<LibraryVideo>;
      /** A resumable (tus) upload from disk, any size. */
      upload(accountId: string, job: string, file: LocalFile, opts: { name: string; meta: Record<string, string> }): Promise<LibraryVideo>;
      update(accountId: string, uid: string, opts: { name?: string; meta?: Record<string, string> }): Promise<LibraryVideo>;
      remove(accountId: string, uids: string[]): Promise<void>;
      /** Minutes viewed and plays from Stream's bulk analytics, over the last `days` (up to 31), for one video or all. */
      analytics(accountId: string, opts: { days: number; uid?: string; groupBy: "uid" | "day" | "country" }): Promise<StreamAnalyticsRow[]>;
    };
    files: {
      list(accountId: string, bucket: string, opts?: { prefix?: string }): Promise<FilesListing>;
      upload(accountId: string, job: string, bucket: string, file: LocalFile, opts: { key: string; contentType?: string }): Promise<LibraryFile>;
      remove(accountId: string, bucket: string, keys: string[]): Promise<void>;
      /** Downloads one object to a place the user picks. False when they cancel. */
      save(accountId: string, bucket: string, key: string): Promise<boolean>;
    };
  };
  /** The apps on this Mac for a workspace: folders made from the template, run, built and installed from here. */
  apps: {
    /** Every app folder under the workspace's folder, with whether it is installed. */
    list(wsId: string): Promise<LocalApp[]>;
    /** The folder a workspace's apps live in. */
    dir(wsId: string): Promise<string>;
    /** A new app from the template, in the workspace's folder, with its dependencies installed. */
    create(wsId: string, input: NewAppInput): Promise<LocalApp>;
    /** Reveals the app's folder in the Finder. */
    reveal(wsId: string, app: string): Promise<void>;
    /** The files of an app folder (one level), or a file's text. */
    files(wsId: string, app: string, path?: string): Promise<FileEntry[]>;
    read(wsId: string, app: string, path: string): Promise<{ text: string; size: number; truncated: boolean }>;
    /** Builds the app and installs it into the workspace (or redeploys it); progress arrives through onDeploy. */
    install(wsId: string, app: string): Promise<InstalledApp>;
    /** Takes the app out of the workspace's routes and deletes its Worker; the folder and the tables stay. */
    uninstall(wsId: string, app: string): Promise<void>;
    onDeploy(cb: (p: AppDeployProgress) => void): () => void;
    /** The app's dev server (`pnpm dev`), one per app. */
    devStatus(wsId: string, app: string): Promise<DevServerStatus>;
    devStart(wsId: string, app: string): Promise<DevServerStatus>;
    devStop(wsId: string, app: string): Promise<DevServerStatus>;
    devLog(wsId: string, app: string): Promise<DevLogLine[]>;
    onDevLog(cb: (line: DevLogLine) => void): () => void;
    /** The app folder's git: the branch, the change count and the latest commits. */
    git(wsId: string, app: string): Promise<GitStatus>;
    /** Which apps export packages, which use them, and which are behind (manifest `packages`). */
    packages(wsId: string): Promise<PackageGraph>;
  };
  /** The coding agent: a child process speaking ACP, relayed line by line. */
  agent: {
    status(): Promise<AgentStatus>;
    start(): Promise<void>;
    stop(): Promise<void>;
    send(message: JsonRpcMessage): Promise<void>;
    /** The folder a workspace's sessions run in. */
    workspaceDir(id: string): Promise<string>;
    /**
     * The MCP servers a session for this workspace gets: our stdio proxy (src/main/mcp.ts) back to the
     * app's tool bridge (src/main/agent-bridge.ts). `client` names the session to the bridge, so a tool's
     * questions and widgets reach the right thread; make one per session.
     */
    mcpServers(id: string, client: string): Promise<McpServerConfig[]>;
    /** Tells the bridge which agent session a client is, and whether its thread is in Dev mode. */
    bindClient(client: string, opts: { sessionId: string | null; dev: boolean }): Promise<void>;
    /** What is open in the app for this workspace, kept current for the agent's tools. */
    setContext(wsId: string, context: AppContext): Promise<void>;
    /** The user's answer to a tool's question. */
    answer(answer: AgentAnswer): Promise<void>;
    /** Each returns its unsubscribe. */
    onMessage(cb: (message: JsonRpcMessage) => void): () => void;
    onLog(cb: (line: string) => void): () => void;
    onExit(cb: (code: number | null) => void): () => void;
    onAsk(cb: (ask: AgentAsk) => void): () => void;
    onWidget(cb: (event: AgentWidgetEvent) => void): () => void;
    onNavigate(cb: (event: AgentNavigateEvent) => void): () => void;
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
  stateRead: "sg:state:read",
  stateWrite: "sg:state:write",
  cfCliStatus: "sg:cf:status",
  cfCliLogin: "sg:cf:login",
  cfCliLogout: "sg:cf:logout",
  wsList: "sg:workspaces:list",
  wsRelease: "sg:workspaces:release",
  wsFreshId: "sg:workspaces:fresh-id",
  wsCreate: "sg:workspaces:create",
  wsProgress: "sg:workspaces:progress",
  wsRpc: "sg:ws:rpc",
  wsResetToken: "sg:ws:reset-token",
  wsMediaToken: "sg:ws:media-token",
  wsAdminUrl: "sg:ws:admin-url",
  wsAppManifest: "sg:ws:app-manifest",
  wsAppCall: "sg:ws:app-call",
  appsList: "sg:apps:list",
  appsDir: "sg:apps:dir",
  appsCreate: "sg:apps:create",
  appsReveal: "sg:apps:reveal",
  appsFiles: "sg:apps:files",
  appsRead: "sg:apps:read",
  appsInstall: "sg:apps:install",
  appsUninstall: "sg:apps:uninstall",
  appsDeploy: "sg:apps:deploy",
  appsDevStatus: "sg:apps:dev-status",
  appsDevStart: "sg:apps:dev-start",
  appsDevStop: "sg:apps:dev-stop",
  appsDevLog: "sg:apps:dev-log",
  appsDevLogLine: "sg:apps:dev-log-line",
  appsGit: "sg:apps:git",
  appsPackages: "sg:apps:packages",
  d1Query: "sg:d1:query",
  d1Raw: "sg:d1:raw",
  d1Info: "sg:d1:info",
  d1Bookmark: "sg:d1:bookmark",
  d1Restore: "sg:d1:restore",
  d1Export: "sg:d1:export",
  libPick: "sg:library:pick",
  libCancel: "sg:library:cancel",
  libProgress: "sg:library:progress",
  libImagesList: "sg:library:images:list",
  libImagesUpload: "sg:library:images:upload",
  libImagesUpdate: "sg:library:images:update",
  libImagesRemove: "sg:library:images:remove",
  libStreamList: "sg:library:stream:list",
  libStreamGet: "sg:library:stream:get",
  libStreamUpload: "sg:library:stream:upload",
  libStreamUpdate: "sg:library:stream:update",
  libStreamRemove: "sg:library:stream:remove",
  libStreamAnalytics: "sg:library:stream:analytics",
  libFilesList: "sg:library:files:list",
  libFilesUpload: "sg:library:files:upload",
  libFilesRemove: "sg:library:files:remove",
  libFilesSave: "sg:library:files:save",
  agentStatus: "sg:agent:status",
  agentStart: "sg:agent:start",
  agentStop: "sg:agent:stop",
  agentSend: "sg:agent:send",
  agentDir: "sg:agent:workspace-dir",
  agentMcp: "sg:agent:mcp-servers",
  agentMessage: "sg:agent:message",
  agentLog: "sg:agent:log",
  agentExit: "sg:agent:exit",
  agentBind: "sg:agent:bind",
  agentContext: "sg:agent:context",
  agentAnswer: "sg:agent:answer",
  agentAsk: "sg:agent:ask",
  agentWidget: "sg:agent:widget",
  agentNavigate: "sg:agent:navigate",
} as const;

import * as React from "react";
import type { AgentAnswer, AgentAsk, AgentNavigateEvent, AgentWidget, AgentWidgetEvent, AppContext, McpServerConfig } from "../../../../shared/bridge";
import { CONTEXT_URI } from "../../../../shared/agent";
import { PROTOCOL_VERSION, type ContentBlock, type InitializeResult, type NewSessionResult, type RequestPermissionOutcome, type RequestPermissionParams, type SessionConfigOption, type SessionUpdate } from "../../../../shared/acp";
import { isDesktop, sg } from "~/lib/bridge";
import { currentMode, setMode } from "~/lib/mode";
import { AcpConnection, AcpError, errorMessage } from "./connection";
import { sessionChoices, type Choice } from "./session";
import { applyUpdate, nextId, restoreWidgets, textOf, userMessage, withNotice, withoutContext, withWidget, type ChatMessage } from "./transcript";

// The coding agent and its threads. One Muse Code process for the whole app, speaking ACP; each
// thread is one of its sessions, run in the workspace's folder (main's workspaceDir), so Muse's own
// `session/list` is the thread list and `session/load` reopens a thread with its history. Threads
// run side by side: a turn keeps going in the background while another thread is open.
//
// Each session also gets the app's MCP server (src/main/mcp.ts), named by a client id made here,
// so a tool's questions (asks), cards (widgets) and page changes come back to the thread that
// called it. Every prompt carries a context resource saying where the user is (lib/agent/context.ts).
//
// The store lives at the app root, outside React, so a turn survives closing the panel or moving
// between workspaces; components read it through useAgent and useThreads.

export type AgentState = "idle" | "starting" | "auth_required" | "authenticating" | "ready" | "error" | "exited";
export type PendingPermission = { params: RequestPermissionParams; respond: (outcome: RequestPermissionOutcome) => void };
/** A question one of our tools put to the user; `respond` answers it and clears it. */
export type PendingAsk = { ask: AgentAsk; respond: (answer: Omit<AgentAnswer, "id">) => void };
export type Usage = { used: number; size: number; cost: number | null };

/**
 * Where a thread stands, as the rail shows it:
 * - working: a turn is running in it
 * - needs-input: it stopped to ask for permission
 * - done: a turn finished while it wasn't open
 * - failed: its last turn stopped on an error
 * - idle: nothing new
 */
export type ThreadStatus = "working" | "needs-input" | "done" | "failed" | "idle";

type Settings = Omit<NewSessionResult, "sessionId">;

export type Thread = {
  /** The agent's session id. */
  id: string;
  wsId: string;
  /** The id this run gave the session's MCP server, so its tools' events find this thread. */
  client: string;
  title: string | null;
  updatedAt: string;
  messages: ChatMessage[];
  /** Made or loaded in the running agent, so it can take a prompt. */
  live: boolean;
  /** Replaying its history (`session/load`). */
  loading: boolean;
  busy: boolean;
  /** A turn finished while another thread was open. */
  unseen: boolean;
  /** Why the last turn or the load failed. */
  error: string | null;
  permission: PendingPermission | null;
  ask: PendingAsk | null;
  usage: Usage | null;
  settings: Settings | null;
};

export type ThreadSummary = { id: string; title: string; updatedAt: string; status: ThreadStatus };

type Listed = { sessionId: string; cwd: string; title?: string | null; updatedAt?: string | null };

/** Agents report a missing login in a few ways; treat them all as "needs a login". */
function isAuthError(err: unknown): boolean {
  if (!(err instanceof AcpError)) return false;
  const kind = (err.data as { errorKind?: string } | undefined)?.errorKind;
  return kind === "authentication_failed" || /authenticat|api key|log ?in|not logged|credential/i.test(err.message);
}

export function statusOf(t: Pick<Thread, "permission" | "ask" | "busy" | "error" | "unseen">): ThreadStatus {
  if (t.permission || t.ask) return "needs-input";
  if (t.busy) return "working";
  if (t.error) return "failed";
  if (t.unseen) return "done";
  return "idle";
}

/** The agent's name for the thread, else its first question. */
/** A title as Muse makes it, from the whole prompt: without the context block the app adds to each one (contextBlock). */
export function cleanTitle(title: string | null | undefined): string | null {
  const t = title && withoutContext(title).replace(/\s*```resource\b[\s\S]*$/, "").trim();
  return t || null;
}

export function titleOf(t: Thread | undefined): string {
  const first = t?.messages.find((m) => m.role === "user");
  return t?.title ?? (first ? textOf(first).slice(0, 80) : "New thread");
}

const blank = (id: string, wsId: string): Thread => ({ id, wsId, client: "", title: null, updatedAt: new Date().toISOString(), messages: [], live: false, loading: false, busy: false, unseen: false, error: null, permission: null, ask: null, usage: null, settings: null });

// ---- the cards a tool drew, kept per session so a reopened thread shows them again ----

const WIDGETS_MAX = 60;
const WIDGET_MAX_BYTES = 48 * 1024;
type SavedWidget = { tool: string; widget: AgentWidget };

function savedWidgets(sessionId: string): SavedWidget[] {
  try {
    const raw = localStorage.getItem(`sg.widgets.${sessionId}`);
    return raw ? (JSON.parse(raw) as SavedWidget[]) : [];
  } catch {
    return [];
  }
}

function saveWidget(sessionId: string, entry: SavedWidget): void {
  const text = JSON.stringify(entry);
  if (text.length > WIDGET_MAX_BYTES) return;
  try {
    const list = [...savedWidgets(sessionId), entry].slice(-WIDGETS_MAX);
    localStorage.setItem(`sg.widgets.${sessionId}`, JSON.stringify(list));
  } catch {}
}

// The effort a new thread starts at: the one last picked in the composer, kept on this Mac.
const DEFAULT_EFFORT = "medium";
const EFFORT_KEY = "sg.agent.effort";

function readEffort(): string | null {
  try {
    return localStorage.getItem(EFFORT_KEY);
  } catch {
    return null;
  }
}

function writeEffort(value: string): void {
  try {
    localStorage.setItem(EFFORT_KEY, value);
  } catch {}
}

export class AgentStore {
  state: AgentState = "idle";
  detail: string | null = null;
  authMethods: { id: string; name: string }[] = [];
  readonly threads = new Map<string, Thread>();
  /** Per workspace: the sessions the agent keeps for its folder, newest first. */
  readonly listed = new Map<string, Listed[]>();
  /** The thread open in the panel; a turn finishing anywhere else marks its thread unseen. */
  private viewing: string | null = null;
  /** Per workspace: the empty thread "New thread" reuses rather than making another. */
  private drafts = new Map<string, string>();
  private creating = new Map<string, Promise<string>>();
  private conn: AcpConnection | null = null;
  private connecting: Promise<AcpConnection> | null = null;
  private dirs = new Map<string, string>();
  /** Whether the agent takes resource blocks in a prompt; the context rides as text otherwise. */
  private embeddedContext = true;
  /** Per workspace: where the user is, as the shell keeps it (lib/agent/context.ts). */
  private contexts = new Map<string, AppContext>();
  /** Session id by the client id its MCP server was given. */
  private sessions = new Map<string, string>();
  /** Widgets that arrived before the tool_call they belong to, per session. */
  private lateWidgets = new Map<string, SavedWidget[]>();
  private unsubscribe: (() => void)[] = [];
  /** The shell's way to move the app when a tool asks (app_navigate). */
  onNavigate: ((event: AgentNavigateEvent) => void) | null = null;

  /**
   * Listens to the bridge for the tools' asks, widgets and navigations. Called from the provider's effect, not the
   * constructor: React's StrictMode builds the store twice in development and keeps one, and a listener on the orphan
   * would answer every ask first, with "the thread is not open".
   */
  attach(): void {
    if (!sg || this.unsubscribe.length) return;
    this.unsubscribe.push(
      sg.agent.onAsk((ask) => this.onAsk(ask)),
      sg.agent.onWidget((e) => this.onWidget(e)),
      sg.agent.onNavigate((e) => this.onNavigate?.(e)),
    );
  }

  setContext(wsId: string, context: AppContext): void {
    this.contexts.set(wsId, context);
  }

  private listeners = new Set<() => void>();
  version = 0;
  subscribe = (cb: () => void): (() => void) => {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  };
  private emit() {
    this.version++;
    for (const cb of this.listeners) cb();
  }

  private patch(id: string, fn: (t: Thread) => Partial<Thread>) {
    const t = this.threads.get(id);
    if (!t) return;
    this.threads.set(id, { ...t, ...fn(t) });
    this.emit();
  }

  private setState(state: AgentState, detail: string | null = null) {
    this.state = state;
    this.detail = detail;
    this.emit();
  }

  private async dir(wsId: string): Promise<string> {
    let dir = this.dirs.get(wsId);
    if (!dir) {
      dir = await sg!.agent.workspaceDir(wsId);
      this.dirs.set(wsId, dir);
    }
    return dir;
  }

  /** The workspace's tools for one session (src/main/mcp.ts), under a client id of its own. */
  private async mcpServers(wsId: string, client: string): Promise<McpServerConfig[]> {
    return sg!.agent.mcpServers(wsId, client).catch(() => []);
  }

  /** Ties a session to its client id on the bridge. */
  private bind(client: string, sessionId: string): void {
    this.sessions.set(client, sessionId);
    void sg?.agent.bindClient(client, { sessionId }).catch(() => undefined);
  }

  /** The thread a tool's event is for: its session (named by the bridge, or bound to the client here), else the thread open in that workspace. */
  private threadFor(client: string, wsId: string, sessionId: string | null = null): Thread | undefined {
    const id = sessionId ?? this.sessions.get(client);
    const t = id ? this.threads.get(id) : undefined;
    if (t) return t;
    const open = this.viewing ? this.threads.get(this.viewing) : undefined;
    return open?.wsId === wsId ? open : undefined;
  }

  private onAsk(ask: AgentAsk): void {
    const t = this.threadFor(ask.client, ask.wsId, ask.sessionId);
    if (!t) {
      void sg?.agent.answer({ id: ask.id, ok: false, note: "The thread is not open." });
      return;
    }
    const pending: PendingAsk = {
      ask,
      respond: (answer) => {
        this.patch(t.id, (x) => (x.ask === pending ? { ask: null } : {}));
        const send = (a: Omit<AgentAnswer, "id">) => void sg?.agent.answer({ id: ask.id, ...a });
        // a yes to Dev switches the desktop first (the dev server comes up), so the tool's next call runs in Dev
        if (ask.kind === "dev" && answer.ok) void setMode(ask.wsId, "dev").then(() => send(answer), (e: unknown) => send({ ok: false, note: `Dev could not start: ${errorMessage(e)}` }));
        else send(answer);
      },
    };
    this.patch(t.id, () => ({ ask: pending }));
  }

  private onWidget(e: AgentWidgetEvent): void {
    const t = this.threadFor(e.client, e.wsId, e.sessionId);
    if (!t) return;
    saveWidget(t.id, { tool: e.tool, widget: e.widget });
    const messages = withWidget(t.messages, e.tool, e.widget);
    if (messages !== t.messages) this.patch(t.id, () => ({ messages }));
    else this.lateWidgets.set(t.id, [...(this.lateWidgets.get(t.id) ?? []), { tool: e.tool, widget: e.widget }]);
  }

  /** The prompt's context block: where the user is and which mode the desktop is in for the workspace. */
  private contextBlock(t: Thread): ContentBlock {
    const ctx = this.contexts.get(t.wsId);
    const text = JSON.stringify(ctx ?? { mode: currentMode(t.wsId), workspace: { id: t.wsId } });
    if (this.embeddedContext) return { type: "resource", resource: { uri: CONTEXT_URI, mimeType: "application/json", text } };
    return { type: "text", text: `\n\n<app_context>${text}</app_context>` };
  }

  /** The running agent, started on first use. */
  connection(): Promise<AcpConnection> {
    if (this.conn && !this.conn.isClosed && this.state !== "starting") return Promise.resolve(this.conn);
    this.connecting ??= this.start().finally(() => {
      this.connecting = null;
    });
    return this.connecting;
  }

  private async start(): Promise<AcpConnection> {
    if (!sg) throw new AcpError(-32000, "The agent runs in the desktop app.");
    this.setState("starting");
    const conn: AcpConnection = new AcpConnection({
      onNotification: (method, params) => {
        if (method !== "session/update") return;
        const p = params as { sessionId: string; update: SessionUpdate };
        this.onUpdate(p.sessionId, p.update);
      },
      onRequest: (method, params) => {
        if (method !== "session/request_permission") return Promise.reject(new AcpError(-32601, `Not supported by this client: ${method}`));
        const p = params as RequestPermissionParams;
        return new Promise((resolve) => {
          const pending: PendingPermission = {
            params: p,
            respond: (outcome) => {
              this.patch(p.sessionId, (t) => (t.permission === pending ? { permission: null } : {}));
              resolve({ outcome });
            },
          };
          this.patch(p.sessionId, () => ({ permission: pending }));
        });
      },
      onExit: (code) => {
        if (this.conn !== conn) return;
        this.drop();
        this.setState("exited", code === null ? "The agent stopped." : `The agent stopped (exit code ${code}).`);
      },
    });
    this.conn = conn;
    try {
      const status = await sg.agent.status();
      if (!status.available) throw new AcpError(-32000, `${status.name} is not installed. ${status.authHint}`);
      await conn.start();
      const info = await conn.request<InitializeResult>("initialize", {
        protocolVersion: PROTOCOL_VERSION,
        clientCapabilities: { fs: { readTextFile: false, writeTextFile: false }, terminal: false },
        clientInfo: { name: "supergrid", title: "SuperGrid", version: (await sg.info()).version },
      });
      if (this.conn !== conn) throw new AcpError(-32000, "The connection closed.");
      this.authMethods = (info.authMethods ?? []).map((m) => ({ id: m.id, name: m.name }));
      this.embeddedContext = (info.agentCapabilities as { promptCapabilities?: { embeddedContext?: boolean } } | undefined)?.promptCapabilities?.embeddedContext !== false;
      this.setState("ready");
      return conn;
    } catch (err) {
      if (this.conn === conn) {
        this.conn = null;
        void conn.stop();
        this.setState("error", errorMessage(err));
      }
      throw err;
    }
  }

  /** Forgets everything that only lived in the agent process: sessions must be loaded again. */
  private drop() {
    this.conn = null;
    this.drafts.clear();
    this.sessions.clear();
    for (const [id, t] of this.threads) {
      t.permission?.respond({ outcome: "cancelled" });
      t.ask?.respond({ ok: false, note: "The agent stopped." });
      this.threads.set(id, { ...t, live: false, loading: false, busy: false, permission: null, ask: null });
    }
  }

  /** Runs a session call; a missing login moves the agent to auth_required. */
  private async guard<T>(run: () => Promise<T>): Promise<T> {
    try {
      return await run();
    } catch (err) {
      if (isAuthError(err) && this.authMethods.length > 0) this.setState("auth_required", errorMessage(err));
      throw err;
    }
  }

  private onUpdate(sessionId: string, update: SessionUpdate) {
    const t = this.threads.get(sessionId);
    if (!t) return;
    switch (update.sessionUpdate) {
      case "usage_update":
        return this.patch(sessionId, () => ({ usage: { used: update.used, size: update.size, cost: update.cost?.amount ?? null } }));
      case "session_info_update":
        if (update.title) this.patch(sessionId, () => ({ title: cleanTitle(update.title) }));
        return;
      case "config_option_update":
        return this.patch(sessionId, (t) => ({ settings: t.settings ? { ...t.settings, configOptions: update.configOptions } : t.settings }));
      case "current_mode_update":
        return this.patch(sessionId, (t) => ({ settings: t.settings?.modes ? { ...t.settings, modes: { ...t.settings.modes, currentModeId: update.currentModeId } } : t.settings }));
      case "available_commands_update":
        return;
      default: {
        let messages = applyUpdate(t.messages, update, t.loading ? null : Date.now());
        // a card that arrived before its call: now the call is here
        const late = this.lateWidgets.get(sessionId);
        if (late?.length && update.sessionUpdate === "tool_call") {
          const rest: SavedWidget[] = [];
          for (const w of late) {
            const next = withWidget(messages, w.tool, w.widget);
            if (next === messages) rest.push(w);
            else messages = next;
          }
          this.lateWidgets.set(sessionId, rest);
        }
        if (messages !== t.messages) this.patch(sessionId, (t) => ({ messages, updatedAt: t.loading ? t.updatedAt : new Date().toISOString() }));
      }
    }
  }

  /** Reads the workspace's threads from the agent. */
  async list(wsId: string): Promise<void> {
    const conn = await this.connection();
    const cwd = await this.dir(wsId);
    const out: Listed[] = [];
    let cursor: string | undefined;
    do {
      const res = await this.guard(() => conn.request<{ sessions: Listed[]; nextCursor?: string | null }>("session/list", { cwd, cursor }));
      out.push(...res.sessions.filter((s) => s.cwd === cwd));
      cursor = res.nextCursor ?? undefined;
    } while (cursor && out.length < 500);
    this.listed.set(wsId, out);
    this.emit();
  }

  /** An empty thread to write in: the workspace's last one if it is still empty, else a new session. */
  newThread(wsId: string): Promise<string> {
    const draft = this.drafts.get(wsId);
    const d = draft ? this.threads.get(draft) : undefined;
    if (d?.live && d.messages.length === 0 && !d.busy) return Promise.resolve(d.id);
    let pending = this.creating.get(wsId);
    if (!pending) {
      pending = (async () => {
        const conn = await this.connection();
        const client = nextId("client");
        const [cwd, mcpServers] = await Promise.all([this.dir(wsId), this.mcpServers(wsId, client)]);
        const { sessionId, ...settings } = await this.guard(() => conn.request<NewSessionResult>("session/new", { cwd, mcpServers }));
        this.threads.set(sessionId, { ...blank(sessionId, wsId), client, live: true, settings });
        this.bind(client, sessionId);
        this.drafts.set(wsId, sessionId);
        this.emit();
        await this.startingEffort(sessionId);
        return sessionId;
      })().finally(() => this.creating.delete(wsId));
      this.creating.set(wsId, pending);
    }
    return pending;
  }

  /** Shows a thread: marks it seen, and loads its history into the running agent when it isn't live. */
  async open(wsId: string, id: string): Promise<void> {
    this.viewing = id;
    const existing = this.threads.get(id);
    if (existing?.unseen) this.patch(id, () => ({ unseen: false }));
    if (existing?.live || existing?.loading) return;
    const listed = this.listed.get(wsId)?.find((s) => s.sessionId === id);
    this.threads.set(id, { ...(existing ?? blank(id, wsId)), title: existing?.title ?? cleanTitle(listed?.title), updatedAt: listed?.updatedAt ?? existing?.updatedAt ?? new Date().toISOString(), messages: [], loading: true, error: null });
    this.emit();
    try {
      const conn = await this.connection();
      const client = nextId("client");
      const [cwd, mcpServers] = await Promise.all([this.dir(wsId), this.mcpServers(wsId, client)]);
      const settings = await this.guard(() => conn.request<Settings | null>("session/load", { sessionId: id, cwd, mcpServers }));
      this.bind(client, id);
      // the replay is done once the load answers: the cards the tools drew last time go back on their calls
      this.patch(id, (t) => ({ client, live: true, loading: false, settings: settings ?? null, messages: restoreWidgets(t.messages, savedWidgets(id)) }));
    } catch (err) {
      this.patch(id, () => ({ loading: false, error: errorMessage(err) }));
    }
  }

  /** The panel closed or moved off a thread. */
  close(id: string): void {
    if (this.viewing === id) this.viewing = null;
  }

  send(id: string, text: string): void {
    const t = this.threads.get(id);
    const conn = this.conn;
    if (!t?.live || t.busy || !conn) return;
    this.patch(id, (t) => ({ messages: [...t.messages, userMessage(text)], busy: true, error: null, updatedAt: new Date().toISOString() }));
    conn
      .request<{ stopReason: string }>("session/prompt", { sessionId: id, prompt: [{ type: "text", text }, this.contextBlock(t)] })
      .then((res) => {
        this.patch(id, (t) => ({
          busy: false,
          unseen: this.viewing !== id,
          messages: res.stopReason !== "end_turn" && res.stopReason !== "cancelled" ? withNotice(t.messages, "info", `Turn stopped: ${res.stopReason}`) : t.messages,
        }));
      })
      .catch((err: unknown) => {
        const message = errorMessage(err);
        this.patch(id, (t) => ({ busy: false, unseen: this.viewing !== id, error: message, messages: withNotice(t.messages, "error", message) }));
      })
      .finally(() => {
        // Muse names the thread after its first prompt; read the list again to pick that up
        if (this.drafts.get(t.wsId) === id) this.drafts.delete(t.wsId);
        void this.list(t.wsId).catch(() => undefined);
      });
  }

  stop(id: string): void {
    const t = this.threads.get(id);
    t?.permission?.respond({ outcome: "cancelled" });
    t?.ask?.respond({ ok: false, note: "The user stopped the turn." });
    if (this.conn && t?.busy) void this.conn.notify("session/cancel", { sessionId: id }).catch(() => undefined);
  }

  /**
   * A new thread starts at the effort last picked here, else Medium. Muse's own default can be its deepest level, which
   * turns a question about the workspace's data into minutes of work.
   */
  private async startingEffort(id: string): Promise<void> {
    const t = this.threads.get(id);
    const effort = sessionChoices(t?.settings ? { sessionId: id, ...t.settings } : null).find((c) => c.category === "thought_level");
    const want = readEffort() ?? DEFAULT_EFFORT;
    if (effort && effort.current !== want && effort.options.some((o) => o.id === want)) await this.setChoice(id, effort, want, false);
  }

  async setChoice(id: string, choice: Choice, value: string, remember = true): Promise<void> {
    const conn = this.conn;
    if (!conn) return;
    if (remember && choice.category === "thought_level") writeEffort(value);
    try {
      if (choice.source === "config") {
        const res = await conn.request<{ configOptions?: SessionConfigOption[] }>("session/set_config_option", { sessionId: id, configId: choice.configId, value });
        this.patch(id, (t) => ({ settings: t.settings ? { ...t.settings, configOptions: res.configOptions ?? t.settings.configOptions } : t.settings }));
      } else if (choice.source === "models") {
        await conn.request("session/set_model", { sessionId: id, modelId: value });
        this.patch(id, (t) => ({ settings: t.settings?.models ? { ...t.settings, models: { ...t.settings.models, currentModelId: value } } : t.settings }));
      } else {
        await conn.request("session/set_mode", { sessionId: id, modeId: value });
        this.patch(id, (t) => ({ settings: t.settings?.modes ? { ...t.settings, modes: { ...t.settings.modes, currentModeId: value } } : t.settings }));
      }
    } catch (err) {
      this.patch(id, (t) => ({ messages: withNotice(t.messages, "error", `Could not change ${choice.label}: ${errorMessage(err)}`) }));
    }
  }

  async authenticate(methodId: string): Promise<void> {
    const conn = this.conn;
    if (!conn) return;
    this.setState("authenticating", "Waiting for you to finish logging in…");
    try {
      await conn.request("authenticate", { methodId });
      this.setState("ready");
    } catch (err) {
      this.setState("auth_required", errorMessage(err));
    }
  }

  /** Starts the agent again after it failed or stopped. */
  async retry(): Promise<void> {
    const conn = this.conn;
    this.drop();
    await conn?.stop();
    await this.connection().catch(() => undefined);
  }

  /** The workspace's threads, newest first: what the agent lists, plus this run's threads it doesn't list yet. */
  summaries(wsId: string): ThreadSummary[] {
    const out = new Map<string, ThreadSummary>();
    for (const s of this.listed.get(wsId) ?? []) {
      // an empty session (a New thread never written in) has no title, and isn't a thread yet
      if (!s.title) continue;
      out.set(s.sessionId, { id: s.sessionId, title: cleanTitle(s.title) ?? "New thread", updatedAt: s.updatedAt ?? "", status: "idle" });
    }
    for (const t of this.threads.values()) {
      if (t.wsId !== wsId) continue;
      const known = out.get(t.id);
      if (!known && t.messages.length === 0) continue;
      out.set(t.id, { id: t.id, title: t.title ?? known?.title ?? titleOf(t), updatedAt: t.updatedAt > (known?.updatedAt ?? "") ? t.updatedAt : known!.updatedAt, status: statusOf(t) });
    }
    return [...out.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  /** Stops listening to the bridge (the provider unmounted, or StrictMode is about to mount it again). */
  detach(): void {
    for (const un of this.unsubscribe) un();
    this.unsubscribe = [];
  }

  dispose(): void {
    const conn = this.conn;
    this.drop();
    this.detach();
    void conn?.stop();
  }
}

// The store is a class instance held in state, which Fast Refresh keeps across an edit to this file:
// the page would go on with an object built from the old class, so reload instead.
import.meta.hot?.dispose(() => location.reload());

const AgentContext = React.createContext<AgentStore | null>(null);

export function AgentProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [store] = React.useState(() => new AgentStore());
  React.useEffect(() => {
    store.attach();
    return () => store.detach();
  }, [store]);
  return <AgentContext.Provider value={store}>{children}</AgentContext.Provider>;
}

/** The agent store, re-rendering on every change. */
export function useAgent(): AgentStore {
  const store = React.useContext(AgentContext);
  if (!store) throw new Error("useAgent outside AgentProvider");
  React.useSyncExternalStore(store.subscribe, () => store.version);
  return store;
}

/** The workspace's threads for the rail, read from the agent when the workspace opens and after it restarts. */
export function useThreads(wsId: string): ThreadSummary[] {
  const agent = useAgent();
  const ready = agent.state === "ready";
  React.useEffect(() => {
    if (isDesktop && (ready || agent.state === "idle")) void agent.list(wsId).catch(() => undefined);
  }, [agent, wsId, ready]);
  return agent.summaries(wsId);
}

/** A thread's model, mode and other settings, as the composer's pickers show them. */
export function useChoices(t: Thread | undefined): Choice[] {
  return React.useMemo(() => (t?.settings ? sessionChoices({ sessionId: t.id, ...t.settings }) : []), [t?.id, t?.settings]);
}

export type { Choice } from "./session";
export type { ChatMessage, ChatPart } from "./transcript";

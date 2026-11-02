import { useChat } from "@ai-sdk/react";
import * as React from "react";
import { PROTOCOL_VERSION, type InitializeResult, type NewSessionResult, type RequestPermissionOutcome, type RequestPermissionParams, type SessionConfigOption, type SessionUpdate } from "../../../../shared/acp";
import { isDesktop, sg } from "~/lib/bridge";
import { AcpConnection, AcpError, errorMessage } from "./connection";
import { sessionChoices, type Choice } from "./session";
import { AcpChatTransport, type AgentUIMessage } from "./transport";

// The chat with the coding agent. It lives at the app root, so a conversation survives closing the
// panel or moving between it and the full chat page. One agent process, one session at a time; a
// session belongs to a workspace, and opening another workspace starts a new one.
//
// This owns the connection and the session; the AI SDK's useChat owns the transcript, fed through
// AcpChatTransport.

export type AgentState = "idle" | "starting" | "auth_required" | "authenticating" | "ready" | "error" | "exited";
export type PendingPermission = { params: RequestPermissionParams; respond: (outcome: RequestPermissionOutcome) => void };
export type Usage = { used: number; size: number; cost: number | null };

/** Agents report a missing login in a few ways; treat them all as "needs a login". */
function isAuthError(err: unknown): boolean {
  if (!(err instanceof AcpError)) return false;
  const kind = (err.data as { errorKind?: string } | undefined)?.errorKind;
  return kind === "authentication_failed" || /authenticat|api key|log ?in|not logged|credential/i.test(err.message);
}

type Agent = {
  desktop: boolean;
  state: AgentState;
  detail: string | null;
  authMethods: { id: string; name: string }[];
  title: string | null;
  usage: Usage | null;
  choices: Choice[];
  permission: PendingPermission | null;
  messages: AgentUIMessage[];
  chatStatus: "submitted" | "streaming" | "ready" | "error";
  chatError: Error | undefined;
  busy: boolean;
  /** Connect for this workspace, once. */
  open: (workspaceId: string) => void;
  send: (text: string) => void;
  stop: () => void;
  newChat: () => void;
  retry: () => void;
  authenticate: (methodId: string) => void;
  setChoice: (choice: Choice, value: string) => void;
};

const AgentContext = React.createContext<Agent | null>(null);

export function AgentProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [state, setState] = React.useState<AgentState>("idle");
  const [detail, setDetail] = React.useState<string | null>(null);
  const [init, setInit] = React.useState<InitializeResult | null>(null);
  const [session, setSession] = React.useState<NewSessionResult | null>(null);
  const [title, setTitle] = React.useState<string | null>(null);
  const [usage, setUsage] = React.useState<Usage | null>(null);
  const [permission, setPermission] = React.useState<PendingPermission | null>(null);

  const connRef = React.useRef<AcpConnection | null>(null);
  const sessionRef = React.useRef<NewSessionResult | null>(null);
  const permissionRef = React.useRef<PendingPermission | null>(null);
  const workspaceRef = React.useRef<string | null>(null);

  // state, not a memo: the live connection delivers to this one object for as long as it runs
  const [transport] = React.useState(
    () =>
      new AcpChatTransport(() => {
        const conn = connRef.current;
        const sessionId = sessionRef.current?.sessionId;
        return conn && sessionId && !conn.isClosed ? { conn, sessionId } : null;
      }),
  );
  const chat = useChat<AgentUIMessage>({ id: "agent", transport });
  const { setMessages, sendMessage, stop: stopChat } = chat;
  const busy = chat.status === "submitted" || chat.status === "streaming";

  const applySession = React.useCallback((s: NewSessionResult | null) => {
    sessionRef.current = s;
    setSession(s);
  }, []);

  const resolvePermission = React.useCallback((outcome: RequestPermissionOutcome) => {
    permissionRef.current?.respond(outcome);
  }, []);

  const applyUpdate = React.useCallback(
    (update: SessionUpdate) => {
      switch (update.sessionUpdate) {
        case "config_option_update":
          setSession((s) => {
            const next = s ? { ...s, configOptions: update.configOptions } : s;
            sessionRef.current = next;
            return next;
          });
          return;
        case "usage_update":
          setUsage({ used: update.used, size: update.size, cost: update.cost?.amount ?? null });
          return;
        case "session_info_update":
          if (update.title) setTitle(update.title);
          return;
        case "current_mode_update":
        case "available_commands_update":
          return;
        default:
          transport.handleUpdate(update);
      }
    },
    [transport],
  );

  const startSession = React.useCallback(
    async (conn: AcpConnection) => {
      const cwd = await sg!.agent.workspaceDir(workspaceRef.current ?? "default");
      const s = await conn.request<NewSessionResult>("session/new", { cwd, mcpServers: [] });
      applySession(s);
      setUsage(null);
      setTitle(null);
      setMessages([]);
    },
    [applySession, setMessages],
  );

  const disconnect = React.useCallback(async () => {
    resolvePermission({ outcome: "cancelled" });
    const conn = connRef.current;
    connRef.current = null;
    applySession(null);
    setInit(null);
    if (conn) await conn.stop();
  }, [applySession, resolvePermission]);

  const connect = React.useCallback(async () => {
    await disconnect();
    setState("starting");
    setDetail(null);
    const conn: AcpConnection = new AcpConnection({
      onNotification: (method, params) => {
        if (method === "session/update") applyUpdate((params as { update: SessionUpdate }).update);
      },
      onRequest: (method, params) => {
        if (method !== "session/request_permission") return Promise.reject(new AcpError(-32601, `Not supported by this client: ${method}`));
        return new Promise((resolve) => {
          const pending: PendingPermission = {
            params: params as RequestPermissionParams,
            respond: (outcome) => {
              if (permissionRef.current === pending) {
                permissionRef.current = null;
                setPermission(null);
              }
              resolve({ outcome });
            },
          };
          permissionRef.current = pending;
          setPermission(pending);
        });
      },
      onExit: (code) => {
        if (connRef.current !== conn) return;
        setState("exited");
        setDetail(code === null ? "The agent stopped." : `The agent stopped (exit code ${code}).`);
        resolvePermission({ outcome: "cancelled" });
      },
    });
    connRef.current = conn;
    try {
      const status = await sg!.agent.status();
      if (!status.available) throw new AcpError(-32000, `${status.name} is not installed. ${status.authHint}`);
      await conn.start();
      const info = await conn.request<InitializeResult>("initialize", {
        protocolVersion: PROTOCOL_VERSION,
        clientCapabilities: { fs: { readTextFile: false, writeTextFile: false }, terminal: false },
        clientInfo: { name: "supergrid", title: "SuperGrid", version: (await sg!.info()).version },
      });
      if (connRef.current !== conn) return;
      setInit(info);
      try {
        await startSession(conn);
      } catch (err) {
        if (connRef.current !== conn) return;
        if (isAuthError(err) && (info.authMethods?.length ?? 0) > 0) {
          // keep the process alive so the login can run in it
          setState("auth_required");
          setDetail(errorMessage(err));
          return;
        }
        throw err;
      }
      if (connRef.current !== conn) return;
      setState("ready");
    } catch (err) {
      if (connRef.current !== conn) return;
      setState("error");
      setDetail(errorMessage(err));
    }
  }, [applyUpdate, disconnect, resolvePermission, startSession]);

  const open = React.useCallback(
    (workspaceId: string) => {
      if (!isDesktop || workspaceRef.current === workspaceId) return;
      workspaceRef.current = workspaceId;
      void connect();
    },
    [connect],
  );

  const retry = React.useCallback(() => void connect(), [connect]);

  const authenticate = React.useCallback(
    async (methodId: string) => {
      const conn = connRef.current;
      if (!conn) return;
      setState("authenticating");
      setDetail("Waiting for you to finish logging in…");
      try {
        await conn.request("authenticate", { methodId });
        if (connRef.current !== conn) return;
        await startSession(conn);
        if (connRef.current !== conn) return;
        setState("ready");
        setDetail(null);
      } catch (err) {
        if (connRef.current !== conn) return;
        setState("auth_required");
        setDetail(errorMessage(err));
      }
    },
    [startSession],
  );

  const send = React.useCallback((text: string) => void sendMessage({ text }), [sendMessage]);

  const stop = React.useCallback(() => {
    const conn = connRef.current;
    const sessionId = sessionRef.current?.sessionId;
    if (conn && sessionId) void conn.notify("session/cancel", { sessionId }).catch(() => undefined);
    resolvePermission({ outcome: "cancelled" });
    void stopChat();
  }, [resolvePermission, stopChat]);

  const newChat = React.useCallback(() => {
    const conn = connRef.current;
    if (!conn) return;
    stop();
    startSession(conn).catch((err) => {
      setState("error");
      setDetail(errorMessage(err));
    });
  }, [startSession, stop]);

  const setChoice = React.useCallback(async (choice: Choice, value: string) => {
    const conn = connRef.current;
    const sessionId = sessionRef.current?.sessionId;
    if (!conn || !sessionId) return;
    try {
      if (choice.source === "config") {
        const res = await conn.request<{ configOptions?: SessionConfigOption[] }>("session/set_config_option", { sessionId, configId: choice.configId, value });
        setSession((s) => {
          const next = s ? { ...s, configOptions: res.configOptions ?? s.configOptions } : s;
          sessionRef.current = next;
          return next;
        });
      } else if (choice.source === "models") {
        await conn.request("session/set_model", { sessionId, modelId: value });
        setSession((s) => (s?.models ? { ...s, models: { ...s.models, currentModelId: value } } : s));
      } else {
        await conn.request("session/set_mode", { sessionId, modeId: value });
        setSession((s) => (s?.modes ? { ...s, modes: { ...s.modes, currentModeId: value } } : s));
      }
    } catch (err) {
      setDetail(`Could not change ${choice.label}: ${errorMessage(err)}`);
    }
  }, []);

  React.useEffect(() => () => void connRef.current?.stop(), []);

  const value: Agent = {
    desktop: isDesktop,
    state,
    detail,
    authMethods: init?.authMethods ?? [],
    title,
    usage,
    choices: sessionChoices(session),
    permission,
    messages: chat.messages,
    chatStatus: chat.status,
    chatError: chat.error,
    busy,
    open,
    send,
    stop,
    newChat,
    retry,
    authenticate: (id) => void authenticate(id),
    setChoice: (c, v) => void setChoice(c, v),
  };
  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>;
}

export function useAgent(): Agent {
  const a = React.useContext(AgentContext);
  if (!a) throw new Error("useAgent outside AgentProvider");
  return a;
}

/** The agent's name for the conversation, else its first question, else "New chat". */
export function useChatTitle(): string {
  const { title, messages } = useAgent();
  const first = messages.find((m) => m.role === "user");
  const text = first?.parts.map((p) => (p.type === "text" ? p.text : "")).join("").trim();
  return title ?? (text ? text.slice(0, 60) : "New chat");
}

export type { AgentUIMessage, ToolOutput } from "./transport";
export type { Choice } from "./session";

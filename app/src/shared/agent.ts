// What the renderer and the main process share about the agent beyond the ACP relay: the context
// the app hands the agent with every prompt, the questions a tool can put to the user mid-turn
// (approvals, uploads, the switch to Dev), and the widgets a tool's result renders in the chat.

/** The MCP server's name in the session, so Muse titles our calls `mcp__supergrid__<tool>`. */
export const MCP_SERVER_NAME = "supergrid";
/** The URI of the context resource attached to each prompt; the transcript hides it on replay. */
export const CONTEXT_URI = "supergrid://context";

/** Our tool's name from a tool call's title, or null for any other tool. */
export function ourTool(title: string | null | undefined): string | null {
  if (!title) return null;
  const m = new RegExp(`^(?:mcp__)?${MCP_SERVER_NAME}__([a-z0-9_]+)$`).exec(title);
  return m ? m[1]! : null;
}

/**
 * What is open in the app, as the agent sees it at the start of each turn and through app_context:
 * the workspace, the desktop's mode for it, and where the user is in it.
 */
export type AppContext = {
  at: string;
  /** Live: the deployed Worker and its data. Dev: the repo's dev server on this Mac, the Code section, local data. */
  mode: "live" | "dev";
  org: { name: string; accountId: string; prefix: string } | null;
  workspace: { id: string; name: string; url: string; version: string | null; apps: { app: string; name: string; public?: string; admin: boolean; api: boolean }[] };
  /** Where the user is: the path inside the workspace and what it shows. */
  location: {
    path: string;
    /** The rail section (Database, Workflows, Library, an app) and the page in it, as the UI labels them. */
    section: string | null;
    page: string | null;
    /** The table open in Database, when one is. */
    table?: string;
    /** The app open under Apps, or the app the Code section's files are filtered to, when one is. */
    app?: string;
    /** The organization settings section open as a modal, when one is. */
    settings?: string;
    /** The docs page open as a modal, when one is. */
    docs?: string;
    /** A one-line description of the screen, for the prompt. */
    label: string;
  };
  /** The window: whether the page theme is dark. */
  dark: boolean;
};

/** A question a tool puts to the user in the chat, and waits on. */
export type AgentAsk =
  /** Yes or no, before something changes: a delete, a bulk update, a dropped table. */
  | { id: string; client: string; wsId: string; tool: string; kind: "confirm"; title: string; detail?: string; preview?: { columns: string[]; rows: unknown[][]; total?: number }; danger?: boolean; confirmLabel?: string }
  /** Pick files on this Mac and upload them to the library; the answer carries what landed. */
  | { id: string; client: string; wsId: string; tool: string; kind: "upload"; title: string; accept: "image" | "media" | "file"; multiple: boolean; prefix?: string }
  /** Switch the desktop to Dev mode for this workspace, because the agent needs what it unlocks. */
  | { id: string; client: string; wsId: string; tool: string; kind: "dev"; title: string; reason: string };

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
/** What a tool passes to ask: the question without the ids the bridge fills in. */
export type AskInput = DistributiveOmit<AgentAsk, "id" | "client" | "wsId" | "tool">;

export type AgentAnswer = { id: string; ok: boolean; /** For an upload: what landed, as the tool reports it. */ uploaded?: UploadedItem[]; note?: string };
export type UploadedItem = { kind: "image" | "media" | "file"; id: string; name: string; url: string | null };

/** A card a tool's result draws in the chat, beside the call. */
export type AgentWidget =
  | { type: "images"; items: { id: string; title: string; thumb: string | null; url: string | null; uploaded: string }[]; total: number }
  | { type: "media"; items: { uid: string; name: string; thumb: string | null; embed: string | null; duration: number; ready: boolean; created: string }[]; total: number }
  | { type: "files"; items: { key: string; name: string; size: number; url: string; contentType: string | null; modified: string }[]; total: number }
  | { type: "themes"; items: ThemeCard[] }
  | { type: "rows"; title: string; columns: string[]; rows: unknown[][]; total: number | null }
  | { type: "metric"; label: string; value: number; hint?: string }
  | { type: "chart"; kind: "bar" | "line"; title: string; points: { key: string; value: number }[] }
  | { type: "skills"; items: { id: string; title: string; excerpt: string }[] }
  | { type: "navigate"; to: string; label: string }
  | { type: "note"; text: string };

export type ThemeCard = { id: string; name: string; mode: "light" | "dark"; isDefault: boolean; colors: { primary: string; secondary: string; accent: string; background: string; foreground: string }; fonts: { heading: string; body: string }; logo?: string };

export type AgentWidgetEvent = { client: string; wsId: string; tool: string; widget: AgentWidget };
export type AgentNavigateEvent = { client: string; wsId: string; to: string };

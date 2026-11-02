// Subset of the Agent Client Protocol v1 types used by this app.
// Reference: https://agentclientprotocol.com/protocol/v1/schema

export const PROTOCOL_VERSION = 1;

export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; mimeType: string; data: string; uri?: string | null }
  | { type: "audio"; mimeType: string; data: string }
  | { type: "resource_link"; uri: string; name: string; title?: string | null }
  | {
      type: "resource";
      resource: { uri: string; mimeType?: string | null; text?: string; blob?: string };
    };

export interface AuthMethod {
  id: string;
  name: string;
  description?: string | null;
}

export interface InitializeResult {
  protocolVersion: number;
  agentCapabilities?: Record<string, unknown>;
  agentInfo?: { name: string; title?: string | null; version?: string | null } | null;
  authMethods?: AuthMethod[];
}

/** Sent by the Claude and Codex adapters as the `_auth/status_update` extension notification. */
export interface AuthStatus {
  kind: "none" | "account" | string;
  label?: string | null;
  account?: { email?: string | null; plan?: string | null } | null;
}

export interface ModelInfo {
  modelId: string;
  name: string;
  description?: string | null;
}

export interface SessionModelState {
  currentModelId: string;
  availableModels: ModelInfo[];
}

export interface SessionMode {
  id: string;
  name: string;
  description?: string | null;
}

export interface SessionModeState {
  currentModeId: string;
  availableModes: SessionMode[];
}

export interface ConfigOptionValue {
  value: string;
  name: string;
  description?: string | null;
}

export interface SessionConfigOption {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  type: "select";
  currentValue: string;
  options: ConfigOptionValue[];
}

export interface NewSessionResult {
  sessionId: string;
  models?: SessionModelState | null;
  modes?: SessionModeState | null;
  configOptions?: SessionConfigOption[] | null;
}

export type ToolCallStatus = "pending" | "in_progress" | "completed" | "failed";
export type ToolKind =
  | "read"
  | "edit"
  | "delete"
  | "move"
  | "search"
  | "execute"
  | "think"
  | "fetch"
  | "switch_mode"
  | "other";

export type ToolCallContent =
  | { type: "content"; content: ContentBlock }
  | { type: "diff"; path: string; oldText?: string | null; newText: string }
  | { type: "terminal"; terminalId: string };

export interface ToolCall {
  toolCallId: string;
  title: string;
  kind?: ToolKind | null;
  status?: ToolCallStatus | null;
  content?: ToolCallContent[] | null;
  locations?: { path: string; line?: number | null }[] | null;
  rawInput?: unknown;
  rawOutput?: unknown;
}

export type ToolCallUpdate = Partial<ToolCall> & { toolCallId: string };

export interface PlanEntry {
  content: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "in_progress" | "completed";
}

export interface AvailableCommand {
  name: string;
  description: string;
  input?: { hint: string } | null;
}

export type SessionUpdate =
  | { sessionUpdate: "user_message_chunk"; content: ContentBlock }
  | { sessionUpdate: "agent_message_chunk"; content: ContentBlock }
  | { sessionUpdate: "agent_thought_chunk"; content: ContentBlock }
  | (ToolCall & { sessionUpdate: "tool_call" })
  | (ToolCallUpdate & { sessionUpdate: "tool_call_update" })
  | { sessionUpdate: "plan"; entries: PlanEntry[] }
  | { sessionUpdate: "available_commands_update"; availableCommands: AvailableCommand[] }
  | { sessionUpdate: "current_mode_update"; currentModeId: string }
  | { sessionUpdate: "config_option_update"; configOptions: SessionConfigOption[] }
  | { sessionUpdate: "session_info_update"; title?: string | null }
  | {
      sessionUpdate: "usage_update";
      used: number;
      size: number;
      cost?: { amount: number; currency: string } | null;
    };

export interface PermissionOption {
  optionId: string;
  name: string;
  kind: "allow_once" | "allow_always" | "reject_once" | "reject_always";
}

export interface RequestPermissionParams {
  sessionId: string;
  toolCall: ToolCallUpdate;
  options: PermissionOption[];
}

export type RequestPermissionOutcome =
  | { outcome: "cancelled" }
  | { outcome: "selected"; optionId: string };

export type StopReason = "end_turn" | "max_tokens" | "max_turn_requests" | "refusal" | "cancelled";

export interface PromptResult {
  stopReason: StopReason;
}

export function contentText(block: ContentBlock | undefined): string {
  if (!block) return "";
  switch (block.type) {
    case "text":
      return block.text;
    case "resource":
      return block.resource.text ?? `[resource ${block.resource.uri}]`;
    case "resource_link":
      return `[${block.title ?? block.name}](${block.uri})`;
    case "image":
      return "[image]";
    case "audio":
      return "[audio]";
  }
}

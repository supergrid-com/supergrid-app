// A thread's transcript, built from the agent's `session/update` notifications. The same reducer
// serves a live turn and a `session/load` replay, which arrives as the same notifications, so a
// thread reopened after a restart reads exactly as it did while it ran.
//
//   user_message_chunk   -> a user message (only on replay: the agent does not echo a live prompt)
//   agent_message_chunk  -> text parts in the turn's assistant message, one per agent messageId
//   agent_thought_chunk  -> a reasoning part
//   tool_call(+_update)  -> a tool part, updated in place
//   plan                 -> one plan part per turn, replaced as it progresses
//
// Each message has a time. Live, it is the time of its latest update. A replay carries no times,
// but Muse's command and tool call ids are UUIDv7s, which start with their creation time in ms.

import type { ContentBlock, PlanEntry, SessionUpdate, ToolCall } from "../../../../shared/acp";
import { contentText } from "../../../../shared/acp";
import { CONTEXT_URI, ourTool, type AgentWidget } from "../../../../shared/agent";

export type ChatPart =
  | { type: "text"; text: string; messageId: string | null }
  | { type: "reasoning"; text: string }
  /** `widget` is the card one of our tools drew for this call (shared/agent.ts). */
  | { type: "tool"; call: ToolCall; widget?: AgentWidget }
  | { type: "plan"; entries: PlanEntry[] }
  | { type: "notice"; level: "info" | "error"; text: string };

/** `at` is in epoch ms; null when nothing told us when. */
export type ChatMessage = { id: string; role: "user" | "assistant"; parts: ChatPart[]; at: number | null };

let counter = 0;
export const nextId = (prefix: string): string => `${prefix}-${Date.now().toString(36)}-${++counter}`;

export const textOf = (m: ChatMessage): string => m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");

/** The creation time of a UUIDv7 (its first 48 bits, in ms), or null for any other id. */
export function timeOfId(id: unknown): number | null {
  if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-7/i.test(id)) return null;
  return Number.parseInt(id.slice(0, 8) + id.slice(9, 13), 16);
}

/** A user message as the app sends it. */
export function userMessage(text: string): ChatMessage {
  return { id: nextId("user"), role: "user", parts: [{ type: "text", text, messageId: null }], at: Date.now() };
}

/** Appends a part to the turn's assistant message, starting one when the last message is the user's. */
export function withNotice(messages: ChatMessage[], level: "info" | "error", text: string): ChatMessage[] {
  return editAssistant(messages, null, Date.now(), (parts) => [...parts, { type: "notice", level, text }]);
}

/**
 * Copies the last message if it is the assistant's, else adds one, and lets `edit` replace its parts.
 * `at` moves its time forward; without one a new message takes the user's time before it.
 */
function editAssistant(messages: ChatMessage[], id: string | null, at: number | null, edit: (parts: ChatPart[]) => ChatPart[]): ChatMessage[] {
  const last = messages[messages.length - 1];
  if (last?.role === "assistant") return [...messages.slice(0, -1), { ...last, parts: edit(last.parts), at: at !== null && at > (last.at ?? 0) ? at : last.at }];
  return [...messages, { id: id ?? nextId("assistant"), role: "assistant", parts: edit([]), at: at ?? last?.at ?? null }];
}

function mergeCall(existing: ToolCall | undefined, patch: Partial<ToolCall> & { toolCallId: string }): ToolCall {
  const merged: ToolCall = { ...(existing ?? { toolCallId: patch.toolCallId, title: "Tool Call" }) };
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined && v !== null) (merged as unknown as Record<string, unknown>)[k] = v;
  }
  return merged;
}

/**
 * The transcript after one update; the same array when the update doesn't touch it. `now` is the
 * time for a live update, null during a replay.
 */
export function applyUpdate(messages: ChatMessage[], update: SessionUpdate, now: number | null): ChatMessage[] {
  const messageId = (update as { messageId?: string }).messageId ?? null;
  switch (update.sessionUpdate) {
    case "user_message_chunk": {
      const block = update.content as ContentBlock;
      // the app's own context resource rides along with each prompt; it is not the user's words
      if (block.type === "resource" && block.resource.uri === CONTEXT_URI) return messages;
      const delta = contentText(block);
      const last = messages[messages.length - 1];
      // chunks of one message share its id; without ids, consecutive chunks are one message
      if (last?.role === "user" && (messageId === null || last.id === messageId)) {
        const [first] = last.parts;
        const text = first?.type === "text" ? first.text + delta : delta;
        return [...messages.slice(0, -1), { ...last, parts: [{ type: "text", text, messageId }] }];
      }
      const command = (update as { _meta?: { "dev.muse"?: { commandId?: string } } })._meta?.["dev.muse"]?.commandId;
      return [...messages, { id: messageId ?? nextId("user"), role: "user", parts: [{ type: "text", text: delta, messageId }], at: now ?? timeOfId(command) ?? timeOfId(messageId) }];
    }
    case "agent_message_chunk": {
      const delta = contentText(update.content);
      if (!delta) return messages;
      return editAssistant(messages, messageId, now, (parts) => {
        const last = parts[parts.length - 1];
        // a new message id is a new text part, even with nothing between them
        if (last?.type === "text" && last.messageId === messageId) return [...parts.slice(0, -1), { ...last, text: last.text + delta }];
        return [...parts, { type: "text", text: delta, messageId }];
      });
    }
    case "agent_thought_chunk": {
      const delta = contentText(update.content);
      if (!delta) return messages;
      return editAssistant(messages, messageId, now, (parts) => {
        const last = parts[parts.length - 1];
        if (last?.type === "reasoning") return [...parts.slice(0, -1), { ...last, text: last.text + delta }];
        return [...parts, { type: "reasoning", text: delta }];
      });
    }
    case "tool_call":
    case "tool_call_update": {
      const { sessionUpdate: _s, ...patch } = update;
      return editAssistant(messages, null, now ?? timeOfId(patch.toolCallId), (parts) => {
        const found = parts.findIndex((p) => p.type === "tool" && p.call.toolCallId === patch.toolCallId);
        if (found < 0) return [...parts, { type: "tool", call: mergeCall(undefined, patch) }];
        const prev = parts[found] as Extract<ChatPart, { type: "tool" }>;
        return parts.map((p, i) => (i === found ? { ...prev, call: mergeCall(prev.call, patch) } : p));
      });
    }
    case "plan":
      return editAssistant(messages, null, now, (parts) => {
        const found = parts.findIndex((p) => p.type === "plan");
        const plan: ChatPart = { type: "plan", entries: update.entries };
        return found < 0 ? [...parts, plan] : parts.map((p, i) => (i === found ? plan : p));
      });
    default:
      return messages;
  }
}

/**
 * Attaches a widget to the latest call of our `tool` that has none yet, searching from the end of
 * the transcript. The same array when there is no such call (the tool_call may not have arrived yet).
 */
export function withWidget(messages: ChatMessage[], tool: string, widget: AgentWidget): ChatMessage[] {
  for (let m = messages.length - 1; m >= 0; m--) {
    const msg = messages[m]!;
    if (msg.role !== "assistant") continue;
    for (let i = msg.parts.length - 1; i >= 0; i--) {
      const p = msg.parts[i]!;
      if (p.type !== "tool" || p.widget || ourTool(p.call.title) !== tool) continue;
      const parts = msg.parts.map((q, j) => (j === i ? { ...p, widget } : q));
      return messages.map((x, k) => (k === m ? { ...x, parts } : x));
    }
    // a call that started before the widget arrived sits in this message or none
    if (msg.parts.some((p) => p.type === "tool")) break;
  }
  return messages;
}

/**
 * After a replay: puts saved widgets back on our tool calls, in order, by tool name. A widget
 * whose call was not replayed is dropped.
 */
export function restoreWidgets(messages: ChatMessage[], saved: { tool: string; widget: AgentWidget }[]): ChatMessage[] {
  if (!saved.length) return messages;
  const queue = [...saved];
  return messages.map((m) => {
    if (m.role !== "assistant") return m;
    let changed = false;
    const parts = m.parts.map((p) => {
      if (p.type !== "tool" || p.widget) return p;
      const name = ourTool(p.call.title);
      if (!name) return p;
      const at = queue.findIndex((w) => w.tool === name);
      if (at < 0) return p;
      const [w] = queue.splice(at, 1);
      changed = true;
      return { ...p, widget: w!.widget };
    });
    return changed ? { ...m, parts } : m;
  });
}

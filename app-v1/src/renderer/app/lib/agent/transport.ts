// Bridges an ACP session to the AI SDK's `useChat`.
//
// `useChat` talks to a `ChatTransport`: it hands over the message list and
// expects back a stream of `UIMessageChunk`s. Here `sendMessages` turns the
// latest user message into an ACP `session/prompt`, and the hook that owns
// the connection feeds every `session/update` notification into
// `handleUpdate`, which translates it into chunks on the open stream:
//
//   agent_message_chunk  -> text-start / text-delta / text-end
//   agent_thought_chunk  -> reasoning-start / reasoning-delta / reasoning-end
//   tool_call(+_update)  -> tool-input-available / tool-output-available (dynamic tools)
//   plan                 -> data-plan (one part, replaced as the plan progresses)
//
// The prompt's stopReason ends the stream with `finish`.

import type { ChatTransport, UIMessage, UIMessageChunk } from "ai";
type JSONObject = Record<string, string>;
import type { PlanEntry, PromptResult, SessionUpdate, ToolCall } from "../../../../shared/acp";
import { contentText } from "../../../../shared/acp";
import type { AcpConnection } from "./connection";
import { errorMessage } from "./connection";

export type AgentDataParts = {
  plan: PlanEntry[];
  notice: { level: "info" | "error"; text: string };
};

export interface AgentMessageMetadata {
  /** Extra text sent to the agent ahead of the user's words but never shown in the transcript. */
  context?: string;
}

export type AgentUIMessage = UIMessage<AgentMessageMetadata, AgentDataParts>;
type Chunk = UIMessageChunk<AgentMessageMetadata, AgentDataParts>;

/**
 * A tool call's current state, sent as the part's output on every update.
 * The AI SDK keeps the `toolMetadata` and `title` from the first chunk of a
 * tool call and ignores them on later ones, so the live status and title
 * travel here instead; the Tool card reads them from the output.
 */
export interface ToolOutput {
  status: string;
  title: string;
  content: Array<{ type: "text"; text: string } | { type: "diff"; path: string; oldText: string | null; newText: string } | { type: "terminal"; terminalId: string }>;
  locations: Array<{ path: string; line: number | null }>;
}

interface Target {
  conn: AcpConnection;
  sessionId: string;
}

interface ActiveTurn {
  controller: ReadableStreamDefaultController<Chunk>;
  textId: string | null;
  messageId: string | null;
  reasoningId: string | null;
  tools: Map<string, ToolCall>;
  closed: boolean;
}

let counter = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${++counter}`;

export class AcpChatTransport implements ChatTransport<AgentUIMessage> {
  private active: ActiveTurn | null = null;

  constructor(private readonly target: () => Target | null) {}

  async sendMessages(options: {
    messages: AgentUIMessage[];
    abortSignal: AbortSignal | undefined;
  }): Promise<ReadableStream<Chunk>> {
    const target = this.target();
    if (!target) throw new Error("No agent session is connected.");
    const { conn, sessionId } = target;

    const last = [...options.messages].reverse().find((m) => m.role === "user");
    const text = last?.parts
      .filter((p): p is Extract<typeof p, { type: "text" }> => p.type === "text")
      .map((p) => p.text)
      .join("\n")
      .trim();
    if (!text) throw new Error("Nothing to send.");
    const context = last?.metadata?.context?.trim();
    const prompt: Array<{ type: "text"; text: string }> = context ? [{ type: "text", text: context }, { type: "text", text }] : [{ type: "text", text }];

    this.finishActive();

    return new ReadableStream<Chunk>({
      start: (controller) => {
        const turn: ActiveTurn = { controller, textId: null, messageId: null, reasoningId: null, tools: new Map(), closed: false };
        this.active = turn;
        controller.enqueue({ type: "start" });
        controller.enqueue({ type: "start-step" });

        const onAbort = () => {
          void conn.notify("session/cancel", { sessionId }).catch(() => undefined);
        };
        options.abortSignal?.addEventListener("abort", onAbort, { once: true });

        conn
          .request<PromptResult>("session/prompt", { sessionId, prompt })
          .then((res) => {
            if (turn.closed) return;
            this.closeParts(turn);
            if (res.stopReason !== "end_turn" && res.stopReason !== "cancelled") {
              controller.enqueue({ type: "data-notice", data: { level: "info", text: `Turn stopped: ${res.stopReason}` } });
            }
            controller.enqueue({ type: "finish-step" });
            controller.enqueue({ type: "finish", finishReason: res.stopReason === "end_turn" ? "stop" : "other" });
          })
          .catch((err: unknown) => {
            if (turn.closed) return;
            this.closeParts(turn);
            controller.enqueue({ type: "error", errorText: errorMessage(err) });
          })
          .finally(() => {
            options.abortSignal?.removeEventListener("abort", onAbort);
            if (!turn.closed) {
              turn.closed = true;
              controller.close();
            }
            if (this.active === turn) this.active = null;
          });
      },
      cancel: () => {
        void conn.notify("session/cancel", { sessionId }).catch(() => undefined);
      },
    });
  }

  async reconnectToStream(): Promise<ReadableStream<Chunk> | null> {
    return null;
  }

  /** Called by the owning hook for every `session/update` notification. */
  handleUpdate(update: SessionUpdate): void {
    const turn = this.active;
    if (!turn || turn.closed) return;
    const c = turn.controller;

    switch (update.sessionUpdate) {
      case "agent_message_chunk": {
        const delta = contentText(update.content);
        if (!delta) return;
        this.endReasoning(turn);
        // a new message id is a new message, even with nothing between them
        const messageId = (update as { messageId?: string }).messageId ?? null;
        if (turn.textId && messageId !== turn.messageId) this.endText(turn);
        turn.messageId = messageId;
        if (!turn.textId) {
          turn.textId = nextId("text");
          c.enqueue({ type: "text-start", id: turn.textId });
        }
        c.enqueue({ type: "text-delta", id: turn.textId, delta });
        return;
      }
      case "agent_thought_chunk": {
        const delta = contentText(update.content);
        if (!delta) return;
        this.endText(turn);
        if (!turn.reasoningId) {
          turn.reasoningId = nextId("reasoning");
          c.enqueue({ type: "reasoning-start", id: turn.reasoningId });
        }
        c.enqueue({ type: "reasoning-delta", id: turn.reasoningId, delta });
        return;
      }
      case "tool_call": {
        this.closeParts(turn);
        const { sessionUpdate: _s, ...call } = update;
        turn.tools.set(call.toolCallId, call);
        const toolName = call.kind ?? "tool";
        c.enqueue({ type: "tool-input-start", toolCallId: call.toolCallId, toolName, dynamic: true, title: call.title });
        c.enqueue({
          type: "tool-input-available",
          toolCallId: call.toolCallId,
          toolName,
          input: call.rawInput ?? {},
          dynamic: true,
          title: call.title,
          toolMetadata: metadataOf(call),
        });
        this.emitToolProgress(turn, call);
        return;
      }
      case "tool_call_update": {
        const { sessionUpdate: _s, ...patch } = update;
        const existing = turn.tools.get(patch.toolCallId);
        const merged: ToolCall = { ...(existing ?? { toolCallId: patch.toolCallId, title: "Tool call" }) };
        for (const [k, v] of Object.entries(patch)) {
          if (v !== undefined && v !== null) (merged as unknown as Record<string, unknown>)[k] = v;
        }
        turn.tools.set(merged.toolCallId, merged);
        if (!existing) {
          this.closeParts(turn);
          const toolName = merged.kind ?? "tool";
          c.enqueue({ type: "tool-input-start", toolCallId: merged.toolCallId, toolName, dynamic: true, title: merged.title });
          c.enqueue({
            type: "tool-input-available",
            toolCallId: merged.toolCallId,
            toolName,
            input: merged.rawInput ?? {},
            dynamic: true,
            title: merged.title,
            toolMetadata: metadataOf(merged),
          });
        }
        this.emitToolProgress(turn, merged);
        return;
      }
      case "plan":
        c.enqueue({ type: "data-plan", id: "plan", data: update.entries });
        return;
      default:
        return;
    }
  }

  /** Emits the tool's current content as (preliminary) output, or its final result. */
  private emitToolProgress(turn: ActiveTurn, call: ToolCall) {
    const status = call.status ?? "pending";
    const output = outputOf(call);
    if (status === "failed") {
      const text = output.content.map((c) => (c.type === "text" ? c.text : "")).join("\n").trim();
      turn.controller.enqueue({
        type: "tool-output-error",
        toolCallId: call.toolCallId,
        errorText: text || "Tool call failed",
        dynamic: true,
        toolMetadata: metadataOf(call),
      });
      return;
    }
    turn.controller.enqueue({
      type: "tool-output-available",
      toolCallId: call.toolCallId,
      output,
      preliminary: status !== "completed",
      dynamic: true,
      toolMetadata: metadataOf(call),
    });
  }

  private endText(turn: ActiveTurn) {
    if (turn.textId) {
      turn.controller.enqueue({ type: "text-end", id: turn.textId });
      turn.textId = null;
    }
  }

  private endReasoning(turn: ActiveTurn) {
    if (turn.reasoningId) {
      turn.controller.enqueue({ type: "reasoning-end", id: turn.reasoningId });
      turn.reasoningId = null;
    }
  }

  private closeParts(turn: ActiveTurn) {
    this.endText(turn);
    this.endReasoning(turn);
  }

  private finishActive() {
    const turn = this.active;
    if (!turn || turn.closed) return;
    turn.closed = true;
    try {
      turn.controller.close();
    } catch {
      // already closed
    }
    this.active = null;
  }
}

function metadataOf(call: ToolCall): JSONObject {
  return {
    kind: call.kind ?? "other",
    status: call.status ?? "pending",
    title: call.title,
  };
}

function outputOf(call: ToolCall): ToolOutput {
  return {
    status: call.status ?? "pending",
    title: call.title,
    content: (call.content ?? []).map((c) => {
      if (c.type === "content") return { type: "text" as const, text: contentText(c.content) };
      if (c.type === "diff") return { type: "diff" as const, path: c.path, oldText: c.oldText ?? null, newText: c.newText };
      return { type: "terminal" as const, terminalId: c.terminalId };
    }),
    locations: (call.locations ?? []).map((l) => ({ path: l.path, line: l.line ?? null })),
  };
}

import { LoaderCircleIcon, SparklesIcon } from "lucide-react";
import * as React from "react";
import { Confirmation, Context, Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton, CopyAction, Message, MessageActions, MessageContent, MessageNotice, MessageResponse, Plan, PromptInput, PromptInputFooter, PromptInputSelect, PromptInputSubmit, PromptInputTextarea, Reasoning, Shimmer, Tool } from "~/components/ai-elements";
import { Button } from "~/components/ui/button";
import { useAgent, type AgentUIMessage } from "~/lib/agent/provider";
import type { Workspace } from "~/lib/mock";
import { usePlatform } from "~/lib/platform";
import { cn } from "~/lib/utils";

const SUGGESTIONS = ["What can you do?", "Sketch a landing page for this site", "Draft a contact form app"];

/** A tool call's title, from the transcript. */
function titleOfTool(messages: AgentUIMessage[], toolCallId: string): string | undefined {
  for (const m of messages) {
    for (const p of m.parts) {
      if (p.type === "dynamic-tool" && p.toolCallId === toolCallId) return p.title;
    }
  }
  return undefined;
}

const textOf = (m: AgentUIMessage) => m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");

function Turn({ message, streaming }: { message: AgentUIMessage; streaming: boolean }): React.ReactElement {
  if (message.role === "user") {
    return (
      <Message from="user">
        <MessageContent>{textOf(message)}</MessageContent>
      </Message>
    );
  }
  const text = textOf(message);
  return (
    <Message from="assistant">
      {message.parts.map((part, i) => {
        if (part.type === "text") {
          if (!part.text) return null;
          return (
            <MessageContent key={i}>
              <MessageResponse streaming={streaming && part.state === "streaming"}>{part.text}</MessageResponse>
            </MessageContent>
          );
        }
        if (part.type === "reasoning") return <Reasoning key={i} text={part.text} streaming={streaming && part.state === "streaming"} />;
        // the plan card already shows what the todo tool does
        if (part.type === "dynamic-tool") return (part.title ?? "").startsWith("write_todos") ? null : <Tool key={part.toolCallId} part={part} />;
        if (part.type === "data-plan") return <Plan key={i} entries={part.data} />;
        if (part.type === "data-notice") return <MessageNotice key={i} level={part.data.level}>{part.data.text}</MessageNotice>;
        return null;
      })}
      {!streaming && text && (
        <MessageActions>
          <CopyAction text={text} />
        </MessageActions>
      )}
    </Message>
  );
}

// What shows before there is a conversation: the agent's state, or where to begin.
function Empty({ onSuggest }: { onSuggest: (text: string) => void }): React.ReactElement {
  const agent = useAgent();
  if (!agent.desktop) return <p className="text-sm text-muted-foreground">The agent runs in the desktop app.</p>;
  if (agent.state === "ready") {
    return (
      <>
        <span className="flex size-10 items-center justify-center rounded-full bg-active text-active-foreground">
          <SparklesIcon className="size-5" />
        </span>
        <div className="font-heading text-lg font-semibold">Where should we begin?</div>
        <div className="flex max-w-full flex-wrap justify-center gap-1.5">
          {SUGGESTIONS.map((s) => (
            <Button key={s} size="xs" variant="outline" className="rounded-full px-2.5 font-normal" onClick={() => onSuggest(s)}>
              {s}
            </Button>
          ))}
        </div>
      </>
    );
  }
  if (agent.state === "auth_required" || agent.state === "authenticating") {
    return (
      <>
        <p className="max-w-xs text-sm text-muted-foreground">{agent.detail}</p>
        {agent.state === "auth_required" && agent.authMethods.map((m) => (
          <Button key={m.id} size="sm" onClick={() => agent.authenticate(m.id)}>
            {m.name}
          </Button>
        ))}
      </>
    );
  }
  if (agent.state === "error" || agent.state === "exited") {
    return (
      <>
        <p className="max-w-xs text-sm text-muted-foreground">{agent.detail}</p>
        <Button size="sm" variant="outline" onClick={agent.retry}>
          Try again
        </Button>
      </>
    );
  }
  return (
    <span className="flex items-center gap-2 text-sm text-muted-foreground">
      <LoaderCircleIcon className="size-4 animate-spin" />
      <Shimmer>Starting Muse Code…</Shimmer>
    </span>
  );
}

// The chat with the coding agent. It only ever lives in its panel, so all of it, the composer and
// code included, takes the admin theme's colors from .on-admin, and declares that theme's light or
// dark so `dark:` styles follow it rather than the page. Everything real lives in AgentProvider, so
// this can unmount freely.
export function ChatPanel({ ws, initialMessage, autoFocus }: { ws: Workspace; initialMessage?: string; autoFocus?: boolean }): React.ReactElement {
  const agent = useAgent();
  const { adminDark } = usePlatform();
  const { open, send, state } = agent;
  const [draft, setDraft] = React.useState("");
  const ready = state === "ready";

  React.useEffect(() => open(ws.id), [open, ws.id]);

  // a message handed in from the floating composer goes out as soon as the agent is up
  const handedIn = React.useRef<string | undefined>(undefined);
  React.useEffect(() => {
    if (initialMessage && ready && handedIn.current !== initialMessage) {
      handedIn.current = initialMessage;
      send(initialMessage);
    }
  }, [initialMessage, ready, send]);

  const submit = () => {
    const text = draft.trim();
    if (!text || !ready || agent.busy) return;
    setDraft("");
    send(text);
  };

  const model = agent.choices.find((c) => c.category === "model");
  const mode = agent.choices.find((c) => c.category === "mode");
  const last = agent.messages[agent.messages.length - 1];

  return (
    <div className={cn("on-admin flex h-full min-h-0 flex-col text-foreground", adminDark ? "dark" : "light")}>
      <div className="flex min-h-0 flex-1 flex-col">
        <Conversation>
          <ConversationContent className={agent.messages.length === 0 ? "min-h-full" : undefined}>
            {agent.messages.length === 0 && (
              <ConversationEmptyState>
                <Empty onSuggest={send} />
              </ConversationEmptyState>
            )}
            {agent.messages.map((m) => (
              <Turn key={m.id} message={m} streaming={agent.busy && m === last} />
            ))}
            {agent.chatStatus === "submitted" && (
              <Message from="assistant">
                <Shimmer className="text-sm">Thinking…</Shimmer>
              </Message>
            )}
            {agent.chatError && <MessageNotice level="error">{agent.chatError.message}</MessageNotice>}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </div>
      <div className="flex shrink-0 flex-col gap-2">
        {agent.permission && <Confirmation params={agent.permission.params} title={titleOfTool(agent.messages, agent.permission.params.toolCall.toolCallId)} onChoose={(optionId) => agent.permission?.respond({ outcome: "selected", optionId })} onCancel={agent.stop} />}
        <div className="flex flex-col">
          <PromptInput>
            <PromptInputTextarea value={draft} onChange={setDraft} onSubmit={submit} autoFocus={autoFocus} disabled={!agent.desktop} placeholder={`Ask or build in ${ws.name}`} />
            <PromptInputSubmit busy={agent.busy} disabled={!ready || !draft.trim()} onSubmit={submit} onStop={agent.stop} />
          </PromptInput>
          <PromptInputFooter>
            {model && <PromptInputSelect label="Model" value={model.current} options={model.options} disabled={agent.busy} onChange={(v) => agent.setChoice(model, v)} />}
            {mode && <PromptInputSelect label="Approval mode" value={mode.current} options={mode.options} disabled={agent.busy} onChange={(v) => agent.setChoice(mode, v)} />}
            {agent.usage && agent.usage.size > 0 && <Context used={agent.usage.used} size={agent.usage.size} cost={agent.usage.cost} />}
          </PromptInputFooter>
        </div>
      </div>
    </div>
  );
}

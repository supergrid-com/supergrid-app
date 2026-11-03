import { LoaderCircleIcon, SparklesIcon } from "lucide-react";
import * as React from "react";
import { AskCard, Confirmation, Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton, CopyAction, Message, MessageActions, MessageContent, MessageNotice, MessageResponse, MessageTime, Plan, PromptInput, PromptInputAdd, PromptInputKind, PromptInputSelect, PromptInputSubmit, PromptInputTextarea, PromptInputToolbar, Reasoning, Tool, WidgetContext } from "~/components/ai-elements";
import { Shimmer } from "~/components/shimmer";
import { MetaMark } from "~/components/meta-mark";
import { Button } from "~/components/ui/button";
import { useAgent, useChoices, type ChatMessage, type Thread } from "~/lib/agent/provider";
import { modelChoice, shortName, type Choice } from "~/lib/agent/session";
import { textOf } from "~/lib/agent/transcript";
import { isDesktop } from "~/lib/bridge";
import { usePlatform } from "~/lib/platform";
import type { WorkspaceSummary } from "~/lib/workspaces";

const SUGGESTIONS = ["What can you do here?", "Page views this week, by day", "Show the tables", "Show the themes"];

/** A tool call's title, from the transcript. */
function titleOfTool(messages: ChatMessage[], toolCallId: string): string | undefined {
  for (const m of messages) {
    for (const p of m.parts) {
      if (p.type === "tool" && p.call.toolCallId === toolCallId) return p.call.title;
    }
  }
  return undefined;
}

function Turn({ message, streaming }: { message: ChatMessage; streaming: boolean }): React.ReactElement {
  if (message.role === "user") {
    return (
      <Message from="user">
        <MessageContent>{textOf(message)}</MessageContent>
        <MessageActions className="-me-1.5 ms-0 justify-end">
          {message.at !== null && <MessageTime at={message.at} />}
          <CopyAction text={textOf(message)} />
        </MessageActions>
      </Message>
    );
  }
  const text = textOf(message);
  const last = message.parts.length - 1;
  return (
    <Message from="assistant">
      {message.parts.map((part, i) => {
        if (part.type === "text") {
          if (!part.text) return null;
          return (
            <MessageContent key={i}>
              <MessageResponse streaming={streaming && i === last}>{part.text}</MessageResponse>
            </MessageContent>
          );
        }
        if (part.type === "reasoning") return <Reasoning key={i} text={part.text} streaming={streaming && i === last} />;
        // the plan card already shows what the todo tool does
        if (part.type === "tool") return part.call.title.startsWith("write_todos") ? null : <Tool key={part.call.toolCallId} call={part.call} widget={part.widget} />;
        if (part.type === "plan") return <Plan key={i} entries={part.entries} />;
        return (
          <MessageNotice key={i} level={part.level}>
            {part.text}
          </MessageNotice>
        );
      })}
      {!streaming && text && (
        <MessageActions>
          <CopyAction text={text} />
          {message.at !== null && <MessageTime at={message.at} />}
        </MessageActions>
      )}
    </Message>
  );
}

// What shows before there is a conversation: the agent's state, or where to begin.
function Empty({ thread, onSuggest }: { thread: Thread | undefined; onSuggest: (text: string) => void }): React.ReactElement {
  const agent = useAgent();
  if (!isDesktop) return <p className="text-sm text-muted-foreground">The agent runs in the desktop app.</p>;
  if (agent.state === "auth_required" || agent.state === "authenticating") {
    return (
      <>
        <p className="max-w-xs text-sm text-muted-foreground">{agent.detail}</p>
        {agent.state === "auth_required" &&
          agent.authMethods.map((m) => (
            <Button key={m.id} size="sm" onClick={() => void agent.authenticate(m.id)}>
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
        <Button size="sm" variant="outline" onClick={() => void agent.retry()}>
          Try again
        </Button>
      </>
    );
  }
  if (thread?.error && !thread.live) {
    return (
      <>
        <p className="max-w-xs text-sm text-muted-foreground">Couldn't open this thread: {thread.error}</p>
        <Button size="sm" variant="outline" onClick={() => void agent.open(thread.wsId, thread.id)}>
          Try again
        </Button>
      </>
    );
  }
  if (thread?.live) {
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
  return (
    <span className="flex items-center gap-2 text-sm text-muted-foreground">
      <LoaderCircleIcon className="size-4 animate-spin" />
      <Shimmer>{thread?.loading ? "Opening the thread…" : agent.state === "ready" ? "Starting a thread…" : "Starting Muse Code…"}</Shimmer>
    </span>
  );
}

// One thread's transcript and composer. The agent's panel is a page surface (agent-side.tsx), so
// all of it, the composer and code included, reads in the page's colors. The thread itself lives
// in the agent store, so this can unmount freely, even mid-turn.
export function ChatPanel({ ws, thread }: { ws: WorkspaceSummary; thread: Thread | undefined }): React.ReactElement {
  const agent = useAgent();
  const { pageDark } = usePlatform();
  const choices = useChoices(thread);
  const [draft, setDraft] = React.useState("");
  const ready = !!thread?.live && agent.state === "ready";
  const busy = !!thread?.busy;
  const messages = thread?.messages ?? [];

  const send = (text: string) => {
    if (thread && ready && !busy) agent.send(thread.id, text);
  };
  const submit = () => {
    const text = draft.trim();
    if (!text || !ready || busy) return;
    setDraft("");
    send(text);
  };
  const stop = () => thread && agent.stop(thread.id);

  const muse = choices.find((c) => c.category === "model");
  const model = muse && modelChoice(muse);
  const mode = choices.find((c) => c.category === "mode");
  const effort = choices.find((c) => c.category === "thought_level");
  const picker = (choice: Choice | undefined, label: string, look?: { icon?: React.ReactNode; strong?: boolean }) =>
    choice && thread && <PromptInputSelect label={label} icon={look?.icon} strong={look?.strong} value={choice.current} options={choice.options} nameOf={(o) => shortName(choice, o)} disabled={busy} onChange={(v) => void agent.setChoice(thread.id, choice, v)} />;
  const last = messages[messages.length - 1];
  // the turn has started but nothing of the agent's has arrived yet
  const waiting = busy && last?.role === "user";
  const widgetCtx = React.useMemo(() => ({ wsId: ws.id }), [ws.id]);

  return (
    <WidgetContext.Provider value={widgetCtx}>
    <div className="flex h-full min-h-0 flex-col text-foreground">
      <div className="flex min-h-0 flex-1 flex-col">
        <Conversation>
          <ConversationContent className={messages.length === 0 ? "min-h-full" : undefined}>
            {messages.length === 0 && (
              <ConversationEmptyState>
                <Empty thread={thread} onSuggest={send} />
              </ConversationEmptyState>
            )}
            {messages.map((m) => (
              <Turn key={m.id} message={m} streaming={busy && m === last} />
            ))}
            {waiting && (
              <Message from="assistant">
                <Shimmer className="text-base">Thinking…</Shimmer>
              </Message>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </div>
      <div className="flex shrink-0 flex-col gap-2">
        {thread?.ask && <AskCard ask={thread.ask.ask} ws={ws} respond={thread.ask.respond} />}
        {thread?.permission && (
          <Confirmation
            params={thread.permission.params}
            title={titleOfTool(messages, thread.permission.params.toolCall.toolCallId)}
            onChoose={(optionId) => thread.permission?.respond({ outcome: "selected", optionId })}
            onCancel={stop}
          />
        )}
        <PromptInput>
          <PromptInputTextarea value={draft} onChange={setDraft} onSubmit={submit} autoFocus disabled={!isDesktop} placeholder={`Ask or build in ${ws.name}`} />
          <PromptInputToolbar
            start={
              <>
                <PromptInputAdd />
                {thread && <PromptInputKind dev={thread.dev} disabled={busy} onChange={(dev) => agent.setDev(thread.id, dev)} />}
              </>
            }
          >
            {picker(model, "Model", { icon: <MetaMark dark={pageDark} className="h-3 w-4.5 shrink-0" />, strong: true })}
            {picker(effort, "Effort")}
            {picker(mode, "Mode")}
            <PromptInputSubmit busy={busy} disabled={!ready || !draft.trim()} onSubmit={submit} onStop={stop} />
          </PromptInputToolbar>
        </PromptInput>
      </div>
    </div>
    </WidgetContext.Provider>
  );
}

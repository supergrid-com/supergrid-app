import { ArrowUpIcon, CheckIcon, CopyIcon, PaperclipIcon, ThumbsDownIcon, ThumbsUpIcon } from "lucide-react";
import * as React from "react";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { toastManager } from "~/components/ui/toast";
import { chats, type ChatMessage, type Workspace } from "~/lib/mock";
import { cn } from "~/lib/utils";

function Message({ m }: { m: ChatMessage }): React.ReactElement {
  if (m.role === "user") {
    return (
      <div className="flex justify-center">
        <div className="max-w-[90%] rounded-full border bg-background px-4 py-2 text-center text-sm shadow-xs/5">{m.text}</div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2 text-sm">
      <p className="leading-relaxed">{m.text}</p>
      {m.actions && (
        <ul className="flex flex-col gap-1 rounded-lg border bg-background p-2 text-xs">
          {m.actions.map((a) => (
            <li key={a} className="flex items-center gap-1.5">
              <CheckIcon className="size-3 text-success-foreground" />
              <span className="truncate">{a}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="-ms-1.5 flex items-center gap-0.5 text-muted-foreground">
        <Button variant="ghost" size="icon-xs" aria-label="Copy" onClick={() => navigator.clipboard?.writeText(m.text).catch(() => {})}>
          <CopyIcon />
        </Button>
        <Button variant="ghost" size="icon-xs" aria-label="Good answer">
          <ThumbsUpIcon />
        </Button>
        <Button variant="ghost" size="icon-xs" aria-label="Bad answer">
          <ThumbsDownIcon />
        </Button>
      </div>
    </div>
  );
}

// The agent chat for a workspace. It sits on its panel rather than in a card: the
// conversation is plain text, the composer is the one white surface. Everything is canned.
export function ChatPanel({ ws, chatId, empty, initialMessage, autoFocus, listClassName }: { listClassName?: string;  ws: Workspace; chatId?: string; empty?: React.ReactNode; initialMessage?: string; autoFocus?: boolean }): React.ReactElement {
  const chat = chatId ? chats.find((c) => c.id === chatId) : undefined;
  const [messages, setMessages] = React.useState<ChatMessage[]>(chat?.messages ?? []);
  const [draft, setDraft] = React.useState("");
  const listRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setMessages(chat?.messages ?? []);
  }, [chat]);

  React.useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  // a message handed in from the floating composer goes out as soon as the panel is up
  const sent = React.useRef<string | undefined>(undefined);
  React.useEffect(() => {
    if (initialMessage && sent.current !== initialMessage) {
      sent.current = initialMessage;
      send(initialMessage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMessage]);

  const send = (text = draft) => {
    const t = text.trim();
    if (!t) return;
    setDraft("");
    setMessages((m) => [...m, { id: `u${m.length}`, role: "user", text: t }]);
    setTimeout(() => {
      setMessages((m) => [...m, { id: `a${m.length}`, role: "agent", text: `In the real platform the agent would act on "${t}" inside ${ws.name}: read the tables, change an app, or deploy. Here it only answers.` }]);
    }, 500);
  };


  return (
    <div className="flex h-full flex-col">
      <div ref={listRef} className={cn("min-h-0 flex-1 overflow-y-auto px-4 pt-2 pb-4", listClassName)}>
        {messages.length === 0 && empty}
        {messages.length > 0 && (
          <div className="flex flex-col gap-5">
            {messages.map((m) => (
              <Message key={m.id} m={m} />
            ))}
          </div>
        )}
      </div>
      <div>
        <div className="flex flex-col rounded-xl border bg-background shadow-md/5 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/24">
          <Textarea
            autoFocus={autoFocus}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={`Ask or build in ${ws.name}`}
            rows={2}
            className="resize-none border-0 bg-transparent shadow-none before:hidden focus-visible:ring-0"
          />
          <div className="flex items-center gap-1 px-2 pb-2">
            <Button variant="ghost" size="icon-xs" aria-label="Attach" onClick={() => toastManager.add({ title: "Attachments are not in the POC", type: "info" })}>
              <PaperclipIcon />
            </Button>
            <div className="flex-1" />
            <Button size="icon-xs" aria-label="Send" disabled={!draft.trim()} onClick={() => send()}>
              <ArrowUpIcon />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

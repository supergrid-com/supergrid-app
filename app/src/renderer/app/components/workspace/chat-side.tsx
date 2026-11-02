import { PanelLeftCloseIcon, PlusIcon } from "lucide-react";
import * as React from "react";
import { createPortal } from "react-dom";
import { ChatPanel } from "~/components/workspace/chat-panel";
import { BarButton, BarToolbar } from "~/components/workspace/bar-toolbar";
import { Crumbs } from "~/components/workspace/frame";
import { useAgent, useChatTitle } from "~/lib/agent/provider";
import type { Workspace } from "~/lib/mock";
import { useSideChat } from "~/lib/workspace-page";

// The chat, in a panel beside the canvas like the sub nav. The title, new chat and close show in the
// title bar, above the panel, through `headerSlot`.

export function ChatSide({ ws, initialMessage, headerSlot }: { ws: Workspace; initialMessage?: string; headerSlot: HTMLElement | null }): React.ReactElement {
  const { close } = useSideChat();
  const agent = useAgent();
  const title = useChatTitle();

  const header = (
    <>
      <div className="min-w-0 flex-1 text-sm font-medium tracking-wider">
        <Crumbs items={[<span className="truncate">{title}</span>]} />
      </div>
      <BarToolbar aria-label="Chat" className="shrink-0">
        <BarButton label="New chat" onClick={agent.newChat} disabled={agent.state !== "ready"}>
          <PlusIcon />
        </BarButton>
        <BarButton label="Close chat" onClick={close}>
          <PanelLeftCloseIcon />
        </BarButton>
      </BarToolbar>
    </>
  );

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-admin-line bg-admin-panel" aria-label="Chat">
      {headerSlot ? createPortal(header, headerSlot) : <header className="on-admin flex h-11 shrink-0 items-center gap-1 ps-3 pe-1 text-foreground">{header}</header>}
      <div className="flex min-h-0 flex-1 flex-col px-4 pt-2 pb-2.5">
        <ChatPanel ws={ws} initialMessage={initialMessage} autoFocus />
      </div>
    </section>
  );
}

import { HistoryIcon, Maximize2Icon, SlidersHorizontalIcon, SparklesIcon, XIcon } from "lucide-react";
import * as React from "react";
import { createPortal } from "react-dom";
import { ChatPanel } from "~/components/workspace/chat-panel";
import { Crumbs } from "~/components/workspace/frame";
import { Button } from "~/components/ui/button";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "~/components/ui/menu";
import { toastManager } from "~/components/ui/toast";
import { Tooltip, TooltipPopup, TooltipTrigger } from "~/components/ui/tooltip";
import { chats, chatsFor, type Workspace } from "~/lib/mock";
import { useSideChat, useWorkspacePage } from "~/lib/workspace-page";
import { cn } from "~/lib/utils";

// The chat beside the canvas, on its left, in a panel like the sub nav's: the conversation sits on
// the panel and the composer is the one white surface. Recents, the title, settings, expand and
// close show in the title bar, above the chat, through `headerSlot`.

function IconButton({ label, children, ...props }: React.ComponentProps<typeof Button> & { label: string }): React.ReactElement {
  return (
    <Tooltip>
      <TooltipTrigger render={<Button variant="ghost" size="icon-xs" aria-label={label} {...props} className={cn("text-muted-foreground hover:text-foreground", props.className)} />}>{children}</TooltipTrigger>
      <TooltipPopup>{label}</TooltipPopup>
    </Tooltip>
  );
}

export function ChatSide({ ws, chatId, initialMessage, headerSlot }: { ws: Workspace; chatId?: string; initialMessage?: string; headerSlot: HTMLElement | null }): React.ReactElement {
  const { open, close } = useSideChat();
  const { go } = useWorkspacePage();
  const current = chatId ? chats.find((c) => c.id === chatId) : undefined;
  const recent = chatsFor(ws.id);

  const recents = (
    <Menu>
      <MenuTrigger render={<Button variant="ghost" size="xs" className="shrink-0 tracking-wider" />}>
        <HistoryIcon />
        Recents
      </MenuTrigger>
      <MenuPopup align="start" className="w-64">
        <MenuItem onClick={() => open()}>New chat</MenuItem>
        <MenuSeparator />
        {recent.map((c) => (
          <MenuItem key={c.id} onClick={() => open(c.id)} className={cn(c.id === chatId && "bg-accent")}>
            <span className="flex-1 truncate">{c.title}</span>
            <span className="text-xs text-muted-foreground">{c.when}</span>
          </MenuItem>
        ))}
      </MenuPopup>
    </Menu>
  );
  const header = (
    <>
      <div className="min-w-0 flex-1 text-sm font-medium tracking-wider">
        <Crumbs items={current ? [recents, <span className="truncate">{current.title}</span>] : [recents]} />
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <IconButton label="Chat settings" onClick={() => toastManager.add({ title: "Not in the POC", type: "info" })}>
          <SlidersHorizontalIcon />
        </IconButton>
        <IconButton label="Open full screen" onClick={() => go({ kind: "chat", id: chatId }, { side: null })}>
          <Maximize2Icon />
        </IconButton>
        <IconButton label="Close" onClick={close}>
          <XIcon />
        </IconButton>
      </div>
    </>
  );

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-admin-line bg-admin-panel" aria-label="Chat">
      {headerSlot ? createPortal(header, headerSlot) : <header className="on-admin flex h-11 shrink-0 items-center gap-1 ps-3 pe-1 text-foreground">{header}</header>}
      <div className="flex min-h-0 flex-1 flex-col p-2">
        <ChatPanel
          ws={ws}
          chatId={chatId}
          initialMessage={initialMessage}
          autoFocus
          listClassName="on-admin text-foreground"
          empty={
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <span className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <SparklesIcon className="size-5" />
              </span>
              <div className="font-heading text-lg font-semibold">Where should we begin?</div>
            </div>
          }
        />
      </div>
    </section>
  );
}

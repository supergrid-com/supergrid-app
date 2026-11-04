import { ArrowLeftToLineIcon, ArrowRightToLineIcon, CheckIcon, ChevronDownIcon, PanelLeftIcon, PanelRightIcon, PlusIcon } from "lucide-react";
import * as React from "react";
import { createPortal } from "react-dom";
import { Menu, MenuGroup, MenuGroupLabel, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "~/components/ui/menu";
import { BarButton, BarToolbar } from "~/components/workspace/bar-toolbar";
import { ChatPanel } from "~/components/workspace/chat-panel";
import { StatusMark } from "~/components/workspace/sidebar";
import { titleOf, useAgent, useThreads } from "~/lib/agent/provider";
import { isDesktop } from "~/lib/bridge";
import type { ChatSide } from "~/lib/chat-side";
import type { WorkspaceSummary } from "~/lib/workspaces";

// The thread's title is a menu of the workspace's threads, newest first, so another can be opened
// in the panel without the rail: each row carries the rail's status mark, the open one a check.
function ThreadMenu({ ws, threadId, title, onOpenThread }: { ws: WorkspaceSummary; threadId: string | null; title: string; onOpenThread: (id: string | null) => void }): React.ReactElement {
  const threads = useThreads(ws.id);
  return (
    <div className="flex min-w-0 flex-1 items-center">
      <Menu>
        <MenuTrigger render={<button type="button" aria-label={`Thread: ${title}`} className="-ms-1.5 flex h-7 min-w-0 max-w-full cursor-pointer items-center gap-1 rounded-md ps-1.5 pe-1 text-sm font-medium tracking-wider outline-none transition-colors hover:bg-accent focus-visible:bg-accent data-popup-open:bg-accent" />}>
          <span className="min-w-0 truncate">{title}</span>
          <ChevronDownIcon className="size-3.5 shrink-0 opacity-60" />
        </MenuTrigger>
        <MenuPopup align="start" className="w-72 rounded-xl text-foreground">
          <MenuGroup>
            <MenuGroupLabel className="px-2.5 pt-1.5 pb-1 text-xs font-normal">Threads</MenuGroupLabel>
            {threads.map((t) => (
              <MenuItem key={t.id} onClick={() => onOpenThread(t.id)} className="gap-2.5 rounded-md px-2.5" aria-current={t.id === threadId ? "true" : undefined}>
                <span className="min-w-0 flex-1 truncate">{t.title}</span>
                <StatusMark status={t.status} />
                {t.id === threadId && <CheckIcon className="size-3.5 text-info opacity-100!" />}
              </MenuItem>
            ))}
            {threads.length === 0 && <MenuItem disabled className="px-2.5 text-muted-foreground">No threads yet</MenuItem>}
          </MenuGroup>
          <MenuSeparator />
          <MenuItem onClick={() => onOpenThread(null)} className="gap-2.5 rounded-md px-2.5">
            <PlusIcon />
            New Thread
          </MenuItem>
        </MenuPopup>
      </Menu>
    </div>
  );
}

// The agent's panel beside the page: Muse Code over ACP, running in the workspace's folder with the
// workspace's tools (src/main/mcp.ts). It shows one thread; with none picked it opens an empty one,
// which only joins the rail's list once something is sent in it. Like v1's chat, its header sits in
// the title bar above it when the bar gives it a slot. The pin moves the panel to the page's other
// side, for every thread in the workspace (lib/chat-side.ts).
export function AgentSide({
  ws,
  threadId,
  onOpenThread,
  headerSlot,
  side = "left",
  onPin,
  onClose,
}: {
  ws: WorkspaceSummary;
  threadId: string | null;
  onOpenThread: (id: string | null) => void;
  headerSlot: HTMLElement | null;
  side?: ChatSide;
  onPin?: (side: ChatSide) => void;
  onClose: () => void;
}): React.ReactElement {
  const agent = useAgent();
  const thread = threadId ? agent.threads.get(threadId) : undefined;
  const ready = agent.state === "ready" || agent.state === "idle";

  // show the picked thread, loading it into the agent if needed, or make an empty one to write in
  React.useEffect(() => {
    if (!isDesktop || !ready) return;
    if (threadId) {
      void agent.open(ws.id, threadId);
      return () => agent.close(threadId);
    }
    let live = true;
    agent
      .newThread(ws.id)
      .then((id) => live && onOpenThread(id))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [agent, ws.id, threadId, ready, onOpenThread]);
  // a remembered thread the agent no longer has (its session was never saved, say the app quit while making it) is
  // forgotten, and an empty one takes its place
  const gone = !!thread && !thread.live && /not found/i.test(thread.error ?? "");
  React.useEffect(() => {
    if (gone) onOpenThread(null);
  }, [gone, onOpenThread]);

  const header = (
    <>
      <ThreadMenu ws={ws} threadId={threadId} title={titleOf(thread)} onOpenThread={onOpenThread} />
      <BarToolbar aria-label="Agent" className="shrink-0">
        <BarButton label="New Thread" onClick={() => onOpenThread(null)} disabled={!thread || (thread.messages.length === 0 && !thread.error)}>
          <PlusIcon />
        </BarButton>
        {onPin && (
          <BarButton label={side === "left" ? "Pin to the Right" : "Pin to the Left"} onClick={() => onPin(side === "left" ? "right" : "left")}>
            {side === "left" ? <ArrowRightToLineIcon /> : <ArrowLeftToLineIcon />}
          </BarButton>
        )}
        <BarButton label="Close the Agent" onClick={onClose}>
          {side === "left" ? <PanelLeftIcon /> : <PanelRightIcon />}
        </BarButton>
      </BarToolbar>
    </>
  );
  return (
    <section className="on-admin on-admin-panel flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border bg-background bg-clip-padding text-foreground" aria-label="Agent">
      {headerSlot ? createPortal(header, headerSlot) : <header className="flex h-11 shrink-0 items-center gap-1 ps-4 pe-1">{header}</header>}
      <div className="flex min-h-0 flex-1 flex-col px-6 pt-2 pb-4">
        <ChatPanel key={threadId ?? "new"} ws={ws} thread={thread} />
      </div>
    </section>
  );
}

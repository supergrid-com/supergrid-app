import { PanelLeftIcon, PlusIcon } from "lucide-react";
import * as React from "react";
import { createPortal } from "react-dom";
import { BarButton, BarToolbar } from "~/components/workspace/bar-toolbar";
import { ChatPanel } from "~/components/workspace/chat-panel";
import { titleOf, useAgent } from "~/lib/agent/provider";
import { isDesktop } from "~/lib/bridge";
import type { WorkspaceSummary } from "~/lib/workspaces";

// The agent's panel beside the page: Muse Code over ACP, running in the workspace's folder with the
// workspace's tools (src/main/mcp.ts). It shows one thread; with none picked it opens an empty one,
// which only joins the rail's list once something is sent in it. Like v1's chat, its header sits in
// the title bar above it when the bar gives it a slot.
export function AgentSide({ ws, threadId, onOpenThread, headerSlot, onClose }: { ws: WorkspaceSummary; threadId: string | null; onOpenThread: (id: string | null) => void; headerSlot: HTMLElement | null; onClose: () => void }): React.ReactElement {
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

  const header = (
    <>
      <span className="min-w-0 flex-1 truncate text-sm font-medium tracking-wider">{titleOf(thread)}</span>
      <BarToolbar aria-label="Agent" className="shrink-0">
        <BarButton label="New Thread" onClick={() => onOpenThread(null)} disabled={!thread || thread.messages.length === 0}>
          <PlusIcon />
        </BarButton>
        <BarButton label="Close the Agent" onClick={onClose}>
          <PanelLeftIcon />
        </BarButton>
      </BarToolbar>
    </>
  );
  return (
    <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border bg-background bg-clip-padding text-foreground" aria-label="Agent">
      {headerSlot ? createPortal(header, headerSlot) : <header className="flex h-11 shrink-0 items-center gap-1 ps-4 pe-1">{header}</header>}
      <div className="flex min-h-0 flex-1 flex-col px-6 pt-2 pb-6">
        <ChatPanel key={threadId ?? "new"} ws={ws} thread={thread} />
      </div>
    </section>
  );
}

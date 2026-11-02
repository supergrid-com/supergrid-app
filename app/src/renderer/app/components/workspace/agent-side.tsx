import { MessageCircleIcon, XIcon } from "lucide-react";
import type * as React from "react";
import { createPortal } from "react-dom";
import { Button } from "~/components/ui/button";
import { mockThreads } from "~/lib/threads-mock";
import type { WorkspaceSummary } from "~/lib/workspaces";

// The agent's panel beside the page, where v1 ran Muse Code over ACP against the workspace and
// its apps' code. It isn't connected in this version yet, so the panel says so rather than
// pretending to answer. Like v1's chat, its header sits in the title bar above it when the bar
// gives it a slot.
export function AgentSide({ ws, threadId, headerSlot, onClose }: { ws: WorkspaceSummary; threadId: string | null; headerSlot: HTMLElement | null; onClose: () => void }): React.ReactElement {
  const thread = mockThreads.find((t) => t.id === threadId);
  const header = (
    <>
      <span className="min-w-0 flex-1 truncate text-sm font-medium tracking-wider">{thread?.title ?? "New thread"}</span>
      <Button variant="ghost" size="icon-sm" aria-label="Close the agent" className="text-muted-foreground" onClick={onClose}>
        <XIcon />
      </Button>
    </>
  );
  return (
    <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-admin-line bg-admin-panel text-admin-fg" aria-label="Agent">
      {headerSlot ? createPortal(header, headerSlot) : <header className="flex h-11 shrink-0 items-center gap-1 ps-4 pe-1">{header}</header>}
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
        <span className="flex size-10 items-center justify-center rounded-xl bg-admin-active text-admin-strong">
          <MessageCircleIcon className="size-5" />
        </span>
        <div className="font-heading text-base font-semibold text-admin-strong">Not connected yet</div>
        <p className="text-sm text-admin-muted">The agent will read {ws.name}'s data and change its apps' code from here. It isn't wired up in this version.</p>
      </div>
    </section>
  );
}

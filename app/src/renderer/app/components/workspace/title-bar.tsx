import { ArrowLeftIcon, ArrowRightIcon, GlobeIcon, PanelLeftIcon } from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router";
import { Button } from "~/components/ui/button";
import { Kbd } from "~/components/ui/kbd";
import { Tooltip, TooltipPopup, TooltipTrigger } from "~/components/ui/tooltip";
import type { Workspace } from "~/lib/mock";
import { cn } from "~/lib/utils";

// The title bar of the sidebar layout, after Codex: history and the sidebar toggle beside the
// traffic lights, then a divider on the canvas's left edge, then the page's title and actions.
// Pages put those last two in through the slots (see WorkspaceFrame). With the chat open, its own
// section sits above it, with a divider on its left edge in the same way.

/** What the traffic lights add to the bar's start padding: .titlebar in app.css sets 92px over the bar's 8px. */
const titlebarInset = (): number => (document.documentElement.dataset.platform === "darwin" ? 84 : 0);

/** The room back, forward and the toggle need, so the divider never lands on them. */
const NAV_MIN_WIDTH = 112;

type HistoryApi = EventTarget & { canGoBack: boolean; canGoForward: boolean };

// Chromium's Navigation API says what the back and forward buttons can do.
function useHistoryButtons(): { back: boolean; forward: boolean } {
  const nav = (window as unknown as { navigation?: HistoryApi }).navigation;
  const read = React.useCallback(() => ({ back: nav?.canGoBack ?? true, forward: nav?.canGoForward ?? true }), [nav]);
  const [state, setState] = React.useState(read);
  React.useEffect(() => {
    if (!nav) return;
    const update = () => setState(read());
    nav.addEventListener("currententrychange", update);
    return () => nav.removeEventListener("currententrychange", update);
  }, [nav, read]);
  return state;
}

function IconButton({ label, children, ...props }: React.ComponentProps<typeof Button> & { label: string }): React.ReactElement {
  return (
    <Tooltip>
      <TooltipTrigger render={<Button variant="ghost" size="icon" aria-label={label} {...props} className="size-8 sm:size-8 text-muted-foreground hover:text-foreground" />}>{children}</TooltipTrigger>
      <TooltipPopup>{label}</TooltipPopup>
    </Tooltip>
  );
}

export function WorkspaceTitleBar({
  ws,
  canvasStart,
  chatStart,
  animate,
  onToggleSidebar,
  chatRef,
  titleRef,
  actionsRef,
}: {
  ws: Workspace;
  /** Where the canvas starts, from the window's left edge. */
  canvasStart: number;
  /** Where the chat starts, when it is open. */
  chatStart?: number;
  /** Off during a resize drag, so the divider tracks the pointer. */
  animate: boolean;
  onToggleSidebar: () => void;
  chatRef: (el: HTMLElement | null) => void;
  titleRef: (el: HTMLElement | null) => void;
  actionsRef: (el: HTMLElement | null) => void;
}): React.ReactElement {
  const navigate = useNavigate();
  const history = useHistoryButtons();
  const start = 8 + titlebarInset(); // the bar's start padding
  const easing = animate && "transition-[width] duration-200 ease-out";
  const navEnd = Math.max(chatStart ?? canvasStart, start + NAV_MIN_WIDTH);
  return (
    <header className="titlebar flex h-12 shrink-0 items-center px-2 pt-2">
      <div className={cn("on-admin flex shrink-0 items-center gap-0.5", easing)} style={{ width: navEnd - start }}>
        <IconButton label="Back" disabled={!history.back} onClick={() => navigate(-1)}>
          <ArrowLeftIcon />
        </IconButton>
        <IconButton label="Forward" disabled={!history.forward} onClick={() => navigate(1)}>
          <ArrowRightIcon />
        </IconButton>
        <Tooltip>
          <TooltipTrigger render={<Button variant="ghost" size="icon" aria-label="Toggle sidebar" onClick={onToggleSidebar} className="size-8 sm:size-8 text-muted-foreground hover:text-foreground" />}>
            <PanelLeftIcon />
          </TooltipTrigger>
          <TooltipPopup className="flex items-center gap-2">
            Toggle sidebar
            <span className="flex items-center gap-0.5">
              <Kbd>⌘</Kbd>
              <Kbd>B</Kbd>
            </span>
          </TooltipPopup>
        </Tooltip>
      </div>
      {chatStart !== undefined && (
        <div className={cn("on-admin flex shrink-0 items-center overflow-hidden", easing)} style={{ width: Math.max(canvasStart - navEnd, 0) }}>
          <div className="h-5 w-px shrink-0 bg-admin-line" />
          <div ref={chatRef} className="flex min-w-0 flex-1 items-center ps-2 pe-1 text-foreground" />
        </div>
      )}
      <div className="on-admin flex min-w-0 flex-1 items-center">
        <div className="h-5 w-px shrink-0 bg-admin-line" />
        <div ref={titleRef} className="ms-3 flex min-w-0 items-center gap-2 text-foreground" />
      </div>
      <div ref={actionsRef} className="ms-1 flex shrink-0 items-center gap-1.5" />
      <div className="on-admin ms-1 shrink-0">
        <Button size="sm" variant="ghost" render={<a href={ws.url} target="_blank" rel="noreferrer" />}>
          <GlobeIcon />
          Open site
        </Button>
      </div>
    </header>
  );
}

import { ArrowLeftIcon, ArrowRightIcon, PanelLeftIcon } from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router";
import { Kbd } from "~/components/ui/kbd";
import { BarButton, BarToolbar } from "~/components/workspace/bar-toolbar";
import { cn } from "~/lib/utils";

// The title bar of the sidebar layout, after Codex: history and the sidebar toggle beside the
// traffic lights, then a divider on the canvas's left edge, then the page's breadcrumb (see
// WorkspaceFrame). With the agent open, its own section sits above it, with a divider on its left
// edge in the same way.
//
// The rule for the bar above the canvas: the breadcrumb only. Nothing page- or app-specific goes
// up here (no Open site, no page actions); a page keeps its actions in its own body. Later this
// may hold a few admin tools that aren't about any one page or app.

/** What the traffic lights add to the bar's start padding: .titlebar in app.css sets 92px over the bar's 8px. */
const titlebarInset = (): number => (document.documentElement.dataset.platform === "darwin" ? 84 : 0);

/**
 * The room back, forward and the toggle need: three 28px buttons 2px apart (88px), then a 12px
 * gap, the same as the one between the divider and the title. With the rail folded, the divider
 * sits right after the toggle; with it open, it follows the canvas edge instead.
 */
const NAV_MIN_WIDTH = 100;

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

export function WorkspaceTitleBar({
  canvasStart,
  chatStart,
  animate,
  onToggleSidebar,
  chatRef,
  titleRef,
}: {
  /** Where the canvas starts, from the window's left edge. */
  canvasStart: number;
  /** Where the chat starts, when it is open. */
  chatStart?: number;
  /** Off during a resize drag, so the divider tracks the pointer. */
  animate: boolean;
  onToggleSidebar: () => void;
  chatRef: (el: HTMLElement | null) => void;
  titleRef: (el: HTMLElement | null) => void;
}): React.ReactElement {
  const navigate = useNavigate();
  const history = useHistoryButtons();
  const start = 8 + titlebarInset(); // the bar's start padding
  const easing = animate && "transition-[width] duration-200 ease-out";
  const navEnd = Math.max(chatStart ?? canvasStart, start + NAV_MIN_WIDTH);
  return (
    <header className="titlebar flex h-12 shrink-0 items-center px-2 pt-2">
      <div className={cn("flex shrink-0 items-center", easing)} style={{ width: navEnd - start }}>
        <BarToolbar aria-label="Navigation">
          <BarButton label="Back" disabled={!history.back} onClick={() => navigate(-1)}>
            <ArrowLeftIcon />
          </BarButton>
          <BarButton label="Forward" disabled={!history.forward} onClick={() => navigate(1)}>
            <ArrowRightIcon />
          </BarButton>
          <BarButton
            label="Toggle sidebar"
            onClick={onToggleSidebar}
            hint={
              <span className="flex items-center gap-0.5">
                <Kbd>⌘</Kbd>
                <Kbd>B</Kbd>
              </span>
            }
          >
            <PanelLeftIcon />
          </BarButton>
        </BarToolbar>
      </div>
      {chatStart !== undefined && (
        <div className={cn("flex shrink-0 items-center overflow-hidden", easing)} style={{ width: Math.max(canvasStart - navEnd, 0) }}>
          <div className="h-5 w-px shrink-0 bg-admin-line" />
          <div ref={chatRef} className="on-admin flex min-w-0 flex-1 items-center gap-2 ps-4 pe-3 text-foreground" />
        </div>
      )}
      <div className="on-admin flex min-w-0 flex-1 items-center">
        <div className="h-5 w-px shrink-0 bg-admin-line" />
        <div ref={titleRef} className="ms-3 flex min-w-0 items-center gap-2 text-foreground" />
      </div>
    </header>
  );
}

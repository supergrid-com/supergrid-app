import { ArrowLeftIcon, ArrowRightIcon, CodeXmlIcon, LoaderCircleIcon, MessagesCircleIcon, PanelLeftIcon, type LucideIcon } from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router";
import type { WorkspaceMode } from "../../../../shared/bridge";
import { Kbd } from "~/components/ui/kbd";
import { SegmentedControl, SegmentedControlItem } from "~/components/ui/segmented-control";
import { Tooltip, TooltipPopup, TooltipTrigger } from "~/components/ui/tooltip";
import { BarButton, BarToolbar } from "~/components/workspace/bar-toolbar";
import { usePlatform } from "~/lib/platform";
import { cn } from "~/lib/utils";

// The title bar of the sidebar layout, after Codex: history and the sidebar toggle beside the
// traffic lights, then a divider on the canvas's left edge, then the page's breadcrumb (see
// WorkspaceFrame). With the agent open, its own section sits above it, with a divider on its left
// edge in the same way.
//
// After the toggle sits the workspace's mode, Live or Dev (WORKSPACE-REPO.md §9, lib/mode.ts): the
// deployed Worker and its data, or the repo's dev server on this Mac with the Code section open.
//
// The bar above the canvas holds the page's breadcrumb and, at its end, the page's main action
// when it has one (New Contact over a table), so the action sits outside the page's surface. The
// rest of a page's controls stay in its body; nothing app-specific goes up here (no Open site).

/** What the traffic lights add to the bar's start padding: .titlebar in app.css sets 92px over the bar's 8px. */
const titlebarInset = (): number => (document.documentElement.dataset.platform === "darwin" ? 84 : 0);

/**
 * The room back, forward, the toggle and the mode need: three 28px buttons 2px apart (88px), the
 * Work / Build control (about 70px) after an 8px gap, then a 12px gap, the same as the one between
 * the divider and the title. With the rail folded, the divider sits right after the mode; with it
 * open, it follows the canvas edge instead.
 */
const NAV_MIN_WIDTH = 200;

/**
 * Live or Dev, as two icons named by their tooltips: Work (Live, the chat) and Build (Dev, the
 * code). Build shows a spinner in place of its icon while the dev server comes up; both are
 * disabled meanwhile. A workspace that lives only on this Mac (the demo) has nothing deployed, so
 * it stays in Build.
 */
function ModeSwitch({ mode }: { mode: ModeProps }): React.ReactElement {
  const { adminDark } = usePlatform();
  const item = (m: WorkspaceMode, label: string, Icon: LucideIcon) => (
    <Tooltip key={m}>
      <TooltipTrigger render={<SegmentedControlItem aria-label={label} aria-pressed={mode.mode === m} data-pressed={mode.mode === m || undefined} disabled={mode.switching || (mode.local && m === "live")} onClick={() => mode.onChange(m)} className="h-7 w-8 rounded-md px-0 sm:h-7" />}>
        {m === "dev" && mode.switching ? <LoaderCircleIcon className="size-4 animate-spin" /> : <Icon className="size-4" />}
      </TooltipTrigger>
      <TooltipPopup>{label}</TooltipPopup>
    </Tooltip>
  );
  return (
    <SegmentedControl size="sm" aria-label="Work or Build" className={cn("on-admin ms-2 h-8 shrink-0 rounded-lg bg-foreground/8", adminDark ? "dark" : "light")}>
      {item("live", mode.local ? "Work Needs a Deployed Workspace" : "Work", MessagesCircleIcon)}
      {item("dev", "Build", CodeXmlIcon)}
    </SegmentedControl>
  );
}
type ModeProps = { mode: WorkspaceMode; switching: boolean; onChange: (mode: WorkspaceMode) => void; /** Lives only on this Mac: always Build. */ local?: boolean };

// A divider marks where a panel starts but draws its line in the middle of the 8px gap before it.
// It takes no width, so what follows keeps its place.
function Divider(): React.ReactElement {
  return (
    <span aria-hidden className="relative h-5 w-0 shrink-0">
      <span className="absolute inset-y-0 -start-[4.5px] w-px bg-admin-line" />
    </span>
  );
}

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
  chatEnd,
  animate,
  onToggleSidebar,
  mode,
  chatRef,
  titleRef,
  actionsRef,
}: {
  /** Where the canvas starts, from the window's left edge. */
  canvasStart: number;
  /** Where the chat starts, when it is open on the left of the page. */
  chatStart?: number;
  /** The chat's width, when it is open on the right of the page instead. */
  chatEnd?: number;
  /** Off during a resize drag, so the divider tracks the pointer. */
  animate: boolean;
  onToggleSidebar: () => void;
  /** The workspace's Live / Dev mode and its switch. */
  mode?: ModeProps;
  chatRef: (el: HTMLElement | null) => void;
  titleRef: (el: HTMLElement | null) => void;
  /** Where a page's main action lands, at the bar's end. */
  actionsRef: (el: HTMLElement | null) => void;
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
            label="Toggle Sidebar"
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
        {mode && <ModeSwitch mode={mode} />}
      </div>
      {chatStart !== undefined && (
        <>
          <Divider />
          <div className={cn("flex shrink-0 items-center overflow-hidden", easing)} style={{ width: Math.max(canvasStart - navEnd, 0) }}>
            <div ref={chatRef} className="on-admin flex min-w-0 flex-1 items-center gap-2 ps-4 pe-3 text-foreground" />
          </div>
        </>
      )}
      <div className="on-admin flex min-w-0 flex-1 items-center">
        <Divider />
        <div ref={titleRef} className="ms-3 flex min-w-0 items-center gap-2 text-foreground" />
        <div ref={actionsRef} className="ms-auto flex shrink-0 items-center justify-end gap-2 ps-3 pe-1 text-foreground" />
      </div>
      {/* the chat pinned to the right: its section ends with the bar, over its panel */}
      {chatEnd !== undefined && (
        <>
          <Divider />
          <div className={cn("flex shrink-0 items-center overflow-hidden", easing)} style={{ width: chatEnd }}>
            <div ref={chatRef} className="on-admin flex min-w-0 flex-1 items-center gap-2 ps-4 pe-3 text-foreground" />
          </div>
        </>
      )}
    </header>
  );
}

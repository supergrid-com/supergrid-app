import { ArrowUpIcon, PanelRightIcon, PlusIcon, SparklesIcon } from "lucide-react";
import * as React from "react";
import { FrameSlots } from "~/components/workspace/frame";
import { SettingsNav } from "~/components/workspace/settings-nav";
import { AppNav, DataNav, MenuNav } from "~/components/workspace/sub-nav";
import { SettingsPage } from "~/components/workspace/settings-pages";
import { ChatSide } from "~/components/workspace/chat-side";
import { ResizeHandle } from "~/components/workspace/resize-handle";
import { NAV_COLLAPSED_WIDTH, NAV_WIDTH, WorkspaceSidebar } from "~/components/workspace/sidebar";
import { WorkspaceTitleBar } from "~/components/workspace/title-bar";
import { AnalyticsPage, ContactsPage, DesignPage, LoggingPage, MediaPage, SitemapPage } from "~/components/workspace/more-pages";
import { AppPage, IntegrationsPage, DataPage, FilesPage, HomePage, SecretsPage, WorkflowsPage } from "~/components/workspace/pages";
import { Button } from "~/components/ui/button";
import { useSideChat, useWorkspacePage } from "~/lib/workspace-page";
import type { Workspace } from "~/lib/mock";
import { menuFor, useNavConfig } from "~/lib/nav-config";
import { CHAT_SIDE_DEFAULT_WIDTH, SUB_NAV_DEFAULT_WIDTH, usePlatform } from "~/lib/platform";
import { Tooltip, TooltipPopup, TooltipTrigger } from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";

// A workspace: a sidebar on the left, one page in a white card on the right, and the agent as a
// floating composer at the bottom, like Sidekick in Shopify's admin. The title bar runs the full
// width above them, because the traffic lights are wider than the collapsed rail.
// The gaps the resize handles sit in, after the sub panel and after the chat.
const SUB_NAV_GAP = 8;
const CHAT_GAP = 8;

export function WorkspaceShell({ ws }: { ws: Workspace }): React.ReactElement {
  const { page, go } = useWorkspacePage();
  const { railState, setRailState, chatWidth, setChatWidth, subNavWidth, setSubNavWidth } = usePlatform();
  const [resizing, setResizing] = React.useState(false);
  // the chat: a panel beside the canvas, on any page
  const sideChat = useSideChat();
  const side = sideChat.side;
  const [handoff, setHandoff] = React.useState<string | undefined>(undefined);
  const [navOpen, setNavOpen] = React.useState(false);
  // every section with sub items (settings, data, an app) takes the rail down to icons
  // and opens a second panel beside it, like Shopify's settings; the user's own collapse choice
  // comes back once they leave
  const { config: nav } = useNavConfig(ws);
  const menu = menuFor(nav, page);
  const inSubPanel = !!menu || page.kind === "settings" || page.kind === "data" || page.kind === "app";
  const collapsed = inSubPanel || railState === "collapsed";
  // the toggle (⌘B) folds whatever is open: the rail down to icons, or a section's second panel
  const panelOpen = inSubPanel && railState !== "collapsed";
  const toggleNav = React.useCallback(() => {
    setRailState(railState === "collapsed" ? "open" : "collapsed");
  }, [railState, setRailState]);
  // the rail and the sub panel, then the chat, then the canvas
  const chatStart = (collapsed ? NAV_COLLAPSED_WIDTH : NAV_WIDTH) + (panelOpen ? subNavWidth + SUB_NAV_GAP : 0);
  const canvasStart = chatStart + (side ? chatWidth + CHAT_GAP : 0);
  const [titleSlot, setTitleSlot] = React.useState<HTMLElement | null>(null);
  const [chatSlot, setChatSlot] = React.useState<HTMLElement | null>(null);
  const [actionsSlot, setActionsSlot] = React.useState<HTMLElement | null>(null);
  const slots = React.useMemo(() => ({ title: titleSlot, actions: actionsSlot }), [titleSlot, actionsSlot]);
  const section = page.kind === "settings" ? (page.section ?? "general") : "general";
  const [draft, setDraft] = React.useState("");

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNavOpen(false);
      if (e.key.toLowerCase() === "b" && (e.metaKey || e.ctrlKey) && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        toggleNav();
      }
    };
    window.addEventListener("keydown", onKey);
    // the document takes the rail's color while this layout is up (see app.css)
    document.documentElement.setAttribute("data-workspace", "");
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.removeAttribute("data-workspace");
    };
  }, [toggleNav]);

  const frameProps = { onOpenNav: () => setNavOpen(true) };
  let content: React.ReactNode;
  switch (page.kind) {
    case "data":
      content = <DataPage ws={ws} table={page.table} {...frameProps} />;
      break;
    case "app":
      content = <AppPage ws={ws} app={page.app} path={page.path} {...frameProps} />;
      break;
    case "workflows":
      content = <WorkflowsPage ws={ws} {...frameProps} />;
      break;
    case "files":
      content = <FilesPage ws={ws} {...frameProps} />;
      break;
    case "secrets":
      content = <SecretsPage ws={ws} {...frameProps} />;
      break;
    case "integrations":
      content = <IntegrationsPage ws={ws} {...frameProps} />;
      break;
    case "settings":
      content = <SettingsPage ws={ws} section={section} {...frameProps} />;
      break;
    case "analytics":
      content = <AnalyticsPage ws={ws} {...frameProps} />;
      break;
    case "contacts":
      content = <ContactsPage ws={ws} {...frameProps} />;
      break;
    case "logging":
      content = <LoggingPage ws={ws} {...frameProps} />;
      break;
    case "sitemap":
      content = <SitemapPage ws={ws} {...frameProps} />;
      break;
    case "media":
      content = <MediaPage ws={ws} {...frameProps} />;
      break;
    case "design":
      content = <DesignPage ws={ws} {...frameProps} />;
      break;
    default:
      content = <HomePage ws={ws} {...frameProps} />;
  }

  // the floating composer sends into the side chat, opening it if need be
  const ask = () => {
    const text = draft.trim();
    setDraft("");
    setHandoff(text || undefined);
    sideChat.open(side?.id);
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden overscroll-none bg-admin text-foreground">
      <WorkspaceTitleBar ws={ws} canvasStart={canvasStart} chatStart={side ? chatStart : undefined} animate={!resizing} onToggleSidebar={toggleNav} chatRef={setChatSlot} titleRef={setTitleSlot} actionsRef={setActionsSlot} />
      <div className="flex min-h-0 flex-1 overflow-hidden">
      <WorkspaceSidebar ws={ws} collapsed={collapsed} className="max-md:hidden" />
      {/* the sub panel slides in next to the rail and out again when its page closes */}
      <div className={cn("shrink-0 overflow-hidden max-md:hidden", !resizing && "transition-[width] duration-200 ease-out")} style={{ width: panelOpen ? subNavWidth : 0 }} aria-hidden={!panelOpen}>
        <div className="h-full pt-1 pb-2" style={{ width: subNavWidth }}>
          {menu ? (
            <MenuNav ws={ws} menu={menu} />
          ) : page.kind === "app" ? (
            <AppNav ws={ws} app={page.app} />
          ) : page.kind === "data" ? (
            <DataNav ws={ws} />
          ) : (
            <SettingsNav section={section} />
          )}
        </div>
      </div>
      {panelOpen && <ResizeHandle label="Resize menu" width={subNavWidth} defaultWidth={SUB_NAV_DEFAULT_WIDTH} onChange={setSubNavWidth} onDragging={setResizing} className="max-md:hidden" style={{ width: SUB_NAV_GAP }} />}
      {/* the chat, in a panel of its own */}
      {side && (
        <>
          <div className="flex h-full shrink-0 pt-1 pb-2 max-md:hidden" style={{ width: chatWidth }}>
            <ChatSide ws={ws} initialMessage={handoff} headerSlot={chatSlot} />
          </div>
          <ResizeHandle label="Resize chat" width={chatWidth} defaultWidth={CHAT_SIDE_DEFAULT_WIDTH} onChange={setChatWidth} onDragging={setResizing} className="max-md:hidden" style={{ width: CHAT_GAP }} />
        </>
      )}
      {/* small screens: the sidebar slides over the page */}
      <div className={cn("fixed inset-0 z-40 md:hidden", navOpen ? "" : "pointer-events-none")}>
        <div className={cn("absolute inset-0 bg-black/40 transition-opacity", navOpen ? "opacity-100" : "opacity-0")} onClick={() => setNavOpen(false)} />
        <div className={cn("absolute inset-y-0 start-0 transition-transform duration-200 ease-out", navOpen ? "translate-x-0" : "-translate-x-full")}>
          <WorkspaceSidebar ws={ws} onClose={() => setNavOpen(false)} />
        </div>
      </div>

      <div className="relative flex h-full min-w-0 flex-1 flex-col pt-1 pe-2 pb-2 ps-1 md:ps-0">
        <FrameSlots.Provider value={slots}>{content}</FrameSlots.Provider>

        {!side && (
          <div className="pointer-events-none absolute start-0 end-2 bottom-5 z-20 flex justify-center px-4">
            <div className="pointer-events-auto flex h-11 w-full max-w-md items-center gap-1 rounded-full border bg-popover ps-3 pe-1.5 shadow-lg/10 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/24">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <SparklesIcon className="size-3.5" />
              </span>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    ask();
                  }
                }}
                placeholder={`Ask or build in ${ws.name}`}
                className="h-full min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground/72"
              />
              <Button variant="ghost" size="icon-xs" aria-label="Attach" className="rounded-full">
                <PlusIcon />
              </Button>
              <Button size="icon-xs" aria-label="Send" className="rounded-full" onClick={ask}>
                <ArrowUpIcon />
              </Button>
              <span className="mx-1 h-5 w-px bg-border" />
              <Tooltip>
                <TooltipTrigger render={<Button variant="ghost" size="icon-xs" aria-label="Open chat panel" className="rounded-full" onClick={() => sideChat.open()} />}>
                  <PanelRightIcon />
                </TooltipTrigger>
                <TooltipPopup>Open chat panel</TooltipPopup>
              </Tooltip>
            </div>
          </div>
        )}
      </div>

      </div>
    </div>
  );
}

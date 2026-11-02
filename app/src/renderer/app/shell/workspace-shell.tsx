import { Loader2Icon } from "lucide-react";
import * as React from "react";
import { Navigate, Outlet, useLocation, useNavigate, useParams } from "react-router";
import { Button } from "~/components/ui/button";
import { AgentSide } from "~/components/workspace/agent-side";
import { FrameSlots } from "~/components/workspace/frame";
import { ResizeHandle } from "~/components/workspace/resize-handle";
import { NAV_COLLAPSED_WIDTH, NAV_WIDTH, WorkspaceSidebar } from "~/components/workspace/sidebar";
import { SubNav, type SubNavItem } from "~/components/workspace/sub-nav";
import { WorkspaceTitleBar } from "~/components/workspace/title-bar";
import { updateOrg } from "~/lib/orgs";
import { CHAT_SIDE_DEFAULT_WIDTH, SUB_NAV_DEFAULT_WIDTH, usePlatform } from "~/lib/platform";
import { useSession } from "~/lib/session";
import { cn } from "~/lib/utils";
import { useWorkspaces, type WorkspaceSummary } from "~/lib/workspaces";
import { SearchPalette, useSearchShortcut } from "~/shell/command-palette";
import { ShellContext, useStoredFlag, type Shell } from "~/shell/context";
import { OrgModal } from "~/shell/org-modal";
import { settingsSections } from "~/shell/sections";

// A workspace, after v1: the title bar runs the full width above a dark rail, a second panel for
// sections with sub pages, the agent's panel, and the page in a card. The organization's own pages
// open as a modal over it (?org=…).

// The gaps the resize handles sit in, after the sub panel and after the agent.
const SUB_NAV_GAP = 8;
const CHAT_GAP = 8;

/** The second panel for the current page, or null when it has none. `rest` is the path inside the workspace. */
function subNavFor(ws: WorkspaceSummary, rest: string, go: (to: string) => void): { title: string; items: SubNavItem[] } | null {
  const base = `/w/${ws.id}`;
  const parts = rest.split("/");
  if (parts[0] === "settings") {
    const current = parts[1] || "general";
    return { title: "Settings", items: settingsSections.map((s) => ({ key: s.id, label: s.label, icon: <s.icon />, active: s.id === current, onClick: () => go(`${base}/settings/${s.id}`) })) };
  }
  if (parts[0] === "apps" && parts[1]) {
    // an app's own admin menu, as its manifest declares it (the workspace's ROUTES binding)
    const app = ws.apps.find((a) => a.app === parts[1]);
    if (!app?.nav?.length) return null;
    const sub = `/${parts.slice(2).join("/")}`;
    return {
      title: app.name,
      items: app.nav.map((n) => ({
        key: n.path,
        label: n.label,
        active: n.path === "/" ? sub === "/" : sub === n.path || sub.startsWith(`${n.path}/`),
        onClick: () => go(`${base}/apps/${app.app}${n.path === "/" ? "" : n.path}`),
      })),
    };
  }
  return null;
}

function Centered({ children }: { children: React.ReactNode }): React.ReactElement {
  return <div className="titlebar flex h-full flex-col items-center justify-center gap-3 bg-admin p-8 text-center text-admin-fg">{children}</div>;
}

export function WorkspaceShell(): React.ReactElement {
  const { ws: id } = useParams();
  const { org } = useSession();
  const { list, error, refresh } = useWorkspaces(org?.cloudflare ?? null);
  const ws = list?.find((w) => w.id === id);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { railState, setRailState, chatWidth, setChatWidth, subNavWidth, setSubNavWidth } = usePlatform();
  const [agentOpen, setAgentOpen] = useStoredFlag("sg.agent.open", false);
  const [resizing, setResizing] = React.useState(false);
  const [navOpen, setNavOpen] = React.useState(false);
  const [search, setSearch] = React.useState(false);
  const [titleSlot, setTitleSlot] = React.useState<HTMLElement | null>(null);
  const [chatSlot, setChatSlot] = React.useState<HTMLElement | null>(null);
  const [actionsSlot, setActionsSlot] = React.useState<HTMLElement | null>(null);
  const slots = React.useMemo(() => ({ title: titleSlot, actions: actionsSlot }), [titleSlot, actionsSlot]);
  useSearchShortcut(setSearch);

  const toggleNav = React.useCallback(() => setRailState(railState === "collapsed" ? "open" : "collapsed"), [railState, setRailState]);
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

  // The workspace opened last is the one launch reopens.
  React.useEffect(() => {
    if (org && ws && org.lastWorkspace !== ws.id) updateOrg(org.id, { lastWorkspace: ws.id });
  }, [org?.id, ws?.id]);

  const shell = React.useMemo<Shell | null>(() => (ws ? { ws, agentOpen, toggleAgent: () => setAgentOpen(!agentOpen) } : null), [ws, agentOpen, setAgentOpen]);

  if (!org?.cloudflare) return <Navigate to="/" replace />;
  if (!shell || !ws) {
    return (
      <Centered>
        {list || error ? (
          <>
            <h1 className="font-heading text-xl font-semibold text-admin-strong">{error ? "Couldn't read the workspaces" : "This workspace isn't in the account"}</h1>
            <p className="max-w-md text-sm text-admin-muted">{error ?? `There is no ${org.cloudflare.prefix}-ws-${id} in ${org.cloudflare.accountName}.`}</p>
            {error ? <Button size="sm" onClick={() => void refresh()}>Try again</Button> : <Button size="sm" onClick={() => navigate("/")}>Open another workspace</Button>}
          </>
        ) : (
          <Loader2Icon className="size-6 animate-spin text-admin-muted" />
        )}
      </Centered>
    );
  }

  // every section with sub items takes the rail down to icons and opens a second panel beside
  // it, like Shopify's settings; the user's own collapse choice comes back once they leave
  const rest = pathname.slice(`/w/${ws.id}`.length).replace(/^\//, "");
  const sub = subNavFor(ws, rest, (to) => navigate(to));
  const inSubPanel = !!sub;
  const collapsed = inSubPanel || railState === "collapsed";
  const panelOpen = inSubPanel && railState !== "collapsed";
  const chatStart = (collapsed ? NAV_COLLAPSED_WIDTH : NAV_WIDTH) + (panelOpen ? subNavWidth + SUB_NAV_GAP : 0);
  const canvasStart = chatStart + (agentOpen ? chatWidth + CHAT_GAP : 0);

  return (
    <ShellContext.Provider value={shell}>
      <div className="flex h-full w-full flex-col overflow-hidden overscroll-none bg-admin text-foreground">
        <WorkspaceTitleBar ws={ws} canvasStart={canvasStart} chatStart={agentOpen ? chatStart : undefined} animate={!resizing} onToggleSidebar={toggleNav} chatRef={setChatSlot} titleRef={setTitleSlot} actionsRef={setActionsSlot} />
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <WorkspaceSidebar ws={ws} collapsed={collapsed} agentOpen={agentOpen} onToggleAgent={shell.toggleAgent} className="max-md:hidden" />
          {/* the sub panel slides in next to the rail and out again when its page closes */}
          <div className={cn("shrink-0 overflow-hidden max-md:hidden", !resizing && "transition-[width] duration-200 ease-out")} style={{ width: panelOpen ? subNavWidth : 0 }} aria-hidden={!panelOpen}>
            <div className="h-full pt-1 pb-2" style={{ width: subNavWidth }}>
              {sub && <SubNav title={sub.title} items={sub.items} />}
            </div>
          </div>
          {panelOpen && <ResizeHandle label="Resize menu" width={subNavWidth} defaultWidth={SUB_NAV_DEFAULT_WIDTH} onChange={setSubNavWidth} onDragging={setResizing} className="max-md:hidden" style={{ width: SUB_NAV_GAP }} />}
          {/* the agent, in a panel of its own */}
          {agentOpen && (
            <>
              <div className="flex h-full shrink-0 pt-1 pb-2 max-md:hidden" style={{ width: chatWidth }}>
                <AgentSide ws={ws} headerSlot={chatSlot} onClose={() => setAgentOpen(false)} />
              </div>
              <ResizeHandle label="Resize agent" width={chatWidth} defaultWidth={CHAT_SIDE_DEFAULT_WIDTH} onChange={setChatWidth} onDragging={setResizing} className="max-md:hidden" style={{ width: CHAT_GAP }} />
            </>
          )}
          {/* small screens: the sidebar slides over the page */}
          <div className={cn("fixed inset-0 z-40 md:hidden", navOpen ? "" : "pointer-events-none")}>
            <div className={cn("absolute inset-0 bg-black/40 transition-opacity", navOpen ? "opacity-100" : "opacity-0")} onClick={() => setNavOpen(false)} />
            <div className={cn("absolute inset-y-0 start-0 transition-transform duration-200 ease-out", navOpen ? "translate-x-0" : "-translate-x-full")}>
              <WorkspaceSidebar ws={ws} agentOpen={agentOpen} onToggleAgent={shell.toggleAgent} onClose={() => setNavOpen(false)} />
            </div>
          </div>
          <div className="relative flex h-full min-w-0 flex-1 flex-col pt-1 pe-2 pb-2 ps-1 md:ps-0">
            <FrameSlots.Provider value={slots}>
              <Outlet context={{ onOpenNav: () => setNavOpen(true) }} />
            </FrameSlots.Provider>
          </div>
        </div>
        <SearchPalette ws={ws} open={search} onOpenChange={setSearch} />
        <OrgModal />
      </div>
    </ShellContext.Provider>
  );
}

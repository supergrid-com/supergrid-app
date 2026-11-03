import { ChartColumnIcon, CodeIcon, Loader2Icon, WorkflowIcon, type LucideIcon } from "lucide-react";
import * as lucide from "lucide-react";
import * as React from "react";
import { Navigate, Outlet, useLocation, useNavigate, useParams } from "react-router";
import { Button } from "~/components/ui/button";
import { AgentSide } from "~/components/workspace/agent-side";
import { FrameSlots } from "~/components/workspace/frame";
import { ResizeHandle } from "~/components/workspace/resize-handle";
import { NAV_COLLAPSED_WIDTH, WorkspaceSidebar } from "~/components/workspace/sidebar";
import { SubNav, type SubNavGroup, type SubNavItem } from "~/components/workspace/sub-nav";
import { WorkspaceTitleBar } from "~/components/workspace/title-bar";
import { toastManager } from "~/components/ui/toast";
import { useApplyAccent, useWorkspaceAccent } from "~/lib/accent";
import { useAgentContext } from "~/lib/agent/context";
import { useLocalApps, type LocalApp } from "~/lib/apps";
import { useAgent } from "~/lib/agent/provider";
import { useChatSide } from "~/lib/chat-side";
import { updateOrg } from "~/lib/orgs";
import { type DbTable, d1TargetFor, groupLabels, tableLabel, useSchema } from "~/lib/db";
import { ensureMode, useMode } from "~/lib/mode";
import { CHAT_SIDE_DEFAULT_WIDTH, NAV_DEFAULT_WIDTH, SUB_NAV_DEFAULT_WIDTH, usePlatform } from "~/lib/platform";
import { useSession } from "~/lib/session";
import { cn } from "~/lib/utils";
import { useWorkspaces, type WorkspaceSummary } from "~/lib/workspaces";
import { NewTableButton, TableRowIcon } from "~/pages/workspace/database";
import { NewReportButton, NewWorkflowButton } from "~/pages/workspace/workflows/shared";
import { type Report, useReports } from "~/lib/reports";
import { type Workflow, useWorkflows } from "~/lib/workflows";
import { SearchPalette, useSearchShortcut } from "~/shell/command-palette";
import { ShellContext, useStoredFlag, type Shell } from "~/shell/context";
import { DocsModal } from "~/shell/docs-modal";
import { OrgModal } from "~/shell/org-modal";
import { codeSection, sections } from "~/shell/sections";

// A workspace, after v1: the title bar runs the full width above a dark rail, a second panel for
// sections with sub pages, the agent's panel, and the page in a card. The organization's own pages
// open as a modal over it (?org=…). The workspace shown is the deployed one, or in Dev mode the
// one its dev server on this Mac serves (lib/mode.ts), with the Code section in the rail.

/** A lucide icon by the name an app's manifest gives (`list`, `settings`, `file-text`), or null. */
function navIconFor(name: string): LucideIcon | null {
  const pascal = name.replace(/(^|[-_ ])(\w)/g, (_, __, c: string) => c.toUpperCase());
  const icon = (lucide as unknown as Record<string, LucideIcon | undefined>)[`${pascal}Icon`];
  return typeof icon === "function" || (typeof icon === "object" && icon !== null) ? icon : null;
}

// The gaps the resize handles sit in, after the sub panel and after the agent.
const SUB_NAV_GAP = 8;
const CHAT_GAP = 8;

/** The second panel for the current page (a section's sub items, or an app's own menu), or null when it has none. `rest` is the path inside the workspace. */
function subNavFor(ws: WorkspaceSummary, rest: string, go: (to: string) => void, tables: DbTable[] | null, loading = false, lists: { workflows: Workflow[] | null; reports: Report[] | null; loading: boolean } = { workflows: null, reports: null, loading: false }, localApps: LocalApp[] | null = null): { title: string; action?: React.ReactNode; items: SubNavItem[]; groups?: SubNavGroup[]; loading?: boolean } | null {
  const base = `/w/${ws.id}`;
  const parts = rest.split("/");
  const section = [...sections, codeSection].find((s) => s.path === parts[0]);
  if (section?.items) {
    const sub = parts.slice(1).join("/");
    const items: SubNavItem[] = section.items.map((it) => {
      const Icon = it.icon;
      return {
        key: it.path,
        label: it.label,
        icon: <Icon />,
        group: it.group,
        active: it.path === "" ? sub === "" : sub === it.path || sub.startsWith(`${it.path}/`),
        onClick: () => go(`${base}/${section.path}${it.path ? `/${it.path}` : ""}`),
      };
    });
    if (section.path === "workflows") {
      // the workflows and the reports themselves, each group folding and with its own +, then the system pages under a line
      const wfItems: SubNavItem[] = (lists.workflows ?? []).map((w) => ({
        key: `wf:${w.id}`,
        label: w.name,
        icon: <WorkflowIcon className={w.enabled ? undefined : "opacity-50"} />,
        meta: w.runs ? w.runs.toLocaleString() : undefined,
        group: "Workflows",
        active: parts[1] === w.id,
        onClick: () => go(`${base}/workflows/${w.id}`),
      }));
      const reportItems: SubNavItem[] = (lists.reports ?? []).map((r) => ({
        key: `report:${r.id}`,
        label: r.name,
        icon: <ChartColumnIcon />,
        group: "Reports",
        active: parts[1] === "reports" && parts[2] === r.id,
        onClick: () => go(`${base}/workflows/reports/${r.id}`),
      }));
      const noneYet = (group: string, label: string): SubNavItem => ({ key: `none:${group}`, label, group, active: false, onClick: () => {}, note: true });
      const groups: SubNavGroup[] = [
        { label: "Workflows", collapsible: true, meta: wfItems.length ? wfItems.length.toLocaleString() : undefined, action: <NewWorkflowButton /> },
        { label: "Reports", collapsible: true, meta: reportItems.length ? reportItems.length.toLocaleString() : undefined, action: <NewReportButton /> },
        { label: "System", divider: true },
      ];
      const system = items.filter((it) => it.group === "System");
      return {
        title: section.label,
        items: [...(wfItems.length ? wfItems : [noneYet("Workflows", lists.loading && !lists.workflows ? "Loading…" : "None yet")]), ...(reportItems.length ? reportItems : [noneYet("Reports", lists.loading && !lists.reports ? "Loading…" : "None yet")]), ...system],
        groups,
      };
    }
    if (section.path !== "database") return { title: section.label, items };
    // the database lists its tables first, in their groups, with a + for a custom one, and its tools after them.
    // Apps installed without tables still get their group, so an app's place is there before its first migration.
    const list = (tables ?? []).filter((t) => t.name !== "events");
    const groupLabel = (t: DbTable) => (t.group === "app" ? `App · ${ws.apps.find((a) => a.app === t.app)?.name ?? t.app}` : groupLabels[t.group]);
    const tableItems: SubNavItem[] = list.map((t) => ({
      key: `table:${t.name}`,
      label: tableLabel(t),
      icon: <TableRowIcon table={t} />,
      meta: t.count === null ? undefined : t.count.toLocaleString(),
      group: groupLabel(t),
      active: parts[1] === t.name || (!parts[1] && t === list[0]),
      onClick: () => go(`${base}/database/${t.name}`),
    }));
    const appsWithout = ws.apps.filter((a) => !list.some((t) => t.group === "app" && t.app === a.app));
    const appItems: SubNavItem[] = appsWithout.map((a) => ({ key: `app:${a.app}`, label: "No tables yet", icon: <TableRowIcon />, group: `App · ${a.name}`, active: false, onClick: () => go(`${base}/apps/${a.app}`) }));
    const system = list.filter((t) => t.group === "system").length;
    const appGroups = [...new Set([...tableItems, ...appItems].map((it) => it.group!).filter((g) => g.startsWith("App · ")))].map((label): SubNavGroup => ({ label }));
    // core, then each app, then custom; the tools under a line; the folded system group last, under its own line
    const groups: SubNavGroup[] = [{ label: groupLabels.core }, ...appGroups, { label: groupLabels.custom }, { label: "Tools", divider: true }, { label: groupLabels.system, collapsible: true, collapsed: true, divider: true, meta: system ? system.toLocaleString() : undefined }];
    const order = (it: SubNavItem) => (it.group === groupLabels.core ? 0 : it.group?.startsWith("App · ") ? 1 : it.group === groupLabels.custom ? 2 : 3);
    const all = [...tableItems, ...appItems].sort((a, b) => order(a) - order(b) || (a.group ?? "").localeCompare(b.group ?? ""));
    const own = all.filter((it) => it.group !== groupLabels.system);
    const sys = all.filter((it) => it.group === groupLabels.system);
    // no custom tables yet: no group for them; the + above still makes one
    return { title: section.label, action: <NewTableButton />, items: [...own, ...items.map((it) => ({ ...it, group: "Tools" })), ...sys], groups, loading: loading && !tables };
  }
  if (parts[0] === "apps" && parts[1]) {
    // an app's own admin menu, as its manifest declares it (the Worker's ROUTES binding, or the folder in Dev): nested
    // entries become a titled group, `place: "settings"` entries sit under Settings, and in Dev its files close the list
    const app = ws.apps.find((a) => a.app === parts[1]);
    const name = app?.name ?? localApps?.find((l) => l.manifest.id === parts[1])?.manifest.name ?? parts[1];
    const sub = `/${parts.slice(2).join("/")}`;
    const hit = (path: string, match?: string[]) => (path === "/" ? sub === "/" : sub === path || sub.startsWith(`${path}/`) || (match ?? []).some((m) => (m.endsWith("/*") ? sub.startsWith(m.slice(0, -1)) : sub === m)));
    const openNav = (path: string) => go(`${base}/apps/${parts[1]}${path === "/" ? "" : path}`);
    const items: SubNavItem[] = [];
    const groups: SubNavGroup[] = [];
    const nav = app?.nav ?? [];
    for (const n of nav.filter((x) => x.place !== "settings")) {
      const Icon = n.icon ? navIconFor(n.icon) : null;
      items.push({ key: n.id ?? n.path, label: n.label, icon: Icon ? <Icon /> : undefined, active: hit(n.path, n.match) && !(n.children ?? []).some((c) => hit(c.path, c.match)), onClick: () => openNav(n.path) });
      for (const c of n.children ?? []) items.push({ key: c.id ?? c.path, label: c.label, group: n.label, active: hit(c.path, c.match), onClick: () => openNav(c.path) });
      if (n.children?.length) groups.push({ label: n.label });
    }
    const settings = nav.filter((x) => x.place === "settings");
    if (settings.length) {
      groups.push({ label: "Settings", divider: true });
      for (const n of settings) items.push({ key: n.id ?? n.path, label: n.label, group: "Settings", active: hit(n.path, n.match), onClick: () => openNav(n.path) });
    }
    if (ws.dev) {
      groups.push({ label: "Developer", divider: true });
      items.push({ key: "_files", label: "Files", icon: <CodeIcon />, group: "Developer", active: false, onClick: () => go(`${base}/code/files?app=${parts[1]}`) });
    }
    return { title: name, items, groups };
  }
  return null;
}

/** The thread the agent panel shows in this workspace, kept per workspace so a launch reopens it. */
function useThreadId(wsId: string): [string | null, (id: string | null) => void] {
  const key = `sg.thread.${wsId}`;
  const read = React.useCallback(() => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }, [key]);
  const [state, setState] = React.useState(() => ({ key, id: read() }));
  // another workspace opened in the same shell: take its thread
  if (state.key !== key) setState({ key, id: read() });
  const set = React.useCallback(
    (id: string | null) => {
      setState({ key, id });
      try {
        if (id) localStorage.setItem(key, id);
        else localStorage.removeItem(key);
      } catch {}
    },
    [key],
  );
  return [state.key === key ? state.id : read(), set];
}

/** Keeps the agent told where the user is, and moves the app when one of its tools asks (app_navigate). */
function AgentLink({ ws }: { ws: WorkspaceSummary }): null {
  useAgentContext(ws);
  const agent = useAgent();
  const navigate = useNavigate();
  React.useEffect(() => {
    agent.onNavigate = (e) => {
      if (e.wsId === ws.id) navigate(`/w/${ws.id}${e.to ? `/${e.to}` : ""}`);
    };
    return () => {
      agent.onNavigate = null;
    };
  }, [agent, navigate, ws.id]);
  return null;
}

function Centered({ children }: { children: React.ReactNode }): React.ReactElement {
  return <div className="titlebar flex h-full flex-col items-center justify-center gap-3 bg-admin p-8 text-center text-admin-fg">{children}</div>;
}

export function WorkspaceShell(): React.ReactElement {
  const { ws: id } = useParams();
  const { org } = useSession();
  const { list, error, refresh } = useWorkspaces(org?.cloudflare ?? null);
  const cloud = list?.find((w) => w.id === id);
  // in Dev the workspace is its dev server on this Mac, once that has answered (lib/mode.ts)
  const mode = useMode(id ?? "");
  const ws = mode.mode === "dev" && mode.summary && cloud ? mode.summary : cloud;
  React.useEffect(() => {
    if (id && cloud) ensureMode(id);
  }, [id, !!cloud]);
  const switchMode = React.useCallback(
    (to: "live" | "dev") => {
      void mode.setMode(to).catch((e) => toastManager.add({ title: to === "dev" ? "Dev Did Not Start" : "Could Not Switch", description: String((e as Error)?.message ?? e).replace(/^Error invoking remote method '[^']*': (?:Error: )?/, ""), type: "error" }));
    },
    [mode.setMode],
  );
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { railState, setRailState, navWidth, setNavWidth, chatWidth, setChatWidth, subNavWidth, setSubNavWidth } = usePlatform();
  const [agentOpen, setAgentOpen] = useStoredFlag("sg.agent.open", false);
  const [chatSide, setChatSide] = useChatSide(id ?? "");
  const [resizing, setResizing] = React.useState(false);
  const [navOpen, setNavOpen] = React.useState(false);
  const [search, setSearch] = React.useState(false);
  const [titleSlot, setTitleSlot] = React.useState<HTMLElement | null>(null);
  const [actionsSlot, setActionsSlot] = React.useState<HTMLElement | null>(null);
  const [chatSlot, setChatSlot] = React.useState<HTMLElement | null>(null);
  // the title bar takes the page's breadcrumb and, at its end, the page's main action (see title-bar.tsx)
  const slots = React.useMemo(() => ({ title: titleSlot, actions: actionsSlot }), [titleSlot, actionsSlot]);
  useSearchShortcut(setSearch);

  // every section with sub items folds the rail to icons and opens a second panel beside it, like
  // Shopify's settings. The toggle can unfold the rail next to the panel; it folds again once the
  // user moves to another section, and their own collapse choice comes back when they leave.
  const rest = pathname.slice(`/w/${id}`.length).replace(/^\//, "");
  const target = React.useMemo(() => (ws ? d1TargetFor(ws, org?.cloudflare?.accountId) : null), [org?.cloudflare?.accountId, ws?.worker, ws?.id, ws?.url, ws?.dev]);
  const { tables, loading: tablesLoading } = useSchema(rest.startsWith("database") ? target : null);
  const inWorkflows = rest.startsWith("workflows");
  const workflows = useWorkflows(inWorkflows && ws ? ws.id : null);
  const reports = useReports(inWorkflows ? target : null);
  const localApps = useLocalApps(rest.startsWith("apps/") && ws ? ws.id : null);
  const sub = ws ? subNavFor(ws, rest, (to) => navigate(to), tables, tablesLoading, { workflows: workflows.data, reports: reports.data, loading: workflows.loading || reports.loading }, localApps.data) : null;
  const subKey = sub?.title ?? null;
  const [railOpenIn, setRailOpenIn] = React.useState<string | null>(null);
  if (railOpenIn !== null && railOpenIn !== subKey) setRailOpenIn(null);

  const toggleNav = React.useCallback(() => {
    if (subKey) setRailOpenIn(railOpenIn === subKey ? null : subKey);
    else setRailState(railState === "collapsed" ? "open" : "collapsed");
  }, [subKey, railOpenIn, railState, setRailState]);
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

  // the workspace's own accent, as its owner picked it in Appearance (lib/accent.ts)
  useApplyAccent(useWorkspaceAccent(id ?? "")[0]);

  const [threadId, setThreadId] = useThreadId(id ?? "");
  const openThread = React.useCallback(
    (thread: string | null) => {
      setThreadId(thread);
      setAgentOpen(true);
    },
    [setThreadId, setAgentOpen],
  );
  const shell = React.useMemo<Shell | null>(
    () =>
      ws
        ? {
            ws,
            agentOpen,
            toggleAgent: () => setAgentOpen(!agentOpen),
            threadId,
            openThread,
          }
        : null,
    [ws, agentOpen, setAgentOpen, threadId, openThread],
  );

  if (!org?.cloudflare) return <Navigate to="/" replace />;
  if (!shell || !ws) {
    return (
      <Centered>
        {list || error ? (
          <>
            <h1 className="font-heading text-xl font-semibold text-admin-strong">{error ? "Couldn't read the workspaces" : "This workspace isn't in the account"}</h1>
            <p className="max-w-md text-sm text-admin-muted">{error ?? `There is no ${org.cloudflare.prefix}-ws-${id} in ${org.cloudflare.accountName}.`}</p>
            {error ? <Button size="sm" onClick={() => void refresh()}>Try Again</Button> : <Button size="sm" onClick={() => navigate("/")}>Open Another Workspace</Button>}
          </>
        ) : (
          <Loader2Icon className="size-6 animate-spin text-admin-muted" />
        )}
      </Centered>
    );
  }

  const panelOpen = !!sub;
  const collapsed = subKey ? railOpenIn !== subKey : railState === "collapsed";
  const chatLeft = agentOpen && chatSide === "left";
  const chatRight = agentOpen && chatSide === "right";
  const chatStart = (collapsed ? NAV_COLLAPSED_WIDTH : navWidth) + (panelOpen ? subNavWidth + SUB_NAV_GAP : 0);
  const canvasStart = chatStart + (chatLeft ? chatWidth + CHAT_GAP : 0);
  const agent = (
    <div className={cn("flex h-full shrink-0 pt-1 pb-2 max-md:hidden", chatRight && "pe-2")} style={{ width: chatWidth + (chatRight ? 8 : 0) }}>
      <AgentSide ws={ws} threadId={threadId} onOpenThread={setThreadId} headerSlot={chatSlot} side={chatSide} onPin={setChatSide} onClose={() => setAgentOpen(false)} />
    </div>
  );
  const agentHandle = <ResizeHandle label="Resize Agent" width={chatWidth} defaultWidth={CHAT_SIDE_DEFAULT_WIDTH} onChange={setChatWidth} onDragging={setResizing} invert={chatRight} className="max-md:hidden" style={{ width: CHAT_GAP }} />;

  return (
    <ShellContext.Provider value={shell}>
      {/* while a panel is dragged, nothing inside animates (see [data-resizing] in app.css) */}
      <div className="flex h-full w-full flex-col overflow-hidden overscroll-none bg-admin text-foreground" data-resizing={resizing || undefined}>
        <WorkspaceTitleBar canvasStart={canvasStart} chatStart={chatLeft ? chatStart : undefined} chatEnd={chatRight ? chatWidth : undefined} animate={!resizing} onToggleSidebar={toggleNav} mode={{ mode: mode.mode, switching: mode.switching, onChange: switchMode }} chatRef={setChatSlot} titleRef={setTitleSlot} actionsRef={setActionsSlot} />
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <WorkspaceSidebar ws={ws} width={navWidth} animate={!resizing} collapsed={collapsed} className="max-md:hidden" />
          {/* the open rail resizes from its right edge; the handle takes no room of its own */}
          {!collapsed && <ResizeHandle label="Resize Sidebar" width={navWidth} defaultWidth={NAV_DEFAULT_WIDTH} onChange={setNavWidth} onDragging={setResizing} className="max-md:hidden" style={{ width: 0 }} />}
          {/* the sub panel slides in next to the rail and out again when its page closes */}
          <div className={cn("shrink-0 overflow-hidden max-md:hidden", !resizing && "transition-[width] duration-200 ease-out")} style={{ width: panelOpen ? subNavWidth : 0 }} aria-hidden={!panelOpen}>
            <div className="h-full pt-1 pb-2" style={{ width: subNavWidth }}>
              {sub && <SubNav title={sub.title} action={sub.action} items={sub.items} groups={sub.groups} loading={sub.loading} />}
            </div>
          </div>
          {panelOpen && <ResizeHandle label="Resize Menu" width={subNavWidth} defaultWidth={SUB_NAV_DEFAULT_WIDTH} onChange={setSubNavWidth} onDragging={setResizing} className="max-md:hidden" style={{ width: SUB_NAV_GAP }} />}
          {/* the agent, in a panel of its own, before the page or (pinned) after it */}
          {chatLeft && (
            <>
              {agent}
              {agentHandle}
            </>
          )}
          {/* small screens: the sidebar slides over the page */}
          <div className={cn("fixed inset-0 z-40 md:hidden", navOpen ? "" : "pointer-events-none")}>
            <div className={cn("absolute inset-0 bg-black/40 transition-opacity", navOpen ? "opacity-100" : "opacity-0")} onClick={() => setNavOpen(false)} />
            <div className={cn("absolute inset-y-0 start-0 transition-transform duration-200 ease-out", navOpen ? "translate-x-0" : "-translate-x-full")}>
              <WorkspaceSidebar ws={ws} onClose={() => setNavOpen(false)} />
            </div>
          </div>
          <div className={cn("relative flex h-full min-w-0 flex-1 flex-col pt-1 pb-2 ps-1 md:ps-0", chatRight ? "pe-0" : "pe-2")}>
            <FrameSlots.Provider value={slots}>
              <Outlet context={{ onOpenNav: () => setNavOpen(true) }} />
            </FrameSlots.Provider>
          </div>
          {chatRight && (
            <>
              {agentHandle}
              {agent}
            </>
          )}
        </div>
        <SearchPalette ws={ws} open={search} onOpenChange={setSearch} />
        <OrgModal />
        <DocsModal />
        <AgentLink ws={ws} />
      </div>
    </ShellContext.Provider>
  );
}

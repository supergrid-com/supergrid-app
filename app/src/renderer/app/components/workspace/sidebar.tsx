import { BuildingIcon, CheckIcon, ChevronRightIcon, ChevronsUpDownIcon, CloudIcon, LoaderCircleIcon, MessageCircleIcon, PackageIcon, PanelLeftIcon, PlusIcon, SettingsIcon, SunMoonIcon, TriangleAlertIcon } from "lucide-react";
import * as React from "react";
import { useLocation, useNavigate } from "react-router";
import { Shimmer } from "~/components/shimmer";
import { Menu, MenuGroup, MenuGroupLabel, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "~/components/ui/menu";
import { Tooltip, TooltipPopup, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { NAV_DEFAULT_WIDTH } from "~/lib/platform";
import { useSession } from "~/lib/session";
import { mockThreads, type Thread, type ThreadStatus } from "~/lib/threads-mock";
import { cn } from "~/lib/utils";
import { useWorkspaces, type WorkspaceSummary } from "~/lib/workspaces";
import { useOrgModal, useShell } from "~/shell/context";
import { sections, type Section } from "~/shell/sections";

// The workspace sidebar: a dark rail with the workspace's sections, after Shopify's admin. One
// row per section; a section's sub items open in the second panel (sub-nav.tsx), never here.
// The workspace sits up top as a switcher (other workspaces, a new one, the settings links).
// Then the core sections, the workspace's installed apps (read from its Worker), the developer
// surfaces, and the agent and Settings at the foot.
//
// Collapsed (⌘B) it is icons only. Both states are the same DOM: the rail animates its width,
// every icon sits in the same column either way, and the labels clip and fade. Open, its width
// can be dragged from its right edge, like the agent panel's.

export const NAV_COLLAPSED_WIDTH = 60;
const DURATION = "duration-200";

// A row: icon in a fixed slot on the left, label after it. The button clips, so the label
// slides out of view as the rail narrows.
const rowClass =
  "relative flex h-9 w-full cursor-pointer items-center gap-2.5 overflow-hidden whitespace-nowrap rounded-lg ps-2.5 pe-2 text-left text-sm font-normal tracking-wide text-admin-fg outline-none transition-colors hover:bg-admin-hover hover:text-admin-strong focus-visible:ring-2 focus-visible:ring-admin-ring";
const activeRowClass = "bg-admin-active font-medium text-admin-strong hover:bg-admin-active [&_svg]:text-active";
const iconSlotClass = "flex size-4 shrink-0 items-center justify-center [&_svg]:size-4";

const SidebarContext = React.createContext<{ onClose: () => void; collapsed: boolean }>({ onClose: () => {}, collapsed: false });

// The part of a row that disappears when collapsed.
function Label({ children, className }: { children: React.ReactNode; className?: string }): React.ReactElement {
  const { collapsed } = React.useContext(SidebarContext);
  return <span className={cn("min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap transition-opacity", DURATION, collapsed ? "opacity-0" : "opacity-100", className)}>{children}</span>;
}

// The rail's tooltips take the admin layer's colors (Graphite, Mist…), not the page's.
const railTooltipClass = "border-admin-line bg-admin-raised text-admin-strong shadow-lg/20 before:hidden";

// Wraps a row so its label shows as a tooltip once the rail is collapsed.
function RailTooltip({ label, children }: { label: React.ReactNode; children: React.ReactElement }): React.ReactElement {
  const { collapsed } = React.useContext(SidebarContext);
  return (
    <Tooltip disabled={!collapsed}>
      <TooltipTrigger render={children} />
      <TooltipPopup side="right" className={railTooltipClass}>
        {label}
      </TooltipPopup>
    </Tooltip>
  );
}

function Row({ icon, label, onClick, active }: { icon: React.ReactNode; label: string; onClick: () => void; active: boolean }): React.ReactElement {
  const { onClose } = React.useContext(SidebarContext);
  return (
    <li>
      <RailTooltip label={label}>
        <button
          type="button"
          className={cn(rowClass, active && activeRowClass)}
          aria-label={label}
          aria-current={active ? "page" : undefined}
          onClick={() => {
            onClick();
            onClose();
          }}
        >
          <span className={iconSlotClass}>{icon}</span>
          <Label>{label}</Label>
        </button>
      </RailTooltip>
    </li>
  );
}

// A thread's state at the end of its row, after Claude Code's session list: an amber pulse when it
// is waiting on you, a blue dot when it finished since you looked, a red warning when it failed.
// Working shows in the row itself (a spinner and a shimmering title); idle shows nothing.
const statusLabel: Record<ThreadStatus, string> = { working: "Working", "needs-input": "Needs your input", done: "Done, not viewed yet", failed: "Failed", idle: "" };

function StatusMark({ status }: { status: ThreadStatus }): React.ReactElement | null {
  if (status === "done") return <span aria-hidden className="size-2 shrink-0 rounded-full bg-info" />;
  if (status === "needs-input")
    return (
      <span aria-hidden className="relative flex size-2 shrink-0">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-warning opacity-60" />
        <span className="relative inline-flex size-2 rounded-full bg-warning" />
      </span>
    );
  if (status === "failed") return <TriangleAlertIcon aria-hidden className="size-3.5 shrink-0 text-destructive!" />;
  return null;
}

function ThreadRow({ thread, status, active, onOpen }: { thread: Thread; status: ThreadStatus; active: boolean; onOpen: () => void }): React.ReactElement {
  const { onClose } = React.useContext(SidebarContext);
  const working = status === "working";
  return (
    <li>
      <button
        type="button"
        className={cn(rowClass, active && activeRowClass)}
        aria-label={statusLabel[status] ? `${thread.title}, ${statusLabel[status].toLowerCase()}` : thread.title}
        aria-current={active ? "page" : undefined}
        onClick={() => {
          onOpen();
          onClose();
        }}
      >
        <span className={iconSlotClass}>{working ? <LoaderCircleIcon className="animate-spin [animation-duration:1.4s]" /> : <MessageCircleIcon />}</span>
        <Label>{working ? <Shimmer className="[--foreground:var(--admin-strong)] [--muted-foreground:var(--admin-muted)]">{thread.title}</Shimmer> : thread.title}</Label>
        <StatusMark status={status} />
      </button>
    </li>
  );
}

// The agent's threads (mock for now, lib/threads-mock.ts): the latest four, a new one, and the
// rest unfolded in place. Opening one shows it in the agent panel, and a finished one counts as
// seen from then on.
function Threads(): React.ReactElement {
  const { agentOpen, threadId, openThread } = useShell();
  const [all, setAll] = React.useState(false);
  const [seen, setSeen] = React.useState<ReadonlySet<string>>(new Set());
  const shown = all ? mockThreads : mockThreads.slice(0, 4);
  const statusOf = (t: Thread): ThreadStatus => (t.status === "done" && seen.has(t.id) ? "idle" : t.status);
  return (
    <>
      <li className="flex h-8 items-center justify-between ps-2.5 pe-1">
        {/* the heading folds the list like the link under it: the latest four, or all of them */}
        <button
          type="button"
          onClick={() => setAll(!all)}
          aria-expanded={all}
          className="group/threads -ms-1 flex h-6 cursor-pointer items-center gap-1 rounded-md ps-1 pe-1.5 text-[11px] font-medium uppercase tracking-wider text-admin-dim outline-none transition-colors hover:text-admin-strong focus-visible:ring-2 focus-visible:ring-admin-ring"
        >
          Threads
          <ChevronRightIcon className={cn("size-3 opacity-0 transition-[transform,opacity] group-hover/threads:opacity-100 group-focus-visible/threads:opacity-100", all && "rotate-90 opacity-100")} />
        </button>
        <Tooltip>
          <TooltipTrigger
            render={<button type="button" aria-label="New thread" onClick={() => openThread(null)} className="flex size-6 cursor-pointer items-center justify-center rounded-md text-admin-muted outline-none hover:bg-admin-hover hover:text-admin-strong focus-visible:ring-2 focus-visible:ring-admin-ring" />}
          >
            <PlusIcon className="size-4" />
          </TooltipTrigger>
          <TooltipPopup className={railTooltipClass}>New thread</TooltipPopup>
        </Tooltip>
      </li>
      {shown.map((t) => (
        <ThreadRow
          key={t.id}
          thread={t}
          status={statusOf(t)}
          active={agentOpen && threadId === t.id}
          onOpen={() => {
            setSeen((s) => new Set(s).add(t.id));
            openThread(t.id);
          }}
        />
      ))}
      {mockThreads.length > 4 && (
        <li>
          <button type="button" onClick={() => setAll(!all)} className="flex h-8 w-full cursor-pointer items-center rounded-lg ps-2.5 text-left text-sm text-admin-dim outline-none transition-colors hover:text-admin-strong focus-visible:ring-2 focus-visible:ring-admin-ring">
            {all ? "Show fewer" : `All threads · ${mockThreads.length}`}
          </button>
        </li>
      )}
    </>
  );
}

// A group: a hairline above, a title that folds away when the rail is collapsed, and its rows.
function Group({ title, children }: { title: string; children: React.ReactNode }): React.ReactElement {
  const { collapsed } = React.useContext(SidebarContext);
  return (
    <>
      <li aria-hidden className="mx-2 my-2 h-px bg-admin-line" />
      <li aria-hidden className={cn("overflow-hidden ps-2.5 text-[11px] font-medium uppercase tracking-wider text-admin-dim transition-all", DURATION, collapsed ? "h-0 opacity-0" : "mt-2 mb-1 h-4 opacity-100")}>
        {title}
      </li>
      {children}
    </>
  );
}

// The workspace's badge: its first letter on the active color.
const markClass = "relative flex size-6 shrink-0 items-center justify-center rounded-md bg-active text-[11px] font-bold text-active-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]";
const smallMarkClass = "flex size-5 items-center justify-center rounded-md bg-active text-[10px] font-bold text-active-foreground";

// The header row: as wide as a nav row and laid out like one. The badge is centered on the nav's
// icon column (6px in, 24px wide, like the 16px icons 10px in) and the name starts where the nav
// labels do. Its hover background is a layer of its own over the whole row, and the switcher icon
// stays faint until the row is hovered or its menu is open.
const headerTriggerClass = "group relative flex h-10 w-full min-w-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg ps-1.5 pe-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-admin-ring";
const headerHoverClass = "pointer-events-none absolute inset-0 rounded-lg bg-admin-hover opacity-0 transition-opacity group-hover:opacity-100 group-data-[popup-open]:opacity-100";

const menuItemClass = "min-h-9 gap-2.5 rounded-md px-2.5 sm:min-h-8.5";

// The switcher: the organization's workspaces, a new one, and links to the settings that aren't
// the workspace's own (they open the settings modal).
function WorkspaceMenu({ ws }: { ws: WorkspaceSummary }): React.ReactElement {
  const { org } = useSession();
  const { list } = useWorkspaces(org?.cloudflare ?? null);
  const { collapsed } = React.useContext(SidebarContext);
  const navigate = useNavigate();
  const modal = useOrgModal();
  return (
    <Menu>
      <RailTooltip label={ws.name}>
        <MenuTrigger render={<button type="button" aria-label={`${ws.name}, switch workspace`} className={headerTriggerClass} />}>
          <span aria-hidden className={headerHoverClass} />
          <span className={markClass}>{ws.name.slice(0, 1).toUpperCase()}</span>
          <Label className="relative truncate font-heading text-[15px] font-semibold tracking-wide text-admin-strong">{ws.name}</Label>
          <Label className="flex flex-none items-center">
            <ChevronsUpDownIcon className="relative size-4 text-admin-fg opacity-10 transition-opacity group-hover:opacity-100 group-data-[popup-open]:opacity-100" />
          </Label>
        </MenuTrigger>
      </RailTooltip>
      <MenuPopup align="start" side={collapsed ? "right" : "bottom"} className="w-64 p-1">
        <MenuGroup className="flex flex-col gap-0.5">
          <MenuGroupLabel className="px-2.5 pt-1.5 pb-1">Workspaces</MenuGroupLabel>
          {(list ?? [ws]).map((w) => (
            <MenuItem key={w.id} className={menuItemClass} onClick={() => navigate(`/w/${w.id}`)}>
              <span className={smallMarkClass}>{w.name.slice(0, 1).toUpperCase()}</span>
              <span className="flex-1 truncate">{w.name}</span>
              {w.id === ws.id && <CheckIcon className="size-4" />}
            </MenuItem>
          ))}
          <MenuItem className={menuItemClass} onClick={() => modal.open("workspaces", { create: true })}>
            <PlusIcon />
            New workspace
          </MenuItem>
        </MenuGroup>
        <MenuSeparator className="my-1.5" />
        <MenuGroup className="flex flex-col gap-0.5">
          <MenuItem className={menuItemClass} onClick={() => modal.open("organization")}>
            <BuildingIcon />
            Organization
          </MenuItem>
          <MenuItem className={menuItemClass} onClick={() => modal.open("cloudflare")}>
            <CloudIcon />
            Cloudflare
          </MenuItem>
          <MenuItem className={menuItemClass} onClick={() => modal.open("appearance")}>
            <SunMoonIcon />
            Appearance
          </MenuItem>
        </MenuGroup>
      </MenuPopup>
    </Menu>
  );
}

export function WorkspaceSidebar({
  ws,
  width = NAV_DEFAULT_WIDTH,
  animate = true,
  collapsed = false,
  agentOpen,
  onToggleAgent,
  onClose = () => {},
  className,
}: {
  ws: WorkspaceSummary;
  /** The open rail's width (the user drags it, see workspace-shell.tsx). */
  width?: number;
  /** Off while the width is being dragged, so the rail follows the pointer. */
  animate?: boolean;
  collapsed?: boolean;
  agentOpen: boolean;
  onToggleAgent: () => void;
  onClose?: () => void;
  className?: string;
}): React.ReactElement {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const modal = useOrgModal();
  const base = `/w/${ws.id}`;
  const rest = pathname.slice(base.length).replace(/^\//, "");
  const isActive = (path: string) => (path === "" ? rest === "" : rest === path || rest.startsWith(`${path}/`));
  const row = (s: Section) => <Row key={s.path} icon={<s.icon />} label={s.label} active={isActive(s.path)} onClick={() => navigate(`${base}${s.path ? `/${s.path}` : ""}`)} />;
  const group = (g: Section["group"]) => sections.filter((s) => s.group === g).map(row);
  return (
    <SidebarContext.Provider value={{ onClose, collapsed }}>
      {/* the rail's own tooltip timing: collapsed icons name themselves almost at once */}
      <TooltipProvider delay={40} closeDelay={0}>
        <aside
          className={cn("flex h-full shrink-0 flex-col overflow-hidden bg-admin text-admin-fg", animate && "transition-[width] ease-out", DURATION, className)}
          style={{ width: collapsed ? NAV_COLLAPSED_WIDTH : width }}
          data-collapsed={collapsed || undefined}
        >
          {/* header: the workspace, its badge in the icon column */}
          <div className="flex h-14 shrink-0 items-center gap-1 overflow-hidden px-3">
            <div className="min-w-0 flex-1">
              <WorkspaceMenu ws={ws} />
            </div>
            <Tooltip>
              <TooltipTrigger render={<button type="button" aria-label="Hide sidebar" onClick={onClose} className="flex size-8 cursor-pointer items-center justify-center rounded-md text-admin-muted outline-none hover:bg-admin-hover hover:text-admin-strong md:hidden" />}>
                <PanelLeftIcon className="size-4" />
              </TooltipTrigger>
              <TooltipPopup>Hide</TooltipPopup>
            </Tooltip>
          </div>
          {/* open, the Threads header sits right under the workspace switcher; folded, the icons keep their gap */}
          <nav className={cn("min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 pb-4 [scrollbar-color:var(--admin-active)_transparent] [scrollbar-width:thin]", collapsed ? "pt-2" : "pt-0")}>
            <ul className="flex flex-col gap-0.5">
              {/* the threads, above the nav; folded to icons the agent row at the foot covers them */}
              {!collapsed && (
                <>
                  <Threads />
                  <li aria-hidden className="mx-2 my-2 h-px bg-admin-line" />
                </>
              )}
              {group("main")}
              <Group title="Content">{group("content")}</Group>
              <Group title="Apps">
                {ws.apps.map((a) => (
                  <Row key={a.app} icon={<PackageIcon />} label={a.name} active={isActive(`apps/${a.app}`)} onClick={() => navigate(`${base}/apps/${a.app}`)} />
                ))}
                <Row icon={<PlusIcon />} label="Add an app" active={false} onClick={() => modal.open("apps")} />
              </Group>
              <Group title="Developer">{group("developer")}</Group>
            </ul>
          </nav>
          <div className="shrink-0 px-3 pb-4 pt-2">
            <ul className="flex flex-col gap-0.5">
              {/* the agent is a panel, not a page: this row opens and closes it */}
              <Row icon={<MessageCircleIcon className={agentOpen ? "text-active" : undefined} />} label="Agent" active={false} onClick={onToggleAgent} />
              <Row icon={<SettingsIcon />} label="Settings" active={!!modal.section} onClick={() => modal.open("general")} />
            </ul>
          </div>
        </aside>
      </TooltipProvider>
    </SidebarContext.Provider>
  );
}

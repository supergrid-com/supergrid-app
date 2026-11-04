import { BookOpenIcon, BuildingIcon, CheckIcon, ChevronRightIcon, ChevronsUpDownIcon, CloudIcon, LoaderCircleIcon, MessageCircleIcon, PanelLeftIcon, PlusIcon, Settings2Icon, SunMoonIcon, TriangleAlertIcon } from "lucide-react";
import * as React from "react";
import { useLocation, useNavigate } from "react-router";
import { Shimmer } from "~/components/shimmer";
import { SuperGridMark } from "~/components/supergrid-logo";
import { Badge } from "~/components/ui/badge";
import { PopoverPrimitive } from "~/components/ui/popover";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Menu, MenuGroup, MenuGroupLabel, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "~/components/ui/menu";
import { Tooltip, TooltipPopup, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { useThreads, type ThreadStatus, type ThreadSummary } from "~/lib/agent/provider";
import { NAV_DEFAULT_WIDTH } from "~/lib/platform";
import { useSession } from "~/lib/session";
import { useLocalApps } from "~/lib/apps";
import { useMode } from "~/lib/mode";
import { AppGlyph } from "~/components/workspace/app-icon";
import { NewAppDialog } from "~/components/workspace/new-app-dialog";
import { cn } from "~/lib/utils";
import { useWorkspaces, type WorkspaceSummary } from "~/lib/workspaces";
import { useDocsModal, useOrgModal, useShell, useStoredFlag } from "~/shell/context";
import { codeSection, sections, type Section } from "~/shell/sections";

// The workspace sidebar: a dark rail with the workspace's sections, after Shopify's admin. One
// row per section; a section's sub items open in the second panel (sub-nav.tsx), never here.
// The workspace sits up top as a switcher (other workspaces, a new one, the settings links).
// Under it the agent's threads, the workspace's apps, then its core surfaces (database, workflows,
// events, library). Settings opens from the switcher's menu; the foot carries the SuperGrid mark and
// the docs button.
//
// Collapsed (⌘B) it is icons only. Both states are the same DOM: the rail animates its width,
// every icon sits in the same column either way, and the labels clip and fade. Open, its width
// can be dragged from its right edge, like the agent panel's.

export const NAV_COLLAPSED_WIDTH = 60;
const DURATION = "duration-200";

// A row: icon in a fixed slot on the left, label after it. The button clips, so the label
// slides out of view as the rail narrows.
const rowClass =
  "relative flex h-9 w-full cursor-pointer items-center gap-2.5 overflow-hidden whitespace-nowrap rounded-lg ps-2.5 pe-2 text-left text-[14px] font-normal tracking-wide text-admin-fg outline-none transition-colors hover:bg-admin-hover hover:text-admin-strong focus-visible:ring-2 focus-visible:ring-admin-ring";
const activeRowClass = "bg-admin-active font-medium text-admin-strong hover:bg-admin-active [&_svg]:text-admin-accent";
const iconSlotClass = "flex size-4 shrink-0 items-center justify-center [&_svg]:size-4";

// `popover` marks rows drawn in the threads popover, which takes the default popover colors
// (like the workspace menu) rather than the rail's admin ones.
const SidebarContext = React.createContext<{ onClose: () => void; collapsed: boolean; popover?: boolean }>({ onClose: () => {}, collapsed: false });

// The part of a row that disappears when collapsed.
function Label({ children, className }: { children: React.ReactNode; className?: string }): React.ReactElement {
  const { collapsed } = React.useContext(SidebarContext);
  return <span className={cn("min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap transition-opacity", DURATION, collapsed ? "opacity-0" : "opacity-100", className)}>{children}</span>;
}

// A section's heading: a button that folds what's under it, with a chevron that shows on hover.
const headingClass =
  "group/heading -ms-1 flex h-6 cursor-pointer items-center gap-1 rounded-md ps-1 pe-1.5 text-[11px] font-medium uppercase tracking-wider text-admin-muted outline-none transition-colors hover:text-admin-strong focus-visible:ring-2 focus-visible:ring-admin-ring";
const chevronClass = "size-3 opacity-0 transition-[transform,opacity] group-hover/heading:opacity-100 group-focus-visible/heading:opacity-100";

// A group's heading row: the folding title, and an action at its end. Collapsed, the row folds
// away and the group's rows always show, since there is no title left to open them with.
function GroupHeading({ title, open, onToggle, action }: { title: string; open: boolean; onToggle: () => void; action?: React.ReactNode }): React.ReactElement {
  const { collapsed } = React.useContext(SidebarContext);
  return (
    <li className={cn("flex items-center justify-between overflow-hidden ps-2.5 pe-1 transition-all", DURATION, collapsed ? "h-0 opacity-0" : "h-8 opacity-100")}>
      <button type="button" onClick={onToggle} aria-expanded={open} tabIndex={collapsed ? -1 : undefined} className={headingClass}>
        {title}
        <ChevronRightIcon className={cn(chevronClass, open ? "rotate-90" : "opacity-100")} />
      </button>
      {action}
    </li>
  );
}

// A section header's small icon button (new thread, add an app, settings).
const plusClass = "flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-admin-muted outline-none hover:bg-admin-hover hover:text-admin-strong focus-visible:ring-2 focus-visible:ring-admin-ring";

// The rail's tooltips take the admin layer's colors (Graphite, Mist…), not the page's.
const railTooltipClass = "border-admin-line bg-admin-raised text-admin-strong shadow-lg/20 before:hidden";

// The threads popover's rows, header button and frame, after the menu's (ui/menu.tsx).
const popoverRowClass =
  "flex min-h-8 w-full cursor-pointer select-none items-center gap-2 overflow-hidden whitespace-nowrap rounded-sm px-2 text-left text-sm text-foreground outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent [&_svg]:opacity-80";
const popoverActiveRowClass = "bg-accent font-medium text-accent-foreground";
const popoverPlusClass = "flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-sm text-muted-foreground outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent";
const popoverClass =
  "relative flex max-h-[min(480px,var(--available-height))] w-72 origin-(--transform-origin) flex-col rounded-lg border bg-popover not-dark:bg-clip-padding text-popover-foreground shadow-lg/5 outline-none transition-[scale,opacity] duration-150 before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-lg)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)] data-ending-style:opacity-0 data-starting-style:scale-98 data-starting-style:opacity-0 dark:before:shadow-[0_-1px_--theme(--color-white/6%)]";

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

function Row({ icon, label, onClick, active, trailing }: { icon: React.ReactNode; label: string; onClick: () => void; active: boolean; /** At the row's end, hidden with the label when the rail folds: a "Dev" mark on an app that is only a folder here. */ trailing?: React.ReactNode }): React.ReactElement {
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
          {trailing && <Label className="flex-none">{trailing}</Label>}
        </button>
      </RailTooltip>
    </li>
  );
}

// A thread's state at the end of its row, after Claude Code's session list: an amber pulse when it
// is waiting on you, a blue dot when it finished since you looked, a red warning when it failed.
// Working shows in the row itself (a spinner and a shimmering title); idle shows nothing.
const statusLabel: Record<ThreadStatus, string> = { working: "Working", "needs-input": "Needs your input", done: "Done, not viewed yet", failed: "Failed", idle: "" };

export function StatusMark({ status }: { status: ThreadStatus }): React.ReactElement | null {
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

function ThreadRow({ thread, active, onOpen }: { thread: ThreadSummary; active: boolean; onOpen: () => void }): React.ReactElement {
  const { status } = thread;
  const { onClose, popover } = React.useContext(SidebarContext);
  const working = status === "working";
  return (
    <li>
      <button
        type="button"
        className={popover ? cn(popoverRowClass, active && popoverActiveRowClass) : cn(rowClass, active && activeRowClass)}
        aria-label={statusLabel[status] ? `${thread.title}, ${statusLabel[status].toLowerCase()}` : thread.title}
        aria-current={active ? "page" : undefined}
        onClick={() => {
          onOpen();
          onClose();
        }}
      >
        <span className={iconSlotClass}>{working ? <LoaderCircleIcon className="animate-spin [animation-duration:1.4s]" /> : <MessageCircleIcon />}</span>
        <Label>{working ? <Shimmer className={popover ? undefined : "[--foreground:var(--admin-strong)] [--muted-foreground:var(--admin-muted)]"}>{thread.title}</Shimmer> : thread.title}</Label>
        <StatusMark status={status} />
      </button>
    </li>
  );
}

// The agent's threads (lib/agent/provider.tsx): Muse Code's sessions in this workspace's folder,
// the latest four, a new one, and the rest unfolded in place. Opening one shows it in the agent
// panel, and a finished one counts as seen from then on. With the rail folded (or a second panel
// open) they become one chat icon that opens them all in a popover.
function Threads({ ws }: { ws: WorkspaceSummary }): React.ReactElement {
  const { collapsed } = React.useContext(SidebarContext);
  const { agentOpen, threadId, openThread } = useShell();
  const threads = useThreads(ws.id);
  const [all, setAll] = React.useState(false);
  const rows = (list: ThreadSummary[]) =>
    list.map((t) => <ThreadRow key={t.id} thread={t} active={agentOpen && threadId === t.id} onOpen={() => openThread(t.id)} />);
  // the popover passes its close, and its button takes the popover's colors
  const newThread = (onDone?: () => void) => (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label="New Thread"
            onClick={() => {
              openThread(null);
              onDone?.();
            }}
            className={onDone ? popoverPlusClass : plusClass}
          />
        }
      >
        <PlusIcon className="size-4" />
      </TooltipTrigger>
      <TooltipPopup className={onDone ? undefined : railTooltipClass}>New Thread</TooltipPopup>
    </Tooltip>
  );
  if (collapsed) return <ThreadsPopover threads={threads} rows={rows} newThread={newThread} />;
  return (
    <>
      <li className="flex h-8 items-center justify-between ps-2.5 pe-1">
        {/* the heading folds the list like the link under it: the latest four, or all of them */}
        <button
          type="button"
          onClick={() => setAll(!all)}
          aria-expanded={all}
          className={headingClass}
        >
          Threads
          <ChevronRightIcon className={cn(chevronClass, all && "rotate-90 opacity-100")} />
        </button>
        {newThread()}
      </li>
      {rows(all ? threads : threads.slice(0, 4))}
      {threads.length > 4 && (
        <li>
          <button type="button" onClick={() => setAll(!all)} className="flex h-8 w-full cursor-pointer items-center rounded-lg ps-2.5 text-left text-sm text-admin-dim outline-none transition-colors hover:text-admin-strong focus-visible:ring-2 focus-visible:ring-admin-ring">
            {all ? "Show fewer" : `All threads · ${threads.length}`}
          </button>
        </li>
      )}
    </>
  );
}

// The folded threads: a chat icon in the icon column, marked when a thread waits on you (amber) or
// finished unseen (blue), opening every thread in a popover beside the rail. Rows in the popover
// are full width, so it gives them an open rail's context, and opening one closes it.
function ThreadsPopover({
  threads,
  rows,
  newThread,
}: {
  threads: ThreadSummary[];
  rows: (list: ThreadSummary[]) => React.ReactNode;
  newThread: (onDone?: () => void) => React.ReactNode;
}): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const statuses = threads.map((t) => t.status);
  const mark = statuses.includes("needs-input") ? "bg-warning" : statuses.includes("done") ? "bg-info" : null;
  const close = () => setOpen(false);
  return (
    <li>
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <RailTooltip label="Threads">
          <PopoverPrimitive.Trigger render={<button type="button" aria-label="Threads" className={cn(rowClass, "data-[popup-open]:bg-admin-active data-[popup-open]:text-admin-strong")} />}>
            <span className={cn(iconSlotClass, "relative")}>
              <MessageCircleIcon />
              {mark && <span aria-hidden className={cn("absolute -end-0.5 -top-0.5 size-1.5 rounded-full ring-2 ring-admin", mark)} />}
            </span>
            <Label>Threads</Label>
          </PopoverPrimitive.Trigger>
        </RailTooltip>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Positioner side="right" align="start" sideOffset={10} className="z-50">
            <PopoverPrimitive.Popup className={popoverClass}>
              <div className="flex shrink-0 items-center justify-between ps-3 pe-2 pt-1.5 pb-0.5">
                <span className="text-xs font-medium text-muted-foreground">Threads · {threads.length}</span>
                {newThread(close)}
              </div>
              <SidebarContext.Provider value={{ onClose: close, collapsed: false, popover: true }}>
                <ScrollArea className="min-h-0 flex-1">
                  <ul className="flex flex-col p-1">{rows(threads)}</ul>
                </ScrollArea>
              </SidebarContext.Provider>
            </PopoverPrimitive.Popup>
          </PopoverPrimitive.Positioner>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    </li>
  );
}

// The workspace's apps, under the threads: the ones it serves (the Worker's in Live, the repo's folders in Dev, with
// the icon each manifest carries), then the repo's folders it does not serve, marked Dev (not deployed yet), Off
// (disabled in the workspace file) or Fix (a manifest problem) (lib/apps.ts). + adds an app to the repo (new-app-dialog.tsx).
function Apps({ ws, isActive, open }: { ws: WorkspaceSummary; isActive: (path: string) => boolean; open: (path: string) => void }): React.ReactElement {
  const { collapsed } = React.useContext(SidebarContext);
  const [shown, setShown] = useStoredFlag("sg.rail.apps.open", true);
  const [creating, setCreating] = React.useState(false);
  const local = useLocalApps(ws.id);
  const served = ws.apps.map((a) => ({ id: a.app, name: a.name, icon: a.icon, mark: null as string | null }));
  const folders = (local.data ?? []).filter((l) => !ws.apps.some((a) => a.app === l.manifest.id)).map((l) => ({ id: l.manifest.id, name: l.manifest.name, icon: l.manifest.icon?.trimStart().startsWith("<svg") ? l.manifest.icon : undefined, mark: l.disabled ? "Off" : l.problems.length ? "Fix" : "Dev" }));
  const apps = [...served, ...folders];
  return (
    <>
      <GroupHeading
        title="Apps"
        open={shown}
        onToggle={() => setShown(!shown)}
        action={
          <Tooltip>
            <TooltipTrigger render={<button type="button" aria-label="New App" tabIndex={collapsed ? -1 : undefined} onClick={() => setCreating(true)} className={plusClass} />}>
              <PlusIcon className="size-4" />
            </TooltipTrigger>
            <TooltipPopup className={railTooltipClass}>New App</TooltipPopup>
          </Tooltip>
        }
      />
      {(shown || collapsed) && apps.map((a) => (
        <Row key={a.id} icon={<AppGlyph app={a} />} label={a.name} active={isActive(`apps/${a.id}`)} onClick={() => open(`apps/${a.id}`)} trailing={a.mark ? <span className="rounded px-1 text-[10px] font-medium uppercase tracking-wider text-admin-dim">{a.mark}</span> : undefined} />
      ))}
      {(shown || collapsed) && apps.length === 0 && !collapsed && (
        <li className="px-2.5 py-1.5 text-[13px] text-admin-dim">No apps yet</li>
      )}
      <NewAppDialog wsId={ws.id} open={creating} onOpenChange={setCreating} />
    </>
  );
}

// A group: a hairline above, a title that folds the group (remembered per group), and its rows.
function Group({ id, title, children }: { id: string; title: string; children: React.ReactNode }): React.ReactElement {
  const { collapsed } = React.useContext(SidebarContext);
  const [shown, setShown] = useStoredFlag(`sg.rail.${id}.open`, true);
  return (
    <>
      <li aria-hidden className="mx-2 my-2 h-px bg-admin-line" />
      <GroupHeading title={title} open={shown} onToggle={() => setShown(!shown)} />
      {(shown || collapsed) && children}
    </>
  );
}

// Opens the docs modal (shell/docs-modal.tsx). Folded, it fades out with the labels; ⌘K still has the docs.
function DocsButton(): React.ReactElement {
  const { collapsed } = React.useContext(SidebarContext);
  const docs = useDocsModal();
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label="Docs"
            tabIndex={collapsed ? -1 : undefined}
            onClick={() => docs.open()}
            className={cn(plusClass, "size-7 transition-opacity", DURATION, collapsed ? "pointer-events-none opacity-0" : "opacity-100")}
          />
        }
      >
        <BookOpenIcon className="size-4" />
      </TooltipTrigger>
      <TooltipPopup className={railTooltipClass}>Docs</TooltipPopup>
    </Tooltip>
  );
}

// The workspace's badge: its first letter on the active color.
const markClass = "relative flex size-6 shrink-0 items-center justify-center rounded-md bg-admin-accent text-[11px] font-semibold text-admin-accent-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]";
const smallMarkClass = "flex size-5 items-center justify-center rounded-md bg-admin-accent text-[10px] font-semibold text-admin-accent-foreground";

// The header row: as wide as a nav row and laid out like one. The badge is centered on the nav's
// icon column (6px in, 24px wide, like the 16px icons 10px in) and the name starts where the nav
// labels do. Its hover background is a layer of its own over the whole row, and the switcher icon
// stays faint until the row is hovered or its menu is open.
const headerTriggerClass = "group relative flex h-10 w-full min-w-0 cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-lg ps-1.5 pe-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-admin-ring";
const headerHoverClass = "pointer-events-none absolute inset-0 rounded-lg bg-admin-hover opacity-0 transition-opacity group-hover:opacity-100 group-data-[popup-open]:opacity-100";

const menuItemClass = "min-h-9 gap-2.5 rounded-md px-2.5 sm:min-h-8.5";

// The switcher: the organization's workspaces, a new one, and links into the settings modal (the
// workspace's own settings first).
function WorkspaceMenu({ ws }: { ws: WorkspaceSummary }): React.ReactElement {
  const { org } = useSession();
  const { list } = useWorkspaces(org);
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
          {ws.demo && (
            <Label className="relative flex flex-none items-center">
              <Badge variant="info" size="sm">
                Demo
              </Badge>
            </Label>
          )}
          <Label className="flex flex-none items-center">
            <ChevronsUpDownIcon className="relative size-4 text-admin-fg opacity-20 transition-opacity group-hover:opacity-100 group-data-[popup-open]:opacity-100" />
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
              {w.demo && (
                <Badge variant="info" size="sm">
                  Demo
                </Badge>
              )}
              {w.id === ws.id && <CheckIcon className="size-4" />}
            </MenuItem>
          ))}
          <MenuItem className={menuItemClass} onClick={() => modal.open("workspaces", { create: true })}>
            <PlusIcon />
            New Workspace
          </MenuItem>
        </MenuGroup>
        <MenuSeparator className="my-1.5" />
        <MenuGroup className="flex flex-col gap-0.5">
          <MenuItem className={menuItemClass} onClick={() => modal.open("general")}>
            <Settings2Icon />
            Settings
          </MenuItem>
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
  onClose = () => {},
  className,
}: {
  ws: WorkspaceSummary;
  /** The open rail's width (the user drags it, see workspace-shell.tsx). */
  width?: number;
  /** Off while the width is being dragged, so the rail follows the pointer. */
  animate?: boolean;
  collapsed?: boolean;
  onClose?: () => void;
  className?: string;
}): React.ReactElement {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { mode } = useMode(ws.id);
  const base = `/w/${ws.id}`;
  const rest = pathname.slice(base.length).replace(/^\//, "");
  const isActive = (path: string) => (path === "" ? rest === "" : rest === path || rest.startsWith(`${path}/`));
  const open = (path: string) => navigate(`${base}${path ? `/${path}` : ""}`);
  const row = (s: Section) => <Row key={s.path} icon={<s.icon />} label={s.label} active={isActive(s.path)} onClick={() => open(s.path)} />;
  return (
    <SidebarContext.Provider value={{ onClose, collapsed }}>
      {/* the rail's own tooltip timing: collapsed icons name themselves almost at once */}
      <TooltipProvider delay={40} closeDelay={0}>
        <aside
          className={cn("flex h-full shrink-0 flex-col overflow-hidden bg-admin text-admin-fg", animate && "transition-[width] ease-out", DURATION, className)}
          style={{ width: collapsed ? NAV_COLLAPSED_WIDTH : width }}
          data-collapsed={collapsed || undefined}
          data-slot="rail"
        >
          {/* header: the workspace, its badge in the icon column */}
          <div className="flex h-14 shrink-0 items-center gap-1 overflow-hidden px-3">
            <div className="min-w-0 flex-1">
              <WorkspaceMenu ws={ws} />
            </div>
            <Tooltip>
              <TooltipTrigger render={<button type="button" aria-label="Hide Sidebar" onClick={onClose} className="flex size-8 cursor-pointer items-center justify-center rounded-md text-admin-muted outline-none hover:bg-admin-hover hover:text-admin-strong md:hidden" />}>
                <PanelLeftIcon className="size-4" />
              </TooltipTrigger>
              <TooltipPopup>Hide</TooltipPopup>
            </Tooltip>
          </div>
          {/* open, the Threads header sits right under the workspace switcher; folded, the icons keep their gap */}
          <ScrollArea className="min-h-0 flex-1" viewportProps={{ className: "overflow-x-hidden" }}>
          <nav className={cn("px-3 pb-4", collapsed ? "pt-2" : "pt-0")}>
            <ul className="flex flex-col gap-0.5">
              {/* the threads, above the nav: listed with the rail open, one icon and a popover folded */}
              <Threads ws={ws} />
              <li aria-hidden className="mx-2 my-2 h-px bg-admin-line" />
              <Apps ws={ws} isActive={isActive} open={open} />
              <Group id="core" title="Core">
                {sections.map(row)}
                {/* the repo on this Mac, while the workspace runs from it */}
                {mode === "dev" && row(codeSection)}
              </Group>
            </ul>
          </nav>
          </ScrollArea>
          {/* the foot: a hairline, the SuperGrid mark in the icon column like the rows above, and the docs at the far end */}
          <div className="shrink-0 px-3 pb-4">
            <div aria-hidden className="mx-2 mb-3 h-px bg-admin-line" />
            <div className="flex h-8 items-center justify-between gap-2.5 overflow-hidden whitespace-nowrap ps-2.5 pe-1 text-admin-muted">
              <div className="flex min-w-0 items-center gap-2.5">
                <SuperGridMark className="shrink-0" />
                <Label className="font-heading text-sm font-semibold tracking-wide">SuperGrid</Label>
              </div>
              <DocsButton />
            </div>
          </div>
        </aside>
      </TooltipProvider>
    </SidebarContext.Provider>
  );
}

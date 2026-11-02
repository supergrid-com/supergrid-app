import {
  BellIcon,
  BuildingIcon,
  CheckIcon,
  FolderIcon,
  GlobeIcon,
  MonitorIcon,
  MoonIcon,
  PanelLeftIcon,
  SearchIcon,
  SettingsIcon,
  SunIcon,
} from "lucide-react";
import * as React from "react";
import { Link } from "react-router";
import { NavIcon } from "~/components/workspace/nav-icons";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Kbd } from "~/components/ui/kbd";
import { Menu, MenuGroup, MenuGroupLabel, MenuItem, MenuLinkItem, MenuPopup, MenuRadioGroup, MenuRadioItem, MenuSeparator, MenuTrigger } from "~/components/ui/menu";
import { Tooltip, TooltipPopup, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { type WorkspacePage, useWorkspacePage } from "~/lib/workspace-page";
import { useWorkspaces } from "~/lib/data";
import { chatsFor, me, type Workspace } from "~/lib/mock";
import { isPageFor, targetMeta, useNavConfig, type NavGroupConfig, type NavItemConfig, type NavMenuConfig } from "~/lib/nav-config";
import { adminThemes, usePlatform } from "~/lib/platform";
import { cn } from "~/lib/utils";

// The workspace sidebar: a dark rail with the workspace's sections, after Shopify's admin. One
// row per section; a section's sub items open in the second panel (sub-nav.tsx), never here.
// The workspace sits up top with the account menu; the SuperGrid mark is in the title strip above.
//
// Collapsed (⌘B) it is icons only. Both states are the same DOM: the rail animates its width,
// every icon sits in the same column either way, and the labels clip and fade. Nothing is
// swapped, so the move is one smooth motion in each direction.

export const NAV_WIDTH = 256;
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
  return <span className={cn("min-w-0 flex-1 overflow-hidden whitespace-nowrap transition-opacity", DURATION, collapsed ? "opacity-0" : "opacity-100", className)}>{children}</span>;
}

// Wraps a row so its label shows as a tooltip once the rail is collapsed.
function RailTooltip({ label, hint, children }: { label: React.ReactNode; hint?: React.ReactNode; children: React.ReactElement }): React.ReactElement {
  const { collapsed } = React.useContext(SidebarContext);
  return (
    <Tooltip disabled={!collapsed}>
      <TooltipTrigger render={children} />
      <TooltipPopup side="right" className="flex items-center gap-2">
        {label}
        {hint}
      </TooltipPopup>
    </Tooltip>
  );
}

function Row({ icon, label, page, active, trailing, color }: { icon: React.ReactNode; label: string; page: WorkspacePage; active: boolean; trailing?: React.ReactNode; color?: string }): React.ReactElement {
  const { go } = useWorkspacePage();
  const { onClose, collapsed } = React.useContext(SidebarContext);
  return (
    <li>
      <RailTooltip label={label}>
        <button
          type="button"
          className={cn(rowClass, active && activeRowClass)}
          aria-label={label}
          aria-current={active ? "page" : undefined}
          onClick={() => {
            go(page);
            onClose();
          }}
        >
          <span className={iconSlotClass} style={color ? { color } : undefined}>
            {icon}
          </span>
          <Label>{label}</Label>
          {trailing && <Label className="flex-none text-xs text-admin-dim">{trailing}</Label>}
        </button>
      </RailTooltip>
    </li>
  );
}

// A nav item from the config: its section's defaults, with the owner's overrides on top.
function ConfigRow({ ws, item, page, chats }: { ws: Workspace; item: NavItemConfig; page: WorkspacePage; chats: number }): React.ReactElement | null {
  const meta = targetMeta(ws, item.target);
  if (!meta) return null;
  const trailing = item.target === "chat" && page.kind !== "chat" && chats > 0 ? chats : undefined;
  return <Row icon={<NavIcon name={item.icon ?? meta.icon} />} label={item.label ?? meta.label} page={meta.page} active={isPageFor(item.target, page)} trailing={trailing} color={item.color} />;
}

// A menu: one row that opens its own panel; it reads as active while any of its items is on
// screen. Clicking it opens the first item.
function ConfigMenu({ ws, menu, page }: { ws: Workspace; menu: NavMenuConfig; page: WorkspacePage }): React.ReactElement {
  const first = menu.items.map((it) => targetMeta(ws, it.target)).find((m) => !!m);
  const active = menu.items.some((it) => isPageFor(it.target, page));
  return <Row icon={<NavIcon name={menu.icon ?? "folder"} />} label={menu.label} page={first?.page ?? { kind: "home" }} active={active} color={menu.color} />;
}

// A group: optional hairline above and below, an optional title that folds away when the
// rail is collapsed, and its items.
function ConfigGroup({ ws, group, page, chats }: { ws: Workspace; group: NavGroupConfig; page: WorkspacePage; chats: number }): React.ReactElement {
  const { collapsed } = React.useContext(SidebarContext);
  const line = <li aria-hidden className="mx-2 my-2 h-px bg-admin-line" />;
  return (
    <>
      {group.dividerAbove && line}
      {group.title && (
        <li aria-hidden className={cn("overflow-hidden ps-2.5 text-[11px] font-medium uppercase tracking-wider text-admin-dim transition-all", DURATION, collapsed ? "h-0 opacity-0" : "mt-2 mb-1 h-4 opacity-100")}>
          {group.title}
        </li>
      )}
      {group.items.map((it) => (
        <ConfigRow key={it.target} ws={ws} item={it} page={page} chats={chats} />
      ))}
      {group.dividerBelow && line}
    </>
  );
}

// The workspace's badge: its first letter on the active color.
const markClass = "flex size-8 shrink-0 items-center justify-center rounded-lg bg-active text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]";

function WorkspaceMark({ ws, className }: { ws: Workspace; className?: string }): React.ReactElement {
  return (
    <span className={cn(markClass, className)}>
      {ws.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

// The header row: the workspace's badge and name open the account menu.
const headerTriggerClass = "-ms-1 flex h-10 min-w-0 flex-1 cursor-pointer items-center gap-2.5 overflow-hidden whitespace-nowrap rounded-lg ps-1 text-left outline-none transition-colors hover:bg-admin-hover focus-visible:ring-2 focus-visible:ring-admin-ring";

function WorkspaceMenu({ ws }: { ws: Workspace }): React.ReactElement {
  const { theme, setTheme, adminTheme, setAdminTheme } = usePlatform();
  const { workspaces } = useWorkspaces();
  const { collapsed } = React.useContext(SidebarContext);
  return (
    <Menu>
      <RailTooltip label={ws.name}>
        <MenuTrigger render={<button type="button" aria-label={ws.name} className={cn(headerTriggerClass, collapsed ? "pe-0" : "pe-2")} />}>
          <WorkspaceMark ws={ws} />
          <Label className="font-heading text-[15px] font-semibold tracking-wide text-admin-strong">{ws.name}</Label>
        </MenuTrigger>
      </RailTooltip>
      <MenuPopup align="start" side={collapsed ? "right" : "bottom"} className="w-64">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <Avatar className="[--avatar-size:--spacing(7)]">
            <AvatarFallback className="text-[10px]">{me.initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate text-sm">{me.name}</div>
            <div className="truncate text-xs text-muted-foreground">{me.email}</div>
          </div>
        </div>
        <MenuSeparator />
        <MenuGroup>
          <MenuGroupLabel>Workspaces</MenuGroupLabel>
          {workspaces.map((w) => (
            <MenuLinkItem key={w.id} render={<Link to={`/w/${w.id}`} />}>
              <span className="flex size-5 items-center justify-center rounded-md bg-active text-[10px] font-bold text-white">
                {w.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="flex-1 truncate">{w.name}</span>
              {w.id === ws.id && <CheckIcon className="size-4" />}
            </MenuLinkItem>
          ))}
          <MenuLinkItem render={<Link to="/" />}>
            <FolderIcon />
            All workspaces
          </MenuLinkItem>
        </MenuGroup>
        <MenuSeparator />
        <MenuLinkItem render={<a href={ws.url} target="_blank" rel="noreferrer" />}>
          <GlobeIcon />
          Open {ws.url.replace(/^https?:\/\//, "")}
        </MenuLinkItem>
        <MenuLinkItem render={<Link to="/org" />}>
          <BuildingIcon />
          Organization
        </MenuLinkItem>
        <MenuLinkItem render={<Link to="/account" />}>Account</MenuLinkItem>
        <MenuSeparator />
        <MenuGroup>
          <MenuGroupLabel>Appearance</MenuGroupLabel>
          <MenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as typeof theme)}>
            <MenuRadioItem value="light">
              <span className="flex items-center gap-2"><SunIcon className="size-4 opacity-80" />Light</span>
            </MenuRadioItem>
            <MenuRadioItem value="dark">
              <span className="flex items-center gap-2"><MoonIcon className="size-4 opacity-80" />Dark</span>
            </MenuRadioItem>
            <MenuRadioItem value="system">
              <span className="flex items-center gap-2"><MonitorIcon className="size-4 opacity-80" />System</span>
            </MenuRadioItem>
          </MenuRadioGroup>
        </MenuGroup>
        <MenuSeparator />
        <MenuGroup>
          <MenuGroupLabel>Admin theme</MenuGroupLabel>
          <MenuRadioGroup value={adminTheme} onValueChange={(v) => setAdminTheme(v as typeof adminTheme)}>
            {adminThemes.map((t) => (
              <MenuRadioItem key={t.id} value={t.id}>
                <span className="flex items-center gap-2">
                  <span className="size-3.5 rounded-full border" style={{ background: t.swatch }} />
                  {t.name}
                </span>
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
        </MenuGroup>
        <MenuSeparator />
        <MenuLinkItem render={<Link to="/login" />}>Sign out</MenuLinkItem>
      </MenuPopup>
    </Menu>
  );
}

export function WorkspaceSidebar({
  ws,
  collapsed = false,
  onClose = () => {},
  className,
}: {
  ws: Workspace;
  collapsed?: boolean;
  onClose?: () => void;
  className?: string;
}): React.ReactElement {
  const { page } = useWorkspacePage();
  const { config: nav } = useNavConfig(ws);
  const chats = chatsFor(ws.id);

  return (
    <SidebarContext.Provider value={{ onClose, collapsed }}>
      {/* the rail's own tooltip timing: collapsed icons should name themselves quickly */}
      <TooltipProvider delay={150} closeDelay={0}>
      <aside
        className={cn("flex h-full flex-col overflow-hidden bg-admin text-admin-fg transition-[width] ease-out", DURATION, className)}
        style={{ width: collapsed ? NAV_COLLAPSED_WIDTH : NAV_WIDTH }}
        data-collapsed={collapsed || undefined}
      >
        {/* header: the workspace, its badge in the icon column */}
        <div className="flex h-12 shrink-0 items-center gap-1 overflow-hidden px-3.5">
          <div className="min-w-0 flex-1">
            <WorkspaceMenu ws={ws} />
          </div>
          <div className={cn("flex shrink-0 items-center transition-opacity", DURATION, collapsed ? "pointer-events-none opacity-0" : "opacity-100")}>
            <Tooltip>
              <TooltipTrigger render={<button type="button" aria-label="Hide sidebar" onClick={onClose} className="flex size-8 cursor-pointer items-center justify-center rounded-md text-admin-muted outline-none hover:bg-admin-hover hover:text-admin-strong md:hidden" />}>
                <PanelLeftIcon className="size-4" />
              </TooltipTrigger>
              <TooltipPopup>Hide</TooltipPopup>
            </Tooltip>
          </div>
        </div>

        {/* search: a field that shrinks to its icon */}
        <div className="px-3 pb-3 pt-1">
          <RailTooltip label="Search" hint={<Kbd>⌘K</Kbd>}>
            <button type="button" aria-label="Search" className={cn(rowClass, "text-admin-muted hover:text-admin-strong", collapsed ? "bg-transparent" : "bg-admin-hover hover:bg-admin-active")}>
              <span className={iconSlotClass}>
                <SearchIcon />
              </span>
              <Label>Search</Label>
              <Label className="flex-none text-xs text-admin-dim">⌘K</Label>
            </button>
          </RailTooltip>
        </div>

        <nav className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 pb-4 pt-1 [scrollbar-width:thin]">
          <ul className="flex flex-col gap-0.5">
            {nav.entries.map((e) =>
              e.kind === "group" ? (
                <ConfigGroup key={e.id} ws={ws} group={e} page={page} chats={chats.length} />
              ) : e.kind === "menu" ? (
                <ConfigMenu key={e.id} ws={ws} menu={e} page={page} />
              ) : (
                <ConfigRow key={e.target} ws={ws} item={e} page={page} chats={chats.length} />
              ),
            )}
          </ul>
        </nav>

        <div className="shrink-0 px-3 pb-4 pt-2">
          <ul className="flex flex-col gap-0.5">
            <Row icon={<SettingsIcon />} label="Settings" page={{ kind: "settings", section: "general" }} active={page.kind === "settings"} />
            <li>
              <RailTooltip label="Notifications">
                <button type="button" aria-label="Notifications" className={rowClass}>
                  <span className={iconSlotClass}>
                    <BellIcon />
                  </span>
                  <Label>Notifications</Label>
                </button>
              </RailTooltip>
            </li>
          </ul>
        </div>
      </aside>
      </TooltipProvider>
    </SidebarContext.Provider>
  );
}

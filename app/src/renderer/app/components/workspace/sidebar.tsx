import { ArrowLeftRightIcon, BuildingIcon, CheckIcon, GlobeIcon, LayoutGridIcon, MessageCircleIcon, MonitorIcon, MoonIcon, PackageIcon, PanelLeftIcon, PlusIcon, SunIcon } from "lucide-react";
import * as React from "react";
import { useLocation, useNavigate } from "react-router";
import { Menu, MenuGroup, MenuGroupLabel, MenuItem, MenuPopup, MenuRadioGroup, MenuRadioItem, MenuSeparator, MenuTrigger } from "~/components/ui/menu";
import { Tooltip, TooltipPopup, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { useOrgs } from "~/lib/orgs";
import { adminThemes, usePlatform } from "~/lib/platform";
import { useSession } from "~/lib/session";
import { cn } from "~/lib/utils";
import { useWorkspaces, type WorkspaceSummary } from "~/lib/workspaces";
import { useOrgModal } from "~/shell/context";
import { sections, type Section } from "~/shell/sections";

// The workspace sidebar: a dark rail with the workspace's sections, after Shopify's admin. One
// row per section; a section's sub items open in the second panel (sub-nav.tsx), never here.
// The workspace sits up top with its menu (other workspaces, the organization, appearance).
// Then the core sections, the workspace's installed apps (read from its Worker), the developer
// surfaces, and the agent and Settings at the foot.
//
// Collapsed (⌘B) it is icons only. Both states are the same DOM: the rail animates its width,
// every icon sits in the same column either way, and the labels clip and fade.

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
function RailTooltip({ label, children }: { label: React.ReactNode; children: React.ReactElement }): React.ReactElement {
  const { collapsed } = React.useContext(SidebarContext);
  return (
    <Tooltip disabled={!collapsed}>
      <TooltipTrigger render={children} />
      <TooltipPopup side="right">{label}</TooltipPopup>
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
const markClass = "flex size-8 shrink-0 items-center justify-center rounded-lg bg-active text-sm font-bold text-active-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]";
const smallMarkClass = "flex size-5 items-center justify-center rounded-md bg-active text-[10px] font-bold text-active-foreground";

// The header row: the workspace's badge and name open its menu.
const headerTriggerClass = "-ms-1 flex h-10 min-w-0 flex-1 cursor-pointer items-center gap-2.5 overflow-hidden whitespace-nowrap rounded-lg ps-1 text-left outline-none transition-colors hover:bg-admin-hover focus-visible:ring-2 focus-visible:ring-admin-ring";

function WorkspaceMenu({ ws }: { ws: WorkspaceSummary }): React.ReactElement {
  const { theme, setTheme, adminTheme, setAdminTheme } = usePlatform();
  const { org, setOrg } = useSession();
  const orgs = useOrgs();
  const { list } = useWorkspaces(org?.cloudflare ?? null);
  const { collapsed } = React.useContext(SidebarContext);
  const navigate = useNavigate();
  const modal = useOrgModal();
  return (
    <Menu>
      <RailTooltip label={ws.name}>
        <MenuTrigger render={<button type="button" aria-label={ws.name} className={cn(headerTriggerClass, collapsed ? "pe-0" : "pe-2")} />}>
          <span className={markClass}>{ws.name.slice(0, 1).toUpperCase()}</span>
          <Label className="flex flex-col">
            <span className="truncate font-heading text-[15px] font-semibold tracking-wide text-admin-strong">{ws.name}</span>
            {org && <span className="truncate text-xs text-admin-dim">{org.name}</span>}
          </Label>
        </MenuTrigger>
      </RailTooltip>
      <MenuPopup align="start" side={collapsed ? "right" : "bottom"} className="w-64">
        <MenuGroup>
          <MenuGroupLabel>Workspaces</MenuGroupLabel>
          {(list ?? [ws]).map((w) => (
            <MenuItem key={w.id} onClick={() => navigate(`/w/${w.id}`)}>
              <span className={smallMarkClass}>{w.name.slice(0, 1).toUpperCase()}</span>
              <span className="flex-1 truncate">{w.name}</span>
              {w.id === ws.id && <CheckIcon className="size-4" />}
            </MenuItem>
          ))}
          <MenuItem onClick={() => modal.open("workspaces")}>
            <LayoutGridIcon />
            All workspaces
          </MenuItem>
        </MenuGroup>
        <MenuSeparator />
        <MenuGroup>
          <MenuGroupLabel>{org?.name ?? "Organization"}</MenuGroupLabel>
          <MenuItem onClick={() => modal.open("settings")}>
            <BuildingIcon />
            Organization settings
          </MenuItem>
          {orgs
            .filter((o) => o.id !== org?.id)
            .map((o) => (
              <MenuItem
                key={o.id}
                onClick={() => {
                  setOrg(o.id);
                  navigate("/");
                }}
              >
                <ArrowLeftRightIcon />
                Switch to {o.name}
              </MenuItem>
            ))}
          <MenuItem onClick={() => navigate("/welcome")}>
            <PlusIcon />
            New organization
          </MenuItem>
        </MenuGroup>
        <MenuSeparator />
        <MenuItem render={<a href={ws.url} target="_blank" rel="noreferrer" />}>
          <GlobeIcon />
          Open {ws.url.replace(/^https?:\/\//, "")}
        </MenuItem>
        <MenuSeparator />
        <MenuGroup>
          <MenuGroupLabel>Appearance</MenuGroupLabel>
          <MenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as typeof theme)}>
            <MenuRadioItem value="light">
              <span className="flex items-center gap-2">
                <SunIcon className="size-4 opacity-80" />
                Light
              </span>
            </MenuRadioItem>
            <MenuRadioItem value="dark">
              <span className="flex items-center gap-2">
                <MoonIcon className="size-4 opacity-80" />
                Dark
              </span>
            </MenuRadioItem>
            <MenuRadioItem value="system">
              <span className="flex items-center gap-2">
                <MonitorIcon className="size-4 opacity-80" />
                System
              </span>
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
      </MenuPopup>
    </Menu>
  );
}

export function WorkspaceSidebar({
  ws,
  collapsed = false,
  agentOpen,
  onToggleAgent,
  onClose = () => {},
  className,
}: {
  ws: WorkspaceSummary;
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
      {/* the rail's own tooltip timing: collapsed icons should name themselves quickly */}
      <TooltipProvider delay={150} closeDelay={0}>
        <aside
          className={cn("flex h-full flex-col overflow-hidden bg-admin text-admin-fg transition-[width] ease-out", DURATION, className)}
          style={{ width: collapsed ? NAV_COLLAPSED_WIDTH : NAV_WIDTH }}
          data-collapsed={collapsed || undefined}
        >
          {/* header: the workspace, its badge in the icon column */}
          <div className="flex h-14 shrink-0 items-center gap-1 overflow-hidden px-3.5">
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
          <nav className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 pb-4 pt-2 [scrollbar-color:var(--admin-active)_transparent] [scrollbar-width:thin]">
            <ul className="flex flex-col gap-0.5">
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
              {group("footer")}
            </ul>
          </div>
        </aside>
      </TooltipProvider>
    </SidebarContext.Provider>
  );
}

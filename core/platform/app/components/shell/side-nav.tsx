import {
  ArrowUpCircleIcon,
  BuildingIcon,
  CheckIcon,
  ChevronDownIcon,
  CircleHelpIcon,
  CloudIcon,
  FolderIcon,
  FolderOpenIcon,
  HomeIcon,
  MonitorIcon,
  MoonIcon,
  PanelLeftCloseIcon,
  PanelLeftIcon,
  SearchIcon,
  ShieldIcon,
  SlidersHorizontalIcon,
  StoreIcon,
  SunIcon,
  UserRoundXIcon,
} from "lucide-react";
import * as React from "react";
import { Link, useFetcher, useLocation, useParams } from "react-router";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Menu, MenuGroup, MenuGroupLabel, MenuItem, MenuLinkItem, MenuPopup, MenuRadioGroup, MenuRadioItem, MenuSeparator, MenuTrigger } from "~/components/ui/menu";
import { Tooltip, TooltipPopup, TooltipTrigger } from "~/components/ui/tooltip";
import { NAV_DEFAULT_WIDTH, usePlatform } from "~/lib/platform";
import { cn } from "~/lib/utils";

function NavLink({ to, icon: Icon, label, active, badge }: { to: string; icon: React.ComponentType<{ className?: string }>; label: string; active: boolean; badge?: React.ReactNode }): React.ReactElement {
  const { setNavOpen } = usePlatform();
  return (
    <Link
      to={to}
      onClick={() => setNavOpen(false)}
      className={cn(
        "flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm text-sidebar-foreground outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        active && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
      )}
    >
      <Icon className="size-4 shrink-0 opacity-80" />
      <span className="flex-1 truncate">{label}</span>
      {badge}
    </Link>
  );
}

// The organization switcher. Switching posts to /session, which sets the session's active organization.
function OrgMenu(): React.ReactElement {
  const { mode, orgs, activeOrgId, branding, user, canOrg } = usePlatform();
  const fetcher = useFetcher();
  const org = orgs.find((o) => o.id === activeOrgId) ?? orgs[0] ?? null;
  const label = mode === "creator" || !org ? branding.name : org.name;
  return (
    <Menu>
      <MenuTrigger render={<button type="button" className="flex min-w-0 items-center gap-2 rounded-lg px-1.5 py-1 text-sm font-semibold outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring" />}>
        <span className="flex size-5 items-center justify-center rounded-md text-[10px] font-bold text-white" style={{ background: branding.accent }}>{label.slice(0, 1)}</span>
        <span className="truncate">{label}</span>
        <ChevronDownIcon className="size-3.5 opacity-60" />
      </MenuTrigger>
      <MenuPopup align="start" className="w-60">
        {mode !== "creator" && orgs.length > 0 && (
          <MenuGroup>
            <MenuGroupLabel>Organizations</MenuGroupLabel>
            {orgs.map((o) => (
              <MenuItem key={o.id} onClick={() => fetcher.submit({ intent: "switch-org", organizationId: o.id }, { method: "post", action: "/session" })}>
                <span className="flex size-5 items-center justify-center rounded-md border bg-background text-[10px] font-semibold">{o.name.slice(0, 1)}</span>
                <span className="flex-1 truncate">{o.name}</span>
                {o.id === org?.id && <CheckIcon className="size-4" />}
              </MenuItem>
            ))}
          </MenuGroup>
        )}
        {mode !== "creator" && orgs.length > 0 && <MenuSeparator />}
        {canOrg && (
          <MenuLinkItem render={<Link to="/org" />}>
            <BuildingIcon />
            {mode === "creator" ? "Members" : "Organization settings"}
          </MenuLinkItem>
        )}
        {mode === "reseller" && (
          <MenuLinkItem render={<Link to="/org/new" />}>
            <BuildingIcon />
            New organization
          </MenuLinkItem>
        )}
        {user.operator && (
          <MenuLinkItem render={<Link to="/settings" />}>
            <SlidersHorizontalIcon />
            Platform settings
          </MenuLinkItem>
        )}
      </MenuPopup>
    </Menu>
  );
}

function UserMenu(): React.ReactElement {
  const { theme, setTheme, user } = usePlatform();
  const fetcher = useFetcher();
  return (
    <Menu>
      <MenuTrigger render={<button type="button" className="flex min-w-0 flex-1 items-center gap-2 rounded-lg p-1 text-left outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring" />}>
        <Avatar className="[--avatar-size:--spacing(6)]">
          <AvatarFallback className="text-[10px]">{user.initials}</AvatarFallback>
        </Avatar>
        <span className="truncate text-sm">{user.name}</span>
        {user.operator && <Badge variant="outline" size="sm" className="ms-auto">operator</Badge>}
      </MenuTrigger>
      <MenuPopup align="start" side="top" className="w-56">
        <div className="px-2 py-1.5 text-xs text-muted-foreground">{user.email}</div>
        <MenuSeparator />
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
        <MenuItem onClick={() => fetcher.submit(null, { method: "post", action: "/logout" })}>Sign out</MenuItem>
      </MenuPopup>
    </Menu>
  );
}

function NavBody(): React.ReactElement {
  const { pathname } = useLocation();
  const params = useParams();
  const { mode, user, workspaces, canOrg, navDocked, setNavDocked, updates } = usePlatform();
  const fetcher = useFetcher();
  const is = (p: string) => pathname === p;
  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex h-14 items-center gap-1 ps-3 pe-2">
        <OrgMenu />
        <div className="flex-1" />
        <Tooltip>
          <TooltipTrigger render={<Button variant="ghost" size="icon-xs" aria-label="Search" />}>
            <SearchIcon />
          </TooltipTrigger>
          <TooltipPopup>Search (⌘K)</TooltipPopup>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={<Button variant="ghost" size="icon-xs" aria-label={navDocked ? "Hide navigation" : "Keep navigation open"} />}
            onClick={() => (navDocked ? setNavDocked(false) : setNavDocked(true))}
          >
            {navDocked ? <PanelLeftCloseIcon /> : <PanelLeftIcon />}
          </TooltipTrigger>
          <TooltipPopup>{navDocked ? "Hide" : "Keep open"}</TooltipPopup>
        </Tooltip>
      </div>

      {user.impersonated && (
        <div className="mx-2 mb-1">
          <Button variant="destructive" size="sm" className="w-full" onClick={() => fetcher.submit({ intent: "stop-impersonating" }, { method: "post", action: "/session" })}>
            <UserRoundXIcon />
            Stop impersonating
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-0.5 px-2 pt-1">
        <NavLink to="/" icon={HomeIcon} label={mode === "creator" ? "Sites" : "Workspaces"} active={is("/")} />
        <NavLink to="/apps" icon={StoreIcon} label="App store" active={is("/apps")} />
      </div>

      {workspaces.length > 0 && (
        <>
          <div className="mt-4 px-4 text-xs font-medium text-muted-foreground">Recent</div>
          <div className="mt-1 flex flex-col gap-0.5 px-2">
            {workspaces.slice(0, 8).map((w) => (
              <NavLink key={w.id} to={`/w/${w.id}`} icon={params.id === w.id ? FolderOpenIcon : FolderIcon} label={w.name} active={params.id === w.id} />
            ))}
          </div>
        </>
      )}

      <div className="mt-auto flex flex-col gap-0.5 px-2 pb-2">
        {canOrg && <NavLink to="/org" icon={BuildingIcon} label={mode === "creator" ? "Members" : "Organization"} active={is("/org")} />}
        {user.operator && mode === "reseller" && <NavLink to="/operator" icon={ShieldIcon} label="Operator console" active={is("/operator")} />}
        {user.operator && <NavLink to="/updates" icon={ArrowUpCircleIcon} label="Updates" active={is("/updates")} badge={updates > 0 ? <Badge size="sm">{updates}</Badge> : undefined} />}
        {user.operator && <NavLink to="/connect" icon={CloudIcon} label="Cloudflare" active={is("/connect")} />}
        {user.operator && <NavLink to="/settings" icon={SlidersHorizontalIcon} label="Platform settings" active={is("/settings")} badge={<Badge variant="outline" size="sm">{mode}</Badge>} />}
        <div className="mt-1 flex items-center gap-1 border-t pt-2">
          <UserMenu />
          <Tooltip>
            <TooltipTrigger render={<Button variant="ghost" size="icon-xs" aria-label="Help" />}>
              <CircleHelpIcon />
            </TooltipTrigger>
            <TooltipPopup>Help and docs</TooltipPopup>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

let closeTimer: number | null = null;

function cancelClose(): void {
  if (closeTimer) window.clearTimeout(closeTimer);
  closeTimer = null;
}

// The organization mark the top bars show while the nav is collapsed. Hovering or clicking it
// slides the nav over the page; the pin in the nav header docks it.
export function NavMark({ className }: { className?: string }): React.ReactElement | null {
  const { navDocked, navOpen, setNavOpen, mode, orgs, activeOrgId, branding } = usePlatform();
  if (navDocked) return null;
  const org = orgs.find((o) => o.id === activeOrgId) ?? orgs[0] ?? null;
  const label = mode === "creator" || !org ? branding.name : org.name;
  const scheduleClose = () => {
    cancelClose();
    closeTimer = window.setTimeout(() => setNavOpen(false), 200);
  };
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label="Open navigation"
            aria-expanded={navOpen}
            onMouseEnter={() => {
              cancelClose();
              setNavOpen(true);
            }}
            onMouseLeave={scheduleClose}
            onClick={() => setNavOpen(!navOpen)}
            style={{ background: branding.accent }}
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-lg font-heading text-[13px] font-bold text-white outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring",
              className,
            )}
          />
        }
      >
        {label.slice(0, 1)}
      </TooltipTrigger>
      <TooltipPopup side="bottom">{label}</TooltipPopup>
    </Tooltip>
  );
}

// Docked: a resizable column in the layout. Collapsed: nothing in the layout; the NavMark in the
// top bar opens the nav as an overlay. ⌘. toggles it from the keyboard.
export function SideNav(): React.ReactElement {
  const { navDocked, navOpen, setNavOpen, navWidth, setNavWidth } = usePlatform();
  const [dragging, setDragging] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "." && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setNavOpen(!navOpen);
      }
      if (e.key === "Escape" && navOpen) setNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navOpen, setNavOpen]);

  const startDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = navWidth;
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    setDragging(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const move = (ev: PointerEvent) => setNavWidth(startWidth + (ev.clientX - startX));
    const up = () => {
      setDragging(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", up);
      target.removeEventListener("pointercancel", up);
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", up);
    target.addEventListener("pointercancel", up);
  };

  if (navDocked) {
    return (
      <div className="relative my-2 ms-2 hidden shrink-0 md:block" style={{ width: navWidth }}>
        <aside className="h-full w-full overflow-hidden rounded-xl border bg-background shadow-xs/5">
          <NavBody />
        </aside>
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize navigation"
          onPointerDown={startDrag}
          onDoubleClick={() => setNavWidth(NAV_DEFAULT_WIDTH)}
          className="group absolute inset-y-0 -end-2 z-10 w-2 cursor-col-resize touch-none"
        >
          <div className={cn("absolute inset-y-3 left-1/2 w-0.5 -translate-x-1/2 rounded-full transition-colors group-hover:bg-ring/60", dragging ? "bg-ring" : "bg-transparent")} />
        </div>
      </div>
    );
  }

  return (
    <aside
      onMouseEnter={cancelClose}
      onMouseLeave={() => {
        cancelClose();
        closeTimer = window.setTimeout(() => setNavOpen(false), 200);
      }}
      className={cn(
        "fixed inset-y-2 start-2 z-40 overflow-hidden rounded-xl border bg-background shadow-lg/10 transition-[transform,opacity] duration-200 ease-out",
        navOpen ? "translate-x-0 opacity-100" : "pointer-events-none -translate-x-3 opacity-0",
      )}
      style={{ width: navWidth }}
    >
      <NavBody />
    </aside>
  );
}

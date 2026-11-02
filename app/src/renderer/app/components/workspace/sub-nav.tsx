import * as React from "react";
import { MessageCircleIcon, PlusIcon, TableIcon } from "lucide-react";
import { AppGlyph, AppIcon } from "~/components/app-icon";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { NavIcon } from "~/components/workspace/nav-icons";
import { type WorkspacePageApi, type WorkspacePage, useWorkspacePage } from "~/lib/workspace-page";
import { type AppId, catalog, chatsFor, me, tablesFor, type Workspace } from "~/lib/mock";
import { isPageFor, type NavMenuConfig, type NavTarget, targetMeta } from "~/lib/nav-config";
import { cn } from "~/lib/utils";

// The sub nav, after Shopify's settings: a second dark panel beside the collapsed rail with a
// title up top and one row per section. Every section with sub items opens here: settings,
// chat, data and each app. Leaving it is a click on any rail icon. Settings uses it, and so does any app
// whose catalog entry says `navStyle: "panel"`.

export type SubNavItem = {
  key: string;
  label: string;
  icon?: React.ReactNode;
  meta?: React.ReactNode;
  active: boolean;
  onClick: () => void;
  children?: SubNavItem[];
  open?: boolean; // show the children
};

const rowClass =
  "flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg pe-2 text-left text-sm font-normal tracking-wide text-admin-fg outline-none transition-colors hover:bg-admin-hover hover:text-admin-strong focus-visible:ring-2 focus-visible:ring-admin-ring";
const activeClass = "bg-admin-active font-medium text-admin-strong hover:bg-admin-active [&_svg]:text-active";

// Does this item, or anything under it, match the page?
function hasActive(item: SubNavItem): boolean {
  return item.active || !!item.children?.some(hasActive);
}

// One row. Like Shopify: a parent whose child is on screen goes plain white with no fill, and
// only the active row itself gets the fill. Children sit under the parent's label.
function Item({ item, depth = 0, indent = 10 }: { item: SubNavItem; depth?: number; indent?: number }): React.ReactElement {
  const childActive = !item.active && !!item.children?.some(hasActive);
  const childIndent = indent + (item.icon ? 26 : 16);
  return (
    <li>
      <button
        type="button"
        aria-current={item.active ? "page" : undefined}
        onClick={item.onClick}
        className={cn(rowClass, depth > 0 && "h-8 text-[13.5px] text-admin-muted", childActive && "text-admin-strong", item.active && activeClass)}
        style={{ paddingInlineStart: indent }}
      >
        {item.icon && <span className="flex size-4 shrink-0 items-center justify-center [&_svg]:size-4">{item.icon}</span>}
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {item.meta && <span className="shrink-0 text-xs text-admin-dim">{item.meta}</span>}
      </button>
      {item.children && item.open && (
        <ul className="mt-0.5 flex flex-col gap-px pb-1">
          {item.children.map((c) => (
            <Item key={c.key} item={c} depth={depth + 1} indent={childIndent} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function SubNav({ title, icon, meta, items, footer, className }: { title: string; icon?: React.ReactNode; meta?: React.ReactNode; items: SubNavItem[]; footer?: "user"; className?: string }): React.ReactElement {
  return (
    <div className={cn("flex h-full w-full flex-col overflow-hidden rounded-2xl border border-admin-line bg-admin-panel text-admin-fg", className)}>
      <div className="flex h-12 shrink-0 items-center gap-2 px-4">
        {icon && <span className="flex size-5 shrink-0 items-center justify-center text-admin-fg [&_svg]:size-4">{icon}</span>}
        <h2 className="min-w-0 truncate font-heading text-[15px] font-semibold tracking-wide text-admin-strong">{title}</h2>
        {meta}
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-2 [scrollbar-width:thin]">
        <ul className="flex flex-col gap-0.5">
          {items.map((it) => (
            <Item key={it.key} item={it} />
          ))}
        </ul>
      </nav>

      {footer === "user" && (
        <div className="flex shrink-0 items-center gap-2.5 border-t border-admin-line px-4 py-3">
          <Avatar className="shrink-0 [--avatar-size:--spacing(8)]">
            <AvatarFallback className="text-[11px]">{me.initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-admin-strong">{me.name}</div>
            <div className="truncate text-xs text-admin-dim">{me.email}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// The rows under a section, for its own panel or nested in a menu: an app's sections (with
// their children under the open one), the chats, or the tables.
function appItems(ws: Workspace, app: AppId, page: WorkspacePage, go: WorkspacePageApi["go"]): SubNavItem[] {
  const meta = catalog.find((a) => a.id === app);
  if (!meta) return [];
  const here = page.kind === "app" && page.app === app;
  const current = here ? (page.path ? `/${page.path}` : "/") : null;
  const to = (p: string) => () => go({ kind: "app", app, path: p === "/" ? undefined : p.slice(1) });
  return meta.nav.map((n) => ({
    key: n.path,
    label: n.label,
    active: current === n.path,
    onClick: to(n.path),
    open: current === n.path || !!n.children?.some((c) => c.path === current),
    children: n.children?.map((c) => ({ key: c.path, label: c.label, active: current === c.path, onClick: to(c.path) })),
  }));
}

function chatItems(ws: Workspace, page: WorkspacePage, go: WorkspacePageApi["go"]): SubNavItem[] {
  const here = page.kind === "chat";
  const chatId = here ? page.id : undefined;
  return [
    { key: "new", label: "New chat", icon: <PlusIcon />, active: here && !chatId, onClick: () => go({ kind: "chat" }) },
    ...chatsFor(ws.id).map((c) => ({ key: c.id, label: c.title, meta: c.when, active: chatId === c.id, onClick: () => go({ kind: "chat", id: c.id }) })),
  ];
}

function dataItems(ws: Workspace, page: WorkspacePage, go: WorkspacePageApi["go"]): SubNavItem[] {
  const tables = tablesFor(ws);
  const current = page.kind === "data" ? (page.table ?? tables[0]?.id) : null;
  return tables.map((t) => ({
    key: t.id,
    label: t.name,
    icon: t.owner === "core" ? <TableIcon /> : <AppIcon app={t.owner} size="xs" />,
    meta: t.rows.length,
    active: current === t.id,
    onClick: () => go({ kind: "data", table: t.id }),
  }));
}

// What a nav target shows beneath itself inside a menu panel, if anything.
function itemsForTarget(ws: Workspace, target: NavTarget, page: WorkspacePage, go: WorkspacePageApi["go"]): SubNavItem[] | undefined {
  if (target.startsWith("app:")) return appItems(ws, target.slice(4) as AppId, page, go);
  if (target === "chat") return chatItems(ws, page, go);
  if (target === "data") return dataItems(ws, page, go);
  return undefined;
}

// An app's nav as a panel: its sections, with nested items under the open one.
export function AppNav({ ws, app }: { ws: Workspace; app: AppId }): React.ReactElement | null {
  const { go, page } = useWorkspacePage();
  const meta = catalog.find((a) => a.id === app);
  if (!meta) return null;
  return <SubNav title={meta.name} icon={<AppGlyph app={app} />} items={appItems(ws, app, page, go)} />;
}

// The chats in a workspace, newest first, with a row to start one.
export function ChatNav({ ws }: { ws: Workspace }): React.ReactElement {
  const { go, page } = useWorkspacePage();
  return <SubNav title="Chat" icon={<MessageCircleIcon />} items={chatItems(ws, page, go)} />;
}

// The tables in a workspace: core first, then each app's own.
export function DataNav({ ws }: { ws: Workspace }): React.ReactElement {
  const { go, page } = useWorkspacePage();
  return <SubNav title="Data" icon={<TableIcon />} items={dataItems(ws, page, go)} />;
}

// A menu from the nav config as a panel: its title, then its items, each unfolding its own
// sections when it is the one on screen.
export function MenuNav({ ws, menu }: { ws: Workspace; menu: NavMenuConfig }): React.ReactElement {
  const { go, page } = useWorkspacePage();
  const items: SubNavItem[] = menu.items.flatMap((it) => {
    const meta = targetMeta(ws, it.target);
    if (!meta) return [];
    const here = isPageFor(it.target, page);
    const icon = it.icon ?? meta.icon;
    const children = itemsForTarget(ws, it.target, page, go);
    return [
      {
        key: it.target,
        label: it.label ?? meta.label,
        icon: (
          <span style={it.color ? { color: it.color } : undefined} className="flex">
            <NavIcon name={icon} />
          </span>
        ),
        // with children, the fill belongs to whichever child is on screen; the parent only
        // goes white (Item handles that from its children)
        active: here && !children,
        onClick: () => go(meta.page),
        open: here,
        children,
      },
    ];
  });
  return <SubNav title={menu.title ?? menu.label} icon={<NavIcon name={menu.icon ?? "folder"} />} items={items} />;
}

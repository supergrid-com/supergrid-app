import * as React from "react";
import { NavIcon } from "~/components/workspace/nav-icons";
import { useWorkspacePage } from "~/lib/workspace-page";
import type { Workspace } from "~/lib/mock";
import { isPageFor, type NavMenuConfig, targetMeta } from "~/lib/nav-config";
import { cn } from "~/lib/utils";

// The sub nav, after Shopify's settings: a second dark panel beside the collapsed rail with a
// title up top and one row per section. Every section with sub items opens here: settings,
// contacts and any menu from the nav config. Leaving it is a click on any rail icon.

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

export function SubNav({ title, icon, meta, items, className }: { title: string; icon?: React.ReactNode; meta?: React.ReactNode; items: SubNavItem[]; className?: string }): React.ReactElement {
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

    </div>
  );
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
    return [
      {
        key: it.target,
        label: it.label ?? meta.label,
        icon: (
          <span style={it.color ? { color: it.color } : undefined} className="flex">
            <NavIcon name={icon} />
          </span>
        ),
        active: here,
        onClick: () => go(meta.page),
        open: here,
      },
    ];
  });
  return <SubNav title={menu.title ?? menu.label} icon={<NavIcon name={menu.icon ?? "folder"} />} items={items} />;
}

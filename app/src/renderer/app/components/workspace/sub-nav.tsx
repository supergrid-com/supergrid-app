import type * as React from "react";
import { cn } from "~/lib/utils";

// The sub nav, after Shopify's settings: a second dark panel beside the collapsed rail with a
// title up top and one row per section. Settings and each app's own menu open here. Leaving it is
// a click on any rail icon.

export type SubNavItem = {
  key: string;
  label: string;
  icon?: React.ReactNode;
  meta?: React.ReactNode;
  active: boolean;
  onClick: () => void;
};

const rowClass =
  "flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg ps-2.5 pe-2 text-left text-sm font-normal tracking-wide text-admin-fg outline-none transition-colors hover:bg-admin-hover hover:text-admin-strong focus-visible:ring-2 focus-visible:ring-admin-ring [&_svg]:text-admin-muted";
const activeClass = "bg-admin-active font-medium text-admin-strong hover:bg-admin-active [&_svg]:text-active";

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
            <li key={it.key}>
              <button type="button" aria-current={it.active ? "page" : undefined} onClick={it.onClick} className={cn(rowClass, it.active && activeClass)}>
                {it.icon && <span className="flex size-4 shrink-0 items-center justify-center [&_svg]:size-4">{it.icon}</span>}
                <span className="min-w-0 flex-1 truncate">{it.label}</span>
                {it.meta && <span className="shrink-0 text-xs text-admin-dim">{it.meta}</span>}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

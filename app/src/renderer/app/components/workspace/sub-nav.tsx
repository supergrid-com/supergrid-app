import { ChevronRightIcon } from "lucide-react";
import * as React from "react";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";

// The sub nav, after Shopify's settings: a second panel beside the collapsed rail with a title up
// top and one row per section. It is a page surface, the same card as the page beside it, so it
// reads in the page's colors whatever the sidebar theme. Settings and each app's own menu open
// here. Leaving it is a click on any rail icon.

export type SubNavItem = {
  key: string;
  label: string;
  icon?: React.ReactNode;
  meta?: React.ReactNode;
  active: boolean;
  onClick: () => void;
  /** Rows after the first group start a labelled group of their own when this changes. */
  group?: string;
  /** Beside the label, before the meta: a lock, a badge. */
  trailing?: React.ReactNode;
  /** A line of muted text in a group's place rather than a row: "None yet". */
  note?: boolean;
};

/** A group that folds: its rows hide behind the label until it is clicked. `collapsed` is how it starts, the first time. */
export type SubNavGroup = { label: string; collapsible?: boolean; collapsed?: boolean; /** Shown after the label, dimmed: how many rows it hides. */ meta?: React.ReactNode; /** A line across the panel before the group. */ divider?: boolean; /** At the end of the group's heading: a + that adds to it. */ action?: React.ReactNode };

/** Which groups are folded, per panel. A group that starts folded is folded again on every launch; a toggle holds only while the app runs. */
const foldedByPanel = new Map<string, Set<string>>();
function useFolded(key: string, groups: SubNavGroup[]): [Set<string>, (label: string) => void] {
  const [folded, setFolded] = React.useState<Set<string>>(() => foldedByPanel.get(key) ?? new Set(groups.filter((g) => g.collapsible && g.collapsed).map((g) => g.label)));
  const toggle = React.useCallback(
    (label: string) =>
      setFolded((prev) => {
        const next = new Set(prev);
        if (next.has(label)) next.delete(label);
        else next.add(label);
        foldedByPanel.set(key, next);
        return next;
      }),
    [key],
  );
  return [folded, toggle];
}

const rowClass =
  "flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg ps-2.5 pe-2 text-left text-[14px] font-normal tracking-wide text-foreground outline-none transition-colors hover:bg-accent";
const activeClass = "bg-accent font-medium hover:bg-accent [&_svg]:text-active";

export function SubNav({ title, icon, meta, action, items, groups = [], loading, className }: { title: string; icon?: React.ReactNode; meta?: React.ReactNode; action?: React.ReactNode; items: SubNavItem[]; /** The groups that fold, by the label the items carry. */ groups?: SubNavGroup[]; /** The rows are on their way: placeholder rows show in their place. */ loading?: boolean; className?: string }): React.ReactElement {
  const [folded, toggle] = useFolded(title, groups);
  const groupOf = (label: string | undefined) => (label ? groups.find((g) => g.label === label) : undefined);
  return (
    <div data-slot="sub-nav" className={cn("flex h-full w-full flex-col overflow-hidden rounded-2xl border bg-background bg-clip-padding text-foreground", className)}>
      {/* the title lines up with the rows' icons (the nav's px-3 plus a row's ps-2.5) */}
      <div className="flex shrink-0 items-center gap-2 pe-4 pt-5 pb-1.5 ps-[22px]">
        {icon && <span className="flex size-5 shrink-0 items-center justify-center [&_svg]:size-4">{icon}</span>}
        <h2 className="min-w-0 truncate font-heading text-[15px] font-semibold tracking-wide">{title}</h2>
        {meta}
        {action && <div className="-me-1.5 ms-auto flex shrink-0 items-center">{action}</div>}
      </div>
      <ScrollArea className="min-h-0 flex-1" scrollFade>
      <nav className="px-3 pb-4 pt-2">
        {loading && (
          <div aria-busy className="flex flex-col gap-0.5" aria-label="Loading">
            <Skeleton className="mx-2.5 mt-1 mb-1.5 h-3 w-12" />
            {[120, 96, 132, 88, 108].map((w, i) => (
              <div key={i} className="flex h-9 items-center gap-2.5 ps-2.5">
                <Skeleton className="size-4 rounded" />
                <Skeleton className="h-3.5 rounded" style={{ width: w }} />
              </div>
            ))}
          </div>
        )}
        <ul className={cn("flex flex-col gap-0.5", loading && "hidden")}>
          {items.map((it, i) => {
            const starts = it.group && (i === 0 || it.group !== items[i - 1]?.group);
            const g = groupOf(it.group);
            const hidden = !!g?.collapsible && folded.has(g.label) && !it.active;
            // a folded row that isn't carrying its group's label takes no room at all (the list's gap would add up)
            if (hidden && !starts) return null;
            return (
              <li key={it.key}>
                {starts && g?.divider && <div className="mx-2.5 mt-2.5 border-t" />}
                {starts && (i > 0 || g) && (
                  g?.collapsible ? (
                    <div className={cn("flex items-center gap-1 pe-1 ps-2.5 pb-1.5", i > 0 && !g.divider ? "pt-4" : g.divider ? "pt-2.5" : "pt-1")}>
                      <button type="button" aria-expanded={!folded.has(g.label)} onClick={() => toggle(g.label)} className="group/g flex min-w-0 flex-1 cursor-pointer items-center gap-1 rounded-md text-[11px] font-medium uppercase tracking-wider text-foreground/70 outline-none hover:text-foreground">
                        <span className="truncate">{g.label}</span>
                        {g.meta && <span className="ms-0.5 font-normal normal-case tracking-normal text-muted-foreground/80">{g.meta}</span>}
                        <ChevronRightIcon className={cn("ms-auto size-3 shrink-0 opacity-50 transition-transform group-hover/g:opacity-100", !folded.has(g.label) && "rotate-90")} />
                      </button>
                      {g.action}
                    </div>
                  ) : (
                    <div className={cn("flex items-center gap-1 pe-1 ps-2.5 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-foreground/70", i > 0 && !g?.divider ? "pt-4" : g?.divider ? "pt-2.5" : "pt-1")}>
                      <span className="truncate">{it.group}</span>
                      {g?.meta && <span className="ms-0.5 font-normal normal-case tracking-normal text-muted-foreground/80">{g.meta}</span>}
                      {g?.action && <span className="ms-auto">{g.action}</span>}
                    </div>
                  )
                )}
                {!hidden && it.note && <p className="px-2.5 py-1.5 text-[13px] text-muted-foreground">{it.label}</p>}
                {!hidden && !it.note && (
                  <button type="button" aria-current={it.active ? "page" : undefined} onClick={it.onClick} className={cn(rowClass, it.active && activeClass)}>
                    {it.icon && <span className="flex size-4 shrink-0 items-center justify-center [&_svg]:size-4">{it.icon}</span>}
                    <span className="min-w-0 flex-1 truncate">{it.label}</span>
                    {it.trailing}
                    {it.meta && <span className="shrink-0 text-xs text-muted-foreground">{it.meta}</span>}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
      </ScrollArea>
    </div>
  );
}

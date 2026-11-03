import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon, PanelLeftIcon } from "lucide-react";
import * as React from "react";
import { createPortal } from "react-dom";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "~/components/ui/pagination";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Tooltip, TooltipPopup, TooltipTrigger } from "~/components/ui/tooltip";
import { cn } from "~/lib/utils";

/** Where a page's title and actions land in the title bar. Absent, the frame shows them itself. */
export const FrameSlots = React.createContext<{ title: HTMLElement | null; actions: HTMLElement | null } | null>(null);

// A page title with levels: Data / contacts.
export function Crumbs({ items }: { items: React.ReactNode[] }): React.ReactElement {
  return (
    <span className="flex min-w-0 items-center gap-3">
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && (
            <span aria-hidden className="opacity-20">
              /
            </span>
          )}
          {item}
        </React.Fragment>
      ))}
    </span>
  );
}

// The workspace content frame: the white rounded card that fills the rest of the window. The page's
// icon, name and actions show in the title bar above it, and in a slim header of their own on a
// narrow window. `flush` pages (the data grid, the chat) take the whole card; the rest get a
// centered, padded column.
export function WorkspaceFrame({
  icon,
  title,
  actions,
  flush,
  width = "default",
  onOpenNav,
  children,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  actions?: React.ReactNode;
  flush?: boolean;
  width?: "default" | "wide" | "narrow";
  onOpenNav?: () => void;
  children: React.ReactNode;
}): React.ReactElement {
  const slots = React.useContext(FrameSlots);
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-admin-line bg-background bg-clip-padding text-foreground">
      {slots?.title &&
        createPortal(
          <>
            {icon && <span className="flex size-5 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-4">{icon}</span>}
            <h1 className="min-w-0 truncate text-sm font-medium tracking-wider">{title}</h1>
          </>,
          slots.title,
        )}
      {slots?.actions && actions && createPortal(actions, slots.actions)}
      <header className={cn("flex h-11 shrink-0 items-center gap-2 border-b px-3", slots && "md:hidden")}>
        {onOpenNav && (
          <button type="button" aria-label="Show Sidebar" onClick={onOpenNav} className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground md:hidden">
            <PanelLeftIcon className="size-4" />
          </button>
        )}
        {icon && <span className="flex size-5 items-center justify-center text-muted-foreground [&_svg]:size-4">{icon}</span>}
        <h1 className="min-w-0 truncate text-[13px] font-medium">{title}</h1>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5">{actions}</div>
      </header>
      {flush ? (
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <main className={cn("mx-auto flex w-full flex-col gap-5 px-4 py-4 sm:px-6", width === "default" && "max-w-5xl", width === "wide" && "max-w-7xl", width === "narrow" && "max-w-3xl")}>{children}</main>
        </ScrollArea>
      )}
    </div>
  );
}

// A page card inside the frame, like Shopify's: a title row, then the body on the card.
export function Card({ title, description, actions, children, className, padded = true }: { title?: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string; padded?: boolean }): React.ReactElement {
  return (
    <section className={cn("flex flex-col overflow-hidden rounded-xl border bg-card shadow-xs/5", className)}>
      {(title || actions) && (
        <div className="flex items-start gap-3 px-4 pt-3.5 pb-2">
          <div className="min-w-0 flex-1">
            {title && <h2 className="text-[13px] font-semibold">{title}</h2>}
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className={cn(padded && "px-4 pb-4", padded && !title && "pt-4")}>{children}</div>
    </section>
  );
}

// Shopify's index-table header: filter tabs on the left, search and sort on the right.
export function IndexHeader({ tabs, active, onChange, right }: { tabs: string[]; active?: string; onChange?: (tab: string) => void; right?: React.ReactNode }): React.ReactElement {
  return (
    <div className="flex h-11 items-center gap-1 border-b px-2">
      {tabs.map((t) => {
        const on = (active ?? tabs[0]) === t;
        return (
          <button
            key={t}
            type="button"
            onClick={() => onChange?.(t)}
            className={cn("flex h-7 cursor-pointer items-center rounded-lg px-2.5 text-[13px] transition-colors", on ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground")}
          >
            {t}
          </button>
        );
      })}
      <div className="flex-1" />
      {right}
    </div>
  );
}

// An icon-only button for a title bar or a card header, with its label as the tooltip.
export function IconButton({ label, children, onClick, className, disabled }: { label: string; children: React.ReactNode; onClick?: () => void; className?: string; disabled?: boolean }): React.ReactElement {
  return (
    <Tooltip>
      <TooltipTrigger render={<Button variant="ghost" size="icon-xs" aria-label={label} disabled={disabled} onClick={onClick} className={cn("text-muted-foreground hover:text-foreground", className)} />}>{children}</TooltipTrigger>
      <TooltipPopup>{label}</TooltipPopup>
    </Tooltip>
  );
}

// One number with its label, for a row of them across the top of a page.
export function StatTile({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }): React.ReactElement {
  return (
    <div className="flex flex-col gap-0.5 px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-heading text-xl font-semibold leading-tight">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

// ---- DataTable: the index table every list page shares ----

export type DataColumn<T> = {
  key: string;
  label: React.ReactNode;
  sortable?: boolean;
  align?: "start" | "end";
  /** A CSS width; columns without one share what is left. */
  width?: string;
  /** Extra classes on both the header and the cells, for `max-sm:hidden` and the like. */
  className?: string;
  render: (row: T) => React.ReactNode;
};

export type SortState = { key: string; dir: "asc" | "desc" };

// A compact table on the ui/table parts: sticky header, a checkbox column when rows can be
// selected, sortable headers, and a click per row. Rows are as dense as the data grid's.
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  sort,
  onSort,
  selected,
  onSelect,
  onRowClick,
  empty,
  expanded,
  renderExpanded,
  className,
}: {
  columns: DataColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  sort?: SortState;
  onSort?: (key: string) => void;
  selected?: Set<string>;
  onSelect?: (next: Set<string>) => void;
  onRowClick?: (row: T) => void;
  empty?: React.ReactNode;
  /** The key of the row whose detail shows underneath it, drawn by `renderExpanded`. */
  expanded?: string | null;
  renderExpanded?: (row: T) => React.ReactNode;
  className?: string;
}): React.ReactElement {
  const keys = rows.map(rowKey);
  const allOn = !!selected && keys.length > 0 && keys.every((k) => selected.has(k));
  const someOn = !!selected && !allOn && keys.some((k) => selected.has(k));
  const toggleAll = () => {
    if (!onSelect || !selected) return;
    const next = new Set(selected);
    if (allOn) for (const k of keys) next.delete(k);
    else for (const k of keys) next.add(k);
    onSelect(next);
  };
  const toggle = (k: string) => {
    if (!onSelect || !selected) return;
    const next = new Set(selected);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    onSelect(next);
  };
  const headClass = "h-8 bg-background px-2 text-xs font-medium text-muted-foreground shadow-[inset_0_-1px_0_var(--border)]";
  return (
    <div className={cn("min-h-0 flex-1 overflow-auto", className)}>
      <table className="w-full border-collapse text-[13px]">
        <TableHeader className="sticky top-0 z-10">
          <TableRow className="border-0 hover:bg-transparent">
            {onSelect && (
              <TableHead className={cn(headClass, "w-8 ps-3 pe-0")}>
                <Checkbox aria-label="Select all" checked={allOn} indeterminate={someOn} onCheckedChange={toggleAll} className="size-3.5 sm:size-3.5" />
              </TableHead>
            )}
            {columns.map((c, i) => {
              const active = sort?.key === c.key;
              const label = (
                <span className={cn("inline-flex items-center gap-1", c.align === "end" && "flex-row-reverse")}>
                  {c.label}
                  {c.sortable && (active ? sort!.dir === "asc" ? <ArrowUpIcon className="size-3" /> : <ArrowDownIcon className="size-3" /> : <ChevronsUpDownIcon className="size-3 opacity-0 group-hover:opacity-60" />)}
                </span>
              );
              return (
                <TableHead key={c.key} style={c.width ? { width: c.width } : undefined} className={cn(headClass, "group", c.align === "end" && "text-right", i === 0 && !onSelect && "ps-4", i === columns.length - 1 && "pe-4", c.className)}>
                  {c.sortable && onSort ? (
                    <button type="button" onClick={() => onSort(c.key)} className={cn("cursor-pointer hover:text-foreground", active && "text-foreground")}>
                      {label}
                    </button>
                  ) : (
                    label
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && empty !== undefined ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length + (onSelect ? 1 : 0)} className="p-0 whitespace-normal">
                {empty}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => {
              const k = rowKey(row);
              const on = !!selected?.has(k);
              const open = expanded != null && expanded === k && !!renderExpanded;
              return (
                <React.Fragment key={k}>
                <TableRow data-state={on ? "selected" : undefined} data-expanded={open ? "" : undefined} onClick={onRowClick ? () => onRowClick(row) : undefined} tabIndex={onRowClick ? 0 : undefined} onKeyDown={onRowClick ? (e) => { if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) { e.preventDefault(); onRowClick(row); } } : undefined} className={cn("h-10", onRowClick && "cursor-pointer", open && "border-b-0")}>
                  {onSelect && (
                    <TableCell className="w-8 ps-3 pe-0 py-0" onClick={(e) => e.stopPropagation()}>
                      <Checkbox aria-label="Select row" checked={on} onCheckedChange={() => toggle(k)} className="size-3.5 sm:size-3.5" />
                    </TableCell>
                  )}
                  {columns.map((c, i) => (
                    <TableCell key={c.key} className={cn("px-2 py-1.5", c.align === "end" && "text-right", i === 0 && !onSelect && "ps-4", i === columns.length - 1 && "pe-4", c.className)}>
                      {c.render(row)}
                    </TableCell>
                  ))}
                </TableRow>
                {open && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={columns.length + (onSelect ? 1 : 0)} className="whitespace-normal bg-muted/30 px-4 py-3">
                      {renderExpanded!(row)}
                    </TableCell>
                  </TableRow>
                )}
                </React.Fragment>
              );
            })
          )}
        </TableBody>
      </table>
    </div>
  );
}

// The strip under a table: which rows are on screen and the page buttons, plus whatever
// the page wants on the left.
export function TableFooter({ total, offset, limit, onPage, children }: { total: number; offset: number; limit: number; onPage: (offset: number) => void; children?: React.ReactNode }): React.ReactElement {
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(total, offset + limit);
  return (
    <div className="flex h-9 shrink-0 items-center gap-3 border-t px-3 text-[11px] text-muted-foreground">
      {children}
      <span className="flex-1 tabular-nums">
        {from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()}
      </span>
      <Pagination className="mx-0 w-auto">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious render={<Button size="xs" variant="ghost" disabled={offset <= 0} onClick={() => onPage(Math.max(0, offset - limit))} />} />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext render={<Button size="xs" variant="ghost" disabled={to >= total} onClick={() => onPage(offset + limit)} />} />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

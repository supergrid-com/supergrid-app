import { PanelLeftIcon } from "lucide-react";
import * as React from "react";
import { createPortal } from "react-dom";
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
          <button type="button" aria-label="Show sidebar" onClick={onOpenNav} className="flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground md:hidden">
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
        <div className="min-h-0 flex-1 overflow-y-auto">
          <main className={cn("mx-auto flex w-full flex-col gap-5 px-4 py-4 sm:px-6", width === "default" && "max-w-5xl", width === "wide" && "max-w-7xl", width === "narrow" && "max-w-3xl")}>{children}</main>
        </div>
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

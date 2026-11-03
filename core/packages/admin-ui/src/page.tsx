// The pieces every admin screen is made of, drawn as the SuperGrid desktop draws its own pages: a page with a title
// (which the shell shows in its title bar) and one main action, cards, a stat row, an empty state and a toolbar.
import * as React from "react";
import { Button } from "../ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "../ui/empty";
import { cn } from "../ui/utils";
import { useAdmin } from "./shell";

/** One screen: a centered column with its title, description, actions and content. Sets the shell's title. */
export function Page({ title, description, actions, width = "default", children, className }: { title: string; description?: React.ReactNode; actions?: React.ReactNode; width?: "default" | "wide" | "narrow"; children: React.ReactNode; className?: string }): React.ReactElement {
  const { host } = useAdmin();
  React.useEffect(() => { host?.setTitle(title); }, [host, title]);
  return (
    <main className={cn("mx-auto flex w-full flex-col gap-5 px-4 py-4 sm:px-6", width === "default" && "max-w-5xl", width === "wide" && "max-w-7xl", width === "narrow" && "max-w-3xl", className)}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-heading text-xl font-semibold leading-tight">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </header>
      {children}
    </main>
  );
}

/** A card: a title row, then the body. `padded={false}` for a table that fills it. */
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

/** One number with its label; put several in a `grid` or a `StatRow`. */
export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }): React.ReactElement {
  return (
    <div className="flex flex-col gap-0.5 px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-heading text-xl font-semibold leading-tight">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function StatRow({ children, className }: { children: React.ReactNode; className?: string }): React.ReactElement {
  return <div className={cn("grid divide-x rounded-xl border bg-card shadow-xs/5 sm:grid-cols-3", className)}>{children}</div>;
}

/** A labelled row inside a card: a label on the left, a value or a control on the right. */
export function Row({ label, hint, children }: { label: React.ReactNode; hint?: React.ReactNode; children: React.ReactNode }): React.ReactElement {
  return (
    <div className="flex items-start gap-4 border-b py-3 text-sm last:border-b-0">
      <div className="w-40 shrink-0">
        <div className="text-muted-foreground">{label}</div>
        {hint && <div className="text-xs text-muted-foreground/70">{hint}</div>}
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/** What a screen shows with nothing in it, with the one thing to do next. */
export function EmptyState({ icon, title, description, action, onAction, className }: { icon?: React.ReactNode; title: string; description?: React.ReactNode; action?: string; onAction?: () => void; className?: string }): React.ReactElement {
  return (
    <Empty className={cn("py-16", className)}>
      <EmptyHeader>
        {icon && <EmptyMedia variant="icon">{icon}</EmptyMedia>}
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {action && onAction && (
        <Button size="sm" onClick={onAction}>
          {action}
        </Button>
      )}
    </Empty>
  );
}

/** A row of controls above a table or a list: filters on the left, search and buttons on the right. */
export function Toolbar({ children, right, className }: { children?: React.ReactNode; right?: React.ReactNode; className?: string }): React.ReactElement {
  return (
    <div className={cn("flex min-h-9 flex-wrap items-center gap-2", className)}>
      {children}
      <div className="flex-1" />
      {right}
    </div>
  );
}

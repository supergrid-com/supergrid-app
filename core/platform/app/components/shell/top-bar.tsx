import { ChevronRightIcon } from "lucide-react";
import * as React from "react";
import { Link } from "react-router";
import { NavMark } from "~/components/shell/side-nav";
import { cn } from "~/lib/utils";

// The plain top bar for everything that is not the desk: a mark, breadcrumbs, and actions.
export function PageTopBar({ crumbs, actions }: { crumbs: { label: string; to?: string }[]; actions?: React.ReactNode }): React.ReactElement {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 px-4">
      <NavMark className="me-0.5" />
      <nav className="flex min-w-0 items-center gap-1 text-sm">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <React.Fragment key={`${c.label}-${i}`}>
              {i > 0 && <ChevronRightIcon className="size-3.5 shrink-0 text-muted-foreground/60" />}
              {last || !c.to ? (
                <span className={cn("truncate px-1.5 py-1", last ? "font-medium text-foreground" : "text-muted-foreground")}>{c.label}</span>
              ) : (
                <Link to={c.to} className="truncate rounded-md px-1.5 py-1 text-muted-foreground hover:bg-accent hover:text-foreground">
                  {c.label}
                </Link>
              )}
            </React.Fragment>
          );
        })}
      </nav>
      <div className="flex-1" />
      {actions}
    </header>
  );
}

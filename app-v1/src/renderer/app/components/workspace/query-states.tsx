import { CircleAlertIcon, RefreshCwIcon } from "lucide-react";
import type * as React from "react";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import type { WsQuery } from "~/lib/ws-query";
import { cn } from "~/lib/utils";

// The three states a query passes through before it has rows: loading (a skeleton), failed
// (the message and a retry) and empty (whatever the page wants to say). With data, the
// children render it.

const isEmpty = (d: unknown): boolean => d == null || (Array.isArray(d) && d.length === 0) || (typeof d === "object" && Array.isArray((d as { items?: unknown }).items) && (d as { items: unknown[] }).items.length === 0);

export function QueryState<T>({
  q,
  skeleton,
  empty,
  emptyWhen = isEmpty,
  className,
  children,
}: {
  q: WsQuery<T>;
  skeleton?: React.ReactNode;
  empty?: React.ReactNode;
  emptyWhen?: (data: T) => boolean;
  className?: string;
  children: (data: T) => React.ReactNode;
}): React.ReactElement {
  if (q.error && q.data === undefined) {
    return (
      <div className={cn("flex flex-col items-center gap-3 px-6 py-10 text-center text-[13px]", className)}>
        <span className="flex size-9 items-center justify-center rounded-lg bg-destructive/8 text-destructive-foreground">
          <CircleAlertIcon className="size-4" />
        </span>
        <div className="max-w-md text-muted-foreground">{q.error}</div>
        <Button size="xs" variant="outline" onClick={() => void q.refetch()}>
          <RefreshCwIcon />
          Retry
        </Button>
      </div>
    );
  }
  if (q.data === undefined) return <>{skeleton ?? <RowsSkeleton className={className} />}</>;
  if (empty !== undefined && emptyWhen(q.data)) return <>{empty}</>;
  return <>{children(q.data)}</>;
}

/** A few grey lines, the shape of a list that is still on its way. */
export function RowsSkeleton({ rows = 6, className }: { rows?: number; className?: string }): React.ReactElement {
  return (
    <div className={cn("flex flex-col gap-2.5 px-4 py-4", className)} aria-busy>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-6 rounded-full" />
          <Skeleton className="h-3.5 flex-1" style={{ maxWidth: `${55 - (i % 3) * 10}%` }} />
          <Skeleton className="h-3.5 w-16" />
        </div>
      ))}
    </div>
  );
}

import type * as React from "react";
import { cn } from "~/lib/utils";

/** Text with a light passing through it, for work in progress. See .shimmer in app.css. */
export function Shimmer({ children, className }: { children: string; className?: string }): React.ReactElement {
  return <span className={cn("shimmer", className)}>{children}</span>;
}

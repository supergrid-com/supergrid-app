import type * as React from "react";
import { cn } from "~/lib/utils";

/**
 * Text a light passes through, for work in progress (after AI Elements' Shimmer). The colors come
 * from --muted-foreground and --foreground, so a surface can retheme it; see .shimmer in app.css.
 */
export function Shimmer({ children, duration = 2, className }: { children: string; duration?: number; className?: string }): React.ReactElement {
  return (
    <span className={cn("shimmer", className)} style={{ animationDuration: `${duration}s` }}>
      {children}
    </span>
  );
}

import type * as React from "react";
import { BrandMark } from "~/components/brand-mark";

// The frame for screens outside the shell (first-run setup): a bare title bar, so the window
// still drags and clears the traffic lights, over a scrolling body.
export function AuthFrame({ end, children }: { end?: React.ReactNode; children: React.ReactNode }): React.ReactElement {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="titlebar flex h-12 shrink-0 items-center gap-2 px-4 pt-2">
        <BrandMark className="me-0.5" />
        <span className="font-heading text-sm font-medium">SuperGrid</span>
        <div className="flex-1" />
        {end}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <main className="px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}

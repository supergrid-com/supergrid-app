import type * as React from "react";
import { PageTopBar } from "~/components/shell/top-bar";
import { cn } from "~/lib/utils";

// Every page that is not the desk: the plain top bar, then a scrolling, centered content column.
export function PageFrame({
  crumbs,
  actions,
  width = "default",
  children,
}: {
  crumbs: { label: string; to?: string }[];
  actions?: React.ReactNode;
  width?: "default" | "wide" | "narrow";
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageTopBar crumbs={crumbs} actions={actions} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <main className={cn("mx-auto flex w-full flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8", width === "default" && "max-w-6xl", width === "wide" && "max-w-7xl", width === "narrow" && "max-w-3xl")}>{children}</main>
      </div>
    </div>
  );
}

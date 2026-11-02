import { CheckIcon, CircleIcon, LoaderCircleIcon } from "lucide-react";
import type * as React from "react";
import type { PlanEntry } from "../../../../shared/acp";
import { cn } from "~/lib/utils";

/** The agent's plan, ticking off as it goes. */
export function Plan({ entries }: { entries: PlanEntry[] }): React.ReactElement {
  return (
    <div className="rounded-lg border bg-background/60 px-3 py-2 text-xs">
      <div className="mb-1.5 font-medium text-muted-foreground">Plan</div>
      <ul className="flex flex-col gap-1">
        {entries.map((e, i) => (
          <li key={i} className={cn("flex items-start gap-2 leading-relaxed", e.status === "completed" && "text-muted-foreground line-through")}>
            <span className="mt-0.5 flex size-3.5 shrink-0 items-center justify-center">
              {e.status === "completed" ? <CheckIcon className="size-3.5 text-success" /> : e.status === "in_progress" ? <LoaderCircleIcon className="size-3.5 animate-spin text-muted-foreground" /> : <CircleIcon className="size-2.5 text-muted-foreground" />}
            </span>
            <span>{e.content}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

import type * as React from "react";
import { Tooltip, TooltipPopup, TooltipTrigger } from "~/components/ui/tooltip";

const compact = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));
const RADIUS = 5.5;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** How much of the model's context the conversation has used, with the cost so far on hover. */
export function Context({ used, size, cost }: { used: number; size: number; cost: number | null }): React.ReactElement {
  const share = Math.min(1, used / size);
  return (
    <Tooltip>
      <TooltipTrigger render={<span tabIndex={0} aria-label="Context used" className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-none hover:text-foreground" />}>
        <svg viewBox="0 0 14 14" className="size-3.5 -rotate-90" aria-hidden="true">
          <circle cx="7" cy="7" r={RADIUS} fill="none" stroke="currentColor" strokeOpacity={0.25} strokeWidth={1.5} />
          <circle cx="7" cy="7" r={RADIUS} fill="none" stroke="var(--active)" strokeWidth={1.5} strokeLinecap="round" strokeDasharray={`${Math.max(share * CIRCUMFERENCE, 1)} ${CIRCUMFERENCE}`} />
        </svg>
      </TooltipTrigger>
      <TooltipPopup>
        {compact(used)} of {compact(size)} context ({Math.round(share * 100)}%)
        {cost !== null && ` · $${cost.toFixed(cost < 0.1 ? 3 : 2)}`}
      </TooltipPopup>
    </Tooltip>
  );
}

import { BrainIcon, ChevronDownIcon } from "lucide-react";
import * as React from "react";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "~/components/ui/collapsible";
import { cn } from "~/lib/utils";
import { MessageResponse } from "./message";
import { Shimmer } from "./shimmer";

/** The agent's thinking: open while it streams, folds away a moment after, and says how long it took. */
export function Reasoning({ text, streaming }: { text: string; streaming: boolean }): React.ReactElement {
  const [open, setOpen] = React.useState(streaming);
  const [seconds, setSeconds] = React.useState<number | null>(null);
  const startedAt = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (streaming) {
      startedAt.current ??= Date.now();
      setOpen(true);
      return;
    }
    if (startedAt.current === null) return;
    setSeconds(Math.max(1, Math.ceil((Date.now() - startedAt.current) / 1000)));
    startedAt.current = null;
    const timer = setTimeout(() => setOpen(false), 1000);
    return () => clearTimeout(timer);
  }, [streaming]);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="min-w-0">
      <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground outline-none transition-colors hover:text-foreground">
        <BrainIcon className="size-3.5" />
        {streaming ? <Shimmer>Thinking…</Shimmer> : <span>{seconds ? `Thought for ${seconds}s` : "Thought for a few seconds"}</span>}
        <ChevronDownIcon className={cn("size-3.5 transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsiblePanel>
        <div className="mt-2 border-s-2 ps-3 text-xs text-muted-foreground">
          <MessageResponse streaming={streaming}>{text}</MessageResponse>
        </div>
      </CollapsiblePanel>
    </Collapsible>
  );
}

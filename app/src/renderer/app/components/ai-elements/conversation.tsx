import { ArrowDownIcon } from "lucide-react";
import type * as React from "react";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

/** The transcript: follows new content unless the reader has scrolled up. */
// The library reserves the scrollbar's width on both edges. Keep only the right one, and let it sit
// in the panel's padding (a thin scrollbar is 11px), so messages line up with the composer.
export function Conversation({ className, ...props }: React.ComponentProps<typeof StickToBottom>): React.ReactElement {
  return <StickToBottom className={cn("relative -me-2.75 min-h-0 flex-1 overflow-y-hidden", className)} initial="instant" resize="smooth" role="log" {...props} />;
}

export function ConversationContent({ className, ...props }: React.ComponentProps<typeof StickToBottom.Content>): React.ReactElement {
  return <StickToBottom.Content scrollClassName="[scrollbar-gutter:stable]!" className={cn("flex flex-col gap-5 pt-3 pb-4", className)} {...props} />;
}

export function ConversationEmptyState({ className, children }: { className?: string; children: React.ReactNode }): React.ReactElement {
  return <div className={cn("flex min-h-64 flex-1 flex-col items-center justify-center gap-3 p-6 text-center", className)}>{children}</div>;
}

export function ConversationScrollButton(): React.ReactElement | null {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();
  if (isAtBottom) return null;
  return (
    <Button aria-label="Scroll to the latest" onClick={() => void scrollToBottom()} size="icon-sm" variant="outline" className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-popover text-popover-foreground shadow-md/5">
      <ArrowDownIcon />
    </Button>
  );
}

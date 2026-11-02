import type * as React from "react";
import { Button } from "~/components/ui/button";
import { Toolbar, ToolbarButton, ToolbarSeparator } from "~/components/ui/toolbar";
import { Tooltip, TooltipPopup, TooltipTrigger } from "~/components/ui/tooltip";
import { usePlatform } from "~/lib/platform";
import { cn } from "~/lib/utils";

// The title bar's toolbars: Base UI's Toolbar, so arrow keys move along a bar, styled to sit quietly
// on the admin layer. The nav, the chat and the canvas each have one.

export function BarToolbar({ className, ...props }: React.ComponentProps<typeof Toolbar>): React.ReactElement {
  const { adminDark } = usePlatform();
  return <Toolbar className={cn("on-admin min-w-0 items-center gap-0.5 rounded-none border-0 bg-transparent p-0 text-foreground", adminDark ? "dark" : "light", className)} {...props} />;
}

/** A ghost icon button with its name, and any shortcut, in a tooltip. */
export function BarButton({ label, hint, disabled, onClick, children }: { label: string; hint?: React.ReactNode; disabled?: boolean; onClick?: () => void; children: React.ReactNode }): React.ReactElement {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <ToolbarButton
            disabled={disabled}
            focusableWhenDisabled={false}
            onClick={onClick}
            aria-label={label}
            render={<Button variant="ghost" size="icon" className="size-7 rounded-lg text-muted-foreground hover:text-foreground sm:size-7 [&_svg]:size-4" />}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipPopup className="flex items-center gap-2">
        {label}
        {hint}
      </TooltipPopup>
    </Tooltip>
  );
}

export const BarSeparator = (): React.ReactElement => <ToolbarSeparator orientation="vertical" className="mx-1 my-0 h-4 self-center bg-admin-line" />;

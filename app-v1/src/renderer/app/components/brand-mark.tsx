import { LayoutGridIcon, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import type * as React from "react";
import { Link } from "react-router";
import { Menu, MenuGroup, MenuGroupLabel, MenuItem, MenuPopup, MenuRadioGroup, MenuRadioItem, MenuSeparator, MenuTrigger } from "~/components/ui/menu";
import { Tooltip, TooltipPopup, TooltipTrigger } from "~/components/ui/tooltip";
import { usePlatform } from "~/lib/platform";
import { cn } from "~/lib/utils";

// The SuperGrid mark at the left of every top bar, sized and styled like the icon buttons beside
// it. There is no side nav in the desktop app: this one button holds the way back to the
// workspaces and the appearance. The org switcher and the account join it with the control plane.
export function BrandMark({ className }: { className?: string }): React.ReactElement {
  const { theme, setTheme } = usePlatform();
  return (
    <Menu>
      <Tooltip>
        <TooltipTrigger
          render={
            <MenuTrigger
              render={
                <button
                  type="button"
                  aria-label="SuperGrid menu"
                  className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground/7 font-heading text-sm font-medium tracking-tight text-foreground outline-none transition-colors hover:bg-foreground/12 focus-visible:ring-[3px] focus-visible:ring-ring/40 data-popup-open:bg-foreground/12", className)}
                />
              }
            />
          }
        >
          SG
        </TooltipTrigger>
        <TooltipPopup>SuperGrid</TooltipPopup>
      </Tooltip>
      <MenuPopup align="start" className="w-60">
        <MenuItem render={<Link to="/" />}>
          <LayoutGridIcon />
          Workspaces
        </MenuItem>
        <MenuSeparator />
        <MenuGroup>
          <MenuGroupLabel>Appearance</MenuGroupLabel>
          <MenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as typeof theme)}>
            <MenuRadioItem value="light">
              <span className="flex items-center gap-2"><SunIcon />Light</span>
            </MenuRadioItem>
            <MenuRadioItem value="dark">
              <span className="flex items-center gap-2"><MoonIcon />Dark</span>
            </MenuRadioItem>
            <MenuRadioItem value="system">
              <span className="flex items-center gap-2"><MonitorIcon />System</span>
            </MenuRadioItem>
          </MenuRadioGroup>
        </MenuGroup>
      </MenuPopup>
    </Menu>
  );
}

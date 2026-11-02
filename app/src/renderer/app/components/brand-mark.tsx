import { CheckIcon, LayoutGridIcon, MonitorIcon, MoonIcon, SettingsIcon, SunIcon, UserIcon } from "lucide-react";
import type * as React from "react";
import { Link } from "react-router";
import { Menu, MenuGroup, MenuGroupLabel, MenuItem, MenuPopup, MenuRadioGroup, MenuRadioItem, MenuSeparator, MenuTrigger } from "~/components/ui/menu";
import { Tooltip, TooltipPopup, TooltipTrigger } from "~/components/ui/tooltip";
import { me, orgs } from "~/lib/mock";
import { usePlatform } from "~/lib/platform";
import { cn } from "~/lib/utils";

// The SuperGrid mark at the left of every top bar, sized and styled like the icon buttons beside
// it. There is no side nav in the desktop app: this one button holds the org switcher and the few
// pages that are not a workspace.
export function BrandMark({ className }: { className?: string }): React.ReactElement {
  const { orgId, setOrgId, theme, setTheme } = usePlatform();
  const org = orgs.find((o) => o.id === orgId) ?? orgs[0];
  return (
    <Menu>
      <Tooltip>
        <TooltipTrigger
          render={
            <MenuTrigger
              render={
                <button
                  type="button"
                  aria-label={`${org.name}: switch organization or open settings`}
                  className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground/7 font-heading text-sm font-medium tracking-tight text-foreground outline-none transition-colors hover:bg-foreground/12 focus-visible:ring-[3px] focus-visible:ring-ring/40 data-popup-open:bg-foreground/12", className)}
                />
              }
            />
          }
        >
          SG
        </TooltipTrigger>
        <TooltipPopup>{org.name}</TooltipPopup>
      </Tooltip>
      <MenuPopup align="start" className="w-60">
        <MenuGroup>
          <MenuGroupLabel>Organizations</MenuGroupLabel>
          {orgs.map((o) => (
            <MenuItem key={o.id} onClick={() => setOrgId(o.id)}>
              <span className="flex size-5 items-center justify-center rounded-md bg-muted text-[11px] font-bold">{o.name.slice(0, 1)}</span>
              <span className="flex-1 truncate">{o.name}</span>
              {o.id === org.id && <CheckIcon className="size-4 opacity-70" />}
            </MenuItem>
          ))}
        </MenuGroup>
        <MenuSeparator />
        <MenuItem render={<Link to="/" />}>
          <LayoutGridIcon />
          Workspaces
        </MenuItem>
        <MenuItem render={<Link to="/apps" />}>App store</MenuItem>
        <MenuItem render={<Link to="/org" />}>Members and roles</MenuItem>
        <MenuItem render={<Link to="/settings" />}>
          <SettingsIcon />
          Settings
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
        <MenuSeparator />
        <MenuItem render={<Link to="/account" />}>
          <UserIcon />
          {me.name}
        </MenuItem>
      </MenuPopup>
    </Menu>
  );
}

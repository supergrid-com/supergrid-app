import type * as React from "react";
import { Dialog, DialogPopup, DialogTitle } from "~/components/ui/dialog";
import { useSession } from "~/lib/session";
import { cn } from "~/lib/utils";
import { Activity } from "~/pages/org/activity";
import { Appearance } from "~/pages/org/appearance";
import { OrgApps } from "~/pages/org/apps";
import { Cloudflare } from "~/pages/org/cloudflare";
import { OrgSettings } from "~/pages/org/settings";
import { OrgWorkspaces } from "~/pages/org/workspaces";
import { WorkspaceDanger, WorkspaceDomain, WorkspaceGeneral, WorkspaceUpdates } from "~/pages/workspace/settings";
import { useOrgModal } from "~/shell/context";
import { settingsGroups, type SettingsSectionId } from "~/shell/sections";

// The app's settings, as one large modal over the workspace: the workspace's own settings, then
// the organization's (its workspaces, apps, Cloudflare account, activity) and the app's appearance.
// It lives in the URL (?org=<section>), so back closes it. The page behind is dimmed, not blurred.

const bodies: Record<SettingsSectionId, () => React.ReactElement | null> = {
  general: WorkspaceGeneral,
  domain: WorkspaceDomain,
  updates: WorkspaceUpdates,
  danger: WorkspaceDanger,
  organization: OrgSettings,
  workspaces: OrgWorkspaces,
  apps: OrgApps,
  cloudflare: Cloudflare,
  activity: Activity,
  appearance: Appearance,
};

export function OrgModal(): React.ReactElement | null {
  const { section, open, close } = useOrgModal();
  const { org } = useSession();
  if (!org) return null;
  const Body = section ? (bodies[section] ?? WorkspaceGeneral) : null;
  return (
    <Dialog open={!!section} onOpenChange={(o) => !o && close()}>
      <DialogPopup className="h-[86dvh] max-w-[min(1120px,94vw)] overflow-hidden p-0" backdropProps={{ className: "backdrop-blur-none" }}>
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <div className="flex min-h-0 flex-1">
          <aside className="flex w-56 shrink-0 flex-col gap-5 overflow-y-auto border-e bg-muted/40 px-2 py-4">
            {settingsGroups.map((g) => (
              <nav key={g.id} aria-label={`${g.label} settings`}>
                <div className="px-2.5 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{g.label}</div>
                <ul className="flex flex-col gap-0.5">
                  {g.items.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => open(s.id)}
                        aria-current={s.id === section ? "page" : undefined}
                        className={cn(
                          "flex h-8 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-left text-sm outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-4 [&_svg]:text-muted-foreground",
                          s.id === section && "bg-accent font-medium [&_svg]:text-foreground",
                        )}
                      >
                        <s.icon />
                        {s.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </aside>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">{Body && <Body />}</div>
        </div>
      </DialogPopup>
    </Dialog>
  );
}

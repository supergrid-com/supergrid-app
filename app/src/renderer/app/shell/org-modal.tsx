import type * as React from "react";
import { Dialog, DialogPopup, DialogTitle } from "~/components/ui/dialog";
import { useSession } from "~/lib/session";
import { cn } from "~/lib/utils";
import { Activity } from "~/pages/org/activity";
import { OrgApps } from "~/pages/org/apps";
import { Cloudflare } from "~/pages/org/cloudflare";
import { OrgSettings } from "~/pages/org/settings";
import { OrgWorkspaces } from "~/pages/org/workspaces";
import { useOrgModal } from "~/shell/context";
import { orgSections, type OrgSectionId } from "~/shell/sections";

// The organization's own pages (its workspaces, apps, Cloudflare account, activity and settings),
// as one large modal over the workspace instead of pages of their own. It lives in the URL
// (?org=<section>), so back closes it.

const bodies: Record<OrgSectionId, () => React.ReactElement | null> = {
  workspaces: OrgWorkspaces,
  apps: OrgApps,
  cloudflare: Cloudflare,
  activity: Activity,
  settings: OrgSettings,
};

export function OrgModal(): React.ReactElement | null {
  const { section, open, close } = useOrgModal();
  const { org } = useSession();
  if (!org) return null;
  const Body = section ? (bodies[section] ?? OrgWorkspaces) : null;
  return (
    <Dialog open={!!section} onOpenChange={(o) => !o && close()}>
      <DialogPopup className="h-[86dvh] max-w-[min(1120px,94vw)] overflow-hidden p-0">
        <div className="flex min-h-0 flex-1">
          <aside className="flex w-56 shrink-0 flex-col border-e bg-muted/40">
            <div className="px-4 pt-4 pb-3">
              <DialogTitle className="truncate font-heading text-base font-semibold">{org.name}</DialogTitle>
              <p className="truncate text-xs text-muted-foreground">{org.cloudflare ? `Cloudflare: ${org.cloudflare.accountName}` : "Organization"}</p>
            </div>
            <nav className="px-2">
              <ul className="flex flex-col gap-0.5">
                {orgSections.map((s) => (
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
          </aside>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">{Body && <Body />}</div>
        </div>
      </DialogPopup>
    </Dialog>
  );
}

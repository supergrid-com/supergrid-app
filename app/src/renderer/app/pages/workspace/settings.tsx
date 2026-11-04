import { ExternalLinkIcon } from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router";
import { SectionPage } from "~/components/section-page";
import { AlertDialog, AlertDialogClose, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogPopup, AlertDialogTitle } from "~/components/ui/alert-dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "~/components/ui/empty";
import { SegmentedControl, SegmentedControlItem } from "~/components/ui/segmented-control";
import { Spinner } from "~/components/ui/spinner";
import { toastManager } from "~/components/ui/toast";
import { Card } from "~/components/workspace/frame";
import { sg } from "~/lib/bridge";
import { useChatSide } from "~/lib/chat-side";
import { removeOrg, useOrgs } from "~/lib/orgs";
import { useLatestRelease } from "~/lib/release";
import { useSession } from "~/lib/session";
import { clean } from "~/lib/workspaces";
import { useShell } from "~/shell/context";

// The workspace's settings, as the Workspace group of the settings modal. General and Updates show
// what the account says about the workspace; the Danger Zone resets or removes the demo; the rest
// aren't built yet.

function Row({ label, children }: { label: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div className="flex items-baseline gap-4 border-b py-2.5 text-sm last:border-b-0">
      <span className="w-32 shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 break-words">{children}</span>
    </div>
  );
}

function NotBuilt({ about }: { about: string }): React.ReactElement {
  return (
    <Empty className="py-16">
      <EmptyHeader>
        <EmptyTitle>Not Built Yet</EmptyTitle>
        <EmptyDescription>{about}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export function WorkspaceGeneral(): React.ReactElement {
  const { ws } = useShell();
  const { org } = useSession();
  const [side, setSide] = useChatSide(ws.id);
  return (
    <SectionPage title="General" width={760}>
      <Card>
        <Row label="Name">{ws.name}</Row>
        <Row label="Workspace ID">
          <span className="font-mono text-[13px]">{ws.id}</span>
        </Row>
        <Row label="Worker and D1">
          <span className="font-mono text-[13px]">{ws.worker}</span>
        </Row>
        <Row label="Address">
          <a href={ws.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline-offset-4 hover:underline">
            {ws.url}
            <ExternalLinkIcon className="size-3.5 text-muted-foreground" />
          </a>
        </Row>
        <Row label="Cloudflare">{ws.local ? "None: this workspace runs only on this Mac" : (org?.cloudflare?.accountName ?? "—")}</Row>
        <Row label="Agent Panel">
          <SegmentedControl size="sm" aria-label="Agent Panel Side">
            {(["left", "right"] as const).map((s) => (
              <SegmentedControlItem key={s} aria-pressed={side === s} data-pressed={side === s || undefined} onClick={() => setSide(s)}>
                {s === "left" ? "Left of the Page" : "Right of the Page"}
              </SegmentedControlItem>
            ))}
          </SegmentedControl>
        </Row>
      </Card>
    </SectionPage>
  );
}

export function WorkspaceUpdates(): React.ReactElement {
  const { ws } = useShell();
  const latest = useLatestRelease();
  const behind = !!latest && !!ws.version && ws.version !== latest.version;
  return (
    <SectionPage title="Updates" width={760}>
      <Card>
        <Row label="Running">{ws.version ?? "unknown"}</Row>
        <Row label="Newest">
          <span className="flex flex-wrap items-center gap-2">
            {latest ? `${latest.version}: ${latest.notes}` : "checking the feed…"}
            {latest && (
              <Badge variant={behind ? "warning" : "success"} size="sm">
                {behind ? "An update is available" : "Up to date"}
              </Badge>
            )}
          </span>
        </Row>
        {behind && <p className="pt-2 text-xs text-muted-foreground">Updating from here isn't built yet.</p>}
      </Card>
    </SectionPage>
  );
}

export function WorkspaceDomain(): React.ReactElement {
  return (
    <SectionPage title="Domain & Sitemap">
      <NotBuilt about="A custom domain for the workspace, and which app serves which path." />
    </SectionPage>
  );
}

export function WorkspaceDanger(): React.ReactElement {
  const { ws } = useShell();
  if (ws.demo) return <DemoDanger />;
  return (
    <SectionPage title="Danger Zone">
      <NotBuilt about="Pausing, moving or deleting the workspace." />
    </SectionPage>
  );
}

function DangerRow({ title, description, children }: { title: string; description: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border px-4 py-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </div>
      {children}
    </div>
  );
}

/** The demo's own: its sample data back to how it started, or the demo gone from this Mac (src/main/demo.ts). */
function DemoDanger(): React.ReactElement {
  const { ws } = useShell();
  const { org, setOrg } = useSession();
  const orgs = useOrgs();
  const navigate = useNavigate();
  const [confirm, setConfirm] = React.useState<"reset" | "remove" | null>(null);
  const [busy, setBusy] = React.useState(false);

  const reset = async () => {
    if (!sg) return;
    setBusy(true);
    try {
      await sg.demo.reset(ws.id);
      // every page caches what it read; a fresh window reads the new rows (the dev server keeps running in main)
      window.location.reload();
    } catch (e) {
      toastManager.add({ title: "Couldn't Reset the Demo", description: clean(e), type: "error" });
      setBusy(false);
      setConfirm(null);
    }
  };
  const remove = async () => {
    if (!sg || !org) return;
    setBusy(true);
    try {
      await sg.demo.remove(ws.id);
      // the demo's organization has nothing else in it, so it goes too
      const next = orgs.find((o) => o.id !== org.id);
      if (!org.cloudflare) removeOrg(org.id);
      if (next) {
        setOrg(next.id);
        navigate("/");
      } else navigate("/welcome");
    } catch (e) {
      toastManager.add({ title: "Couldn't Remove the Demo", description: clean(e), type: "error" });
      setBusy(false);
      setConfirm(null);
    }
  };

  return (
    <SectionPage title="Danger Zone" width={760}>
      <div className="flex flex-col gap-3">
        <DangerRow title="Reset Demo Data" description="Throws the database away and fills it with the sample data again. Apps and code you changed stay.">
          <Button size="sm" variant="outline" onClick={() => setConfirm("reset")}>
            Reset
          </Button>
        </DangerRow>
        <DangerRow title="Remove Demo" description="Stops its dev server and deletes its repo from this Mac, apps and all.">
          <Button size="sm" variant="destructive-outline" onClick={() => setConfirm("remove")}>
            Remove
          </Button>
        </DangerRow>
      </div>
      <AlertDialog open={!!confirm} onOpenChange={(open) => !busy && !open && setConfirm(null)}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm === "reset" ? "Reset the demo's data?" : "Remove the demo from this Mac?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "reset" ? "Every row in its database is replaced with the sample data. It takes a few seconds." : "Its repo and database are deleted. You can make a new demo from setup."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose disabled={busy} render={<Button variant="ghost" />}>
              Cancel
            </AlertDialogClose>
            <Button variant={confirm === "reset" ? "default" : "destructive"} disabled={busy} onClick={() => void (confirm === "reset" ? reset() : remove())}>
              {busy && <Spinner className="size-4" />}
              {confirm === "reset" ? "Reset" : "Remove"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </SectionPage>
  );
}

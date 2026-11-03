import { ExternalLinkIcon } from "lucide-react";
import type * as React from "react";
import { SectionPage } from "~/components/section-page";
import { Badge } from "~/components/ui/badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "~/components/ui/empty";
import { Card } from "~/components/workspace/frame";
import { useLatestRelease } from "~/lib/release";
import { useSession } from "~/lib/session";
import { useShell } from "~/shell/context";

// The workspace's settings, as the Workspace group of the settings modal. General and Updates show
// what the account says about the workspace; the rest aren't built yet.

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
        <Row label="Cloudflare">{org?.cloudflare?.accountName ?? "—"}</Row>
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
  return (
    <SectionPage title="Danger Zone">
      <NotBuilt about="Pausing, moving or deleting the workspace." />
    </SectionPage>
  );
}

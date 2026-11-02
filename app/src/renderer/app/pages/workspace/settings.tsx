import { ExternalLinkIcon } from "lucide-react";
import type * as React from "react";
import { useParams } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "~/components/ui/empty";
import { Card, WorkspaceFrame } from "~/components/workspace/frame";
import { useLatestRelease } from "~/lib/release";
import { useSession } from "~/lib/session";
import { useOpenNav, useShell } from "~/shell/context";
import { settingsSections } from "~/shell/sections";

// Workspace settings, one section per address (/settings/<section>), picked in the second panel.
// General and Updates show what the account says about the workspace; the rest aren't built yet.

function Row({ label, children }: { label: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div className="flex items-baseline gap-4 border-b py-2.5 text-sm last:border-b-0">
      <span className="w-32 shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 break-words">{children}</span>
    </div>
  );
}

function General(): React.ReactElement {
  const { ws } = useShell();
  const { org } = useSession();
  return (
    <Card title="General" description="What the workspace's Worker says about itself.">
      <Row label="Name">{ws.name}</Row>
      <Row label="Workspace id">
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
  );
}

function Updates(): React.ReactElement {
  const { ws } = useShell();
  const latest = useLatestRelease();
  const behind = !!latest && !!ws.version && ws.version !== latest.version;
  return (
    <Card title="Updates" description="The workspace Worker runs a signed release from the feed.">
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
  );
}

function NotBuilt({ about }: { about: string }): React.ReactElement {
  return (
    <Empty className="py-16">
      <EmptyHeader>
        <EmptyTitle>Not built yet</EmptyTitle>
        <EmptyDescription>{about}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export function WorkspaceSettings(): React.ReactElement {
  const { section = "general" } = useParams();
  const onOpenNav = useOpenNav();
  const meta = settingsSections.find((s) => s.id === section);
  const Icon = meta?.icon;
  return (
    <WorkspaceFrame icon={Icon && <Icon />} title={meta?.label ?? "Settings"} width="narrow" onOpenNav={onOpenNav}>
      {section === "general" ? (
        <General />
      ) : section === "updates" ? (
        <Updates />
      ) : section === "domain" ? (
        <NotBuilt about="A custom domain for the workspace, and which app serves which path." />
      ) : section === "danger" ? (
        <NotBuilt about="Pausing, moving or deleting the workspace." />
      ) : (
        <NotBuilt about="There is no such settings section." />
      )}
    </WorkspaceFrame>
  );
}

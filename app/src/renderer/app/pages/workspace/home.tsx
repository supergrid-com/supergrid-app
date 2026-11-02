import { ExternalLinkIcon, HomeIcon, PackageIcon } from "lucide-react";
import type * as React from "react";
import { Link } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Card, WorkspaceFrame } from "~/components/workspace/frame";
import { useLatestRelease } from "~/lib/release";
import { useOpenNav, useShell } from "~/shell/context";

// The workspace at a glance, from what its Worker says about itself: where it lives, which release
// it runs against the newest on the feed, and its apps. Traffic, contacts and activity join it once
// those sections are real.

function Row({ label, children }: { label: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div className="flex items-baseline gap-4 py-1.5 text-sm">
      <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 break-words">{children}</span>
    </div>
  );
}

export function Home(): React.ReactElement {
  const { ws } = useShell();
  const onOpenNav = useOpenNav();
  const latest = useLatestRelease();
  const behind = !!latest && !!ws.version && ws.version !== latest.version;
  return (
    <WorkspaceFrame icon={<HomeIcon />} title={ws.name} onOpenNav={onOpenNav}>
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Workspace" description="What its Worker says about itself.">
          <Row label="Address">
            <a href={ws.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline-offset-4 hover:underline">
              {ws.url.replace(/^https?:\/\//, "")}
              <ExternalLinkIcon className="size-3.5 text-muted-foreground" />
            </a>
          </Row>
          <Row label="Worker">
            <span className="font-mono text-[13px]">{ws.worker}</span>
          </Row>
          <Row label="Release">
            <span className="flex flex-wrap items-center gap-2">
              {ws.version ?? "unknown"}
              {latest && (
                <Badge variant={behind ? "warning" : "success"} size="sm">
                  {behind ? `${latest.version} is out` : "Up to date"}
                </Badge>
              )}
            </span>
          </Row>
        </Card>
        <Card title="Apps" description="Installed in this workspace.">
          {ws.apps.length ? (
            <ul className="-mx-2 flex flex-col">
              {ws.apps.map((a) => (
                <li key={a.app}>
                  <Link to={`/w/${ws.id}/apps/${a.app}`} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent">
                    <PackageIcon className="size-4 text-muted-foreground" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{a.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{a.public ? `Public at ${a.public}` : "Admin only"}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No apps installed yet. Apps add pages, forms and more to the workspace.</p>
          )}
        </Card>
      </div>
    </WorkspaceFrame>
  );
}

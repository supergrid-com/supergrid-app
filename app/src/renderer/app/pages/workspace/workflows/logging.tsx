import { CircleAlertIcon, InfoIcon, ScrollTextIcon, TriangleAlertIcon } from "lucide-react";
import * as React from "react";
import { Badge } from "~/components/ui/badge";
import { Card, Crumbs, StatTile, WorkspaceFrame } from "~/components/workspace/frame";
import { FilterTabs, relative } from "~/components/workspace/library/shared";
import { cn } from "~/lib/utils";
import { useOpenNav, useShell } from "~/shell/context";
import { MockBadge } from "./shared";

// A placeholder for the workspace's log: what its Worker, queue consumer and hook runs write, with
// errors first. The lines here are made up until the Worker's tail (or Workers Logs) is wired in;
// the page shows the shape: a level filter, a source per line, the message, and when.

type Level = "error" | "warn" | "info";
type Line = { id: string; level: Level; source: string; message: string; minutesAgo: number };

const SAMPLE: Line[] = [
  { id: "l1", level: "error", source: "hook run", message: "Mailchimp Sync · step 1 http.request: 401 from https://us1.api.mailchimp.com/3.0/lists/abc/members: {\"title\":\"API Key Invalid\"}", minutesAgo: 4 },
  { id: "l2", level: "info", source: "queue", message: "events: batch of 12 stored, 3 hooks dispatched", minutesAgo: 4 },
  { id: "l3", level: "warn", source: "worker", message: "assets: SG_MEDIA_TOKEN not set, pictures fall back to the bucket", minutesAgo: 9 },
  { id: "l4", level: "info", source: "hook run", message: "Welcome Email · completed in 640ms (2 steps)", minutesAgo: 12 },
  { id: "l5", level: "info", source: "worker", message: "GET /_ws/theme.css 200 (12ms, cached)", minutesAgo: 15 },
  { id: "l6", level: "error", source: "queue", message: "events: batch failed, retrying in 4s: D1_ERROR: database is locked", minutesAgo: 27 },
  { id: "l7", level: "info", source: "worker", message: "POST /_ws/events 204 · 2 events from site", minutesAgo: 31 },
  { id: "l8", level: "warn", source: "hook run", message: "Slack Alert · step 1 http.request retried (attempt 2 of 3): 503 from https://hooks.slack.com/services/…", minutesAgo: 44 },
  { id: "l9", level: "info", source: "worker", message: "migrations: core up to date (0003_assets)", minutesAgo: 58 },
  { id: "l10", level: "info", source: "worker", message: "app hello: hook contact.created handled 200", minutesAgo: 73 },
  { id: "l11", level: "error", source: "worker", message: "secrets: SECRETS_KEY_MISSING while reading MAILCHIMP_KEY", minutesAgo: 140 },
  { id: "l12", level: "info", source: "queue", message: "dead letters: 0 in the last 24 hours", minutesAgo: 190 },
];

const levelMeta: Record<Level, { label: string; icon: React.ReactElement; variant: "error" | "warning" | "info" }> = {
  error: { label: "Error", icon: <CircleAlertIcon />, variant: "error" },
  warn: { label: "Warning", icon: <TriangleAlertIcon />, variant: "warning" },
  info: { label: "Info", icon: <InfoIcon />, variant: "info" },
};

export function LoggingPage(): React.ReactElement {
  const { ws } = useShell();
  const onOpenNav = useOpenNav();
  const [tab, setTab] = React.useState<"all" | "error" | "warn">("all");
  const now = Date.now();
  const lines = SAMPLE.map((l) => ({ ...l, at: new Date(now - l.minutesAgo * 60_000).toISOString() }));
  const shown = lines.filter((l) => tab === "all" || l.level === tab);
  const count = (level: Level) => lines.filter((l) => l.level === level).length;
  return (
    <WorkspaceFrame icon={<ScrollTextIcon />} title={<Crumbs items={["Workflows", "Logging"]} />} actions={<MockBadge />} onOpenNav={onOpenNav}>
      <Card padded={false}>
        <div className="grid grid-cols-2 divide-x sm:grid-cols-4">
          <StatTile label="Lines" value={lines.length.toLocaleString()} hint="sample" />
          <StatTile label="Errors" value={count("error").toLocaleString()} />
          <StatTile label="Warnings" value={count("warn").toLocaleString()} />
          <StatTile label="Worker" value={ws.worker || "local"} hint="where the log comes from" />
        </div>
      </Card>
      <Card
        title="Log"
        description="Sample lines, until the Worker's log is wired in. Then: what the Worker, the queue consumer and each hook run wrote, live."
        padded={false}
        actions={<FilterTabs value={tab} onChange={setTab} tabs={[{ key: "all", label: "All" }, { key: "error", label: "Errors", count: count("error") }, { key: "warn", label: "Warnings", count: count("warn") }]} />}
      >
        <ol className="divide-y border-t font-mono text-xs">
          {shown.map((l) => {
            const m = levelMeta[l.level];
            return (
              <li key={l.id} className={cn("flex items-start gap-3 px-4 py-2", l.level === "error" && "bg-destructive/4")}>
                <span className="w-20 shrink-0 whitespace-nowrap pt-0.5 text-muted-foreground tabular-nums" title={new Date(l.at).toLocaleString()}>
                  {relative(l.at)}
                </span>
                <Badge variant={m.variant} size="sm" className="mt-px w-16 shrink-0 gap-1">
                  {m.icon}
                  {m.label}
                </Badge>
                <span className="w-16 shrink-0 pt-0.5 text-muted-foreground">{l.source}</span>
                <span className="min-w-0 flex-1 whitespace-pre-wrap break-all pt-0.5">{l.message}</span>
              </li>
            );
          })}
        </ol>
      </Card>
    </WorkspaceFrame>
  );
}

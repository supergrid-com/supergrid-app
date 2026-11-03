import type { Hook } from "@supergrid/app-kit/rpc";
import { ArrowRightIcon, GlobeIcon, PackageIcon, WebhookIcon, WorkflowIcon } from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "~/components/ui/empty";
import { Card, Crumbs, StatTile, WorkspaceFrame } from "~/components/workspace/frame";
import { FilterTabs, ListState } from "~/components/workspace/library/shared";
import { useHookCatalog, useHooks, useWorkflows } from "~/lib/workflows";
import { cn } from "~/lib/utils";
import { useOpenNav, useShell } from "~/shell/context";

// The catalog of hooks: every event the system knows (the core's reserved names and the ones each
// app has sent) and what fires on it. A hook is an event with something attached: a workflow, an
// HTTP call, or an app that subscribed in its manifest. The page is mainly a picture of what
// triggers what; workflows are edited on their own pages.

type Row = { event: string; source: string; count: number; reserved: boolean; hooks: Hook[] };

export function HooksPage(): React.ReactElement {
  const { ws } = useShell();
  const onOpenNav = useOpenNav();
  const navigate = useNavigate();
  const hooks = useHooks(ws.id);
  const catalog = useHookCatalog(ws.id);
  const workflows = useWorkflows(ws.id);
  const [tab, setTab] = React.useState<"all" | "hooked" | "free">("all");
  const appName = (id: string | null) => (id ? (ws.apps.find((a) => a.app === id)?.name ?? (id === "site" ? "Site" : id === "core" ? "Core" : id)) : "Core");

  const rows = React.useMemo<Row[]>(() => {
    const by = new Map<string, Row>();
    for (const e of catalog.data?.events ?? []) {
      const source = e.reserved ? "Core" : appName(e.app_id);
      const key = `${source}:${e.name}`;
      const row = by.get(key) ?? { event: e.name, source, count: 0, reserved: e.reserved, hooks: [] };
      row.count += e.count;
      by.set(key, row);
    }
    for (const h of hooks.data ?? []) {
      const found = [...by.values()].find((r) => r.event === h.event);
      if (found) found.hooks.push(h);
      else by.set(`?:${h.event}`, { event: h.event, source: appName(h.app_id), count: 0, reserved: false, hooks: [h] });
    }
    const rank = (s: string) => (s === "Core" ? 0 : 1);
    return [...by.values()].sort((a, b) => rank(a.source) - rank(b.source) || a.source.localeCompare(b.source) || b.hooks.length - a.hooks.length || b.count - a.count || a.event.localeCompare(b.event));
  }, [catalog.data, hooks.data, ws.apps]);

  const shown = rows.filter((r) => (tab === "all" ? true : tab === "hooked" ? r.hooks.length > 0 : r.hooks.length === 0));
  const groups = [...new Set(shown.map((r) => r.source))];
  const hooked = rows.filter((r) => r.hooks.length > 0).length;
  const data = catalog.data && hooks.data ? rows : null;
  const wfName = (id: string | undefined) => workflows.data?.find((w) => w.id === id)?.name ?? catalog.data?.workflows.find((w) => w.id === id)?.name ?? id ?? "workflow";

  return (
    <WorkspaceFrame icon={<WebhookIcon />} title={<Crumbs items={["Workflows", "Hooks"]} />} onOpenNav={onOpenNav}>
      <ListState
        data={data}
        error={catalog.error ?? hooks.error}
        loading={catalog.loading || hooks.loading}
        onRetry={() => void Promise.all([catalog.refresh(), hooks.refresh()])}
        isEmpty={(d) => d.length === 0}
        empty={
          <Empty className="py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <WebhookIcon />
              </EmptyMedia>
              <EmptyTitle>No Events Known Yet</EmptyTitle>
              <EmptyDescription>The catalog fills in as the workspace runs: its core events, then whatever its apps send.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        }
      >
        {() => (
          <>
            <Card padded={false}>
              <div className="grid grid-cols-2 divide-x sm:grid-cols-4">
                <StatTile label="Events" value={rows.length.toLocaleString()} hint="in the catalog" />
                <StatTile label="With Hooks" value={hooked.toLocaleString()} />
                <StatTile label="Hooks" value={(hooks.data?.length ?? 0).toLocaleString()} hint="workflows, HTTP calls, app handlers" />
                <StatTile label="Sources" value={[...new Set(rows.map((r) => r.source))].length.toLocaleString()} hint="the core and each app" />
              </div>
            </Card>
            <div className="flex items-center gap-3">
              <FilterTabs value={tab} onChange={setTab} tabs={[{ key: "all", label: "All" }, { key: "hooked", label: "With Workflows", count: hooked }, { key: "free", label: "Unhooked", count: rows.length - hooked }]} />
            </div>
            {groups.map((source) => (
              <Card key={source} title={source} description={source === "Core" ? "Events the workspace itself emits." : "Events this app has sent in the last 90 days, or subscribed to."} padded={false}>
                <ul className="divide-y border-t">
                  {shown
                    .filter((r) => r.source === source)
                    .map((r) => (
                      <li key={r.event} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2.5 text-[13px]">
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{r.event}</code>
                        <span className="w-24 shrink-0 whitespace-nowrap text-xs text-muted-foreground tabular-nums">{r.count ? `${r.count.toLocaleString()} in 90d` : "not seen yet"}</span>
                        <ArrowRightIcon className={cn("size-3.5 shrink-0", r.hooks.length ? "text-foreground/60" : "text-muted-foreground/40")} />
                        {r.hooks.length === 0 ? (
                          <span className="text-xs text-muted-foreground">Nothing attached</span>
                        ) : (
                          <span className="flex flex-wrap items-center gap-1.5">
                            {r.hooks.map((h) =>
                              h.action === "workflow" ? (
                                <button key={h.id} type="button" onClick={() => navigate(`/w/${ws.id}/workflows/${h.config.workflowId}`)} className={cn("flex h-6 cursor-pointer items-center gap-1 rounded-md border bg-background px-2 text-xs hover:bg-accent", !h.enabled && "opacity-60")}>
                                  <WorkflowIcon className="size-3.5 text-active" />
                                  {wfName(h.config.workflowId)}
                                  {!h.enabled && <span className="text-muted-foreground">· paused</span>}
                                </button>
                              ) : h.action === "http" ? (
                                <Badge key={h.id} variant="outline" className="h-6 gap-1 px-2 font-normal" title={h.config.url}>
                                  <GlobeIcon />
                                  {h.name ?? hostOf(h.config.url)}
                                </Badge>
                              ) : (
                                <Badge key={h.id} variant="outline" className="h-6 gap-1 px-2 font-normal">
                                  <PackageIcon />
                                  {appName(h.config.app ?? h.app_id)} handles it
                                </Badge>
                              ),
                            )}
                          </span>
                        )}
                      </li>
                    ))}
                </ul>
              </Card>
            ))}
          </>
        )}
      </ListState>
    </WorkspaceFrame>
  );
}

function hostOf(url: string | undefined): string {
  try {
    return url ? new URL(url).host : "HTTP";
  } catch {
    return url ?? "HTTP";
  }
}

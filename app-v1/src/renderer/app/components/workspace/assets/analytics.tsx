import type { MediaAnalyticsRow } from "@supergrid/app-kit/rpc";
import { formatDuration } from "@supergrid/app-kit/media";
import { PlayIcon } from "lucide-react";
import * as React from "react";
import { fileIcon, thumbnailOf } from "~/components/workspace/assets/asset-sheet";
import { Card, StatTile } from "~/components/workspace/frame";
import { QueryState } from "~/components/workspace/query-states";
import { Button } from "~/components/ui/button";
import type { Workspace } from "~/lib/mock";
import { useWorkspacePage } from "~/lib/workspace-page";
import { useWsQuery } from "~/lib/ws-query";
import { cn } from "~/lib/utils";

// Playback across the workspace's video and audio, from Stream's bulk analytics: minutes watched
// per day, the most watched assets, and where the viewers are.

const RANGES = [7, 30, 90] as const;

function Bars({ rows }: { rows: MediaAnalyticsRow[] }): React.ReactElement {
  const max = Math.max(1, ...rows.map((r) => r.minutes));
  return (
    <div className="flex h-40 gap-1">
      {rows.map((r) => (
        <div key={r.key} className="group flex min-w-0 flex-1 flex-col items-center gap-1" title={`${r.key}: ${r.minutes} minutes, ${r.views} plays`}>
          <div className="flex w-full flex-1 items-end">
            <div className="w-full rounded-t-md bg-primary/80 transition-colors group-hover:bg-primary" style={{ height: `${Math.max(2, (r.minutes / max) * 100)}%` }} />
          </div>
          <span className="w-full truncate text-center text-[10px] text-muted-foreground">{rows.length <= 14 ? r.key?.slice(5) : r.key?.slice(8)}</span>
        </div>
      ))}
    </div>
  );
}

export function AssetsAnalytics({ ws, days, onDays }: { ws: Workspace; days: number; onDays: (d: number) => void }): React.ReactElement {
  const { go } = useWorkspacePage();
  const byDay = useWsQuery(ws.id, "mediaAnalytics", [{ days, groupBy: "day", limit: 400 }], { tags: ["media-analytics"] });
  const byAsset = useWsQuery(ws.id, "mediaAnalytics", [{ days, groupBy: "asset", limit: 20 }], { tags: ["media-analytics"] });
  const byCountry = useWsQuery(ws.id, "mediaAnalytics", [{ days, groupBy: "country", limit: 12 }], { tags: ["media-analytics"] });
  const minutes = byDay.data?.reduce((n, r) => n + r.minutes, 0) ?? 0;
  const views = byDay.data?.reduce((n, r) => n + r.views, 0) ?? 0;
  const topTotal = byAsset.data?.reduce((n, r) => n + r.minutes, 0) ?? 0;
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-4 sm:px-6">
      <div className="flex items-center gap-1">
        <span className="flex-1 text-xs text-muted-foreground">What Cloudflare Stream delivered, counted at the edge: every player, every embed.</span>
        {RANGES.map((d) => (
          <Button key={d} size="xs" variant={d === days ? "secondary" : "ghost"} onClick={() => onDays(d)}>
            {d} days
          </Button>
        ))}
      </div>
      <Card padded={false}>
        <div className="grid grid-cols-3 divide-x">
          <StatTile label="Minutes watched" value={Math.round(minutes).toLocaleString()} hint={`${formatDuration(minutes * 60) || "0:00"} of playback`} />
          <StatTile label="Plays" value={views.toLocaleString()} hint={views ? `${(minutes / views).toFixed(1)} min each` : "sessions Stream counted"} />
          <StatTile label="Assets watched" value={byAsset.data?.length ?? "–"} hint="video and audio" />
        </div>
      </Card>
      <Card title="Minutes per day">
        <QueryState q={byDay} skeleton={<div className="h-40 animate-pulse rounded bg-muted" />} empty={<div className="py-10 text-center text-[13px] text-muted-foreground">No playback in this range.</div>}>
          {(rows) => <Bars rows={rows} />}
        </QueryState>
      </Card>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card title="Most watched" padded={false}>
          <QueryState q={byAsset} empty={<div className="px-4 py-8 text-center text-[13px] text-muted-foreground">Nothing watched yet.</div>}>
            {(rows) => (
              <ul className="divide-y border-t">
                {rows.map((r) => {
                  const a = r.asset;
                  const Icon = a ? fileIcon({ kind: a.kind, mime: null, name: a.name }) : PlayIcon;
                  const thumb = a ? thumbnailOf({ ...a, status: "ready", provider: "stream" } as never, 160) : null;
                  return (
                    <li key={r.key} className={cn("flex items-center gap-3 px-4 py-2 text-[13px]", a && "cursor-pointer hover:bg-accent/40")} onClick={a ? () => go({ kind: "media", id: a.id }) : undefined}>
                      <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted text-muted-foreground">{thumb ? <img src={thumb} alt="" className="size-full object-cover" /> : <Icon className="size-4" />}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{a?.title || a?.name || r.key}</span>
                        <span className="block h-1 w-full overflow-hidden rounded bg-muted"><span className="block h-full rounded bg-primary/70" style={{ width: `${topTotal ? (r.minutes / topTotal) * 100 : 0}%` }} /></span>
                      </span>
                      <span className="w-16 text-right tabular-nums">{Math.round(r.minutes).toLocaleString()} <span className="text-xs text-muted-foreground">min</span></span>
                      <span className="w-14 text-right text-xs tabular-nums text-muted-foreground">{r.views.toLocaleString()} plays</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </QueryState>
        </Card>
        <Card title="Where" description="Viewer country, by minutes." padded={false}>
          <QueryState q={byCountry} empty={<div className="px-4 py-8 text-center text-[13px] text-muted-foreground">No viewers yet.</div>}>
            {(rows) => {
              const total = rows.reduce((n, r) => n + r.minutes, 0) || 1;
              return (
                <ul className="divide-y border-t">
                  {rows.map((r) => (
                    <li key={r.key ?? "?"} className="flex items-center gap-3 px-4 py-2 text-[13px]">
                      <span className="w-10 font-mono text-xs">{r.key ?? "?"}</span>
                      <span className="h-1.5 flex-1 overflow-hidden rounded bg-muted"><span className="block h-full rounded bg-primary/70" style={{ width: `${(r.minutes / total) * 100}%` }} /></span>
                      <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">{Math.round((r.minutes / total) * 100)}%</span>
                    </li>
                  ))}
                </ul>
              );
            }}
          </QueryState>
        </Card>
      </div>
      <div className="h-6" />
    </div>
  );
}

import type { AnalyticsGroup, EventName, FunnelSpec } from "@supergrid/app-kit/rpc";
import { ArrowDownIcon, ArrowUpIcon, BarChart3Icon, PlusIcon, XIcon } from "lucide-react";
import * as React from "react";
import { type DateRange, DateRangePicker, daysIn, daysOf, rangeFor } from "~/components/workspace/analytics/date-range";
import { chartColor, FunnelSteps, SeriesChart } from "~/components/workspace/charts";
import { EventNamesMenu } from "~/components/workspace/event-picker";
import { Card, StatTile, WorkspaceFrame } from "~/components/workspace/frame";
import { QueryState, RowsSkeleton } from "~/components/workspace/query-states";
import { Button } from "~/components/ui/button";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import type { Workspace } from "~/lib/mock";
import { useWsQuery } from "~/lib/ws-query";
import { cn } from "~/lib/utils";

// Analytics over the event stream: totals for the range, events per day, where visits come
// from, and a funnel you assemble from event names. Every number is one `queryAnalytics` or
// `funnel` call; the page only pivots and draws.

type PageProps = { ws: Workspace; onOpenNav: () => void };

const fmt = (n: number | undefined): React.ReactNode => (n === undefined ? <Skeleton className="h-6 w-14" /> : n.toLocaleString());

/** The sum of a grouped-or-not result: one row without groupBy, several with. */
const sum = (rows: { value: number }[] | undefined): number | undefined => rows?.reduce((n, r) => n + r.value, 0);

function TopTable({ ws, range, groupBy, title, empty }: { ws: Workspace; range: DateRange; groupBy: AnalyticsGroup; title: string; empty: string }): React.ReactElement {
  const q = useWsQuery(ws.id, "queryAnalytics", [{ metric: "count", events: ["page.view"], groupBy, from: range.from, to: range.to, limit: 8 }], { tags: ["events"] });
  return (
    <Card title={title} padded={false}>
      <QueryState q={q} skeleton={<RowsSkeleton rows={4} />} empty={<div className="px-4 pb-4 text-xs text-muted-foreground">{empty}</div>}>
        {(rows) => {
          const max = Math.max(1, ...rows.map((r) => r.value));
          return (
            <ul className="flex flex-col gap-1 px-4 pb-3">
              {rows.map((r, i) => (
                <li key={`${r.key}:${i}`} className="relative flex h-7 items-center justify-between gap-3 overflow-hidden rounded-md px-2 text-xs">
                  <span aria-hidden className="absolute inset-y-0 start-0 rounded-md bg-chart-2/15" style={{ width: `${(r.value / max) * 100}%` }} />
                  <span className="relative min-w-0 truncate font-mono">{r.key ?? <span className="text-muted-foreground">(none)</span>}</span>
                  <span className="relative shrink-0 tabular-nums">{r.value.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          );
        }}
      </QueryState>
    </Card>
  );
}

const WINDOWS: { hours: number; label: string }[] = [
  { hours: 1, label: "1 hour" },
  { hours: 24, label: "24 hours" },
  { hours: 24 * 7, label: "7 days" },
  { hours: 24 * 30, label: "30 days" },
];

function Funnel({ ws, range, names }: { ws: Workspace; range: DateRange; names: EventName[] }): React.ReactElement {
  const [steps, setSteps] = React.useState<string[]>(["page.view", "contact.created"]);
  const [windowHours, setWindowHours] = React.useState(24 * 7);
  const [by, setBy] = React.useState<"contact" | "visitor">("visitor");
  const ready = steps.length >= 2 && steps.every(Boolean);
  const spec: FunnelSpec = { steps: steps.map((event) => ({ event })), from: range.from, to: range.to, by, windowHours };
  const q = useWsQuery(ws.id, "funnel", [spec], { tags: ["events"], enabled: ready });
  const options = React.useMemo(() => names.map((n) => ({ value: n.name, label: n.name })), [names]);
  const move = (i: number, d: -1 | 1) => {
    const next = steps.slice();
    [next[i], next[i + d]] = [next[i + d], next[i]];
    setSteps(next);
  };
  return (
    <Card
      title="Funnel"
      description={`Actors who did each step in order, within ${WINDOWS.find((w) => w.hours === windowHours)?.label ?? `${windowHours}h`} of the one before.`}
      actions={
        <div className="flex items-center gap-1.5">
          <Select items={WINDOWS.map((w) => ({ value: String(w.hours), label: w.label }))} value={String(windowHours)} onValueChange={(v) => setWindowHours(Number(v))}>
            <SelectTrigger size="sm" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              {WINDOWS.map((w) => (
                <SelectItem key={w.hours} value={String(w.hours)}>
                  within {w.label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
          <Select items={[{ value: "visitor", label: "by visitor" }, { value: "contact", label: "by contact" }]} value={by} onValueChange={(v) => setBy(v as "contact" | "visitor")}>
            <SelectTrigger size="sm" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              <SelectItem value="visitor">by visitor</SelectItem>
              <SelectItem value="contact">by contact</SelectItem>
            </SelectPopup>
          </Select>
        </div>
      }
    >
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <ol className="flex flex-col gap-1.5">
          {steps.map((s, i) => (
            <li key={i} className="flex items-center gap-1">
              <span className="w-4 text-xs text-muted-foreground tabular-nums">{i + 1}</span>
              <Select items={options} value={s} onValueChange={(v) => setSteps(steps.map((x, j) => (j === i ? (v ?? "") : x)))}>
                <SelectTrigger size="sm" className="min-w-0 flex-1 font-mono text-xs">
                  <SelectValue placeholder="Pick an event" />
                </SelectTrigger>
                <SelectPopup>
                  {options.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      <span className="font-mono text-xs">{o.label}</span>
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
              <Button size="icon-xs" variant="ghost" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="text-muted-foreground">
                <ArrowUpIcon />
              </Button>
              <Button size="icon-xs" variant="ghost" aria-label="Move down" disabled={i === steps.length - 1} onClick={() => move(i, 1)} className="text-muted-foreground">
                <ArrowDownIcon />
              </Button>
              <Button size="icon-xs" variant="ghost" aria-label="Remove step" disabled={steps.length <= 2} onClick={() => setSteps(steps.filter((_, j) => j !== i))} className="text-muted-foreground">
                <XIcon />
              </Button>
            </li>
          ))}
          <li>
            <Button size="xs" variant="ghost" className="text-muted-foreground" disabled={steps.length >= 6} onClick={() => setSteps([...steps, ""])}>
              <PlusIcon />
              Add step
            </Button>
          </li>
        </ol>
        <div className="min-w-0">
          {!ready ? (
            <div className="py-6 text-center text-xs text-muted-foreground">Pick at least two events.</div>
          ) : (
            <QueryState q={q} skeleton={<RowsSkeleton rows={3} className="px-0" />}>
              {(data) => <FunnelSteps steps={data} />}
            </QueryState>
          )}
        </div>
      </div>
    </Card>
  );
}

export function AnalyticsPage({ ws, onOpenNav }: PageProps): React.ReactElement {
  const [range, setRange] = React.useState<DateRange>(() => rangeFor("30d"));
  const [events, setEvents] = React.useState<string[]>(["page.view"]);
  const { from, to } = range;
  const days = daysIn(range);

  const names = useWsQuery(ws.id, "eventNames", [], { tags: ["events"] });
  const totalEvents = useWsQuery(ws.id, "queryAnalytics", [{ metric: "count", from, to }], { tags: ["events"] });
  const visitors = useWsQuery(ws.id, "queryAnalytics", [{ metric: "unique_visitors", from, to }], { tags: ["events"] });
  const contacts = useWsQuery(ws.id, "queryAnalytics", [{ metric: "count", events: ["contact.created"], from, to }], { tags: ["events", "contacts"] });
  const series = useWsQuery(ws.id, "queryAnalytics", [{ metric: "count", events: events.length ? events : ["page.view"], interval: "day", groupBy: "name", from, to }], { tags: ["events"], enabled: events.length > 0 });

  // {bucket, key, value} rows → one point per day with every chosen event, zero where nothing happened
  const chart = React.useMemo(() => {
    const picked = events.slice(0, 5);
    const byDay = new Map<string, Map<string, number>>();
    for (const r of series.data ?? []) {
      if (!r.bucket || !r.key) continue;
      const day = r.bucket.slice(0, 10);
      const m = byDay.get(day) ?? new Map<string, number>();
      m.set(r.key, (m.get(r.key) ?? 0) + r.value);
      byDay.set(day, m);
    }
    return { series: picked.map((name, i) => ({ name, color: chartColor(i) })), points: daysOf(range).map((date) => ({ date, values: picked.map((name) => byDay.get(date)?.get(name) ?? 0) })) };
  }, [series.data, events, range]);

  const evTotal = sum(totalEvents.data);
  const vTotal = sum(visitors.data);
  return (
    <WorkspaceFrame icon={<BarChart3Icon />} title="Analytics" onOpenNav={onOpenNav} actions={<DateRangePicker value={range} onChange={setRange} />}>
      <Card padded={false}>
        <div className="grid grid-cols-3 divide-x">
          <StatTile label="Events" value={fmt(evTotal)} hint={evTotal !== undefined ? `${Math.round(evTotal / days).toLocaleString()} per day` : undefined} />
          <StatTile label="Visitors" value={fmt(vTotal)} hint="contacts and anonymous, de-duplicated" />
          <StatTile label="Contacts created" value={fmt(sum(contacts.data))} hint={`last ${days} day${days === 1 ? "" : "s"}`} />
        </div>
      </Card>
      <Card
        title="Events by day"
        actions={
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {events.map((e, i) => (
              <span key={e} className="inline-flex h-6 items-center gap-1.5 rounded-md border bg-muted/40 ps-2 pe-1 font-mono text-[11px]">
                <span className="size-2 rounded-full" style={{ background: chartColor(i) }} />
                {e}
                <button type="button" aria-label={`Remove ${e}`} onClick={() => setEvents(events.filter((x) => x !== e))} className="flex size-4 cursor-pointer items-center justify-center rounded text-muted-foreground hover:text-foreground">
                  <XIcon className="size-3" />
                </button>
              </span>
            ))}
            <EventNamesMenu names={names.data ?? []} value={events} onChange={(next) => setEvents(next.slice(0, 5))} label="Add event" />
          </div>
        }
      >
        {events.length === 0 ? (
          <div className="py-10 text-center text-xs text-muted-foreground">Pick an event to plot.</div>
        ) : series.error && series.data === undefined ? (
          <div className="py-10 text-center text-xs text-destructive-foreground">{series.error}</div>
        ) : (
          <div className={cn(series.loading && "opacity-50")}>
            <SeriesChart series={chart.series} points={chart.points} label={`Events by day: ${events.join(", ")}`} />
          </div>
        )}
        {events.length > 5 && <p className="mt-2 text-[11px] text-muted-foreground">Only the first five events are drawn.</p>}
      </Card>
      <div className="grid gap-5 md:grid-cols-3">
        <TopTable ws={ws} range={range} groupBy="path" title="Top pages" empty="No page views in this range." />
        <TopTable ws={ws} range={range} groupBy="referrer" title="Referrers" empty="No referrers recorded." />
        <TopTable ws={ws} range={range} groupBy="utm_source" title="UTM sources" empty="No tagged links yet." />
      </div>
      <Funnel ws={ws} range={range} names={names.data ?? []} />
      <div className="h-6" />
    </WorkspaceFrame>
  );
}

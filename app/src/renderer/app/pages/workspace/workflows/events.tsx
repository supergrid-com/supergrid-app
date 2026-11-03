import type { EventRow } from "@supergrid/app-kit/rpc";
import { ActivityIcon, RefreshCwIcon, SearchIcon } from "lucide-react";
import * as React from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "~/components/ui/empty";
import { Input } from "~/components/ui/input";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Crumbs, DataTable, TableFooter, WorkspaceFrame } from "~/components/workspace/frame";
import { absolute, relative, useDebounced } from "~/components/workspace/library/shared";
import { listEvents, useEventNames } from "~/lib/workflows";
import { useOpenNav, useShell } from "~/shell/context";

// Every event the workspace recorded, newest first, from its own RPC (listEvents): what happened,
// which app sent it, who it was about. A row opens to show its props and context. The events table
// itself stays out of the Database section; this is its page.

const LIMIT = 50;

export function EventsPage(): React.ReactElement {
  const { ws } = useShell();
  const onOpenNav = useOpenNav();
  const names = useEventNames(ws.id);
  const [search, setSearch] = React.useState("");
  const [name, setName] = React.useState("all");
  const [offset, setOffset] = React.useState(0);
  const [page, setPage] = React.useState<{ items: EventRow[]; total: number } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState<string | null>(null);
  const [version, setVersion] = React.useState(0);
  const debounced = useDebounced(search, 250);
  React.useEffect(() => setOffset(0), [debounced, name]);
  React.useEffect(() => {
    let live = true;
    setLoading(true);
    listEvents(ws.id, { search: debounced || undefined, name: name === "all" ? undefined : name, limit: LIMIT, offset })
      .then((p) => {
        if (!live) return;
        setPage(p);
        setError(null);
      })
      .catch((e) => live && setError(String((e as Error).message ?? e)))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [ws.id, debounced, name, offset, version]);

  const list = names.data ?? [];
  const title = <Crumbs items={["Workflows", "Events"]} />;
  const actions = (
    <Button size="xs" variant="ghost" disabled={loading} onClick={() => setVersion((v) => v + 1)} className="text-foreground/70 hover:text-foreground">
      <RefreshCwIcon className={loading ? "animate-spin" : undefined} />
      Reload
    </Button>
  );
  return (
    <WorkspaceFrame icon={<ActivityIcon />} title={title} actions={actions} flush onOpenNav={onOpenNav}>
      <div className="flex h-11 shrink-0 items-center gap-2 border-b px-3">
        <div className="relative w-64 max-w-full">
          <SearchIcon className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input size="sm" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search names, paths and props" className="ps-7" />
        </div>
        <Select value={name} onValueChange={(v) => setName(String(v))} items={[{ value: "all", label: "All events" }, ...list.map((n) => ({ value: n.name, label: n.name }))]}>
          <SelectTrigger size="sm" className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectPopup>
            <SelectItem value="all">All events</SelectItem>
            {list.map((n) => (
              <SelectItem key={n.name} value={n.name}>
                <span className="font-mono text-xs">{n.name}</span>
                {n.count > 0 && <span className="ms-auto ps-3 text-xs text-muted-foreground tabular-nums">{n.count.toLocaleString()}</span>}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
        <div className="flex-1" />
        {error && <span className="truncate text-xs text-destructive-foreground">{error}</span>}
      </div>
      {page && page.items.length === 0 && !loading ? (
        <Empty className="py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ActivityIcon />
            </EmptyMedia>
            <EmptyTitle>{debounced || name !== "all" ? "Nothing Matches" : "No Events Yet"}</EmptyTitle>
            <EmptyDescription>{debounced || name !== "all" ? "Try another name or search." : "Events arrive as the workspace's site is visited and its apps emit them."}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <DataTable<EventRow>
          rows={page?.items ?? []}
          rowKey={(e) => e.id}
          onRowClick={(e) => setOpen(open === e.id ? null : e.id)}
          expanded={open}
          renderExpanded={(e) => <EventDetail event={e} />}
          empty={loading ? <div className="px-4 py-10 text-center text-sm text-muted-foreground">Reading events…</div> : undefined}
          columns={[
            { key: "name", label: "Event", render: (e) => <code className="font-mono text-xs">{e.name}</code> },
            { key: "app", label: "App", width: "7rem", render: (e) => <Badge variant="outline">{ws.apps.find((a) => a.app === e.app_id)?.name ?? e.app_id}</Badge> },
            { key: "contact", label: "Contact", width: "11rem", className: "max-md:hidden", render: (e) => <span className="font-mono text-xs text-muted-foreground">{e.contact_id ?? (e.anonymous_id ? `anon ${e.anonymous_id.slice(0, 8)}` : "")}</span> },
            { key: "path", label: "Path", className: "max-sm:hidden", render: (e) => <span className="block max-w-72 truncate text-muted-foreground">{e.path ?? ""}</span> },
            { key: "device", label: "Device", width: "6rem", className: "max-lg:hidden", render: (e) => <span className="text-muted-foreground">{e.device ?? ""}</span> },
            { key: "ts", label: "When", width: "9rem", render: (e) => <span title={absolute(e.ts)}>{relative(e.ts)}</span> },
          ]}
        />
      )}
      <TableFooter total={page?.total ?? 0} offset={offset} limit={LIMIT} onPage={setOffset} />
    </WorkspaceFrame>
  );
}

function EventDetail({ event: e }: { event: EventRow }): React.ReactElement {
  const facts: [string, string | null][] = [
    ["ID", e.id],
    ["At", absolute(e.ts)],
    ["Session", e.session_id],
    ["URL", e.url],
    ["Referrer", e.referrer],
    ["UTM", [e.utm_source, e.utm_medium, e.utm_campaign].filter(Boolean).join(" / ") || null],
    ["Place", [e.city, e.region, e.country].filter(Boolean).join(", ") || null],
    ["Timezone", e.timezone],
    ["Agent", e.user_agent],
  ];
  return (
    <div className="grid gap-4 text-[13px] md:grid-cols-2">
      <dl className="grid grid-cols-[5rem_1fr] gap-x-3 gap-y-1">
        {facts
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <React.Fragment key={k}>
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className="min-w-0 truncate font-mono text-xs" title={v ?? ""}>
                {v}
              </dd>
            </React.Fragment>
          ))}
      </dl>
      <div>
        <div className="mb-1 text-xs text-muted-foreground">Props</div>
        <pre className="overflow-x-auto rounded-lg border bg-background p-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-all">{Object.keys(e.props).length ? JSON.stringify(e.props, null, 2) : "{}"}</pre>
      </div>
    </div>
  );
}

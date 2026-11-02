import type { EventQuery, EventRow } from "@supergrid/app-kit/rpc";
import { ActivityIcon, SearchIcon, XIcon } from "lucide-react";
import * as React from "react";
import { absolute, relative } from "~/components/workspace/contacts/util";
import { EventNamesMenu } from "~/components/workspace/event-picker";
import { Card, DataTable, type DataColumn, TableFooter } from "~/components/workspace/frame";
import { QueryState } from "~/components/workspace/query-states";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "~/components/ui/empty";
import { Input } from "~/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "~/components/ui/input-group";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "~/components/ui/select";
import type { Workspace } from "~/lib/mock";
import { useWorkspacePage } from "~/lib/workspace-page";
import { useWsQuery } from "~/lib/ws-query";

// Settings → Events: the raw stream, newest first, with the filters `listEvents` takes. A row
// opens to show everything on it: the props as JSON, plus where it came from.

const LIMIT = 50;
/** App ids the docs name even when no event carries them yet. */
const KNOWN_APPS = ["core", "site", "workflow"];

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** `name` in a small mono chip, like the rest of the app shows event names. */
export function EventNameChip({ name }: { name: string }): React.ReactElement {
  return <span className="inline-flex h-5 items-center rounded-sm bg-muted px-1.5 font-mono text-[11px] text-foreground">{name}</span>;
}

function Detail({ e }: { e: EventRow }): React.ReactElement {
  const meta: [string, string | null][] = [
    ["id", e.id],
    ["url", e.url],
    ["referrer", e.referrer],
    ["utm", [e.utm_source, e.utm_medium, e.utm_campaign, e.utm_term, e.utm_content].filter(Boolean).join(" / ") || null],
    ["session", e.session_id],
    ["anonymous", e.anonymous_id],
    ["geo", [e.city, e.region, e.country].filter(Boolean).join(", ") || null],
    ["timezone", e.timezone],
    ["user agent", e.user_agent],
  ];
  return (
    <div className="grid gap-4 text-xs sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1">
        {meta.map(([k, v]) => (
          <React.Fragment key={k}>
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="min-w-0 break-all font-mono">{v ?? <span className="text-muted-foreground/60">—</span>}</dd>
          </React.Fragment>
        ))}
      </dl>
      <div className="min-w-0">
        <div className="mb-1 text-muted-foreground">props</div>
        <pre className="max-h-64 overflow-auto rounded-md border bg-background p-2 font-mono text-[11px] leading-snug">{JSON.stringify(e.props, null, 2)}</pre>
      </div>
    </div>
  );
}

export function EventsPage({ ws }: { ws: Workspace }): React.ReactElement {
  const { go } = useWorkspacePage();
  const [q, setQ] = React.useState("");
  const search = useDebounced(q.trim(), 250);
  const [names, setNames] = React.useState<string[]>([]);
  const [app, setApp] = React.useState("");
  const [contact, setContact] = React.useState("");
  const contactId = useDebounced(contact.trim(), 250);
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [offset, setOffset] = React.useState(0);
  const [open, setOpen] = React.useState<string | null>(null);
  React.useEffect(() => { setOffset(0); setOpen(null); }, [search, names, app, contactId, from, to]);

  const known = useWsQuery(ws.id, "eventNames", [], { tags: ["events"] });
  const apps = React.useMemo(() => [...new Set([...KNOWN_APPS, ...(known.data ?? []).map((n) => n.app_id).filter((a): a is string => !!a)])].sort(), [known.data]);
  const query: EventQuery = {
    search: search || undefined,
    name: names.length ? names : undefined,
    appId: app || undefined,
    contactId: contactId || undefined,
    from: from ? `${from}T00:00:00.000Z` : undefined,
    to: to ? `${to}T23:59:59.999Z` : undefined,
    limit: LIMIT,
    offset,
  };
  const list = useWsQuery(ws.id, "listEvents", [query], { tags: ["events"] });
  const filtered = !!(search || names.length || app || contactId || from || to);
  const clear = () => { setQ(""); setNames([]); setApp(""); setContact(""); setFrom(""); setTo(""); };

  const columns = React.useMemo<DataColumn<EventRow>[]>(
    () => [
      { key: "ts", label: "Time", width: "7rem", render: (e) => <span className="whitespace-nowrap text-muted-foreground" title={absolute(e.ts)}>{relative(e.ts)}</span> },
      { key: "name", label: "Event", render: (e) => <EventNameChip name={e.name} /> },
      { key: "app", label: "App", width: "6rem", className: "max-sm:hidden", render: (e) => <Badge variant="outline" size="sm">{e.app_id}</Badge> },
      {
        key: "contact",
        label: "Contact",
        width: "9rem",
        render: (e) =>
          e.contact_id ? (
            <button type="button" onClick={(ev) => { ev.stopPropagation(); go({ kind: "contacts", id: e.contact_id! }); }} className="max-w-full truncate font-mono text-xs text-active hover:underline">
              {e.contact_id}
            </button>
          ) : e.anonymous_id ? (
            <span className="truncate font-mono text-xs text-muted-foreground" title="Visitor, not yet identified">{e.anonymous_id}</span>
          ) : (
            <span className="text-muted-foreground/60">—</span>
          ),
      },
      { key: "path", label: "Path", className: "max-md:hidden", render: (e) => <span className="block max-w-56 truncate font-mono text-xs text-muted-foreground">{e.path ?? ""}</span> },
      { key: "where", label: "Device", width: "7rem", className: "max-lg:hidden", render: (e) => <span className="text-xs text-muted-foreground">{[e.device, e.country].filter(Boolean).join(" · ")}</span> },
    ],
    [go],
  );

  return (
    <Card padded={false}>
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
        <InputGroup className="w-56 max-w-full">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput type="search" size="sm" placeholder="Search name, path, props" value={q} onChange={(e) => setQ(e.target.value)} />
        </InputGroup>
        <EventNamesMenu names={known.data ?? []} value={names} onChange={setNames} />
        <Select items={[{ value: "", label: "Any app" }, ...apps.map((a) => ({ value: a, label: a }))]} value={app} onValueChange={(v) => setApp(v ?? "")}>
          <SelectTrigger size="sm" className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectPopup>
            <SelectItem value="">Any app</SelectItem>
            {apps.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
        <Input size="sm" placeholder="Contact id" value={contact} onChange={(e) => setContact(e.target.value)} className="w-36 font-mono text-xs" />
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Input type="date" size="sm" aria-label="From" value={from} onChange={(e) => setFrom(e.target.value)} className="w-34" />
          –
          <Input type="date" size="sm" aria-label="To" value={to} onChange={(e) => setTo(e.target.value)} className="w-34" />
        </span>
        {filtered && (
          <Button size="xs" variant="ghost" className="text-muted-foreground" onClick={clear}>
            <XIcon />
            Clear
          </Button>
        )}
      </div>
      <QueryState
        q={list}
        empty={
          <Empty className="py-10">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ActivityIcon />
              </EmptyMedia>
              <EmptyTitle>{filtered ? "Nothing matches" : "No events yet"}</EmptyTitle>
              <EmptyDescription>{filtered ? "Loosen a filter to see more." : "Page views and app events land here as they happen."}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        }
      >
        {(data) => (
          <>
            <DataTable<EventRow> columns={columns} rows={data.items} rowKey={(e) => e.id} onRowClick={(e) => setOpen(open === e.id ? null : e.id)} expanded={open} renderExpanded={(e) => <Detail e={e} />} className="max-h-[70vh]" />
            <TableFooter total={data.total} offset={offset} limit={LIMIT} onPage={setOffset}>
              {list.error && <span className="text-destructive-foreground">{list.error}</span>}
            </TableFooter>
          </>
        )}
      </QueryState>
    </Card>
  );
}

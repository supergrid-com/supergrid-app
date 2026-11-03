import { BlocksIcon, DatabaseIcon, DownloadIcon, FilterIcon, HistoryIcon, ListOrderedIcon, PlusIcon, SearchIcon, SquareTerminalIcon, TableIcon, UsersIcon } from "lucide-react";
import * as React from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "~/components/ui/empty";
import { Card, Crumbs, type DataColumn, DataTable, IconButton, IndexHeader, type SortState, StatTile } from "~/components/workspace/frame";
import { SubNav, type SubNavItem } from "~/components/workspace/sub-nav";
import { Specimen } from "./specimen";

// The workspace's own pieces (components/workspace): the sub nav on the admin layer, and the page
// card, stat tiles, index header and data table every page inside the card is built from.

function SubNavSample(): React.ReactElement {
  const [active, setActive] = React.useState("contacts");
  const row = (key: string, label: string, icon: React.ReactNode, extra?: Partial<SubNavItem>): SubNavItem => ({ key, label, icon, active: active === key, onClick: () => setActive(key), ...extra });
  const items = [
    row("contacts", "Contacts", <UsersIcon />, { meta: "1,204" }),
    row("companies", "Companies", <TableIcon />, { meta: "86" }),
    row("query", "Query", <SquareTerminalIcon />, { group: "Tools" }),
    row("migrations", "Migrations", <ListOrderedIcon />, { group: "Tools" }),
    row("backups", "Backups", <HistoryIcon />, { group: "Tools" }),
  ];
  return (
    <SubNav
      title="Database"
      action={
        <button type="button" aria-label="New Table" className="flex size-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
          <PlusIcon className="size-4" />
        </button>
      }
      items={items}
    />
  );
}

type Row = { id: string; name: string; app: string; rows: number; status: "Live" | "Draft" };
const rows: Row[] = [
  { id: "1", name: "Contacts", app: "CRM", rows: 1204, status: "Live" },
  { id: "2", name: "Orders", app: "Shop", rows: 342, status: "Live" },
  { id: "3", name: "Bookings", app: "Calendar", rows: 58, status: "Draft" },
];
const columns: DataColumn<Row>[] = [
  { key: "name", label: "Table", sortable: true, render: (r) => <span className="font-medium">{r.name}</span> },
  { key: "app", label: "App", render: (r) => <span className="text-muted-foreground">{r.app}</span> },
  { key: "rows", label: "Rows", sortable: true, align: "end", width: "6rem", render: (r) => r.rows.toLocaleString() },
  { key: "status", label: "Status", width: "6rem", render: (r) => <Badge variant={r.status === "Live" ? "success" : "secondary"}>{r.status}</Badge> },
];

function TableSample(): React.ReactElement {
  const [sort, setSort] = React.useState<SortState>({ key: "name", dir: "asc" });
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [tab, setTab] = React.useState("All");
  const sorted = [...rows].sort((a, b) => {
    const k = sort.key as keyof Row;
    const d = a[k] < b[k] ? -1 : a[k] > b[k] ? 1 : 0;
    return sort.dir === "asc" ? d : -d;
  });
  return (
    <Card padded={false}>
      <IndexHeader
        tabs={["All", "Live", "Draft"]}
        active={tab}
        onChange={setTab}
        right={
          <>
            <IconButton label="Search">
              <SearchIcon />
            </IconButton>
            <IconButton label="Filter">
              <FilterIcon />
            </IconButton>
          </>
        }
      />
      <DataTable
        columns={columns}
        rows={sorted.filter((r) => tab === "All" || r.status === tab)}
        rowKey={(r) => r.id}
        sort={sort}
        onSort={(key) => setSort((s) => ({ key, dir: s.key === key && s.dir === "asc" ? "desc" : "asc" }))}
        selected={selected}
        onSelect={setSelected}
      />
    </Card>
  );
}

export function ShellPieces(): React.ReactElement {
  return (
    <>
      <Specimen title="Sub Nav" about="The second panel beside the folded rail (components/workspace/sub-nav.tsx): a page surface on the sidebar layer. Rows group when their group changes." canvas="admin">
        <div className="h-[22rem] w-72">
          <SubNavSample />
        </div>
      </Specimen>
      <Specimen title="Page Card" about="Card from components/workspace/frame.tsx: a title row, then the body." canvas="none">
        <div className="grid gap-4 md:grid-cols-2">
          <Card
            title="Domain"
            description="Where the site answers."
            actions={
              <Button size="xs" variant="outline">
                Change
              </Button>
            }
          >
            <div className="font-mono text-sm">acme.example.com</div>
          </Card>
          <Card>
            <p className="text-sm text-muted-foreground">A card with no title row is padded all round.</p>
          </Card>
        </div>
      </Specimen>
      <Specimen title="Stat Tiles" canvas="none">
        <Card padded={false}>
          <div className="grid grid-cols-2 divide-x sm:grid-cols-4">
            <StatTile label="Rows" value="1,604" hint="+38 this week" />
            <StatTile label="Tables" value="5" />
            <StatTile label="Apps" value="3" hint="1 update ready" />
            <StatTile label="Events" value="12.4k" hint="last 30 days" />
          </div>
        </Card>
      </Specimen>
      <Specimen title="Index Header and Data Table" about="The list page pattern: filter tabs, tools on the right, a sortable, selectable table." canvas="none">
        <TableSample />
      </Specimen>
      <Specimen title="Title Bar Pieces">
        <div className="flex flex-wrap items-center gap-6">
          <h1 className="flex items-center gap-2 text-sm font-medium tracking-wider">
            <DatabaseIcon className="size-4 text-muted-foreground" />
            <Crumbs items={["Database", "Contacts"]} />
          </h1>
          <div className="flex items-center gap-1">
            <IconButton label="Export">
              <DownloadIcon />
            </IconButton>
            <IconButton label="Blocks">
              <BlocksIcon />
            </IconButton>
            <IconButton label="Disabled" disabled>
              <PlusIcon />
            </IconButton>
          </div>
        </div>
      </Specimen>
    </>
  );
}

export function EmptyStates(): React.ReactElement {
  return (
    <>
      <Specimen title="With an Icon" about="What a section shows before it has anything in it.">
        <Empty className="py-12">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <TableIcon />
            </EmptyMedia>
            <EmptyTitle>No Tables Yet</EmptyTitle>
            <EmptyDescription>Add a table to start keeping rows in it.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm">
              <PlusIcon />
              New Table
            </Button>
          </EmptyContent>
        </Empty>
      </Specimen>
      <Specimen title="Plain">
        <Empty className="py-12">
          <EmptyHeader>
            <EmptyTitle>Nothing Matches</EmptyTitle>
            <EmptyDescription>Try another search or clear the filters.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" variant="outline">
              Clear Filters
            </Button>
          </EmptyContent>
        </Empty>
      </Specimen>
      <Specimen title="Inside a Page Card" canvas="none">
        <Card title="Backups" description="Restore the database to an earlier point in time.">
          <Empty className="py-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HistoryIcon />
              </EmptyMedia>
              <EmptyTitle>Not Built Yet</EmptyTitle>
              <EmptyDescription>Time travel needs the workspace's D1 binding.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </Card>
      </Specimen>
    </>
  );
}

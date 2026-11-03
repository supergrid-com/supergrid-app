import { ActivityIcon, AlertCircleIcon, CopyIcon, DatabaseIcon, EllipsisIcon, ExternalLinkIcon, FileCode2Icon, LockIcon, type LucideIcon, PlusIcon, RefreshCwIcon, TableIcon, TagsIcon, Trash2Icon, UsersIcon, UsersRoundIcon, WaypointsIcon } from "lucide-react";
import * as React from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import { DataGrid, type Sorting } from "~/components/data-grid/data-grid";
import type { GridRow } from "~/components/data-grid/types";
import { FilterButton } from "~/components/database/filters";
import { RecordSheet } from "~/components/database/record-sheet";
import { AlertDialog, AlertDialogClose, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogPopup, AlertDialogTitle } from "~/components/ui/alert-dialog";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "~/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "~/components/ui/empty";
import { Input } from "~/components/ui/input";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "~/components/ui/menu";
import { toastManager } from "~/components/ui/toast";
import { Tooltip, TooltipPopup, TooltipTrigger } from "~/components/ui/tooltip";
import { Crumbs, WorkspaceFrame } from "~/components/workspace/frame";
import { sg } from "~/lib/bridge";
import { addColumn, allows, createTable, type D1Target, type DbTable, deleteRows, dropTable, type Filter, insertRow, KEY, modeAbout, modeLabels, readInfo, readRows, refreshSchema, reservedTableIds, type RowPage, type RowQuery, tableLabel, tableNoun, updateCell, updateRow, useD1Target, useSchema } from "~/lib/db";
import { useOpenNav, useShell } from "~/shell/context";
import { Backups } from "./backups";
import { Migrations } from "./migrations";
import { Query } from "./query";

// The workspace's database: its D1, table by table, in the data grid. The sub panel lists the
// tables in their groups (workspace-shell.tsx) with a + for a custom one; Query, Migrations and
// Backups sit under them. Rows are read a page at a time, searched, filtered and sorted on the
// server (lib/db.ts), and open in a drawer from the key column.

const coreIcons: Record<string, LucideIcon> = { contacts: UsersIcon, contact_tags: TagsIcon, segments: UsersRoundIcon, segment_members: UsersRoundIcon, events: ActivityIcon };

/** A table's icon in the sub panel: what it holds for core tables, a lock for system ones, a table otherwise. */
export function TableRowIcon({ table }: { table?: DbTable }): React.ReactElement {
  if (!table) return <TableIcon className="opacity-60" />;
  if (table.group === "system") return <LockIcon className="opacity-60" />;
  if (table.group === "core" && table.name.startsWith("obj_")) return <WaypointsIcon />;
  const Icon = (table.group === "core" && coreIcons[table.name]) || TableIcon;
  return <Icon />;
}

export function Database(): React.ReactElement {
  const sub = useParams()["*"] ?? "";
  const { ws } = useShell();
  const target = useD1Target();
  const { tables, error, loading, refresh } = useSchema(target);
  const onOpenNav = useOpenNav();
  const id = sub.split("/")[0] ?? "";
  if (id === "query") return <Query />;
  if (id === "migrations") return <Migrations />;
  if (id === "backups") return <Backups />;
  if (!target) {
    return (
      <Frame onOpenNav={onOpenNav}>
        <Empty className="py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <DatabaseIcon />
            </EmptyMedia>
            <EmptyTitle>No Cloud Database</EmptyTitle>
            <EmptyDescription>The local dev workspace keeps its database on disk, where wrangler runs it. Cloud workspaces open their D1 here.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </Frame>
    );
  }
  if (!tables) {
    return (
      <Frame onOpenNav={onOpenNav}>
        <Empty className="py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">{error ? <AlertCircleIcon /> : <DatabaseIcon />}</EmptyMedia>
            <EmptyTitle>{error ? "Couldn't read the database" : "Reading the database"}</EmptyTitle>
            <EmptyDescription>{error ?? `Listing the tables in ${ws.worker}.`}</EmptyDescription>
          </EmptyHeader>
          {error && (
            <Button size="sm" variant="outline" disabled={loading} onClick={() => void refresh()}>
              Try Again
            </Button>
          )}
        </Empty>
      </Frame>
    );
  }
  // events have a page of their own under Workflows; the table stays out of the panel here
  if (id === "events") return <Navigate to={`/w/${ws.id}/workflows/events`} replace />;
  const first = tables.find((t) => t.name !== "events");
  if (!id && first) return <Navigate to={`/w/${ws.id}/database/${first.name}`} replace />;
  const table = tables.find((t) => t.name === id);
  if (!table) {
    return (
      <Frame onOpenNav={onOpenNav}>
        <Empty className="py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <TableIcon />
            </EmptyMedia>
            <EmptyTitle>{id ? "No Such Table" : "No Tables Yet"}</EmptyTitle>
            <EmptyDescription>{id ? `There is no ${id} table in this workspace.` : "The database is empty. The workspace makes its core tables on first use."}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </Frame>
    );
  }
  return <TablePage key={table.name} target={target} table={table} />;
}

function Frame({ onOpenNav, children }: { onOpenNav: () => void; children: React.ReactNode }): React.ReactElement {
  return (
    <WorkspaceFrame icon={<DatabaseIcon />} title="Database" onOpenNav={onOpenNav}>
      {children}
    </WorkspaceFrame>
  );
}

// ---- one table ----

const PAGE_SIZES = [50, 100, 250, 500];
const limitKey = "sg.db.pageSize";

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function TablePage({ target, table }: { target: D1Target; table: DbTable }): React.ReactElement {
  const { ws } = useShell();
  const onOpenNav = useOpenNav();
  const [search, setSearch] = React.useState("");
  const [filters, setFilters] = React.useState<Filter[]>([]);
  const [sort, setSort] = React.useState<Sorting>(null);
  const [offset, setOffset] = React.useState(0);
  const [limit, setLimit] = React.useState(() => Number(localStorage.getItem(limitKey)) || 100);
  const [version, setVersion] = React.useState(0);
  const [page, setPage] = React.useState<RowPage | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState<string | null>(null);
  const [drop, setDrop] = React.useState(false);
  const debounced = useDebounced(search, 250);
  const q = React.useMemo<RowQuery>(() => ({ search: debounced, filters, sort, offset, limit }), [debounced, filters, sort, offset, limit]);
  // a new search, filter or sort starts from the first page
  React.useEffect(() => setOffset(0), [debounced, filters, sort, limit]);

  React.useEffect(() => {
    let live = true;
    setLoading(true);
    readRows(target, table, q)
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
  }, [target, table, q, version]);

  const reload = React.useCallback(() => setVersion((v) => v + 1), []);
  const fail = (e: unknown) => toastManager.add({ title: String((e as Error).message ?? e), type: "error" });
  /** After a change in rows: this page again, and the counts in the sub panel. */
  const changed = () => {
    reload();
    void refreshSchema(target);
  };

  const rows = page?.rows ?? [];
  const editable = allows(table, "rows");
  const schema = allows(table, "schema");
  const fields = React.useMemo(() => table.columns.map((c) => c.field), [table]);

  const onCellChange = editable
    ? (rowId: string, fieldId: string, value: unknown) => {
        // shown at once, written behind it; the page reloads either way so the row is what D1 has
        setPage((p) => (p ? { ...p, rows: p.rows.map((r) => (r[KEY] === rowId ? { ...r, [fieldId]: value } : r)) } : p));
        updateCell(target, table, rowId, fieldId, value).then(reload, (e) => {
          fail(e);
          reload();
        });
      }
    : undefined;

  const onDeleteRows = editable
    ? (ids: string[]) => {
        deleteRows(target, table, ids).then(changed, (e) => {
          fail(e);
          reload();
        });
      }
    : undefined;

  const noun = tableNoun(table);
  const label = tableLabel(table);
  const title = <Crumbs items={["Database", label]} />;
  // the top bar's end: what the table allows, then the page's main action (workspace/frame.tsx)
  const actions = (
    <>
      <ModeBadge table={table} />
      {editable && (
        <Button size="xs" onClick={() => setOpen("new")}>
          <PlusIcon />
          New {titleCase(noun.one)}
        </Button>
      )}
    </>
  );

  return (
    <WorkspaceFrame icon={<TableRowIcon table={table} />} title={title} actions={actions} flush onOpenNav={onOpenNav}>
      {error && (
        <div className="flex items-center gap-2 border-b bg-destructive/6 px-3 py-2 text-[13px] text-destructive-foreground">
          <AlertCircleIcon className="size-4 shrink-0" />
          <span className="min-w-0 flex-1 truncate">{error}</span>
          <Button size="xs" variant="ghost" onClick={reload}>
            Try Again
          </Button>
        </div>
      )}
      <DataGrid
        fields={fields}
        rows={rows}
        rowKey={(r) => String(r[KEY])}
        noun={noun}
        storageKey={`sg.grid.${ws.id}.${table.name}`}
        loading={loading}
        search={{ value: search, onChange: setSearch }}
        sorting={{ value: sort, onChange: setSort }}
        paging={{
          total: page?.total ?? 0,
          offset,
          limit,
          sizes: PAGE_SIZES,
          onOffset: setOffset,
          onLimit: (n) => {
            setLimit(n);
            localStorage.setItem(limitKey, String(n));
          },
        }}
        onCellChange={onCellChange}
        onAddRow={editable ? () => setOpen("new") : undefined}
        toolbarAdd={false}
        onDeleteRows={onDeleteRows}
        onAddField={schema ? (f) => addColumn(target, table, { name: f.label, type: f.type }).then(() => refreshSchema(target), fail) : undefined}
        onOpenRow={(id) => setOpen(id)}
        emptyText={table.virtual ? "A virtual table: query it from the Query page." : `No ${noun.many} yet`}
        toolbar={
          <>
            <FilterButton table={table} filters={filters} onChange={setFilters} />
            <Tooltip>
              <TooltipTrigger render={<Button size="icon-xs" variant="ghost" aria-label="Reload" onClick={changed} className="text-foreground/70 hover:text-foreground" />}>
                <RefreshCwIcon className={loading ? "animate-spin" : undefined} />
              </TooltipTrigger>
              <TooltipPopup>Reload</TooltipPopup>
            </Tooltip>
            <TableMenu target={target} table={table} onDrop={() => setDrop(true)} />
          </>
        }
      />
      {open !== null && (
        <RecordSheet
          table={table}
          rows={rows}
          rowId={open}
          offset={offset}
          total={page?.total ?? 0}
          onNavigate={setOpen}
          onClose={() => setOpen(null)}
          onSave={async (values) => {
            await updateRow(target, table, open, values);
            reload();
            toastManager.add({ title: "Saved", type: "success" });
          }}
          onInsert={async (values) => {
            await insertRow(target, table, values);
            setOpen(null);
            changed();
            toastManager.add({ title: `Added a ${noun.one}`, type: "success" });
          }}
          onDelete={async () => {
            await deleteRows(target, table, [open]);
            setOpen(null);
            changed();
          }}
        />
      )}
      <DropTableDialog target={target} table={table} open={drop} onOpenChange={setDrop} />
    </WorkspaceFrame>
  );
}

const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

/** What the table allows, in the top bar beside its actions: a hover says what that means. */
function ModeBadge({ table }: { table: DbTable }): React.ReactElement {
  const about = modeAbout[table.mode];
  // a button, so the title bar's drag region lets the pointer reach it (see .titlebar in app.css)
  return (
    <Tooltip>
      <TooltipTrigger delay={0} render={<Badge size="lg" variant="secondary" render={<button type="button" aria-label={`${modeLabels[table.mode]} table`} />} className="me-1 cursor-default! font-normal tracking-normal text-foreground/80 hover:bg-secondary!" />}>
        {table.mode === "locked" && <LockIcon className="size-3" />}
        {modeLabels[table.mode]}
      </TooltipTrigger>
      <TooltipPopup className="max-w-72 px-3 py-2.5 text-start">
        <span className="block text-[13px] font-medium">{about.title}</span>
        <span className="mt-1 block text-xs leading-relaxed opacity-80">{about.body}</span>
      </TooltipPopup>
    </Tooltip>
  );
}

/** The … in the toolbar: the CREATE statement, the table in Cloudflare's studio, and for custom tables the drop. */
function TableMenu({ target, table, onDrop }: { target: D1Target; table: DbTable; onDrop: () => void }): React.ReactElement {
  const [sql, setSql] = React.useState(false);
  const openStudio = () => {
    readInfo(target)
      .then((info) => sg?.openExternal(`https://dash.cloudflare.com/${info.accountId}/workers/d1/databases/${info.id}/studio`))
      .catch((e) => toastManager.add({ title: String((e as Error).message ?? e), type: "error" }));
  };
  return (
    <>
      <Menu>
        <MenuTrigger render={<Button size="icon-xs" variant="ghost" aria-label="More" className="text-foreground/70 hover:text-foreground" />}>
          <EllipsisIcon />
        </MenuTrigger>
        <MenuPopup align="start" className="min-w-52">
          <MenuItem onClick={() => setSql(true)}>
            <FileCode2Icon />
            Show schema
          </MenuItem>
          <MenuItem onClick={openStudio}>
            <ExternalLinkIcon />
            Open in Cloudflare
          </MenuItem>
          {allows(table, "schema") && (
            <>
              <MenuSeparator />
              <MenuItem variant="destructive" onClick={onDrop}>
                <Trash2Icon />
                Drop table
              </MenuItem>
            </>
          )}
        </MenuPopup>
      </Menu>
      <Dialog open={sql} onOpenChange={setSql}>
        <DialogPopup className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {tableLabel(table)} <span className="ms-1 font-mono text-sm font-normal text-muted-foreground">{table.name}</span>
            </DialogTitle>
            <DialogDescription>
              {table.columns.length} columns, {table.indexes.length} {table.indexes.length === 1 ? "index" : "indexes"}
              {table.pk.length ? `, keyed by ${table.pk.join(", ")}` : ", no primary key"}.
            </DialogDescription>
          </DialogHeader>
          <DialogPanel>
            <pre className="max-h-96 overflow-auto rounded-lg border bg-muted/40 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">{[table.sql, ...table.indexes.map((i) => i.sql).filter(Boolean)].join(";\n\n")}</pre>
          </DialogPanel>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                void navigator.clipboard.writeText([table.sql, ...table.indexes.map((i) => i.sql).filter(Boolean)].join(";\n"));
                toastManager.add({ title: "Copied", type: "success" });
              }}
            >
              <CopyIcon />
              Copy SQL
            </Button>
            <Button onClick={() => setSql(false)}>Done</Button>
          </DialogFooter>
        </DialogPopup>
      </Dialog>
    </>
  );
}

function DropTableDialog({ target, table, open, onOpenChange }: { target: D1Target; table: DbTable; open: boolean; onOpenChange: (o: boolean) => void }): React.ReactElement {
  const { ws } = useShell();
  const navigate = useNavigate();
  const [typed, setTyped] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setTyped("");
      }}
    >
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>Drop {tableLabel(table)}?</AlertDialogTitle>
          <AlertDialogDescription>
            The table and its {table.count?.toLocaleString() ?? ""} rows go. Backups can bring the database back to before this. Type the table's name to go on.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="px-6 pb-2">
          <Input autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={table.name} aria-label="Table name" className="font-mono" />
        </div>
        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="ghost" />}>Cancel</AlertDialogClose>
          <Button
            variant="destructive"
            disabled={typed !== table.name || busy}
            onClick={() => {
              setBusy(true);
              dropTable(target, table)
                .then(async () => {
                  const tables = await refreshSchema(target);
                  onOpenChange(false);
                  navigate(`/w/${ws.id}/database${tables?.[0] ? `/${tables[0].name}` : ""}`);
                  toastManager.add({ title: `Dropped ${tableLabel(table)}`, type: "success" });
                })
                .catch((e) => toastManager.add({ title: String((e as Error).message ?? e), type: "error" }))
                .finally(() => setBusy(false));
            }}
          >
            Drop Table
          </Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
}

/** The + beside the Database title in the sub panel: names a new custom table and opens it. */
export function NewTableButton(): React.ReactElement {
  const navigate = useNavigate();
  const { ws } = useShell();
  const target = useD1Target();
  const { tables } = useSchema(target);
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !target) return;
    setBusy(true);
    setError(null);
    createTable(target, tables ?? [], name)
      .then(async (id) => {
        await refreshSchema(target);
        setOpen(false);
        setName("");
        navigate(`/w/${ws.id}/database/${id}`);
      })
      .catch((err) => setError(String((err as Error).message ?? err)))
      .finally(() => setBusy(false));
  };
  return (
    <>
      <button
        type="button"
        aria-label="New Table"
        title="New Table"
        disabled={!target}
        onClick={() => setOpen(true)}
        className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
      >
        <PlusIcon className="size-4" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogPopup className="max-w-lg">
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>New Table</DialogTitle>
              <DialogDescription>A custom table of this workspace's own, with an id, a name, notes and a created time. Add columns from the + at the end of its header. Every app can read it.</DialogDescription>
            </DialogHeader>
            <DialogPanel className="flex flex-col gap-2">
              <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Table name, like testimonials" aria-label="Table Name" />
              {error && <p className="text-xs text-destructive-foreground">{error}</p>}
            </DialogPanel>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!name.trim() || busy}>
                Create Table
              </Button>
            </DialogFooter>
          </form>
        </DialogPopup>
      </Dialog>
    </>
  );
}

export { reservedTableIds };
export type { GridRow };

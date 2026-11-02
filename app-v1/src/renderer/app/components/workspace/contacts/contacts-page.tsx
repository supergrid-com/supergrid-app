import type { ContactFull, ContactQuery, FieldDef } from "@supergrid/app-kit/rpc";
import { Columns3Icon, PlusIcon, TagIcon, Trash2Icon, UsersIcon, XIcon } from "lucide-react";
import * as React from "react";
import { ConfirmDialog } from "~/components/workspace/confirm-dialog";
import { FieldRow } from "~/components/workspace/contacts/fields-form";
import { FilterBar } from "~/components/workspace/contacts/filter-bar";
import { SegmentSheet } from "~/components/workspace/contacts/segment-sheet";
import { BulkTagDialog, TagsPicker } from "~/components/workspace/contacts/tag-dialog";
import { type ContactFilter, emptyFilter, filterIsEmpty, formatValue, initialOf, relative } from "~/components/workspace/contacts/util";
import { Crumbs, DataTable, type DataColumn, type SortState, TableFooter, WorkspaceFrame } from "~/components/workspace/frame";
import { QueryState } from "~/components/workspace/query-states";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "~/components/ui/dialog";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "~/components/ui/empty";
import { Input } from "~/components/ui/input";
import { Menu, MenuCheckboxItem, MenuGroupLabel, MenuPopup, MenuSeparator, MenuTrigger } from "~/components/ui/menu";
import { toastManager } from "~/components/ui/toast";
import type { Workspace } from "~/lib/mock";
import { useWorkspacePage } from "~/lib/workspace-page";
import { APP_ID } from "~/lib/ws-api";
import { useWsMutation, useWsQuery } from "~/lib/ws-query";

// The contacts index: search and filters up top, a bulk bar when rows are picked, the table,
// and paging under it. The query lives in component state; the segment, if any, in the URL.

const LIMIT = 50;
const defaultColumns = ["source", "tags", "created"];

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

// Which columns show, kept per workspace in localStorage.
function useColumns(wsId: string): [string[], (next: string[]) => void] {
  const key = `sg:contacts:columns:${wsId}`;
  const [cols, setCols] = React.useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as string[]) : defaultColumns;
    } catch {
      return defaultColumns;
    }
  });
  const set = React.useCallback(
    (next: string[]) => {
      setCols(next);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // storage can be off; the choice then lasts for the session
      }
    },
    [key],
  );
  return [cols, set];
}

export function ContactAvatar({ name, email, className }: { name: string | null; email: string; className?: string }): React.ReactElement {
  return <span className={className ?? "flex size-7 shrink-0 items-center justify-center rounded-full bg-active/12 text-[11px] font-semibold text-active"}>{initialOf(name, email)}</span>;
}

function AddContactDialog({ ws, open, onOpenChange }: { ws: Workspace; open: boolean; onOpenChange: (open: boolean) => void }): React.ReactElement {
  const { go } = useWorkspacePage();
  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [source, setSource] = React.useState("manual");
  const [tags, setTags] = React.useState<string[]>([]);
  const save = useWsMutation(ws.id, "saveContact", { invalidates: ["contacts"], title: "Contact did not save" });
  React.useEffect(() => {
    if (open) {
      setEmail("");
      setName("");
      setSource("manual");
      setTags([]);
    }
  }, [open]);
  const submit = async () => {
    const out = await save.run(APP_ID, { email: email.trim(), name: name.trim() || null, source: source.trim() || null, tags });
    if (out) {
      onOpenChange(false);
      toastManager.add({ title: `Added ${out.email}`, type: "success", timeout: 2000, actionProps: { children: "Open", onClick: () => go({ kind: "contacts", id: out.id }) } });
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add contact</DialogTitle>
          <DialogDescription>A person this workspace knows. Apps add the rest as they go.</DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <FieldRow label="Email">
              <Input type="email" autoFocus required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ada@example.com" />
            </FieldRow>
            <FieldRow label="Name">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </FieldRow>
            <FieldRow label="Source" hint="Where they came from: an app id, a campaign, an import.">
              <Input value={source} onChange={(e) => setSource(e.target.value)} />
            </FieldRow>
            <FieldRow label="Tags">
              <TagsPicker ws={ws} value={tags} onChange={setTags} />
            </FieldRow>
          </form>
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
          <Button disabled={!email.includes("@")} loading={save.pending} onClick={() => void submit()}>
            Add contact
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

function BulkBar({ ws, selected, onClear }: { ws: Workspace; selected: Set<string>; onClear: () => void }): React.ReactElement {
  const [tagMode, setTagMode] = React.useState<"add" | "remove" | null>(null);
  const [confirm, setConfirm] = React.useState(false);
  const del = useWsMutation(ws.id, "deleteContacts", { invalidates: ["contacts"], title: "Contacts were not deleted" });
  const ids = [...selected];
  return (
    <div className="flex h-10 shrink-0 items-center gap-1.5 border-b bg-accent/40 px-3 text-[13px]">
      <span className="font-medium">{ids.length} selected</span>
      <Button size="xs" variant="ghost" onClick={onClear} aria-label="Clear selection">
        <XIcon />
      </Button>
      <span className="mx-1 h-4 w-px bg-border" />
      <Button size="xs" variant="outline" onClick={() => setTagMode("add")}>
        <TagIcon />
        Tag…
      </Button>
      <Button size="xs" variant="outline" onClick={() => setTagMode("remove")}>
        Untag…
      </Button>
      <span className="flex-1" />
      <Button size="xs" variant="destructive-outline" onClick={() => setConfirm(true)}>
        <Trash2Icon />
        Delete
      </Button>
      <BulkTagDialog ws={ws} ids={ids} mode={tagMode ?? "add"} open={!!tagMode} onOpenChange={(o) => !o && setTagMode(null)} onDone={onClear} />
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={`Delete ${ids.length} contact${ids.length === 1 ? "" : "s"}?`}
        description="Their events stay in the stream without a contact; linked objects lose the link. This cannot be undone."
        pending={del.pending}
        onConfirm={() => {
          void del.run(APP_ID, ids).then((out) => {
            if (out !== null) {
              setConfirm(false);
              onClear();
            }
          });
        }}
      />
    </div>
  );
}

export function ContactsPage({ ws, segment, onOpenNav }: { ws: Workspace; segment?: string; onOpenNav: () => void }): React.ReactElement {
  const { go } = useWorkspacePage();
  const [q, setQ] = React.useState("");
  const search = useDebounced(q.trim(), 250);
  const [filter, setFilter] = React.useState<ContactFilter>(emptyFilter);
  const [sort, setSort] = React.useState<SortState>({ key: "created_at", dir: "desc" });
  const [offset, setOffset] = React.useState(0);
  const [selected, setSelected] = React.useState<Set<string>>(() => new Set());
  const [adding, setAdding] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [visible, setVisible] = useColumns(ws.id);
  // a new search, filter, sort or segment starts from the first page
  React.useEffect(() => { setOffset(0); }, [search, filter, sort, segment]);
  React.useEffect(() => { setSelected(new Set()); }, [segment]);

  const fields = useWsQuery(ws.id, "listContactFields", [], { tags: ["fields"] });
  const segments = useWsQuery(ws.id, "listSegments", [], { tags: ["segments", "contacts"] });
  const query: ContactQuery = { search: search || undefined, ...filter, segment, sort: sort.key as ContactQuery["sort"], dir: sort.dir, limit: LIMIT, offset };
  const list = useWsQuery(ws.id, "queryContacts", [query], { tags: ["contacts"] });
  const segmentName = segment ? segments.data?.find((s) => s.id === segment)?.name : undefined;

  const registry: FieldDef[] = fields.data ?? [];
  const columns = React.useMemo<DataColumn<ContactFull>[]>(() => {
    const all: DataColumn<ContactFull>[] = [
      {
        key: "name",
        label: "Contact",
        sortable: true,
        render: (c) => (
          <span className="flex items-center gap-2.5">
            <ContactAvatar name={c.name} email={c.email} />
            <span className="min-w-0">
              <span className="block truncate font-medium">{c.name ?? c.email}</span>
              {c.name && <span className="block truncate text-xs text-muted-foreground">{c.email}</span>}
            </span>
          </span>
        ),
      },
      { key: "source", label: "Source", width: "9rem", className: "max-sm:hidden", render: (c) => <span className="text-muted-foreground">{c.source ?? "—"}</span> },
      {
        key: "tags",
        label: "Tags",
        render: (c) => (
          <span className="flex flex-wrap gap-1">
            {c.tags.map((t) => (
              <Badge key={t} variant="secondary" size="sm">
                {t}
              </Badge>
            ))}
          </span>
        ),
      },
      ...registry.map<DataColumn<ContactFull>>((f) => ({ key: `prop:${f.key}`, label: f.label, sortable: true, align: f.type === "number" ? "end" : "start", width: "9rem", render: (c) => <span className={f.type === "number" ? "tabular-nums" : undefined}>{formatValue(f, c.props[f.key])}</span> })),
      { key: "created", label: "Created", sortable: true, align: "end", width: "7rem", className: "max-sm:hidden", render: (c) => <span className="text-xs text-muted-foreground">{relative(c.created_at)}</span> },
      { key: "updated", label: "Updated", sortable: true, align: "end", width: "7rem", className: "max-sm:hidden", render: (c) => <span className="text-xs text-muted-foreground">{relative(c.updated_at)}</span> },
    ];
    return all.filter((c) => c.key === "name" || visible.includes(c.key));
  }, [registry, visible]);

  // sort keys the table uses map onto the query's
  const sortKeyFor = (col: string): ContactQuery["sort"] => (col === "name" ? "name" : col === "created" ? "created_at" : col === "updated" ? "updated_at" : (col as ContactQuery["sort"]));
  const onSort = (col: string) => {
    const key = sortKeyFor(col) ?? "created_at";
    setSort((s) => ({ key, dir: s.key === key ? (s.dir === "asc" ? "desc" : "asc") : key === "name" || key === "email" ? "asc" : "desc" }));
  };
  const sortFor = (s: SortState): SortState => ({ key: s.key === "name" ? "name" : s.key === "created_at" ? "created" : s.key === "updated_at" ? "updated" : s.key, dir: s.dir });

  const columnChoices: { key: string; label: string }[] = [
    { key: "source", label: "Source" },
    { key: "tags", label: "Tags" },
    ...registry.map((f) => ({ key: `prop:${f.key}`, label: f.label })),
    { key: "created", label: "Created" },
    { key: "updated", label: "Updated" },
  ];

  return (
    <WorkspaceFrame
      icon={<UsersIcon />}
      title={<Crumbs items={segmentName ? ["Contacts", segmentName] : ["Contacts"]} />}
      onOpenNav={onOpenNav}
      flush
      actions={
        <>
          <Menu>
            <MenuTrigger render={<Button size="xs" variant="ghost" />}>
              <Columns3Icon />
              Columns
            </MenuTrigger>
            <MenuPopup align="end" className="w-44">
              <MenuGroupLabel>Show</MenuGroupLabel>
              {columnChoices.map((c) => (
                <MenuCheckboxItem key={c.key} checked={visible.includes(c.key)} closeOnClick={false} onCheckedChange={(on) => setVisible(on ? [...visible, c.key] : visible.filter((k) => k !== c.key))}>
                  {c.label}
                </MenuCheckboxItem>
              ))}
              <MenuSeparator />
              <MenuCheckboxItem checked={false} onCheckedChange={() => setVisible(defaultColumns)}>
                Reset
              </MenuCheckboxItem>
            </MenuPopup>
          </Menu>
          <Button size="xs" variant="outline" onClick={() => toastManager.add({ title: "Import comes with CSV support later", type: "info" })}>
            Import
          </Button>
          <Button size="xs" onClick={() => setAdding(true)}>
            <PlusIcon />
            Add contact
          </Button>
        </>
      }
    >
      <FilterBar ws={ws} search={q} onSearch={setQ} filter={filter} onFilter={setFilter} fields={registry} onSaveSegment={() => setSaving(true)} />
      {selected.size > 0 && <BulkBar ws={ws} selected={selected} onClear={() => setSelected(new Set())} />}
      <QueryState
        q={list}
        empty={
          <Empty className="py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <UsersIcon />
              </EmptyMedia>
              <EmptyTitle>{search || !filterIsEmpty(filter) ? "No one matches" : segment ? "Nobody in this segment yet" : "No contacts yet"}</EmptyTitle>
              <EmptyDescription>{search || !filterIsEmpty(filter) ? "Loosen the search or a filter." : "Forms, funnels and apps add contacts as people show up, or add one yourself."}</EmptyDescription>
            </EmptyHeader>
            {!search && filterIsEmpty(filter) && !segment && (
              <Button size="sm" onClick={() => setAdding(true)}>
                <PlusIcon />
                Add contact
              </Button>
            )}
          </Empty>
        }
      >
        {(data) => (
          <>
            <DataTable<ContactFull> columns={columns} rows={data.items} rowKey={(c) => c.id} sort={sortFor(sort)} onSort={onSort} selected={selected} onSelect={setSelected} onRowClick={(c) => go({ kind: "contacts", id: c.id })} />
            <TableFooter total={data.total} offset={offset} limit={LIMIT} onPage={setOffset}>
              {list.error && <span className="text-destructive-foreground">{list.error}</span>}
            </TableFooter>
          </>
        )}
      </QueryState>
      <AddContactDialog ws={ws} open={adding} onOpenChange={setAdding} />
      <SegmentSheet ws={ws} open={saving} onOpenChange={setSaving} initialFilter={filter} onSaved={(s) => { setFilter(emptyFilter); go({ kind: "contacts", segment: s.id }); }} />
    </WorkspaceFrame>
  );
}

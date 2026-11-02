import type { ContactFull, ObjectQuery, ObjectRow, ObjectType } from "@supergrid/app-kit/rpc";
import { BoxIcon, PlusIcon, SearchIcon, Trash2Icon, UserIcon } from "lucide-react";
import * as React from "react";
import { ConfirmDialog } from "~/components/workspace/confirm-dialog";
import { FieldsForm } from "~/components/workspace/contacts/fields-form";
import { absolute, formatValue, relative } from "~/components/workspace/contacts/util";
import { Card, Crumbs, DataTable, type DataColumn, type SortState, TableFooter, WorkspaceFrame } from "~/components/workspace/frame";
import { QueryState } from "~/components/workspace/query-states";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Combobox, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList, ComboboxPopup } from "~/components/ui/combobox";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "~/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "~/components/ui/input-group";
import { toastManager } from "~/components/ui/toast";
import type { Workspace } from "~/lib/mock";
import { useWorkspacePage } from "~/lib/workspace-page";
import { APP_ID } from "~/lib/ws-api";
import { useWsMutation, useWsQuery } from "~/lib/ws-query";

// Custom objects: one list and one detail page per type, both drawn from the type's fields.
// A record is a JSON doc plus an optional link to a contact.

const LIMIT = 50;

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function useType(ws: Workspace, type: string): { types: ReturnType<typeof useWsQuery<"listObjectTypes">>; t: ObjectType | undefined } {
  const types = useWsQuery(ws.id, "listObjectTypes", [], { tags: ["objects"] });
  return { types, t: types.data?.find((x) => x.id === type) };
}

function cell(t: ObjectType, key: string, v: unknown): React.ReactNode {
  const f = t.fields.find((x) => x.key === key);
  if (v == null || v === "") return <span className="text-muted-foreground">—</span>;
  if (f?.type === "select")
    return (
      <Badge variant="secondary" size="sm">
        {String(v)}
      </Badge>
    );
  if (f?.type === "url")
    return (
      <a href={String(v)} target="_blank" rel="noreferrer" className="text-primary hover:underline">
        {String(v).replace(/^https?:\/\//, "")}
      </a>
    );
  return <span className={f?.type === "number" ? "tabular-nums" : undefined}>{formatValue(f, v)}</span>;
}

function NoType({ ws, type, onOpenNav }: { ws: Workspace; type: string; onOpenNav: () => void }): React.ReactElement {
  const { go } = useWorkspacePage();
  return (
    <WorkspaceFrame icon={<BoxIcon />} title={<Crumbs items={["Contacts", type]} />} onOpenNav={onOpenNav}>
      <Empty>
        <EmptyHeader>
          <EmptyTitle>No such object type</EmptyTitle>
          <EmptyDescription>
            {ws.name} has no type called <span className="font-mono">{type}</span>. Apps register types from their manifest.
          </EmptyDescription>
        </EmptyHeader>
        <Button variant="outline" onClick={() => go({ kind: "contacts" })}>
          Back to contacts
        </Button>
      </Empty>
    </WorkspaceFrame>
  );
}

export function ObjectsPage({ ws, type, onOpenNav }: { ws: Workspace; type: string; onOpenNav: () => void }): React.ReactElement {
  const { go } = useWorkspacePage();
  const { types, t } = useType(ws, type);
  const [q, setQ] = React.useState("");
  const search = useDebounced(q.trim(), 250);
  const [sort, setSort] = React.useState<SortState>({ key: "updated_at", dir: "desc" });
  const [offset, setOffset] = React.useState(0);
  const [selected, setSelected] = React.useState<Set<string>>(() => new Set());
  const [confirm, setConfirm] = React.useState(false);
  React.useEffect(() => { setOffset(0); setSelected(new Set()); }, [search, sort, type]);
  const query: ObjectQuery = { search: search || undefined, sort: sort.key as ObjectQuery["sort"], dir: sort.dir, limit: LIMIT, offset };
  const list = useWsQuery(ws.id, "listObjects", [type, query], { tags: ["objects", `objects:${type}`], enabled: !!t });
  const remove = useWsMutation(ws.id, "removeObjects", { invalidates: ["objects", "contacts"], title: "Records were not deleted" });

  const columns = React.useMemo<DataColumn<ObjectRow>[]>(() => {
    if (!t) return [];
    const ordered = [...t.fields].sort((a, b) => (a.key === t.title_field ? -1 : b.key === t.title_field ? 1 : 0));
    return [
      ...ordered.map<DataColumn<ObjectRow>>((f) => ({
        key: `doc:${f.key}`,
        label: f.label,
        sortable: true,
        align: f.type === "number" ? "end" : "start",
        width: f.key === t.title_field ? undefined : "10rem",
        render: (r) => (f.key === t.title_field ? <span className="font-medium">{String(r.doc[f.key] ?? r.id)}</span> : cell(t, f.key, r.doc[f.key])),
      })),
      {
        key: "contact",
        label: "Contact",
        width: "9rem",
        className: "max-sm:hidden",
        render: (r) =>
          r.contact_id ? (
            <button type="button" onClick={(e) => { e.stopPropagation(); go({ kind: "contacts", id: r.contact_id! }); }} className="inline-flex max-w-full items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground">
              <UserIcon className="size-3" />
              <span className="truncate">{r.contact_id}</span>
            </button>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      { key: "updated_at", label: "Updated", sortable: true, align: "end", width: "7rem", className: "max-sm:hidden", render: (r) => <span className="text-xs text-muted-foreground">{relative(r.updated_at)}</span> },
    ];
  }, [t, go]);

  if (types.data && !t) return <NoType ws={ws} type={type} onOpenNav={onOpenNav} />;
  const ids = [...selected];
  return (
    <WorkspaceFrame
      icon={<BoxIcon />}
      title={<Crumbs items={["Contacts", t?.plural ?? type]} />}
      onOpenNav={onOpenNav}
      flush
      actions={
        <Button size="xs" disabled={!t} onClick={() => go({ kind: "objects", type, id: "new" })}>
          <PlusIcon />
          New {t?.label.toLowerCase() ?? "record"}
        </Button>
      }
    >
      <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
        <InputGroup className="w-64 max-w-full">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput type="search" size="sm" placeholder={`Search ${t?.plural.toLowerCase() ?? "records"}`} value={q} onChange={(e) => setQ(e.target.value)} />
        </InputGroup>
        {t?.app_id && (
          <Badge variant="outline" size="sm">
            defined by {t.app_id}
          </Badge>
        )}
        <span className="flex-1" />
        {ids.length > 0 && (
          <>
            <span className="text-[13px] font-medium">{ids.length} selected</span>
            <Button size="xs" variant="destructive-outline" onClick={() => setConfirm(true)}>
              <Trash2Icon />
              Delete
            </Button>
          </>
        )}
      </div>
      <QueryState
        q={list}
        empty={
          <Empty className="py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BoxIcon />
              </EmptyMedia>
              <EmptyTitle>{search ? "Nothing matches" : `No ${t?.plural.toLowerCase() ?? "records"} yet`}</EmptyTitle>
              <EmptyDescription>{search ? "Try another search." : `Apps create ${t?.plural.toLowerCase() ?? "records"} as they work, or add one here.`}</EmptyDescription>
            </EmptyHeader>
            {!search && (
              <Button size="sm" onClick={() => go({ kind: "objects", type, id: "new" })}>
                <PlusIcon />
                New {t?.label.toLowerCase()}
              </Button>
            )}
          </Empty>
        }
      >
        {(data) => (
          <>
            <DataTable<ObjectRow> columns={columns} rows={data.items} rowKey={(r) => r.id} sort={sort} onSort={(key) => setSort((s) => ({ key, dir: s.key === key ? (s.dir === "asc" ? "desc" : "asc") : "asc" }))} selected={selected} onSelect={setSelected} onRowClick={(r) => go({ kind: "objects", type, id: r.id })} />
            <TableFooter total={data.total} offset={offset} limit={LIMIT} onPage={setOffset} />
          </>
        )}
      </QueryState>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={`Delete ${ids.length} ${ids.length === 1 ? t?.label.toLowerCase() : t?.plural.toLowerCase()}?`}
        description="This cannot be undone."
        pending={remove.pending}
        onConfirm={() => {
          void remove.run(APP_ID, type, ids).then((out) => {
            if (out !== null) {
              setConfirm(false);
              setSelected(new Set());
            }
          });
        }}
      />
    </WorkspaceFrame>
  );
}

// Picks the contact a record links to, searching the workspace as you type. Workflow test runs use it too.
export function ContactPicker({ ws, value, onChange }: { ws: Workspace; value: string | null; onChange: (id: string | null) => void }): React.ReactElement {
  const [text, setText] = React.useState("");
  const search = useDebounced(text.trim(), 200);
  const found = useWsQuery(ws.id, "queryContacts", [{ search: search || undefined, limit: 20 }], { tags: ["contacts"] });
  const current = useWsQuery(ws.id, "getContact", [value ?? ""], { tags: ["contacts"], enabled: !!value });
  const items = React.useMemo(() => {
    const list = found.data?.items ?? [];
    const cur = current.data?.contact;
    return cur && !list.some((c) => c.id === cur.id) ? [cur, ...list] : list;
  }, [found.data, current.data]);
  const selected = items.find((c) => c.id === value) ?? null;
  return (
    <Combobox<ContactFull | null>
      items={items}
      value={selected}
      onValueChange={(c) => onChange(c?.id ?? null)}
      inputValue={text}
      onInputValueChange={setText}
      itemToStringLabel={(c) => (c ? c.name || c.email : "")}
      filter={null}
    >
      <ComboboxInput placeholder={value && !selected ? value : "Search contacts…"} showClear={!!value} size="sm" />
      <ComboboxPopup>
        <ComboboxEmpty>{found.loading ? "Searching…" : "No contacts match"}</ComboboxEmpty>
        <ComboboxList>
          {(c: ContactFull) => (
            <ComboboxItem key={c.id} value={c}>
              <span className="flex min-w-0 flex-col">
                <span className="truncate">{c.name ?? c.email}</span>
                {c.name && <span className="truncate text-xs text-muted-foreground">{c.email}</span>}
              </span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxPopup>
    </Combobox>
  );
}

export function ObjectDetailPage({ ws, type, id, onOpenNav }: { ws: Workspace; type: string; id: string; onOpenNav: () => void }): React.ReactElement {
  const { go } = useWorkspacePage();
  const { types, t } = useType(ws, type);
  const isNew = id === "new";
  const q = useWsQuery(ws.id, "getObject", [type, id], { tags: ["objects", `objects:${type}`], enabled: !isNew });
  const [doc, setDoc] = React.useState<Record<string, unknown>>({});
  const [contactId, setContactId] = React.useState<string | null>(null);
  const [loadedRev, setLoadedRev] = React.useState<number | null>(null);
  const [confirm, setConfirm] = React.useState(false);
  const save = useWsMutation(ws.id, "saveObject", { invalidates: ["objects", "contacts"], title: "Record did not save" });
  const remove = useWsMutation(ws.id, "removeObjects", { invalidates: ["objects", "contacts"], title: "Record was not deleted" });
  // the draft follows the loaded record until the user edits it; a save reloads it
  React.useEffect(() => {
    if (isNew) { setDoc({}); setContactId(null); setLoadedRev(null); return; }
    const r = q.data;
    if (r && r.rev !== loadedRev) { setDoc({ ...r.doc }); setContactId(r.contact_id); setLoadedRev(r.rev); }
  }, [q.data, isNew, loadedRev]);
  const base = isNew ? { doc: {}, contact_id: null } : q.data;
  const dirty = !!base && (JSON.stringify(doc) !== JSON.stringify(base.doc) || contactId !== base.contact_id);
  const title = t ? (isNew ? `New ${t.label.toLowerCase()}` : String(q.data?.doc[t.title_field] ?? id)) : id;

  const onSave = async () => {
    const clean = { ...doc };
    for (const k of Object.keys(clean)) if (clean[k] === undefined) delete clean[k];
    const out = await save.run(APP_ID, type, { id: isNew ? undefined : id, doc: clean, contactId, rev: isNew ? undefined : (q.data?.rev ?? undefined) });
    if (out) {
      toastManager.add({ title: "Saved", type: "success", timeout: 1500 });
      if (isNew) go({ kind: "objects", type, id: out.id });
    }
  };

  if (types.data && !t) return <NoType ws={ws} type={type} onOpenNav={onOpenNav} />;
  const body = (r: ObjectRow | null) =>
    t && (
      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card title={t.label} description={isNew ? undefined : `Rev ${r?.rev ?? "—"} · updated ${relative(r?.updated_at)}`}>
          <FieldsForm fields={t.fields} value={doc} onChange={setDoc} />
        </Card>
        <div className="flex flex-col gap-4">
          <Card title="Contact" description="Who this record belongs to.">
            <ContactPicker ws={ws} value={contactId} onChange={setContactId} />
            {contactId && (
              <Button size="xs" variant="ghost" className="mt-2" onClick={() => go({ kind: "contacts", id: contactId })}>
                <UserIcon />
                Open contact
              </Button>
            )}
          </Card>
          {r && (
            <Card title="About">
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
                <dt className="text-muted-foreground">Id</dt>
                <dd className="truncate font-mono text-xs">{r.id}</dd>
                <dt className="text-muted-foreground">Created</dt>
                <dd>{absolute(r.created_at)}</dd>
                <dt className="text-muted-foreground">Updated</dt>
                <dd>{absolute(r.updated_at)}</dd>
              </dl>
            </Card>
          )}
        </div>
      </div>
    );

  return (
    <WorkspaceFrame
      icon={<BoxIcon />}
      title={<Crumbs items={[<button key="back" type="button" className="cursor-pointer hover:text-foreground" onClick={() => go({ kind: "objects", type })}>{t?.plural ?? type}</button>, title]} />}
      onOpenNav={onOpenNav}
      width="wide"
      actions={
        <>
          {!isNew && (
            <Button size="xs" variant="ghost" className="text-muted-foreground hover:text-destructive-foreground" disabled={!q.data} onClick={() => setConfirm(true)}>
              <Trash2Icon />
              Delete
            </Button>
          )}
          <Button size="xs" disabled={!dirty || !t} loading={save.pending} onClick={() => void onSave()}>
            {isNew ? "Create" : "Save"}
          </Button>
        </>
      }
    >
      {isNew ? (
        body(null)
      ) : (
        <QueryState
          q={q}
          emptyWhen={(r) => r === null}
          empty={
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No such {t?.label.toLowerCase() ?? "record"}</EmptyTitle>
                <EmptyDescription>
                  Nothing has the id <span className="font-mono">{id}</span>.
                </EmptyDescription>
              </EmptyHeader>
              <Button variant="outline" onClick={() => go({ kind: "objects", type })}>
                Back to {t?.plural.toLowerCase() ?? "the list"}
              </Button>
            </Empty>
          }
        >
          {(r) => body(r)}
        </QueryState>
      )}
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={`Delete ${title}?`}
        description="This cannot be undone."
        pending={remove.pending}
        onConfirm={() => {
          void remove.run(APP_ID, type, [id]).then((out) => {
            if (out !== null) {
              setConfirm(false);
              go({ kind: "objects", type });
            }
          });
        }}
      />
      <div className="h-6" />
    </WorkspaceFrame>
  );
}

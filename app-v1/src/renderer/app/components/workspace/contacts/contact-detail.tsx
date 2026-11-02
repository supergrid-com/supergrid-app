import type { ContactDetail, EventRow } from "@supergrid/app-kit/rpc";
import { ActivityIcon, BoxIcon, ClipboardListIcon, EyeIcon, Trash2Icon, UserIcon, UsersIcon, XIcon } from "lucide-react";
import * as React from "react";
import { ConfirmDialog } from "~/components/workspace/confirm-dialog";
import { ContactAvatar } from "~/components/workspace/contacts/contacts-page";
import { FieldRow, FieldsForm } from "~/components/workspace/contacts/fields-form";
import { TagsPicker } from "~/components/workspace/contacts/tag-dialog";
import { absolute, formatValue, relative } from "~/components/workspace/contacts/util";
import { Card, Crumbs, WorkspaceFrame } from "~/components/workspace/frame";
import { QueryState } from "~/components/workspace/query-states";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "~/components/ui/empty";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { toastManager } from "~/components/ui/toast";
import type { Workspace } from "~/lib/mock";
import { useWorkspacePage } from "~/lib/workspace-page";
import { APP_ID } from "~/lib/ws-api";
import { setData, useWsMutation, useWsQuery } from "~/lib/ws-query";
import { cn } from "~/lib/utils";

// One contact: who they are and what we store about them on the left, what they did and what
// hangs off them on the right. Edits sit in a draft until Save; tags save as you go.

type Draft = { name: string; email: string; source: string; props: Record<string, unknown> };

const draftOf = (d: ContactDetail): Draft => ({ name: d.contact.name ?? "", email: d.contact.email, source: d.contact.source ?? "", props: { ...d.contact.props } });

const sameDraft = (a: Draft, b: Draft): boolean => a.name === b.name && a.email === b.email && a.source === b.source && JSON.stringify(a.props) === JSON.stringify(b.props);

function eventIcon(name: string): React.ReactElement {
  if (name.startsWith("page.") || name.startsWith("session.")) return <EyeIcon className="size-3.5" />;
  if (name.startsWith("contact.")) return <UserIcon className="size-3.5" />;
  if (name.startsWith("object.")) return <BoxIcon className="size-3.5" />;
  if (name.startsWith("forms.")) return <ClipboardListIcon className="size-3.5" />;
  return <ActivityIcon className="size-3.5" />;
}

function TimelineItem({ e }: { e: EventRow }): React.ReactElement {
  const detail = e.path ?? (e.name === "contact.tagged" || e.name === "contact.untagged" ? String(e.props.tag ?? "") : "");
  const hasProps = Object.keys(e.props).length > 0;
  return (
    <li>
      <details className="group">
        <summary className={cn("flex list-none items-center gap-3 px-4 py-2 text-[13px] [&::-webkit-details-marker]:hidden", hasProps ? "cursor-pointer hover:bg-accent/40" : "cursor-default")}>
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">{eventIcon(e.name)}</span>
          <span className="min-w-0 flex-1 truncate">
            <span className="font-mono text-xs">{e.name}</span>
            {detail && <span className="ms-2 text-xs text-muted-foreground">{detail}</span>}
          </span>
          {e.app_id && e.app_id !== "core" && (
            <Badge variant="outline" size="sm">
              {e.app_id}
            </Badge>
          )}
          <span className="shrink-0 text-xs text-muted-foreground" title={absolute(e.ts)}>
            {relative(e.ts)}
          </span>
        </summary>
        {hasProps && <pre className="mx-4 mb-2 overflow-x-auto rounded-md bg-muted/60 p-2.5 font-mono text-[11px] leading-relaxed">{JSON.stringify(e.props, null, 2)}</pre>}
      </details>
    </li>
  );
}

// The chips plus a picker; every change goes straight to the workspace, with the cache
// updated first so the chip appears at once.
function TagsEditor({ ws, id, tags }: { ws: Workspace; id: string; tags: string[] }): React.ReactElement {
  const apply = useWsMutation(ws.id, "tagContacts", {
    invalidates: ["contacts"],
    title: "Tags did not save",
    optimistic: (_app, _ids, add = [], remove = []) => {
      const before = tags;
      const next = [...new Set([...tags.filter((t) => !remove.includes(t)), ...add])];
      setData(ws.id, "getContact", [id], (d) => (d ? { ...d, contact: { ...d.contact, tags: next } } : d));
      return () => setData(ws.id, "getContact", [id], (d) => (d ? { ...d, contact: { ...d.contact, tags: before } } : d));
    },
  });
  const onChange = (next: string[]) => {
    const add = next.filter((t) => !tags.includes(t));
    const remove = tags.filter((t) => !next.includes(t));
    if (add.length || remove.length) void apply.run(APP_ID, [id], add.length ? add : undefined, remove.length ? remove : undefined);
  };
  return <TagsPicker ws={ws} value={tags} onChange={onChange} placeholder="Add a tag…" />;
}

export function ContactDetailPage({ ws, id, onOpenNav }: { ws: Workspace; id: string; onOpenNav: () => void }): React.ReactElement {
  const { go } = useWorkspacePage();
  const q = useWsQuery(ws.id, "getContact", [id], { tags: ["contacts", `contact:${id}`] });
  const fields = useWsQuery(ws.id, "listContactFields", [], { tags: ["fields"] });
  const types = useWsQuery(ws.id, "listObjectTypes", [], { tags: ["objects"] });
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [confirm, setConfirm] = React.useState(false);
  const save = useWsMutation(ws.id, "saveContact", { invalidates: ["contacts"], title: "Contact did not save" });
  const del = useWsMutation(ws.id, "deleteContacts", { invalidates: ["contacts"], title: "Contact was not deleted" });
  const data = q.data ?? undefined;
  const base = data ? draftOf(data) : null;
  const dirty = !!draft && !!base && !sameDraft(draft, base);
  // the draft starts from the loaded record; a fresh copy replaces it unless there are unsaved edits
  const dirtyRef = React.useRef(false);
  dirtyRef.current = dirty;
  React.useEffect(() => {
    if (!data) return;
    setDraft((d) => (d && dirtyRef.current ? d : draftOf(data)));
  }, [data]);
  const edit = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const registry = fields.data ?? [];
  const title = data?.contact.name || data?.contact.email || "Contact";

  const onSave = async () => {
    if (!draft) return;
    const props = { ...draft.props };
    for (const k of Object.keys(props)) if (props[k] === undefined) delete props[k];
    const out = await save.run(APP_ID, { id, email: draft.email.trim(), name: draft.name.trim() || null, source: draft.source.trim() || null, props });
    if (out) toastManager.add({ title: "Saved", type: "success", timeout: 1500 });
  };

  return (
    <WorkspaceFrame
      icon={<UsersIcon />}
      title={<Crumbs items={[<button key="back" type="button" className="cursor-pointer hover:text-foreground" onClick={() => go({ kind: "contacts" })}>Contacts</button>, title]} />}
      onOpenNav={onOpenNav}
      width="wide"
      actions={
        <>
          <Button size="xs" variant="ghost" className="text-muted-foreground hover:text-destructive-foreground" disabled={!data} onClick={() => setConfirm(true)}>
            <Trash2Icon />
            Delete
          </Button>
          <Button size="xs" disabled={!dirty} loading={save.pending} onClick={() => void onSave()}>
            Save
          </Button>
        </>
      }
    >
      <QueryState
        q={q}
        emptyWhen={(d) => d === null}
        empty={
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No such contact</EmptyTitle>
              <EmptyDescription>
                Nothing in {ws.name} has the id <span className="font-mono">{id}</span>.
              </EmptyDescription>
            </EmptyHeader>
            <Button variant="outline" onClick={() => go({ kind: "contacts" })}>
              Back to contacts
            </Button>
          </Empty>
        }
      >
        {(d) =>
          d &&
          draft && (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
              <div className="flex min-w-0 flex-col gap-4">
                <Card>
                  <div className="flex items-center gap-3">
                    <ContactAvatar name={d.contact.name} email={d.contact.email} className="flex size-11 shrink-0 items-center justify-center rounded-full bg-active/12 font-heading text-lg font-bold text-active" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-heading text-lg font-bold leading-tight">{d.contact.name ?? d.contact.email}</div>
                      <div className="truncate text-[13px] text-muted-foreground">{d.contact.email}</div>
                    </div>
                    {d.contact.source && (
                      <Badge variant="outline" size="sm">
                        {d.contact.source}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span title={absolute(d.contact.created_at)}>Created {relative(d.contact.created_at)}</span>
                    <span title={absolute(d.contact.updated_at)}>Updated {relative(d.contact.updated_at)}</span>
                    <span className="font-mono">{d.contact.id}</span>
                  </div>
                </Card>

                <Card title="Details">
                  <div className="flex flex-col gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FieldRow label="Name">
                        <Input size="sm" value={draft.name} onChange={(e) => edit({ name: e.target.value })} />
                      </FieldRow>
                      <FieldRow label="Email">
                        <Input size="sm" type="email" value={draft.email} onChange={(e) => edit({ email: e.target.value })} />
                      </FieldRow>
                      <FieldRow label="Source">
                        <Input size="sm" value={draft.source} onChange={(e) => edit({ source: e.target.value })} />
                      </FieldRow>
                    </div>
                    {registry.length > 0 && <FieldsForm fields={registry} value={draft.props} onChange={(props) => edit({ props })} />}
                    {Object.keys(draft.props).filter((k) => k !== "notes" && !registry.some((f) => f.key === k)).length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[13px] font-medium">Other props</span>
                        <ul className="divide-y rounded-lg border text-[13px]">
                          {Object.entries(draft.props)
                            .filter(([k]) => k !== "notes" && !registry.some((f) => f.key === k))
                            .map(([k, v]) => (
                              <li key={k} className="flex items-center gap-3 px-3 py-1.5">
                                <span className="font-mono text-xs text-muted-foreground">{k}</span>
                                <span className="min-w-0 flex-1 truncate">{formatValue(undefined, v)}</span>
                                <button type="button" aria-label={`Remove ${k}`} className="text-muted-foreground hover:text-foreground" onClick={() => { const { [k]: _, ...rest } = draft.props; edit({ props: rest }); }}>
                                  <XIcon className="size-3.5" />
                                </button>
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </Card>

                <Card title="Tags">
                  <TagsEditor ws={ws} id={d.contact.id} tags={d.contact.tags} />
                </Card>

                <Card title="Notes" description="Kept on the contact as the notes prop.">
                  <Textarea size="sm" value={String(draft.props.notes ?? "")} onChange={(e) => edit({ props: { ...draft.props, notes: e.target.value || undefined } })} placeholder="Anything worth remembering." />
                </Card>
              </div>

              <div className="flex min-w-0 flex-col gap-4">
                <Card title="Activity" description={d.timeline.length ? `The last ${d.timeline.length} events.` : undefined} padded={false}>
                  {d.timeline.length === 0 ? <div className="px-4 pb-6 pt-2 text-center text-[13px] text-muted-foreground">Nothing recorded yet.</div> : <ul className="divide-y border-t">{d.timeline.map((e) => <TimelineItem key={e.id} e={e} />)}</ul>}
                </Card>
                <Card title="Related" padded={false}>
                  {Object.keys(d.objects).length === 0 ? (
                    <div className="px-4 pb-6 pt-2 text-center text-[13px] text-muted-foreground">No objects link to this contact.</div>
                  ) : (
                    <div className="border-t">
                      {Object.entries(d.objects).map(([type, rows]) => {
                        const t = types.data?.find((x) => x.id === type);
                        return (
                          <div key={type}>
                            <div className="px-4 pt-3 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t?.plural ?? type}</div>
                            <ul className="divide-y">
                              {rows.map((r) => (
                                <li key={r.id}>
                                  <button type="button" onClick={() => go({ kind: "objects", type, id: r.id })} className="flex w-full cursor-pointer items-center gap-3 px-4 py-2 text-left text-[13px] hover:bg-accent/40">
                                    <BoxIcon className="size-4 text-muted-foreground" />
                                    <span className="min-w-0 flex-1 truncate font-medium">{String(r.doc[t?.title_field ?? "name"] ?? r.id)}</span>
                                    <span className="text-xs text-muted-foreground">{relative(r.updated_at)}</span>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
                <Card title="Segments" padded={false}>
                  {d.segments.length === 0 ? (
                    <div className="px-4 pb-6 pt-2 text-center text-[13px] text-muted-foreground">In no segment.</div>
                  ) : (
                    <ul className="divide-y border-t">
                      {d.segments.map((s) => (
                        <li key={s.id}>
                          <button type="button" onClick={() => go({ kind: "contacts", segment: s.id })} className="flex w-full cursor-pointer items-center gap-3 px-4 py-2 text-left text-[13px] hover:bg-accent/40">
                            <span className="min-w-0 flex-1 truncate font-medium">{s.name}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </div>
            </div>
          )
        }
      </QueryState>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={`Delete ${title}?`}
        description="Their events stay in the stream without a contact; linked objects lose the link. This cannot be undone."
        pending={del.pending}
        onConfirm={() => {
          void del.run(APP_ID, [id]).then((out) => {
            if (out !== null) {
              setConfirm(false);
              go({ kind: "contacts" });
            }
          });
        }}
      />
      <div className="h-6" />
    </WorkspaceFrame>
  );
}

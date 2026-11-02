import type { FieldDef, FieldType } from "@supergrid/app-kit/rpc";
import { PlusIcon, Trash2Icon } from "lucide-react";
import * as React from "react";
import { ConfirmDialog } from "~/components/workspace/confirm-dialog";
import { FieldRow } from "~/components/workspace/contacts/fields-form";
import { IconButton } from "~/components/workspace/frame";
import { QueryState } from "~/components/workspace/query-states";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Sheet, SheetDescription, SheetHeader, SheetPanel, SheetPopup, SheetTitle } from "~/components/ui/sheet";
import { Switch } from "~/components/ui/switch";
import type { Workspace } from "~/lib/mock";
import { APP_ID } from "~/lib/ws-api";
import { useWsMutation, useWsQuery } from "~/lib/ws-query";

// The contact field registry: what custom fields a contact carries. Rows list the fields;
// one editor at a time adds or changes a field.

const types: { value: FieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "bool", label: "Yes / no" },
  { value: "date", label: "Date" },
  { value: "select", label: "Select" },
  { value: "url", label: "URL" },
];

const blank: FieldDef = { key: "", label: "", type: "text" };

function Editor({ initial, existing, onSave, onCancel, pending }: { initial: FieldDef; existing: boolean; onSave: (f: FieldDef) => void; onCancel: () => void; pending: boolean }): React.ReactElement {
  const [f, setF] = React.useState<FieldDef>(initial);
  const [options, setOptions] = React.useState((initial.options ?? []).join(", "));
  const keyOk = /^[a-z][a-z0-9_]*$/.test(f.key);
  const save = () => onSave({ ...f, label: f.label.trim() || f.key, options: f.type === "select" ? options.split(",").map((o) => o.trim()).filter(Boolean) : undefined });
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <FieldRow label="Label">
          <Input size="sm" autoFocus value={f.label} onChange={(e) => setF({ ...f, label: e.target.value, key: existing || f.key !== slug(f.label) ? f.key : slug(e.target.value) })} />
        </FieldRow>
        <FieldRow label="Key" hint={existing ? "Keys cannot change." : "Lowercase, as apps will read it."}>
          <Input size="sm" value={f.key} disabled={existing} className="font-mono" onChange={(e) => setF({ ...f, key: e.target.value })} />
        </FieldRow>
        <FieldRow label="Type">
          <Select items={types} value={f.type} onValueChange={(v) => setF({ ...f, type: v as FieldType })}>
            <SelectTrigger size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              {types.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
        </FieldRow>
        {f.type === "select" && (
          <FieldRow label="Options" hint="Comma separated.">
            <Input size="sm" value={options} onChange={(e) => setOptions(e.target.value)} placeholder="free, pro, team" />
          </FieldRow>
        )}
      </div>
      <div className="flex items-center gap-4 text-[13px]">
        <label className="flex items-center gap-2">
          <Switch checked={!!f.required} onCheckedChange={(v) => setF({ ...f, required: v })} />
          Required
        </label>
        <label className="flex items-center gap-2">
          <Switch checked={!!f.indexed} onCheckedChange={(v) => setF({ ...f, indexed: v })} />
          Indexed
        </label>
        <span className="flex-1" />
        <Button size="xs" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="xs" disabled={!keyOk} loading={pending} onClick={save}>
          {existing ? "Save" : "Add field"}
        </Button>
      </div>
    </div>
  );
}

const slug = (s: string): string => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").replace(/^[0-9]/, "f$&");

export function FieldsSheet({ ws, open, onOpenChange }: { ws: Workspace; open: boolean; onOpenChange: (open: boolean) => void }): React.ReactElement {
  const q = useWsQuery(ws.id, "listContactFields", [], { tags: ["fields"], enabled: open });
  const save = useWsMutation(ws.id, "saveContactField", { invalidates: ["fields", "contacts"], title: "Field did not save" });
  const remove = useWsMutation(ws.id, "removeContactField", { invalidates: ["fields", "contacts"], title: "Field did not go" });
  // null: nothing open; "": adding; a key: editing that one
  const [editing, setEditing] = React.useState<string | null>(null);
  const [removing, setRemoving] = React.useState<FieldDef | null>(null);
  const onSave = async (f: FieldDef) => {
    const out = await save.run(APP_ID, f);
    if (out) setEditing(null);
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetPopup className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Contact fields</SheetTitle>
          <SheetDescription>Custom fields every contact can carry. Apps read and write them by key.</SheetDescription>
        </SheetHeader>
        <SheetPanel>
          <QueryState q={q}>
            {(fields) => (
              <div className="flex flex-col gap-3">
                <ul className="divide-y rounded-lg border">
                  {fields.length === 0 && editing !== "" && <li className="px-3 py-6 text-center text-[13px] text-muted-foreground">No custom fields yet.</li>}
                  {fields.map((f) => (
                    <li key={f.key} className="flex flex-col">
                      {editing === f.key ? (
                        <div className="p-2">
                          <Editor initial={f} existing onSave={onSave} onCancel={() => setEditing(null)} pending={save.pending} />
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 px-3 py-2 text-[13px]">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{f.label}</span>
                              <Badge variant="outline" size="sm">
                                {types.find((t) => t.value === f.type)?.label ?? f.type}
                              </Badge>
                              {f.required && <Badge variant="warning" size="sm">required</Badge>}
                              {f.indexed && <Badge variant="info" size="sm">indexed</Badge>}
                              {f.app_id && <Badge variant="secondary" size="sm">{f.app_id}</Badge>}
                            </div>
                            <div className="font-mono text-xs text-muted-foreground">
                              {f.key}
                              {f.options?.length ? ` · ${f.options.join(", ")}` : ""}
                            </div>
                          </div>
                          <Button size="xs" variant="ghost" onClick={() => setEditing(f.key)}>
                            Edit
                          </Button>
                          <IconButton label="Remove field" onClick={() => setRemoving(f)}>
                            <Trash2Icon />
                          </IconButton>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
                {editing === "" ? (
                  <Editor initial={blank} existing={false} onSave={onSave} onCancel={() => setEditing(null)} pending={save.pending} />
                ) : (
                  <div>
                    <Button size="xs" variant="outline" onClick={() => setEditing("")}>
                      <PlusIcon />
                      Add field
                    </Button>
                  </div>
                )}
              </div>
            )}
          </QueryState>
        </SheetPanel>
      </SheetPopup>
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={`Remove ${removing?.label ?? "field"}?`}
        description="The field leaves the registry. Values already stored on contacts stay in their props."
        action="Remove"
        pending={remove.pending}
        onConfirm={() => {
          if (!removing) return;
          void remove.run(removing.key).then((out) => out !== null && setRemoving(null));
        }}
      />
    </Sheet>
  );
}

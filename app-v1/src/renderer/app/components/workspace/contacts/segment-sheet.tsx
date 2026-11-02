import type { Segment } from "@supergrid/app-kit/rpc";
import * as React from "react";
import { FieldRow } from "~/components/workspace/contacts/fields-form";
import { FilterBuilder } from "~/components/workspace/contacts/filter-bar";
import { type ContactFilter, emptyFilter } from "~/components/workspace/contacts/util";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { SegmentedControl, SegmentedControlItem } from "~/components/ui/segmented-control";
import { Sheet, SheetClose, SheetDescription, SheetFooter, SheetHeader, SheetPanel, SheetPopup, SheetTitle } from "~/components/ui/sheet";
import type { Workspace } from "~/lib/mock";
import { useWsMutation, useWsQuery } from "~/lib/ws-query";

// Saving a segment: a name, dynamic (a filter, evaluated when read) or static (a list you add
// to), and for a dynamic one the filter with a live count under it.

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function SegmentSheet({ ws, open, onOpenChange, segment, initialFilter, onSaved }: { ws: Workspace; open: boolean; onOpenChange: (open: boolean) => void; segment?: Segment; initialFilter?: ContactFilter; onSaved?: (s: Segment) => void }): React.ReactElement {
  const [name, setName] = React.useState("");
  const [kind, setKind] = React.useState<"dynamic" | "static">("dynamic");
  const [filter, setFilter] = React.useState<ContactFilter>(emptyFilter);
  React.useEffect(() => {
    if (!open) return;
    setName(segment?.name ?? "");
    setKind(segment?.kind ?? "dynamic");
    setFilter(segment ? { tags: segment.filter.tags, anyTags: segment.filter.anyTags, source: segment.filter.source, createdFrom: segment.filter.createdFrom, createdTo: segment.filter.createdTo, props: segment.filter.props } : (initialFilter ?? emptyFilter));
  }, [open, segment, initialFilter]);
  const fields = useWsQuery(ws.id, "listContactFields", [], { tags: ["fields"], enabled: open });
  const debounced = useDebounced(filter, 400);
  const count = useWsQuery(ws.id, "queryContacts", [{ ...debounced, limit: 1 }], { tags: ["contacts"], enabled: open && kind === "dynamic" });
  const save = useWsMutation(ws.id, "saveSegment", { invalidates: ["segments", "contacts"], title: "Segment did not save" });
  const submit = async () => {
    const out = await save.run({ id: segment?.id, name: name.trim(), kind, filter: kind === "dynamic" ? filter : {} });
    if (out) {
      onOpenChange(false);
      onSaved?.(out);
    }
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetPopup className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{segment ? "Edit segment" : "New segment"}</SheetTitle>
          <SheetDescription>{kind === "dynamic" ? "A dynamic segment is a saved filter: whoever matches is in it." : "A static segment is a list you add contacts to by hand."}</SheetDescription>
        </SheetHeader>
        <SheetPanel>
          <div className="flex flex-col gap-5">
            <FieldRow label="Name">
              <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Customers on pro" />
            </FieldRow>
            <FieldRow label="Kind">
              <SegmentedControl size="sm" role="radiogroup">
                {(["dynamic", "static"] as const).map((k) => (
                  <SegmentedControlItem key={k} role="radio" aria-checked={kind === k} data-checked={kind === k ? "" : undefined} onClick={() => setKind(k)}>
                    {k === "dynamic" ? "Dynamic" : "Static"}
                  </SegmentedControlItem>
                ))}
              </SegmentedControl>
            </FieldRow>
            {kind === "dynamic" && (
              <div className="flex flex-col gap-2">
                <span className="text-[13px] font-medium">Filter</span>
                <div className="rounded-lg border p-2">
                  <FilterBuilder ws={ws} value={filter} onChange={setFilter} fields={fields.data ?? []} />
                </div>
                <div className="text-xs text-muted-foreground">{count.error ? count.error : count.data ? `${count.data.total.toLocaleString()} contact${count.data.total === 1 ? "" : "s"} match right now` : "Counting…"}</div>
              </div>
            )}
          </div>
        </SheetPanel>
        <SheetFooter>
          <SheetClose render={<Button variant="ghost" />}>Cancel</SheetClose>
          <Button disabled={!name.trim()} loading={save.pending} onClick={() => void submit()}>
            {segment ? "Save" : "Create segment"}
          </Button>
        </SheetFooter>
      </SheetPopup>
    </Sheet>
  );
}

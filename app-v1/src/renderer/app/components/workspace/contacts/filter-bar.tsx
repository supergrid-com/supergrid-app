import type { FieldDef, FilterOp, When } from "@supergrid/app-kit/rpc";
import { BookmarkPlusIcon, ListFilterIcon, SearchIcon, XIcon } from "lucide-react";
import * as React from "react";
import { FieldInput, FieldRow } from "~/components/workspace/contacts/fields-form";
import { TagsPicker } from "~/components/workspace/contacts/tag-dialog";
import { type ContactFilter, filterIsEmpty, formatValue, opLabel, opsFor, propKey, relative } from "~/components/workspace/contacts/util";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "~/components/ui/input-group";
import { Menu, MenuGroup, MenuGroupLabel, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "~/components/ui/menu";
import { Popover, PopoverPopup, PopoverTrigger } from "~/components/ui/popover";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "~/components/ui/select";
import type { Workspace } from "~/lib/mock";
import { useWsQuery } from "~/lib/ws-query";
import { cn } from "~/lib/utils";

// Filtering contacts: a row of chips, one per condition, each opening a small editor. "Add
// filter" offers tags, source, the created date and every registry field. The same builder
// sits in the segment sheet, which is how a filter becomes a segment.

// A chip: click the label to edit, the x to drop it.
function Chip({ label, open, onOpenChange, onRemove, children }: { label: React.ReactNode; open: boolean; onOpenChange: (open: boolean) => void; onRemove: () => void; children: React.ReactNode }): React.ReactElement {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <span className="inline-flex h-7 max-w-full items-center overflow-hidden rounded-md border bg-muted/40 text-xs">
        <PopoverTrigger render={<button type="button" className="flex h-full min-w-0 cursor-pointer items-center gap-1 ps-2 pe-1.5 hover:bg-accent/60" />}>
          <span className="truncate">{label}</span>
        </PopoverTrigger>
        <button type="button" aria-label="Remove filter" onClick={onRemove} className="flex h-full shrink-0 cursor-pointer items-center pe-1.5 ps-0.5 text-muted-foreground hover:text-foreground">
          <XIcon className="size-3" />
        </button>
      </span>
      <PopoverPopup align="start" className="w-80">
        {children}
      </PopoverPopup>
    </Popover>
  );
}

function PropEditor({ field, when, onChange }: { field: FieldDef; when: When; onChange: (w: When) => void }): React.ReactElement {
  const ops = opsFor(field.type);
  const needsValue = when.op !== "exists";
  return (
    <div className="flex flex-col gap-3">
      <div className="text-[13px] font-medium">{field.label}</div>
      <Select items={ops.map((o) => ({ value: o.op, label: o.label }))} value={when.op} onValueChange={(v) => onChange({ ...when, op: v as FilterOp, value: v === "exists" ? true : when.value })}>
        <SelectTrigger size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectPopup>
          {ops.map((o) => (
            <SelectItem key={o.op} value={o.op}>
              {o.label}
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>
      {needsValue && <FieldInput field={field.type === "bool" ? { ...field, type: "select", options: ["true", "false"] } : field} value={field.type === "bool" ? (when.value === undefined ? "" : String(when.value)) : when.value} onChange={(v) => onChange({ ...when, value: field.type === "bool" ? v === "true" : v })} />}
    </div>
  );
}

/** The sources seen on recent contacts, for the Source filter. */
function useSources(ws: Workspace, enabled: boolean): string[] {
  const sample = useWsQuery(ws.id, "queryContacts", [{ limit: 200, sort: "created_at", dir: "desc" }], { tags: ["contacts"], enabled });
  return React.useMemo(() => [...new Set((sample.data?.items ?? []).map((c) => c.source).filter((s): s is string => !!s))].sort(), [sample.data]);
}

export function FilterBuilder({ ws, value, onChange, fields, className }: { ws: Workspace; value: ContactFilter; onChange: (next: ContactFilter) => void; fields: FieldDef[]; className?: string }): React.ReactElement {
  const [openKey, setOpenKey] = React.useState<string | null>(null);
  const sources = useSources(ws, true);
  const byKey = React.useMemo(() => new Map(fields.map((f) => [f.key, f])), [fields]);
  const set = (patch: Partial<ContactFilter>) => onChange({ ...value, ...patch });
  const props = value.props ?? [];
  const setProp = (i: number, w: When) => set({ props: props.map((p, j) => (j === i ? w : p)) });
  const dropProp = (i: number) => set({ props: props.filter((_, j) => j !== i).length ? props.filter((_, j) => j !== i) : undefined });
  const addProp = (f: FieldDef) => {
    set({ props: [...props, { field: `props.${f.key}`, op: opsFor(f.type)[0].op, value: f.type === "bool" ? true : undefined }] });
    setOpenKey(`prop:${props.length}`);
  };
  const openFor = (key: string) => (o: boolean) => setOpenKey(o ? key : openKey === key ? null : openKey);
  const dateLabel = value.createdFrom && value.createdTo ? `${value.createdFrom} – ${value.createdTo}` : value.createdFrom ? `after ${value.createdFrom}` : value.createdTo ? `before ${value.createdTo}` : "any time";
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {value.tags !== undefined && (
        <Chip label={<>Tags: {value.tags.length ? value.tags.join(", ") : "any"}</>} open={openKey === "tags"} onOpenChange={openFor("tags")} onRemove={() => set({ tags: undefined })}>
          <div className="flex flex-col gap-2">
            <div className="text-[13px] font-medium">Carrying every tag</div>
            <TagsPicker ws={ws} value={value.tags} onChange={(tags) => set({ tags })} allowNew={false} autoFocus />
          </div>
        </Chip>
      )}
      {value.anyTags !== undefined && (
        <Chip label={<>Any of: {value.anyTags.length ? value.anyTags.join(", ") : "any"}</>} open={openKey === "anyTags"} onOpenChange={openFor("anyTags")} onRemove={() => set({ anyTags: undefined })}>
          <div className="flex flex-col gap-2">
            <div className="text-[13px] font-medium">Carrying any of these tags</div>
            <TagsPicker ws={ws} value={value.anyTags} onChange={(anyTags) => set({ anyTags })} allowNew={false} autoFocus />
          </div>
        </Chip>
      )}
      {value.source !== undefined && (
        <Chip label={<>Source: {value.source || "any"}</>} open={openKey === "source"} onOpenChange={openFor("source")} onRemove={() => set({ source: undefined })}>
          <FieldRow label="Source">
            <Select items={sources.map((s) => ({ value: s, label: s }))} value={value.source} onValueChange={(v) => set({ source: v ?? "" })}>
              <SelectTrigger size="sm">
                <SelectValue placeholder="Pick a source" />
              </SelectTrigger>
              <SelectPopup>
                {sources.length === 0 && <div className="px-2 py-1.5 text-xs text-muted-foreground">No sources yet</div>}
                {sources.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectPopup>
            </Select>
          </FieldRow>
        </Chip>
      )}
      {(value.createdFrom !== undefined || value.createdTo !== undefined) && (
        <Chip label={<>Created: {dateLabel}</>} open={openKey === "created"} onOpenChange={openFor("created")} onRemove={() => set({ createdFrom: undefined, createdTo: undefined })}>
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="From">
              <Input type="date" size="sm" value={value.createdFrom?.slice(0, 10) ?? ""} onChange={(e) => set({ createdFrom: e.target.value || "" })} />
            </FieldRow>
            <FieldRow label="To">
              <Input type="date" size="sm" value={value.createdTo?.slice(0, 10) ?? ""} onChange={(e) => set({ createdTo: e.target.value || "" })} />
            </FieldRow>
          </div>
        </Chip>
      )}
      {props.map((w, i) => {
        const f = byKey.get(propKey(w.field)) ?? { key: propKey(w.field), label: propKey(w.field), type: "text" as const };
        const label = `${f.label} ${opLabel(f.type, w.op)}${w.op === "exists" ? "" : ` ${formatValue(f, w.value)}`}`;
        return (
          <Chip key={`${w.field}:${i}`} label={label} open={openKey === `prop:${i}`} onOpenChange={openFor(`prop:${i}`)} onRemove={() => dropProp(i)}>
            <PropEditor field={f} when={w} onChange={(next) => setProp(i, next)} />
          </Chip>
        );
      })}
      <Menu>
        <MenuTrigger render={<Button size="xs" variant="ghost" className="text-muted-foreground" />}>
          <ListFilterIcon />
          Add filter
        </MenuTrigger>
        <MenuPopup align="start" className="w-52">
          <MenuItem disabled={value.tags !== undefined} onClick={() => { set({ tags: [] }); setOpenKey("tags"); }}>
            Tags (all of)
          </MenuItem>
          <MenuItem disabled={value.anyTags !== undefined} onClick={() => { set({ anyTags: [] }); setOpenKey("anyTags"); }}>
            Tags (any of)
          </MenuItem>
          <MenuItem disabled={value.source !== undefined} onClick={() => { set({ source: "" }); setOpenKey("source"); }}>
            Source
          </MenuItem>
          <MenuItem disabled={value.createdFrom !== undefined || value.createdTo !== undefined} onClick={() => { set({ createdFrom: "", createdTo: "" }); setOpenKey("created"); }}>
            Created
          </MenuItem>
          {fields.length > 0 && (
            <>
              <MenuSeparator />
              <MenuGroup>
                <MenuGroupLabel>Fields</MenuGroupLabel>
                {fields.map((f) => (
                  <MenuItem key={f.key} onClick={() => addProp(f)}>
                    {f.label}
                  </MenuItem>
                ))}
              </MenuGroup>
            </>
          )}
        </MenuPopup>
      </Menu>
    </div>
  );
}

/** The strip above the contacts table: search, the filter chips, and a way to keep the filter. */
export function FilterBar({ ws, search, onSearch, filter, onFilter, fields, onSaveSegment }: { ws: Workspace; search: string; onSearch: (q: string) => void; filter: ContactFilter; onFilter: (f: ContactFilter) => void; fields: FieldDef[]; onSaveSegment: () => void }): React.ReactElement {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
      <InputGroup className="w-64 max-w-full">
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput type="search" size="sm" placeholder="Search name or email" value={search} onChange={(e) => onSearch(e.target.value)} />
      </InputGroup>
      <FilterBuilder ws={ws} value={filter} onChange={onFilter} fields={fields} className="min-w-0 flex-1" />
      {!filterIsEmpty(filter) && (
        <Button size="xs" variant="outline" onClick={onSaveSegment}>
          <BookmarkPlusIcon />
          Save as segment
        </Button>
      )}
    </div>
  );
}

/** A line that says what a stored filter does, for the segments list. */
export function describeFilter(f: ContactFilter, fields: FieldDef[]): string {
  const parts: string[] = [];
  if (f.tags?.length) parts.push(`tags ${f.tags.join(" + ")}`);
  if (f.anyTags?.length) parts.push(`any of ${f.anyTags.join(", ")}`);
  if (f.source) parts.push(`source ${f.source}`);
  if (f.createdFrom || f.createdTo) parts.push(`created ${f.createdFrom ? `after ${relative(f.createdFrom)}` : ""}${f.createdFrom && f.createdTo ? ", " : ""}${f.createdTo ? `before ${relative(f.createdTo)}` : ""}`);
  for (const w of f.props ?? []) {
    const field = fields.find((x) => x.key === propKey(w.field));
    parts.push(`${field?.label ?? propKey(w.field)} ${opLabel(field?.type ?? "text", w.op)}${w.op === "exists" ? "" : ` ${formatValue(field, w.value)}`}`);
  }
  return parts.length ? parts.join(" · ") : "everyone";
}

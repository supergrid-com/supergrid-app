import { ListFilterIcon, PlusIcon, XIcon } from "lucide-react";
import * as React from "react";
import { Button } from "~/components/ui/button";
import { Popover, PopoverPopup, PopoverTrigger } from "~/components/ui/popover";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "~/components/ui/select";
import { type DbTable, type Filter, type FilterOp, filterOps } from "~/lib/db";
import { cn } from "~/lib/utils";

// The grid's filter button: a popover listing conditions on the table's columns, all of which a
// row must meet. Each is a column, a comparison and a value; they run on the server as the WHERE.

let n = 0;
const nextId = () => `f${Date.now().toString(36)}${(n++).toString(36)}`;

export function FilterButton({ table, filters, onChange }: { table: DbTable; filters: Filter[]; onChange: (next: Filter[]) => void }): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const add = () => onChange([...filters, { id: nextId(), column: table.columns[0]?.name ?? "", op: "eq", value: "" }]);
  const update = (id: string, patch: Partial<Filter>) => onChange(filters.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  const remove = (id: string) => onChange(filters.filter((f) => f.id !== id));
  const active = filters.filter((f) => f.column && (f.value.trim() !== "" || !filterOps.find((o) => o.op === f.op)?.needsValue)).length;
  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o && !filters.length) add();
      }}
    >
      <PopoverTrigger render={<Button size="xs" variant="ghost" className={cn("text-foreground/80 hover:text-foreground", active > 0 && "bg-(--grid-accent)/10 text-(--grid-accent) hover:bg-(--grid-accent)/15")} />}>
        <ListFilterIcon />
        {active > 0 ? `${active} ${active === 1 ? "filter" : "filters"}` : "Filter"}
      </PopoverTrigger>
      <PopoverPopup align="start" className="w-[30rem] max-w-[calc(100vw-2rem)]">
        <div className="flex flex-col gap-2">
          <div className="text-[13px] font-medium">Show rows where</div>
          {filters.map((f, i) => {
            const op = filterOps.find((o) => o.op === f.op) ?? filterOps[0]!;
            return (
              <div key={f.id} className="flex items-center gap-1.5">
                <span className="w-8 shrink-0 text-xs text-muted-foreground">{i === 0 ? "" : "and"}</span>
                <Select value={f.column} onValueChange={(v) => update(f.id, { column: String(v) })} items={table.columns.map((c) => ({ value: c.name, label: c.name }))}>
                  <SelectTrigger size="sm" className="w-36 min-w-0 shrink">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPopup>
                    {table.columns.map((c) => (
                      <SelectItem key={c.name} value={c.name}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
                <Select value={f.op} onValueChange={(v) => update(f.id, { op: v as FilterOp })} items={filterOps.map((o) => ({ value: o.op, label: o.label }))}>
                  <SelectTrigger size="sm" className="w-32 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPopup>
                    {filterOps.map((o) => (
                      <SelectItem key={o.op} value={o.op}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
                {op.needsValue ? (
                  <input
                    value={f.value}
                    onChange={(e) => update(f.id, { value: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && setOpen(false)}
                    placeholder="value"
                    spellCheck={false}
                    className="h-7 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-[13px] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/24"
                  />
                ) : (
                  <span className="flex-1" />
                )}
                <Button size="icon-xs" variant="ghost" aria-label="Remove Filter" onClick={() => remove(f.id)} className="shrink-0 text-muted-foreground">
                  <XIcon />
                </Button>
              </div>
            );
          })}
          <div className="flex items-center gap-2 pt-1">
            <Button size="xs" variant="ghost" onClick={add} className="text-foreground/80">
              <PlusIcon />
              Add condition
            </Button>
            <span className="flex-1" />
            {filters.length > 0 && (
              <Button size="xs" variant="ghost" onClick={() => onChange([])} className="text-muted-foreground">
                Clear all
              </Button>
            )}
          </div>
        </div>
      </PopoverPopup>
    </Popover>
  );
}

import * as React from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Popover, PopoverPopup, PopoverTrigger } from "~/components/ui/popover";
import { SegmentedControl, SegmentedControlItem } from "~/components/ui/segmented-control";

// The range analytics covers: three presets, or two dates. `from`/`to` are ISO strings the
// queries take as they are.

export type Preset = "7d" | "30d" | "90d" | "custom";
export type DateRange = { preset: Preset; from: string; to: string };

const startOfDay = (d: Date): Date => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

export function rangeFor(preset: Exclude<Preset, "custom">): DateRange {
  const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
  const to = new Date();
  const from = startOfDay(new Date(to.getTime() - (days - 1) * 864e5));
  return { preset, from: from.toISOString(), to: to.toISOString() };
}

/** Whole days in the range, for "per day" hints. */
export const daysIn = (r: DateRange): number => Math.max(1, Math.round((new Date(r.to).getTime() - new Date(r.from).getTime()) / 864e5));

/** Every day from `from` to `to` as YYYY-MM-DD, for zero-filling a series. */
export function daysOf(r: DateRange): string[] {
  const out: string[] = [];
  const end = startOfDay(new Date(r.to)).getTime();
  for (let t = startOfDay(new Date(r.from)).getTime(); t <= end; t += 864e5) out.push(new Date(t).toISOString().slice(0, 10));
  return out;
}

export function DateRangePicker({ value, onChange }: { value: DateRange; onChange: (next: DateRange) => void }): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const [from, setFrom] = React.useState(value.from.slice(0, 10));
  const [to, setTo] = React.useState(value.to.slice(0, 10));
  React.useEffect(() => {
    if (open) {
      setFrom(value.from.slice(0, 10));
      setTo(value.to.slice(0, 10));
    }
  }, [open, value.from, value.to]);
  const apply = () => {
    if (!from || !to || from > to) return;
    onChange({ preset: "custom", from: `${from}T00:00:00.000Z`, to: `${to}T23:59:59.999Z` });
    setOpen(false);
  };
  const label = value.preset === "custom" ? `${from} – ${to}` : "Custom";
  return (
    <SegmentedControl size="sm">
      {(["7d", "30d", "90d"] as const).map((p) => (
        <SegmentedControlItem key={p} data-checked={value.preset === p ? "" : undefined} onClick={() => onChange(rangeFor(p))}>
          {p}
        </SegmentedControlItem>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger render={<SegmentedControlItem data-checked={value.preset === "custom" ? "" : undefined} />}>{value.preset === "custom" ? `${value.from.slice(0, 10)} – ${value.to.slice(0, 10)}` : label}</PopoverTrigger>
        <PopoverPopup align="end" className="w-72">
          <div className="flex flex-col gap-3">
            <div className="text-[13px] font-medium">Custom range</div>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                From
                <Input type="date" size="sm" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                To
                <Input type="date" size="sm" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <Button size="xs" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button size="xs" disabled={!from || !to || from > to} onClick={apply}>
                Apply
              </Button>
            </div>
          </div>
        </PopoverPopup>
      </Popover>
    </SegmentedControl>
  );
}

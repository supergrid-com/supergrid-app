"use client";

import { CalendarIcon } from "lucide-react";
import * as React from "react";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import { InputGroup, InputGroupAddon, InputGroupInput } from "~/components/ui/input-group";
import { Popover, PopoverPopup, PopoverTrigger } from "~/components/ui/popover";
import { cn } from "~/lib/utils";

// A date picker the way coss ui composes one: Calendar inside Popover, here behind an input the
// date can also be typed into. The value is an ISO-8601 string (what D1 rows hold), or null.
// `withTime` adds hours, minutes and seconds under the calendar and keeps them when a day is
// picked.

const dateFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });
const dateTimeFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" });

/** A date from what a row holds: ISO-8601, or SQLite's "YYYY-MM-DD HH:MM:SS" in UTC. Null when it is neither. */
export function parseStored(v: string | null | undefined): Date | null {
  if (!v) return null;
  const d = new Date(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(v) ? `${v.replace(" ", "T")}Z` : v);
  return Number.isNaN(d.getTime()) ? null : d;
}

const two = (n: number) => String(n).padStart(2, "0");

export function DatePicker({
  value,
  onChange,
  withTime = false,
  disabled,
  autoFocus,
  placeholder,
  className,
}: {
  value: string | null;
  onChange: (iso: string | null) => void;
  withTime?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  className?: string;
}): React.ReactElement {
  const date = React.useMemo(() => parseStored(value), [value]);
  const format = withTime ? dateTimeFormat : dateFormat;
  const shown = date ? format.format(date) : (value ?? "");
  // what the input shows while being typed in; it goes back to the formatted date on blur
  const [text, setText] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);

  const commitText = () => {
    if (text === null) return;
    const t = text.trim();
    if (!t) onChange(null);
    else {
      const d = new Date(t);
      if (!Number.isNaN(d.getTime())) onChange(d.toISOString());
    }
    setText(null);
  };

  const pickDay = (day: Date | undefined) => {
    if (!day) return;
    const next = new Date(day);
    if (date && withTime) next.setHours(date.getHours(), date.getMinutes(), date.getSeconds(), 0);
    else next.setHours(withTime ? new Date().getHours() : 0, withTime ? new Date().getMinutes() : 0, 0, 0);
    onChange(next.toISOString());
    if (!withTime) setOpen(false);
  };

  const setTime = (part: "h" | "m" | "s", n: number) => {
    const base = date ?? new Date();
    const next = new Date(base);
    if (part === "h") next.setHours(n);
    else if (part === "m") next.setMinutes(n);
    else next.setSeconds(n);
    onChange(next.toISOString());
  };

  const timeInput = (label: string, part: "h" | "m" | "s", max: number, v: number) => (
    <label className="flex flex-col items-center gap-1 text-[11px] text-muted-foreground">
      <input
        type="number"
        min={0}
        max={max}
        value={two(v)}
        aria-label={label}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n) && n >= 0 && n <= max) setTime(part, n);
        }}
        className="h-8 w-12 rounded-lg border border-input bg-background text-center font-mono text-sm tabular-nums outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/24"
      />
      {label}
    </label>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <InputGroup className={className}>
        <InputGroupInput
          value={text ?? shown}
          placeholder={placeholder ?? (withTime ? "Pick a date and time" : "Pick a date")}
          disabled={disabled}
          autoFocus={autoFocus}
          spellCheck={false}
          onChange={(e) => setText(e.target.value)}
          onBlur={commitText}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitText();
            } else if (e.key === "Escape" && text !== null) {
              e.preventDefault();
              setText(null);
            } else if (e.key === "ArrowDown" && !open) {
              e.preventDefault();
              setOpen(true);
            }
          }}
        />
        <InputGroupAddon align="inline-end">
          <PopoverTrigger render={<Button size="icon-xs" variant="ghost" aria-label="Open calendar" disabled={disabled} className="text-muted-foreground hover:text-foreground" />}>
            <CalendarIcon />
          </PopoverTrigger>
        </InputGroupAddon>
      </InputGroup>
      <PopoverPopup align="end" className="w-auto">
        <Calendar mode="single" selected={date ?? undefined} defaultMonth={date ?? undefined} onSelect={pickDay} />
        {withTime && (
          <div className="mt-1 flex items-end justify-center gap-2 border-t pt-3 pb-1">
            {timeInput("Hours", "h", 23, date?.getHours() ?? 0)}
            <span className="pb-5 text-muted-foreground">:</span>
            {timeInput("Minutes", "m", 59, date?.getMinutes() ?? 0)}
            <span className="pb-5 text-muted-foreground">:</span>
            {timeInput("Seconds", "s", 59, date?.getSeconds() ?? 0)}
            <Button size="xs" variant="ghost" onClick={() => onChange(new Date().toISOString())} className={cn("mb-5 ms-2 text-muted-foreground")}>
              Now
            </Button>
          </div>
        )}
      </PopoverPopup>
    </Popover>
  );
}

import { AtSignIcon, BracesIcon, BuildingIcon, CalendarIcon, CheckIcon, CircleDotIcon, ClockIcon, DollarSignIcon, HashIcon, KeyRoundIcon, LinkIcon, type LucideIcon, PhoneIcon, StarIcon, TagsIcon, TextIcon, UserIcon } from "lucide-react";
import type * as React from "react";
import { cn } from "~/lib/utils";
import type { Field, FieldType, OptionColor } from "./types";

// How each field type draws in a cell, reads as text (for search, copy and the footer's
// calculations) and what its header icon is. Rows are dense, like Attio's: one line, truncated.

export const typeIcons: Record<FieldType, LucideIcon> = {
  text: TextIcon,
  number: HashIcon,
  currency: DollarSignIcon,
  date: CalendarIcon,
  datetime: ClockIcon,
  json: BracesIcon,
  select: CircleDotIcon,
  multiselect: TagsIcon,
  person: UserIcon,
  record: BuildingIcon,
  email: AtSignIcon,
  url: LinkIcon,
  phone: PhoneIcon,
  checkbox: CheckIcon,
  rating: StarIcon,
};

export const typeLabels: Record<FieldType, string> = {
  text: "Text",
  number: "Number",
  currency: "Currency",
  date: "Date",
  datetime: "Date & Time",
  json: "JSON",
  select: "Select",
  multiselect: "Multi-select",
  person: "Person",
  record: "Record",
  email: "Email",
  url: "URL",
  phone: "Phone",
  checkbox: "Checkbox",
  rating: "Rating",
};

export const PrimaryIcon = KeyRoundIcon;

const chipColors: Record<OptionColor, string> = {
  gray: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",
  red: "bg-red-500/12 text-red-700 dark:text-red-300",
  orange: "bg-orange-500/12 text-orange-700 dark:text-orange-300",
  amber: "bg-amber-500/14 text-amber-800 dark:text-amber-300",
  green: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  teal: "bg-teal-500/12 text-teal-700 dark:text-teal-300",
  blue: "bg-blue-500/12 text-blue-700 dark:text-blue-300",
  violet: "bg-violet-500/12 text-violet-700 dark:text-violet-300",
  pink: "bg-pink-500/12 text-pink-700 dark:text-pink-300",
};

const dotColors: Record<OptionColor, string> = {
  gray: "bg-zinc-400",
  red: "bg-red-500",
  orange: "bg-orange-500",
  amber: "bg-amber-500",
  green: "bg-emerald-500",
  teal: "bg-teal-500",
  blue: "bg-blue-500",
  violet: "bg-violet-500",
  pink: "bg-pink-500",
};

// avatar tints, picked by the name so a record keeps its color
const avatarColors = ["bg-red-500", "bg-orange-500", "bg-amber-500", "bg-emerald-500", "bg-teal-500", "bg-sky-500", "bg-blue-500", "bg-indigo-500", "bg-violet-500", "bg-pink-500"];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "")).toUpperCase() || "?";
}

export function Avatar({ name, shape = "person", className }: { name: string; shape?: "person" | "company"; className?: string }): React.ReactElement {
  return (
    <span aria-hidden className={cn("flex size-5 shrink-0 items-center justify-center text-[9px] font-semibold tracking-wide text-white", shape === "person" ? "rounded-full" : "rounded-[5px]", avatarColors[hash(name) % avatarColors.length], className)}>
      {shape === "person" ? initials(name) : name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function Chip({ label, color, className }: { label: string; color: OptionColor; className?: string }): React.ReactElement {
  return <span className={cn("inline-flex h-[22px] max-w-full shrink-0 items-center truncate rounded-md px-1.5 text-xs font-medium", chipColors[color], className)}>{label}</span>;
}

export function OptionDot({ color }: { color: OptionColor }): React.ReactElement {
  return <span aria-hidden className={cn("size-2 shrink-0 rounded-full", dotColors[color])} />;
}

const dateFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });
const dateTimeFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

/** A D1 timestamp (ISO-8601, or SQLite's "YYYY-MM-DD HH:MM:SS" in UTC) as a local date and time; other text as it is. */
export function formatDateTime(v: string): string {
  const iso = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(v) ? `${v.replace(" ", "T")}Z` : v;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? v : dateTimeFormat.format(d);
}
const currencyFormat = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const numberFormat = new Intl.NumberFormat();

export function formatCurrency(n: number): string {
  return currencyFormat.format(n);
}

export function formatNumber(n: number, suffix?: string): string {
  return numberFormat.format(n) + (suffix ?? "");
}

export function isEmpty(v: unknown): boolean {
  return v == null || v === "" || (Array.isArray(v) && v.length === 0);
}

/** A cell's value as plain text: what search matches, copy puts on the clipboard, and calculations count. */
export function toText(field: Field, v: unknown): string {
  if (isEmpty(v)) return "";
  switch (field.type) {
    case "currency":
      return typeof v === "number" ? formatCurrency(v) : String(v);
    case "number":
      return typeof v === "number" ? formatNumber(v, field.suffix) : String(v);
    case "date":
      return typeof v === "string" ? dateFormat.format(new Date(v)) : String(v);
    case "datetime":
      return typeof v === "string" ? formatDateTime(v) : String(v);
    case "multiselect":
      return Array.isArray(v) ? v.join(", ") : String(v);
    case "checkbox":
      return v ? "Yes" : "No";
    case "rating":
      return `${v}/5`;
    default:
      return String(v);
  }
}

/** The cell's contents. Checkbox cells get `onToggle` so a click flips them without opening an editor. */
export function CellView({ field, value, onToggle }: { field: Field; value: unknown; onToggle?: () => void }): React.ReactNode {
  if (field.primary) {
    const name = isEmpty(value) ? "" : String(value);
    if (!name) return <span className="text-muted-foreground/60">{field.avatar ? "Untitled" : "NULL"}</span>;
    return (
      <span className="flex min-w-0 items-center gap-2">
        {field.avatar && <Avatar name={name} shape={field.avatar} />}
        <span className={cn("truncate font-medium", !field.avatar && "font-mono text-xs")}>{name}</span>
      </span>
    );
  }
  if (field.type === "checkbox") {
    return (
      <button
        type="button"
        aria-label={value ? "Uncheck" : "Check"}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={onToggle}
        className={cn("flex size-4 cursor-pointer items-center justify-center rounded-[4px] border transition-colors", value ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background hover:border-foreground/30")}
      >
        {!!value && <CheckIcon className="size-3" strokeWidth={3} />}
      </button>
    );
  }
  if (value === null) return <span className="text-[11px] text-muted-foreground/50">NULL</span>;
  if (isEmpty(value)) return null;
  switch (field.type) {
    case "json":
      return <span className="truncate font-mono text-xs text-foreground/80">{String(value)}</span>;
    case "datetime":
      return <span className="truncate tabular-nums text-foreground/80">{toText(field, value)}</span>;
    case "select": {
      const opt = field.options?.find((o) => o.value === value);
      return <Chip label={String(value)} color={opt?.color ?? "gray"} />;
    }
    case "multiselect": {
      const values = Array.isArray(value) ? (value as string[]) : [String(value)];
      return (
        <span className="flex min-w-0 items-center gap-1 overflow-hidden">
          {values.map((v) => (
            <Chip key={v} label={v} color={field.options?.find((o) => o.value === v)?.color ?? "gray"} />
          ))}
        </span>
      );
    }
    case "person":
      return (
        <span className="flex min-w-0 items-center gap-1.5">
          <Avatar name={String(value)} className="size-[18px] text-[8px]" />
          <span className="truncate">{String(value)}</span>
        </span>
      );
    case "record":
      return (
        <span className="inline-flex h-[22px] min-w-0 max-w-full items-center gap-1.5 rounded-md border bg-background ps-0.5 pe-1.5 text-xs font-medium">
          <Avatar name={String(value)} shape="company" className="size-4 rounded-[4px] text-[8px]" />
          <span className="truncate">{String(value)}</span>
        </span>
      );
    case "url":
    case "email":
      return <span className="truncate text-foreground/90 underline decoration-foreground/15 underline-offset-[3px]">{String(value)}</span>;
    case "rating": {
      const n = Number(value) || 0;
      return (
        <span className="flex items-center gap-px" aria-label={`${n} of 5`}>
          {[1, 2, 3, 4, 5].map((i) => (
            <StarIcon key={i} className={cn("size-3.5", i <= n ? "fill-amber-400 text-amber-400" : "text-foreground/12")} />
          ))}
        </span>
      );
    }
    case "number":
    case "currency":
      return <span className="w-full truncate text-right tabular-nums">{toText(field, value)}</span>;
    case "date":
      return <span className="truncate tabular-nums text-foreground/80">{toText(field, value)}</span>;
    default:
      return <span className="truncate">{String(value)}</span>;
  }
}

/** The value an editor's text turns into for a field, or null for an empty cell. */
export function parseInput(field: Field, text: string): unknown {
  const t = text.trim();
  if (!t) return field.type === "multiselect" ? [] : null;
  switch (field.type) {
    case "number":
    case "currency":
    case "rating": {
      const n = Number(t.replace(/[^0-9.-]/g, ""));
      if (!Number.isFinite(n)) return null;
      return field.type === "rating" ? Math.max(0, Math.min(5, Math.round(n))) : n;
    }
    default:
      return t;
  }
}

/** What an editor starts with for a value. */
export function editText(field: Field, v: unknown): string {
  if (isEmpty(v)) return "";
  if (field.type === "date" && typeof v === "string") return v.slice(0, 10);
  return String(v);
}

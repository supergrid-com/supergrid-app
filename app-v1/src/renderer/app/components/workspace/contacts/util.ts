import type { ContactQuery, FieldDef, FilterOp } from "@supergrid/app-kit/rpc";

// Small helpers the contacts pages share: time words, initials, and what a filter looks like.

/** "12 min ago", "yesterday", "Oct 3" — the way the rest of the app talks about time. */
export function relative(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? "s" : ""} ago`;
  const d = Math.round(h / 24);
  if (d === 1) return "yesterday";
  if (d < 14) return `${d} days ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: d > 300 ? "numeric" : undefined });
}

export function absolute(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function initialOf(name: string | null | undefined, email: string): string {
  const base = (name ?? "").trim() || email;
  return base.slice(0, 1).toUpperCase();
}

/** The part of a contact query the filter bar edits; search, sort and paging live beside it. */
export type ContactFilter = Pick<ContactQuery, "tags" | "anyTags" | "source" | "createdFrom" | "createdTo" | "props">;

export const emptyFilter: ContactFilter = {};

export function filterIsEmpty(f: ContactFilter): boolean {
  return !f.tags?.length && !f.anyTags?.length && !f.source && !f.createdFrom && !f.createdTo && !f.props?.length;
}

/** Which operators make sense on a field of this type, in menu order. */
export function opsFor(type: FieldDef["type"]): { op: FilterOp; label: string }[] {
  switch (type) {
    case "number":
      return [{ op: "eq", label: "is" }, { op: "ne", label: "is not" }, { op: "gt", label: "more than" }, { op: "lt", label: "less than" }, { op: "gte", label: "at least" }, { op: "lte", label: "at most" }, { op: "exists", label: "is set" }];
    case "date":
      return [{ op: "gte", label: "on or after" }, { op: "lte", label: "on or before" }, { op: "exists", label: "is set" }];
    case "bool":
      return [{ op: "eq", label: "is" }];
    case "select":
      return [{ op: "eq", label: "is" }, { op: "ne", label: "is not" }, { op: "exists", label: "is set" }];
    default:
      return [{ op: "contains", label: "contains" }, { op: "eq", label: "is" }, { op: "ne", label: "is not" }, { op: "exists", label: "is set" }];
  }
}

export const opLabel = (type: FieldDef["type"], op: FilterOp): string => opsFor(type).find((o) => o.op === op)?.label ?? op;

/** The registry key a `props.<key>` condition points at. */
export const propKey = (field: string): string => field.replace(/^props\./, "");

export function formatValue(field: FieldDef | undefined, v: unknown): string {
  if (v == null || v === "") return "—";
  if (field?.type === "bool" || typeof v === "boolean") return v ? "Yes" : "No";
  if (field?.type === "number" && typeof v === "number") return v.toLocaleString();
  if (field?.type === "date") return relative(String(v));
  return String(v);
}

// Hand-written checks for RPC input. Each throws a plain Error naming the field, which /_ws/rpc returns as 400.
import type { FieldDef, FilterOp, When } from "@supergrid/app-kit/rpc";

export class Invalid extends Error {}
export const invalid = (message: string): never => { throw new Invalid(message); };

export const str = (v: unknown, name: string, { max = 500, re, optional = false }: { max?: number; re?: RegExp; optional?: boolean } = {}): string => {
  if (v == null || v === "") return optional ? "" : invalid(`${name} is required`);
  if (typeof v !== "string") return invalid(`${name} must be a string`);
  if (v.length > max) return invalid(`${name} is longer than ${max} characters`);
  if (re && !re.test(v)) return invalid(`${name} has an unexpected format`);
  return v;
};
export const opt = (v: unknown, name: string, o: { max?: number; re?: RegExp } = {}): string | null => (v == null || v === "" ? null : str(v, name, o));
export const int = (v: unknown, name: string, { min = 0, max = 1_000_000, dflt = 0 }: { min?: number; max?: number; dflt?: number } = {}): number => {
  if (v == null) return dflt;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isInteger(n)) return invalid(`${name} must be a whole number`);
  return Math.min(max, Math.max(min, n));
};
export const oneOf = <T extends string>(v: unknown, name: string, list: readonly T[], dflt?: T): T => {
  if (v == null && dflt !== undefined) return dflt;
  if (typeof v !== "string" || !list.includes(v as T)) return invalid(`${name} must be one of ${list.join(", ")}`);
  return v as T;
};
export const obj = (v: unknown, name: string): Record<string, unknown> => {
  if (v == null) return {};
  if (typeof v !== "object" || Array.isArray(v)) return invalid(`${name} must be an object`);
  return v as Record<string, unknown>;
};
export const list = (v: unknown, name: string, max = 100): unknown[] => {
  if (v == null) return [];
  if (!Array.isArray(v)) return invalid(`${name} must be a list`);
  if (v.length > max) return invalid(`${name} has more than ${max} items`);
  return v;
};
export const strings = (v: unknown, name: string, max = 100): string[] => list(v, name, max).map((x, i) => str(x, `${name}[${i}]`, { max: 200 }));
export const bool = (v: unknown, dflt = false): boolean => (v == null ? dflt : v === true || v === 1 || v === "1" || v === "true");
export const iso = (v: unknown, name: string): string | null => {
  if (v == null || v === "") return null;
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return invalid(`${name} is not a date`);
  return d.toISOString();
};

export const KEY = /^[a-z][a-z0-9_]{0,59}$/;
export const SLUG = /^[a-z][a-z0-9_]{0,39}$/;
export const EVENT_NAME = /^[a-z0-9_]+(\.[a-z0-9_]+)+$/;
export const FIELD_TYPES = ["text", "number", "bool", "date", "select", "url"] as const;
export const OPS: readonly FilterOp[] = ["eq", "ne", "in", "contains", "exists", "gt", "lt", "gte", "lte"];

export function fieldDef(v: unknown): FieldDef {
  const f = obj(v, "field");
  return {
    key: str(f.key, "key", { re: KEY, max: 60 }), label: str(f.label, "label", { max: 80 }), type: oneOf(f.type, "type", FIELD_TYPES),
    options: f.options == null ? undefined : strings(f.options, "options", 50), required: bool(f.required), indexed: bool(f.indexed),
  };
}

export function whenList(v: unknown, name = "when"): When[] {
  return list(v, name, 20).map((w, i) => {
    const o = obj(w, `${name}[${i}]`);
    return { field: str(o.field, `${name}[${i}].field`, { max: 80, re: /^[a-z_][a-z0-9_.]*$/ }), op: oneOf(o.op, `${name}[${i}].op`, OPS), value: o.value };
  });
}

/** `{{contact.name}}`, `{{event.props.plan}}`: dotted paths into `vars`; missing values render empty. */
export function tpl(text: string, vars: Record<string, unknown>): string {
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path: string) => {
    const value = path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), vars);
    return value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
  });
}

const get = (row: Record<string, unknown>, field: string): unknown => {
  if (field.startsWith("props.")) {
    const props = row.props;
    const bag = typeof props === "string" ? (JSON.parse(props) as Record<string, unknown>) : ((props ?? {}) as Record<string, unknown>);
    return field.slice(6).split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), bag);
  }
  return row[field];
};

/** Does a row satisfy every condition? Used where SQL can't: hook filters and workflow conditions. */
export function matches(when: When[] | null | undefined, row: Record<string, unknown>): boolean {
  for (const w of when ?? []) {
    const v = get(row, w.field);
    switch (w.op) {
      case "exists": if ((v == null) === (w.value !== false)) return false; break;
      case "eq": if (String(v ?? "") !== String(w.value ?? "")) return false; break;
      case "ne": if (String(v ?? "") === String(w.value ?? "")) return false; break;
      case "in": if (!Array.isArray(w.value) || !w.value.map(String).includes(String(v ?? ""))) return false; break;
      case "contains": if (!String(v ?? "").toLowerCase().includes(String(w.value ?? "").toLowerCase())) return false; break;
      case "gt": if (!(Number(v) > Number(w.value))) return false; break;
      case "gte": if (!(Number(v) >= Number(w.value))) return false; break;
      case "lt": if (!(Number(v) < Number(w.value))) return false; break;
      case "lte": if (!(Number(v) <= Number(w.value))) return false; break;
    }
  }
  return true;
}

/** One SQL condition for a `When` on a plain column or a `props.<key>` JSON path. Column names come from the caller's whitelist, never input. */
export function whenSql(w: When, column: (field: string) => string | null, jsonColumn = "props"): { sql: string; binds: unknown[] } | null {
  let expr: string;
  const binds: unknown[] = [];
  if (w.field.startsWith("props.")) {
    const key = w.field.slice(6);
    if (!/^[a-zA-Z_][\w.]{0,60}$/.test(key)) return invalid(`bad prop key ${key}`);
    expr = `json_extract(${jsonColumn}, '$.' || ?)`;
    binds.push(key);
  } else {
    const col = column(w.field);
    if (!col) return invalid(`cannot filter on ${w.field}`);
    expr = col;
  }
  const scalar = (v: unknown) => (typeof v === "boolean" ? (v ? 1 : 0) : v == null ? null : typeof v === "object" ? JSON.stringify(v) : v);
  switch (w.op) {
    case "exists": return { sql: w.value === false ? `${expr} IS NULL` : `${expr} IS NOT NULL`, binds };
    case "eq": return w.value == null ? { sql: `${expr} IS NULL`, binds } : { sql: `${expr} = ?`, binds: [...binds, scalar(w.value)] };
    case "ne": return w.value == null ? { sql: `${expr} IS NOT NULL`, binds } : { sql: `${expr} IS NOT ?`, binds: [...binds, scalar(w.value)] };
    case "in": {
      const vals = list(w.value, "value", 50);
      if (!vals.length) return { sql: "0", binds };
      return { sql: `${expr} IN (${vals.map(() => "?").join(",")})`, binds: [...binds, ...vals.map(scalar)] };
    }
    case "contains": return { sql: `${expr} LIKE ? ESCAPE '\\'`, binds: [...binds, `%${String(w.value ?? "").replace(/[%_\\]/g, "\\$&")}%`] };
    case "gt": return { sql: `${expr} > ?`, binds: [...binds, scalar(w.value)] };
    case "gte": return { sql: `${expr} >= ?`, binds: [...binds, scalar(w.value)] };
    case "lt": return { sql: `${expr} < ?`, binds: [...binds, scalar(w.value)] };
    case "lte": return { sql: `${expr} <= ?`, binds: [...binds, scalar(w.value)] };
  }
}

import type { FilterOp, When } from "@supergrid/app-kit/rpc";
import { PlusIcon, XIcon } from "lucide-react";
import * as React from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "~/components/ui/select";
import { cn } from "~/lib/utils";

// The `when` conditions a hook, a workflow trigger or a condition step carry: a list of
// { field, op, value } over an event's columns or `props.<key>`. One row per condition, free
// text for the field (with the known columns as suggestions), so any prop can be named.

export const WHEN_OPS: { op: FilterOp; label: string }[] = [
  { op: "eq", label: "is" },
  { op: "ne", label: "is not" },
  { op: "contains", label: "contains" },
  { op: "in", label: "is one of" },
  { op: "exists", label: "is set" },
  { op: "gt", label: "more than" },
  { op: "gte", label: "at least" },
  { op: "lt", label: "less than" },
  { op: "lte", label: "at most" },
];

/** Event columns worth suggesting; `props.` is the prefix for everything else. */
export const EVENT_FIELDS = ["name", "app_id", "path", "url", "referrer", "utm_source", "utm_medium", "utm_campaign", "country", "region", "city", "device", "contact_id", "anonymous_id", "props."];
/** What a condition step can also see: the run's contact. */
export const CONTACT_FIELDS = ["contact.email", "contact.name", "contact.source", "contact.props."];

// Typed values from a text box: numbers and booleans come back as themselves, `in` takes a
// comma list, and `exists` needs nothing.
function coerce(op: FilterOp, text: string): unknown {
  if (op === "exists") return undefined;
  const one = (s: string): unknown => {
    const t = s.trim();
    if (t === "true") return true;
    if (t === "false") return false;
    if (t !== "" && !Number.isNaN(Number(t)) && /^-?\d+(\.\d+)?$/.test(t)) return Number(t);
    return t;
  };
  return op === "in" ? text.split(",").map(one).filter((v) => v !== "") : one(text);
}

const asText = (v: unknown): string => (v == null ? "" : Array.isArray(v) ? v.map(String).join(", ") : String(v));

export function describeWhen(when: When[] | null | undefined): string {
  if (!when?.length) return "";
  return when.map((w) => `${w.field} ${WHEN_OPS.find((o) => o.op === w.op)?.label ?? w.op}${w.op === "exists" ? "" : ` ${asText(w.value)}`}`).join(" · ");
}

export function WhenList({ value, onChange, suggestions = EVENT_FIELDS, addLabel = "Add condition", className }: { value: When[]; onChange: (next: When[]) => void; suggestions?: string[]; addLabel?: string; className?: string }): React.ReactElement {
  const listId = React.useId();
  // text as typed, so "1." does not snap to 1 while the user is still writing
  const [texts, setTexts] = React.useState<Record<number, string>>({});
  const set = (i: number, patch: Partial<When>) => onChange(value.map((w, j) => (j === i ? { ...w, ...patch } : w)));
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <datalist id={listId}>
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      {value.map((w, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <Input size="sm" list={listId} placeholder="props.plan" value={w.field} onChange={(e) => set(i, { field: e.target.value })} className="min-w-0 flex-1 font-mono text-xs" />
          <Select items={WHEN_OPS.map((o) => ({ value: o.op, label: o.label }))} value={w.op} onValueChange={(v) => set(i, { op: v as FilterOp, value: coerce(v as FilterOp, texts[i] ?? asText(w.value)) })}>
            <SelectTrigger size="sm" className="w-28 shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              {WHEN_OPS.map((o) => (
                <SelectItem key={o.op} value={o.op}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectPopup>
          </Select>
          <Input
            size="sm"
            placeholder={w.op === "in" ? "a, b, c" : "value"}
            disabled={w.op === "exists"}
            value={w.op === "exists" ? "" : (texts[i] ?? asText(w.value))}
            onChange={(e) => {
              setTexts((t) => ({ ...t, [i]: e.target.value }));
              set(i, { value: coerce(w.op, e.target.value) });
            }}
            className="min-w-0 flex-1"
          />
          <Button size="icon-xs" variant="ghost" aria-label="Remove condition" className="shrink-0 text-muted-foreground" onClick={() => { setTexts({}); onChange(value.filter((_, j) => j !== i)); }}>
            <XIcon />
          </Button>
        </div>
      ))}
      <div>
        <Button size="xs" variant="ghost" className="text-muted-foreground" onClick={() => onChange([...value, { field: "", op: "eq", value: "" }])}>
          <PlusIcon />
          {addLabel}
        </Button>
      </div>
    </div>
  );
}

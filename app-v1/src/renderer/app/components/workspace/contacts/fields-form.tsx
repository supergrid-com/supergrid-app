import type { FieldDef } from "@supergrid/app-kit/rpc";
import * as React from "react";
import { Input } from "~/components/ui/input";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { cn } from "~/lib/utils";

// Form controls driven by a FieldDef, so contacts' custom fields and every object type share
// one editor. The value is whatever sits in `props` / `doc`; the control keeps its type.

export function FieldRow({ label, hint, children, className }: { label: React.ReactNode; hint?: React.ReactNode; children: React.ReactNode; className?: string }): React.ReactElement {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-[13px] font-medium">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function FieldInput({ field, value, onChange, size = "sm" }: { field: FieldDef; value: unknown; onChange: (v: unknown) => void; size?: "sm" | "default" }): React.ReactElement {
  switch (field.type) {
    case "number":
      return <Input type="number" size={size} value={value == null ? "" : String(value)} onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))} />;
    case "bool":
      return (
        <span className="flex h-7.5 items-center">
          <Switch checked={!!value} onCheckedChange={(v) => onChange(v)} />
        </span>
      );
    case "date":
      return <Input type="date" size={size} value={value ? String(value).slice(0, 10) : ""} onChange={(e) => onChange(e.target.value || undefined)} />;
    case "select": {
      const items = [{ value: "", label: "—" }, ...(field.options ?? []).map((o) => ({ value: o, label: o }))];
      return (
        <Select items={items} value={value == null ? "" : String(value)} onValueChange={(v) => onChange(v ? v : undefined)}>
          <SelectTrigger size={size}>
            <SelectValue />
          </SelectTrigger>
          <SelectPopup>
            {items.map((i) => (
              <SelectItem key={i.value} value={i.value}>
                {i.label}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
      );
    }
    case "url":
      return <Input type="url" size={size} placeholder="https://" value={value == null ? "" : String(value)} onChange={(e) => onChange(e.target.value || undefined)} />;
    default:
      return <Input size={size} value={value == null ? "" : String(value)} onChange={(e) => onChange(e.target.value || undefined)} />;
  }
}

/** A grid of registry fields editing one record. */
export function FieldsForm({ fields, value, onChange, columns = 2 }: { fields: FieldDef[]; value: Record<string, unknown>; onChange: (next: Record<string, unknown>) => void; columns?: 1 | 2 }): React.ReactElement {
  return (
    <div className={cn("grid gap-4", columns === 2 && "sm:grid-cols-2")}>
      {fields.map((f) => (
        <FieldRow key={f.key} label={<span>{f.label}{f.required && <span className="text-destructive-foreground"> *</span>}</span>}>
          <FieldInput field={f} value={value[f.key]} onChange={(v) => onChange({ ...value, [f.key]: v })} />
        </FieldRow>
      ))}
    </div>
  );
}

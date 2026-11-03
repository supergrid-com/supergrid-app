import { BracesIcon, CheckIcon, ChevronDownIcon, ChevronUpIcon, ClockIcon, KeyRoundIcon, Loader2Icon, Trash2Icon, TriangleAlertIcon, WandSparklesIcon, XIcon } from "lucide-react";
import * as React from "react";
import { typeIcons, typeLabels } from "~/components/data-grid/cells";
import type { GridRow } from "~/components/data-grid/types";
import { AlertDialog, AlertDialogClose, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogPopup, AlertDialogTitle } from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { DatePicker } from "~/components/ui/date-picker";
import { Input } from "~/components/ui/input";
import { NumberField, NumberFieldDecrement, NumberFieldGroup, NumberFieldIncrement, NumberFieldInput } from "~/components/ui/number-field";
import { Switch } from "~/components/ui/switch";
import { Sheet, SheetDescription, SheetFooter, SheetHeader, SheetPanel, SheetPopup, SheetTitle } from "~/components/ui/sheet";
import { Textarea } from "~/components/ui/textarea";
import { Tooltip, TooltipPopup, TooltipTrigger } from "~/components/ui/tooltip";
import { allows, type Column, type DbTable, KEY, shortId, tableLabel, tableNoun } from "~/lib/db";
import { cn } from "~/lib/utils";

// One row of a table in a drawer, after Attio's record preview: a header that pages through the
// rows on screen, then every column with its value in a field of its own. Changes save together.
// The same drawer, empty, is how a row is added: a key column gets an id made the way the
// workspace makes them, columns with defaults may stay blank, and the rest must be filled.

export type RecordSheetProps = {
  table: DbTable;
  /** The rows the grid shows, so the header can step through them. */
  rows: GridRow[];
  /** The open row's id, or "new" for an empty form. Null closes the drawer. */
  rowId: string | null;
  /** Where the page's rows sit in the whole table, for "6 of 240". */
  offset: number;
  total: number;
  onNavigate: (rowId: string) => void;
  onClose: () => void;
  onSave: (values: Record<string, unknown>) => Promise<void>;
  onInsert: (values: Record<string, unknown>) => Promise<void>;
  onDelete: () => Promise<void>;
};

/** What a column's input holds while editing: text, or null for NULL. Checkboxes hold booleans. */
type Draft = Record<string, string | boolean | null>;

const STAMPS = new Set(["created_at", "updated_at", "ts", "timestamp"]);

/** The form's starting values: the row's, or for a new row an id in a text key column, now in the time stamps, and NULL elsewhere. */
function draftOf(table: DbTable, row: GridRow | undefined): Draft {
  const d: Draft = {};
  const now = new Date().toISOString();
  for (const c of table.columns) {
    const v = row?.[c.name];
    if (c.field.type === "checkbox") d[c.name] = row ? !!v : false;
    else if (row) d[c.name] = v == null ? null : String(v);
    else if (c.pk > 0 && c.type.toUpperCase() === "TEXT") d[c.name] = shortId();
    else if (c.field.type === "datetime" && STAMPS.has(c.name)) d[c.name] = now;
    else d[c.name] = null;
  }
  return d;
}

/** The draft as values to write: text parsed per column; null where the user left NULL. */
function valuesOf(table: DbTable, draft: Draft): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const c of table.columns) {
    const v = draft[c.name];
    if (c.field.type === "checkbox") out[c.name] = !!v;
    else if (v === null) out[c.name] = null;
    else if (typeof v === "boolean") out[c.name] = v ? 1 : 0;
    else if (c.field.type === "number") out[c.name] = v.trim() === "" ? null : Number.isFinite(Number(v)) ? Number(v) : v;
    else if (c.field.type === "json") {
      // stored compact, the way the workspace writes it
      try {
        out[c.name] = JSON.stringify(JSON.parse(v));
      } catch {
        out[c.name] = v;
      }
    } else out[c.name] = v;
  }
  return out;
}

export function RecordSheet({ table, rows, rowId, offset, total, onNavigate, onClose, onSave, onInsert, onDelete }: RecordSheetProps): React.ReactElement {
  const isNew = rowId === "new";
  const index = rows.findIndex((r) => r[KEY] === rowId);
  const row = index >= 0 ? rows[index] : undefined;
  const editable = allows(table, "rows");
  const [draft, setDraft] = React.useState<Draft>(() => draftOf(table, row));
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [confirm, setConfirm] = React.useState(false);
  // a different row (or a reload of this one) starts the form over
  const rowKey = row ? JSON.stringify(row) : rowId;
  React.useEffect(() => {
    setDraft(draftOf(table, row));
    setError(null);
  }, [rowKey, table]);

  const dirty = React.useMemo(() => JSON.stringify(draft) !== JSON.stringify(draftOf(table, row)), [draft, row, table]);
  const set = (name: string, v: string | boolean | null) => setDraft((d) => ({ ...d, [name]: v }));

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (isNew) {
        // only what was filled in goes to the insert; the rest take their defaults
        const values: Record<string, unknown> = {};
        const all = valuesOf(table, draft);
        for (const c of table.columns) {
          const v = all[c.name];
          const blank = v === null || v === "";
          if (blank && c.dflt !== null) continue;
          if (blank && !c.notNull && c.pk === 0) continue;
          if (blank && c.notNull && c.pk === 0) throw new Error(`${c.name} needs a value.`);
          values[c.name] = v;
        }
        await onInsert(values);
      } else {
        // only the columns that changed
        const before = draftOf(table, row);
        const all = valuesOf(table, draft);
        const values: Record<string, unknown> = {};
        for (const c of table.columns) if (JSON.stringify(draft[c.name]) !== JSON.stringify(before[c.name])) values[c.name] = all[c.name];
        if (Object.keys(values).length) await onSave(values);
      }
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  };

  const noun = tableNoun(table);
  const title = isNew ? `New ${noun.one.replace(/\b\w/g, (c) => c.toUpperCase())}` : (row ? String(table.columns.find((c) => c.field.primary) ? (row[table.columns.find((c) => c.field.primary)!.name] ?? "") : "") : "") || "Row";
  const position = index >= 0 ? `${(offset + index + 1).toLocaleString()} of ${total.toLocaleString()} in ${tableLabel(table)}` : isNew ? tableLabel(table) : "";

  return (
    <Sheet open={rowId !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetPopup side="right" showCloseButton={false} className="max-w-md">
        {/* the strip at the top: close, step through the page's rows, where this row sits */}
        <div className="flex h-11 shrink-0 items-center gap-1 border-b px-2">
          <Button size="icon-xs" variant="ghost" aria-label="Close" onClick={onClose}>
            <XIcon />
          </Button>
          {!isNew && (
            <>
              <Button size="icon-xs" variant="ghost" aria-label="Previous Row" disabled={index <= 0} onClick={() => onNavigate(String(rows[index - 1]![KEY]))}>
                <ChevronUpIcon />
              </Button>
              <Button size="icon-xs" variant="ghost" aria-label="Next Row" disabled={index < 0 || index >= rows.length - 1} onClick={() => onNavigate(String(rows[index + 1]![KEY]))}>
                <ChevronDownIcon />
              </Button>
            </>
          )}
          <span className="ms-1 min-w-0 truncate text-xs text-muted-foreground">{position}</span>
        </div>
        <SheetHeader className="pb-2">
          <SheetTitle className="truncate text-lg">{title}</SheetTitle>
          <SheetDescription>{isNew ? "Blank columns with a default take it; the rest are written as NULL." : `${table.columns.length} columns`}</SheetDescription>
        </SheetHeader>
        <SheetPanel className="flex flex-col gap-4 pt-2">
          {table.columns.map((c) => (
            <ColumnField key={c.name} column={c} value={draft[c.name] ?? null} isNew={isNew} editable={editable && !(c.pk > 0 && !isNew && table.mode !== "custom") && c.type.toUpperCase() !== "BLOB"} onChange={(v) => set(c.name, v)} />
          ))}
        </SheetPanel>
        {editable && (
          <SheetFooter className="items-center">
            {error && <span className="me-auto min-w-0 truncate text-xs text-destructive-foreground">{error}</span>}
            {!isNew && (
              <Button size="sm" variant="ghost" className="text-destructive-foreground hover:bg-destructive/6" disabled={busy} onClick={() => setConfirm(true)}>
                <Trash2Icon />
                Delete
              </Button>
            )}
            <Button size="sm" disabled={busy || (!isNew && !dirty)} onClick={() => void submit()}>
              {busy && <Loader2Icon className="animate-spin" />}
              {isNew ? `Add ${noun.one.replace(/\b\w/g, (c) => c.toUpperCase())}` : "Save"}
            </Button>
          </SheetFooter>
        )}
        <AlertDialog open={confirm} onOpenChange={setConfirm}>
          <AlertDialogPopup>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this row?</AlertDialogTitle>
              <AlertDialogDescription>It leaves {tableLabel(table)} for good. Backups can bring the whole database back to before, but not one row.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogClose render={<Button variant="ghost" />}>Cancel</AlertDialogClose>
              <Button
                variant="destructive"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  void onDelete()
                    .catch((e) => setError(String((e as Error).message ?? e)))
                    .finally(() => {
                      setBusy(false);
                      setConfirm(false);
                    });
                }}
              >
                Delete {noun.one.replace(/\b\w/g, (c) => c.toUpperCase())}
              </Button>
            </AlertDialogFooter>
          </AlertDialogPopup>
        </AlertDialog>
      </SheetPopup>
    </Sheet>
  );
}

/** One column: its name and type up top, the value under it, and a way to make it NULL or fill in an id. */
function ColumnField({ column: c, value, isNew, editable, onChange }: { column: Column; value: string | boolean | null; isNew: boolean; editable: boolean; onChange: (v: string | boolean | null) => void }): React.ReactElement {
  const f = c.field;
  const Icon = typeIcons[f.type];
  // a NULL turned into a field takes the cursor at once
  const [focusNext, setFocusNext] = React.useState(false);
  const fromNull = () => {
    setFocusNext(true);
    onChange(f.type === "datetime" ? new Date().toISOString() : f.type === "json" ? (c.dflt === "'[]'" ? "[]" : "{}") : "");
  };
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {c.pk > 0 ? <KeyRoundIcon className="size-3.5 text-amber-500" /> : <Icon className="size-3.5 opacity-70" />}
        <span className="font-medium text-foreground/80">{c.name}</span>
        <span className="font-mono text-[11px] text-muted-foreground/80">{c.type || "ANY"}</span>
        {c.notNull && <span className="rounded bg-muted px-1 text-[10px] font-medium uppercase tracking-wide whitespace-nowrap">not null</span>}
        {c.dflt !== null && (
          <Tooltip>
            <TooltipTrigger render={<span className="truncate rounded bg-muted px-1 font-mono text-[10px]" />}>default {c.dflt}</TooltipTrigger>
            <TooltipPopup>Left blank, the column takes this.</TooltipPopup>
          </Tooltip>
        )}
        <span className="flex-1" />
        {editable && isNew && c.pk > 0 && c.type.toUpperCase() === "TEXT" && (
          <Tooltip>
            <TooltipTrigger render={<button type="button" aria-label="Generate an id" onClick={() => onChange(shortId())} className="flex size-5 cursor-pointer items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground" />}>
              <WandSparklesIcon className="size-3.5" />
            </TooltipTrigger>
            <TooltipPopup>Another id: 10 lowercase letters and digits.</TooltipPopup>
          </Tooltip>
        )}
        {editable && f.type === "datetime" && value !== null && (
          <button type="button" onClick={() => onChange(new Date().toISOString())} className="flex cursor-pointer items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
            <ClockIcon className="size-3" />
            Now
          </button>
        )}
        {editable && f.type !== "checkbox" && value !== null && !c.notNull && (
          <button type="button" onClick={() => onChange(null)} className="cursor-pointer text-[11px] text-muted-foreground hover:text-foreground">
            Set NULL
          </button>
        )}
      </div>
      {f.type === "checkbox" ? (
        <label className="flex h-8 items-center gap-2.5 text-[13px]">
          <Switch checked={!!value} disabled={!editable} onCheckedChange={(on) => onChange(!!on)} />
          <span className={cn(!value && "text-muted-foreground")}>{value ? "True" : "False"}</span>
        </label>
      ) : value === null ? (
        <button type="button" disabled={!editable} onClick={fromNull} className={cn(inputClass, "text-start font-mono text-xs text-muted-foreground/70", editable && "cursor-text hover:border-foreground/30")}>
          {isNew && c.dflt !== null ? <span className="font-sans">Default · {c.dflt}</span> : "NULL"}
        </button>
      ) : (
        <ValueInput column={c} value={value as string} editable={editable} autoFocus={focusNext} onChange={onChange} />
      )}
      <span className="sr-only">{typeLabels[f.type]}</span>
    </div>
  );
}

const inputClass = "w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-[13px] text-foreground outline-none placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/24 disabled:opacity-70";

/** The input for a column's value, by its type, on the kit's own parts: a date picker, a number field, a checked JSON editor. */
function ValueInput({ column: c, value, editable, autoFocus, onChange }: { column: Column; value: string; editable: boolean; autoFocus: boolean; onChange: (v: string) => void }): React.ReactElement {
  const f = c.field;
  switch (f.type) {
    case "datetime":
      return (
        <div className="flex flex-col gap-1">
          <DatePicker value={value} withTime disabled={!editable} autoFocus={autoFocus} onChange={(iso) => onChange(iso ?? "")} />
          <span className="truncate font-mono text-[11px] text-muted-foreground" title={value}>
            {value}
          </span>
        </div>
      );
    case "date":
      return <DatePicker value={value} disabled={!editable} autoFocus={autoFocus} onChange={(iso) => onChange(iso ? iso.slice(0, 10) : "")} />;
    case "number": {
      const n = value.trim() === "" ? null : Number(value);
      return (
        <NumberField size="sm" value={Number.isFinite(n as number) ? n : null} disabled={!editable} onValueChange={(v) => onChange(v == null ? "" : String(v))} className="w-48">
          <NumberFieldGroup>
            <NumberFieldDecrement />
            <NumberFieldInput autoFocus={autoFocus} className="font-mono text-xs" />
            <NumberFieldIncrement />
          </NumberFieldGroup>
        </NumberField>
      );
    }
    case "email":
    case "url":
      return <Input type={f.type} size="sm" value={value} autoFocus={autoFocus} disabled={!editable} spellCheck={false} onChange={(e) => onChange(e.target.value)} placeholder={f.type === "email" ? "name@example.com" : "https://"} />;
    case "json": {
      let valid = true;
      let pretty = value;
      try {
        pretty = JSON.stringify(JSON.parse(value), null, 2);
      } catch {
        valid = false;
      }
      return (
        <div className="flex flex-col gap-1">
          <Textarea value={value} autoFocus={autoFocus} disabled={!editable} spellCheck={false} onChange={(e) => onChange(e.target.value)} rows={Math.min(14, Math.max(3, value.split("\n").length + 1))} className="font-mono text-xs" aria-invalid={!valid || undefined} />
          <div className="flex items-center gap-2 text-[11px]">
            {valid ? (
              <span className="flex items-center gap-1 text-success-foreground">
                <CheckIcon className="size-3" />
                Valid JSON
              </span>
            ) : (
              <span className="flex items-center gap-1 text-destructive-foreground">
                <TriangleAlertIcon className="size-3" />
                Not valid JSON, saved as text
              </span>
            )}
            <span className="flex-1" />
            {editable && valid && pretty !== value && (
              <button type="button" onClick={() => onChange(pretty)} className="flex cursor-pointer items-center gap-1 text-muted-foreground hover:text-foreground">
                <BracesIcon className="size-3" />
                Format
              </button>
            )}
          </div>
        </div>
      );
    }
    default: {
      const long = value.length > 60 || value.includes("\n");
      if (long) return <Textarea value={value} autoFocus={autoFocus} disabled={!editable} spellCheck={false} onChange={(e) => onChange(e.target.value)} rows={Math.min(12, Math.max(3, value.split("\n").length + 1))} className="text-[13px]" />;
      return <Input size="sm" value={value} autoFocus={autoFocus} disabled={!editable} spellCheck={false} onChange={(e) => onChange(e.target.value)} className={cn(c.pk > 0 && "font-mono text-xs")} />;
    }
  }
}

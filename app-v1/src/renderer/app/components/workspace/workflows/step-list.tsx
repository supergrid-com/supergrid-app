import type { FieldDef, StepCatalogEntry, WorkflowStep } from "@supergrid/app-kit/rpc";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, Trash2Icon } from "lucide-react";
import * as React from "react";
import { FieldInput, FieldRow } from "~/components/workspace/contacts/fields-form";
import { CONTACT_FIELDS, EVENT_FIELDS, WhenList } from "~/components/workspace/when-editor";
import { Button } from "~/components/ui/button";
import { Menu, MenuGroup, MenuGroupLabel, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "~/components/ui/menu";
import { Textarea } from "~/components/ui/textarea";
import { cn } from "~/lib/utils";

// The steps of a workflow, in order, each with a form drawn from the catalog's `fields`. Ids
// stay with their step through reorders, so a run's `step_id` keeps pointing at the right one.

const JSON_KEYS = new Set(["props", "headers", "doc"]);
/** Fields holding a JSON value rather than text: `when` lists and anything the catalog labels as JSON. */
const isJson = (f: FieldDef): boolean => f.key === "when" || JSON_KEYS.has(f.key) || /json/i.test(f.label);

export function newStepId(existing: WorkflowStep[]): string {
  const used = new Set(existing.map((s) => s.id));
  for (;;) {
    const id = `s_${Math.random().toString(36).slice(2, 8)}`;
    if (!used.has(id)) return id;
  }
}

export function move<T>(list: T[], from: number, to: number): T[] {
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

// A JSON box that keeps what is typed and only hands back a value that parses.
function JsonField({ value, onChange, placeholder }: { value: unknown; onChange: (v: unknown) => void; placeholder?: string }): React.ReactElement {
  const [text, setText] = React.useState(() => (value === undefined ? "" : JSON.stringify(value, null, 2)));
  const [error, setError] = React.useState<string | null>(null);
  // a change from outside (a reorder swaps components, a reset) replaces the draft unless it is the same value
  React.useEffect(() => {
    try {
      if (text.trim() && JSON.stringify(JSON.parse(text)) === JSON.stringify(value)) return;
    } catch {
      // the draft is mid-edit; leave it
      return;
    }
    setText(value === undefined ? "" : JSON.stringify(value, null, 2));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only an outside value change should reset the draft
  }, [value]);
  return (
    <>
      <Textarea
        size="sm"
        value={text}
        placeholder={placeholder}
        spellCheck={false}
        aria-invalid={error ? true : undefined}
        className="font-mono text-xs"
        onChange={(e) => {
          const t = e.target.value;
          setText(t);
          if (!t.trim()) { setError(null); onChange(undefined); return; }
          try {
            onChange(JSON.parse(t));
            setError(null);
          } catch (err) {
            setError((err as Error).message.replace(/^JSON\.parse: /, ""));
          }
        }}
      />
      {error && <span className="text-xs text-destructive-foreground">Not valid JSON: {error}</span>}
    </>
  );
}

function StepRow({ step, entry, index, count, onChange, onMove, onRemove }: { step: WorkflowStep; entry: StepCatalogEntry | undefined; index: number; count: number; onChange: (next: WorkflowStep) => void; onMove: (d: -1 | 1) => void; onRemove: () => void }): React.ReactElement {
  const set = (key: string, v: unknown) => {
    const input = { ...step.input };
    if (v === undefined) delete input[key];
    else input[key] = v;
    onChange({ ...step, input });
  };
  return (
    <li className={cn("rounded-xl border bg-card", !entry && "border-destructive/40")}>
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="flex size-5 items-center justify-center rounded-full bg-muted text-[11px] tabular-nums text-muted-foreground">{index + 1}</span>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium">
            {entry?.label ?? step.type}
            <span className="ms-2 font-mono text-[11px] font-normal text-muted-foreground">{step.type}</span>
          </div>
          {entry?.description && <div className="text-xs text-muted-foreground">{entry.description}</div>}
          {!entry && <div className="text-xs text-destructive-foreground">This step type is not in the catalog; saving will fail.</div>}
        </div>
        <Button size="icon-xs" variant="ghost" aria-label="Move up" disabled={index === 0} onClick={() => onMove(-1)} className="text-muted-foreground">
          <ArrowUpIcon />
        </Button>
        <Button size="icon-xs" variant="ghost" aria-label="Move down" disabled={index === count - 1} onClick={() => onMove(1)} className="text-muted-foreground">
          <ArrowDownIcon />
        </Button>
        <Button size="icon-xs" variant="ghost" aria-label="Remove step" onClick={onRemove} className="text-muted-foreground hover:text-destructive-foreground">
          <Trash2Icon />
        </Button>
      </div>
      {entry && entry.fields.length > 0 && (
        <div className="grid gap-3 border-t px-3 py-3 sm:grid-cols-2">
          {entry.fields.map((f) => {
            const label = (
              <span>
                {f.label}
                {f.required && <span className="text-destructive-foreground"> *</span>}
              </span>
            );
            if (f.key === "when") {
              const when = Array.isArray(step.input.when) ? (step.input.when as { field: string; op: "eq"; value?: unknown }[]) : [];
              return (
                <div key={f.key} className="flex flex-col gap-1.5 sm:col-span-2">
                  <span className="text-[13px] font-medium">{label}</span>
                  <WhenList value={when} onChange={(next) => set("when", next.length ? next : undefined)} suggestions={[...EVENT_FIELDS, ...CONTACT_FIELDS]} />
                </div>
              );
            }
            if (isJson(f)) {
              return (
                <FieldRow key={f.key} label={label} className="sm:col-span-2">
                  <JsonField value={step.input[f.key]} onChange={(v) => set(f.key, v)} placeholder={"{ }"} />
                </FieldRow>
              );
            }
            if (f.key === "body") {
              return (
                <FieldRow key={f.key} label={label} hint="Templates like {{contact.name}} and {{event.props.x}} are filled in." className="sm:col-span-2">
                  <Textarea size="sm" value={step.input.body == null ? "" : String(step.input.body)} onChange={(e) => set("body", e.target.value || undefined)} className="font-mono text-xs" spellCheck={false} />
                </FieldRow>
              );
            }
            return (
              <FieldRow key={f.key} label={label}>
                <FieldInput field={f} value={step.input[f.key]} onChange={(v) => set(f.key, v)} />
              </FieldRow>
            );
          })}
        </div>
      )}
    </li>
  );
}

export function StepList({ steps, catalog, onChange }: { steps: WorkflowStep[]; catalog: StepCatalogEntry[]; onChange: (next: WorkflowStep[]) => void }): React.ReactElement {
  const byType = React.useMemo(() => new Map(catalog.map((e) => [e.type, e])), [catalog]);
  const builtIns = catalog.filter((e) => !e.app_id);
  const apps = new Map<string, StepCatalogEntry[]>();
  for (const e of catalog) if (e.app_id) apps.set(e.app_id, [...(apps.get(e.app_id) ?? []), e]);
  const add = (entry: StepCatalogEntry) => onChange([...steps, { id: newStepId(steps), type: entry.type, input: {} }]);
  return (
    <div className="flex flex-col gap-3">
      {steps.length === 0 ? (
        <div className="rounded-xl border border-dashed px-4 py-8 text-center text-xs text-muted-foreground">No steps yet. Add one below; they run top to bottom.</div>
      ) : (
        <ol className="flex flex-col gap-2">
          {steps.map((s, i) => (
            <StepRow key={s.id} step={s} entry={byType.get(s.type)} index={i} count={steps.length} onChange={(next) => onChange(steps.map((x, j) => (j === i ? next : x)))} onMove={(d) => onChange(move(steps, i, i + d))} onRemove={() => onChange(steps.filter((_, j) => j !== i))} />
          ))}
        </ol>
      )}
      <div>
        <Menu>
          <MenuTrigger render={<Button size="xs" variant="outline" />}>
            <PlusIcon />
            Add step
          </MenuTrigger>
          <MenuPopup align="start" className="w-64">
            <MenuGroup>
              <MenuGroupLabel>Built-ins</MenuGroupLabel>
              {builtIns.map((e) => (
                <MenuItem key={e.type} onClick={() => add(e)}>
                  <span className="flex min-w-0 flex-col">
                    <span>{e.label}</span>
                    {e.description && <span className="truncate text-xs text-muted-foreground">{e.description}</span>}
                  </span>
                </MenuItem>
              ))}
            </MenuGroup>
            {[...apps].map(([app, list]) => (
              <React.Fragment key={app}>
                <MenuSeparator />
                <MenuGroup>
                  <MenuGroupLabel>{app}</MenuGroupLabel>
                  {list.map((e) => (
                    <MenuItem key={e.type} onClick={() => add(e)}>
                      {e.label}
                    </MenuItem>
                  ))}
                </MenuGroup>
              </React.Fragment>
            ))}
            {catalog.length === 0 && <div className="px-2 py-1.5 text-xs text-muted-foreground">The catalog is empty.</div>}
          </MenuPopup>
        </Menu>
      </div>
    </div>
  );
}

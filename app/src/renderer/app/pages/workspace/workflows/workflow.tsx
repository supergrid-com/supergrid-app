import type { FieldDef, StepCatalogEntry, WorkflowDef, WorkflowStep } from "@supergrid/app-kit/rpc";
import { ChevronDownIcon, GlobeIcon, PlayIcon, PlusIcon, RefreshCwIcon, SaveIcon, Trash2Icon, WorkflowIcon, XIcon } from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "~/components/ui/empty";
import { Input } from "~/components/ui/input";
import { Menu, MenuGroup, MenuGroupLabel, MenuItem, MenuPopup, MenuTrigger } from "~/components/ui/menu";
import { Select, SelectGroup, SelectGroupLabel, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { Tabs, TabsList, TabsTab } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";
import { toastManager } from "~/components/ui/toast";
import { Card, Crumbs, DataTable, StatTile, WorkspaceFrame } from "~/components/workspace/frame";
import { absolute, CodeBlock, ConfirmDialog, Field, ListState, relative } from "~/components/workspace/library/shared";
import { getRun, HTTP_STEP, type HookRunRow, newStep, removeWorkflow, runWorkflow, sameDefinition, saveWorkflow, useHookCatalog, useLocalWorkflowSettings, useRuns, useWorkflow, type Workflow } from "~/lib/workflows";
import { clean } from "~/lib/workspaces";
import { cn } from "~/lib/utils";
import { useOpenNav, useShell } from "~/shell/context";
import { duration, RunStatusBadge } from "./shared";

// One workflow: Editor (its trigger and steps), Runs (every time it ran, with each step's output)
// and Settings (name, on or off, timezone, failures, delete). The definition is the JSON the
// workspace stores and runs (core/workspace/src/workflows.ts); the editor shows it under the steps.

type Tab = "editor" | "runs" | "settings";
const TABS: { key: Tab; label: string }[] = [
  { key: "editor", label: "Editor" },
  { key: "runs", label: "Runs" },
  { key: "settings", label: "Settings" },
];

type Draft = { name: string; enabled: boolean; definition: WorkflowDef };
const draftOf = (w: Workflow): Draft => ({ name: w.name, enabled: w.enabled, definition: w.definition });
const sameDraft = (a: Draft, b: Draft) => a.name === b.name && a.enabled === b.enabled && sameDefinition(a.definition, b.definition);

export function WorkflowPage({ id, tab: tabParam }: { id: string; tab?: string }): React.ReactElement {
  const { ws } = useShell();
  const onOpenNav = useOpenNav();
  const navigate = useNavigate();
  const wf = useWorkflow(ws.id, id);
  const tab: Tab = tabParam === "runs" || tabParam === "settings" ? tabParam : "editor";
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [saving, setSaving] = React.useState(false);
  const saved = wf.data ?? null;
  const dirty = !!draft && !!saved && !sameDraft(draft, draftOf(saved));
  const dirtyRef = React.useRef(false);
  dirtyRef.current = dirty;
  // the draft follows the stored workflow until it is edited; a save brings them back together
  React.useEffect(() => {
    if (saved) setDraft((d) => (d && dirtyRef.current ? d : draftOf(saved)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved?.id, saved?.updated_at]);
  const patch = (fn: (d: Draft) => Draft) => setDraft((d) => (d ? fn(d) : d));

  const save = async () => {
    if (!draft || !saved) return;
    setSaving(true);
    try {
      await saveWorkflow(ws.id, { id: saved.id, name: draft.name.trim() || saved.name, definition: draft.definition, enabled: draft.enabled });
      toastManager.add({ title: "Workflow Saved", type: "success", timeout: 1500 });
    } catch (e) {
      toastManager.add({ title: "Workflow Did Not Save", description: clean(e), type: "error" });
    } finally {
      setSaving(false);
    }
  };
  const base = `/w/${ws.id}/workflows/${id}`;
  const title = <Crumbs items={["Workflows", saved?.name ?? draft?.name ?? "…"]} />;
  const actions = (
    <Button size="xs" disabled={!dirty} loading={saving} onClick={() => void save()}>
      <SaveIcon />
      Save
    </Button>
  );

  return (
    <WorkspaceFrame icon={<WorkflowIcon />} title={title} actions={actions} onOpenNav={onOpenNav}>
      <ListState
        data={wf.data === null && !wf.loading && !wf.error ? undefined : wf.data}
        error={wf.error}
        loading={wf.loading}
        onRetry={() => void wf.refresh()}
        isEmpty={(d) => !d}
        empty={
          <Empty className="py-16">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <WorkflowIcon />
              </EmptyMedia>
              <EmptyTitle>No Such Workflow</EmptyTitle>
              <EmptyDescription>There is no workflow {id} in this workspace.</EmptyDescription>
            </EmptyHeader>
            <Button size="sm" variant="outline" onClick={() => navigate(`/w/${ws.id}/workflows`)}>
              All Workflows
            </Button>
          </Empty>
        }
      >
        {(w) => (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <Tabs value={tab} onValueChange={(v) => navigate(v === "editor" ? base : `${base}/${v}`)}>
                <TabsList size="sm">
                  {TABS.map((t) => (
                    <TabsTab key={t.key} value={t.key}>
                      {t.label}
                    </TabsTab>
                  ))}
                </TabsList>
              </Tabs>
              <div className="flex-1" />
              {w && !draft?.enabled && <Badge variant="secondary">Paused</Badge>}
              {w && <span className="text-xs text-muted-foreground">Version {w.version} · {w.runs.toLocaleString()} {w.runs === 1 ? "run" : "runs"}</span>}
            </div>
            {w && draft && tab === "editor" && <Editor draft={draft} patch={patch} />}
            {w && tab === "runs" && <Runs workflow={w} />}
            {w && draft && tab === "settings" && <Settings workflow={w} draft={draft} patch={patch} />}
          </>
        )}
      </ListState>
    </WorkspaceFrame>
  );
}

// ---- Editor ----

function Editor({ draft, patch }: { draft: Draft; patch: (fn: (d: Draft) => Draft) => void }): React.ReactElement {
  const { ws } = useShell();
  const catalog = useHookCatalog(ws.id);
  const events = catalog.data?.events ?? [];
  const steps = catalog.data?.steps ?? [];
  const http = steps.find((s) => s.type === HTTP_STEP) ?? { type: HTTP_STEP, label: "Send an HTTP request", fields: [] };
  const def = draft.definition;
  const setDef = (fn: (d: WorkflowDef) => WorkflowDef) => patch((d) => ({ ...d, definition: fn(d.definition) }));
  const setTrigger = (event: string) => setDef((d) => (event === "none" ? { ...d, trigger: null } : { ...d, trigger: { ...(d.trigger ?? {}), event } }));
  const add = (entry: StepCatalogEntry) => setDef((d) => ({ ...d, steps: [...d.steps, newStep(entry)] }));
  const update = (i: number, input: Record<string, unknown>) => setDef((d) => ({ ...d, steps: d.steps.map((s, j) => (j === i ? { ...s, input } : s)) }));
  const remove = (i: number) => setDef((d) => ({ ...d, steps: d.steps.filter((_, j) => j !== i) }));
  const move = (i: number, dir: -1 | 1) =>
    setDef((d) => {
      const next = [...d.steps];
      const j = i + dir;
      if (j < 0 || j >= next.length) return d;
      [next[i], next[j]] = [next[j]!, next[i]!];
      return { ...d, steps: next };
    });
  const seen = events.filter((e) => !e.reserved || e.count > 0);
  const reserved = events.filter((e) => e.reserved && e.count === 0);
  const triggerValue = def.trigger?.event ?? "none";
  const known = events.some((e) => e.name === triggerValue);
  const others = steps.filter((s) => s.type !== HTTP_STEP);

  return (
    <>
      <Card title="Trigger" description="The event that starts a run. Every enabled workflow whose trigger matches runs once per event.">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={triggerValue} onValueChange={(v) => setTrigger(String(v))} items={[{ value: "none", label: "No trigger (run by hand)" }, ...(known ? [] : [{ value: triggerValue, label: triggerValue }]), ...events.map((e) => ({ value: e.name, label: e.name }))]}>
            <SelectTrigger className="w-80 max-w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectPopup>
              <SelectItem value="none">No trigger (run by hand)</SelectItem>
              {!known && triggerValue !== "none" && <SelectItem value={triggerValue}>{triggerValue}</SelectItem>}
              {seen.length > 0 && (
                <SelectGroup>
                  <SelectGroupLabel>Seen in the last 90 days</SelectGroupLabel>
                  {seen.map((e) => (
                    <SelectItem key={e.name} value={e.name}>
                      <span className="font-mono text-xs">{e.name}</span>
                      <span className="ms-auto ps-3 text-xs text-muted-foreground tabular-nums">{e.count.toLocaleString()}</span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
              {reserved.length > 0 && (
                <SelectGroup>
                  <SelectGroupLabel>Core events</SelectGroupLabel>
                  {reserved.map((e) => (
                    <SelectItem key={e.name} value={e.name}>
                      <span className="font-mono text-xs">{e.name}</span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              )}
            </SelectPopup>
          </Select>
          {def.trigger?.when?.length ? <Badge variant="info">{def.trigger.when.length} {def.trigger.when.length === 1 ? "condition" : "conditions"}</Badge> : null}
          {catalog.loading && !catalog.data && <span className="text-xs text-muted-foreground">Reading the workspace's events…</span>}
          {catalog.error && !catalog.data && <span className="text-xs text-destructive-foreground">{catalog.error}</span>}
        </div>
      </Card>

      <Card
        title="Steps"
        description="Run in order, each with the event and its contact at hand. Values may use templates like {{event.props.email}} or {{secrets.API_KEY}}."
        actions={
          <div className="flex items-center gap-1.5">
            <Button size="xs" variant="outline" onClick={() => add(http)}>
              <PlusIcon />
              HTTP Request
            </Button>
            {others.length > 0 && (
              <Menu>
                <MenuTrigger render={<Button size="xs" variant="ghost" />}>
                  More
                  <ChevronDownIcon />
                </MenuTrigger>
                <MenuPopup align="end" className="min-w-56">
                  <MenuGroup>
                    <MenuGroupLabel>Other steps the workspace runs</MenuGroupLabel>
                    {others.map((s) => (
                      <MenuItem key={s.type} onClick={() => add(s)}>
                        {s.label}
                      </MenuItem>
                    ))}
                  </MenuGroup>
                </MenuPopup>
              </Menu>
            )}
          </div>
        }
      >
        {def.steps.length === 0 ? (
          <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">No steps yet. Add an HTTP request: the workspace POSTs the event to a URL you choose.</div>
        ) : (
          <ol className="flex flex-col gap-3">
            {def.steps.map((s, i) => (
              <StepCard key={s.id} index={i} step={s} entry={steps.find((e) => e.type === s.type)} last={i === def.steps.length - 1} onChange={(input) => update(i, input)} onRemove={() => remove(i)} onMove={(dir) => move(i, dir)} />
            ))}
          </ol>
        )}
      </Card>

      <Card title="Definition" description="The JSON the workspace stores and runs. Saving bumps the version; a run keeps the version it started with.">
        <CodeBlock code={JSON.stringify(def, null, 2)} what="JSON" />
      </Card>
    </>
  );
}

function StepCard({ index, step, entry, last, onChange, onRemove, onMove }: { index: number; step: WorkflowStep; entry?: StepCatalogEntry; last: boolean; onChange: (input: Record<string, unknown>) => void; onRemove: () => void; onMove: (dir: -1 | 1) => void }): React.ReactElement {
  const fields: FieldDef[] = entry?.fields ?? Object.keys(step.input).map((k) => ({ key: k, label: k, type: "text" }));
  const set = (key: string, value: unknown) => onChange({ ...step.input, [key]: value });
  const isHttp = step.type === HTTP_STEP;
  return (
    <li className="flex flex-col gap-3 rounded-xl border bg-background p-4">
      <div className="flex items-center gap-2">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-medium tabular-nums">{index + 1}</span>
        <span className="flex size-4 items-center justify-center text-muted-foreground [&_svg]:size-4">{isHttp ? <GlobeIcon /> : <WorkflowIcon />}</span>
        <span className="text-sm font-medium">{entry?.label ?? step.type}</span>
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">{step.type}</code>
        <div className="flex-1" />
        <Button size="icon-xs" variant="ghost" aria-label="Move Up" disabled={index === 0} onClick={() => onMove(-1)} className="text-muted-foreground">
          <ChevronDownIcon className="rotate-180" />
        </Button>
        <Button size="icon-xs" variant="ghost" aria-label="Move Down" disabled={last} onClick={() => onMove(1)} className="text-muted-foreground">
          <ChevronDownIcon />
        </Button>
        <Button size="icon-xs" variant="ghost" aria-label="Remove Step" onClick={onRemove} className="text-muted-foreground">
          <XIcon />
        </Button>
      </div>
      {entry?.description && <p className="text-xs text-muted-foreground">{entry.description}</p>}
      <div className={cn("grid gap-3", isHttp ? "sm:grid-cols-[1fr_8rem]" : "sm:grid-cols-2")}>
        {fields.map((f) => {
          const v = step.input[f.key];
          const text = v == null ? "" : typeof v === "string" ? v : JSON.stringify(v);
          const long = /json|body|headers|conditions|doc/i.test(f.label) || f.key === "body";
          const wide = long || f.type === "url";
          return (
            <Field key={f.key} label={f.required ? `${f.label} *` : f.label} className={cn(wide && "sm:col-span-full", isHttp && f.key === "url" && "sm:col-span-1", isHttp && f.key === "method" && "sm:col-span-1")}>
              {f.type === "select" && f.options ? (
                <Select value={text || f.options[0] || ""} onValueChange={(val) => set(f.key, String(val))} items={f.options.map((o) => ({ value: o, label: o }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPopup>
                    {f.options.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectPopup>
                </Select>
              ) : long ? (
                <Textarea value={text} onChange={(e) => set(f.key, e.target.value)} rows={3} spellCheck={false} className="font-mono text-xs" placeholder={f.key === "body" ? "Defaults to the event and contact as JSON" : f.key === "headers" ? '{ "authorization": "Bearer {{secrets.API_KEY}}" }' : ""} />
              ) : (
                <Input type={f.type === "number" ? "number" : "text"} value={text} onChange={(e) => set(f.key, f.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)} placeholder={f.type === "url" ? "https://" : ""} spellCheck={false} className={f.type === "url" ? "font-mono text-xs" : undefined} />
              )}
            </Field>
          );
        })}
      </div>
    </li>
  );
}

// ---- Runs ----

function Runs({ workflow }: { workflow: Workflow }): React.ReactElement {
  const { ws } = useShell();
  const runs = useRuns(ws.id, { workflowId: workflow.id, limit: 100 });
  const [open, setOpen] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<Record<string, HookRunRow | null>>({});
  const [starting, setStarting] = React.useState(false);
  const list = runs.data ?? [];
  const failed = list.filter((r) => r.status === "failed").length;
  const toggle = (r: HookRunRow) => {
    const next = open === r.id ? null : r.id;
    setOpen(next);
    if (next && !(next in detail)) getRun(ws.id, next).then((d) => setDetail((m) => ({ ...m, [next]: d })), () => setDetail((m) => ({ ...m, [next]: null })));
  };
  const test = async () => {
    setStarting(true);
    try {
      const run = await runWorkflow(ws.id, workflow.id);
      toastManager.add({ title: run.status === "failed" ? "Test Run Failed" : "Test Run Started", description: run.error ?? `Against a workflow.test event, run ${run.id}.`, type: run.status === "failed" ? "error" : "success", timeout: 3000 });
      setDetail((m) => ({ ...m, [run.id]: run }));
      setOpen(run.id);
    } catch (e) {
      toastManager.add({ title: "Could Not Start a Run", description: clean(e), type: "error" });
    } finally {
      setStarting(false);
    }
  };
  return (
    <>
      <Card padded={false}>
        <div className="grid grid-cols-3 divide-x">
          <StatTile label="Runs Shown" value={list.length.toLocaleString()} hint={workflow.runs > list.length ? `of ${workflow.runs.toLocaleString()}` : undefined} />
          <StatTile label="Completed" value={list.filter((r) => r.status === "completed").length.toLocaleString()} />
          <StatTile label="Failed" value={failed.toLocaleString()} hint={failed ? "see the error on each row" : undefined} />
        </div>
      </Card>
      <Card
        title="Runs"
        description="Newest first. A test run uses a synthetic workflow.test event, so the workflow can be tried before its trigger fires."
        padded={false}
        actions={
          <div className="flex items-center gap-1.5">
            <Button size="xs" variant="ghost" disabled={runs.loading} onClick={() => void runs.refresh()} className="text-foreground/70 hover:text-foreground">
              <RefreshCwIcon className={runs.loading ? "animate-spin" : undefined} />
              Reload
            </Button>
            <Button size="xs" variant="outline" loading={starting} onClick={() => void test()}>
              <PlayIcon />
              Run a Test
            </Button>
          </div>
        }
      >
        <ListState
          data={runs.data}
          error={runs.error}
          loading={runs.loading}
          onRetry={() => void runs.refresh()}
          isEmpty={(d) => d.length === 0}
          empty={<div className="px-4 py-10 text-center text-sm text-muted-foreground">No runs yet. Run a test, or wait for the trigger to fire.</div>}
        >
          {(rows) => (
            <DataTable<HookRunRow>
              rows={rows}
              rowKey={(r) => r.id}
              onRowClick={toggle}
              expanded={open}
              renderExpanded={(r) => <RunDetail run={detail[r.id] === undefined ? undefined : detail[r.id]} fallback={r} />}
              columns={[
                { key: "status", label: "Status", width: "8rem", render: (r) => <RunStatusBadge status={r.status} /> },
                { key: "event", label: "Event", render: (r) => <code className="font-mono text-xs">{r.event_name}</code> },
                { key: "version", label: "Version", width: "5rem", align: "end", className: "max-sm:hidden", render: (r) => <span className="tabular-nums text-muted-foreground">{r.workflow_version ?? ""}</span> },
                { key: "started", label: "Started", width: "9rem", render: (r) => <span title={absolute(r.started_at)}>{relative(r.started_at)}</span> },
                { key: "took", label: "Took", width: "5rem", align: "end", render: (r) => <span className="tabular-nums text-muted-foreground">{duration(r.started_at, r.finished_at)}</span> },
                { key: "error", label: "Error", className: "max-md:hidden", render: (r) => <span className="block max-w-80 truncate text-destructive-foreground">{r.error ?? ""}</span> },
              ]}
            />
          )}
        </ListState>
      </Card>
    </>
  );
}

function RunDetail({ run, fallback }: { run: HookRunRow | null | undefined; fallback: HookRunRow }): React.ReactElement {
  const r = run ?? fallback;
  return (
    <div className="flex flex-col gap-3 text-[13px]">
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
        <span>
          Run <code className="font-mono">{r.id}</code>
        </span>
        <span>
          Event <code className="font-mono">{r.event_id}</code>
        </span>
        {r.contact_id && (
          <span>
            Contact <code className="font-mono">{r.contact_id}</code>
          </span>
        )}
        <span>Started {absolute(r.started_at)}</span>
        {r.finished_at && <span>Finished {absolute(r.finished_at)}</span>}
      </div>
      {r.error && <div className="rounded-lg border border-destructive/30 bg-destructive/6 px-3 py-2 text-destructive-foreground">{r.error}</div>}
      {run === undefined ? (
        <span className="text-xs text-muted-foreground">Reading the steps…</span>
      ) : !r.steps?.length ? (
        <span className="text-xs text-muted-foreground">No step finished in this run.</span>
      ) : (
        <ol className="flex flex-col gap-2">
          {r.steps.map((s) => (
            <li key={s.idx} className="flex flex-col gap-1 rounded-lg border bg-background px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="flex size-5 items-center justify-center rounded bg-muted text-[11px] tabular-nums">{s.idx + 1}</span>
                <code className="font-mono text-xs">{s.type}</code>
                <RunStatusBadge status={s.status === "done" ? "completed" : s.status} />
                <span className="ms-auto text-xs text-muted-foreground">{s.finished_at ? relative(s.finished_at) : ""}</span>
              </div>
              {s.output != null && <pre className="overflow-x-auto rounded bg-muted/50 p-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-all">{JSON.stringify(s.output, null, 2)}</pre>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

// ---- Settings ----

const ZONES = (() => {
  try {
    return (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone") ?? [];
  } catch {
    return [];
  }
})();
const COMMON = ["UTC", "America/Los_Angeles", "America/Denver", "America/Chicago", "America/New_York", "Europe/London", "Europe/Berlin", "Asia/Tokyo", "Australia/Sydney"];

function Settings({ workflow, draft, patch }: { workflow: Workflow; draft: Draft; patch: (fn: (d: Draft) => Draft) => void }): React.ReactElement {
  const { ws } = useShell();
  const navigate = useNavigate();
  const [local, setLocal] = useLocalWorkflowSettings(ws.id, workflow.id);
  const runs = useRuns(ws.id, { workflowId: workflow.id, limit: 100 });
  const [confirm, setConfirm] = React.useState(false);
  const [removing, setRemoving] = React.useState(false);
  const list = runs.data ?? [];
  const failed = list.filter((r) => r.status === "failed");
  const lastError = failed[0];
  const zones = [...new Set([local.timezone, ...COMMON, ...ZONES])];
  const remove = async () => {
    setRemoving(true);
    try {
      await removeWorkflow(ws.id, workflow.id);
      navigate(`/w/${ws.id}/workflows`);
    } catch (e) {
      toastManager.add({ title: "Workflow Was Not Deleted", description: clean(e), type: "error" });
      setRemoving(false);
    }
  };
  return (
    <>
      <Card title="General">
        <div className="flex flex-col gap-4">
          <Field label="Name">
            <Input value={draft.name} onChange={(e) => patch((d) => ({ ...d, name: e.target.value }))} className="max-w-md" />
          </Field>
          <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
            <div>
              <div className="text-sm font-medium">Enabled</div>
              <div className="text-xs text-muted-foreground">Paused, the trigger is ignored and nothing runs. Saved with the workflow.</div>
            </div>
            <Switch checked={draft.enabled} onCheckedChange={(on) => patch((d) => ({ ...d, enabled: on }))} aria-label="Enabled" />
          </div>
        </div>
      </Card>
      <Card title="Timezone" description="How times in this workflow's templates and waits are read. Kept on this Mac for now; the workspace does not store it yet.">
        <Select value={local.timezone} onValueChange={(v) => setLocal({ timezone: String(v) })} items={zones.map((z) => ({ value: z, label: z }))}>
          <SelectTrigger className="w-80 max-w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectPopup>
            {zones.map((z) => (
              <SelectItem key={z} value={z}>
                {z}
              </SelectItem>
            ))}
          </SelectPopup>
        </Select>
      </Card>
      <Card title="Failures" description="From the latest runs. A failed run keeps its error on the Runs tab." padded={false}>
        <div className="grid grid-cols-3 divide-x">
          <StatTile label="Failed" value={failed.length.toLocaleString()} hint={list.length ? `of the last ${list.length.toLocaleString()}` : undefined} />
          <StatTile label="Last Failure" value={lastError ? relative(lastError.started_at) : "None"} hint={lastError ? absolute(lastError.started_at) : undefined} />
          <StatTile label="Last Run" value={workflow.last_run ? relative(workflow.last_run) : "Never"} />
        </div>
        {lastError?.error && <div className="border-t px-4 py-3 text-[13px] text-destructive-foreground">{lastError.error}</div>}
      </Card>
      <Card title="Danger Zone" description="Deleting a workflow removes its trigger. Its runs stay in the log.">
        <Button variant="destructive" size="sm" onClick={() => setConfirm(true)}>
          <Trash2Icon />
          Delete Workflow
        </Button>
        <ConfirmDialog open={confirm} onOpenChange={setConfirm} title={`Delete ${workflow.name}?`} description="Its trigger stops at once. This cannot be undone." pending={removing} onConfirm={() => void remove()} />
      </Card>
    </>
  );
}

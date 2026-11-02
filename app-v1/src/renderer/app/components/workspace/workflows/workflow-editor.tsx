import type { When, Workflow, WorkflowDef, WorkflowStep } from "@supergrid/app-kit/rpc";
import { PlayIcon, Trash2Icon, WorkflowIcon } from "lucide-react";
import * as React from "react";
import { ConfirmDialog } from "~/components/workspace/confirm-dialog";
import { FieldRow } from "~/components/workspace/contacts/fields-form";
import { EventCombobox } from "~/components/workspace/event-picker";
import { Card, Crumbs, IconButton, WorkspaceFrame } from "~/components/workspace/frame";
import { RowsSkeleton } from "~/components/workspace/query-states";
import { WhenList } from "~/components/workspace/when-editor";
import { RunTestDialog } from "~/components/workspace/workflows/run-dialog";
import { RunsTab } from "~/components/workspace/workflows/runs-tab";
import { StepList } from "~/components/workspace/workflows/step-list";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Switch } from "~/components/ui/switch";
import { Tabs, TabsList, TabsPanel, TabsTab } from "~/components/ui/tabs";
import { toastManager } from "~/components/ui/toast";
import type { Workspace } from "~/lib/mock";
import { useWorkspacePage } from "~/lib/workspace-page";
import { stableStringify, useWsMutation, useWsQuery } from "~/lib/ws-query";

// One workflow: its name, trigger and steps on the editor tab, its runs on the other. The
// draft lives here until Save; `new` starts blank and lands on the saved id.

type Draft = { name: string; enabled: boolean; definition: WorkflowDef };

const blank: Draft = { name: "", enabled: true, definition: { trigger: null, steps: [] } };
const draftOf = (w: Workflow): Draft => ({ name: w.name, enabled: w.enabled, definition: { trigger: w.definition.trigger ?? null, steps: w.definition.steps } });

export function WorkflowEditorPage({ ws, id, tab, onOpenNav }: { ws: Workspace; id: string; tab?: "editor" | "runs"; onOpenNav: () => void }): React.ReactElement {
  const { go } = useWorkspacePage();
  const isNew = id === "new";
  const loaded = useWsQuery(ws.id, "getWorkflow", [id], { tags: ["workflows"], enabled: !isNew });
  const catalog = useWsQuery(ws.id, "hookCatalog", [], { tags: ["hooks", "workflows", "events"] });
  const [draft, setDraft] = React.useState<Draft>(blank);
  const [base, setBase] = React.useState<string>(stableStringify(blank));
  const [testing, setTesting] = React.useState(false);
  const [confirm, setConfirm] = React.useState(false);
  // the loaded row becomes the draft once, and again after a save; edits in between are kept
  const loadedKey = loaded.data ? stableStringify(draftOf(loaded.data)) : null;
  React.useEffect(() => {
    if (isNew) { setDraft(blank); setBase(stableStringify(blank)); return; }
    if (loaded.data && loadedKey && loadedKey !== base) {
      const next = draftOf(loaded.data);
      setDraft(next);
      setBase(loadedKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs when the server copy changes, not on every draft edit
  }, [isNew, loadedKey]);
  const dirty = stableStringify(draft) !== base;
  const save = useWsMutation(ws.id, "saveWorkflow", { invalidates: ["workflows", "hooks", "listWorkflows", "getWorkflow", "listHooks", "hookCatalog"], title: "Workflow did not save" });
  const remove = useWsMutation(ws.id, "removeWorkflow", { invalidates: ["workflows", "hooks", "listWorkflows", "listHooks", "hookCatalog"], title: "Workflow was not deleted" });
  const labels = React.useMemo(() => new Map((catalog.data?.steps ?? []).map((s) => [s.type, s.label])), [catalog.data]);

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const setDef = (patch: Partial<WorkflowDef>) => setDraft((d) => ({ ...d, definition: { ...d.definition, ...patch } }));
  const trigger = draft.definition.trigger ?? null;
  const problems: string[] = [];
  if (!draft.name.trim()) problems.push("a name");
  if (trigger && !trigger.event.trim()) problems.push("a trigger event");
  if (draft.definition.steps.length === 0) problems.push("at least one step");

  const submit = async () => {
    const definition: WorkflowDef = { trigger: trigger ? { event: trigger.event.trim(), ...(trigger.when?.length ? { when: trigger.when } : {}) } : null, steps: draft.definition.steps };
    const out = await save.run({ id: isNew ? undefined : id, name: draft.name.trim(), definition, enabled: draft.enabled });
    if (!out) return;
    setBase(stableStringify(draftOf(out)));
    setDraft(draftOf(out));
    toastManager.add({ title: `Saved v${out.version}`, type: "success", timeout: 1500 });
    if (isNew) go({ kind: "workflows", id: out.id });
  };

  const title = isNew ? "New workflow" : (draft.name || loaded.data?.name || "Workflow");
  return (
    <WorkspaceFrame
      icon={<WorkflowIcon />}
      title={<Crumbs items={[<button key="l" type="button" onClick={() => go({ kind: "workflows" })} className="cursor-pointer text-muted-foreground hover:text-foreground">Workflows</button>, title]} />}
      onOpenNav={onOpenNav}
      width="default"
      actions={
        <>
          {!isNew && (
            <IconButton label="Delete workflow" onClick={() => setConfirm(true)}>
              <Trash2Icon />
            </IconButton>
          )}
          <Button size="xs" variant="outline" disabled={isNew || dirty} onClick={() => setTesting(true)} title={isNew ? "Save the workflow first" : dirty ? "Save your changes first" : undefined}>
            <PlayIcon />
            Run test…
          </Button>
          <Button size="xs" disabled={!dirty || problems.length > 0} loading={save.pending} onClick={() => void submit()} title={problems.length ? `Needs ${problems.join(", ")}` : undefined}>
            Save
          </Button>
        </>
      }
    >
      {!isNew && loaded.data === undefined ? (
        loaded.error ? (
          <div className="py-10 text-center text-[13px] text-destructive-foreground">{loaded.error}</div>
        ) : (
          <RowsSkeleton />
        )
      ) : !isNew && loaded.data === null ? (
        <div className="py-10 text-center text-[13px] text-muted-foreground">No workflow with id {id}.</div>
      ) : (
        <Tabs value={tab ?? "editor"} onValueChange={(v) => go({ kind: "workflows", id, tab: v === "runs" ? "runs" : "editor" })} className="gap-4">
          <TabsList size="sm">
            <TabsTab value="editor">Editor</TabsTab>
            <TabsTab value="runs" disabled={isNew}>
              Runs{loaded.data?.runs ? ` (${loaded.data.runs.toLocaleString()})` : ""}
            </TabsTab>
          </TabsList>
          <TabsPanel value="editor" className="flex flex-col gap-5">
            <Card title="Workflow">
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
                <FieldRow label="Name">
                  <Input size="sm" value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="Welcome pro signups" autoFocus={isNew} />
                </FieldRow>
                <FieldRow label="Enabled" hint="Off, the trigger is ignored; tests still run.">
                  <span className="flex h-7.5 items-center">
                    <Switch checked={draft.enabled} onCheckedChange={(v) => set({ enabled: v })} />
                  </span>
                </FieldRow>
              </div>
            </Card>
            <Card
              title="Trigger"
              description={trigger ? "Runs once for every matching event." : "No trigger: runs only by hand."}
              actions={
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  On an event
                  <Switch checked={!!trigger} onCheckedChange={(on) => setDef({ trigger: on ? { event: "", when: [] } : null })} />
                </label>
              }
            >
              {trigger && (
                <div className="flex flex-col gap-4">
                  <FieldRow label="Event">
                    <EventCombobox names={catalog.data?.events ?? []} value={trigger.event} onChange={(event) => setDef({ trigger: { ...trigger, event } })} autoFocus={!trigger.event} />
                  </FieldRow>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[13px] font-medium">Only when</span>
                    <WhenList value={trigger.when ?? []} onChange={(when: When[]) => setDef({ trigger: { ...trigger, when } })} />
                  </div>
                </div>
              )}
            </Card>
            <Card title="Steps" description="Run in order. A failing step is retried three times, then fails the run.">
              {catalog.data ? <StepList steps={draft.definition.steps} catalog={catalog.data.steps} onChange={(steps: WorkflowStep[]) => setDef({ steps })} /> : <RowsSkeleton rows={2} className="px-0" />}
            </Card>
          </TabsPanel>
          <TabsPanel value="runs">{!isNew && <RunsTab ws={ws} workflowId={id} labels={labels} />}</TabsPanel>
        </Tabs>
      )}
      <div className="h-6" />
      {!isNew && <RunTestDialog ws={ws} workflowId={id} open={testing} onOpenChange={setTesting} labels={labels} />}
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={`Delete ${draft.name || "this workflow"}?`}
        description="Its hook goes with it. Past runs stay in the log."
        pending={remove.pending}
        onConfirm={() => {
          void remove.run(id).then((out) => {
            if (out !== null) go({ kind: "workflows" });
          });
        }}
      />
    </WorkspaceFrame>
  );
}

import type { HookRunRow, HookRunStep, RunStatus } from "@supergrid/app-kit/rpc";
import { PlayIcon } from "lucide-react";
import * as React from "react";
import { ContactPicker } from "~/components/workspace/contacts/objects-page";
import { FieldRow } from "~/components/workspace/contacts/fields-form";
import { absolute, relative } from "~/components/workspace/contacts/util";
import { RowsSkeleton } from "~/components/workspace/query-states";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Dialog, DialogClose, DialogDescription, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "~/components/ui/dialog";
import { Textarea } from "~/components/ui/textarea";
import type { Workspace } from "~/lib/mock";
import { invalidate, useWsMutation, useWsQuery } from "~/lib/ws-query";

// One hook run, step by step. The same view serves a test run started from the editor (which
// polls while the run is queued or running) and a finished run opened from a list.

const POLL_MS = 1500;
const POLL_FOR_MS = 30_000;

export const STATUS_VARIANT: Record<string, "success" | "error" | "info" | "secondary" | "warning"> = { completed: "success", failed: "error", running: "info", queued: "secondary", skipped: "warning" };

export function StatusBadge({ status }: { status: RunStatus | string }): React.ReactElement {
  return (
    <Badge variant={STATUS_VARIANT[status] ?? "secondary"} size="sm" className="capitalize">
      {status}
    </Badge>
  );
}

/** Seconds between two stamps, or how long since the first when the second is missing. */
export function duration(start: string, end: string | null): string {
  const ms = (end ? new Date(end).getTime() : Date.now()) - new Date(start).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  const m = Math.floor(ms / 60_000);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
}

const live = (r: HookRunRow | null | undefined): boolean => !!r && (r.status === "queued" || r.status === "running");

/** `getRun`, refreshed every 1.5s while the run is still going, for up to 30s. */
export function useRun(ws: Workspace, runId: string | null): ReturnType<typeof useWsQuery<"getRun">> {
  const q = useWsQuery(ws.id, "getRun", [runId ?? ""], { tags: ["runs"], enabled: !!runId });
  const refetch = q.refetch;
  const isLive = live(q.data);
  React.useEffect(() => {
    if (!runId || !isLive) return;
    const started = Date.now();
    const t = setInterval(() => {
      if (Date.now() - started > POLL_FOR_MS) { clearInterval(t); return; }
      void refetch();
    }, POLL_MS);
    return () => clearInterval(t);
  }, [runId, isLive, refetch]);
  // once it settles, the lists showing counts and last runs are stale
  React.useEffect(() => {
    if (runId && q.data && !isLive) invalidate(ws.id, "listRuns", "listWorkflows");
  }, [ws.id, runId, isLive, q.data]);
  return q;
}

function Output({ value }: { value: unknown }): React.ReactElement | null {
  if (value == null) return null;
  return <pre className="mt-1 max-h-40 overflow-auto rounded-md border bg-background p-2 font-mono text-[11px] leading-snug">{typeof value === "string" ? value : JSON.stringify(value, null, 2)}</pre>;
}

export function RunSteps({ run, labels }: { run: HookRunRow; labels?: Map<string, string> }): React.ReactElement {
  const steps: HookRunStep[] = run.steps ?? [];
  return (
    <div className="flex flex-col gap-3 text-xs">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
        <StatusBadge status={run.status} />
        <span className="font-mono">{run.event_name}</span>
        <span title={absolute(run.started_at)}>started {relative(run.started_at)}</span>
        <span>{duration(run.started_at, run.finished_at)}</span>
        {run.workflow_version != null && <span>v{run.workflow_version}</span>}
      </div>
      {run.error && <div className="rounded-md bg-destructive/8 px-2.5 py-2 text-destructive-foreground">{run.error}</div>}
      {steps.length === 0 ? (
        <div className="text-muted-foreground">{run.workflow_id ? "No steps recorded." : "A single action; nothing more to show."}</div>
      ) : (
        <ol className="flex flex-col gap-2">
          {steps.map((s) => (
            <li key={`${s.idx}:${s.step_id}`} className="rounded-lg border px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="w-4 text-muted-foreground tabular-nums">{s.idx + 1}</span>
                <span className="font-medium">{labels?.get(s.type) ?? s.type}</span>
                {s.step_id && <span className="font-mono text-muted-foreground">{s.step_id}</span>}
                <span className="flex-1" />
                {s.finished_at && <span className="text-muted-foreground" title={absolute(s.finished_at)}>{relative(s.finished_at)}</span>}
                <StatusBadge status={s.status} />
              </div>
              <Output value={s.output} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** Loads one run and shows its steps; polls while it is going. */
export function RunDetail({ ws, runId, labels }: { ws: Workspace; runId: string; labels?: Map<string, string> }): React.ReactElement {
  const q = useRun(ws, runId);
  if (q.error && !q.data) return <div className="text-xs text-destructive-foreground">{q.error}</div>;
  if (!q.data) return <RowsSkeleton rows={3} className="px-0 py-0" />;
  return <RunSteps run={q.data} labels={labels} />;
}

export function RunDetailsDialog({ ws, runId, onOpenChange, labels }: { ws: Workspace; runId: string | null; onOpenChange: (open: boolean) => void; labels?: Map<string, string> }): React.ReactElement {
  return (
    <Dialog open={!!runId} onOpenChange={onOpenChange}>
      <DialogPopup className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Run {runId}</DialogTitle>
          <DialogDescription>What each step did, in order.</DialogDescription>
        </DialogHeader>
        <DialogPanel>{runId && <RunDetail ws={ws} runId={runId} labels={labels} />}</DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>Close</DialogClose>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

// Trying a workflow out: an optional contact and some props become a synthetic
// `workflow.test` event; the run then shows here as it goes.
export function RunTestDialog({ ws, workflowId, open, onOpenChange, labels }: { ws: Workspace; workflowId: string; open: boolean; onOpenChange: (open: boolean) => void; labels?: Map<string, string> }): React.ReactElement {
  const [contactId, setContactId] = React.useState<string | null>(null);
  const [props, setProps] = React.useState("{}");
  const [runId, setRunId] = React.useState<string | null>(null);
  const run = useWsMutation(ws.id, "runWorkflow", { invalidates: ["listRuns", "listWorkflows"], title: "The test run did not start" });
  React.useEffect(() => {
    if (open) {
      setRunId(null);
      setProps("{}");
    }
  }, [open]);
  let parsed: Record<string, unknown> | undefined;
  let error: string | null = null;
  try {
    const v: unknown = props.trim() ? JSON.parse(props) : {};
    if (v && typeof v === "object" && !Array.isArray(v)) parsed = v as Record<string, unknown>;
    else error = "Props must be a JSON object";
  } catch (e) {
    error = (e as Error).message;
  }
  const start = async () => {
    if (!parsed) return;
    const out = await run.run(workflowId, { contactId: contactId ?? undefined, props: parsed });
    if (out) setRunId(out.id);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Run a test</DialogTitle>
          <DialogDescription>Runs the saved version now against a `workflow.test` event. Steps that act on a contact need one.</DialogDescription>
        </DialogHeader>
        <DialogPanel>
          {runId ? (
            <RunDetail ws={ws} runId={runId} labels={labels} />
          ) : (
            <div className="flex flex-col gap-4">
              <FieldRow label="Contact" hint="Who the event belongs to; leave empty for none.">
                <ContactPicker ws={ws} value={contactId} onChange={setContactId} />
              </FieldRow>
              <FieldRow label="Event props" hint={error ? <span className="text-destructive-foreground">{error}</span> : "Available to steps as {{event.props.x}}."}>
                <Textarea size="sm" value={props} onChange={(e) => setProps(e.target.value)} aria-invalid={!!error || undefined} className="font-mono text-xs" spellCheck={false} />
              </FieldRow>
            </div>
          )}
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>{runId ? "Close" : "Cancel"}</DialogClose>
          {runId ? (
            <Button variant="outline" onClick={() => setRunId(null)}>
              Run again
            </Button>
          ) : (
            <Button loading={run.pending} disabled={!!error} onClick={() => void start()}>
              <PlayIcon />
              Run
            </Button>
          )}
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

import type { EventName, EventPage, EventQuery, Hook, HookCatalog, HookRunRow, RunQuery, StepCatalogEntry, Workflow, WorkflowDef, WorkflowInput, WorkflowStep } from "@supergrid/app-kit/rpc";
import * as React from "react";
import { sg } from "~/lib/bridge";
import { invalidate, useRemote } from "~/lib/library";
import { clean } from "~/lib/workspaces";

// Workflows, hooks, runs and events, through the workspace's own RPC (`/_ws/rpc`, called from the
// main process with the workspace token). The workspace validates a definition on save and keeps
// the `wf:<id>` hook in step with its trigger (core/workspace/src/workflows.ts), so the pages
// never write these tables directly.

export type { EventName, EventPage, EventQuery, Hook, HookCatalog, HookRunRow, RunQuery, StepCatalogEntry, Workflow, WorkflowDef, WorkflowInput, WorkflowStep };

async function rpc<T>(wsId: string, method: string, args: unknown[] = []): Promise<T> {
  if (!sg) throw new Error("Workflows open inside the SuperGrid app.");
  try {
    return (await sg.ws.rpc(wsId, method, args)) as T;
  } catch (e) {
    throw new Error(clean(e));
  }
}

const keyOf = (wsId: string | null, what: string) => (wsId ? `wf:${wsId}:${what}` : null);

/** Every workflow in the workspace, by name, with its run count. */
export function useWorkflows(wsId: string | null) {
  return useRemote(keyOf(wsId, "list"), () => rpc<Workflow[]>(wsId!, "listWorkflows"));
}

export function useWorkflow(wsId: string | null, id: string | null) {
  return useRemote(wsId && id ? `wf:${wsId}:one:${id}` : null, () => rpc<Workflow | null>(wsId!, "getWorkflow", [id]));
}

/** The event names seen, the workflows and the step types the workspace runs. */
export function useHookCatalog(wsId: string | null) {
  return useRemote(keyOf(wsId, "catalog"), () => rpc<HookCatalog>(wsId!, "hookCatalog"));
}

export function useHooks(wsId: string | null) {
  return useRemote(keyOf(wsId, "hooks"), () => rpc<Hook[]>(wsId!, "listHooks"));
}

export function useRuns(wsId: string | null, query: RunQuery) {
  const q = JSON.stringify(query);
  return useRemote(wsId ? `wf:${wsId}:runs:${q}` : null, () => rpc<HookRunRow[]>(wsId!, "listRuns", [JSON.parse(q)]));
}

export const getRun = (wsId: string, id: string) => rpc<HookRunRow | null>(wsId, "getRun", [id]);

/** Create or replace. The workspace bumps the version and rewrites the trigger's hook. */
export async function saveWorkflow(wsId: string, input: WorkflowInput): Promise<Workflow> {
  const saved = await rpc<Workflow>(wsId, "saveWorkflow", [input]);
  invalidate(`wf:${wsId}:`);
  return saved;
}

export async function removeWorkflow(wsId: string, id: string): Promise<void> {
  await rpc(wsId, "removeWorkflow", [id]);
  invalidate(`wf:${wsId}:`);
}

/** A test run against a synthetic `workflow.test` event. */
export async function runWorkflow(wsId: string, id: string, input?: { contactId?: string; props?: Record<string, unknown> }): Promise<HookRunRow> {
  const run = await rpc<HookRunRow>(wsId, "runWorkflow", [id, input ?? {}]);
  invalidate(`wf:${wsId}:runs:`);
  invalidate(`wf:${wsId}:list`);
  invalidate(`wf:${wsId}:one:`);
  return run;
}

export const listEvents = (wsId: string, query: EventQuery) => rpc<EventPage>(wsId, "listEvents", [query]);

export function useEventNames(wsId: string | null) {
  return useRemote(keyOf(wsId, "events"), () => rpc<EventName[]>(wsId!, "eventNames"));
}

// ---- definitions as the editor sees them ----

/** The one step the editor builds: an HTTP request. */
export const HTTP_STEP = "http.request";

let n = 0;
export const stepId = () => `s${Date.now().toString(36)}${(n++).toString(36)}`;

export const emptyDefinition = (): WorkflowDef => ({ trigger: null, steps: [] });

export function newStep(entry: StepCatalogEntry): WorkflowStep {
  const input: Record<string, unknown> = {};
  if (entry.type === HTTP_STEP) input.method = "POST";
  return { id: stepId(), type: entry.type, input };
}

export const sameDefinition = (a: WorkflowDef, b: WorkflowDef) => JSON.stringify(a) === JSON.stringify(b);

/** "contact.created" → "Contact Created". */
export function eventLabel(name: string): string {
  return name
    .split(".")
    .map((w) => w.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase()))
    .join(" · ");
}

/** The settings the workspace does not hold yet (timezone), kept on this machine per workflow. */
export function useLocalWorkflowSettings(wsId: string, id: string): [{ timezone: string }, (patch: Partial<{ timezone: string }>) => void] {
  const key = `sg.wf.settings.${wsId}.${id}`;
  const read = () => {
    try {
      return { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, ...(JSON.parse(localStorage.getItem(key) ?? "{}") as Partial<{ timezone: string }>) };
    } catch {
      return { timezone: "UTC" };
    }
  };
  const [state, setState] = React.useState(read);
  const set = React.useCallback(
    (patch: Partial<{ timezone: string }>) =>
      setState((s) => {
        const next = { ...s, ...patch };
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {}
        return next;
      }),
    [key],
  );
  return [state, set];
}

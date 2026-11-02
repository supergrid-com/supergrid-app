// Workflows are JSON: a trigger and a flat list of steps. One Cloudflare Workflow class runs every hook, durably, with the
// definition snapshotted into the run. Without the binding the same loop runs inline (see `executeHook`).
import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import type { ContactFull, EventRow, Hook, HookRunRow, Workflow, WorkflowDef, WorkflowInput, WorkflowStep as Step } from "@supergrid/app-kit/rpc";
import { getFull } from "./contacts";
import { normalize } from "./events";
import { executeApp, executeHttp, getRun, startRun } from "./hooks";
import { nid, now } from "./ids";
import { STEPS, varsFor } from "./steps";
import type { Env } from "./types";
import { bool, EVENT_NAME, invalid, list, obj, str, whenList } from "./validate";

export type HookRunParams = { runId: string; hookId: string; action: Hook["action"]; config: Hook["config"]; definition: WorkflowDef | null; event: EventRow };
const MAX_INLINE_WAIT = 25;

/** How a run advances: durable steps inside the Workflow, plain calls inline. */
type Driver = { do<T>(name: string, fn: () => Promise<T>): Promise<T>; sleep(name: string, seconds: number): Promise<void> };

const recordStep = (db: D1Database, runId: string, idx: number, step: Step, status: string, output?: unknown) =>
  db.prepare("INSERT OR REPLACE INTO hook_run_steps (run_id, idx, step_id, type, status, output, finished_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(runId, idx, step.id, step.type, status, output === undefined ? null : JSON.stringify(output), now()).run();
const finish = (db: D1Database, runId: string, status: string, error?: string) =>
  db.prepare("UPDATE hook_runs SET status = ?, error = ?, finished_at = ? WHERE id = ?").bind(status, error ?? null, now(), runId).run();

async function runWith(env: Env, params: HookRunParams, d: Driver): Promise<void> {
  const { runId, event } = params;
  const db = env.DB;
  await d.do("start", async () => { await db.prepare("UPDATE hook_runs SET status = 'running' WHERE id = ?").bind(runId).run(); });
  try {
    if (params.action === "http") {
      const out = await d.do("http", async () => executeHttp(env, params.config, event, varsFor(event, event.contact_id ? await getFull(db, event.contact_id) : null)));
      await d.do("record", async () => { await recordStep(db, runId, 0, { id: "http", type: "http.request", input: {} }, "done", out); });
    } else if (params.action === "app") {
      const out = await d.do("app", () => executeApp(env, params.config.app ?? "", event));
      await d.do("record", async () => { await recordStep(db, runId, 0, { id: "app", type: "app", input: {} }, "done", out); });
    } else {
      const steps = params.definition?.steps ?? [];
      for (const [idx, step] of steps.entries()) {
        if (step.type === "wait") {
          const seconds = Math.max(1, Number(step.input.seconds) || 60);
          await d.sleep(`${idx}:wait`, seconds);
          await d.do(`${idx}:waited`, async () => { await recordStep(db, runId, idx, step, "done", { seconds }); });
          continue;
        }
        const def = STEPS[step.type];
        if (!def) throw new Error(`Unknown step type "${step.type}"`);
        const output = await d.do(`${idx}:${step.type}`, async () => {
          const contact: ContactFull | null = event.contact_id ? await getFull(db, event.contact_id) : null;
          const result = await def.run({ env, input: step.input, event, contact, vars: varsFor(event, contact) });
          await recordStep(db, runId, idx, step, "done", result ?? null);
          return (result ?? null) as Rpc.Serializable<unknown>;
        });
        if ((output as { stop?: boolean } | null)?.stop) break;
      }
    }
    await d.do("finish", async () => { await finish(db, runId, "completed"); });
  } catch (error) {
    await d.do("fail", async () => { await finish(db, runId, "failed", String((error as Error).message ?? error)); });
    throw error;
  }
}

export class HookRun extends WorkflowEntrypoint<Env, HookRunParams> {
  async run(event: WorkflowEvent<HookRunParams>, step: WorkflowStep) {
    await runWith(this.env, event.payload, {
      do: (name, fn) => step.do(name, { retries: { limit: 3, delay: "5 seconds", backoff: "exponential" }, timeout: "2 minutes" }, fn as () => Promise<Rpc.Serializable<unknown>>) as Promise<never>,
      sleep: (name, seconds) => step.sleep(name, `${seconds} seconds`),
    });
  }
}

/** The fallback without Workflows: same loop, no durability, waits capped so the request finishes. */
export async function executeHook(env: Env, params: HookRunParams): Promise<void> {
  await runWith(env, params, {
    do: (_name, fn) => fn(),
    sleep: async (_name, seconds) => { await new Promise((r) => setTimeout(r, Math.min(seconds, MAX_INLINE_WAIT) * 1000)); },
  }).catch((e) => console.error(`hook run ${params.runId} failed`, e));
}

// ---- Definitions --------------------------------------------------------------------------------------------------

type Row = { id: string; name: string; version: number; definition: string; enabled: number; created_at: string; updated_at: string; runs?: number; last_run?: string | null };
const wfOf = (r: Row): Workflow => ({ id: r.id, name: r.name, version: r.version, definition: JSON.parse(r.definition), enabled: !!r.enabled, runs: r.runs ?? 0, last_run: r.last_run ?? null, created_at: r.created_at, updated_at: r.updated_at });
const WITH_RUNS = "SELECT w.*, (SELECT COUNT(*) FROM hook_runs r WHERE r.workflow_id = w.id) AS runs, (SELECT MAX(started_at) FROM hook_runs r WHERE r.workflow_id = w.id) AS last_run FROM workflows w";

export function parseDefinition(v: unknown): WorkflowDef {
  const d = obj(v, "definition");
  const trigger = d.trigger == null ? null : obj(d.trigger, "trigger");
  const steps = list(d.steps, "steps", 50).map((s, i) => {
    const o = obj(s, `steps[${i}]`);
    const type = str(o.type, `steps[${i}].type`, { max: 60 });
    if (!STEPS[type]) invalid(`unknown step type ${type}`);
    return { id: o.id == null ? nid(8) : str(o.id, `steps[${i}].id`, { max: 40 }), type, input: obj(o.input, `steps[${i}].input`) };
  });
  return { trigger: trigger && { event: str(trigger.event, "trigger.event", { max: 100, re: EVENT_NAME }), when: trigger.when == null ? undefined : whenList(trigger.when, "trigger.when") }, steps };
}

export const listWorkflows = async (db: D1Database) => (await db.prepare(`${WITH_RUNS} ORDER BY w.name`).all<Row>()).results.map(wfOf);
export async function getWorkflow(db: D1Database, id: string): Promise<Workflow | null> {
  const row = await db.prepare(`${WITH_RUNS} WHERE w.id = ?`).bind(str(id, "id", { max: 64 })).first<Row>();
  return row ? wfOf(row) : null;
}

/** Saving bumps the version and keeps the `wf:<id>` hook in step with the trigger. */
export async function saveWorkflow(db: D1Database, input: WorkflowInput): Promise<Workflow> {
  const id = input.id == null ? nid() : str(input.id, "id", { max: 64 });
  const def = parseDefinition(input.definition);
  const enabled = bool(input.enabled, true);
  const stmts = [
    db.prepare(`INSERT INTO workflows (id, name, definition, enabled, updated_at) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name, definition = excluded.definition, enabled = excluded.enabled, version = workflows.version + 1, updated_at = excluded.updated_at`)
      .bind(id, str(input.name, "name", { max: 100 }), JSON.stringify(def), enabled ? 1 : 0, now()),
    def.trigger
      ? db.prepare(`INSERT INTO hooks (id, name, event, action, config, when_filter, enabled, updated_at) VALUES (?, ?, ?, 'workflow', ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET name = excluded.name, event = excluded.event, config = excluded.config, when_filter = excluded.when_filter, enabled = excluded.enabled, updated_at = excluded.updated_at`)
        .bind(`wf:${id}`, input.name, def.trigger.event, JSON.stringify({ workflowId: id }), def.trigger.when ? JSON.stringify(def.trigger.when) : null, enabled ? 1 : 0, now())
      : db.prepare("DELETE FROM hooks WHERE id = ?").bind(`wf:${id}`),
  ];
  await db.batch(stmts);
  return (await getWorkflow(db, id))!;
}

export const removeWorkflow = (db: D1Database, id: string) =>
  db.batch([db.prepare("DELETE FROM workflows WHERE id = ?").bind(str(id, "id", { max: 64 })), db.prepare("DELETE FROM hooks WHERE id = ?").bind(`wf:${id}`)]).then(() => {});

/** A manual run against a synthetic `workflow.test` event, so a workflow can be tried before any trigger fires. */
export async function runWorkflow(env: Env, id: string, input: { contactId?: string; props?: Record<string, unknown> } = {}): Promise<HookRunRow> {
  const wf = await getWorkflow(env.DB, id);
  if (!wf) invalid("unknown workflow");
  const i = obj(input, "input");
  const event = normalize("core", { name: "workflow.test", contactId: i.contactId == null ? null : str(i.contactId, "contactId", { max: 64 }), props: obj(i.props, "props") }, undefined, { core: true });
  await env.DB.prepare(`INSERT OR IGNORE INTO events (id, name, app_id, ts, contact_id, props) VALUES (?, ?, ?, ?, ?, ?)`).bind(event.id, event.name, event.app_id, event.ts, event.contact_id, JSON.stringify(event.props)).run();
  const hook: Hook = { id: `wf:${id}`, name: wf!.name, event: event.name, app_id: null, action: "workflow", config: { workflowId: id }, when: null, enabled: true, created_at: "", updated_at: "" };
  const runId = await startRun(env, hook, event, `test-${nid(12)}`);
  return (await getRun(env.DB, runId))!;
}

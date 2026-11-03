import { getSettings, provisionWorkspace, type Binding, type Cf, type ProvisionStep } from "@supergrid/cloud";
import { isPrefix, isWorkspaceId, newWorkspaceId } from "@supergrid/app-kit/names";
import type { WebContents } from "electron";
import type { InstalledApp, WorkspaceCreated, WorkspaceProgress, WorkspaceSummary } from "../shared/bridge";
import { channels } from "../shared/bridge";
import { cfClient } from "./cf-api";
import { readConfig, writeConfig } from "./config";
import { workspaceBundle, workspaceRelease } from "./feed";

// Workspaces are found in the account itself: every `<prefix>-ws-<id>` Worker is one, and its
// plain bindings say what was written there (name, URL, version, the apps it routes to). No
// directory is needed to list them. Creating one deploys the signed workspace release with
// provisionWorkspace from @supergrid/cloud, on cf's login.

type RouteEntry = InstalledApp & { binding?: string };

function readBindings(bindings: Binding[]) {
  const text = (name: string) => { const b = bindings.find((x) => x.name === name); return b && b.type === "plain_text" ? String((b as { text: string }).text) : null; };
  const json = <T>(name: string): T | null => { const b = bindings.find((x) => x.name === name); return b && b.type === "json" ? ((b as { json: T }).json ?? null) : null; };
  return { text, json };
}

async function summary(cf: Cf, worker: string, head: string): Promise<WorkspaceSummary | null> {
  try {
    const { bindings } = await getSettings(cf, worker);
    const b = readBindings(bindings);
    const id = b.text("WORKSPACE_ID") ?? worker.slice(head.length);
    const routes = b.json<RouteEntry[]>("ROUTES") ?? [];
    return {
      id,
      worker,
      name: b.text("WORKSPACE_NAME") ?? id,
      url: b.text("WORKSPACE_URL") ?? `https://${worker}.workers.dev`,
      version: b.text("SG_VERSION"),
      apps: routes.map(({ binding: _b, ...r }) => ({ ...r, name: r.name ?? r.app, admin: !!r.admin, api: !!r.api })),
    };
  } catch {
    return null; // a Worker we cannot read is not ours to show
  }
}

export async function listWorkspaces(accountId: string, prefix: string): Promise<WorkspaceSummary[]> {
  if (!isPrefix(prefix)) throw new Error(`"${prefix}" isn't a valid install prefix.`);
  const cf = await cfClient(accountId);
  const scripts = await cf.get<{ id: string }[]>(cf.acct("/workers/scripts"));
  const head = `${prefix}-ws-`;
  const names = scripts.map((s) => s.id).filter((id) => id.startsWith(head) && isWorkspaceId(id.slice(head.length)));
  const out = await Promise.all(names.map((worker) => summary(cf, worker, head)));
  return out.filter((w): w is WorkspaceSummary => !!w).sort((a, b) => a.name.localeCompare(b.name));
}

/** The workspace release a new workspace gets, from the signed feed. */
export async function nextRelease(): Promise<{ version: string; notes: string; publishedAt: string }> {
  const r = await workspaceRelease();
  return { version: r.version, notes: r.notes, publishedAt: r.publishedAt };
}

/** A fresh workspace id, checked against the Workers already in the account under this prefix. */
export async function freshId(accountId: string, prefix: string): Promise<string> {
  const cf = await cfClient(accountId);
  const taken = new Set((await cf.get<{ id: string }[]>(cf.acct("/workers/scripts"))).map((s) => s.id));
  for (;;) {
    const id = newWorkspaceId();
    if (!taken.has(`${prefix}-ws-${id}`)) return id;
  }
}

/**
 * Creates a workspace in the account: verifies and downloads the signed release, then provisions
 * it, reporting each step to the window that asked. Keeps the workspace's RPC token in the app's
 * config for later calls; the API token is cf's and is not kept.
 */
export async function createWorkspace(sender: WebContents, opts: { accountId: string; prefix: string; id: string; name: string }): Promise<WorkspaceCreated> {
  const report = (p: WorkspaceProgress) => {
    if (!sender.isDestroyed()) sender.send(channels.wsProgress, p);
  };
  if (!isPrefix(opts.prefix)) throw new Error(`"${opts.prefix}" isn't a valid install prefix.`);
  if (!isWorkspaceId(opts.id)) throw new Error(`"${opts.id}" isn't a valid workspace id.`);
  const name = opts.name.trim();
  if (!name) throw new Error("A workspace needs a name.");
  report({ id: opts.id, step: "release" });
  const cf = await cfClient(opts.accountId);
  const release = await workspaceRelease();
  const bundle = await workspaceBundle(release);
  const ws = await provisionWorkspace(cf, { id: opts.id, name, prefix: opts.prefix, bundle, onStep: (step: ProvisionStep) => report({ id: opts.id, step }) });
  writeConfig({ wsTokens: { ...readConfig().wsTokens, [ws.id]: ws.token } });
  report({ id: opts.id, step: "done" });
  return { id: ws.id, name: ws.name, worker: ws.worker, url: ws.url, version: bundle.version, queues: !!ws.queue, files: !!ws.files, media: ws.media ?? null };
}

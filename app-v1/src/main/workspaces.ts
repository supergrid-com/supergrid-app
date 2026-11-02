import { getSettings, type Binding, type Cf } from "@supergrid/cloud";
import { isWorkspaceId } from "@supergrid/app-kit/names";
import type { WorkspaceSummary } from "../shared/bridge";

// Workspaces are found in the account itself: every `<prefix>-ws-<id>` Worker is one, and its
// plain bindings say what the platform wrote there (name, URL, version, the apps it routes to).
// No directory is needed to list them, which is what lets the control plane stay a cache.

type RouteEntry = { app: string; name: string; public?: string; admin: boolean; api: boolean; nav?: { label: string; path: string }[] };

function readBindings(bindings: Binding[]) {
  const text = (name: string) => { const b = bindings.find((x) => x.name === name); return b && b.type === "plain_text" ? String((b as { text: string }).text) : null; };
  const json = <T>(name: string): T | null => { const b = bindings.find((x) => x.name === name); return b && b.type === "json" ? ((b as { json: T }).json ?? null) : null; };
  return { text, json };
}

const LOCAL_URL = process.env.SG_WORKSPACE_URL ?? "http://localhost:5301";

/** The workspace Worker from `pnpm dev` in dev/, when it is running: shown first so the app can be used against it. */
async function localWorkspace(): Promise<WorkspaceSummary | null> {
  if (process.env.SG_LOCAL_WS === "0") return null;
  try {
    const res = await fetch(`${LOCAL_URL}/_ws/manifest`, { signal: AbortSignal.timeout(700) });
    if (!res.ok) return null;
    const m = (await res.json()) as { id: string; name: string; url: string; version: string; apps: RouteEntry[] };
    return { id: "local", worker: "", name: `${m.name} (local)`, url: m.url || LOCAL_URL, version: m.version, apps: m.apps.map((r) => ({ app: r.app, name: r.name, admin: !!r.admin, api: !!r.api, public: r.public, nav: r.nav })) };
  } catch {
    return null;
  }
}

export async function listWorkspaces(cf: Cf, prefix: string): Promise<WorkspaceSummary[]> {
  const [local, remote] = await Promise.all([localWorkspace(), listRemote(cf, prefix)]);
  return local ? [local, ...remote] : remote;
}

async function listRemote(cf: Cf, prefix: string): Promise<WorkspaceSummary[]> {
  const scripts = await cf.get<{ id: string }[]>(cf.acct("/workers/scripts"));
  const head = `${prefix}-ws-`;
  const names = scripts.map((s) => s.id).filter((id) => id.startsWith(head) && isWorkspaceId(id.slice(head.length)));
  const out = await Promise.all(
    names.map(async (worker): Promise<WorkspaceSummary | null> => {
      try {
        const { bindings } = await getSettings(cf, worker);
        const b = readBindings(bindings);
        const id = b.text("WORKSPACE_ID") ?? worker.slice(head.length);
        const routes = b.json<RouteEntry[]>("ROUTES") ?? [];
        return {
          id, worker,
          name: b.text("WORKSPACE_NAME") ?? id,
          url: b.text("WORKSPACE_URL") ?? `https://${worker}.workers.dev`,
          version: b.text("SG_VERSION"),
          apps: routes.map((r) => ({ app: r.app, name: r.name, admin: !!r.admin, api: !!r.api, public: r.public, nav: r.nav })),
        };
      } catch {
        return null; // a Worker we cannot read is not ours to show
      }
    }),
  );
  return out.filter((w): w is WorkspaceSummary => !!w).sort((a, b) => a.name.localeCompare(b.name));
}

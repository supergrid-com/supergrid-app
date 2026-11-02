import type { WorkspaceInfo, WorkspaceRpc } from "@supergrid/app-kit/rpc";
import type { Env, Workspace } from "./types";

/**
 * How the platform reaches a workspace: HTTP to its public URL with its token (`/_ws/rpc`). One path everywhere, with no binding per
 * workspace, so creating a workspace never redeploys the platform. A Worker can only fetch another Worker's workers.dev URL in the
 * same account with the `global_fetch_strictly_public` flag, which is why the platform sets it.
 */
export type WorkspaceClient = WorkspaceRpc;

export function workspaceClient(w: Pick<Workspace, "id" | "url" | "token">, _env?: Env): WorkspaceClient {
  const call = async <T>(method: string, ...args: unknown[]): Promise<T> => {
    const res = await fetch(new URL("/_ws/rpc", w.url), {
      method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${w.token}` },
      body: JSON.stringify({ method, args }),
    });
    const text = await res.text();
    let json: { result?: T; error?: string };
    try { json = JSON.parse(text); } catch { throw new Error(`workspace rpc ${method}: ${res.status} ${text.slice(0, 120)}`); }
    if (!res.ok) throw new Error(json.error ?? `workspace rpc ${method} failed: ${res.status}`);
    return json.result as T;
  };
  return {
    info: () => call<WorkspaceInfo>("info"),
    getTheme: () => call("getTheme"),
    getSetting: (k) => call("getSetting", k),
    setSetting: (k, v) => call("setSetting", k, v),
    listContacts: (n) => call("listContacts", n),
    upsertContact: (a, i) => call("upsertContact", a, i),
    emitEvent: (a, t, p) => call("emitEvent", a, t, p),
    applyMigrations: (a, m) => call("applyMigrations", a, m),
  };
}

import { RPC_METHOD_NAMES, type WorkspaceRpc } from "@supergrid/app-kit/rpc";
import type { Env, Workspace } from "./types";

/**
 * How the platform reaches a workspace: HTTP to its public URL with its token (`/_ws/rpc`). One path everywhere, with no binding per
 * workspace, so creating a workspace never redeploys the platform. A Worker can only fetch another Worker's workers.dev URL in the
 * same account with the `global_fetch_strictly_public` flag, which is why the platform sets it.
 * Every method on the contract is mirrored from RPC_METHOD_NAMES, so a new method needs no change here.
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
  return Object.fromEntries(RPC_METHOD_NAMES.map((m) => [m, (...args: unknown[]) => call(m, ...args)])) as unknown as WorkspaceClient;
}

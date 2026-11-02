import type { RpcMethod, WorkspaceRpc } from "@supergrid/app-kit/rpc";
import { sg } from "~/lib/bridge";
import { mock } from "~/lib/ws-mock";

// One typed call into a workspace. Inside the app it goes through the main process, which holds
// the token and does the HTTP; in a browser it runs against the in-memory mock, so every page
// works on its own.

/** What the desktop passes as `appId` wherever the surface asks who is writing. */
export const APP_ID = "desktop";

export type RpcArgs<M extends RpcMethod> = Parameters<WorkspaceRpc[M]>;
export type RpcResult<M extends RpcMethod> = Awaited<ReturnType<WorkspaceRpc[M]>>;

// Electron wraps a thrown Error in "Error invoking remote method 'x': Error: …"; keep the message.
const clean = (e: unknown): string => String((e as Error)?.message ?? e).replace(/^Error invoking remote method '[^']*': (?:Error: )?/, "");

export async function call<M extends RpcMethod>(wsId: string, method: M, ...args: RpcArgs<M>): Promise<RpcResult<M>> {
  if (sg) {
    try {
      return (await sg.ws.rpc(wsId, method, args)) as RpcResult<M>;
    } catch (e) {
      throw new Error(clean(e));
    }
  }
  const fn = mock[method] as (...a: unknown[]) => Promise<unknown>;
  return (await fn(...args)) as RpcResult<M>;
}

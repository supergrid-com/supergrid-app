import { createRequestHandler, RouterContextProvider } from "react-router";
import { appContext, type AppCtx, type AppEnv } from "./context";
import { describeData } from "./data";
import { createEvents } from "./events";
import { apiMount, parseManifest, underMount, type AppManifest, type Manifest, type ServedManifest } from "./manifest";
import { handleMcpRequest, handleOpsRequest, runOperation, summarize, type Operations } from "./operations";
import type { EventRow, Migration, ObjectTypeInput } from "./rpc";
import { parseUser } from "./user";

/** What the workspace sends to `POST /_app/<id>/hook` for an event the app subscribed to (manifest `subscribes`). */
export type AppHook = (event: EventRow, env: AppEnv) => Promise<void> | void;

export type { ServedManifest };

export type AppWorkerOptions = { migrations?: Migration[]; objects?: ObjectTypeInput[]; hooks?: Record<string, AppHook>; operations?: Operations };

/**
 * The fetch handler for an app Worker.
 * - Client assets are served by Workers Static Assets before this runs (built under /_app/<id>/assets/).
 * - Migrations and object types declared by the app are registered once per isolate through the workspace, so the ledger stays in one place.
 * - /_app/<id>/manifest.json is the manifest with the operations and data filled in: what the desktop and agents read.
 * - Events the app subscribed to arrive at /_app/<id>/hook and go to the matching handler in `hooks`.
 * - /api/<id>/ops and /api/<id>/mcp serve the operations (see operations.ts); everything else is React Router with the app context.
 */
export function createAppWorker(raw: AppManifest, opts: AppWorkerOptions = {}) {
  const manifest: Manifest = parseManifest(raw);
  const handler = createRequestHandler(() => import("virtual:react-router/server-build"), import.meta.env.MODE);
  const ops: Operations = opts.operations ?? {};
  let prepared: Promise<void> | null = null;
  const prepare = (env: AppEnv) => (prepared ??= (async () => {
    if (opts.migrations?.length) await env.WORKSPACE.applyMigrations(manifest.id, opts.migrations);
    for (const o of opts.objects ?? []) await env.WORKSPACE.saveObjectType(manifest.id, o);
  })().catch((e) => { prepared = null; throw e; }));
  // Workers have no clock before the first request, so `at` is when this copy of the manifest was served, not built
  const served = (): ServedManifest => ({ ...raw, served: true, operations: summarize(ops), entities: describeData(manifest), build: { mode: import.meta.env.MODE, at: new Date().toISOString() } });
  return {
    async fetch(request: Request, env: AppEnv) {
      await prepare(env);
      const url = new URL(request.url);
      const own = `/_app/${manifest.id}`;
      if (url.pathname === `${own}/manifest.json`) return Response.json(served(), { headers: { "cache-control": "no-store", "access-control-allow-origin": "*" } });
      if (url.pathname === `${own}/hook` && request.method === "POST") {
        const { event } = (await request.json()) as { event: EventRow };
        const hook = opts.hooks?.[event.name];
        if (!hook) return new Response(`no handler for ${event.name}`, { status: 404 });
        await hook(event, env);
        return new Response(null, { status: 204 });
      }
      const mount = request.headers.get("x-sg-mount") ?? manifest.public?.mount ?? null;
      const user = parseUser(request.headers.get("x-sg-user"));
      const ctx: AppCtx = {
        env, manifest: raw, workspace: env.WORKSPACE, db: env.DB, user, events: createEvents(env.WORKSPACE, manifest.id, request),
        mount, href: (path: string) => (mount === null ? path : underMount(mount, path)),
        call: <O,>(name: string, input?: unknown): Promise<O> => runOperation(ops, name, input, ctx) as Promise<O>,
      };
      const api = apiMount(manifest);
      if (manifest.operations && url.pathname.startsWith(`${api}/ops`)) return handleOpsRequest(ops, request, url.pathname.slice(`${api}/ops`.length), ctx);
      if (manifest.operations && url.pathname === `${api}/mcp`) return handleMcpRequest(ops, manifest.name, manifest.version, request, ctx);
      const context = new RouterContextProvider();
      context.set(appContext, ctx);
      return handler(request, context);
    },
  };
}

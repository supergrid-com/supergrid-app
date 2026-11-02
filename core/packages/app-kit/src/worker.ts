import { createRequestHandler, RouterContextProvider } from "react-router";
import { appContext, type AppEnv } from "./context";
import { createEvents } from "./events";
import type { AppManifest } from "./manifest";
import type { EventRow, Migration, ObjectTypeInput } from "./rpc";
import { parseUser } from "./user";

/** What the workspace sends to `POST /_app/<id>/hook` for an event the app subscribed to (manifest `subscribes`). */
export type AppHook = (event: EventRow, env: AppEnv) => Promise<void> | void;

/**
 * The fetch handler for an app Worker.
 * - Client assets are served by Workers Static Assets before this runs (built under /_app/<id>/assets/).
 * - Migrations and object types declared by the app are registered once per isolate through the workspace, so the ledger stays in one place.
 * - Events the app subscribed to arrive at /_app/<id>/hook and go to the matching handler in `hooks`.
 * - Everything else is React Router with the app context.
 */
export function createAppWorker(manifest: AppManifest, opts: { migrations?: Migration[]; objects?: ObjectTypeInput[]; hooks?: Record<string, AppHook> } = {}) {
  const handler = createRequestHandler(() => import("virtual:react-router/server-build"), import.meta.env.MODE);
  let prepared: Promise<void> | null = null;
  const prepare = (env: AppEnv) => (prepared ??= (async () => {
    if (opts.migrations?.length) await env.WORKSPACE.applyMigrations(manifest.id, opts.migrations);
    for (const o of opts.objects ?? []) await env.WORKSPACE.saveObjectType(manifest.id, o);
  })().catch((e) => { prepared = null; throw e; }));
  return {
    async fetch(request: Request, env: AppEnv) {
      await prepare(env);
      const url = new URL(request.url);
      if (url.pathname === `/_app/${manifest.id}/hook` && request.method === "POST") {
        const { event } = (await request.json()) as { event: EventRow };
        const hook = opts.hooks?.[event.name];
        if (!hook) return new Response(`no handler for ${event.name}`, { status: 404 });
        await hook(event, env);
        return new Response(null, { status: 204 });
      }
      const context = new RouterContextProvider();
      context.set(appContext, { env, manifest, workspace: env.WORKSPACE, db: env.DB, user: parseUser(request.headers.get("x-sg-user")), events: createEvents(env.WORKSPACE, manifest.id, request) });
      return handler(request, context);
    },
  };
}

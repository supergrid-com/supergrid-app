import { createRequestHandler, RouterContextProvider } from "react-router";
import { appContext, type AppEnv } from "./context";
import type { AppManifest } from "./manifest";
import type { Migration } from "./rpc";
import { parseUser } from "./user";

/**
 * The fetch handler for an app Worker.
 * - Client assets are served by Workers Static Assets before this runs (built under /_app/<id>/assets/).
 * - Migrations declared by the app run once per isolate through the workspace, so the ledger stays in one place.
 * - Everything else is React Router with the app context.
 */
export function createAppWorker(manifest: AppManifest, opts: { migrations?: Migration[] } = {}) {
  const handler = createRequestHandler(() => import("virtual:react-router/server-build"), import.meta.env.MODE);
  let migrated: Promise<string[]> | null = null;
  return {
    async fetch(request: Request, env: AppEnv) {
      if (opts.migrations?.length) {
        migrated ??= env.WORKSPACE.applyMigrations(manifest.id, opts.migrations).catch((e) => { migrated = null; throw e; });
        await migrated;
      }
      const context = new RouterContextProvider();
      context.set(appContext, { env, manifest, workspace: env.WORKSPACE, db: env.DB, user: parseUser(request.headers.get("x-sg-user")) });
      return handler(request, context);
    },
  };
}

import type { AppEnv } from "./context";
import type { ServedManifest } from "./manifest";
import type { EventRow } from "./rpc";

// What an app's `workers/app.ts` exports is composed into the workspace Worker (core/workspace/src/compose.ts, the
// registry's AppWorkerModule); the per-app Worker this module used to build is gone with WORKSPACE-REPO.md.

/** A handler for an event the app subscribed to (manifest `subscribes`), run in the workspace Worker. */
export type AppHook = (event: EventRow, env: AppEnv) => Promise<void> | void;

export type { ServedManifest };

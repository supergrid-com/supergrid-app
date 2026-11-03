// The apps composed into this Worker (WORKSPACE-REPO.md). Set once at module load by `createWorkspaceWorker`; every
// module that used to read `env.ROUTES` (the route table a multi-Worker workspace carried as a binding) asks `routes()`
// instead, so one workspace runtime serves both shapes while they coexist. Module-level on purpose: a Workflow's `this.env`
// is the raw bindings, and hooks delivered from a run still need to find the app's handler.
import type { AppHook } from "@supergrid/app-kit/worker";
import type { AppManifest, Manifest, RouteSummary } from "@supergrid/app-kit/manifest";
import type { Operations } from "@supergrid/app-kit/operations";
import type { Migration, ObjectTypeInput } from "@supergrid/app-kit/rpc";
import type { Env, RouteEntry } from "./types";

/** What an app folder's `workers/app.ts` exports, as `import * as` gives it. Every export is optional. */
export type AppWorkerModule = { migrations?: Migration[]; objects?: ObjectTypeInput[]; hooks?: Record<string, AppHook>; operations?: Operations; default?: unknown };
/** One entry of the generated `.sg/apps.ts`. */
export type AppModule = { manifest: AppManifest; worker?: AppWorkerModule };

export type ComposedApp = {
  id: string;
  raw: AppManifest;
  manifest: Manifest;
  summary: RouteSummary;
  operations: Operations;
  hooks: Record<string, AppHook>;
  migrations: Migration[];
  objects: ObjectTypeInput[];
};

let registry: ComposedApp[] | null = null;

export function setRegistry(apps: ComposedApp[]): void { registry = apps; }
export const getRegistry = (): ComposedApp[] | null => registry;
export const appOf = (id: string): ComposedApp | undefined => registry?.find((a) => a.id === id);

/** The installed apps' route summaries: the registry's when this Worker composes its apps, else the ROUTES binding. */
export function routes(env: Env): RouteEntry[] {
  if (registry) return registry.map((a) => ({ ...a.summary, binding: "" }));
  return env.ROUTES ?? [];
}

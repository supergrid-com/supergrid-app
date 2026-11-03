import type { D1Database } from "@cloudflare/workers-types/experimental";
import { createContext } from "react-router";
import type { AppEvents } from "./events";
import type { AppManifest } from "./manifest";
import type { WorkspaceRpc } from "./rpc";
import type { SgUser } from "./user";

export type AppEnv = { WORKSPACE: WorkspaceRpc; DB: D1Database };
export type AppCtx = {
  env: AppEnv; manifest: AppManifest; workspace: WorkspaceRpc; db: D1Database;
  /** The staff member on admin requests; null on public pages. See `requirePermission` in `@supergrid/app-kit/user`. */
  user: SgUser | null;
  /** Emit events as this app; see `@supergrid/app-kit/events`. */
  events: AppEvents;
  /** The public prefix this app is served at right now (the sitemap's, or the manifest's); null for an admin-only app. */
  mount: string | null;
  /** A public path under the mount: `href("/thanks")` is `/forms/thanks`. */
  href: (path: string) => string;
  /** Run one of the app's own operations with this request's user; see `@supergrid/app-kit/operations`. */
  call: <O = unknown>(name: string, input?: unknown) => Promise<O>;
};
export const appContext = createContext<AppCtx>();

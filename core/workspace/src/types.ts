import type { RouteSummary } from "@supergrid/app-kit/manifest";
import type { EventRow } from "@supergrid/app-kit/rpc";
import type { HookRunParams } from "./workflows";

/** An installed app's route summary (its manifest's) plus its service binding. `public` is the mount the app was built with; `home` the page under it also built as `/` (see ../SITEMAP.md). */
export type RouteEntry = RouteSummary & { binding: string };
export type Env = {
  DB: D1Database;
  WORKSPACE_ID: string;
  WORKSPACE_NAME: string;
  WORKSPACE_URL: string;
  SG_WORKSPACE_TOKEN: string;
  /** Seals the secrets table (see secrets.ts). The desktop sets it once per workspace; absent until then. */
  SG_SECRETS_KEY?: string;
  /** The release this Worker runs, set when it is deployed. */
  SG_VERSION: string;
  ROUTES: RouteEntry[];
  /** Absent on accounts without Queues; events then go straight to D1 (see events.ts `publish`). */
  EVENTS?: Queue<EventRow>;
  /** Absent without Workflows; hooks then run inline (see hooks.ts `dispatch`). */
  HOOK_RUN?: Workflow<HookRunParams>;
  /** The workspace's R2 bucket: files, and pictures when Images is not connected (see assets.ts). Absent on a workspace provisioned without one. */
  FILES?: R2Bucket;
  /** The account the Worker runs in, for the Images, Stream and Analytics APIs. */
  CF_ACCOUNT_ID?: string;
  /** An API token with Images: Edit, Stream: Edit and Account Analytics: Read. The desktop sets it; absent until then, and assets then use R2 only. */
  SG_MEDIA_TOKEN?: string;
} & Record<string, Fetcher | unknown>;

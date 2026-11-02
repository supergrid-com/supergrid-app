import type { D1Database } from "@cloudflare/workers-types/experimental";
export type Mode = "creator" | "agency" | "reseller";
export type Env = {
  PLATFORM_DB: D1Database;
  SEED_WORKSPACE?: { id: string; name: string; url: string; token: string };
  /** Signs sessions and tokens. Required. */
  BETTER_AUTH_SECRET: string;
  /** Public URL of the platform; falls back to the request origin (local dev). */
  BETTER_AUTH_URL?: string;
  /** One-time token that unlocks /setup until the first account exists. */
  SG_SETUP_TOKEN?: string;
  /** Default mode on a fresh install; the `mode` setting wins once set. */
  SG_MODE?: Mode;
  /** The release this Worker runs. Set when it is deployed; "dev" locally. */
  SG_VERSION: string;
  /** Names everything this platform creates: <prefix>-ws-<id>. */
  SG_PREFIX?: string;
  /** The Cloudflare account this platform runs in. */
  SG_ACCOUNT_ID?: string;
  /** Where releases come from, and the key they must be signed with. Forks point these at their own. */
  SG_RELEASE_FEED?: string;
  SG_RELEASE_PUBKEY?: string;
  /** Local dev only: a Cloudflare token from the environment, in place of the one stored in Platform settings. */
  SG_CF_TOKEN?: string;
} & Record<string, unknown>;
export type Workspace = {
  id: string; name: string; url: string; token: string; provider: "plain" | "dispatch"; repo: string | null;
  organization_id: string | null; team_id: string | null; created_at: string;
  /** Set on workspaces this platform created. */
  worker: string | null; d1_id: string | null; version: string | null; contract: number | null;
};
export type Install = { workspace_id: string; app_id: string; name: string; version: string; worker: string; repo: string | null; mount: string | null; upstream: string | null; installed_at: string; updated_at: string;
  /** JSON InstalledApp: what the workspace routes to. */
  route: string | null;
  /** main in the app's repo as the platform last left it. Anything else means the user changed it. */
  commit_sha: string | null;
  /** null, or needs_build (merged, waiting on a build) or conflict. */
  status: string | null;
};

export type RouteEntry = { app: string; name?: string; binding: string; public?: string; admin?: boolean; api?: boolean; nav?: { label: string; path: string }[] };
export type Env = {
  DB: D1Database;
  WORKSPACE_ID: string;
  WORKSPACE_NAME: string;
  WORKSPACE_URL: string;
  SG_WORKSPACE_TOKEN: string;
  /** The release this Worker runs, set when it is deployed. */
  SG_VERSION: string;
  ROUTES: RouteEntry[];
} & Record<string, Fetcher | unknown>;

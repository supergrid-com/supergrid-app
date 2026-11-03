// The surface an app sees on env.WORKSPACE. Implemented by workspace/src/api.ts (a WorkerEntrypoint).
/**
 * The version of everything between the platform, a workspace and an app: this RPC surface and the manifest. Bump it when
 * one changes. Changes stay additive, because a platform always manages workspaces older than itself during a rollout.
 */
export const CONTRACT = 3;

import type { Sitemap, SitemapInput } from "./sitemap";
export type { Sitemap, SitemapInput, SitemapRule } from "./sitemap";

/** `public` and `home` are what each app was built with; `sitemap` is what the workspace wants (see workspace/SITEMAP.md). */
import type { NavItem } from "./manifest";
/** An installed app as the workspace lists it: the manifest's route summary (`routeSummary` in ./manifest). */
export type InstalledAppInfo = { app: string; name?: string; version?: string; icon?: string; color?: string; public?: string; home?: string; admin?: boolean; api?: boolean; operations?: boolean; nav?: NavItem[]; subscribes?: string[]; entities?: string[] };
export type WorkspaceInfo = { id: string; name: string; url: string; version: string; contract: number; apps: InstalledAppInfo[]; sitemap: Sitemap };
export type Migration = { name: string; sql: string };

// ---- Contacts ----------------------------------------------------------------------------------------------------

export type Contact = { id: string; email: string; name: string | null; source: string | null; props: Record<string, unknown>; created_at: string; updated_at: string };
export type ContactFull = Contact & { tags: string[] };
export type FieldType = "text" | "number" | "bool" | "date" | "select" | "url";
/** A custom field: on contacts (`props`) or on an object type (`doc`). */
export type FieldDef = { key: string; label: string; type: FieldType; options?: string[]; required?: boolean; indexed?: boolean; app_id?: string | null };
export type FilterOp = "eq" | "ne" | "in" | "contains" | "exists" | "gt" | "lt" | "gte" | "lte";
/** One condition on a row: a column, or `props.<key>` on a contact or event. */
export type When = { field: string; op: FilterOp; value?: unknown };
export type ContactQuery = {
  search?: string;
  /** Contacts carrying every tag. */
  tags?: string[];
  /** Contacts carrying any of these tags. */
  anyTags?: string[];
  source?: string;
  createdFrom?: string;
  createdTo?: string;
  props?: When[];
  /** Contacts who did an event at least `min` times in the last `days`. */
  did?: { event: string; min?: number; days?: number };
  segment?: string;
  sort?: "created_at" | "updated_at" | "email" | "name" | `prop:${string}`;
  dir?: "asc" | "desc";
  limit?: number;
  offset?: number;
};
export type ContactPage = { items: ContactFull[]; total: number };
export type ContactInput = { id?: string; email?: string; name?: string | null; source?: string | null; props?: Record<string, unknown>; tags?: string[] };
export type ContactDetail = { contact: ContactFull; timeline: EventRow[]; objects: Record<string, ObjectRow[]>; segments: { id: string; name: string }[] };
export type Segment = { id: string; name: string; kind: "dynamic" | "static"; filter: ContactQuery; count?: number; created_at: string; updated_at: string };
export type SegmentInput = { id?: string; name: string; kind?: "dynamic" | "static"; filter?: ContactQuery };

// ---- Objects -----------------------------------------------------------------------------------------------------

export type ObjectType = { id: string; label: string; plural: string; title_field: string; fields: FieldDef[]; app_id: string | null; version: number; created_at: string; updated_at: string };
export type ObjectTypeInput = { id: string; label: string; plural?: string; title_field?: string; fields: FieldDef[] };
export type ObjectRow = { id: string; type: string; contact_id: string | null; rev: number; doc: Record<string, unknown>; created_at: string; updated_at: string };
export type ObjectQuery = { where?: When[]; search?: string; contactId?: string | null; sort?: "created_at" | "updated_at" | `doc:${string}`; dir?: "asc" | "desc"; limit?: number; offset?: number };
export type ObjectPage = { items: ObjectRow[]; total: number };
export type ObjectInput = { id?: string; doc: Record<string, unknown>; contactId?: string | null; rev?: number };

// ---- Events ------------------------------------------------------------------------------------------------------

/** Names the core emits and apps may not. */
export const RESERVED_EVENTS = [
  "page.view", "session.start",
  "contact.created", "contact.updated", "contact.identified", "contact.tagged", "contact.untagged", "contact.deleted",
  "object.created", "object.updated", "object.deleted",
  "asset.created", "asset.ready", "asset.deleted",
  "app.installed", "app.updated", "workflow.test",
] as const;
export type Utm = { source?: string; medium?: string; campaign?: string; term?: string; content?: string };
export type EventInput = {
  name: string;
  props?: Record<string, unknown>;
  /** ISO-8601; the workspace fills it in when absent. */
  ts?: string;
  contactId?: string | null;
  anonymousId?: string | null;
  sessionId?: string | null;
  url?: string;
  path?: string;
  referrer?: string;
  utm?: Utm;
  userAgent?: string;
};
export type EventRow = {
  id: string; name: string; app_id: string; ts: string;
  contact_id: string | null; anonymous_id: string | null; session_id: string | null;
  url: string | null; path: string | null; referrer: string | null;
  utm_source: string | null; utm_medium: string | null; utm_campaign: string | null; utm_term: string | null; utm_content: string | null;
  country: string | null; region: string | null; city: string | null; timezone: string | null;
  user_agent: string | null; device: string | null;
  props: Record<string, unknown>;
};
export type EventQuery = { name?: string | string[]; appId?: string; contactId?: string; anonymousId?: string; from?: string; to?: string; search?: string; limit?: number; offset?: number };
export type EventPage = { items: EventRow[]; total: number };
export type EventName = { name: string; app_id: string | null; count: number; reserved: boolean };

// ---- Analytics ---------------------------------------------------------------------------------------------------

export type AnalyticsGroup = "name" | "app_id" | "path" | "referrer" | "utm_source" | "utm_medium" | "utm_campaign" | "country" | "device" | `prop:${string}`;
export type AnalyticsSpec = {
  metric: "count" | "unique_contacts" | "unique_visitors" | "sum";
  /** For `sum`: the numeric prop to add up. */
  prop?: string;
  events?: string[];
  appId?: string;
  from?: string;
  to?: string;
  /** Instead of from/to: the last N days up to now. */
  days?: number;
  interval?: "day" | "week" | "month";
  groupBy?: AnalyticsGroup;
  filters?: When[];
  limit?: number;
};
export type AnalyticsRow = { bucket: string | null; key: string | null; value: number };
export type FunnelSpec = { steps: { event: string; filters?: When[] }[]; days?: number; from?: string; to?: string; by?: "contact" | "visitor"; windowHours?: number };
export type FunnelStep = { event: string; count: number; rate: number };

// ---- Hooks and workflows -----------------------------------------------------------------------------------------

export type HookAction = "workflow" | "http" | "app";
export type HookConfig = { workflowId?: string; url?: string; method?: string; headers?: Record<string, string>; secret?: string; bodyTemplate?: string; app?: string };
export type Hook = { id: string; name: string | null; event: string; app_id: string | null; action: HookAction; config: HookConfig; when: When[] | null; enabled: boolean; readonly?: boolean; created_at: string; updated_at: string };
export type HookInput = { id?: string; name?: string | null; event: string; action: HookAction; config: HookConfig; when?: When[] | null; enabled?: boolean };
export type WorkflowStep = { id: string; type: string; input: Record<string, unknown> };
export type WorkflowDef = { trigger?: { event: string; when?: When[] } | null; steps: WorkflowStep[] };
export type Workflow = { id: string; name: string; version: number; definition: WorkflowDef; enabled: boolean; runs: number; last_run: string | null; created_at: string; updated_at: string };
export type WorkflowInput = { id?: string; name: string; definition: WorkflowDef; enabled?: boolean };
export type StepCatalogEntry = { type: string; label: string; description?: string; fields: FieldDef[]; app_id?: string | null };
export type HookCatalog = { events: EventName[]; workflows: { id: string; name: string }[]; steps: StepCatalogEntry[] };
export type RunStatus = "queued" | "running" | "completed" | "failed";
export type HookRunStep = { run_id: string; idx: number; step_id: string | null; type: string; status: string; output: unknown; finished_at: string | null };
export type HookRunRow = { id: string; hook_id: string; workflow_id: string | null; workflow_version: number | null; event_id: string; event_name: string; contact_id: string | null; status: RunStatus; error: string | null; started_at: string; finished_at: string | null; steps?: HookRunStep[] };
export type RunQuery = { workflowId?: string; hookId?: string; limit?: number };

// ---- Secrets -----------------------------------------------------------------------------------------------------

/** What anyone but an app sees of a secret: never the value. `hint` is its last four characters, when it is long enough to show them. */
export type SecretMeta = { name: string; hint: string; description: string | null; app_id: string | null; created_at: string; updated_at: string };
/** Names are env-var style, `STRIPE_SECRET_KEY`. A replace keeps the description unless one is given. */
export type SecretInput = { name: string; value: string; description?: string | null };
export type SecretsStatus = { ready: boolean; count: number };

// ---- Assets ------------------------------------------------------------------------------------------------------
// Images, video, audio and files the workspace holds. Each row is a pointer into one Cloudflare product (design in
// workspace/ASSETS.md): Images for pictures, Stream for video and audio, the workspace's R2 bucket for everything else
// and for pictures when Images is not connected. Uploads go browser-to-provider with a one-time ticket, so no client
// ever holds the account's API token.

export type AssetKind = "image" | "video" | "audio" | "file";
export type AssetProvider = "images" | "stream" | "r2";
/** `pending` until the bytes arrive, `processing` while Stream encodes, then `ready` or `error`. */
export type AssetStatus = "pending" | "processing" | "ready" | "error";
/** Where an asset loads from, filled in by the workspace so apps never need the account hash or the Stream customer code. */
export type AssetUrls = {
  /** Images: `https://imagedelivery.net/<hash>/<id>`, append `/<variant>` or `/w=…,h=…`. R2: the file itself. Stream: none. */
  base?: string;
  /** The plain thing: the public image variant, the R2 file, Stream's HLS manifest. */
  src: string | null;
  /** A poster for video, the image itself for pictures, null for files. */
  thumbnail: string | null;
  /** Stream only. */
  hls?: string;
  dash?: string;
  /** Stream's player, for an iframe. */
  embed?: string;
};
export type Asset = {
  id: string;
  kind: AssetKind;
  provider: AssetProvider;
  /** The provider's own id: an Images id, a Stream uid, an R2 key. */
  provider_id: string;
  /** The file name as uploaded. */
  name: string;
  title: string | null;
  alt: string | null;
  mime: string | null;
  size: number | null;
  width: number | null;
  height: number | null;
  /** Seconds, for video and audio. */
  duration: number | null;
  status: AssetStatus;
  error: string | null;
  /** `/` or `/brand/logos`: a path, so the picker can show a tree without a folders table. */
  folder: string;
  tags: string[];
  meta: Record<string, unknown>;
  urls: AssetUrls;
  app_id: string | null;
  created_at: string;
  updated_at: string;
};
export type AssetQuery = {
  kind?: AssetKind | AssetKind[];
  status?: AssetStatus;
  /** Exactly this folder; `folderPrefix` for it and everything under it. */
  folder?: string;
  folderPrefix?: string;
  /** Assets carrying every tag. */
  tags?: string[];
  /** Name, title, alt. */
  search?: string;
  appId?: string;
  sort?: "created_at" | "updated_at" | "name" | "size";
  dir?: "asc" | "desc";
  limit?: number;
  offset?: number;
};
export type AssetPage = { items: Asset[]; total: number };
export type AssetFolder = { path: string; count: number };
/** What the client knows before the bytes move. `kind` is read off `mime` when absent. */
export type UploadInput = {
  name: string;
  mime?: string;
  size?: number;
  kind?: AssetKind;
  folder?: string;
  tags?: string[];
  title?: string;
  alt?: string;
  meta?: Record<string, unknown>;
  /** Stream reserves this much storage until the upload lands; default one hour. */
  maxDurationSeconds?: number;
};
/**
 * How the browser sends the bytes: `form` is a multipart POST with the file under `field` (Images and Stream direct
 * creator uploads), `put` is the raw body to the workspace's own signed URL (R2). Then `completeUpload` marks it ready.
 */
export type UploadTicket = {
  asset: Asset;
  upload: { method: "form"; url: string; field: string } | { method: "put"; url: string };
  expires_at: string;
};
/** What the uploader measured client-side (an image's natural size, a video's duration) so the row is complete at once. */
export type UploadDone = { width?: number; height?: number; duration?: number; size?: number; mime?: string };
export type AssetInput = { id: string; name?: string; title?: string | null; alt?: string | null; folder?: string; tags?: string[]; meta?: Record<string, unknown> };
/** Which providers this workspace can use. Images and Stream need the media token the desktop sets; R2 needs the bucket binding. */
export type MediaConfig = {
  images: boolean;
  stream: boolean;
  files: boolean;
  /** The account's Images delivery hash, learned from the first upload. */
  imagesHash: string | null;
  /** The `customer-<code>.cloudflarestream.com` host Stream serves this account from, learned from the first video. */
  streamCustomer: string | null;
  /** Bytes a basic (non-resumable) Stream upload may carry. */
  streamBasicLimit: number;
  /** Bytes an image may be. */
  imageLimit: number;
};
/** Playback analytics from Stream (minutes viewed), by asset, day or country. */
export type MediaAnalyticsSpec = {
  /** The last N days up to now, unless from/to are given. */
  days?: number;
  from?: string;
  to?: string;
  /** One asset only. */
  assetId?: string;
  groupBy?: "asset" | "day" | "country";
  limit?: number;
};
export type MediaAnalyticsRow = {
  /** The asset id, the day (YYYY-MM-DD) or the country code, by `groupBy`. */
  key: string | null;
  /** Filled for `asset` groups when the uid is known to the workspace. */
  asset?: Pick<Asset, "id" | "name" | "title" | "kind" | "urls"> | null;
  minutes: number;
  /** Playback sessions Stream counted. */
  views: number;
};

import type { Theme, ThemeRecord, ThemeSummary } from "@supergrid/theme";
export type { Theme, ThemePatch, ThemeRecord, ThemeSummary } from "@supergrid/theme";

export interface WorkspaceRpc {
  info(): Promise<WorkspaceInfo>;
  /** The default theme as flat CSS variables (`primary`, `radius`…). `readTheme` returns the document. */
  getTheme(): Promise<Record<string, string>>;
  // ---- Themes: see @supergrid/theme. A workspace keeps several; apps load the default. ----
  listThemes(): Promise<ThemeSummary[]>;
  /** The default theme, or the one with `id`. */
  readTheme(id?: string | null): Promise<Theme>;
  /** Create or update. A full document creates or replaces; `{ id, ...partial }` patches an existing theme (missing branches keep their values). */
  saveTheme(input: Partial<Theme> & { id: string }): Promise<ThemeRecord>;
  removeTheme(id: string): Promise<void>;
  setDefaultTheme(id: string): Promise<ThemeSummary[]>;
  getSetting(key: string): Promise<unknown>;
  setSetting(key: string, value: unknown): Promise<void>;
  getSitemap(): Promise<Sitemap>;
  /** Validates and stores the whole document; a mount change adds a permanent redirect from the old prefix. */
  setSitemap(input: SitemapInput): Promise<Sitemap>;
  applyMigrations(appId: string, migrations: Migration[]): Promise<string[]>;

  listContacts(limit?: number): Promise<Contact[]>;
  upsertContact(appId: string, input: { email: string; name?: string; source?: string; props?: Record<string, unknown>; anonymousId?: string | null }): Promise<Contact>;
  queryContacts(query?: ContactQuery): Promise<ContactPage>;
  getContact(idOrEmail: string): Promise<ContactDetail | null>;
  saveContact(appId: string, input: ContactInput): Promise<ContactFull>;
  tagContacts(appId: string, ids: string[], add?: string[], remove?: string[]): Promise<void>;
  deleteContacts(appId: string, ids: string[]): Promise<void>;
  listTags(): Promise<{ tag: string; count: number }[]>;
  listContactFields(): Promise<FieldDef[]>;
  saveContactField(appId: string, field: FieldDef): Promise<FieldDef>;
  removeContactField(key: string): Promise<void>;
  listSegments(): Promise<Segment[]>;
  saveSegment(input: SegmentInput): Promise<Segment>;
  removeSegment(id: string): Promise<void>;
  addToSegment(id: string, contactIds: string[]): Promise<void>;

  listObjectTypes(): Promise<ObjectType[]>;
  saveObjectType(appId: string | null, input: ObjectTypeInput): Promise<ObjectType>;
  removeObjectType(id: string): Promise<void>;
  listObjects(type: string, query?: ObjectQuery): Promise<ObjectPage>;
  getObject(type: string, id: string): Promise<ObjectRow | null>;
  saveObject(appId: string, type: string, input: ObjectInput): Promise<ObjectRow>;
  removeObjects(appId: string, type: string, ids: string[]): Promise<void>;

  /** Older one-event form; `emit` takes the full shape. */
  emitEvent(appId: string, type: string, payload: unknown): Promise<void>;
  emit(appId: string, events: EventInput[]): Promise<string[]>;
  listEvents(query?: EventQuery): Promise<EventPage>;
  eventNames(): Promise<EventName[]>;
  queryAnalytics(spec: AnalyticsSpec): Promise<AnalyticsRow[]>;
  funnel(spec: FunnelSpec): Promise<FunnelStep[]>;

  listHooks(): Promise<Hook[]>;
  saveHook(appId: string | null, input: HookInput): Promise<Hook>;
  removeHook(id: string): Promise<void>;
  hookCatalog(): Promise<HookCatalog>;
  listWorkflows(): Promise<Workflow[]>;
  getWorkflow(id: string): Promise<Workflow | null>;
  saveWorkflow(input: WorkflowInput): Promise<Workflow>;
  removeWorkflow(id: string): Promise<void>;
  /** Runs a workflow now against a synthetic `workflow.test` event. */
  runWorkflow(id: string, input?: { contactId?: string; props?: Record<string, unknown> }): Promise<HookRunRow>;
  listRuns(query?: RunQuery): Promise<HookRunRow[]>;
  getRun(id: string): Promise<HookRunRow | null>;

  /** Whether the workspace can seal secrets yet (it needs SG_SECRETS_KEY) and how many it holds. */
  secretsStatus(): Promise<SecretsStatus>;
  listSecrets(): Promise<SecretMeta[]>;
  /** Creates or replaces a value. Apps read it with `getSecret`; HTTP hooks and steps as `{{secrets.NAME}}`. */
  setSecret(appId: string | null, input: SecretInput): Promise<SecretMeta>;
  removeSecret(name: string): Promise<void>;
  /** The value. For apps over the service binding only: `/_ws/rpc` refuses it. */
  getSecret(name: string): Promise<string | null>;

  // ---- Assets ----
  mediaConfig(): Promise<MediaConfig>;
  listAssets(query?: AssetQuery): Promise<AssetPage>;
  getAsset(id: string): Promise<Asset | null>;
  listAssetFolders(): Promise<AssetFolder[]>;
  /** Step one of an upload: the row, and where the browser sends the bytes. */
  createUpload(appId: string, input: UploadInput): Promise<UploadTicket>;
  /** Step two: the bytes landed. Checks with the provider and returns the row as it stands (Stream may still be `processing`). */
  completeUpload(appId: string, id: string, done?: UploadDone): Promise<Asset>;
  /** Asks the provider again: a `processing` video that is now ready, a changed size. */
  refreshAsset(id: string): Promise<Asset>;
  saveAsset(appId: string, input: AssetInput): Promise<Asset>;
  /** Removes the rows and the bytes at the provider. */
  removeAssets(appId: string, ids: string[]): Promise<void>;
  mediaAnalytics(spec?: MediaAnalyticsSpec): Promise<MediaAnalyticsRow[]>;
}

/** Every method on the surface, for allowlists and generic clients. */
export const RPC_METHOD_NAMES = [
  "info", "getTheme", "listThemes", "readTheme", "saveTheme", "removeTheme", "setDefaultTheme", "getSetting", "setSetting", "getSitemap", "setSitemap", "applyMigrations",
  "listContacts", "upsertContact", "queryContacts", "getContact", "saveContact", "tagContacts", "deleteContacts", "listTags",
  "listContactFields", "saveContactField", "removeContactField", "listSegments", "saveSegment", "removeSegment", "addToSegment",
  "listObjectTypes", "saveObjectType", "removeObjectType", "listObjects", "getObject", "saveObject", "removeObjects",
  "emitEvent", "emit", "listEvents", "eventNames", "queryAnalytics", "funnel",
  "listHooks", "saveHook", "removeHook", "hookCatalog", "listWorkflows", "getWorkflow", "saveWorkflow", "removeWorkflow", "runWorkflow", "listRuns", "getRun",
  "secretsStatus", "listSecrets", "setSecret", "removeSecret", "getSecret",
  "mediaConfig", "listAssets", "getAsset", "listAssetFolders", "createUpload", "completeUpload", "refreshAsset", "saveAsset", "removeAssets", "mediaAnalytics",
] as const satisfies readonly (keyof WorkspaceRpc)[];
export type RpcMethod = (typeof RPC_METHOD_NAMES)[number];

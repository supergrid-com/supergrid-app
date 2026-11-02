// Assets: images, video, audio and files. One table of pointers into three Cloudflare products, each behind a small
// provider object here: Images (pictures), Stream (video and audio) and the workspace's own R2 bucket (files, and
// pictures when Images is not connected). The browser never sees the account token: `createUpload` hands it a one-time
// place to put the bytes, `completeUpload` confirms with the provider. Design and the reasons in ../ASSETS.md.
import type { Asset, AssetFolder, AssetInput, AssetKind, AssetPage, AssetProvider, AssetQuery, AssetStatus, AssetUrls, MediaAnalyticsRow, MediaAnalyticsSpec, MediaConfig, UploadDone, UploadInput, UploadTicket } from "@supergrid/app-kit/rpc";
import { publish } from "./events";
import { nid, now } from "./ids";
import type { Env } from "./types";
import { int, invalid, iso, list, obj, oneOf, opt, str, strings } from "./validate";

type Row = { id: string; kind: AssetKind; provider: AssetProvider; provider_id: string; name: string; title: string | null; alt: string | null; mime: string | null; size: number | null; width: number | null; height: number | null; duration: number | null; status: AssetStatus; error: string | null; folder: string; tags: string; meta: string; app_id: string | null; created_at: string; updated_at: string };

const CF_API = "https://api.cloudflare.com/client/v4";
const KINDS = ["image", "video", "audio", "file"] as const;
const STATUSES = ["pending", "processing", "ready", "error"] as const;
const SORTS = ["created_at", "updated_at", "name", "size"] as const;
/** Direct creator uploads to Stream without tus stop at 200 MB; Images at 10 MB. Larger files go to R2. */
export const STREAM_BASIC_LIMIT = 200 * 1024 * 1024;
export const IMAGE_LIMIT = 10 * 1024 * 1024;
const UPLOAD_TTL_SECONDS = 30 * 60;
const FOLDER = /^\/(?:[a-z0-9][a-z0-9 _-]*(?:\/[a-z0-9][a-z0-9 _-]*)*)?$/i;
const TAG = /^[a-z0-9][a-z0-9 _-]{0,39}$/i;
/** Formats Cloudflare Images takes. Anything else that calls itself an image (an .ico, a .psd) is a file. */
const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml", "image/avif"]);

// ---- settings the workspace learns from the providers ---------------------------------------------------------------

const SETTING_HASH = "media.images_hash";
const SETTING_STREAM = "media.stream_customer";
const SETTING_FLEX = "media.flexible_variants";
const settings = new Map<string, string | null>();
async function getSetting(db: D1Database, key: string): Promise<string | null> {
  if (settings.has(key)) return settings.get(key)!;
  const row = await db.prepare("SELECT value FROM settings WHERE key = ?").bind(key).first<{ value: string }>();
  const v = row ? (JSON.parse(row.value) as string | null) : null;
  settings.set(key, v);
  return v;
}
async function setSetting(db: D1Database, key: string, value: string): Promise<void> {
  settings.set(key, value);
  await db.prepare("INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at").bind(key, JSON.stringify(value)).run();
}

// ---- the Cloudflare API, with the media token ------------------------------------------------------------------------

const hasMedia = (env: Env) => !!(env.SG_MEDIA_TOKEN && env.CF_ACCOUNT_ID);
type CfResult<T> = { success: boolean; result: T; errors?: { code: number; message: string }[] };
async function cf<T>(env: Env, method: string, path: string, body?: unknown): Promise<T> {
  if (!hasMedia(env)) invalid("Images and Stream need a media token; connect one on the Assets page");
  const headers: Record<string, string> = { authorization: `Bearer ${env.SG_MEDIA_TOKEN}` };
  let payload: BodyInit | undefined;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) { headers["content-type"] = "application/json"; payload = JSON.stringify(body); }
  const res = await fetch(`${CF_API}/accounts/${env.CF_ACCOUNT_ID}${path}`, { method, headers, body: payload });
  const text = await res.text();
  let json: CfResult<T> | null = null;
  try { json = JSON.parse(text) as CfResult<T>; } catch { /* not json */ }
  if (!res.ok || !json?.success) throw new Error(`Cloudflare ${method} ${path}: ${json?.errors?.map((e) => `${e.code} ${e.message}`).join("; ") || `${res.status} ${text.slice(0, 160)}`}`);
  return json.result;
}

// ---- rows ------------------------------------------------------------------------------------------------------------

const r2Url = (env: Env, key: string) => `${env.WORKSPACE_URL.replace(/\/$/, "")}/_ws/files/${key.split("/").map(encodeURIComponent).join("/")}`;

function urlsOf(env: Env, r: Row, imagesHash: string | null, streamCustomer: string | null): AssetUrls {
  const meta = JSON.parse(r.meta || "{}") as Record<string, unknown>;
  switch (r.provider) {
    case "images": {
      if (!imagesHash) return { src: null, thumbnail: null };
      const base = `https://imagedelivery.net/${imagesHash}/${r.provider_id}`;
      return { base, src: `${base}/public`, thumbnail: `${base}/w=400,h=400,fit=cover` };
    }
    case "stream": {
      const host = streamCustomer ? `https://${streamCustomer}` : null;
      const hls = (meta.hls as string | undefined) ?? (host ? `${host}/${r.provider_id}/manifest/video.m3u8` : undefined);
      const dash = (meta.dash as string | undefined) ?? (host ? `${host}/${r.provider_id}/manifest/video.mpd` : undefined);
      const thumbnail = r.kind === "video" ? ((meta.thumbnail as string | undefined) ?? (host ? `${host}/${r.provider_id}/thumbnails/thumbnail.jpg` : null)) : null;
      return { src: hls ?? null, thumbnail: thumbnail ?? null, hls, dash, embed: host ? `${host}/${r.provider_id}/iframe` : undefined };
    }
    default: {
      const src = env.FILES ? r2Url(env, r.provider_id) : null;
      return { base: src ?? undefined, src, thumbnail: r.kind === "image" ? src : null };
    }
  }
}

async function hydrate(env: Env, rows: Row[]): Promise<Asset[]> {
  const [hash, customer] = await Promise.all([getSetting(env.DB, SETTING_HASH), getSetting(env.DB, SETTING_STREAM)]);
  return rows.map((r) => ({
    id: r.id, kind: r.kind, provider: r.provider, provider_id: r.provider_id, name: r.name, title: r.title, alt: r.alt, mime: r.mime, size: r.size, width: r.width, height: r.height, duration: r.duration,
    status: r.status, error: r.error, folder: r.folder, tags: JSON.parse(r.tags || "[]"), meta: JSON.parse(r.meta || "{}"), urls: urlsOf(env, r, hash, customer), app_id: r.app_id, created_at: r.created_at, updated_at: r.updated_at,
  }));
}

async function rowOf(db: D1Database, id: string): Promise<Row> {
  const row = await db.prepare("SELECT * FROM assets WHERE id = ?").bind(str(id, "id", { max: 64 })).first<Row>();
  if (!row) invalid(`no asset ${id}`);
  return row!;
}

export async function mediaConfig(env: Env): Promise<MediaConfig> {
  const media = hasMedia(env);
  return {
    images: media, stream: media, files: !!env.FILES,
    imagesHash: await getSetting(env.DB, SETTING_HASH), streamCustomer: await getSetting(env.DB, SETTING_STREAM),
    streamBasicLimit: STREAM_BASIC_LIMIT, imageLimit: IMAGE_LIMIT,
  };
}

export async function getAsset(env: Env, id: string): Promise<Asset | null> {
  const row = await env.DB.prepare("SELECT * FROM assets WHERE id = ?").bind(str(id, "id", { max: 64 })).first<Row>();
  return row ? (await hydrate(env, [row]))[0] : null;
}

type Query = Omit<AssetQuery, "kind" | "sort" | "dir" | "limit" | "offset"> & { kind?: AssetKind[]; sort: NonNullable<AssetQuery["sort"]>; dir: "asc" | "desc"; limit: number; offset: number };
function parseQuery(v: unknown): Query {
  const q = obj(v, "query");
  const kinds = q.kind == null ? undefined : Array.isArray(q.kind) ? strings(q.kind, "kind", 4).map((k) => oneOf(k, "kind", KINDS)) : [oneOf(q.kind, "kind", KINDS)];
  return {
    kind: kinds, status: q.status == null ? undefined : oneOf(q.status, "status", STATUSES),
    folder: q.folder == null ? undefined : folderOf(q.folder), folderPrefix: q.folderPrefix == null ? undefined : folderOf(q.folderPrefix),
    tags: q.tags == null ? undefined : strings(q.tags, "tags", 10), search: opt(q.search, "search", { max: 200 }) ?? undefined, appId: opt(q.appId, "appId", { max: 40 }) ?? undefined,
    sort: oneOf(q.sort, "sort", SORTS, "created_at"), dir: oneOf(q.dir, "dir", ["asc", "desc"] as const, "desc"),
    limit: int(q.limit, "limit", { min: 1, max: 500, dflt: 50 }), offset: int(q.offset, "offset", { min: 0, max: 1_000_000, dflt: 0 }),
  };
}

export async function listAssets(env: Env, query: unknown): Promise<AssetPage> {
  const q = parseQuery(query);
  const clauses: string[] = [];
  const binds: unknown[] = [];
  if (q.kind?.length) { clauses.push(`kind IN (${q.kind.map(() => "?").join(",")})`); binds.push(...q.kind); }
  if (q.status) { clauses.push("status = ?"); binds.push(q.status); }
  if (q.folder) { clauses.push("folder = ?"); binds.push(q.folder); }
  if (q.folderPrefix && q.folderPrefix !== "/") { clauses.push("(folder = ? OR folder LIKE ? ESCAPE '\\')"); binds.push(q.folderPrefix, `${q.folderPrefix.replace(/[%_\\]/g, "\\$&")}/%`); }
  for (const t of q.tags ?? []) { clauses.push("EXISTS (SELECT 1 FROM asset_tags t WHERE t.asset_id = assets.id AND t.tag = ?)"); binds.push(t.toLowerCase()); }
  if (q.search) { const like = `%${q.search.replace(/[%_\\]/g, "\\$&")}%`; clauses.push("(name LIKE ? ESCAPE '\\' OR title LIKE ? ESCAPE '\\' OR alt LIKE ? ESCAPE '\\')"); binds.push(like, like, like); }
  if (q.appId) { clauses.push("app_id = ?"); binds.push(q.appId); }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const order = q.sort === "name" ? "name COLLATE NOCASE" : q.sort;
  const [rows, count] = await env.DB.batch([
    env.DB.prepare(`SELECT * FROM assets ${where} ORDER BY ${order} ${q.dir === "asc" ? "ASC" : "DESC"}, id LIMIT ? OFFSET ?`).bind(...binds, q.limit, q.offset),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM assets ${where}`).bind(...binds),
  ]);
  return { items: await hydrate(env, rows.results as Row[]), total: (count.results[0] as { n: number })?.n ?? 0 };
}

export async function listAssetFolders(db: D1Database): Promise<AssetFolder[]> {
  return (await db.prepare("SELECT folder AS path, COUNT(*) AS count FROM assets GROUP BY folder ORDER BY folder").all<AssetFolder>()).results;
}

// ---- uploads ---------------------------------------------------------------------------------------------------------

const folderOf = (v: unknown): string => {
  const f = str(v, "folder", { max: 200 }).replace(/\/+$/, "") || "/";
  if (!FOLDER.test(f)) invalid("folder must look like /brand/logos");
  return f;
};
const tagsOf = (v: unknown): string[] => [...new Set(strings(v, "tags", 30).map((t) => { const s = t.trim().toLowerCase(); if (!TAG.test(s)) invalid(`tag "${t}" has characters other than letters, digits, spaces, _ and -`); return s; }))];

/** The kind a file belongs to, from what the browser said it is. */
export function kindOf(mime: string | null, name: string): AssetKind {
  const m = (mime ?? "").toLowerCase();
  if (IMAGE_MIMES.has(m)) return "image";
  if (m.startsWith("video/")) return "video";
  if (m.startsWith("audio/")) return "audio";
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg", "avif"].includes(ext)) return "image";
  if (["mp4", "mov", "webm", "mkv", "m4v", "avi"].includes(ext)) return "video";
  if (["mp3", "wav", "m4a", "aac", "ogg", "flac"].includes(ext)) return "audio";
  return "file";
}

/** Which product takes this upload. Pictures and media fall back to R2 without a token or above the basic-upload limits. */
function providerFor(env: Env, kind: AssetKind, size: number | null): AssetProvider {
  if (kind === "image" && hasMedia(env) && (size == null || size <= IMAGE_LIMIT)) return "images";
  if ((kind === "video" || kind === "audio") && hasMedia(env) && (size == null || size <= STREAM_BASIC_LIMIT)) return "stream";
  if (!env.FILES) invalid(kind === "file" ? "this workspace has no file storage (R2) yet" : `this file is too large for ${kind === "image" ? "Images" : "Stream"} and the workspace has no file storage (R2) to fall back on`);
  return "r2";
}

const enc = new TextEncoder();
const b64u = (b: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
async function sign(env: Env, data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(env.SG_WORKSPACE_TOKEN), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64u(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}
/** A URL on this workspace the browser may PUT one asset's bytes to, for a while. Checked by `handleUpload`. */
async function signedPutUrl(env: Env, id: string, exp: number): Promise<string> {
  return `${env.WORKSPACE_URL.replace(/\/$/, "")}/_ws/upload/${id}?exp=${exp}&sig=${await sign(env, `${id}.${exp}`)}`;
}
async function verifyPut(env: Env, id: string, exp: string | null, sig: string | null): Promise<boolean> {
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) < Date.now() / 1000) return false;
  const expected = await sign(env, `${id}.${exp}`);
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

const safeName = (name: string) => name.replace(/[^\w.() -]+/g, "_").slice(0, 120) || "file";
/** `2026/11/<id>/<name>`: dated so a bucket listing reads in order, id'd so two uploads of `logo.png` never collide. */
const r2Key = (id: string, name: string) => `${new Date().toISOString().slice(0, 7).replace("-", "/")}/${id}/${safeName(name)}`;

export async function createUpload(env: Env, exec: ExecutionContext | undefined, appId: string, input: UploadInput): Promise<UploadTicket> {
  const name = str(input.name, "name", { max: 255 });
  const mime = opt(input.mime, "mime", { max: 120, re: /^[\w.+-]+\/[\w.+-]+$/ });
  const size = input.size == null ? null : int(input.size, "size", { min: 0, max: 50 * 1024 * 1024 * 1024 });
  const kind = input.kind == null ? kindOf(mime, name) : oneOf(input.kind, "kind", KINDS);
  const provider = providerFor(env, kind, size);
  const id = nid();
  const ts = now();
  const expires = Math.floor(Date.now() / 1000) + UPLOAD_TTL_SECONDS;
  const meta: Record<string, unknown> = { ...obj(input.meta, "meta") };
  let providerId: string;
  let upload: UploadTicket["upload"];
  if (provider === "images") {
    const form = new FormData();
    form.set("requireSignedURLs", "false");
    form.set("metadata", JSON.stringify({ asset: id, workspace: env.WORKSPACE_ID }));
    form.set("expiry", new Date(expires * 1000).toISOString());
    const r = await cf<{ id: string; uploadURL: string }>(env, "POST", "/images/v2/direct_upload", form);
    providerId = r.id;
    upload = { method: "form", url: r.uploadURL, field: "file" };
    // upload.imagedelivery.net/<hash>/<id>: the first upload teaches the workspace its delivery hash.
    const hash = r.uploadURL.match(/imagedelivery\.net\/([^/]+)\//)?.[1];
    if (hash && !(await getSetting(env.DB, SETTING_HASH))) await setSetting(env.DB, SETTING_HASH, hash);
    if (!(await getSetting(env.DB, SETTING_FLEX))) {
      // Flexible variants (`/w=400,fit=cover`) are off by default on an account; one PATCH turns them on for good.
      await cf(env, "PATCH", "/images/v1/config", { flexible_variants: true }).then(() => setSetting(env.DB, SETTING_FLEX, "1")).catch((e) => console.warn("images: flexible variants", e));
    }
  } else if (provider === "stream") {
    const r = await cf<{ uid: string; uploadURL: string }>(env, "POST", "/stream/direct_upload", {
      maxDurationSeconds: int(input.maxDurationSeconds, "maxDurationSeconds", { min: 1, max: 6 * 3600, dflt: 3600 }),
      expiry: new Date(expires * 1000).toISOString(), requireSignedURLs: false, meta: { name, asset: id, workspace: env.WORKSPACE_ID },
    });
    providerId = r.uid;
    upload = { method: "form", url: r.uploadURL, field: "file" };
  } else {
    providerId = r2Key(id, name);
    upload = { method: "put", url: await signedPutUrl(env, id, expires) };
  }
  const row = (await env.DB.prepare(`INSERT INTO assets (id, kind, provider, provider_id, name, title, alt, mime, size, status, folder, tags, meta, app_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?) RETURNING *`)
    .bind(id, kind, provider, providerId, name, opt(input.title, "title", { max: 200 }), opt(input.alt, "alt", { max: 500 }), mime, size, input.folder == null ? "/" : folderOf(input.folder), JSON.stringify(input.tags == null ? [] : tagsOf(input.tags)), JSON.stringify(meta), appId, ts, ts).first<Row>())!;
  await writeTags(env.DB, id, JSON.parse(row.tags));
  await publish(env, exec, appId, [{ name: "asset.created", props: { id, kind, provider, name } }], { core: true });
  return { asset: (await hydrate(env, [row]))[0], upload, expires_at: new Date(expires * 1000).toISOString() };
}

async function writeTags(db: D1Database, id: string, tags: string[]): Promise<void> {
  await db.batch([db.prepare("DELETE FROM asset_tags WHERE asset_id = ?").bind(id), ...tags.map((t) => db.prepare("INSERT OR IGNORE INTO asset_tags (asset_id, tag) VALUES (?, ?)").bind(id, t))]);
}

/** What the provider says about the bytes right now. Never throws for "not there yet": that is a status. */
async function probe(env: Env, row: Row): Promise<Partial<Row> & { metaPatch?: Record<string, unknown> }> {
  if (row.provider === "images") {
    const r = await cf<{ id: string; filename?: string; draft?: boolean; uploaded?: string; variants?: string[] }>(env, "GET", `/images/v1/${row.provider_id}`);
    if (r.draft) return { status: "pending" };
    const hash = r.variants?.[0]?.match(/imagedelivery\.net\/([^/]+)\//)?.[1];
    if (hash && !(await getSetting(env.DB, SETTING_HASH))) await setSetting(env.DB, SETTING_HASH, hash);
    return { status: "ready", error: null };
  }
  if (row.provider === "stream") {
    type Video = { uid: string; readyToStream: boolean; status?: { state?: string; pctComplete?: string; errorReasonCode?: string; errorReasonText?: string }; duration?: number; thumbnail?: string; preview?: string; playback?: { hls?: string; dash?: string }; size?: number; input?: { width?: number; height?: number } };
    const v = await cf<Video>(env, "GET", `/stream/${row.provider_id}`);
    const host = v.playback?.hls?.match(/^https:\/\/([^/]+)\//)?.[1];
    if (host && !(await getSetting(env.DB, SETTING_STREAM))) await setSetting(env.DB, SETTING_STREAM, host);
    const state = v.status?.state ?? "";
    const metaPatch = { hls: v.playback?.hls, dash: v.playback?.dash, thumbnail: v.thumbnail, preview: v.preview, pctComplete: v.status?.pctComplete };
    const dims = { duration: v.duration != null && v.duration >= 0 ? v.duration : undefined, width: v.input?.width || undefined, height: v.input?.height || undefined, size: v.size || undefined };
    if (state === "error") return { status: "error", error: v.status?.errorReasonText ?? v.status?.errorReasonCode ?? "Stream could not process this file", metaPatch, ...dims };
    if (state === "pendingupload") return { status: "pending", metaPatch };
    if (v.readyToStream || state === "ready") return { status: "ready", error: null, metaPatch, ...dims };
    return { status: "processing", metaPatch, ...dims };
  }
  if (!env.FILES) return { status: "error", error: "no file storage bound" };
  const head = await env.FILES.head(row.provider_id);
  if (!head) return { status: "pending" };
  return { status: "ready", error: null, size: head.size, mime: head.httpMetadata?.contentType ?? row.mime };
}

async function applyProbe(env: Env, row: Row, done: UploadDone | undefined): Promise<Row> {
  const p = await probe(env, row);
  const meta = { ...(JSON.parse(row.meta || "{}") as Record<string, unknown>), ...Object.fromEntries(Object.entries(p.metaPatch ?? {}).filter(([, v]) => v != null)) };
  const d = done ?? {};
  const num = (v: unknown, name: string) => (v == null ? null : int(v, name, { min: 0, max: 1e12 }));
  const next = {
    status: p.status ?? row.status, error: p.error === undefined ? row.error : p.error,
    width: p.width ?? num(d.width, "width") ?? row.width, height: p.height ?? num(d.height, "height") ?? row.height,
    duration: p.duration ?? (d.duration == null ? null : Number(d.duration)) ?? row.duration, size: p.size ?? num(d.size, "size") ?? row.size,
    mime: p.mime ?? opt(d.mime, "mime", { max: 120 }) ?? row.mime,
  };
  return (await env.DB.prepare("UPDATE assets SET status = ?, error = ?, width = ?, height = ?, duration = ?, size = ?, mime = ?, meta = ?, updated_at = ? WHERE id = ? RETURNING *")
    .bind(next.status, next.error, next.width, next.height, next.duration, next.size, next.mime, JSON.stringify(meta), now(), row.id).first<Row>())!;
}

export async function completeUpload(env: Env, exec: ExecutionContext | undefined, appId: string, id: string, done?: UploadDone): Promise<Asset> {
  const before = await rowOf(env.DB, id);
  const row = await applyProbe(env, before, done == null ? undefined : (obj(done, "done") as UploadDone));
  if (row.status === "ready" && before.status !== "ready") await publish(env, exec, appId, [{ name: "asset.ready", props: { id, kind: row.kind, provider: row.provider, name: row.name } }], { core: true });
  return (await hydrate(env, [row]))[0];
}

export async function refreshAsset(env: Env, exec: ExecutionContext | undefined, id: string): Promise<Asset> {
  return completeUpload(env, exec, "core", id);
}

/** The signed PUT from `createUpload` for an R2 asset: the body goes to the bucket as it is. */
export async function handleUpload(request: Request, env: Env, exec: ExecutionContext, id: string): Promise<Response> {
  const url = new URL(request.url);
  const cors = { "access-control-allow-origin": "*", "access-control-allow-methods": "PUT, OPTIONS", "access-control-allow-headers": "content-type" };
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "PUT") return new Response("PUT the file here", { status: 405, headers: cors });
  if (!/^[A-Za-z0-9_-]{6,64}$/.test(id) || !(await verifyPut(env, id, url.searchParams.get("exp"), url.searchParams.get("sig")))) return new Response("This upload link has expired", { status: 401, headers: cors });
  if (!env.FILES) return new Response("No file storage", { status: 503, headers: cors });
  const row = await env.DB.prepare("SELECT * FROM assets WHERE id = ? AND provider = 'r2'").bind(id).first<Row>();
  if (!row) return new Response("Unknown asset", { status: 404, headers: cors });
  const contentType = request.headers.get("content-type")?.split(";")[0] || row.mime || "application/octet-stream";
  await env.FILES.put(row.provider_id, request.body, { httpMetadata: { contentType, contentDisposition: `inline; filename="${safeName(row.name)}"` }, customMetadata: { asset: id } });
  const next = await applyProbe(env, row, { mime: contentType });
  if (next.status === "ready" && row.status !== "ready") await publish(env, exec, row.app_id ?? "core", [{ name: "asset.ready", props: { id, kind: row.kind, provider: "r2", name: row.name } }], { core: true });
  return Response.json({ ok: true, asset: (await hydrate(env, [next]))[0] }, { headers: cors });
}

/** `/_ws/files/<key>`: an R2 object, cached hard because keys carry the asset id and never change content. */
export async function handleFile(request: Request, env: Env, key: string): Promise<Response> {
  if (!env.FILES) return new Response("No file storage", { status: 404 });
  if (request.method !== "GET" && request.method !== "HEAD") return new Response("GET only", { status: 405 });
  const object = await env.FILES.get(decodeURIComponent(key), { range: request.headers, onlyIf: request.headers });
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  headers.set("accept-ranges", "bytes");
  headers.set("access-control-allow-origin", "*");
  if (!("body" in object)) return new Response(null, { status: 304, headers });
  const range = object.range as { offset?: number; length?: number } | undefined;
  if (range && object.size != null && range.length != null && range.length < object.size) {
    headers.set("content-range", `bytes ${range.offset ?? 0}-${(range.offset ?? 0) + range.length - 1}/${object.size}`);
    return new Response(request.method === "HEAD" ? null : object.body, { status: 206, headers });
  }
  return new Response(request.method === "HEAD" ? null : object.body, { headers });
}

// ---- edit and remove -------------------------------------------------------------------------------------------------

export async function saveAsset(env: Env, exec: ExecutionContext | undefined, appId: string, input: AssetInput): Promise<Asset> {
  const row = await rowOf(env.DB, input.id);
  const sets: string[] = [];
  const binds: unknown[] = [];
  if (input.name !== undefined) { sets.push("name = ?"); binds.push(str(input.name, "name", { max: 255 })); }
  if (input.title !== undefined) { sets.push("title = ?"); binds.push(opt(input.title, "title", { max: 200 })); }
  if (input.alt !== undefined) { sets.push("alt = ?"); binds.push(opt(input.alt, "alt", { max: 500 })); }
  if (input.folder !== undefined) { sets.push("folder = ?"); binds.push(folderOf(input.folder)); }
  if (input.meta !== undefined) { sets.push("meta = ?"); binds.push(JSON.stringify({ ...(JSON.parse(row.meta || "{}") as object), ...obj(input.meta, "meta") })); }
  let tags: string[] | undefined;
  if (input.tags !== undefined) { tags = tagsOf(input.tags); sets.push("tags = ?"); binds.push(JSON.stringify(tags)); }
  if (!sets.length) return (await hydrate(env, [row]))[0];
  sets.push("updated_at = ?"); binds.push(now());
  const next = (await env.DB.prepare(`UPDATE assets SET ${sets.join(", ")} WHERE id = ? RETURNING *`).bind(...binds, row.id).first<Row>())!;
  if (tags) await writeTags(env.DB, row.id, tags);
  if (row.provider === "stream" && input.name !== undefined) void cf(env, "POST", `/stream/${row.provider_id}`, { meta: { name: next.name } }).catch(() => {});
  void appId;
  void exec;
  return (await hydrate(env, [next]))[0];
}

export async function removeAssets(env: Env, exec: ExecutionContext | undefined, appId: string, ids: string[]): Promise<void> {
  const want = strings(ids, "ids", 200);
  if (!want.length) return;
  const rows = (await env.DB.prepare(`SELECT * FROM assets WHERE id IN (${want.map(() => "?").join(",")})`).bind(...want).all<Row>()).results;
  if (!rows.length) return;
  // The bytes first, so a failure here leaves a row that still points somewhere real.
  const failures: string[] = [];
  for (const r of rows) {
    try {
      if (r.provider === "images") await cf(env, "DELETE", `/images/v1/${r.provider_id}`).catch((e) => { if (!/404|5404|not found/i.test(String(e))) throw e; });
      else if (r.provider === "stream") await cf(env, "DELETE", `/stream/${r.provider_id}`).catch((e) => { if (!/404|10005|not found/i.test(String(e))) throw e; });
      else if (env.FILES) await env.FILES.delete(r.provider_id);
    } catch (e) { failures.push(`${r.name}: ${(e as Error).message}`); }
  }
  const gone = rows.filter((r) => !failures.some((f) => f.startsWith(`${r.name}:`)));
  if (gone.length) await env.DB.prepare(`DELETE FROM assets WHERE id IN (${gone.map(() => "?").join(",")})`).bind(...gone.map((r) => r.id)).run();
  await publish(env, exec, appId, gone.map((r) => ({ name: "asset.deleted", props: { id: r.id, kind: r.kind, provider: r.provider, name: r.name } })), { core: true });
  if (failures.length) invalid(`could not remove ${failures.length} of ${rows.length}: ${failures.join("; ")}`);
}

// ---- analytics -------------------------------------------------------------------------------------------------------

const DAY = 86_400_000;

/**
 * Minutes viewed from Stream's GraphQL dataset `streamMinutesViewedAdaptiveGroups` (Cloudflare's bulk analytics), grouped
 * by video uid, day or viewer country, and mapped back onto the workspace's assets. Needs Account Analytics: Read on the token.
 */
export async function mediaAnalytics(env: Env, input: unknown): Promise<MediaAnalyticsRow[]> {
  const s = obj(input, "spec");
  const to = iso(s.to, "to") ?? new Date().toISOString();
  const from = iso(s.from, "from") ?? new Date(new Date(to).getTime() - int(s.days, "days", { min: 1, max: 365, dflt: 30 }) * DAY).toISOString();
  const groupBy = oneOf(s.groupBy, "groupBy", ["asset", "day", "country"] as const, "asset");
  const limit = int(s.limit, "limit", { min: 1, max: 1000, dflt: 100 });
  const assetId = opt(s.assetId, "assetId", { max: 64 });
  if (!hasMedia(env)) invalid("playback analytics need the media token; connect one on the Assets page");
  const filter: Record<string, unknown> = { date_geq: from.slice(0, 10), date_lt: new Date(new Date(to).getTime() + DAY).toISOString().slice(0, 10) };
  if (assetId) {
    const row = await rowOf(env.DB, assetId);
    if (row.provider !== "stream") return [];
    filter.uid = row.provider_id;
  }
  const dimension = groupBy === "asset" ? "uid" : groupBy === "day" ? "date" : "clientCountryName";
  const query = `query ($accountTag: string, $filter: AccountStreamMinutesViewedAdaptiveGroupsFilter_InputObject, $limit: uint64!) {
    viewer { accounts(filter: { accountTag: $accountTag }) {
      streamMinutesViewedAdaptiveGroups(limit: $limit, filter: $filter, orderBy: [${groupBy === "day" ? "date_ASC" : "sum_minutesViewed_DESC"}]) { count sum { minutesViewed } dimensions { ${dimension} } }
    } }
  }`.replace(/\s+/g, " ");
  const res = await fetch(`${CF_API}/graphql`, { method: "POST", headers: { authorization: `Bearer ${env.SG_MEDIA_TOKEN}`, "content-type": "application/json" }, body: JSON.stringify({ query, variables: { accountTag: env.CF_ACCOUNT_ID, filter, limit } }) });
  const json = (await res.json().catch(() => null)) as { data?: { viewer?: { accounts?: { streamMinutesViewedAdaptiveGroups?: { count: number; sum: { minutesViewed: number }; dimensions: Record<string, string> }[] }[] } }; errors?: { message: string }[] } | null;
  if (!res.ok || json?.errors?.length) throw new Error(`Stream analytics: ${json?.errors?.map((e) => e.message).join("; ") || res.status}`);
  const groups = json?.data?.viewer?.accounts?.[0]?.streamMinutesViewedAdaptiveGroups ?? [];
  const rows: MediaAnalyticsRow[] = groups.map((g) => ({ key: g.dimensions[dimension] ?? null, minutes: Math.round((g.sum?.minutesViewed ?? 0) * 100) / 100, views: g.count ?? 0 }));
  if (groupBy !== "asset") return rows;
  const uids = rows.map((r) => r.key).filter((k): k is string => !!k);
  const byUid = new Map<string, Row>();
  for (let i = 0; i < uids.length; i += 90) {
    const chunk = uids.slice(i, i + 90);
    for (const r of (await env.DB.prepare(`SELECT * FROM assets WHERE provider = 'stream' AND provider_id IN (${chunk.map(() => "?").join(",")})`).bind(...chunk).all<Row>()).results) byUid.set(r.provider_id, r);
  }
  const hydrated = await hydrate(env, [...byUid.values()]);
  const byId = new Map(hydrated.map((a) => [a.provider_id, a]));
  return rows.map((r) => {
    const a = r.key ? byId.get(r.key) : undefined;
    return { ...r, key: a?.id ?? r.key, asset: a ? { id: a.id, name: a.name, title: a.title, kind: a.kind, urls: a.urls } : null };
  });
}

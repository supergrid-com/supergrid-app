import { dialog, ipcMain, type WebContents } from "electron";
import { createReadStream, createWriteStream, promises as fs } from "node:fs";
import { request as httpsRequest } from "node:https";
import { basename } from "node:path";
import { channels, type FilesListing, type ImagesListing, type LibraryFile, type LibraryImage, type LibraryVideo, type LocalFile, type StreamAnalyticsRow, type StreamListing, type UploadProgress } from "../shared/bridge";
import { mimeOf } from "../shared/mime";
import { cfToken } from "./cf-api";

// The Library pages' path to Cloudflare: Images and Stream in the organization's account, and the
// workspace's own R2 bucket, all through the REST API on cf's login (cf-api.ts). Nothing is cached
// and no token is kept. Uploads read from disk here, so a video of any size goes up in resumable
// (tus) chunks without ever passing through the renderer, and each reports progress under the job
// id the renderer gave it.

const API = "https://api.cloudflare.com/client/v4";
const IMAGE_LIMIT = 10 * 1024 * 1024;
/** What one PUT through the R2 API takes; bigger files need multipart, which is not here yet. */
const FILE_LIMIT = 300 * 1024 * 1024;
/** A tus chunk: a multiple of 256 KiB, at least 5 MiB, as Stream requires; small enough for progress to move. */
const CHUNK = 16 * 1024 * 1024;

type ApiError = { code: number; message: string };
type Reply<T> = { success: boolean; result: T; errors?: ApiError[]; result_info?: Record<string, unknown> };

/** The API's own words, with the few errors people hit on a fresh account said plainly. */
function explain(status: number, errors: ApiError[] | undefined, path: string): Error {
  const list = errors ?? [];
  if (list.some((e) => e.code === 5453)) return new Error("Cloudflare Images isn't turned on for this account yet. Turn it on in the dashboard, then upload again.");
  if (list.some((e) => e.code === 10011)) return new Error("Stream has no storage on this account yet. Turn it on in the dashboard, then upload again.");
  if (status === 401 || status === 403) return new Error("cf's login can't do this in the account. Sign in again on the Cloudflare page.");
  const text = list.map((e) => e.message).join("; ");
  return new Error(text || `Cloudflare answered ${status} on ${path}.`);
}

async function api<T>(accountId: string, path: string, init: { method?: string; body?: BodyInit; headers?: Record<string, string>; signal?: AbortSignal } = {}): Promise<Reply<T>> {
  const token = await cfToken(accountId);
  const res = await fetch(`${API}/accounts/${accountId}${path}`, { method: init.method ?? "GET", headers: { authorization: `Bearer ${token}`, ...init.headers }, body: init.body, signal: init.signal });
  const text = await res.text();
  let json: Reply<T> | null = null;
  try {
    json = text ? (JSON.parse(text) as Reply<T>) : null;
  } catch {
    json = null;
  }
  if (!json) {
    if (res.ok) return { success: true, result: undefined as T };
    throw explain(res.status, undefined, path);
  }
  if (!res.ok || json.success === false) throw explain(res.status, json.errors, path);
  return json;
}

// ---- jobs: one AbortController per upload, progress to the window that asked ----

const jobs = new Map<string, AbortController>();

function begin(job: string): AbortController {
  const c = new AbortController();
  jobs.set(job, c);
  return c;
}

function report(sender: WebContents, p: UploadProgress): void {
  if (!sender.isDestroyed()) sender.send(channels.libProgress, p);
}

const aborted = (e: unknown) => (e as Error)?.name === "AbortError" || /aborted/i.test(String((e as Error)?.message ?? e));

/** Runs an upload under a job: progress events around it, the abort wired, and the error said once. */
async function run<T>(sender: WebContents, job: string, total: number, work: (signal: AbortSignal, tick: (loaded: number) => void) => Promise<T>): Promise<T> {
  const c = begin(job);
  report(sender, { job, loaded: 0, total, status: "uploading" });
  try {
    const out = await work(c.signal, (loaded) => report(sender, { job, loaded, total, status: "uploading" }));
    report(sender, { job, loaded: total, total, status: "done" });
    return out;
  } catch (e) {
    const message = aborted(e) ? "Cancelled" : String((e as Error)?.message ?? e);
    report(sender, { job, loaded: 0, total, status: "error", error: message });
    throw new Error(message);
  } finally {
    jobs.delete(job);
  }
}

// ---- the picker ----

const FILTERS = {
  image: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "gif", "webp", "avif", "svg"] }],
  media: [{ name: "Video and Audio", extensions: ["mp4", "m4v", "mov", "webm", "mkv", "avi", "mpg", "mpeg", "mp3", "m4a", "aac", "wav", "flac", "ogg", "aiff"] }],
  file: [{ name: "All Files", extensions: ["*"] }],
  any: [{ name: "All Files", extensions: ["*"] }],
};

export async function pick(opts: { kind: keyof typeof FILTERS; multiple?: boolean }): Promise<LocalFile[]> {
  const r = await dialog.showOpenDialog({ properties: opts.multiple ? ["openFile", "multiSelections"] : ["openFile"], filters: FILTERS[opts.kind] ?? FILTERS.any });
  if (r.canceled) return [];
  return Promise.all(r.filePaths.map(async (path) => ({ path, name: basename(path), size: (await fs.stat(path)).size, type: mimeOf(basename(path)) })));
}

// ---- Images ----

type RawImage = { id: string; filename?: string; uploaded?: string; requireSignedURLs?: boolean; variants?: string[]; meta?: Record<string, unknown> };

/** The account hash behind imagedelivery.net, from any image's variant URL. */
const hashOf = (images: RawImage[]): string | null => {
  for (const i of images) for (const v of i.variants ?? []) {
    const m = /^https:\/\/imagedelivery\.net\/([^/]+)\//.exec(v);
    if (m) return m[1];
  }
  return null;
};

const shapeImage = (i: RawImage, hash: string | null): LibraryImage => ({ id: i.id, filename: i.filename ?? i.id, uploaded: i.uploaded ?? "", requireSignedURLs: !!i.requireSignedURLs, meta: i.meta ?? {}, base: hash ? `https://imagedelivery.net/${hash}/${i.id}` : null });

export async function imagesList(accountId: string): Promise<ImagesListing> {
  const [stats, config] = await Promise.all([api<{ count: { current: number; allowed: number } }>(accountId, "/images/v1/stats"), api<{ flexible_variants?: boolean }>(accountId, "/images/v1/config").catch(() => null)]);
  const images: RawImage[] = [];
  let token: string | null = null;
  for (let page = 0; page < 20; page++) {
    const r: Reply<{ images: RawImage[]; continuation_token: string | null }> = await api(accountId, `/images/v2?per_page=1000${token ? `&continuation_token=${encodeURIComponent(token)}` : ""}`);
    images.push(...(r.result.images ?? []));
    token = r.result.continuation_token;
    if (!token) break;
  }
  const hash = hashOf(images);
  const count = stats.result.count;
  images.sort((a, b) => (b.uploaded ?? "").localeCompare(a.uploaded ?? ""));
  return { enabled: count.allowed > 0, hash, flexible: !!config?.result?.flexible_variants, current: count.current, allowed: count.allowed, images: images.map((i) => shapeImage(i, hash)) };
}

/** Flexible variants let any `w=,h=,fit=` URL work without defining variants; switched on once per run, before the first upload. */
const flexibleOn = new Set<string>();
async function ensureFlexible(accountId: string): Promise<void> {
  if (flexibleOn.has(accountId)) return;
  await api(accountId, "/images/v1/config", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ flexible_variants: true }) }).catch(() => {});
  flexibleOn.add(accountId);
}

export async function imagesUpload(sender: WebContents, accountId: string, job: string, file: LocalFile, meta: Record<string, unknown>): Promise<LibraryImage> {
  if (file.size > IMAGE_LIMIT) throw new Error(`${file.name} is over the 10 MB Cloudflare Images takes. Put it in Files instead.`);
  return run(sender, job, file.size, async (signal) => {
    await ensureFlexible(accountId);
    const bytes = await fs.readFile(file.path);
    const form = new FormData();
    form.append("file", new Blob([bytes], { type: mimeOf(file.name, file.type) }), file.name);
    form.append("metadata", JSON.stringify(meta));
    form.append("requireSignedURLs", "false");
    const r = await api<RawImage>(accountId, "/images/v1", { method: "POST", body: form, signal });
    return shapeImage(r.result, hashOf([r.result]));
  });
}

export async function imagesUpdate(accountId: string, id: string, meta: Record<string, unknown>): Promise<LibraryImage> {
  const r = await api<RawImage>(accountId, `/images/v1/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ metadata: meta }) });
  return shapeImage(r.result, hashOf([r.result]));
}

export async function imagesRemove(accountId: string, ids: string[]): Promise<void> {
  for (const id of ids) await api(accountId, `/images/v1/${encodeURIComponent(id)}`, { method: "DELETE" }).catch((e) => { if (!/not found|5404/i.test(String(e))) throw e; });
}

// ---- Stream ----

type RawVideo = {
  uid: string;
  thumbnail?: string;
  readyToStream?: boolean;
  status?: { state?: string; pctComplete?: string; errorReasonText?: string };
  meta?: Record<string, string>;
  created?: string;
  modified?: string;
  size?: number;
  preview?: string;
  playback?: { hls?: string; dash?: string };
  duration?: number;
  input?: { width?: number; height?: number };
  requireSignedURLs?: boolean;
};

const customerOf = (v: RawVideo[]): string | null => {
  for (const x of v) {
    const m = /^https:\/\/(customer-[a-z0-9]+)\.cloudflarestream\.com\//.exec(x.playback?.hls ?? x.thumbnail ?? x.preview ?? "");
    if (m) return m[1];
  }
  return null;
};

const shapeVideo = (v: RawVideo): LibraryVideo => ({
  uid: v.uid,
  name: v.meta?.name ?? v.uid,
  created: v.created ?? "",
  modified: v.modified ?? v.created ?? "",
  size: v.size ?? 0,
  duration: v.duration && v.duration > 0 ? v.duration : 0,
  state: v.status?.state ?? "unknown",
  pctComplete: Number(v.status?.pctComplete ?? (v.readyToStream ? 100 : 0)) || 0,
  error: v.status?.errorReasonText || null,
  readyToStream: !!v.readyToStream,
  thumbnail: v.thumbnail ?? null,
  preview: v.preview ?? null,
  hls: v.playback?.hls ?? null,
  dash: v.playback?.dash ?? null,
  width: v.input?.width && v.input.width > 0 ? v.input.width : null,
  height: v.input?.height && v.input.height > 0 ? v.input.height : null,
  requireSignedURLs: !!v.requireSignedURLs,
  meta: v.meta ?? {},
});

export async function streamList(accountId: string): Promise<StreamListing> {
  const [usage, list] = await Promise.all([
    api<{ videoCount: number; totalStorageMinutes: number; totalStorageMinutesLimit: number }>(accountId, "/stream/storage-usage").catch(() => null),
    api<RawVideo[]>(accountId, "/stream?per_page=1000"),
  ]);
  const videos = (list.result ?? []).slice().sort((a, b) => (b.created ?? "").localeCompare(a.created ?? ""));
  const u = usage?.result;
  return { enabled: !u || u.totalStorageMinutesLimit > 0, customer: customerOf(videos), videoCount: u?.videoCount ?? videos.length, minutes: u?.totalStorageMinutes ?? 0, minutesLimit: u?.totalStorageMinutesLimit ?? 0, videos: videos.map(shapeVideo) };
}

export async function streamGet(accountId: string, uid: string): Promise<LibraryVideo> {
  return shapeVideo((await api<RawVideo>(accountId, `/stream/${encodeURIComponent(uid)}`)).result);
}

export async function streamUpdate(accountId: string, uid: string, opts: { name?: string; meta?: Record<string, string> }): Promise<LibraryVideo> {
  const current = (await api<RawVideo>(accountId, `/stream/${encodeURIComponent(uid)}`)).result;
  const meta = { ...(current.meta ?? {}), ...(opts.meta ?? {}), ...(opts.name !== undefined ? { name: opts.name } : {}) };
  const r = await api<RawVideo>(accountId, `/stream/${encodeURIComponent(uid)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ meta }) });
  return shapeVideo(r.result);
}

export async function streamRemove(accountId: string, uids: string[]): Promise<void> {
  for (const uid of uids) await api(accountId, `/stream/${encodeURIComponent(uid)}`, { method: "DELETE" }).catch((e) => { if (!/not found|10005/i.test(String(e))) throw e; });
}

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64");

/**
 * The tus upload Stream documents for large files: one POST to create it (the Location header is where the bytes go),
 * then PATCHes of CHUNK bytes each, each answered with the next offset. A failed chunk asks the server where it stands
 * (HEAD) and carries on from there, a few times, before giving up. Cancelling deletes what was created.
 */
export async function streamUpload(sender: WebContents, accountId: string, job: string, file: LocalFile, opts: { name: string; meta: Record<string, string> }): Promise<LibraryVideo> {
  return run(sender, job, file.size, async (signal, tick) => {
    const token = await cfToken(accountId);
    const auth = { authorization: `Bearer ${token}`, "Tus-Resumable": "1.0.0" };
    const created = await fetch(`${API}/accounts/${accountId}/stream`, { method: "POST", headers: { ...auth, "Upload-Length": String(file.size), "Upload-Metadata": `name ${b64(opts.name)}` }, signal });
    if (!created.ok) {
      const body = (await created.json().catch(() => null)) as Reply<unknown> | null;
      throw explain(created.status, body?.errors, "/stream");
    }
    const location = created.headers.get("location");
    const uid = created.headers.get("stream-media-id");
    if (!location || !uid) throw new Error("Stream did not say where to send the file.");
    const handle = await fs.open(file.path, "r");
    let offset = 0;
    let retries = 0;
    try {
      while (offset < file.size) {
        if (signal.aborted) throw new Error("aborted");
        const len = Math.min(CHUNK, file.size - offset);
        const buf = Buffer.alloc(len);
        await handle.read(buf, 0, len, offset);
        const res = await fetch(location, { method: "PATCH", headers: { ...auth, "Upload-Offset": String(offset), "Content-Type": "application/offset+octet-stream", "Content-Length": String(len) }, body: buf, signal });
        if (res.ok) {
          offset = Number(res.headers.get("upload-offset") ?? offset + len);
          retries = 0;
        } else {
          if (++retries > 4) throw new Error(`Stream stopped taking the upload (${res.status}).`);
          const head = await fetch(location, { method: "HEAD", headers: auth, signal });
          const at = Number(head.headers.get("upload-offset"));
          if (Number.isFinite(at)) offset = at;
          await new Promise((r) => setTimeout(r, 1000 * retries));
        }
        tick(offset);
      }
    } catch (e) {
      // what was created is not worth keeping half full
      await fetch(`${API}/accounts/${accountId}/stream/${uid}`, { method: "DELETE", headers: auth }).catch(() => {});
      throw e;
    } finally {
      await handle.close();
    }
    if (Object.keys(opts.meta).length) await streamUpdate(accountId, uid, { meta: opts.meta }).catch(() => {});
    return streamGet(accountId, uid);
  });
}

/** Stream's bulk analytics (`streamMinutesViewedAdaptiveGroups`), the way the dashboard reads them; the account allows about a month at a time. */
export async function streamAnalytics(accountId: string, opts: { days: number; uid?: string; groupBy: "uid" | "day" | "country" }): Promise<StreamAnalyticsRow[]> {
  const days = Math.min(31, Math.max(1, Math.round(opts.days || 30)));
  const DAY = 86_400_000;
  const end = Date.now() + DAY;
  const filter: Record<string, unknown> = { date_geq: new Date(end - (days + 1) * DAY).toISOString().slice(0, 10), date_lt: new Date(end).toISOString().slice(0, 10) };
  if (opts.uid) filter.uid = opts.uid;
  const dimension = opts.groupBy === "uid" ? "uid" : opts.groupBy === "day" ? "date" : "clientCountryName";
  const query = `query ($accountTag: string, $filter: AccountStreamMinutesViewedAdaptiveGroupsFilter_InputObject, $limit: uint64!) {
    viewer { accounts(filter: { accountTag: $accountTag }) {
      streamMinutesViewedAdaptiveGroups(limit: $limit, filter: $filter, orderBy: [${opts.groupBy === "day" ? "date_ASC" : "sum_minutesViewed_DESC"}]) { count sum { minutesViewed } dimensions { ${dimension} } }
    } }
  }`.replace(/\s+/g, " ");
  const token = await cfToken(accountId);
  const res = await fetch(`${API}/graphql`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ query, variables: { accountTag: accountId, filter, limit: 500 } }) });
  const json = (await res.json().catch(() => null)) as { data?: { viewer?: { accounts?: { streamMinutesViewedAdaptiveGroups?: { count: number; sum: { minutesViewed: number }; dimensions: Record<string, string> }[] }[] } }; errors?: { message: string }[] } | null;
  if (!res.ok || json?.errors?.length) {
    const text = json?.errors?.map((e) => e.message).join("; ") || `Stream analytics answered ${res.status}.`;
    if (/rate limit/i.test(text)) throw new Error("Cloudflare is rate-limiting analytics for this account right now. Try again in a few minutes.");
    throw new Error(text);
  }
  const groups = json?.data?.viewer?.accounts?.[0]?.streamMinutesViewedAdaptiveGroups ?? [];
  return groups.map((g) => ({ key: g.dimensions[dimension] ?? null, minutes: Math.round((g.sum?.minutesViewed ?? 0) * 100) / 100, views: g.count ?? 0 }));
}

// ---- Files: the workspace's R2 bucket ----

type RawObject = { key: string; size: number; etag: string; last_modified?: string; http_metadata?: { contentType?: string } };
const shapeFile = (o: RawObject): LibraryFile => ({ key: o.key, size: Number(o.size) || 0, etag: o.etag, modified: o.last_modified ?? "", contentType: o.http_metadata?.contentType ?? null });
const objectPath = (bucket: string, key: string) => `/r2/buckets/${encodeURIComponent(bucket)}/objects/${key.split("/").map(encodeURIComponent).join("/")}`;

export async function filesList(accountId: string, bucket: string, opts: { prefix?: string } = {}): Promise<FilesListing> {
  const files: LibraryFile[] = [];
  let cursor: string | null = null;
  let more = false;
  for (let page = 0; page < 10; page++) {
    const r: Reply<RawObject[]> = await api(accountId, `/r2/buckets/${encodeURIComponent(bucket)}/objects?per_page=1000${opts.prefix ? `&prefix=${encodeURIComponent(opts.prefix)}` : ""}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`);
    files.push(...(r.result ?? []).map(shapeFile));
    const info: Record<string, unknown> = r.result_info ?? {};
    cursor = typeof info.cursor === "string" && info.cursor ? info.cursor : null;
    more = !!info.is_truncated && !!cursor;
    if (!more) break;
  }
  files.sort((a, b) => b.modified.localeCompare(a.modified));
  return { files, more };
}

/** One PUT with the file streamed from disk, on node:https so the bytes sent can be counted and the request dropped on cancel. */
function putObject(url: string, token: string, file: LocalFile, contentType: string, signal: AbortSignal, tick: (n: number) => void): Promise<Reply<RawObject>> {
  return new Promise((resolve, reject) => {
    const req = httpsRequest(url, { method: "PUT", headers: { authorization: `Bearer ${token}`, "content-type": contentType, "content-length": String(file.size) } }, (res) => {
      let text = "";
      res.setEncoding("utf8");
      res.on("data", (d: string) => (text += d));
      res.on("end", () => {
        let json: Reply<RawObject> | null = null;
        try {
          json = JSON.parse(text) as Reply<RawObject>;
        } catch {
          json = null;
        }
        if (!json) return reject(explain(res.statusCode ?? 0, undefined, "/r2"));
        if ((res.statusCode ?? 500) >= 400 || json.success === false) return reject(explain(res.statusCode ?? 0, json.errors, "/r2"));
        resolve(json);
      });
    });
    req.on("error", reject);
    const stream = createReadStream(file.path);
    let sent = 0;
    stream.on("data", (chunk: string | Buffer) => {
      sent += chunk.length;
      tick(sent);
    });
    stream.on("error", reject);
    signal.addEventListener("abort", () => {
      stream.destroy();
      req.destroy(new Error("aborted"));
    });
    stream.pipe(req);
  });
}

export async function filesUpload(sender: WebContents, accountId: string, job: string, bucket: string, file: LocalFile, opts: { key: string; contentType?: string }): Promise<LibraryFile> {
  if (file.size > FILE_LIMIT) throw new Error(`${file.name} is over the 300 MB one upload takes for now.`);
  const key = opts.key.replace(/^\/+/, "");
  if (!key) throw new Error("A file needs a name.");
  return run(sender, job, file.size, async (signal, tick) => {
    const token = await cfToken(accountId);
    const r = await putObject(`${API}/accounts/${accountId}${objectPath(bucket, key)}`, token, file, mimeOf(file.name, opts.contentType ?? file.type), signal, tick);
    const o = r.result;
    return shapeFile({ key: o?.key ?? key, size: o?.size ?? file.size, etag: o?.etag ?? "", last_modified: (o as { uploaded?: string })?.uploaded ?? new Date().toISOString(), http_metadata: { contentType: mimeOf(file.name, opts.contentType ?? file.type) } });
  });
}

export async function filesRemove(accountId: string, bucket: string, keys: string[]): Promise<void> {
  for (const key of keys) await api(accountId, objectPath(bucket, key), { method: "DELETE" }).catch((e) => { if (!/not found|10007/i.test(String(e))) throw e; });
}

/** GETs the object through the API and writes it where the user says. */
export async function filesSave(accountId: string, bucket: string, key: string): Promise<boolean> {
  const r = await dialog.showSaveDialog({ defaultPath: basename(key) });
  if (r.canceled || !r.filePath) return false;
  const token = await cfToken(accountId);
  const res = await fetch(`${API}/accounts/${accountId}${objectPath(bucket, key)}`, { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok || !res.body) throw new Error(`Cloudflare answered ${res.status} for ${key}.`);
  await new Promise<void>((resolve, reject) => {
    const out = createWriteStream(r.filePath);
    out.on("finish", resolve);
    out.on("error", reject);
    const reader = res.body!.getReader();
    const pump = (): void => {
      reader.read().then(({ done, value }) => {
        if (done) return out.end();
        out.write(Buffer.from(value), (err) => (err ? reject(err) : pump()));
      }, reject);
    };
    pump();
  });
  return true;
}

// ---- IPC ----

const str = (v: unknown, what: string): string => {
  if (typeof v !== "string" || !v) throw new Error(`Missing ${what}.`);
  return v;
};
const strs = (v: unknown, what: string): string[] => {
  if (!Array.isArray(v) || !v.every((x) => typeof x === "string")) throw new Error(`Missing ${what}.`);
  return v as string[];
};
const local = (v: unknown): LocalFile => {
  const f = v as Partial<LocalFile> | undefined;
  if (!f || typeof f.path !== "string" || !f.path || typeof f.name !== "string" || !f.name) throw new Error("A file needs a path and a name.");
  return { path: f.path, name: f.name, size: typeof f.size === "number" ? f.size : 0, type: typeof f.type === "string" ? f.type : null };
};
const rec = <T>(v: unknown): Record<string, T> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, T>) : {});

export function registerLibrary(): void {
  ipcMain.handle(channels.libPick, (_e, opts: unknown) => {
    const o = rec<unknown>(opts);
    const kind = typeof o.kind === "string" && o.kind in FILTERS ? (o.kind as keyof typeof FILTERS) : "any";
    return pick({ kind, multiple: o.multiple === true });
  });
  ipcMain.handle(channels.libCancel, (_e, job: unknown) => {
    if (typeof job === "string") jobs.get(job)?.abort();
  });
  ipcMain.handle(channels.libImagesList, (_e, a: unknown) => imagesList(str(a, "account")));
  ipcMain.handle(channels.libImagesUpload, (e, a: unknown, job: unknown, file: unknown, meta: unknown) => imagesUpload(e.sender, str(a, "account"), str(job, "job"), local(file), rec(meta)));
  ipcMain.handle(channels.libImagesUpdate, (_e, a: unknown, id: unknown, meta: unknown) => imagesUpdate(str(a, "account"), str(id, "image"), rec(meta)));
  ipcMain.handle(channels.libImagesRemove, (_e, a: unknown, ids: unknown) => imagesRemove(str(a, "account"), strs(ids, "images")));
  ipcMain.handle(channels.libStreamList, (_e, a: unknown) => streamList(str(a, "account")));
  ipcMain.handle(channels.libStreamGet, (_e, a: unknown, uid: unknown) => streamGet(str(a, "account"), str(uid, "video")));
  ipcMain.handle(channels.libStreamUpload, (e, a: unknown, job: unknown, file: unknown, opts: unknown) => {
    const o = rec<unknown>(opts);
    const f = local(file);
    return streamUpload(e.sender, str(a, "account"), str(job, "job"), f, { name: typeof o.name === "string" && o.name ? o.name : f.name, meta: rec<string>(o.meta) });
  });
  ipcMain.handle(channels.libStreamUpdate, (_e, a: unknown, uid: unknown, opts: unknown) => {
    const o = rec<unknown>(opts);
    return streamUpdate(str(a, "account"), str(uid, "video"), { name: typeof o.name === "string" ? o.name : undefined, meta: o.meta ? rec<string>(o.meta) : undefined });
  });
  ipcMain.handle(channels.libStreamRemove, (_e, a: unknown, uids: unknown) => streamRemove(str(a, "account"), strs(uids, "videos")));
  ipcMain.handle(channels.libStreamAnalytics, (_e, a: unknown, opts: unknown) => {
    const o = rec<unknown>(opts);
    const groupBy = o.groupBy === "day" || o.groupBy === "country" ? o.groupBy : "uid";
    return streamAnalytics(str(a, "account"), { days: typeof o.days === "number" ? o.days : 30, uid: typeof o.uid === "string" ? o.uid : undefined, groupBy });
  });
  ipcMain.handle(channels.libFilesList, (_e, a: unknown, bucket: unknown, opts: unknown) => {
    const o = rec<unknown>(opts);
    return filesList(str(a, "account"), str(bucket, "bucket"), { prefix: typeof o.prefix === "string" ? o.prefix : undefined });
  });
  ipcMain.handle(channels.libFilesUpload, (e, a: unknown, job: unknown, bucket: unknown, file: unknown, opts: unknown) => {
    const o = rec<unknown>(opts);
    return filesUpload(e.sender, str(a, "account"), str(job, "job"), str(bucket, "bucket"), local(file), { key: str(o.key, "key"), contentType: typeof o.contentType === "string" ? o.contentType : undefined });
  });
  ipcMain.handle(channels.libFilesRemove, (_e, a: unknown, bucket: unknown, keys: unknown) => filesRemove(str(a, "account"), str(bucket, "bucket"), strs(keys, "files")));
  ipcMain.handle(channels.libFilesSave, (_e, a: unknown, bucket: unknown, key: unknown) => filesSave(str(a, "account"), str(bucket, "bucket"), str(key, "file")));
}

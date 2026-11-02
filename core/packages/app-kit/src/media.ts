// Assets in the browser and on the server, with no framework: URLs for an asset the workspace returned, and the upload
// runner that takes a File through `createUpload` → the bytes → `completeUpload`. React wrappers in ./media-react.tsx.
// Written to be copied into an app and edited; nothing here imports anything but the types.
import type { Asset, AssetUrls, UploadDone, UploadInput, UploadTicket, WorkspaceRpc } from "./rpc";

/** Cloudflare Images' URL options. Anything omitted is left to the account's defaults. */
export type ImageOptions = {
  width?: number;
  height?: number;
  /** `scale-down` (default) never enlarges; `cover` fills the box and crops; `contain` fits inside; `pad` fills with `background`. */
  fit?: "scale-down" | "contain" | "cover" | "crop" | "pad" | "squeeze" | "scale-up";
  /** 1–100, default 85. */
  quality?: number;
  /** `auto` picks AVIF or WebP by the browser's Accept header. */
  format?: "auto" | "avif" | "webp" | "jpeg" | "baseline-jpeg";
  dpr?: number;
  /** `auto` or `face` for smart crops; `0.5x0.2` for a focal point. */
  gravity?: "auto" | "face" | "left" | "right" | "top" | "bottom" | `${number}x${number}`;
  background?: string;
  blur?: number;
  sharpen?: number;
  /** `false` renders a still frame of an animation. */
  anim?: boolean;
};

const OPTION_KEYS: Record<keyof ImageOptions, string> = { width: "w", height: "h", fit: "fit", quality: "q", format: "f", dpr: "dpr", gravity: "g", background: "background", blur: "blur", sharpen: "sharpen", anim: "anim" };

/** `w=400,h=300,fit=cover`: the flexible-variant segment, or `public` with no options. */
export function imageVariant(opts: ImageOptions = {}): string {
  const parts = (Object.keys(opts) as (keyof ImageOptions)[]).filter((k) => opts[k] !== undefined && opts[k] !== null).map((k) => `${OPTION_KEYS[k]}=${String(opts[k])}`);
  return parts.length ? parts.join(",") : "public";
}

type Urlish = Pick<Asset, "urls" | "provider"> & Partial<Pick<Asset, "kind">>;

/**
 * A URL for an image at a size. On Images the options are applied by Cloudflare; on R2 (no Images) the original is returned,
 * so an `<img width>` still lays out right and a later move to Images needs no code change.
 */
export function imageUrl(asset: Urlish | null | undefined, opts: ImageOptions = {}): string | null {
  if (!asset) return null;
  const { urls } = asset;
  if (asset.provider === "images" && urls.base) return `${urls.base}/${imageVariant(opts)}`;
  return urls.thumbnail ?? urls.src;
}

/** A `srcset` across widths, for `<img sizes>`; empty off Images, where there is one size. */
export function imageSrcSet(asset: Urlish | null | undefined, widths: number[], opts: Omit<ImageOptions, "width"> = {}): string {
  if (!asset || asset.provider !== "images" || !asset.urls.base) return "";
  return widths.map((w) => `${imageUrl(asset, { ...opts, width: w })} ${w}w`).join(", ");
}

/** The Stream player URL for an iframe, with its options on the query string. */
export function streamEmbedUrl(asset: Urlish | null | undefined, opts: { autoplay?: boolean; muted?: boolean; loop?: boolean; controls?: boolean; poster?: string; preload?: "none" | "metadata" | "auto"; startTime?: number | string; primaryColor?: string; letterboxColor?: string; defaultTextTrack?: string } = {}): string | null {
  const embed = asset?.urls.embed;
  if (!embed) return null;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(opts)) if (v !== undefined && v !== null && v !== false) q.set(k, String(v));
  const s = q.toString();
  return s ? `${embed}?${s}` : embed;
}

/** A frame of a Stream video as a JPEG: `time` like `3s` or `10%`, `height` in pixels, `fit` as Images' fits. */
export function streamThumbnailUrl(asset: Urlish | null | undefined, opts: { time?: string; height?: number; width?: number; fit?: "crop" | "clip" | "scale" | "fill" } = {}): string | null {
  const t = asset?.urls.thumbnail;
  if (!t) return null;
  if (asset?.provider !== "stream") return t;
  const url = new URL(t);
  for (const [k, v] of Object.entries(opts)) if (v !== undefined) url.searchParams.set(k, String(v));
  return url.toString();
}

/** A plain file's URL (R2), or whatever the asset serves as its `src`. */
export const fileUrl = (asset: Urlish | null | undefined): string | null => asset?.urls.src ?? null;

/** `urls` with nothing in them: an asset still uploading, or one on a provider the workspace can't reach yet. */
export const hasUrls = (urls: AssetUrls | undefined): boolean => !!urls && (urls.src != null || urls.thumbnail != null || !!urls.embed);

// ---- uploading -----------------------------------------------------------------------------------------------------

export type UploadClient = Pick<WorkspaceRpc, "createUpload" | "completeUpload">;
export type UploadProgress = { loaded: number; total: number; fraction: number };

/** What the browser can tell about a file before sending it, so the row is complete when the bytes land. */
export async function measureFile(file: File): Promise<UploadDone> {
  const done: UploadDone = { size: file.size, mime: file.type || undefined };
  if (typeof document === "undefined" || typeof URL === "undefined") return done;
  const url = URL.createObjectURL(file);
  try {
    if (file.type.startsWith("image/") && file.type !== "image/svg+xml") {
      const img = new Image();
      await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error("not an image")); img.src = url; });
      done.width = img.naturalWidth;
      done.height = img.naturalHeight;
    } else if (file.type.startsWith("video/") || file.type.startsWith("audio/")) {
      const el = document.createElement(file.type.startsWith("video/") ? "video" : "audio");
      el.preload = "metadata";
      await new Promise<void>((resolve) => { el.onloadedmetadata = () => resolve(); el.onerror = () => resolve(); el.src = url; setTimeout(resolve, 4000); });
      if (Number.isFinite(el.duration) && el.duration > 0) done.duration = Math.round(el.duration * 1000) / 1000;
      if (el instanceof HTMLVideoElement && el.videoWidth) { done.width = el.videoWidth; done.height = el.videoHeight; }
    }
  } catch { /* measurements are optional */ } finally { URL.revokeObjectURL(url); }
  return done;
}

/** Sends the bytes where the ticket says, with progress. XHR because fetch has no upload progress. */
export function sendBytes(ticket: UploadTicket, file: File, onProgress?: (p: UploadProgress) => void, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const { upload } = ticket;
    xhr.open(upload.method === "form" ? "POST" : "PUT", upload.url);
    xhr.upload.onprogress = (e) => { if (onProgress) onProgress({ loaded: e.loaded, total: e.lengthComputable ? e.total : file.size, fraction: e.lengthComputable && e.total ? e.loaded / e.total : 0 }); };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`upload failed: ${xhr.status} ${xhr.responseText.slice(0, 200)}`)));
    xhr.onerror = () => reject(new Error("upload failed: network error"));
    xhr.onabort = () => reject(new DOMException("upload cancelled", "AbortError"));
    signal?.addEventListener("abort", () => xhr.abort());
    if (upload.method === "form") {
      const form = new FormData();
      form.append(upload.field, file, file.name);
      xhr.send(form);
    } else {
      if (file.type) xhr.setRequestHeader("content-type", file.type);
      xhr.send(file);
    }
  });
}

/**
 * The whole thing: a ticket, the bytes, the confirmation. `appId` is who is uploading (the app's manifest id).
 * Resolves with the asset as the workspace sees it, which for video may still be `processing`.
 */
export async function uploadFile(client: UploadClient, appId: string, file: File, input: Partial<UploadInput> = {}, opts: { onProgress?: (p: UploadProgress) => void; signal?: AbortSignal; onTicket?: (t: UploadTicket) => void } = {}): Promise<Asset> {
  const [ticket, measured] = await Promise.all([
    client.createUpload(appId, { name: file.name, mime: file.type || undefined, size: file.size, ...input }),
    measureFile(file),
  ]);
  opts.onTicket?.(ticket);
  await sendBytes(ticket, file, opts.onProgress, opts.signal);
  return client.completeUpload(appId, ticket.asset.id, measured);
}

/** Bytes as people read them. */
export function formatBytes(n: number | null | undefined): string {
  if (n == null) return "";
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}

/** Seconds as `m:ss` or `h:mm:ss`. */
export function formatDuration(s: number | null | undefined): string {
  if (s == null || !Number.isFinite(s)) return "";
  const total = Math.round(s);
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), sec = total % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
}

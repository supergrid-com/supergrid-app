// React components over an asset: a picture at the right size, the Stream player, an audio player, a file link, and
// an upload hook. Copy into an app and change what you like; they depend on React and ./media only. Each takes the
// `Asset` the workspace returned (from `listAssets`, `getAsset` or an upload) and reads `asset.urls`, so an app never
// builds a Cloudflare URL by hand.
import { createElement, useCallback, useRef, useState, type AnchorHTMLAttributes, type CSSProperties, type ImgHTMLAttributes, type ReactNode } from "react";
import type { Asset, UploadInput } from "./rpc";
import { fileUrl, imageSrcSet, imageUrl, streamEmbedUrl, streamThumbnailUrl, uploadFile, type ImageOptions, type UploadClient, type UploadProgress } from "./media";

type AssetLike = Pick<Asset, "urls" | "provider"> & Partial<Pick<Asset, "kind" | "alt" | "title" | "name" | "width" | "height">>;

const DEFAULT_WIDTHS = [320, 480, 640, 960, 1280, 1920];

export type ImgProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet" | "width" | "height"> & {
  asset: AssetLike | null | undefined;
  /** The CSS width the image will be drawn at; also the largest `srcset` entry. Omit for the original. */
  width?: number;
  height?: number;
  /** Image options applied to every size. */
  options?: Omit<ImageOptions, "width" | "height">;
  /** `srcset` widths; defaults to a standard ladder up to `width`. */
  widths?: number[];
  /** What to show while there is nothing to load (the asset is still uploading, or null). */
  fallback?: ReactNode;
};

/** A picture from Cloudflare Images at the size it is drawn, with a `srcset` for the ladder below it. On R2 it is the original. */
export function Img({ asset, width, height, options = {}, widths, sizes, fallback = null, alt, loading = "lazy", decoding = "async", ...rest }: ImgProps) {
  const fit = options.fit ?? (width && height ? "cover" : undefined);
  const src = imageUrl(asset, { ...options, width, height, fit });
  if (!src) return createElement(Fallback, { fallback, width, height, style: rest.style });
  const ladder = (widths ?? DEFAULT_WIDTHS).filter((w) => !width || w <= width);
  // Each rung keeps the drawn box's ratio, so a 2x screen gets the same crop at twice the pixels.
  const srcSet = asset?.provider === "images" && asset.urls.base
    ? (ladder.length ? ladder : [width!]).map((w) => `${imageUrl(asset, { ...options, width: w, height: height && width ? Math.round((w * height) / width) : undefined, fit })} ${w}w`).join(", ")
    : imageSrcSet(asset, []);
  // The ratio keeps the box from jumping as the picture arrives; a known natural size does the same with no options.
  const ratio = width && height ? { aspectRatio: `${width} / ${height}` } : asset?.width && asset?.height ? { aspectRatio: `${asset.width} / ${asset.height}` } : {};
  return createElement("img", {
    src, srcSet: srcSet || undefined, sizes: srcSet ? (sizes ?? (width ? `${width}px` : "100vw")) : undefined,
    width: width ?? asset?.width ?? undefined, height: height ?? asset?.height ?? undefined,
    alt: alt ?? asset?.alt ?? asset?.title ?? "", loading, decoding, ...rest, style: { ...ratio, ...rest.style },
  });
}

function Fallback({ fallback, width, height, style }: { fallback: ReactNode; width?: number; height?: number; style?: CSSProperties }) {
  return createElement("div", { "aria-hidden": true, style: { width, height, background: "rgba(127,127,127,.12)", display: "inline-block", ...style } }, fallback);
}

export type VideoProps = {
  asset: AssetLike | null | undefined;
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  /** `metadata` or `auto` to start fetching before play. */
  preload?: "none" | "metadata" | "auto";
  /** A poster URL; defaults to the video's own thumbnail. */
  poster?: string;
  startTime?: number | string;
  /** The player's accent, a CSS color. */
  primaryColor?: string;
  /** The box's ratio while the player loads; defaults to the video's. */
  aspectRatio?: string;
  title?: string;
  className?: string;
  style?: CSSProperties;
};

/** Cloudflare Stream's player in an iframe: adaptive quality, captions, the lot, with nothing to install. */
export function Video({ asset, aspectRatio, title, className, style, poster, ...opts }: VideoProps) {
  const src = streamEmbedUrl(asset, { ...opts, poster: poster ?? undefined });
  const ratio = aspectRatio ?? (asset?.width && asset?.height ? `${asset.width} / ${asset.height}` : "16 / 9");
  if (!src) return createElement("div", { className, style: { aspectRatio: ratio, background: "rgba(127,127,127,.12)", ...style } });
  return createElement("div", { className, style: { position: "relative", aspectRatio: ratio, ...style } },
    createElement("iframe", {
      src, title: title ?? asset?.title ?? asset?.name ?? "Video", loading: "lazy",
      style: { position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 },
      allow: "accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;", allowFullScreen: true,
    }));
}

/** Audio through the same Stream player, drawn short. The native `<audio>` cannot play HLS everywhere, the player can. */
export function Audio({ asset, className, style, title, ...opts }: Omit<VideoProps, "aspectRatio" | "poster">) {
  const src = streamEmbedUrl(asset, { ...opts, controls: true });
  if (!src) return createElement("div", { className, style: { height: 56, background: "rgba(127,127,127,.12)", ...style } });
  return createElement("iframe", { src, title: title ?? asset?.title ?? asset?.name ?? "Audio", className, style: { width: "100%", height: 56, border: 0, ...style }, allow: "autoplay; encrypted-media" });
}

/** A link to the file itself; `download` makes the browser save it under the asset's name. */
export function FileLink({ asset, children, download, ...rest }: { asset: AssetLike | null | undefined; download?: boolean; children?: ReactNode } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "download">) {
  const href = fileUrl(asset);
  if (!href) return createElement("span", rest, children ?? asset?.name);
  return createElement("a", { href, download: download ? (asset?.name ?? true) : undefined, target: download ? undefined : "_blank", rel: "noreferrer", ...rest }, children ?? asset?.title ?? asset?.name);
}

/** A poster frame for a video, as an `<img>`. */
export function VideoThumbnail({ asset, time, height, alt, ...rest }: { asset: AssetLike | null | undefined; time?: string; height?: number } & Omit<ImgHTMLAttributes<HTMLImageElement>, "src">) {
  const src = streamThumbnailUrl(asset, { time, height });
  if (!src) return null;
  return createElement("img", { src, alt: alt ?? asset?.title ?? "", loading: "lazy", ...rest });
}

export type UploadJob = { id: string; file: File; progress: UploadProgress; status: "uploading" | "done" | "error"; asset?: Asset; error?: string; cancel: () => void };

/**
 * Uploads with progress for a drop zone or a file input. `client` is anything with `createUpload` and `completeUpload`:
 * an app's workspace binding behind a route action, or the desktop's RPC. Jobs stay in the list until `clear()`.
 */
export function useUpload(client: UploadClient, appId: string) {
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const seq = useRef(0);
  const patch = useCallback((id: string, next: Partial<UploadJob>) => setJobs((list) => list.map((j) => (j.id === id ? { ...j, ...next } : j))), []);
  const upload = useCallback(async (file: File, input: Partial<UploadInput> = {}): Promise<Asset | null> => {
    const id = `u${++seq.current}`;
    const controller = new AbortController();
    setJobs((list) => [...list, { id, file, progress: { loaded: 0, total: file.size, fraction: 0 }, status: "uploading", cancel: () => controller.abort() }]);
    try {
      const asset = await uploadFile(client, appId, file, input, { signal: controller.signal, onProgress: (progress) => patch(id, { progress }) });
      patch(id, { status: "done", asset, progress: { loaded: file.size, total: file.size, fraction: 1 } });
      return asset;
    } catch (e) {
      patch(id, { status: "error", error: (e as Error).message });
      return null;
    }
  }, [client, appId, patch]);
  const uploadAll = useCallback((files: Iterable<File>, input: Partial<UploadInput> = {}) => Promise.all([...files].map((f) => upload(f, input))), [upload]);
  const clear = useCallback(() => setJobs((list) => list.filter((j) => j.status === "uploading")), []);
  return { jobs, upload, uploadAll, clear };
}

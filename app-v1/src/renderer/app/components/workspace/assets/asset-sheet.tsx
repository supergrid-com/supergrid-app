import type { Asset } from "@supergrid/app-kit/rpc";
import { formatBytes, formatDuration, imageUrl, streamEmbedUrl } from "@supergrid/app-kit/media";
import { Audio, Video } from "@supergrid/app-kit/media-react";
import { CopyIcon, ExternalLinkIcon, FileIcon, FileTextIcon, FileSpreadsheetIcon, ImageOffIcon, MusicIcon, RefreshCwIcon, Trash2Icon, VideoIcon } from "lucide-react";
import * as React from "react";
import { previewFor } from "~/components/workspace/assets/upload";
import { ConfirmDialog } from "~/components/workspace/confirm-dialog";
import { FieldRow } from "~/components/workspace/contacts/fields-form";
import { absolute, relative } from "~/components/workspace/contacts/util";
import { IconButton } from "~/components/workspace/frame";
import { QueryState } from "~/components/workspace/query-states";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Sheet, SheetDescription, SheetHeader, SheetPanel, SheetPopup, SheetTitle } from "~/components/ui/sheet";
import { Textarea } from "~/components/ui/textarea";
import { toastManager } from "~/components/ui/toast";
import { isDesktop } from "~/lib/bridge";
import type { Workspace } from "~/lib/mock";
import { APP_ID } from "~/lib/ws-api";
import { useWsMutation, useWsQuery } from "~/lib/ws-query";
import { cn } from "~/lib/utils";

// One asset in a sheet: the thing itself, the catalogue fields, its URLs, and the numbers Stream
// reports for a video. Saves field by field on blur, so there is no form to submit.

export const kindIcon: Record<Asset["kind"], React.ComponentType<{ className?: string }>> = { image: ImageOffIcon, video: VideoIcon, audio: MusicIcon, file: FileIcon };

export function fileIcon(asset: Pick<Asset, "kind" | "mime" | "name">): React.ComponentType<{ className?: string }> {
  if (asset.kind !== "file") return kindIcon[asset.kind];
  const m = asset.mime ?? "";
  if (m.includes("pdf") || m.startsWith("text/") || /\.(docx?|md|txt)$/i.test(asset.name)) return FileTextIcon;
  if (m.includes("csv") || m.includes("sheet") || /\.(csv|xlsx?)$/i.test(asset.name)) return FileSpreadsheetIcon;
  return FileIcon;
}

export const statusVariant: Record<Asset["status"], "success" | "info" | "warning" | "error"> = { ready: "success", processing: "info", pending: "warning", error: "error" };

export function copyText(text: string, what = "URL"): void {
  void navigator.clipboard?.writeText(text).then(
    () => toastManager.add({ title: `${what} copied`, type: "success", timeout: 1200 }),
    () => toastManager.add({ title: `Could not copy the ${what.toLowerCase()}`, type: "error" }),
  );
}

/** The best picture of an asset for a tile or a preview: a local object URL while mocked, else what the workspace serves. */
export function thumbnailOf(asset: Asset, width = 400): string | null {
  const local = previewFor(asset);
  if (local && asset.kind === "image") return local;
  if (asset.kind === "image") return imageUrl(asset, { width, height: width, fit: "cover" });
  return asset.urls.thumbnail;
}

function Preview({ asset }: { asset: Asset }): React.ReactElement {
  const local = previewFor(asset);
  const Icon = fileIcon(asset);
  const box = "flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-lg border bg-muted text-muted-foreground";
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => setFailed(false), [asset.id, asset.updated_at]);
  if (failed) return <div className={box}><Icon className="size-7" /></div>;
  if (asset.status !== "ready" && !local) {
    return (
      <div className={box}>
        <div className="flex flex-col items-center gap-2 text-xs">
          <Icon className="size-7" />
          {asset.status === "processing" ? "Encoding…" : asset.status === "pending" ? "Waiting for the upload" : (asset.error ?? "Failed")}
        </div>
      </div>
    );
  }
  if (asset.kind === "image") {
    const src = local ?? imageUrl(asset, { width: 1200 });
    return src ? <img src={src} alt={asset.alt ?? ""} onError={() => setFailed(true)} className="max-h-80 w-full rounded-lg border object-contain bg-muted/40" /> : <div className={box}><Icon className="size-7" /></div>;
  }
  if (asset.kind === "video") {
    if (local) return <video src={local} controls className="w-full rounded-lg border bg-black" />;
    if (asset.urls.embed) return <Video asset={asset} className="overflow-hidden rounded-lg border bg-black" />;
    return <div className={box}>{asset.urls.thumbnail ? <img src={asset.urls.thumbnail} alt="" onError={() => setFailed(true)} className="size-full object-cover" /> : <Icon className="size-7" />}</div>;
  }
  if (asset.kind === "audio") {
    if (local) return <audio src={local} controls className="w-full" />;
    if (asset.urls.embed) return <Audio asset={asset} className="rounded-lg border" />;
  }
  return (
    <div className={box}>
      <div className="flex flex-col items-center gap-1.5 text-xs">
        <Icon className="size-7" />
        {asset.mime ?? "file"}
      </div>
    </div>
  );
}

function UrlRow({ label, url }: { label: string; url: string }): React.ReactElement {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="w-16 shrink-0 text-muted-foreground">{label}</span>
      <code className="min-w-0 flex-1 truncate rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">{url}</code>
      <IconButton label="Copy" onClick={() => copyText(url)}>
        <CopyIcon />
      </IconButton>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }): React.ReactElement | null {
  if (value == null || value === "") return null;
  return (
    <div className="flex flex-col">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="text-[13px]">{value}</span>
    </div>
  );
}

function PlaybackCard({ ws, asset }: { ws: Workspace; asset: Asset }): React.ReactElement {
  const q = useWsQuery(ws.id, "mediaAnalytics", [{ days: 30, assetId: asset.id, groupBy: "day" }], { tags: ["media-analytics"] });
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <div className="text-[13px] font-medium">Playback, last 30 days</div>
      <QueryState q={q} skeleton={<div className="h-16 animate-pulse rounded bg-muted" />} empty={<div className="text-xs text-muted-foreground">Nothing watched yet. Stream reports minutes within a few minutes of a play.</div>}>
        {(rows) => {
          const minutes = rows.reduce((n, r) => n + r.minutes, 0);
          const views = rows.reduce((n, r) => n + r.views, 0);
          const max = Math.max(1, ...rows.map((r) => r.minutes));
          return (
            <>
              <div className="flex gap-5 text-[13px]">
                <span><b className="font-heading text-lg font-bold">{Math.round(minutes).toLocaleString()}</b> <span className="text-muted-foreground">minutes</span></span>
                <span><b className="font-heading text-lg font-bold">{views.toLocaleString()}</b> <span className="text-muted-foreground">plays</span></span>
              </div>
              <div className="flex h-10 items-end gap-px">
                {rows.map((r) => (
                  <div key={r.key} title={`${r.key}: ${r.minutes} min`} className="flex-1 rounded-t-sm bg-primary/70" style={{ height: `${Math.max(4, (r.minutes / max) * 100)}%` }} />
                ))}
              </div>
            </>
          );
        }}
      </QueryState>
    </div>
  );
}

export function AssetSheet({ ws, id, onClose }: { ws: Workspace; id: string | undefined; onClose: () => void }): React.ReactElement {
  const open = !!id;
  const q = useWsQuery(ws.id, "getAsset", [id ?? ""], { tags: ["assets", `asset:${id}`], enabled: open });
  const save = useWsMutation(ws.id, "saveAsset", { invalidates: ["assets"], title: "Asset did not save" });
  const refresh = useWsMutation(ws.id, "refreshAsset", { invalidates: ["assets"], title: "Could not check the asset" });
  const del = useWsMutation(ws.id, "removeAssets", { invalidates: ["assets"], title: "Asset was not deleted" });
  const [confirm, setConfirm] = React.useState(false);
  // the last asset shown stays on screen through the close animation, instead of a flash of the skeleton
  const last = React.useRef<Asset | null>(null);
  if (q.data) last.current = q.data;
  const asset = (open ? q.data : last.current) ?? undefined;
  // a processing video is checked again every few seconds while the sheet is open
  React.useEffect(() => {
    if (!asset || asset.status !== "processing" || !isDesktop) return;
    const t = setTimeout(() => void refresh.run(asset.id), 5000);
    return () => clearTimeout(t);
  }, [asset, refresh]);
  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetPopup className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="truncate pe-8">{asset?.title || asset?.name || "Asset"}</SheetTitle>
          <SheetDescription>{asset ? `${asset.kind} · ${asset.provider === "images" ? "Cloudflare Images" : asset.provider === "stream" ? "Cloudflare Stream" : "R2"} · ${relative(asset.created_at)}` : " "}</SheetDescription>
        </SheetHeader>
        <SheetPanel className="flex flex-col gap-4">
          {!open && asset ? (
            <Details ws={ws} asset={asset} onSave={() => {}} onRefresh={() => {}} refreshing={false} onDelete={() => {}} />
          ) : (
            <QueryState q={q} skeleton={<div className="aspect-[4/3] w-full animate-pulse rounded-lg bg-muted" />} empty={<div className="py-10 text-center text-[13px] text-muted-foreground">This asset is gone.</div>} emptyWhen={(a) => a == null}>
              {(a) => (a ? <Details ws={ws} asset={a} onSave={(input) => void save.run(APP_ID, { id: a.id, ...input })} onRefresh={() => void refresh.run(a.id)} refreshing={refresh.pending} onDelete={() => setConfirm(true)} /> : null)}
            </QueryState>
          )}
        </SheetPanel>
      </SheetPopup>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={`Delete ${asset?.name ?? "this asset"}?`}
        description="The file is removed from Cloudflare too. Anything that embeds it will break."
        pending={del.pending}
        onConfirm={async () => {
          if (!asset) return;
          const ok = await del.run(APP_ID, [asset.id]);
          setConfirm(false);
          if (ok !== null) onClose();
        }}
      />
    </Sheet>
  );
}

function Details({ ws, asset, onSave, onRefresh, refreshing, onDelete }: { ws: Workspace; asset: Asset; onSave: (input: { name?: string; title?: string | null; alt?: string | null; folder?: string; tags?: string[] }) => void; onRefresh: () => void; refreshing: boolean; onDelete: () => void }): React.ReactElement {
  const [name, setName] = React.useState(asset.name);
  const [title, setTitle] = React.useState(asset.title ?? "");
  const [alt, setAlt] = React.useState(asset.alt ?? "");
  const [folder, setFolder] = React.useState(asset.folder);
  const [tags, setTags] = React.useState(asset.tags.join(", "));
  React.useEffect(() => { setName(asset.name); setTitle(asset.title ?? ""); setAlt(asset.alt ?? ""); setFolder(asset.folder); setTags(asset.tags.join(", ")); }, [asset.id, asset.updated_at, asset.name, asset.title, asset.alt, asset.folder, asset.tags]);
  const dims = asset.width && asset.height ? `${asset.width} × ${asset.height}` : null;
  const src = asset.urls.src ?? asset.urls.hls ?? null;
  const embed = streamEmbedUrl(asset);
  return (
    <>
      <Preview asset={asset} />
      <div className="flex items-center gap-2">
        <Badge variant={statusVariant[asset.status]} size="sm">{asset.status}</Badge>
        {asset.error && <span className="truncate text-xs text-destructive-foreground">{asset.error}</span>}
        <span className="flex-1" />
        {asset.status !== "ready" && (
          <Button size="xs" variant="ghost" loading={refreshing} onClick={onRefresh}>
            <RefreshCwIcon />
            Check again
          </Button>
        )}
        {src && (
          <Button size="xs" variant="ghost" render={<a href={src} target="_blank" rel="noreferrer" />}>
            <ExternalLinkIcon />
            Open
          </Button>
        )}
        <Button size="xs" variant="ghost" className="text-destructive-foreground" onClick={onDelete}>
          <Trash2Icon />
          Delete
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border bg-muted/30 p-3 sm:grid-cols-3">
        <Fact label="Size" value={formatBytes(asset.size)} />
        <Fact label="Dimensions" value={dims} />
        <Fact label="Duration" value={asset.duration != null ? formatDuration(asset.duration) : null} />
        <Fact label="Type" value={asset.mime} />
        <Fact label="Uploaded" value={absolute(asset.created_at)} />
        <Fact label="By" value={asset.app_id && asset.app_id !== "desktop" ? asset.app_id : null} />
      </div>
      <div className="grid gap-3">
        <FieldRow label="File name">
          <Input size="sm" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => { const v = name.trim(); if (v && v !== asset.name) onSave({ name: v }); }} />
        </FieldRow>
        <FieldRow label="Title" hint="How it is listed and what the player shows.">
          <Input size="sm" value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => { if (title.trim() !== (asset.title ?? "")) onSave({ title: title.trim() || null }); }} />
        </FieldRow>
        {asset.kind === "image" && (
          <FieldRow label="Alt text" hint="Read out by screen readers and shown when the picture cannot load.">
            <Textarea size="sm" rows={2} value={alt} onChange={(e) => setAlt(e.target.value)} onBlur={() => { if (alt.trim() !== (asset.alt ?? "")) onSave({ alt: alt.trim() || null }); }} />
          </FieldRow>
        )}
        <div className="grid grid-cols-2 gap-3">
          <FieldRow label="Folder">
            <Input size="sm" value={folder} className="font-mono" onChange={(e) => setFolder(e.target.value)} onBlur={() => { const v = folder.trim() || "/"; if (v !== asset.folder) onSave({ folder: v }); }} />
          </FieldRow>
          <FieldRow label="Tags" hint="Comma separated.">
            <Input size="sm" value={tags} onChange={(e) => setTags(e.target.value)} onBlur={() => { const list = tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean); if (list.join(",") !== asset.tags.join(",")) onSave({ tags: list }); }} />
          </FieldRow>
        </div>
      </div>
      {(src || embed) && (
        <div className="flex flex-col gap-1.5">
          <div className="text-[13px] font-medium">URLs</div>
          {src && <UrlRow label={asset.kind === "video" || asset.kind === "audio" ? "HLS" : "URL"} url={src} />}
          {asset.urls.dash && <UrlRow label="DASH" url={asset.urls.dash} />}
          {embed && <UrlRow label="Player" url={embed} />}
          {asset.urls.thumbnail && asset.kind !== "image" && <UrlRow label="Poster" url={asset.urls.thumbnail} />}
          {asset.provider === "images" && asset.urls.base && (
            <>
              <UrlRow label="800 wide" url={imageUrl(asset, { width: 800, format: "auto" })!} />
              <UrlRow label="Square" url={imageUrl(asset, { width: 400, height: 400, fit: "cover", gravity: "auto" })!} />
              <div className="text-[11px] text-muted-foreground">Any size works: change <code className="font-mono">w=</code>, <code className="font-mono">h=</code>, <code className="font-mono">fit=</code>, <code className="font-mono">q=</code> and <code className="font-mono">f=</code> on the URL.</div>
            </>
          )}
        </div>
      )}
      {asset.provider === "stream" && asset.status === "ready" && <PlaybackCard ws={ws} asset={asset} />}
      <div className={cn("text-[11px] text-muted-foreground", "pb-2")}>id <code className="font-mono">{asset.id}</code> · provider id <code className="font-mono">{asset.provider_id}</code></div>
    </>
  );
}

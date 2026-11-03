import type { Asset, AssetKind } from "@supergrid/app-kit/rpc";
import { CheckIcon, FileIcon, ImageIcon, LoaderCircleIcon } from "lucide-react";
import * as React from "react";
import { Button } from "~/components/ui/button";
import { Sheet, SheetClose, SheetFooter, SheetHeader, SheetPanel, SheetPopup, SheetTitle } from "~/components/ui/sheet";
import { FilterTabs, formatBytes } from "~/components/workspace/library/shared";
import { sg } from "~/lib/bridge";
import { useRemote } from "~/lib/library";
import { cn } from "~/lib/utils";
import type { WorkspaceSummary } from "~/lib/workspaces";

// The media picker an app's admin screen opens through the admin SDK (sg:pick): a sheet over the shell with the
// organization's Images and Stream and the workspace's files, as the Library pages list them. What is picked goes
// back as assets in the workspace's own shape (urls filled in), so the app never builds a Cloudflare URL itself.

type Req = { kinds: AssetKind[]; multiple: boolean; title?: string };
type Pending = Req & { resolve: (a: Asset[] | null) => void };

const base = (): Pick<Asset, "status" | "error" | "folder" | "tags" | "meta" | "app_id" | "alt" | "title" | "duration" | "width" | "height" | "mime" | "size"> => ({ status: "ready", error: null, folder: "/", tags: [], meta: {}, app_id: null, alt: null, title: null, duration: null, width: null, height: null, mime: null, size: null });

export function useMediaPicker(ws: WorkspaceSummary, accountId: string): { pick: (req: Req) => Promise<Asset[] | null>; element: React.ReactElement } {
  const [pending, setPending] = React.useState<Pending | null>(null);
  const pick = React.useCallback((req: Req) => new Promise<Asset[] | null>((resolve) => setPending({ ...req, resolve })), []);
  const close = (assets: Asset[] | null) => { pending?.resolve(assets); setPending(null); };
  const element = <MediaPickerSheet ws={ws} accountId={accountId} req={pending} onClose={close} />;
  return { pick, element };
}

function MediaPickerSheet({ ws, accountId, req, onClose }: { ws: WorkspaceSummary; accountId: string; req: Pending | null; onClose: (a: Asset[] | null) => void }): React.ReactElement {
  const kinds = req?.kinds.length ? req.kinds : ["image" as AssetKind];
  const tabs = [...(kinds.includes("image") ? [{ key: "image", label: "Images" }] : []), ...(kinds.includes("video") || kinds.includes("audio") ? [{ key: "media", label: "Media" }] : []), ...(kinds.includes("file") ? [{ key: "file", label: "Files" }] : [])] as { key: "image" | "media" | "file"; label: string }[];
  const [tab, setTab] = React.useState<"image" | "media" | "file">(tabs[0]?.key ?? "image");
  const [chosen, setChosen] = React.useState<Map<string, Asset>>(new Map());
  React.useEffect(() => { setChosen(new Map()); setTab(tabs[0]?.key ?? "image"); }, [req]);
  const open = !!req;
  const images = useRemote(open && accountId ? `images:${accountId}` : null, () => sg!.library.images.list(accountId));
  const stream = useRemote(open && accountId && tab === "media" ? `stream:${accountId}` : null, () => sg!.library.stream.list(accountId));
  const bucket = `${ws.worker}-files`;
  const files = useRemote(open && accountId && tab === "file" && ws.worker ? `files:${accountId}:${bucket}:` : null, () => sg!.library.files.list(accountId, bucket, {}));
  const site = ws.url.replace(/\/$/, "");
  const items: Asset[] =
    tab === "image"
      ? (images.data?.images ?? []).map((i): Asset => ({ ...base(), id: i.id, kind: "image", provider: "images", provider_id: i.id, name: i.filename, title: typeof i.meta.title === "string" ? i.meta.title : null, alt: typeof i.meta.alt === "string" ? i.meta.alt : null, created_at: i.uploaded, updated_at: i.uploaded, urls: { base: i.base ?? undefined, src: i.base ? `${i.base}/public` : null, thumbnail: i.base ? `${i.base}/w=320` : null } }))
      : tab === "media"
        ? (stream.data?.videos ?? []).filter((v) => v.readyToStream).map((v): Asset => { const customer = stream.data?.customer; const embed = customer ? `https://${customer}.cloudflarestream.com/${v.uid}/iframe` : undefined; return { ...base(), id: v.uid, kind: v.height ? "video" : "audio", provider: "stream", provider_id: v.uid, name: v.name, title: v.name, size: v.size, duration: v.duration, width: v.width, height: v.height, created_at: v.created, updated_at: v.modified, urls: { src: v.hls, thumbnail: v.thumbnail, hls: v.hls ?? undefined, dash: v.dash ?? undefined, embed } }; })
        : (files.data?.files ?? []).map((f): Asset => ({ ...base(), id: f.key, kind: "file", provider: "r2", provider_id: f.key, name: f.key.split("/").pop() ?? f.key, mime: f.contentType, size: f.size, created_at: f.modified, updated_at: f.modified, urls: { src: `${site}/_ws/files/${f.key}`, thumbnail: null } }));
  const loading = tab === "image" ? images.loading && !images.data : tab === "media" ? stream.loading && !stream.data : files.loading && !files.data;
  const toggle = (a: Asset) => setChosen((m) => { const next = new Map(req?.multiple ? m : []); if (next.has(a.id)) next.delete(a.id); else next.set(a.id, a); return next; });
  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(null); }}>
      <SheetPopup side="right" className="w-[min(40rem,90vw)]">
        <SheetHeader>
          <SheetTitle>{req?.title ?? "Choose From the Library"}</SheetTitle>
        </SheetHeader>
        <SheetPanel className="flex min-h-0 flex-1 flex-col gap-3">
          {tabs.length > 1 && <FilterTabs tabs={tabs} value={tab} onChange={setTab} />}
          <div className="min-h-0 flex-1 overflow-auto">
            {loading ? (
              <div className="flex h-40 items-center justify-center text-muted-foreground"><LoaderCircleIcon className="size-5 animate-spin" /></div>
            ) : items.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Nothing here yet. Upload in Library first.</p>
            ) : tab === "file" ? (
              <ul className="flex flex-col">
                {items.map((a) => (
                  <li key={a.id}>
                    <button type="button" onClick={() => toggle(a)} className={cn("flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-accent", chosen.has(a.id) && "bg-accent")}>
                      <FileIcon className="size-4 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{a.name}</span>
                      <span className="text-xs text-muted-foreground">{formatBytes(a.size)}</span>
                      {chosen.has(a.id) && <CheckIcon className="size-4 text-active" />}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {items.map((a) => (
                  <li key={a.id}>
                    <button type="button" onClick={() => toggle(a)} className={cn("relative block aspect-square w-full cursor-pointer overflow-hidden rounded-lg border bg-muted", chosen.has(a.id) && "ring-2 ring-active")}>
                      {a.urls.thumbnail ? <img src={a.urls.thumbnail} alt="" className="size-full object-cover" /> : <ImageIcon className="absolute inset-0 m-auto size-6 text-muted-foreground" />}
                      {chosen.has(a.id) && <span className="absolute end-1 top-1 flex size-5 items-center justify-center rounded-full bg-active text-active-foreground"><CheckIcon className="size-3" /></span>}
                      <span className="absolute inset-x-0 bottom-0 truncate bg-black/50 px-1.5 py-0.5 text-start text-[11px] text-white">{a.title ?? a.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SheetPanel>
        <SheetFooter>
          <SheetClose render={<Button variant="outline" />}>Cancel</SheetClose>
          <Button disabled={!chosen.size} onClick={() => onClose([...chosen.values()])}>
            Use {chosen.size > 1 ? `${chosen.size} Items` : chosen.size === 1 ? "Item" : ""}
          </Button>
        </SheetFooter>
      </SheetPopup>
    </Sheet>
  );
}

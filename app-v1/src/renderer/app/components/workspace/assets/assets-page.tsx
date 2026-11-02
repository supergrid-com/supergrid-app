import type { Asset, AssetKind, AssetQuery } from "@supergrid/app-kit/rpc";
import { formatBytes, formatDuration } from "@supergrid/app-kit/media";
import { BarChart3Icon, CheckIcon, ExternalLinkIcon, FolderIcon, ImageIcon, LayoutGridIcon, ListIcon, LoaderCircleIcon, SearchIcon, Trash2Icon, UploadCloudIcon, XIcon } from "lucide-react";
import * as React from "react";
import { AssetsAnalytics } from "~/components/workspace/assets/analytics";
import { AssetSheet, fileIcon, statusVariant, thumbnailOf } from "~/components/workspace/assets/asset-sheet";
import { filesFromDrop, useAssetUploads, type UploadJob } from "~/components/workspace/assets/upload";
import { ConfirmDialog } from "~/components/workspace/confirm-dialog";
import { relative } from "~/components/workspace/contacts/util";
import { DataTable, type DataColumn, IconButton, type SortState, TableFooter, WorkspaceFrame } from "~/components/workspace/frame";
import { QueryState } from "~/components/workspace/query-states";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "~/components/ui/empty";
import { Input } from "~/components/ui/input";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "~/components/ui/select";
import { toastManager } from "~/components/ui/toast";
import { isDesktop, sg } from "~/lib/bridge";
import type { Workspace } from "~/lib/mock";
import { useWorkspacePage } from "~/lib/workspace-page";
import { APP_ID } from "~/lib/ws-api";
import { invalidate, useWsMutation, useWsQuery } from "~/lib/ws-query";
import { cn } from "~/lib/utils";

// The asset library: everything the workspace holds in Images, Stream and R2, as tiles or rows,
// with upload by button or by dropping files anywhere on the page. One asset opens in a sheet;
// the Analytics tab shows what Stream played. Design in core/workspace/ASSETS.md.

const LIMIT = 60;
const TABS: { key: string; label: string; kind?: AssetKind }[] = [
  { key: "all", label: "All" },
  { key: "image", label: "Images", kind: "image" },
  { key: "video", label: "Video", kind: "video" },
  { key: "audio", label: "Audio", kind: "audio" },
  { key: "file", label: "Files", kind: "file" },
];
const SORTS: { value: NonNullable<AssetQuery["sort"]>; label: string }[] = [
  { value: "created_at", label: "Newest" },
  { value: "updated_at", label: "Recently changed" },
  { value: "name", label: "Name" },
  { value: "size", label: "Size" },
];
const ALL_FOLDERS = "__all__";

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

const views = ["grid", "list"] as const;
type View = (typeof views)[number];
function useView(): [View, (v: View) => void] {
  const [view, set] = React.useState<View>(() => {
    try { const v = localStorage.getItem("sg.assets.view"); return v === "list" ? "list" : "grid"; } catch { return "grid"; }
  });
  return [view, (v) => { set(v); try { localStorage.setItem("sg.assets.view", v); } catch { /* fine */ } }];
}

// A picture that falls back to the kind's icon when it cannot load (an upload still landing, a host that is not there).
export function Thumb({ asset, width, className }: { asset: Asset; width: number; className?: string }): React.ReactElement {
  const src = asset.status === "ready" || asset.kind === "image" ? thumbnailOf(asset, width) : null;
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => setFailed(false), [src]);
  const Icon = fileIcon(asset);
  return src && !failed ? <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} className={cn("size-full object-cover", className)} /> : <Icon className={cn("size-7", className)} />;
}

// A tile in the grid: the picture, or an icon for what has none, and a strip of name and size.
function Tile({ asset, selected, onOpen, onToggle }: { asset: Asset; selected: boolean; onOpen: () => void; onToggle: () => void }): React.ReactElement {
  return (
    <li className={cn("group relative flex cursor-pointer flex-col gap-1.5 rounded-lg p-1 transition-colors hover:bg-accent/60", selected && "bg-accent")} onClick={onOpen}>
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-md border bg-muted text-muted-foreground">
        <Thumb asset={asset} width={400} />
        {asset.status !== "ready" && (
          <span className="absolute inset-x-1.5 bottom-1.5 flex justify-center">
            <Badge variant={statusVariant[asset.status]} size="sm">{asset.status === "processing" ? "encoding" : asset.status}</Badge>
          </span>
        )}
        {asset.duration != null && asset.status === "ready" && <span className="absolute end-1.5 bottom-1.5 rounded bg-black/70 px-1 py-px font-mono text-[10px] text-white">{formatDuration(asset.duration)}</span>}
        <button
          type="button"
          aria-label={selected ? "Deselect" : "Select"}
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className={cn("absolute start-1.5 top-1.5 flex size-5 items-center justify-center rounded-md border bg-background/90 text-foreground opacity-0 transition-opacity group-hover:opacity-100", selected && "border-primary bg-primary text-primary-foreground opacity-100")}
        >
          {selected && <CheckIcon className="size-3.5" />}
        </button>
      </div>
      <div className="min-w-0 px-0.5">
        <div className="truncate text-[13px] font-medium">{asset.title || asset.name}</div>
        <div className="flex gap-1.5 truncate text-[11px] text-muted-foreground">
          <span>{formatBytes(asset.size) || asset.kind}</span>
          {asset.width && asset.height && <span>· {asset.width}×{asset.height}</span>}
          {asset.folder !== "/" && <span className="truncate">· {asset.folder}</span>}
        </div>
      </div>
    </li>
  );
}

// Uploads in flight and the ones just finished, in a corner card.
function UploadTray({ jobs, onClear }: { jobs: UploadJob[]; onClear: () => void }): React.ReactElement | null {
  if (!jobs.length) return null;
  const active = jobs.filter((j) => j.status === "uploading").length;
  return (
    <div className="pointer-events-auto absolute end-4 bottom-4 z-20 w-80 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-lg">
      <div className="flex h-9 items-center gap-2 border-b px-3 text-[13px] font-medium">
        {active ? <LoaderCircleIcon className="size-3.5 animate-spin text-muted-foreground" /> : <CheckIcon className="size-3.5 text-success-foreground" />}
        {active ? `Uploading ${active} of ${jobs.length}` : `${jobs.length} uploaded`}
        <span className="flex-1" />
        {!active && (
          <IconButton label="Clear" onClick={onClear}>
            <XIcon />
          </IconButton>
        )}
      </div>
      <ul className="max-h-56 divide-y overflow-y-auto">
        {jobs.map((j) => (
          <li key={j.id} className="flex flex-col gap-1 px-3 py-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate">{j.file.name}</span>
              <span className="text-muted-foreground">{j.status === "uploading" ? `${Math.round(j.progress.fraction * 100)}%` : j.status === "done" ? (j.asset?.status === "processing" ? "encoding" : "done") : "failed"}</span>
              {j.status === "uploading" && (
                <IconButton label="Cancel" onClick={j.cancel}>
                  <XIcon />
                </IconButton>
              )}
            </div>
            {j.status === "uploading" && <div className="h-1 overflow-hidden rounded bg-muted"><div className="h-full rounded bg-primary transition-[width]" style={{ width: `${j.progress.fraction * 100}%` }} /></div>}
            {j.error && <div className="truncate text-destructive-foreground">{j.error}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Keys written as the dashboard's token-template link wants them; the same list lives in @supergrid/cloud (scopes.ts).
const mediaTokenLink = (name: string) => `https://dash.cloudflare.com/?to=/:account/api-tokens&permissionGroupKeys=${encodeURIComponent(JSON.stringify([{ key: "images", type: "edit" }, { key: "stream", type: "edit" }, { key: "analytics", type: "read" }]))}&name=${encodeURIComponent(name)}`;

// A workspace from before media has no token yet: new ones get it when they are made (app/CONNECT.md). One click gives
// this one a token too, from the app's own; pasting one of your own stays possible underneath.
function ConnectCard({ ws, filesOnly }: { ws: Workspace; filesOnly: boolean }): React.ReactElement {
  const [token, setToken] = React.useState("");
  const [own, setOwn] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const connect = async () => {
    if (!sg) return;
    setBusy(true);
    try {
      await sg.ws.setMediaToken(ws.id, own && token.trim() ? token.trim() : undefined);
      setToken("");
      invalidate(ws.id, "mediaConfig", "assets");
      toastManager.add({ title: "Images and Stream connected", type: "success" });
    } catch (e) {
      toastManager.add({ title: "That token did not take", description: String((e as Error)?.message ?? e).replace(/^Error invoking remote method '[^']*': (?:Error: )?/, ""), type: "error" });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mx-4 mt-4 flex flex-col gap-3 rounded-xl border border-dashed p-4 text-[13px]">
      <div>
        <div className="font-medium">Turn on Cloudflare Images and Stream</div>
        <div className="text-muted-foreground">{filesOnly ? "Files upload to the workspace's bucket now; pictures do too, without resizing. " : ""}Images resizes on the URL and Stream encodes video and audio and plays it anywhere. This workspace is from before they were set up at creation; one click gives it its token.</div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" loading={busy} disabled={!isDesktop || (own && !token.trim())} onClick={() => void connect()}>
          {own ? "Use this token" : "Turn on"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOwn((v) => !v)} disabled={!isDesktop}>
          {own ? "Use the app's token instead" : "Paste a token of my own"}
        </Button>
      </div>
      {own && (
        <div className="flex flex-wrap items-center gap-2">
          <Input size="sm" type="password" placeholder="Paste the token" value={token} onChange={(e) => setToken(e.target.value)} className="max-w-md font-mono" />
          <Button size="xs" variant="outline" render={<a href={mediaTokenLink(`SuperGrid media ${ws.name}`)} target="_blank" rel="noreferrer" />}>
            <ExternalLinkIcon />
            Create one
          </Button>
          <span className="text-xs text-muted-foreground">Images: Edit, Stream: Edit, Account Analytics: Read.</span>
        </div>
      )}
      {!isDesktop && <div className="text-xs text-muted-foreground">In the desktop app this writes the token to the workspace. In the browser preview the mock has everything connected.</div>}
    </div>
  );
}

export function AssetsPage({ ws, id, tab, onOpenNav }: { ws: Workspace; id?: string; tab?: "analytics"; onOpenNav: () => void }): React.ReactElement {
  const { go } = useWorkspacePage();
  const [view, setView] = useView();
  const [kind, setKind] = React.useState("all");
  const [q, setQ] = React.useState("");
  const search = useDebounced(q.trim(), 250);
  const [folder, setFolder] = React.useState(ALL_FOLDERS);
  const [sort, setSort] = React.useState<SortState>({ key: "created_at", dir: "desc" });
  const [offset, setOffset] = React.useState(0);
  const [selected, setSelected] = React.useState<Set<string>>(() => new Set());
  const [confirm, setConfirm] = React.useState(false);
  const [dragging, setDragging] = React.useState(0);
  const [days, setDays] = React.useState(30);
  const fileInput = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => { setOffset(0); }, [kind, search, folder, sort]);

  const config = useWsQuery(ws.id, "mediaConfig", [], { tags: ["mediaConfig"] });
  const folders = useWsQuery(ws.id, "listAssetFolders", [], { tags: ["assets"] });
  const query: AssetQuery = { kind: TABS.find((t) => t.key === kind)?.kind, search: search || undefined, folderPrefix: folder === ALL_FOLDERS ? undefined : folder, sort: sort.key as AssetQuery["sort"], dir: sort.dir, limit: LIMIT, offset };
  const list = useWsQuery(ws.id, "listAssets", [query], { tags: ["assets"] });
  const del = useWsMutation(ws.id, "removeAssets", { invalidates: ["assets"], title: "Assets were not deleted" });
  const uploads = useAssetUploads(ws.id);
  const targetFolder = folder === ALL_FOLDERS ? "/" : folder;

  const take = (files: File[]) => {
    if (!files.length) return;
    void uploads.uploadAll(files, { folder: targetFolder });
  };
  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(0);
    take(await filesFromDrop(e.dataTransfer));
  };

  const columns = React.useMemo<DataColumn<Asset>[]>(() => [
    {
      key: "name", label: "Name", sortable: true,
      render: (a) => {
        return (
          <span className="flex items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted text-muted-foreground [&>svg]:size-4"><Thumb asset={a} width={96} /></span>
            <span className="min-w-0">
              <span className="block truncate font-medium">{a.title || a.name}</span>
              {a.title && <span className="block truncate text-xs text-muted-foreground">{a.name}</span>}
            </span>
          </span>
        );
      },
    },
    { key: "kind", label: "Kind", width: "6rem", render: (a) => <span className="text-muted-foreground">{a.kind}</span> },
    { key: "size", label: "Size", sortable: true, align: "end", width: "6rem", render: (a) => <span className="tabular-nums text-muted-foreground">{formatBytes(a.size)}</span> },
    { key: "dims", label: "Dimensions", align: "end", width: "8rem", className: "max-md:hidden", render: (a) => <span className="tabular-nums text-muted-foreground">{a.duration != null ? formatDuration(a.duration) : a.width && a.height ? `${a.width}×${a.height}` : ""}</span> },
    { key: "folder", label: "Folder", width: "9rem", className: "max-sm:hidden", render: (a) => <span className="truncate font-mono text-xs text-muted-foreground">{a.folder}</span> },
    { key: "status", label: "Status", width: "6rem", render: (a) => (a.status === "ready" ? <span className="text-xs text-muted-foreground">ready</span> : <Badge variant={statusVariant[a.status]} size="sm">{a.status}</Badge>) },
    { key: "created_at", label: "Added", sortable: true, align: "end", width: "7rem", className: "max-sm:hidden", render: (a) => <span className="text-xs text-muted-foreground">{relative(a.created_at)}</span> },
  ], []);
  const onSort = (key: string) => setSort((s) => ({ key, dir: s.key === key ? (s.dir === "asc" ? "desc" : "asc") : key === "name" ? "asc" : "desc" }));

  const analytics = tab === "analytics";
  const connected = config.data ? config.data.images && config.data.stream : true;
  const total = list.data?.total ?? 0;

  return (
    <WorkspaceFrame
      icon={<ImageIcon />}
      title="Assets"
      onOpenNav={onOpenNav}
      flush
      actions={
        <>
          <Button size="xs" variant={analytics ? "secondary" : "ghost"} onClick={() => go({ kind: "media", tab: analytics ? undefined : "analytics" })}>
            <BarChart3Icon />
            Analytics
          </Button>
          <Button size="xs" onClick={() => fileInput.current?.click()}>
            <UploadCloudIcon />
            Upload
          </Button>
          <input ref={fileInput} type="file" multiple hidden onChange={(e) => { take([...(e.target.files ?? [])]); e.target.value = ""; }} />
        </>
      }
    >
      <div
        className="relative flex min-h-0 flex-1 flex-col"
        onDragEnter={(e) => { if (e.dataTransfer.types.includes("Files")) setDragging((n) => n + 1); }}
        onDragLeave={() => setDragging((n) => Math.max(0, n - 1))}
        onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) e.preventDefault(); }}
        onDrop={(e) => void onDrop(e)}
      >
        {dragging > 0 && (
          <div className="pointer-events-none absolute inset-2 z-30 flex items-center justify-center rounded-xl border-2 border-dashed border-primary bg-primary/5 text-[13px] font-medium text-primary">
            Drop to upload into {targetFolder}
          </div>
        )}
        {analytics ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <AssetsAnalytics ws={ws} days={days} onDays={setDays} />
          </div>
        ) : (
          <>
            <div className="flex h-11 shrink-0 items-center gap-1 border-b px-2">
              {TABS.map((t) => (
                <button key={t.key} type="button" onClick={() => setKind(t.key)} className={cn("flex h-7 cursor-pointer items-center rounded-lg px-2.5 text-[13px] transition-colors", kind === t.key ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground")}>
                  {t.label}
                </button>
              ))}
              <span className="flex-1" />
              <Select value={folder} onValueChange={(v) => setFolder(String(v ?? ALL_FOLDERS))}>
                <SelectTrigger size="sm" className="max-w-48">
                  <FolderIcon className="size-3.5 text-muted-foreground" />
                  <SelectValue>{(v: string) => (v === ALL_FOLDERS ? "All folders" : v)}</SelectValue>
                </SelectTrigger>
                <SelectPopup>
                  <SelectItem value={ALL_FOLDERS}>All folders</SelectItem>
                  {(folders.data ?? []).map((f) => (
                    <SelectItem key={f.path} value={f.path}>
                      <span className="font-mono text-xs">{f.path}</span>
                      <span className="ms-2 text-xs text-muted-foreground">{f.count}</span>
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
              <Select value={sort.key} onValueChange={(v) => onSort(String(v))}>
                <SelectTrigger size="sm" className="w-36">
                  <SelectValue>{(v: string) => SORTS.find((s) => s.value === v)?.label ?? "Sort"}</SelectValue>
                </SelectTrigger>
                <SelectPopup>
                  {SORTS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectPopup>
              </Select>
              <div className="relative w-44">
                <SearchIcon className="pointer-events-none absolute start-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input size="sm" type="search" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} className="ps-7" />
              </div>
              <IconButton label={view === "grid" ? "Show as list" : "Show as grid"} onClick={() => setView(view === "grid" ? "list" : "grid")}>
                {view === "grid" ? <ListIcon /> : <LayoutGridIcon />}
              </IconButton>
            </div>
            {!connected && <ConnectCard ws={ws} filesOnly={!!config.data?.files} />}
            {selected.size > 0 && (
              <div className="flex h-9 shrink-0 items-center gap-2 border-b bg-accent/40 px-3 text-[13px]">
                <span className="font-medium">{selected.size} selected</span>
                <Button size="xs" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
                <span className="flex-1" />
                <Button size="xs" variant="ghost" className="text-destructive-foreground" onClick={() => setConfirm(true)}>
                  <Trash2Icon />
                  Delete
                </Button>
              </div>
            )}
            <QueryState
              q={list}
              className="flex-1"
              empty={
                <Empty className="py-16">
                  <EmptyHeader>
                    <EmptyMedia variant="icon"><UploadCloudIcon /></EmptyMedia>
                    <EmptyTitle>{search || kind !== "all" || folder !== ALL_FOLDERS ? "Nothing matches" : "No assets yet"}</EmptyTitle>
                    <EmptyDescription>{search || kind !== "all" || folder !== ALL_FOLDERS ? "Loosen the search or a filter." : "Drop pictures, video, audio or files here, or use Upload. Apps can add their own through the workspace."}</EmptyDescription>
                  </EmptyHeader>
                  <Button size="sm" onClick={() => fileInput.current?.click()}>
                    <UploadCloudIcon />
                    Upload
                  </Button>
                </Empty>
              }
            >
              {(page) =>
                view === "grid" ? (
                  <div className="min-h-0 flex-1 overflow-y-auto">
                    <ul className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                      {page.items.map((a) => (
                        <Tile key={a.id} asset={a} selected={selected.has(a.id)} onOpen={() => go({ kind: "media", id: a.id })} onToggle={() => setSelected((s) => { const n = new Set(s); if (n.has(a.id)) n.delete(a.id); else n.add(a.id); return n; })} />
                      ))}
                    </ul>
                  </div>
                ) : (
                  <DataTable columns={columns} rows={page.items} rowKey={(a) => a.id} sort={sort} onSort={onSort} selected={selected} onSelect={setSelected} onRowClick={(a) => go({ kind: "media", id: a.id })} />
                )
              }
            </QueryState>
            {total > 0 && (
              <TableFooter total={total} offset={offset} limit={LIMIT} onPage={setOffset}>
                {config.data && <span className="text-[11px] text-muted-foreground">{config.data.images ? "Images, Stream and R2" : config.data.files ? "R2 only" : "No storage connected"}</span>}
              </TableFooter>
            )}
          </>
        )}
        <UploadTray jobs={uploads.jobs} onClear={uploads.clear} />
      </div>
      <AssetSheet ws={ws} id={id} onClose={() => go({ kind: "media", tab })} />
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={`Delete ${selected.size} asset${selected.size === 1 ? "" : "s"}?`}
        description="The files are removed from Cloudflare too. Anything that embeds them will break."
        pending={del.pending}
        onConfirm={async () => {
          const ok = await del.run(APP_ID, [...selected]);
          setConfirm(false);
          if (ok !== null) setSelected(new Set());
        }}
      />
    </WorkspaceFrame>
  );
}



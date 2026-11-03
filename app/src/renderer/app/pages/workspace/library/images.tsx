import { CheckIcon, ExternalLinkIcon, ImageIcon, LayoutGridIcon, ListIcon, RefreshCwIcon, SearchIcon, Trash2Icon, UploadCloudIcon } from "lucide-react";
import * as React from "react";
import type { ImagesListing, LibraryImage, LocalFile } from "../../../../../shared/bridge";
import { Button } from "~/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "~/components/ui/empty";
import { Input } from "~/components/ui/input";
import { Sheet, SheetDescription, SheetHeader, SheetPanel, SheetPopup, SheetTitle } from "~/components/ui/sheet";
import { toastManager } from "~/components/ui/toast";
import { DataTable, type DataColumn, IconButton, TableFooter, WorkspaceFrame } from "~/components/workspace/frame";
import { absolute, ConfirmDialog, DropOverlay, EnableCard, Field, formatBytes, ListState, openExternal, relative, UploadTray, UrlRow, useDebounced, useLibraryTarget } from "~/components/workspace/library/shared";
import { sg } from "~/lib/bridge";
import { invalidate, pickFiles, runUpload, useDropFiles, useRemote, useUploadJobs, WS_META } from "~/lib/library";
import { useOpenNav } from "~/shell/context";
import { clean } from "~/lib/workspaces";
import { cn } from "~/lib/utils";

// The organization's Cloudflare Images, as tiles or rows: upload by button or by dropping pictures
// on the page, open one for its sizes and words, delete. Images is account-wide, so what every
// workspace on the account uploaded is here; an upload from this page is tagged with the workspace.

const PAGE = 60;

/** A URL for an image at a size, or its original when flexible variants are not on yet. */
export const imageUrl = (img: LibraryImage, flexible: boolean, variant: string): string | null => (img.base ? `${img.base}/${flexible ? variant : "public"}` : null);
const titleOf = (img: LibraryImage): string => (typeof img.meta.title === "string" && img.meta.title) || img.filename;

function useImages(accountId: string) {
  return useRemote<ImagesListing>(accountId ? `images:${accountId}` : null, () => sg!.library.images.list(accountId));
}

function Thumb({ img, flexible, size, className }: { img: LibraryImage; flexible: boolean; size: number; className?: string }): React.ReactElement {
  const src = imageUrl(img, flexible, `w=${size},h=${size},fit=cover`);
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => setFailed(false), [src]);
  return src && !failed ? <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} className={cn("size-full object-cover", className)} /> : <ImageIcon className={cn("size-7", className)} />;
}

function Tile({ img, flexible, selected, onOpen, onToggle }: { img: LibraryImage; flexible: boolean; selected: boolean; onOpen: () => void; onToggle: () => void }): React.ReactElement {
  return (
    <li className={cn("group relative flex cursor-pointer flex-col gap-1.5 rounded-lg p-1 transition-colors hover:bg-accent/60", selected && "bg-accent")} onClick={onOpen}>
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-md border bg-muted text-muted-foreground">
        <Thumb img={img} flexible={flexible} size={400} />
        <button
          type="button"
          aria-label={selected ? "Deselect" : "Select"}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className={cn("absolute start-1.5 top-1.5 flex size-5 items-center justify-center rounded-md border bg-background/90 text-foreground opacity-0 transition-opacity group-hover:opacity-100", selected && "border-primary bg-primary text-primary-foreground opacity-100")}
        >
          {selected && <CheckIcon className="size-3.5" />}
        </button>
      </div>
      <div className="min-w-0 px-0.5">
        <div className="truncate text-sm font-medium">{titleOf(img)}</div>
        <div className="truncate text-xs text-muted-foreground">{relative(img.uploaded)}</div>
      </div>
    </li>
  );
}

export function ImagesPage(): React.ReactElement {
  const { accountId, ws } = useLibraryTarget();
  const onOpenNav = useOpenNav();
  const listing = useImages(accountId);
  const [view, setView] = React.useState<"grid" | "list">(() => (localStorage.getItem("sg.images.view") === "list" ? "list" : "grid"));
  const [q, setQ] = React.useState("");
  const search = useDebounced(q.trim().toLowerCase(), 200);
  const [offset, setOffset] = React.useState(0);
  const [selected, setSelected] = React.useState<Set<string>>(() => new Set());
  const [confirm, setConfirm] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [open, setOpen] = React.useState<string | null>(null);
  const uploads = useUploadJobs();
  React.useEffect(() => setOffset(0), [search]);

  // until the account turns Images on, nothing can go up: no picker, no drop
  const enabled = listing.data?.enabled ?? false;
  const upload = React.useCallback(
    async (files: LocalFile[]) => {
      if (!sg || !accountId || !enabled) return;
      const lib = sg.library;
      await Promise.all(files.map((file) => runUpload(file, (job) => lib.images.upload(accountId, job, file, { [WS_META]: ws.id, title: file.name.replace(/\.[a-z0-9]+$/i, "") }))));
      invalidate(`images:${accountId}`);
    },
    [accountId, ws.id, enabled],
  );
  const drop = useDropFiles(upload);
  const pickAndUpload = async () => {
    if (enabled) await upload(await pickFiles("image"));
  };

  const flexible = listing.data?.flexible ?? false;
  const all = listing.data?.images ?? [];
  const filtered = search ? all.filter((i) => titleOf(i).toLowerCase().includes(search) || i.filename.toLowerCase().includes(search) || i.id.includes(search)) : all;
  const page = filtered.slice(offset, offset + PAGE);
  const current = open ? all.find((i) => i.id === open) : undefined;

  const columns = React.useMemo<DataColumn<LibraryImage>[]>(
    () => [
      {
        key: "name",
        label: "Name",
        render: (i) => (
          <span className="flex items-center gap-2.5">
            <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted text-muted-foreground [&>svg]:size-4">
              <Thumb img={i} flexible={flexible} size={96} />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-medium">{titleOf(i)}</span>
              {titleOf(i) !== i.filename && <span className="block truncate text-xs text-muted-foreground">{i.filename}</span>}
            </span>
          </span>
        ),
      },
      { key: "id", label: "ID", width: "20rem", className: "max-lg:hidden", render: (i) => <span className="font-mono text-xs text-muted-foreground">{i.id}</span> },
      { key: "uploaded", label: "Uploaded", align: "end", width: "8rem", render: (i) => <span className="text-xs text-muted-foreground">{relative(i.uploaded)}</span> },
    ],
    [flexible],
  );

  const remove = async () => {
    if (!sg) return;
    setDeleting(true);
    try {
      await sg.library.images.remove(accountId, [...selected]);
      setSelected(new Set());
      setConfirm(false);
      invalidate(`images:${accountId}`);
    } catch (e) {
      toastManager.add({ title: "Images Were Not Deleted", description: clean(e), type: "error" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <WorkspaceFrame
      icon={<ImageIcon />}
      title="Images"
      flush
      onOpenNav={onOpenNav}
      actions={
        <Button size="xs" disabled={!enabled} onClick={() => void pickAndUpload()}>
          <UploadCloudIcon />
          Upload
        </Button>
      }
    >
      <div className="relative flex min-h-0 flex-1 flex-col" {...(enabled ? drop.handlers : {})}>
        <DropOverlay show={enabled && drop.dragging} label="Drop pictures to upload them to Images" />
        <div className="flex h-14 shrink-0 items-center gap-2 border-b px-5">
          <span className="text-sm text-muted-foreground">{listing.data ? `${all.length.toLocaleString()} ${all.length === 1 ? "image" : "images"}` : ""}</span>
          <span className="flex-1" />
          <div className="relative w-48">
            <SearchIcon className="pointer-events-none absolute start-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input size="sm" type="search" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} className="ps-7" />
          </div>
          <IconButton label="Read Again" onClick={() => void listing.refresh()}>
            <RefreshCwIcon className={cn(listing.loading && "animate-spin")} />
          </IconButton>
          <IconButton
            label={view === "grid" ? "Show as List" : "Show as Grid"}
            onClick={() => {
              const v = view === "grid" ? "list" : "grid";
              setView(v);
              localStorage.setItem("sg.images.view", v);
            }}
          >
            {view === "grid" ? <ListIcon /> : <LayoutGridIcon />}
          </IconButton>
        </div>
        {selected.size > 0 && (
          <div className="flex h-9 shrink-0 items-center gap-2 border-b bg-accent/40 px-3 text-sm">
            <span className="font-medium">{selected.size} selected</span>
            <Button size="xs" variant="ghost" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
            <span className="flex-1" />
            <Button size="xs" variant="ghost" className="text-destructive-foreground" onClick={() => setConfirm(true)}>
              <Trash2Icon />
              Delete
            </Button>
          </div>
        )}
        <ListState
          data={listing.data}
          error={listing.error}
          loading={listing.loading}
          onRetry={() => void listing.refresh()}
          isEmpty={(d) => !d.enabled || filtered.length === 0}
          empty={
            !enabled ? (
              <EnableCard product="images" accountId={accountId} checking={listing.loading} onRecheck={() => void listing.refresh()} />
            ) : (
              <Empty className="py-16">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ImageIcon />
                  </EmptyMedia>
                  <EmptyTitle>{search ? "Nothing Matches" : "No Images Yet"}</EmptyTitle>
                  <EmptyDescription>{search ? "Try another word." : "Drop pictures here or use Upload. Each one gets a URL that resizes on request."}</EmptyDescription>
                </EmptyHeader>
                <Button size="sm" onClick={() => void pickAndUpload()}>
                  <UploadCloudIcon />
                  Upload
                </Button>
              </Empty>
            )
          }
        >
          {() =>
            view === "grid" ? (
              <div className="min-h-0 flex-1 overflow-y-auto">
                <ul className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {page.map((img) => (
                    <Tile
                      key={img.id}
                      img={img}
                      flexible={flexible}
                      selected={selected.has(img.id)}
                      onOpen={() => setOpen(img.id)}
                      onToggle={() =>
                        setSelected((s) => {
                          const n = new Set(s);
                          if (n.has(img.id)) n.delete(img.id);
                          else n.add(img.id);
                          return n;
                        })
                      }
                    />
                  ))}
                </ul>
              </div>
            ) : (
              <DataTable className="[&_tbody_tr]:h-14 [&_tbody_td]:py-3 [&_thead_th]:h-10" columns={columns} rows={page} rowKey={(i) => i.id} selected={selected} onSelect={setSelected} onRowClick={(i) => setOpen(i.id)} />
            )
          }
        </ListState>
        {filtered.length > 0 && (
          <TableFooter total={filtered.length} offset={offset} limit={PAGE} onPage={setOffset}>
            <span className="text-xs text-muted-foreground">{listing.data?.hash ? "Served from imagedelivery.net" : ""}</span>
          </TableFooter>
        )}
        <UploadTray jobs={uploads.jobs} onClear={uploads.clear} onCancel={uploads.cancel} />
      </div>
      <ImageSheet accountId={accountId} img={current} flexible={flexible} open={!!open} onClose={() => setOpen(null)} />
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title={`Delete ${selected.size} ${selected.size === 1 ? "Image" : "Images"}?`} description="They are removed from Cloudflare Images. Anything that shows them will break." pending={deleting} onConfirm={() => void remove()} />
    </WorkspaceFrame>
  );
}

/** One image: the picture, its words (kept as Images metadata), its URLs at a few sizes, and the facts about it. */
function ImageSheet({ accountId, img, flexible, open, onClose }: { accountId: string; img: LibraryImage | undefined; flexible: boolean; open: boolean; onClose: () => void }): React.ReactElement {
  const last = React.useRef<LibraryImage | undefined>(undefined);
  if (img) last.current = img;
  const shown = img ?? last.current;
  const [confirm, setConfirm] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [alt, setAlt] = React.useState("");
  const savedTitle = typeof shown?.meta.title === "string" ? shown.meta.title : "";
  const savedAlt = typeof shown?.meta.alt === "string" ? shown.meta.alt : "";
  React.useEffect(() => {
    setTitle(savedTitle);
    setAlt(savedAlt);
  }, [shown?.id, savedTitle, savedAlt]);
  const changed = title.trim() !== savedTitle || alt.trim() !== savedAlt;
  const update = async () => {
    if (!sg || !shown) return;
    setSaving(true);
    try {
      await sg.library.images.update(accountId, shown.id, { ...shown.meta, title: title.trim(), alt: alt.trim() });
      invalidate(`images:${accountId}`);
      toastManager.add({ title: "Image Updated", type: "success", timeout: 1500 });
    } catch (e) {
      toastManager.add({ title: "Image Did Not Save", description: clean(e), type: "error" });
    } finally {
      setSaving(false);
    }
  };
  const remove = async () => {
    if (!sg || !shown) return;
    setBusy(true);
    try {
      await sg.library.images.remove(accountId, [shown.id]);
      setConfirm(false);
      onClose();
      invalidate(`images:${accountId}`);
    } catch (e) {
      toastManager.add({ title: "Image Was Not Deleted", description: clean(e), type: "error" });
    } finally {
      setBusy(false);
    }
  };
  const full = shown ? imageUrl(shown, flexible, "w=1600") : null;
  const action = "gap-2 [&_svg]:mx-0";
  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <SheetPopup className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="truncate pe-8">{shown ? titleOf(shown) : "Image"}</SheetTitle>
          <SheetDescription className="sr-only">The image, its words and its URLs.</SheetDescription>
        </SheetHeader>
        <SheetPanel className="flex flex-col gap-5">
          {shown && (
            <>
              <div className="flex max-h-80 items-center justify-center overflow-hidden rounded-lg border bg-muted/40">{full ? <img src={full} alt={alt} className="max-h-80 w-full object-contain" /> : <ImageIcon className="my-16 size-7 text-muted-foreground" />}</div>
              <div className="flex items-center gap-1">
                {full && (
                  <Button size="sm" variant="ghost" className={action} onClick={() => openExternal(imageUrl(shown, flexible, "public")!)}>
                    <ExternalLinkIcon />
                    Open
                  </Button>
                )}
                <span className="flex-1" />
                <Button size="sm" variant="ghost" className={cn(action, "text-destructive-foreground")} onClick={() => setConfirm(true)}>
                  <Trash2Icon />
                  Delete
                </Button>
              </div>
              <div className="flex flex-col gap-4">
                <Field label="Title">
                  <Input size="lg" value={title} onChange={(e) => setTitle(e.target.value)} />
                </Field>
                <Field label="Alt Text" hint="Read out by screen readers and shown when the picture cannot load.">
                  <Input size="lg" value={alt} onChange={(e) => setAlt(e.target.value)} />
                </Field>
                <div className="flex justify-end">
                  <Button size="sm" disabled={!changed} loading={saving} onClick={() => void update()}>
                    Update
                  </Button>
                </div>
              </div>
              {shown.base && (
                <div className="flex flex-col gap-2">
                  <div className="text-sm font-medium">URLs</div>
                  <UrlRow label="Original" url={`${shown.base}/public`} />
                  {flexible && (
                    <>
                      <UrlRow label="800 wide" url={`${shown.base}/w=800,f=auto`} />
                      <UrlRow label="Square" url={`${shown.base}/w=400,h=400,fit=cover`} />
                    </>
                  )}
                  <div className="text-xs text-muted-foreground">
                    {flexible ? "Any size works by changing the options on the URL. " : "Sizes on the URL start working after the first upload from here. "}
                    <button type="button" onClick={() => openExternal("https://developers.cloudflare.com/images/transform-images/transform-via-url/")} className="cursor-pointer underline underline-offset-4 hover:text-foreground">
                      Every resizing option, in Cloudflare's docs
                    </button>
                    .
                  </div>
                </div>
              )}
              <dl className="flex flex-col divide-y rounded-lg border text-sm">
                {[
                  ["File", shown.filename],
                  ["Uploaded", absolute(shown.uploaded)],
                  ["ID", <span key="id" className="font-mono text-xs">{shown.id}</span>],
                  ["Workspace", typeof shown.meta[WS_META] === "string" ? (shown.meta[WS_META] as string) : "—"],
                ].map(([k, v]) => (
                  <div key={String(k)} className="flex items-baseline gap-4 px-3 py-2">
                    <dt className="w-24 shrink-0 text-muted-foreground">{k}</dt>
                    <dd className="min-w-0 flex-1 truncate">{v}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </SheetPanel>
      </SheetPopup>
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title={`Delete ${shown ? titleOf(shown) : "this image"}?`} description="It is removed from Cloudflare Images. Anything that shows it will break." pending={busy} onConfirm={() => void remove()} />
    </Sheet>
  );
}

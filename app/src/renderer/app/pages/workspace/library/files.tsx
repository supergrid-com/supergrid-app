import { DownloadIcon, ExternalLinkIcon, FileArchiveIcon, FileAudioIcon, FileCodeIcon, FileIcon, FileImageIcon, FileSpreadsheetIcon, FileTextIcon, FileTypeIcon, FileVideoIcon, FolderIcon, PresentationIcon, RefreshCwIcon, SearchIcon, Trash2Icon, UploadCloudIcon } from "lucide-react";
import * as React from "react";
import type { FilesListing, LibraryFile, LocalFile } from "../../../../../shared/bridge";
import { FAMILY_LABELS, familyOf, type FileFamily, mimeOf } from "../../../../../shared/mime";
import { Button } from "~/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "~/components/ui/empty";
import { Input } from "~/components/ui/input";
import { Sheet, SheetDescription, SheetHeader, SheetPanel, SheetPopup, SheetTitle } from "~/components/ui/sheet";
import { toastManager } from "~/components/ui/toast";
import { DataTable, type DataColumn, IconButton, type SortState, TableFooter, WorkspaceFrame } from "~/components/workspace/frame";
import { absolute, ConfirmDialog, DropOverlay, Fact, FilterTabs, formatBytes, ListState, openExternal, relative, UploadTray, UrlRow, useDebounced, useLibraryTarget } from "~/components/workspace/library/shared";
import { sg } from "~/lib/bridge";
import { invalidate, pickFiles, runUpload, useDropFiles, useRemote, useUploadJobs } from "~/lib/library";
import { useOpenNav } from "~/shell/context";
import { clean } from "~/lib/workspaces";
import { cn } from "~/lib/utils";

// The workspace's own files: its R2 bucket (`<worker>-files`), which the workspace serves at
// /_ws/files/<key>. Each upload is typed from its name on the way in, so the page filters by what a
// file is. One PUT per file through the API, up to 300 MB for now.

const PAGE = 100;
const FAMILY_ORDER: FileFamily[] = ["document", "spreadsheet", "presentation", "image", "video", "audio", "archive", "code", "font", "other"];
const icons: Record<FileFamily, React.ComponentType<{ className?: string }>> = { image: FileImageIcon, video: FileVideoIcon, audio: FileAudioIcon, document: FileTextIcon, spreadsheet: FileSpreadsheetIcon, presentation: PresentationIcon, archive: FileArchiveIcon, code: FileCodeIcon, font: FileTypeIcon, other: FileIcon };

const useFiles = (accountId: string, bucket: string) => useRemote<FilesListing>(accountId ? `files:${accountId}:${bucket}` : null, () => sg!.library.files.list(accountId, bucket));
const nameOf = (f: LibraryFile) => f.key.split("/").pop() ?? f.key;
const folderOf = (f: LibraryFile) => (f.key.includes("/") ? f.key.slice(0, f.key.lastIndexOf("/")) : "");
const family = (f: LibraryFile) => familyOf(f.contentType, f.key);
/** Where the workspace serves an object. */
export const fileUrl = (wsUrl: string, key: string) => `${wsUrl.replace(/\/$/, "")}/_ws/files/${key.split("/").map(encodeURIComponent).join("/")}`;

export function FilesPage(): React.ReactElement {
  const { accountId, ws, bucket } = useLibraryTarget();
  const onOpenNav = useOpenNav();
  const listing = useFiles(accountId, bucket);
  const [tab, setTab] = React.useState<FileFamily | "all">("all");
  const [q, setQ] = React.useState("");
  const search = useDebounced(q.trim().toLowerCase(), 200);
  const [sort, setSort] = React.useState<SortState>({ key: "modified", dir: "desc" });
  const [offset, setOffset] = React.useState(0);
  const [selected, setSelected] = React.useState<Set<string>>(() => new Set());
  const [confirm, setConfirm] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [open, setOpen] = React.useState<string | null>(null);
  const uploads = useUploadJobs();
  React.useEffect(() => setOffset(0), [tab, search, sort]);

  const all = listing.data?.files ?? [];
  const upload = React.useCallback(
    async (files: LocalFile[]) => {
      if (!sg || !accountId) return;
      const taken = new Set(all.map((f) => f.key));
      // a name already in the bucket gets a number, so nothing is overwritten by accident
      const keyFor = (name: string) => {
        const dot = name.lastIndexOf(".");
        const stem = dot > 0 ? name.slice(0, dot) : name;
        const ext = dot > 0 ? name.slice(dot) : "";
        let key = name;
        for (let n = 2; taken.has(key); n++) key = `${stem}-${n}${ext}`;
        taken.add(key);
        return key;
      };
      const lib = sg.library;
      await Promise.all(files.map((file) => runUpload(file, (job) => lib.files.upload(accountId, job, bucket, file, { key: keyFor(file.name), contentType: mimeOf(file.name, file.type) }))));
      invalidate(`files:${accountId}:${bucket}`);
    },
    [accountId, bucket, all],
  );
  const drop = useDropFiles(upload);
  const pickAndUpload = async () => upload(await pickFiles("file"));

  const counts = React.useMemo(() => {
    const c = new Map<FileFamily, number>();
    for (const f of all) c.set(family(f), (c.get(family(f)) ?? 0) + 1);
    return c;
  }, [all]);
  const tabs = [{ key: "all" as const, label: "All", count: all.length }, ...FAMILY_ORDER.filter((f) => counts.has(f)).map((f) => ({ key: f, label: FAMILY_LABELS[f], count: counts.get(f) }))];
  const filtered = React.useMemo(() => {
    let rows = tab === "all" ? all : all.filter((f) => family(f) === tab);
    if (search) rows = rows.filter((f) => f.key.toLowerCase().includes(search));
    const dir = sort.dir === "asc" ? 1 : -1;
    return rows.slice().sort((a, b) => {
      if (sort.key === "size") return (a.size - b.size) * dir;
      if (sort.key === "name") return nameOf(a).localeCompare(nameOf(b)) * dir;
      return a.modified.localeCompare(b.modified) * dir;
    });
  }, [all, tab, search, sort]);
  const page = filtered.slice(offset, offset + PAGE);
  const current = open ? all.find((f) => f.key === open) : undefined;
  const onSort = (key: string) => setSort((s) => ({ key, dir: s.key === key ? (s.dir === "asc" ? "desc" : "asc") : key === "name" ? "asc" : "desc" }));

  const columns = React.useMemo<DataColumn<LibraryFile>[]>(
    () => [
      {
        key: "name",
        label: "Name",
        sortable: true,
        render: (f) => {
          const Icon = icons[family(f)];
          return (
            <span className="flex items-center gap-2.5">
              <Icon className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0">
                <span className="block truncate font-medium">{nameOf(f)}</span>
                {folderOf(f) && <span className="block truncate font-mono text-xs text-muted-foreground">{folderOf(f)}/</span>}
              </span>
            </span>
          );
        },
      },
      { key: "type", label: "Type", width: "9rem", render: (f) => <span className="text-muted-foreground">{FAMILY_LABELS[family(f)]}</span> },
      { key: "mime", label: "Content Type", width: "14rem", className: "max-lg:hidden", render: (f) => <span className="truncate font-mono text-xs text-muted-foreground">{f.contentType ?? ""}</span> },
      { key: "size", label: "Size", sortable: true, align: "end", width: "6rem", render: (f) => <span className="tabular-nums text-muted-foreground">{formatBytes(f.size)}</span> },
      { key: "modified", label: "Uploaded", sortable: true, align: "end", width: "8rem", render: (f) => <span className="text-xs text-muted-foreground">{relative(f.modified)}</span> },
    ],
    [],
  );

  const remove = async () => {
    if (!sg) return;
    setDeleting(true);
    try {
      await sg.library.files.remove(accountId, bucket, [...selected]);
      setSelected(new Set());
      setConfirm(false);
      invalidate(`files:${accountId}:${bucket}`);
    } catch (e) {
      toastManager.add({ title: "Files Were Not Deleted", description: clean(e), type: "error" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <WorkspaceFrame
      icon={<FolderIcon />}
      title="Files"
      flush
      onOpenNav={onOpenNav}
      actions={
        <Button size="xs" onClick={() => void pickAndUpload()}>
          <UploadCloudIcon />
          Upload
        </Button>
      }
    >
      <div className="relative flex min-h-0 flex-1 flex-col" {...drop.handlers}>
        <DropOverlay show={drop.dragging} label="Drop files to put them in the workspace's bucket" />
        <div className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <FilterTabs tabs={tabs} value={tab} onChange={setTab} />
          <span className="flex-1" />
          <div className="relative w-48">
            <SearchIcon className="pointer-events-none absolute start-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input size="sm" type="search" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} className="ps-7" />
          </div>
          <IconButton label="Read Again" onClick={() => void listing.refresh()}>
            <RefreshCwIcon className={cn(listing.loading && "animate-spin")} />
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
          isEmpty={() => filtered.length === 0}
          empty={
            <Empty className="py-16">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FolderIcon />
                </EmptyMedia>
                <EmptyTitle>{search || tab !== "all" ? "Nothing Matches" : "No Files Yet"}</EmptyTitle>
                <EmptyDescription>{search || tab !== "all" ? "Loosen the search or the filter." : "Drop files here or use Upload. Each one is served from the workspace's own address."}</EmptyDescription>
              </EmptyHeader>
              <Button size="sm" onClick={() => void pickAndUpload()}>
                <UploadCloudIcon />
                Upload
              </Button>
            </Empty>
          }
        >
          {() => <DataTable className="[&_tbody_tr]:h-14 [&_tbody_td]:py-3 [&_thead_th]:h-10" columns={columns} rows={page} rowKey={(f) => f.key} sort={sort} onSort={onSort} selected={selected} onSelect={setSelected} onRowClick={(f) => setOpen(f.key)} />}
        </ListState>
        {filtered.length > 0 && (
          <TableFooter total={filtered.length} offset={offset} limit={PAGE} onPage={setOffset}>
            <span className="truncate font-mono text-xs text-muted-foreground">{bucket}</span>
          </TableFooter>
        )}
        <UploadTray jobs={uploads.jobs} onClear={uploads.clear} onCancel={uploads.cancel} />
      </div>
      <FileSheet accountId={accountId} bucket={bucket} wsUrl={ws.url} file={current} open={!!open} onClose={() => setOpen(null)} />
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title={`Delete ${selected.size} ${selected.size === 1 ? "File" : "Files"}?`} description="They are removed from the bucket. Anything that links to them will break." pending={deleting} onConfirm={() => void remove()} />
    </WorkspaceFrame>
  );
}

function FileSheet({ accountId, bucket, wsUrl, file, open, onClose }: { accountId: string; bucket: string; wsUrl: string; file: LibraryFile | undefined; open: boolean; onClose: () => void }): React.ReactElement {
  const last = React.useRef<LibraryFile | undefined>(undefined);
  if (file) last.current = file;
  const shown = file ?? last.current;
  const [confirm, setConfirm] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const url = shown ? fileUrl(wsUrl, shown.key) : null;
  const fam = shown ? family(shown) : "other";
  const Icon = icons[fam];
  const save = async () => {
    if (!sg || !shown) return;
    try {
      if (await sg.library.files.save(accountId, bucket, shown.key)) toastManager.add({ title: "File Saved", type: "success", timeout: 1500 });
    } catch (e) {
      toastManager.add({ title: "File Did Not Save", description: clean(e), type: "error" });
    }
  };
  const remove = async () => {
    if (!sg || !shown) return;
    setBusy(true);
    try {
      await sg.library.files.remove(accountId, bucket, [shown.key]);
      setConfirm(false);
      onClose();
      invalidate(`files:${accountId}:${bucket}`);
    } catch (e) {
      toastManager.add({ title: "File Was Not Deleted", description: clean(e), type: "error" });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <SheetPopup className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="truncate pe-8">{shown ? nameOf(shown) : "File"}</SheetTitle>
          <SheetDescription>{shown ? `${FAMILY_LABELS[fam]} · ${formatBytes(shown.size)} · ${relative(shown.modified)}` : " "}</SheetDescription>
        </SheetHeader>
        <SheetPanel className="flex flex-col gap-4">
          {shown && url && (
            <>
              <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg border bg-muted/40 text-muted-foreground">
                {fam === "image" ? <img src={url} alt="" className="size-full object-contain" /> : fam === "video" ? <video src={url} controls className="size-full bg-black" /> : fam === "audio" ? <audio src={url} controls className="w-11/12" /> : (
                  <div className="flex flex-col items-center gap-2 text-xs">
                    <Icon className="size-8" />
                    {shown.contentType ?? "file"}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" className="gap-2 [&_svg]:mx-0" onClick={() => openExternal(url)}>
                  <ExternalLinkIcon />
                  Open
                </Button>
                <Button size="sm" variant="ghost" className="gap-2 [&_svg]:mx-0" onClick={() => void save()}>
                  <DownloadIcon />
                  Save to Mac
                </Button>
                <span className="flex-1" />
                <Button size="sm" variant="ghost" className="gap-2 text-destructive-foreground [&_svg]:mx-0" onClick={() => setConfirm(true)}>
                  <Trash2Icon />
                  Delete
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border bg-muted/30 p-3">
                <Fact label="Key" value={<span className="break-all font-mono text-xs">{shown.key}</span>} />
                <Fact label="Content Type" value={shown.contentType ?? "unknown"} />
                <Fact label="Size" value={formatBytes(shown.size)} />
                <Fact label="Uploaded" value={absolute(shown.modified)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="text-sm font-medium">URL</div>
                <UrlRow label="Public" url={url} />
              </div>
            </>
          )}
        </SheetPanel>
      </SheetPopup>
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title={`Delete ${shown ? nameOf(shown) : "this file"}?`} description="It is removed from the bucket. Anything that links to it will break." pending={busy} onConfirm={() => void remove()} />
    </Sheet>
  );
}

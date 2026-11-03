import { ArrowLeftIcon, BarChart3Icon, CheckIcon, ClapperboardIcon, ExternalLinkIcon, MusicIcon, PlayIcon, RefreshCwIcon, SearchIcon, Trash2Icon, UploadCloudIcon } from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router";
import type { LibraryVideo, LocalFile, StreamAnalyticsRow, StreamListing } from "../../../../../shared/bridge";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "~/components/ui/empty";
import { Input } from "~/components/ui/input";
import { toastManager } from "~/components/ui/toast";
import { Card, Crumbs, IconButton, StatTile, WorkspaceFrame } from "~/components/workspace/frame";
import { absolute, CodeBlock, ConfirmDialog, DropOverlay, EnableCard, Fact, Field, formatBytes, formatDuration, ListState, openExternal, relative, UploadTray, UrlRow, useDebounced, useLibraryTarget } from "~/components/workspace/library/shared";
import { sg } from "~/lib/bridge";
import { invalidate, pickFiles, runUpload, useDropFiles, useRemote, useUploadJobs, WS_META } from "~/lib/library";
import { useOpenNav } from "~/shell/context";
import { clean } from "~/lib/workspaces";
import { cn } from "~/lib/utils";

// The organization's Cloudflare Stream: every video and audio, uploaded from here in resumable
// chunks (any size), each with a page of its own (the player, its URLs, the embed code, what it
// played) and an analytics page over all of them. Stream is account-wide like Images.

const useStream = (accountId: string) => useRemote<StreamListing>(accountId ? `stream:${accountId}` : null, () => sg!.library.stream.list(accountId));

/** The `customer-<code>` host from a video's own URLs, or the listing's. */
const customerOf = (v: LibraryVideo | undefined, fallback: string | null): string | null => {
  const m = /^https:\/\/(customer-[a-z0-9]+)\.cloudflarestream\.com\//.exec(v?.hls ?? v?.thumbnail ?? "");
  return m?.[1] ?? fallback;
};
const embedUrl = (customer: string, uid: string) => `https://${customer}.cloudflarestream.com/${uid}/iframe`;
const isAudio = (v: LibraryVideo) => !v.width && !v.height && v.readyToStream;
const stateLabel = (v: LibraryVideo): string => (v.readyToStream ? "ready" : v.state === "error" ? "failed" : v.state === "inprogress" || v.state === "queued" ? `encoding ${Math.round(v.pctComplete)}%` : v.state === "pendingupload" ? "waiting for the upload" : v.state);
const stateVariant = (v: LibraryVideo): "success" | "info" | "warning" | "error" => (v.readyToStream ? "success" : v.state === "error" ? "error" : v.state === "pendingupload" ? "warning" : "info");

/** Reads the account again every few seconds while something is still encoding. */
function usePollWhile(busy: boolean, refresh: () => Promise<void>): void {
  React.useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => void refresh(), 5000);
    return () => clearInterval(t);
  }, [busy, refresh]);
}

function Poster({ v, className }: { v: LibraryVideo; className?: string }): React.ReactElement {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => setFailed(false), [v.thumbnail, v.readyToStream]);
  const Icon = isAudio(v) ? MusicIcon : ClapperboardIcon;
  return v.thumbnail && v.readyToStream && !isAudio(v) && !failed ? <img src={v.thumbnail} alt="" loading="lazy" onError={() => setFailed(true)} className={cn("size-full object-cover", className)} /> : <Icon className={cn("size-7", className)} />;
}

function Tile({ v, selected, onOpen, onToggle }: { v: LibraryVideo; selected: boolean; onOpen: () => void; onToggle: () => void }): React.ReactElement {
  return (
    <li className={cn("group relative flex cursor-pointer flex-col gap-1.5 rounded-lg p-1 transition-colors hover:bg-accent/60", selected && "bg-accent")} onClick={onOpen}>
      <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-md border bg-muted text-muted-foreground">
        <Poster v={v} />
        {!v.readyToStream && (
          <span className="absolute inset-x-1.5 bottom-1.5 flex justify-center">
            <Badge variant={stateVariant(v)} size="sm">
              {stateLabel(v)}
            </Badge>
          </span>
        )}
        {v.readyToStream && v.duration > 0 && <span className="absolute end-1.5 bottom-1.5 rounded bg-black/70 px-1 py-px font-mono text-[11px] text-white">{formatDuration(v.duration)}</span>}
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
        <div className="truncate text-sm font-medium">{v.name}</div>
        <div className="flex gap-1.5 truncate text-xs text-muted-foreground">
          <span>{formatBytes(v.size) || relative(v.created)}</span>
          {v.width && v.height && <span>· {v.width}×{v.height}</span>}
        </div>
      </div>
    </li>
  );
}

export function MediaPage(): React.ReactElement {
  const { accountId, ws } = useLibraryTarget();
  const onOpenNav = useOpenNav();
  const navigate = useNavigate();
  const listing = useStream(accountId);
  const [q, setQ] = React.useState("");
  const search = useDebounced(q.trim().toLowerCase(), 200);
  const [selected, setSelected] = React.useState<Set<string>>(() => new Set());
  const [confirm, setConfirm] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const uploads = useUploadJobs();
  const base = `/w/${ws.id}/library/media`;

  // until the account has Stream storage, nothing can go up: no picker, no drop
  const enabled = listing.data?.enabled ?? false;
  const upload = React.useCallback(
    async (files: LocalFile[]) => {
      if (!sg || !accountId || !enabled) return;
      const lib = sg.library;
      // the listing shows each one as soon as Stream has it, while the rest of the bytes go up
      await Promise.all(
        files.map((file) =>
          runUpload(file, async (job) => {
            const v = await lib.stream.upload(accountId, job, file, { name: file.name.replace(/\.[a-z0-9]+$/i, ""), meta: { [WS_META]: ws.id } });
            invalidate(`stream:${accountId}`);
            return v;
          }),
        ),
      );
      invalidate(`stream:${accountId}`);
    },
    [accountId, ws.id, enabled],
  );
  const drop = useDropFiles(upload);
  const pickAndUpload = async () => {
    if (enabled) await upload(await pickFiles("media"));
  };

  const all = listing.data?.videos ?? [];
  const filtered = search ? all.filter((v) => v.name.toLowerCase().includes(search) || v.uid.includes(search)) : all;
  usePollWhile(all.some((v) => !v.readyToStream && v.state !== "error"), listing.refresh);

  const remove = async () => {
    if (!sg) return;
    setDeleting(true);
    try {
      await sg.library.stream.remove(accountId, [...selected]);
      setSelected(new Set());
      setConfirm(false);
      invalidate(`stream:${accountId}`);
    } catch (e) {
      toastManager.add({ title: "Media Was Not Deleted", description: clean(e), type: "error" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <WorkspaceFrame
      icon={<ClapperboardIcon />}
      title="Media"
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
        <DropOverlay show={enabled && drop.dragging} label="Drop video or audio to upload it to Stream" />
        <div className="flex h-14 shrink-0 items-center gap-2 border-b px-5">
          <span className="text-sm text-muted-foreground">{listing.data ? `${all.length.toLocaleString()} ${all.length === 1 ? "item" : "items"}${listing.data.minutesLimit ? ` · ${Math.round(listing.data.minutes).toLocaleString()} of ${listing.data.minutesLimit.toLocaleString()} minutes` : ""}` : ""}</span>
          <span className="flex-1" />
          <div className="relative w-48">
            <SearchIcon className="pointer-events-none absolute start-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input size="sm" type="search" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} className="ps-7" />
          </div>
          <IconButton label="Read Again" onClick={() => void listing.refresh()}>
            <RefreshCwIcon className={cn(listing.loading && "animate-spin")} />
          </IconButton>
          <Button size="xs" variant="outline" disabled={!enabled} onClick={() => navigate(`${base}/analytics`)}>
            <BarChart3Icon />
            Analytics
          </Button>
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
              <EnableCard product="stream" accountId={accountId} checking={listing.loading} onRecheck={() => void listing.refresh()} />
            ) : (
              <Empty className="py-16">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ClapperboardIcon />
                  </EmptyMedia>
                  <EmptyTitle>{search ? "Nothing Matches" : "No Media Yet"}</EmptyTitle>
                  <EmptyDescription>{search ? "Try another word." : "Drop video or audio here or use Upload. Big files go up in pieces and pick up where they left off."}</EmptyDescription>
                </EmptyHeader>
                <Button size="sm" onClick={() => void pickAndUpload()}>
                  <UploadCloudIcon />
                  Upload
                </Button>
              </Empty>
            )
          }
        >
          {() => (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <ul className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 lg:grid-cols-4">
                {filtered.map((v) => (
                  <Tile
                    key={v.uid}
                    v={v}
                    selected={selected.has(v.uid)}
                    onOpen={() => navigate(`${base}/${v.uid}`)}
                    onToggle={() =>
                      setSelected((s) => {
                        const n = new Set(s);
                        if (n.has(v.uid)) n.delete(v.uid);
                        else n.add(v.uid);
                        return n;
                      })
                    }
                  />
                ))}
              </ul>
            </div>
          )}
        </ListState>
        <UploadTray jobs={uploads.jobs} onClear={uploads.clear} onCancel={uploads.cancel} />
      </div>
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title={`Delete ${selected.size} ${selected.size === 1 ? "Item" : "Items"}?`} description="They are removed from Cloudflare Stream. Anything that plays them will break." pending={deleting} onConfirm={() => void remove()} />
    </WorkspaceFrame>
  );
}

// ---- one video ----

function PlaybackBars({ rows, days }: { rows: StreamAnalyticsRow[]; days: number }): React.ReactElement {
  const max = Math.max(1, ...rows.map((r) => r.minutes));
  return (
    <div className="flex h-36 gap-1">
      {rows.map((r) => (
        <div key={r.key ?? "?"} className="group flex min-w-0 flex-1 flex-col items-center gap-1" title={`${r.key}: ${r.minutes} minutes, ${r.views} plays`}>
          <div className="flex w-full flex-1 items-end">
            <div className="w-full rounded-t-md bg-primary/80 transition-colors group-hover:bg-primary" style={{ height: `${Math.max(2, (r.minutes / max) * 100)}%` }} />
          </div>
          <span className="w-full truncate text-center text-[10px] text-muted-foreground">{days <= 14 ? r.key?.slice(5) : r.key?.slice(8)}</span>
        </div>
      ))}
    </div>
  );
}

export function VideoPage({ uid }: { uid: string }): React.ReactElement {
  const { accountId, ws } = useLibraryTarget();
  const onOpenNav = useOpenNav();
  const navigate = useNavigate();
  const listing = useStream(accountId);
  const video = useRemote<LibraryVideo>(accountId ? `video:${accountId}:${uid}` : null, () => sg!.library.stream.get(accountId, uid));
  const played = useRemote<StreamAnalyticsRow[]>(accountId ? `stream-analytics:${accountId}:${uid}` : null, () => sg!.library.stream.analytics(accountId, { days: 30, uid, groupBy: "day" }));
  const v = video.data ?? undefined;
  const [name, setName] = React.useState("");
  const [confirm, setConfirm] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => setName(v?.name ?? ""), [v?.uid, v?.name]);
  usePollWhile(!!v && !v.readyToStream && v.state !== "error", video.refresh);
  const customer = customerOf(v, listing.data?.customer ?? null);
  const embed = v && customer ? embedUrl(customer, v.uid) : null;
  const base = `/w/${ws.id}/library/media`;

  const rename = async () => {
    if (!sg || !v || name.trim() === v.name || !name.trim()) return;
    try {
      await sg.library.stream.update(accountId, v.uid, { name: name.trim() });
      invalidate(`video:${accountId}:${uid}`);
      invalidate(`stream:${accountId}`);
    } catch (e) {
      toastManager.add({ title: "Name Did Not Save", description: clean(e), type: "error" });
    }
  };
  const remove = async () => {
    if (!sg || !v) return;
    setBusy(true);
    try {
      await sg.library.stream.remove(accountId, [v.uid]);
      invalidate(`stream:${accountId}`);
      navigate(base);
    } catch (e) {
      toastManager.add({ title: "Media Was Not Deleted", description: clean(e), type: "error" });
      setBusy(false);
    }
  };
  const minutes = played.data?.reduce((n, r) => n + r.minutes, 0) ?? 0;
  const views = played.data?.reduce((n, r) => n + r.views, 0) ?? 0;
  const snippet = embed ? `<iframe\n  src="${embed}"\n  style="border: none; width: 100%; aspect-ratio: ${v?.width && v?.height ? `${v.width} / ${v.height}` : "16 / 9"};"\n  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"\n  allowfullscreen="true"\n></iframe>` : "";

  return (
    <WorkspaceFrame
      icon={<ClapperboardIcon />}
      title={<Crumbs items={["Media", v?.name ?? "…"]} />}
      onOpenNav={onOpenNav}
      actions={
        <Button size="xs" variant="ghost" onClick={() => navigate(base)}>
          <ArrowLeftIcon />
          All Media
        </Button>
      }
    >
      <ListState data={video.data} error={video.error} loading={video.loading} onRetry={() => void video.refresh()} isEmpty={() => false} empty={null}>
        {(item) => (
          <>
            <div className="flex items-center gap-2 pt-2 pb-1">
              <Button size="sm" variant="ghost" className="gap-2 [&_svg]:mx-0" onClick={() => navigate(base)}>
                <ArrowLeftIcon />
                All Media
              </Button>
              {!item.readyToStream && (
                <Badge variant={stateVariant(item)} size="sm">
                  {stateLabel(item)}
                </Badge>
              )}
              {item.error && <span className="truncate text-xs text-destructive-foreground">{item.error}</span>}
              <span className="flex-1" />
              {!item.readyToStream && (
                <Button size="sm" variant="ghost" className="gap-2 [&_svg]:mx-0" loading={video.loading} onClick={() => void video.refresh()}>
                  <RefreshCwIcon />
                  Check Again
                </Button>
              )}
              {item.hls && (
                <Button size="sm" variant="ghost" className="gap-2 [&_svg]:mx-0" onClick={() => openExternal(embed ?? item.hls!)}>
                  <ExternalLinkIcon />
                  Open
                </Button>
              )}
              <Button size="sm" variant="ghost" className="gap-2 text-destructive-foreground [&_svg]:mx-0" onClick={() => setConfirm(true)}>
                <Trash2Icon />
                Delete
              </Button>
            </div>
            <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
              <div className="flex flex-col gap-5">
                <Card padded={false}>
                  {item.readyToStream && embed ? (
                    <iframe src={embed} title={item.name} allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture" allowFullScreen className={cn("w-full border-0 bg-black", isAudio(item) ? "h-20" : "aspect-video")} />
                  ) : (
                    <div className="flex aspect-video items-center justify-center bg-muted text-muted-foreground">
                      <div className="flex flex-col items-center gap-2 text-sm">
                        <Poster v={item} />
                        {stateLabel(item)}
                      </div>
                    </div>
                  )}
                </Card>
                <Card title="Embed">
                  {snippet ? (
                    <div className="flex flex-col gap-2">
                      <CodeBlock code={snippet} what="Embed Code" />
                      <div className="text-xs text-muted-foreground">Paste it where the player should be. Stream's player handles quality, captions and full screen.</div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">The embed code appears once Stream has finished encoding.</div>
                  )}
                </Card>
                {(item.hls || item.dash || item.thumbnail) && (
                  <Card title="URLs">
                    <div className="flex flex-col gap-1.5">
                      {embed && <UrlRow label="Player" url={embed} />}
                      {item.hls && <UrlRow label="HLS" url={item.hls} />}
                      {item.dash && <UrlRow label="DASH" url={item.dash} />}
                      {item.thumbnail && !isAudio(item) && <UrlRow label="Poster" url={item.thumbnail} />}
                    </div>
                  </Card>
                )}
              </div>
              <div className="flex flex-col gap-5">
                <Card title="Details">
                  <div className="flex flex-col gap-3">
                    <Field label="Name">
                      <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => void rename()} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
                    </Field>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <Fact label="Duration" value={formatDuration(item.duration)} />
                      <Fact label="Size" value={formatBytes(item.size)} />
                      <Fact label="Dimensions" value={item.width && item.height ? `${item.width} × ${item.height}` : isAudio(item) ? "Audio" : null} />
                      <Fact label="Uploaded" value={absolute(item.created)} />
                      <Fact label="Workspace" value={item.meta[WS_META] ?? "—"} />
                      <Fact label="ID" value={<span className="font-mono text-xs">{item.uid}</span>} />
                    </div>
                  </div>
                </Card>
                <Card title="Playback, Last 30 Days">
                  {played.error ? (
                    <div className="flex flex-col items-start gap-2 text-sm text-muted-foreground">
                      <span>{played.error}</span>
                      <Button size="xs" variant="outline" loading={played.loading} onClick={() => void played.refresh()}>
                        <RefreshCwIcon />
                        Try Again
                      </Button>
                    </div>
                  ) : !played.data ? (
                    <div className="h-24 animate-pulse rounded bg-muted" />
                  ) : played.data.length === 0 ? (
                    <div className="text-sm text-muted-foreground">Nothing watched yet. Stream counts a play within a few minutes of it.</div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      <div className="flex gap-5 text-sm">
                        <span>
                          <span className="font-heading text-lg font-semibold">{Math.round(minutes).toLocaleString()}</span> <span className="text-muted-foreground">minutes</span>
                        </span>
                        <span>
                          <span className="font-heading text-lg font-semibold">{views.toLocaleString()}</span> <span className="text-muted-foreground">plays</span>
                        </span>
                      </div>
                      <PlaybackBars rows={played.data} days={30} />
                    </div>
                  )}
                </Card>
              </div>
            </div>
          </>
        )}
      </ListState>
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title={`Delete ${v?.name ?? "this item"}?`} description="It is removed from Cloudflare Stream. Anything that plays it will break." pending={busy} onConfirm={() => void remove()} />
    </WorkspaceFrame>
  );
}

// ---- analytics across everything ----

const RANGES = [7, 30] as const;

export function MediaAnalyticsPage(): React.ReactElement {
  const { accountId, ws } = useLibraryTarget();
  const onOpenNav = useOpenNav();
  const navigate = useNavigate();
  const [days, setDays] = React.useState<number>(30);
  const listing = useStream(accountId);
  const key = (g: string) => (accountId ? `stream-analytics:${accountId}:all:${g}:${days}` : null);
  const byDay = useRemote<StreamAnalyticsRow[]>(key("day"), () => sg!.library.stream.analytics(accountId, { days, groupBy: "day" }));
  const byVideo = useRemote<StreamAnalyticsRow[]>(key("uid"), () => sg!.library.stream.analytics(accountId, { days, groupBy: "uid" }));
  const byCountry = useRemote<StreamAnalyticsRow[]>(key("country"), () => sg!.library.stream.analytics(accountId, { days, groupBy: "country" }));
  const names = new Map((listing.data?.videos ?? []).map((v) => [v.uid, v]));
  const minutes = byDay.data?.reduce((n, r) => n + r.minutes, 0) ?? 0;
  const views = byDay.data?.reduce((n, r) => n + r.views, 0) ?? 0;
  const top = (byVideo.data ?? []).slice(0, 20);
  const topTotal = top.reduce((n, r) => n + r.minutes, 0) || 1;
  const base = `/w/${ws.id}/library/media`;
  const Rows = ({ q, children }: { q: { data: StreamAnalyticsRow[] | null; error?: string; loading: boolean; refresh: () => Promise<void> }; children: (rows: StreamAnalyticsRow[]) => React.ReactNode }) =>
    q.error ? (
      <div className="flex flex-col items-start gap-2 px-4 py-6 text-sm text-muted-foreground">
        <span>{q.error}</span>
        <Button size="xs" variant="outline" loading={q.loading} onClick={() => void q.refresh()}>
          <RefreshCwIcon />
          Try Again
        </Button>
      </div>
    ) : !q.data ? (
      <div className="m-4 h-24 animate-pulse rounded bg-muted" />
    ) : q.data.length === 0 ? (
      <div className="px-4 py-8 text-center text-sm text-muted-foreground">Nothing in this range.</div>
    ) : (
      <>{children(q.data)}</>
    );
  return (
    <WorkspaceFrame
      icon={<BarChart3Icon />}
      title={<Crumbs items={["Media", "Analytics"]} />}
      onOpenNav={onOpenNav}
      actions={
        <Button size="xs" variant="ghost" onClick={() => navigate(base)}>
          <ArrowLeftIcon />
          All Media
        </Button>
      }
    >
      <div className="flex items-center gap-1 pt-2 pb-1">
        <Button size="sm" variant="ghost" className="gap-2 [&_svg]:mx-0" onClick={() => navigate(base)}>
          <ArrowLeftIcon />
          All Media
        </Button>
        <span className="flex-1 text-xs text-muted-foreground">What Stream delivered, counted at the edge: every player, every embed.</span>
        {RANGES.map((d) => (
          <Button key={d} size="xs" variant={d === days ? "secondary" : "ghost"} onClick={() => setDays(d)}>
            {d} Days
          </Button>
        ))}
      </div>
      <Card padded={false}>
        <div className="grid grid-cols-3 divide-x">
          <StatTile label="Minutes Watched" value={Math.round(minutes).toLocaleString()} hint={`${formatDuration(minutes * 60) || "0:00"} of playback`} />
          <StatTile label="Plays" value={views.toLocaleString()} hint={views ? `${(minutes / views).toFixed(1)} min each` : "sessions Stream counted"} />
          <StatTile label="Items Watched" value={byVideo.data?.length ?? "–"} hint="video and audio" />
        </div>
      </Card>
      <Card title="Minutes per Day">
        <Rows q={byDay}>{(rows) => <PlaybackBars rows={rows} days={days} />}</Rows>
      </Card>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card title="Most Watched" padded={false}>
          <Rows q={byVideo}>
            {() => (
              <ul className="divide-y border-t">
                {top.map((r) => {
                  const v = r.key ? names.get(r.key) : undefined;
                  return (
                    <li key={r.key ?? "?"} className={cn("flex items-center gap-3 px-4 py-2 text-sm", v && "cursor-pointer hover:bg-accent/40")} onClick={v ? () => navigate(`${base}/${v.uid}`) : undefined}>
                      <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted text-muted-foreground [&>svg]:size-4">{v ? <Poster v={v} /> : <PlayIcon className="size-4" />}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{v?.name ?? r.key}</span>
                        <span className="block h-1 w-full overflow-hidden rounded bg-muted">
                          <span className="block h-full rounded bg-primary/70" style={{ width: `${(r.minutes / topTotal) * 100}%` }} />
                        </span>
                      </span>
                      <span className="w-16 text-right tabular-nums">
                        {Math.round(r.minutes).toLocaleString()} <span className="text-xs text-muted-foreground">min</span>
                      </span>
                      <span className="w-16 text-right text-xs tabular-nums text-muted-foreground">{r.views.toLocaleString()} plays</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Rows>
        </Card>
        <Card title="Where" padded={false}>
          <Rows q={byCountry}>
            {(rows) => {
              const total = rows.reduce((n, r) => n + r.minutes, 0) || 1;
              return (
                <ul className="divide-y border-t">
                  {rows.slice(0, 12).map((r) => (
                    <li key={r.key ?? "?"} className="flex items-center gap-3 px-4 py-2 text-sm">
                      <span className="w-10 font-mono text-xs">{r.key ?? "?"}</span>
                      <span className="h-1.5 flex-1 overflow-hidden rounded bg-muted">
                        <span className="block h-full rounded bg-primary/70" style={{ width: `${(r.minutes / total) * 100}%` }} />
                      </span>
                      <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">{Math.round((r.minutes / total) * 100)}%</span>
                    </li>
                  ))}
                </ul>
              );
            }}
          </Rows>
        </Card>
      </div>
    </WorkspaceFrame>
  );
}

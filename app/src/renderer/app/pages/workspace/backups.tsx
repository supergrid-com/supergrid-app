import { BookmarkIcon, CopyIcon, DownloadIcon, HistoryIcon, Loader2Icon, RotateCcwIcon } from "lucide-react";
import * as React from "react";
import type { D1Database } from "../../../../shared/bridge";
import { AlertDialog, AlertDialogClose, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogPopup, AlertDialogTitle } from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "~/components/ui/empty";
import { Input } from "~/components/ui/input";
import { toastManager } from "~/components/ui/toast";
import { Card, Crumbs, StatTile, WorkspaceFrame } from "~/components/workspace/frame";
import { sg } from "~/lib/bridge";
import { readInfo, refreshSchema, useD1Target } from "~/lib/db";
import { clean } from "~/lib/workspaces";
import { useOpenNav, useShell } from "~/shell/context";

// Backups are D1's own: Time Travel keeps every change for thirty days, so any moment in them
// can be restored, and a bookmark names a moment so it can be kept and restored to later. A SQL
// dump is the way to take a copy out of Cloudflare altogether.

const fmtBytes = (n: number) => (n < 1024 ? `${n} B` : n < 1024 ** 2 ? `${(n / 1024).toFixed(1)} KB` : n < 1024 ** 3 ? `${(n / 1024 ** 2).toFixed(1)} MB` : `${(n / 1024 ** 3).toFixed(2)} GB`);
const localInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);

export function Backups(): React.ReactElement {
  const { ws } = useShell();
  const onOpenNav = useOpenNav();
  const target = useD1Target();
  const [info, setInfo] = React.useState<D1Database | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [now, setNow] = React.useState<string | null>(null);
  const [marks, setMarks] = React.useState<{ bookmark: string; at: string; note: string }[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(`sg.db.marks.${ws.id}`) ?? "[]") as { bookmark: string; at: string; note: string }[];
    } catch {
      return [];
    }
  });
  const [when, setWhen] = React.useState(() => localInput(new Date(Date.now() - 3_600_000)));
  const [paste, setPaste] = React.useState("");
  const [confirm, setConfirm] = React.useState<{ bookmark?: string; timestamp?: string; label: string } | null>(null);
  const [busy, setBusy] = React.useState<"mark" | "restore" | "export" | null>(null);

  React.useEffect(() => {
    if (!target) return;
    readInfo(target).then(setInfo).catch((e) => setError(String((e as Error).message ?? e)));
    sg?.d1.bookmark(target).then(setNow).catch(() => setNow(null));
  }, [target]);

  const keepMarks = (next: typeof marks) => {
    setMarks(next);
    try {
      localStorage.setItem(`sg.db.marks.${ws.id}`, JSON.stringify(next));
    } catch {}
  };
  const fail = (e: unknown) => toastManager.add({ title: clean(e), type: "error" });

  const mark = () => {
    if (!target || !sg) return;
    setBusy("mark");
    sg.d1
      .bookmark(target)
      .then((b) => {
        setNow(b);
        keepMarks([{ bookmark: b, at: new Date().toISOString(), note: "" }, ...marks].slice(0, 20));
        toastManager.add({ title: "Bookmarked this moment", type: "success" });
      })
      .catch(fail)
      .finally(() => setBusy(null));
  };

  const restore = () => {
    if (!target || !sg || !confirm) return;
    setBusy("restore");
    sg.d1
      .restore(target, { bookmark: confirm.bookmark, timestamp: confirm.timestamp })
      .then(async () => {
        setConfirm(null);
        toastManager.add({ title: `Restored to ${confirm.label}`, type: "success" });
        await refreshSchema(target);
        setNow(await sg!.d1.bookmark(target).catch(() => null));
      })
      .catch(fail)
      .finally(() => setBusy(null));
  };

  const exportSql = () => {
    if (!target || !sg) return;
    setBusy("export");
    toastManager.add({ title: "Making the dump. It opens in the browser when Cloudflare has written it.", type: "info" });
    sg.d1
      .export(target)
      .then((r) => toastManager.add({ title: `Downloading ${r.filename}`, type: "success" }))
      .catch(fail)
      .finally(() => setBusy(null));
  };

  const title = <Crumbs items={["Database", "Backups"]} />;
  const icon = <HistoryIcon />;
  if (!target) {
    return (
      <WorkspaceFrame icon={icon} title={title} onOpenNav={onOpenNav}>
        <Empty className="py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">{icon}</EmptyMedia>
            <EmptyTitle>No Cloud Database</EmptyTitle>
            <EmptyDescription>Time Travel is a cloud D1 feature. The local dev workspace's database is a file wrangler keeps.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </WorkspaceFrame>
    );
  }

  const whenIso = when ? new Date(when).toISOString() : "";
  const whenLabel = when ? new Date(when).toLocaleString() : "";

  return (
    <WorkspaceFrame icon={icon} title={title} onOpenNav={onOpenNav}>
      {error && <p className="rounded-lg border border-destructive/30 bg-destructive/6 px-3 py-2 text-[13px] text-destructive-foreground">{error}</p>}
      <Card padded={false}>
        <div className="grid grid-cols-2 divide-x sm:grid-cols-4">
          <StatTile label="Database" value={<span className="truncate font-mono text-sm">{info?.name ?? ws.worker}</span>} hint={info ? `made ${new Date(info.createdAt ?? 0).toLocaleDateString()}` : undefined} />
          <StatTile label="Size" value={info ? fmtBytes(info.size) : "…"} />
          <StatTile label="Tables" value={info?.tables ?? "…"} />
          <StatTile label="History Kept" value="30 days" hint="every change, by Time Travel" />
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card
          title="Bookmarks"
          description="A bookmark names the database as it is right now, so it can be restored to later."
          actions={
            <Button size="xs" variant="outline" onClick={mark} disabled={busy !== null}>
              {busy === "mark" ? <Loader2Icon className="animate-spin" /> : <BookmarkIcon />}
              Bookmark Now
            </Button>
          }
        >
          <div className="flex flex-col gap-2">
            {now && (
              <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs">
                <span className="text-muted-foreground">Now</span>
                <code className="min-w-0 flex-1 truncate font-mono">{now}</code>
                <Button size="icon-xs" variant="ghost" aria-label="Copy Bookmark" onClick={() => void navigator.clipboard.writeText(now).then(() => toastManager.add({ title: "Copied", type: "success" }))}>
                  <CopyIcon />
                </Button>
              </div>
            )}
            {marks.length === 0 ? (
              <p className="text-[13px] text-muted-foreground">No bookmarks kept on this Mac yet. Take one before a big change.</p>
            ) : (
              <ul className="flex flex-col">
                {marks.map((m) => (
                  <li key={m.bookmark} className="flex items-center gap-2 py-1.5 text-[13px] not-last:border-b">
                    <span className="shrink-0 tabular-nums text-muted-foreground">{new Date(m.at).toLocaleString()}</span>
                    <code className="min-w-0 flex-1 truncate font-mono text-xs text-foreground/70">{m.bookmark}</code>
                    <Button size="xs" variant="ghost" onClick={() => setConfirm({ bookmark: m.bookmark, label: new Date(m.at).toLocaleString() })} disabled={busy !== null}>
                      <RotateCcwIcon />
                      Restore
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card title="Restore" description="Put the whole database back the way it was at a moment, or at a bookmark pasted from elsewhere.">
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5 text-[13px]">
              <span className="text-muted-foreground">A moment in the last 30 days</span>
              <div className="flex gap-2">
                <Input type="datetime-local" value={when} max={localInput(new Date())} onChange={(e) => setWhen(e.target.value)} className="flex-1" />
                <Button variant="outline" disabled={!when || busy !== null} onClick={() => setConfirm({ timestamp: whenIso, label: whenLabel })}>
                  <RotateCcwIcon />
                  Restore
                </Button>
              </div>
            </label>
            <label className="flex flex-col gap-1.5 text-[13px]">
              <span className="text-muted-foreground">A bookmark</span>
              <div className="flex gap-2">
                <Input value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="00000085-0000000a-00004c5c-…" spellCheck={false} className="flex-1 font-mono text-xs" />
                <Button variant="outline" disabled={!paste.trim() || busy !== null} onClick={() => setConfirm({ bookmark: paste.trim(), label: `bookmark ${paste.trim().slice(0, 17)}…` })}>
                  <RotateCcwIcon />
                  Restore
                </Button>
              </div>
            </label>
          </div>
        </Card>
      </div>

      <Card
        title="Export"
        description="A SQL dump of every table and row, made by D1 and downloaded through the browser."
        actions={
          <Button size="xs" variant="outline" onClick={exportSql} disabled={busy !== null}>
            {busy === "export" ? <Loader2Icon className="animate-spin" /> : <DownloadIcon />}
            Download SQL
          </Button>
        }
      >
        <p className="text-[13px] text-muted-foreground">The dump can be loaded into any SQLite, or into another D1 with wrangler. Cloudflare takes a moment to write it; the download starts on its own.</p>
      </Card>

      <AlertDialog open={confirm !== null} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore the database?</AlertDialogTitle>
            <AlertDialogDescription>
              Every table goes back to {confirm?.label}. Everything written since then is gone from the live database, though Time Travel still has it: bookmark now first if you may want to come back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" />}>Cancel</AlertDialogClose>
            <Button variant="destructive" onClick={restore} disabled={busy !== null}>
              {busy === "restore" && <Loader2Icon className="animate-spin" />}
              Restore
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </WorkspaceFrame>
  );
}

import { CheckIcon, CopyIcon, ExternalLinkIcon, LoaderCircleIcon, LockIcon, RefreshCwIcon, XIcon } from "lucide-react";
import * as React from "react";
import { AlertDialog, AlertDialogClose, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogPopup, AlertDialogTitle } from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { EmptyMedia } from "~/components/ui/empty";
import { toastManager } from "~/components/ui/toast";
import { IconButton } from "~/components/workspace/frame";
import { sg } from "~/lib/bridge";
import { type UploadJob } from "~/lib/library";
import { useSession } from "~/lib/session";
import { useShell } from "~/shell/context";
import { cn } from "~/lib/utils";

// What the Library pages share: where they point (the account and the workspace's bucket), the
// upload tray, the card for a product that isn't turned on yet, and small rows and formatters.

/** The Cloudflare account the organization is on and the workspace's own bucket. */
export function useLibraryTarget(): { accountId: string; ws: ReturnType<typeof useShell>["ws"]; bucket: string; worker: string } {
  const { org } = useSession();
  const { ws } = useShell();
  return { accountId: org?.cloudflare?.accountId ?? "", ws, bucket: `${ws.worker}-files`, worker: ws.worker };
}

export function formatBytes(n: number | null | undefined): string {
  if (n == null) return "";
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}

export function formatDuration(s: number | null | undefined): string {
  if (s == null || !Number.isFinite(s) || s <= 0) return "";
  const total = Math.round(s);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
}

/** "3 minutes ago", "yesterday", "12 Oct". */
export function relative(iso: string | null | undefined): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const diff = Date.now() - t;
  const min = Math.round(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  if (d === 1) return "yesterday";
  if (d < 14) return `${d} days ago`;
  return new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short", year: d > 300 ? "numeric" : undefined });
}

export function absolute(iso: string | null | undefined): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  return Number.isFinite(t) ? new Date(t).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "";
}

export function copyText(text: string, what = "URL"): void {
  void navigator.clipboard?.writeText(text).then(
    () => toastManager.add({ title: `${what} Copied`, type: "success", timeout: 1200 }),
    () => toastManager.add({ title: `Could not copy the ${what.toLowerCase()}`, type: "error" }),
  );
}

export const openExternal = (url: string): void => {
  if (sg) void sg.openExternal(url);
  else window.open(url, "_blank", "noreferrer");
};

/** A URL with its label and a copy button. */
export function UrlRow({ label, url }: { label: string; url: string }): React.ReactElement {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-20 shrink-0 text-muted-foreground">{label}</span>
      <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-2 py-1 font-mono text-xs">{url}</code>
      <IconButton label="Copy" onClick={() => copyText(url)}>
        <CopyIcon />
      </IconButton>
      <IconButton label="Open" onClick={() => openExternal(url)}>
        <ExternalLinkIcon />
      </IconButton>
    </div>
  );
}

/** A block of code with a copy button: an embed snippet. */
export function CodeBlock({ code, what }: { code: string; what: string }): React.ReactElement {
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-3 pe-12 font-mono text-xs leading-relaxed whitespace-pre-wrap break-all">{code}</pre>
      <div className="absolute end-2 top-2">
        <IconButton label={`Copy ${what}`} onClick={() => copyText(code, what)}>
          <CopyIcon />
        </IconButton>
      </div>
    </div>
  );
}

export function Fact({ label, value }: { label: string; value: React.ReactNode }): React.ReactElement | null {
  if (value == null || value === "") return null;
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

/** A label over a control, the way the settings pages lay fields out. */
export function Field({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }): React.ReactElement {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

/** The filter tabs on an index page. */
export function FilterTabs<T extends string>({ tabs, value, onChange }: { tabs: { key: T; label: string; count?: number }[]; value: T; onChange: (key: T) => void }): React.ReactElement {
  return (
    <div className="flex items-center gap-1">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={cn("flex h-7 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-sm transition-colors", value === t.key ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground")}
        >
          {t.label}
          {t.count != null && <span className="text-xs text-muted-foreground tabular-nums">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

/** Uploads in flight and the ones just finished, in a corner card over the page. */
export function UploadTray({ jobs, onClear, onCancel }: { jobs: UploadJob[]; onClear: () => void; onCancel: (id: string) => void }): React.ReactElement | null {
  if (!jobs.length) return null;
  const active = jobs.filter((j) => j.status === "uploading").length;
  return (
    <div className="pointer-events-auto absolute end-4 bottom-4 z-20 w-80 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-lg">
      <div className="flex h-9 items-center gap-2 border-b px-3 text-sm font-medium">
        {active ? <LoaderCircleIcon className="size-3.5 animate-spin text-muted-foreground" /> : <CheckIcon className="size-3.5 text-success-foreground" />}
        {active ? `Uploading ${active} of ${jobs.length}` : `${jobs.length} Uploaded`}
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
              <span className="min-w-0 flex-1 truncate">{j.name}</span>
              <span className="text-muted-foreground tabular-nums">{j.status === "uploading" ? `${Math.round((j.size ? j.loaded / j.size : 0) * 100)}%` : j.status === "done" ? "done" : "failed"}</span>
              {j.status === "uploading" && (
                <IconButton label="Cancel" onClick={() => onCancel(j.id)}>
                  <XIcon />
                </IconButton>
              )}
            </div>
            {j.status === "uploading" && (
              <div className="h-1 overflow-hidden rounded bg-muted">
                <div className="h-full rounded bg-primary transition-[width]" style={{ width: `${(j.size ? j.loaded / j.size : 0) * 100}%` }} />
              </div>
            )}
            {j.error && <div className="truncate text-destructive-foreground">{j.error}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The overlay while files are dragged over a page. */
export function DropOverlay({ show, label }: { show: boolean; label: string }): React.ReactElement | null {
  if (!show) return null;
  return <div className="pointer-events-none absolute inset-2 z-30 flex items-center justify-center rounded-xl border-2 border-dashed border-primary bg-primary/5 text-sm font-medium text-primary">{label}</div>;
}

/**
 * Images or Stream before the account has them: the whole page, centered, with what the product does, what it costs and
 * the dashboard page that turns it on. Nothing else on the page works until then, so this stands in for the list.
 */
export function EnableCard({ product, accountId, onRecheck, checking }: { product: "images" | "stream"; accountId: string; onRecheck: () => void; checking?: boolean }): React.ReactElement {
  const images = product === "images";
  const url = `https://dash.cloudflare.com/${accountId}/${images ? "images" : "stream"}`;
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <EmptyMedia variant="icon" className="size-16 rounded-xl text-active [&_svg:not([class*='size-'])]:size-7">
        <LockIcon />
      </EmptyMedia>
      <div className="flex flex-col items-center gap-2">
        <h2 className="font-heading text-3xl font-semibold leading-tight tracking-tight">{images ? "Turn On Cloudflare Images" : "Turn On Cloudflare Stream"}</h2>
        <p className="max-w-xl text-base font-normal text-pretty text-muted-foreground">
          {images
            ? "Images stores pictures once and resizes them on the URL, so apps ask for the size they need. This account hasn't turned it on yet, so nothing can be uploaded here until it is."
            : "Stream encodes video and audio, plays it anywhere and counts every play. This account has no Stream storage yet, so nothing can be uploaded here until it does."}
        </p>
        <p className="text-sm font-normal text-pretty text-muted-foreground">{images ? "Images is $5 a month per 100,000 images stored." : "Stream is $5 a month per 1,000 minutes stored."}</p>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Button size="lg" onClick={() => openExternal(url)}>
          Turn On in Cloudflare
          <ExternalLinkIcon />
        </Button>
        <Button variant="ghost" loading={checking} onClick={onRecheck} className="text-muted-foreground hover:text-foreground">
          <RefreshCwIcon />
          Check Again
        </Button>
      </div>
    </div>
  );
}

/** "Are you sure" for a delete, in the kit's alert dialog. */
export function ConfirmDialog({ open, onOpenChange, title, description, pending, confirmLabel = "Delete", onConfirm }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; description: string; pending?: boolean; confirmLabel?: string; onConfirm: () => void }): React.ReactElement {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogPopup>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="ghost" />}>Cancel</AlertDialogClose>
          <Button variant="destructive" loading={pending} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogPopup>
    </AlertDialog>
  );
}

/** The loading, error and empty states around a listing. */
export function ListState<T>({ data, error, loading, isEmpty, empty, onRetry, children }: { data: T | null; error?: string; loading: boolean; isEmpty: (d: T) => boolean; empty: React.ReactNode; onRetry: () => void; children: (d: T) => React.ReactNode }): React.ReactElement {
  if (!data && error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="max-w-md text-sm text-muted-foreground">{error}</div>
        <Button size="sm" variant="outline" onClick={onRetry}>
          Try Again
        </Button>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        {loading ? <LoaderCircleIcon className="size-5 animate-spin text-muted-foreground" /> : <span className="text-sm text-muted-foreground">Open this page in the app to read the account.</span>}
      </div>
    );
  }
  if (isEmpty(data)) return <>{empty}</>;
  return <>{children(data)}</>;
}

export function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

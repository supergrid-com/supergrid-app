import { CodeIcon, LoaderCircleIcon, ShieldQuestionIcon, UploadCloudIcon } from "lucide-react";
import * as React from "react";
import type { AgentAnswer, AgentAsk, LocalFile, UploadedItem } from "../../../../shared/bridge";
import { Button } from "~/components/ui/button";
import { sg } from "~/lib/bridge";
import { pickFiles, runUpload, WS_META } from "~/lib/library";
import { useSession } from "~/lib/session";
import type { WorkspaceSummary } from "~/lib/workspaces";
import { cn } from "~/lib/utils";

// A tool's question to the user, in the chat above the composer, while the turn waits on it: an
// approval with a preview of what changes, a file picker that uploads to the library, or the
// switch the desktop to Dev. The answer goes back through the bridge to the tool (lib/agent/provider.tsx).

function Preview({ columns, rows, total }: { columns: string[]; rows: unknown[][]; total?: number }): React.ReactElement {
  return (
    <div className="overflow-hidden rounded-md border">
      <div className="max-h-40 overflow-auto">
        <table className="w-full text-[11px]">
          <thead className="bg-muted/60">
            <tr className="text-left text-muted-foreground">
              {columns.map((c) => (
                <th key={c} className="whitespace-nowrap px-2 py-1 font-medium">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t">
                {r.map((v, j) => (
                  <td key={j} className="max-w-40 truncate px-2 py-1 font-mono" title={v == null ? "" : String(v)}>
                    {v == null ? <span className="text-muted-foreground">null</span> : String(v)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {total !== undefined && total > rows.length && <div className="border-t bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground">and {(total - rows.length).toLocaleString()} more</div>}
    </div>
  );
}

function Shell({ icon, title, tone, children }: { icon: React.ReactNode; title: string; tone: "warning" | "destructive" | "info"; children: React.ReactNode }): React.ReactElement {
  return (
    <div className={cn("flex flex-col gap-2 rounded-xl border bg-background p-3 text-sm text-foreground", tone === "destructive" ? "border-destructive/40" : tone === "info" ? "border-info/40" : "border-warning/50")}>
      <div className="flex items-center gap-2 font-medium">
        <span className={cn("shrink-0", tone === "destructive" ? "text-destructive" : tone === "info" ? "text-info-foreground" : "text-warning-foreground")}>{icon}</span>
        <span className="min-w-0 flex-1 truncate">{title}</span>
      </div>
      {children}
    </div>
  );
}

function Confirm({ ask, respond }: { ask: Extract<AgentAsk, { kind: "confirm" }>; respond: (a: Omit<AgentAnswer, "id">) => void }): React.ReactElement {
  return (
    <Shell icon={<ShieldQuestionIcon className="size-4" />} title={ask.title} tone={ask.danger ? "destructive" : "warning"}>
      {ask.detail && <pre className="max-h-32 overflow-auto rounded-md bg-muted px-2.5 py-2 font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap break-words">{ask.detail}</pre>}
      {ask.preview && ask.preview.rows.length > 0 && <Preview {...ask.preview} />}
      <div className="flex flex-wrap items-center gap-1.5">
        <Button size="xs" variant={ask.danger ? "destructive" : "default"} onClick={() => respond({ ok: true })}>
          {ask.confirmLabel ?? "Allow"}
        </Button>
        <Button size="xs" variant="outline" onClick={() => respond({ ok: false })}>
          Decline
        </Button>
      </div>
    </Shell>
  );
}

const strip = (name: string) => name.replace(/\.[a-z0-9]+$/i, "");

function Upload({ ask, ws, respond }: { ask: Extract<AgentAsk, { kind: "upload" }>; ws: WorkspaceSummary; respond: (a: Omit<AgentAnswer, "id">) => void }): React.ReactElement {
  const { org } = useSession();
  const accountId = org?.cloudflare?.accountId ?? "";
  const [busy, setBusy] = React.useState<{ done: number; total: number } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const upload = async () => {
    const files = await pickFiles(ask.accept, ask.multiple);
    if (!files.length || !sg) return;
    setBusy({ done: 0, total: files.length });
    setError(null);
    const lib = sg.library;
    const uploaded: UploadedItem[] = [];
    const one = async (file: LocalFile): Promise<UploadedItem | null> => {
      if (ask.accept === "image") {
        const img = await runUpload(file, (job) => lib.images.upload(accountId, job, file, { [WS_META]: ws.id, title: strip(file.name) }));
        return img ? { kind: "image", id: img.id, name: strip(file.name), url: img.base ? `${img.base}/public` : null } : null;
      }
      if (ask.accept === "media") {
        const v = await runUpload(file, (job) => lib.stream.upload(accountId, job, file, { name: strip(file.name), meta: { [WS_META]: ws.id } }));
        return v ? { kind: "media", id: v.uid, name: v.name, url: v.hls } : null;
      }
      const key = `${ask.prefix ? `${ask.prefix.replace(/^\/+|\/+$/g, "")}/` : ""}${file.name}`;
      const f = await runUpload(file, (job) => lib.files.upload(accountId, job, `${ws.worker}-files`, file, { key, contentType: file.type ?? undefined }));
      return f ? { kind: "file", id: f.key, name: file.name, url: `${ws.url.replace(/\/$/, "")}/_ws/files/${f.key.split("/").map(encodeURIComponent).join("/")}` } : null;
    };
    for (const file of files) {
      const item = await one(file);
      if (item) uploaded.push(item);
      setBusy((b) => (b ? { ...b, done: b.done + 1 } : b));
    }
    setBusy(null);
    if (!uploaded.length) {
      setError("Nothing uploaded. The Library page says why if the product isn't on yet.");
      return;
    }
    respond({ ok: true, uploaded });
  };

  return (
    <Shell icon={<UploadCloudIcon className="size-4" />} title={ask.title} tone="info">
      <p className="text-xs text-muted-foreground">{ask.accept === "image" ? "Pictures go to Cloudflare Images." : ask.accept === "media" ? "Video and audio go to Cloudflare Stream." : `Files go to the workspace's bucket${ask.prefix ? ` under ${ask.prefix}` : ""}.`}</p>
      {error && <p className="text-xs text-destructive-foreground">{error}</p>}
      <div className="flex flex-wrap items-center gap-1.5">
        <Button size="xs" onClick={() => void upload()} disabled={!!busy || !accountId}>
          {busy ? (
            <>
              <LoaderCircleIcon className="animate-spin" />
              Uploading {busy.done + 1} of {busy.total}…
            </>
          ) : (
            `Choose ${ask.multiple ? "Files" : "a File"}…`
          )}
        </Button>
        <Button size="xs" variant="outline" disabled={!!busy} onClick={() => respond({ ok: false })}>
          Skip
        </Button>
      </div>
    </Shell>
  );
}

function Dev({ ask, respond }: { ask: Extract<AgentAsk, { kind: "dev" }>; respond: (a: Omit<AgentAnswer, "id">) => void }): React.ReactElement {
  return (
    <Shell icon={<CodeIcon className="size-4" />} title={ask.title} tone="info">
      <p className="text-xs leading-relaxed text-muted-foreground">{ask.reason}</p>
      <p className="text-xs leading-relaxed text-muted-foreground">Dev runs this workspace from its repo on this Mac: the dev server serves the screens with local data, Code opens in the rail, and the agent can change table shapes, run SQL by hand, add apps and deploy. Everything still asks before it changes data.</p>
      <div className="flex flex-wrap items-center gap-1.5">
        <Button size="xs" onClick={() => respond({ ok: true })}>
          Switch to Dev
        </Button>
        <Button size="xs" variant="outline" onClick={() => respond({ ok: false })}>
          Stay in Live
        </Button>
      </div>
    </Shell>
  );
}

export function AskCard({ ask, ws, respond }: { ask: AgentAsk; ws: WorkspaceSummary; respond: (a: Omit<AgentAnswer, "id">) => void }): React.ReactElement {
  if (ask.kind === "confirm") return <Confirm ask={ask} respond={respond} />;
  if (ask.kind === "upload") return <Upload ask={ask} ws={ws} respond={respond} />;
  return <Dev ask={ask} respond={respond} />;
}

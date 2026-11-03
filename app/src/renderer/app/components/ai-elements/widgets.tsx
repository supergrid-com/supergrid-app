import { ArrowUpRightIcon, ClapperboardIcon, FileIcon, ImageIcon, PlayIcon, SparklesIcon, StarIcon } from "lucide-react";
import * as React from "react";
import { useNavigate } from "react-router";
import type { AgentWidget, ThemeCard } from "../../../../shared/agent";
import { Bars, formatNumber, Line } from "~/components/charts";
import { formatBytes, formatDuration, openExternal } from "~/components/workspace/library/shared";
import { cn } from "~/lib/utils";

// The cards a tool's result draws in the chat (shared/agent.ts): pictures, media, files, themes,
// rows, a number, a chart, skills, a page the app moved to. Each is small and opens the real thing
// in the app or the browser on a click; the agent's words sit under it.

/** Which workspace the chat is in, for links into the app. */
export const WidgetContext = React.createContext<{ wsId: string }>({ wsId: "" });

function useGo(): (to: string) => void {
  const { wsId } = React.useContext(WidgetContext);
  const navigate = useNavigate();
  return React.useCallback((to: string) => navigate(`/w/${wsId}${to ? `/${to}` : ""}`), [navigate, wsId]);
}

function Frame({ title, meta, children, className }: { title?: React.ReactNode; meta?: React.ReactNode; children: React.ReactNode; className?: string }): React.ReactElement {
  return (
    <div className={cn("min-w-0 overflow-hidden rounded-lg border bg-background/60 text-xs", className)}>
      {(title || meta) && (
        <div className="flex h-8 items-center gap-2 border-b px-2.5">
          <span className="min-w-0 flex-1 truncate font-medium text-foreground">{title}</span>
          {meta && <span className="shrink-0 text-muted-foreground">{meta}</span>}
        </div>
      )}
      {children}
    </div>
  );
}

const more = (shown: number, total: number) => (total > shown ? `${shown} of ${total.toLocaleString()}` : total.toLocaleString());

function Images({ w }: { w: Extract<AgentWidget, { type: "images" }> }): React.ReactElement {
  if (!w.items.length) return <Frame title="Images">{<div className="px-2.5 py-3 text-muted-foreground">No pictures match.</div>}</Frame>;
  return (
    <Frame title="Images" meta={more(w.items.length, w.total)}>
      <ul className="grid grid-cols-3 gap-1.5 p-1.5">
        {w.items.map((i) => (
          <li key={i.id}>
            <button type="button" onClick={() => i.url && openExternal(i.url)} title={i.title} className="group/img flex w-full cursor-pointer flex-col gap-1 rounded-md p-1 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring">
              <span className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded border bg-muted text-muted-foreground">{i.thumb ? <img src={i.thumb} alt="" loading="lazy" className="size-full object-cover" /> : <ImageIcon className="size-5" />}</span>
              <span className="w-full truncate text-[11px] leading-4">{i.title}</span>
            </button>
          </li>
        ))}
      </ul>
    </Frame>
  );
}

function Media({ w }: { w: Extract<AgentWidget, { type: "media" }> }): React.ReactElement {
  const [playing, setPlaying] = React.useState<string | null>(null);
  if (!w.items.length) return <Frame title="Media">{<div className="px-2.5 py-3 text-muted-foreground">No video or audio matches.</div>}</Frame>;
  return (
    <Frame title="Media" meta={more(w.items.length, w.total)}>
      <ul className="flex flex-col">
        {w.items.map((v) => (
          <li key={v.uid} className="border-b last:border-0">
            <button type="button" disabled={!v.embed || !v.ready} onClick={() => setPlaying(playing === v.uid ? null : v.uid)} className="flex h-11 w-full cursor-pointer items-center gap-2.5 px-2.5 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-70">
              <span className="flex h-7 w-11 shrink-0 items-center justify-center overflow-hidden rounded border bg-muted text-muted-foreground">{v.thumb ? <img src={v.thumb} alt="" className="size-full object-cover" /> : <ClapperboardIcon className="size-3.5" />}</span>
              <span className="min-w-0 flex-1 truncate">{v.name}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">{v.ready ? formatDuration(v.duration) : "Processing"}</span>
              <PlayIcon className="size-3.5 shrink-0 text-muted-foreground" />
            </button>
            {playing === v.uid && v.embed && (
              <div className="border-t bg-black">
                <iframe src={`${v.embed}?autoplay=true`} title={v.name} allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;" allowFullScreen className="aspect-video w-full" />
              </div>
            )}
          </li>
        ))}
      </ul>
    </Frame>
  );
}

function Files({ w }: { w: Extract<AgentWidget, { type: "files" }> }): React.ReactElement {
  if (!w.items.length) return <Frame title="Files">{<div className="px-2.5 py-3 text-muted-foreground">No files match.</div>}</Frame>;
  return (
    <Frame title="Files" meta={more(w.items.length, w.total)}>
      <ul className="flex flex-col">
        {w.items.map((f) => (
          <li key={f.key} className="border-b last:border-0">
            <button type="button" onClick={() => openExternal(f.url)} title={f.key} className="flex h-9 w-full cursor-pointer items-center gap-2.5 px-2.5 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring">
              <FileIcon className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate font-mono text-[11.5px]">{f.key}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">{formatBytes(f.size)}</span>
              <ArrowUpRightIcon className="size-3.5 shrink-0 text-muted-foreground" />
            </button>
          </li>
        ))}
      </ul>
    </Frame>
  );
}

function ThemeTile({ t }: { t: ThemeCard }): React.ReactElement {
  const go = useGo();
  const c = t.colors;
  return (
    <button type="button" onClick={() => go(`library/themes/${t.id}`)} className="flex w-full cursor-pointer flex-col gap-2 rounded-md border p-2 text-left outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring">
      <div className="flex h-14 items-end gap-2 rounded px-2.5 pb-2" style={{ background: c.background, color: c.foreground }}>
        {t.logo ? <img src={t.logo} alt="" className="h-5 max-w-20 object-contain" /> : <span className="text-sm font-semibold" style={{ fontFamily: t.fonts.heading }}>Aa</span>}
        <span className="ms-auto flex gap-1">
          {[c.primary, c.secondary, c.accent].map((hex, i) => (
            <span key={i} className="size-4 rounded-full border border-black/10" style={{ background: hex }} title={hex} />
          ))}
        </span>
      </div>
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="min-w-0 flex-1 truncate font-medium text-foreground">{t.name}</span>
        {t.isDefault && <StarIcon className="size-3 shrink-0 fill-current text-warning-foreground" />}
        <span className="shrink-0 text-muted-foreground">{t.mode === "dark" ? "Dark" : "Light"}</span>
      </div>
      <div className="truncate text-muted-foreground">
        {t.fonts.heading} · {t.fonts.body}
      </div>
    </button>
  );
}

function Themes({ w }: { w: Extract<AgentWidget, { type: "themes" }> }): React.ReactElement {
  return (
    <Frame title="Themes" meta={w.items.length > 1 ? w.items.length : undefined}>
      <div className={cn("grid gap-1.5 p-1.5", w.items.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
        {w.items.map((t) => (
          <ThemeTile key={t.id} t={t} />
        ))}
      </div>
    </Frame>
  );
}

const cell = (v: unknown): React.ReactNode => (v === null || v === undefined ? <span className="text-muted-foreground">null</span> : typeof v === "boolean" ? (v ? "true" : "false") : typeof v === "object" ? JSON.stringify(v) : String(v));

function Rows({ w }: { w: Extract<AgentWidget, { type: "rows" }> }): React.ReactElement {
  return (
    <Frame title={w.title} meta={w.total === null ? undefined : more(w.rows.length, w.total)}>
      {w.rows.length ? (
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-[11.5px]">
            <thead className="sticky top-0 bg-muted/60 backdrop-blur">
              <tr className="text-left text-muted-foreground">
                {w.columns.map((c) => (
                  <th key={c} className="whitespace-nowrap px-2.5 py-1.5 font-medium">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {w.rows.map((r, i) => (
                <tr key={i} className="border-t">
                  {r.map((v, j) => (
                    <td key={j} className="max-w-48 truncate px-2.5 py-1 font-mono" title={v == null ? "" : String(v)}>
                      {cell(v)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-2.5 py-3 text-muted-foreground">No rows.</div>
      )}
    </Frame>
  );
}

function Metric({ w }: { w: Extract<AgentWidget, { type: "metric" }> }): React.ReactElement {
  return (
    <Frame>
      <div className="flex flex-col gap-0.5 px-3 py-2.5">
        <span className="truncate text-muted-foreground">{w.label}</span>
        <span className="font-heading text-2xl font-semibold tabular-nums text-foreground">{formatNumber(w.value)}</span>
        {w.hint && <span className="truncate text-muted-foreground">{w.hint}</span>}
      </div>
    </Frame>
  );
}

function Chart({ w }: { w: Extract<AgentWidget, { type: "chart" }> }): React.ReactElement {
  return (
    <Frame title={w.title} meta={w.points.length ? `${w.points.length} ${w.kind === "line" ? "points" : "bars"}` : undefined}>
      <div className="p-2.5">{w.kind === "bar" ? <Bars points={w.points} /> : <Line points={w.points} />}</div>
    </Frame>
  );
}

function Skills({ w }: { w: Extract<AgentWidget, { type: "skills" }> }): React.ReactElement {
  const go = useGo();
  if (!w.items.length) return <Frame title="Skills">{<div className="px-2.5 py-3 text-muted-foreground">No skills match.</div>}</Frame>;
  return (
    <Frame title="Skills" meta={w.items.length > 1 ? w.items.length : undefined}>
      <ul className="flex flex-col">
        {w.items.map((s) => (
          <li key={s.id} className="border-b last:border-0">
            <button type="button" onClick={() => go(`library/skills/${s.id}`)} className="flex w-full cursor-pointer items-start gap-2.5 px-2.5 py-2 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring">
              <SparklesIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate font-medium text-foreground">{s.title}</span>
                {s.excerpt && <span className="line-clamp-2 text-muted-foreground">{s.excerpt}</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Frame>
  );
}

function Navigate({ w }: { w: Extract<AgentWidget, { type: "navigate" }> }): React.ReactElement {
  const go = useGo();
  return (
    <button type="button" onClick={() => go(w.to)} className="inline-flex h-7 w-fit max-w-full cursor-pointer items-center gap-1.5 rounded-full border bg-background/60 px-2.5 text-xs outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring">
      <span className="truncate">Opened {w.label}</span>
      <ArrowUpRightIcon className="size-3.5 shrink-0 text-muted-foreground" />
    </button>
  );
}

export function Widget({ widget }: { widget: AgentWidget }): React.ReactElement {
  switch (widget.type) {
    case "images": return <Images w={widget} />;
    case "media": return <Media w={widget} />;
    case "files": return <Files w={widget} />;
    case "themes": return <Themes w={widget} />;
    case "rows": return <Rows w={widget} />;
    case "metric": return <Metric w={widget} />;
    case "chart": return <Chart w={widget} />;
    case "skills": return <Skills w={widget} />;
    case "navigate": return <Navigate w={widget} />;
    case "note": return <div className="text-xs text-muted-foreground">{widget.text}</div>;
  }
}

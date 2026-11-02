import type { FunnelStep } from "@supergrid/app-kit/rpc";
import * as React from "react";
import { cn } from "~/lib/utils";

// Hand-drawn SVG charts on the theme's tokens, so they match in light and dark without a
// library. The width follows the container; text is drawn at the SVG's own pixels, so it
// stays crisp instead of stretching with a viewBox.

export type Series = { name: string; color: string };
export type SeriesPoint = { date: string; values: number[] };

const PAD = { top: 10, right: 12, bottom: 22, left: 36 };
const HEIGHT = 220;

function useWidth<T extends HTMLElement>(fallback = 600): [React.RefObject<T | null>, number] {
  const ref = React.useRef<T>(null);
  const [w, setW] = React.useState(fallback);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setW(Math.max(120, Math.floor(entry.contentRect.width))));
    ro.observe(el);
    setW(Math.max(120, Math.floor(el.clientWidth)));
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/** A round top for the y axis: 10 → 10, 23 → 25, 140 → 150. */
function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return m * p;
}

const fmtDay = (iso: string, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }): string => new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString(undefined, { ...opts, timeZone: "UTC" });
const fmtN = (n: number): string => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n));

export function SeriesChart({ series, points, label, className }: { series: Series[]; points: SeriesPoint[]; label: string; className?: string }): React.ReactElement {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = React.useState<number | null>(null);
  const plotW = Math.max(10, width - PAD.left - PAD.right);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const max = niceMax(Math.max(0, ...points.flatMap((p) => p.values)));
  const n = points.length;
  const x = (i: number): number => PAD.left + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number): number => PAD.top + plotH - (v / max) * plotH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  // at most ~6 date labels, evenly spread, always the first and last
  const every = Math.max(1, Math.ceil(n / 6));
  const xLabels = points.map((p, i) => ({ i, text: fmtDay(p.date) })).filter((l) => l.i % every === 0 || l.i === n - 1);
  const paths = series.map((_, si) => points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.values[si] ?? 0).toFixed(1)}`).join(" "));
  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    if (n === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const i = n <= 1 ? 0 : Math.round((px / rect.width) * (n - 1));
    setHover(Math.min(n - 1, Math.max(0, i)));
  };
  const h = hover != null ? points[hover] : null;
  const total = points.reduce((s, p) => s + p.values.reduce((a, b) => a + b, 0), 0);
  const tipLeft = h ? Math.min(Math.max(x(hover!) - 70, 0), Math.max(0, width - 150)) : 0;
  return (
    <div ref={ref} className={cn("relative w-full", className)}>
      <svg width={width} height={HEIGHT} role="img" aria-label={`${label}: ${total.toLocaleString()} over ${n} days`} className="block overflow-visible">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={PAD.left + plotW} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeDasharray={t === 0 ? undefined : "2 3"} />
            <text x={PAD.left - 6} y={y(t)} dy="0.35em" textAnchor="end" fontSize={11} fill="var(--muted-foreground)">
              {fmtN(t)}
            </text>
          </g>
        ))}
        {xLabels.map((l) => (
          <text key={l.i} x={x(l.i)} y={HEIGHT - 6} textAnchor={l.i === 0 ? "start" : l.i === n - 1 ? "end" : "middle"} fontSize={11} fill="var(--muted-foreground)">
            {l.text}
          </text>
        ))}
        {series.map((s, si) => (
          <path key={s.name} d={paths[si]} fill="none" stroke={s.color} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {h && (
          <g>
            <line x1={x(hover!)} x2={x(hover!)} y1={PAD.top} y2={PAD.top + plotH} stroke="var(--border)" />
            {series.map((s, si) => (
              <circle key={s.name} cx={x(hover!)} cy={y(h.values[si] ?? 0)} r={3.5} fill="var(--background)" stroke={s.color} strokeWidth={2} />
            ))}
          </g>
        )}
        <rect x={PAD.left} y={PAD.top} width={plotW} height={plotH} fill="transparent" onPointerMove={onMove} onPointerLeave={() => setHover(null)} />
      </svg>
      {h && (
        <div className="pointer-events-none absolute top-1 z-10 flex min-w-36 flex-col gap-1 rounded-lg border bg-popover px-2.5 py-2 text-xs text-popover-foreground shadow-md" style={{ left: tipLeft }}>
          <div className="font-medium">{fmtDay(h.date, { weekday: "short", month: "short", day: "numeric" })}</div>
          {series.map((s, si) => (
            <div key={s.name} className="flex items-center gap-2">
              <span className="size-2 shrink-0 rounded-full" style={{ background: s.color }} />
              <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground">{s.name}</span>
              <span className="tabular-nums">{(h.values[si] ?? 0).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
      <table className="sr-only">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th>Day</th>
            {series.map((s) => (
              <th key={s.name}>{s.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.date}>
              <td>{p.date}</td>
              {p.values.map((v, i) => (
                <td key={i}>{v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Colours for up to five series, in token order. */
export const chartColor = (i: number): string => `var(--chart-${(i % 5) + 1})`;

// The funnel: one bar per step, scaled to the first, with the count and the share of the step before.
export function FunnelSteps({ steps, className }: { steps: FunnelStep[]; className?: string }): React.ReactElement {
  const max = Math.max(1, ...steps.map((s) => s.count));
  const pct = (rate: number): string => `${Math.round((rate <= 1 ? rate * 100 : rate) * 10) / 10}%`;
  return (
    <ol className={cn("flex flex-col gap-2.5", className)} aria-label="Funnel">
      {steps.map((s, i) => (
        <li key={`${s.event}:${i}`} className="grid grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-x-2 gap-y-1 text-xs">
          <span className="text-muted-foreground tabular-nums">{i + 1}</span>
          <div className="flex items-center justify-between gap-3">
            <span className="truncate font-mono">{s.event}</span>
            <span className="shrink-0 tabular-nums">
              <span className="font-medium">{s.count.toLocaleString()}</span>
              {i > 0 && <span className="ms-2 text-muted-foreground">{pct(s.rate)} of previous</span>}
            </span>
          </div>
          <span />
          <div className="h-5 w-full overflow-hidden rounded-md bg-muted">
            <div className="h-full rounded-md bg-chart-1 transition-[width] duration-300" style={{ width: `${(s.count / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

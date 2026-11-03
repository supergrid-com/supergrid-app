import type * as React from "react";

// Small single-series charts, drawn as plain markup in the theme's own colors: one accent hue, no
// legend, a title per point for the hover. Reports (workflows/reports.tsx) and the agent's cards
// (ai-elements/widgets.tsx) draw the same ones.

export type Point = { key: string; value: number };

export const formatNumber = (n: number): string => (Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, { maximumFractionDigits: 2 }));

// A horizontal bar per key: the label in text ink, a thin bar in the one accent hue with a rounded
// data end, the value after it. One series, so no legend; the hover title names the pair.
export function Bars({ points }: { points: Point[] }): React.ReactElement {
  if (!points.length) return <div className="py-4 text-center text-sm text-muted-foreground">Nothing to chart</div>;
  const max = Math.max(1, ...points.map((p) => p.value));
  return (
    <ul className="flex flex-col gap-1.5">
      {points.map((p) => (
        <li key={p.key} className="flex items-center gap-2 text-xs" title={`${p.key || "(empty)"}: ${formatNumber(p.value)}`}>
          <span className="w-28 shrink-0 truncate text-end text-muted-foreground">{p.key || "(empty)"}</span>
          <span className="flex h-3 flex-1 items-center">
            <span className="h-full rounded-e-[4px] bg-primary" style={{ width: `${Math.max(1, (p.value / max) * 100)}%` }} />
          </span>
          <span className="w-14 shrink-0 tabular-nums">{formatNumber(p.value)}</span>
        </li>
      ))}
    </ul>
  );
}

// One series by day: a 2px line in the accent hue, three recessive gridlines, the ends labelled,
// and a marker with a title per point for the hover.
export function Line({ points }: { points: Point[] }): React.ReactElement {
  if (!points.length) return <div className="py-4 text-center text-sm text-muted-foreground">Nothing to chart</div>;
  const W = 900, H = 220, L = 44, R = 12, T = 12, B = 28;
  const max = Math.max(1, ...points.map((p) => p.value));
  const x = (i: number) => (points.length === 1 ? (L + W - R) / 2 : L + (i / (points.length - 1)) * (W - L - R));
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const grid = [0, 0.5, 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${points.length} points, up to ${formatNumber(max)}`}>
      {grid.map((g) => (
        <g key={g}>
          <line x1={L} x2={W - R} y1={y(max * g)} y2={y(max * g)} stroke="var(--border)" strokeWidth={1} />
          <text x={L - 6} y={y(max * g) + 3.5} textAnchor="end" fontSize={10} fill="var(--muted-foreground)">
            {formatNumber(max * g)}
          </text>
        </g>
      ))}
      <path d={d} fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <circle key={p.key} cx={x(i)} cy={y(p.value)} r={3.5} fill="var(--primary)" stroke="var(--background)" strokeWidth={2}>
          <title>{`${p.key}: ${formatNumber(p.value)}`}</title>
        </circle>
      ))}
      <text x={L} y={H - 8} fontSize={10} fill="var(--muted-foreground)">
        {points[0]!.key}
      </text>
      {points.length > 1 && (
        <text x={W - R} y={H - 8} textAnchor="end" fontSize={10} fill="var(--muted-foreground)">
          {points[points.length - 1]!.key}
        </text>
      )}
    </svg>
  );
}

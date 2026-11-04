import * as React from "react";
import { C, FONT, MONO } from "./kit";
import { tint } from "./shell";

// The app's data pieces, drawn the way Attio draws them: dense but airy tables with hairline row
// dividers and muted column headers, two-letter avatars on soft coloured circles, right-aligned
// numbers, stat tiles with a delta, and a small area chart in SVG. Nothing here knows the time; the
// pages pass in what to show.

// A few soft colours for avatars, picked by the name so the same person always gets the same one.
const AVATAR = ["#7c8cf8", "#34d399", "#fbbf24", "#f472b6", "#22d3ee", "#fb923c", "#a78bfa"];

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1]![0] ?? "" : parts[0]?.[1] ?? "")).toUpperCase();
}

/** Two letters on a soft coloured circle. */
export function Avatar({ name, size = 24, style }: { name: string; size?: number; style?: React.CSSProperties }): React.ReactElement {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) & 0xffff;
  const color = AVATAR[h % AVATAR.length]!;
  return (
    <span style={{ width: size, height: size, borderRadius: 999, background: tint(color, 18), color, display: "inline-grid", placeItems: "center", fontSize: size * 0.42, letterSpacing: "0.02em", flexShrink: 0, fontFamily: FONT, ...style }}>{initials(name)}</span>
  );
}

/** A name with its avatar beside it. */
export function Person({ name, size = 22, muted }: { name: string; size?: number; muted?: boolean }): React.ReactElement {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: muted ? C.muted : C.fg, whiteSpace: "nowrap" }}>
      <Avatar name={name} size={size} />
      {name}
    </span>
  );
}

export type Col = { label: React.ReactNode; width?: number | string; align?: "left" | "right"; mono?: boolean };
export type Row = { key: string; cells: React.ReactNode[]; selected?: number; hover?: number; lit?: number; style?: React.CSSProperties; height?: number };

/** A data grid: a muted header row, hairline dividers, a visible selected row. Column widths are fixed
 *  except the first, which takes what is left. Right-aligned columns are for numbers. */
export function Table({ cols, rows, rowHeight = 42, header = true, style, children }: { cols: Col[]; rows: Row[]; rowHeight?: number; header?: boolean; style?: React.CSSProperties; children?: React.ReactNode }): React.ReactElement {
  const cell = (c: Col, i: number): React.CSSProperties => ({ flex: c.width === undefined ? 1 : undefined, width: c.width, minWidth: 0, textAlign: c.align ?? "left", paddingRight: i < cols.length - 1 ? 16 : 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: c.mono ? MONO : undefined, fontSize: c.mono ? 13 : undefined });
  return (
    <div style={{ fontSize: 14, color: C.fg, ...style }}>
      {header ? (
        <div style={{ display: "flex", alignItems: "center", height: 34, borderBottom: `1px solid ${C.line}`, fontSize: 12.5, color: C.dim, letterSpacing: "0.01em" }}>
          {cols.map((c, i) => (
            <span key={i} style={{ ...cell(c, i), fontFamily: undefined, fontSize: undefined }}>{c.label}</span>
          ))}
        </div>
      ) : null}
      {rows.map((r) => {
        const sel = r.selected ?? 0;
        const hov = r.hover ?? 0;
        const lit = r.lit ?? 0;
        const bg = lit > 0 ? tint(C.meta, lit * 12) : sel > 0 ? tint(C.accent, sel * 10) : hov > 0 ? tint(C.strong, hov * 4) : undefined;
        return (
          <div key={r.key} style={{ display: "flex", alignItems: "center", height: r.height ?? rowHeight, borderBottom: `1px solid ${C.lineSoft}`, background: bg, margin: bg ? "0 -12px" : undefined, padding: bg ? "0 12px" : undefined, borderRadius: bg ? 6 : undefined, ...r.style }}>
            {r.cells.map((x, i) => (
              <span key={i} style={cell(cols[i]!, i)}>{x}</span>
            ))}
          </div>
        );
      })}
      {children}
    </div>
  );
}

/** A number with its change since last month. */
export function Stat({ label, value, delta, k = 1, style }: { label: string; value: React.ReactNode; delta?: string; k?: number; style?: React.CSSProperties }): React.ReactElement {
  const down = delta?.startsWith("-");
  return (
    <div style={{ padding: "14px 16px", borderRadius: 10, border: `1px solid ${C.lineSoft}`, background: C.fill, display: "flex", flexDirection: "column", gap: 6, opacity: k, transform: `translateY(${(1 - k) * 8}px)`, ...style }}>
      <div style={{ fontSize: 13, color: C.muted }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span style={{ fontSize: 26, color: C.strong, letterSpacing: "0.01em", lineHeight: 1 }}>{value}</span>
        {delta ? <span style={{ fontSize: 12.5, color: down ? C.danger : C.success, padding: "2px 7px", borderRadius: 999, background: down ? tint(C.danger, 12) : C.successSoft }}>{delta}</span> : null}
      </div>
    </div>
  );
}

/** A small area chart: `values` left to right, filled under the line in the accent, with `labels` along the bottom.
 *  `k` draws it from the left. */
export function AreaChart({ values, labels = [], k = 1, color = C.accent, height = 140, style }: { values: number[]; labels?: string[]; k?: number; color?: string; height?: number; style?: React.CSSProperties }): React.ReactElement {
  const id = React.useId();
  const W = 1000;
  const H = 100;
  const max = Math.max(...values) * 1.08;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * W, H - (v / max) * H] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${W} ${H} L0 ${H} Z`;
  return (
    <div style={{ position: "relative", ...style }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" width="100%" height={height} style={{ display: "block", overflow: "visible" }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity={0.28} />
            <stop offset="1" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
          <clipPath id={`${id}c`}>
            <rect x="0" y="-10" width={W * k} height={H + 20} />
          </clipPath>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke={C.lineSoft} strokeWidth="1" vectorEffect="non-scaling-stroke" />
        ))}
        <g clipPath={`url(#${id}c)`}>
          <path d={area} fill={`url(#${id})`} />
          <path d={line} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        </g>
      </svg>
      {k >= 1 ? <div style={{ position: "absolute", left: `${((values.length - 1) / (values.length - 1)) * 100}%`, top: pts[pts.length - 1]![1] * (height / H) - 4, width: 8, height: 8, marginLeft: -4, borderRadius: 99, background: color, boxShadow: `0 0 0 3px ${tint(color, 25)}` }} /> : null}
      {labels.length ? (
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 12, color: C.dim }}>
          {labels.map((l) => (
            <span key={l}>{l}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Bars side by side, the simplest chart, for a breakdown. */
export function Bars({ items, k = 1, color = C.accent }: { items: [string, number][]; k?: number; color?: string }): React.ReactElement {
  const max = Math.max(...items.map((x) => x[1]));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
      {items.map(([label, v]) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 84, color: C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
          <div style={{ flex: 1, height: 6, borderRadius: 3, background: C.fill }}>
            <div style={{ width: `${(v / max) * 100 * k}%`, height: "100%", borderRadius: 3, background: color }} />
          </div>
          <span style={{ width: 44, textAlign: "right", color: C.fg, fontVariantNumeric: "tabular-nums" }}>{v.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

/** A section's title with its count, and the small action at the end. */
export function SectionHead({ title, count, action, icon: Icon, lit = 0, style }: { title: string; count?: React.ReactNode; action?: React.ReactNode; icon?: React.ComponentType<{ style?: React.CSSProperties }>; lit?: number; style?: React.CSSProperties }): React.ReactElement {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, height: 24, marginBottom: 12, ...style }}>
      {Icon ? <Icon style={{ width: 16, height: 16, color: lit > 0.4 ? C.accent : C.muted }} /> : null}
      <span style={{ fontSize: 15, color: C.strong }}>{title}</span>
      {count !== undefined ? <span style={{ fontSize: 12.5, color: C.dim, padding: "1px 7px", borderRadius: 999, background: C.fill }}>{count}</span> : null}
      <div style={{ flex: 1 }} />
      {action ? <span style={{ fontSize: 13, color: C.muted }}>{action}</span> : null}
    </div>
  );
}

/** A tile on the dashboard, lit in the accent as the voice names it. */
export function Tile({ children, lit = 0, style, pad = 18 }: { children: React.ReactNode; lit?: number; style?: React.CSSProperties; pad?: number }): React.ReactElement {
  return (
    <div style={{ borderRadius: 12, border: `1px solid ${lit > 0.02 ? tint(C.accent, 14 + lit * 50) : C.line}`, background: C.card, padding: pad, display: "flex", flexDirection: "column", minHeight: 0, boxShadow: lit > 0.02 ? `0 0 ${30 * lit}px ${tint(C.accent, lit * 18)}` : undefined, ...style }}>{children}</div>
  );
}

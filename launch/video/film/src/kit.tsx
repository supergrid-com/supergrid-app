import * as React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { FPS } from "./timeline";

// The film's kit, after the sales page (launch/site): white ground, near-black type set in Cal Sans
// at medium weight with a little air between the letters, two-tone headlines (the statement in ink,
// the rest in grey that fills in to rose as it's said, like the site's scroll fill) and the
// four-colour mark. The dark card, the glow, the
// dots and the blueprint live in look.tsx. The product keeps its own dark Pitch theme (C, after
// app/src/renderer/app/lib/theme.ts preset "pitch"). Muse, Meta's model, gets its own blue so every
// moment it's on screen reads as Muse. Every frame is a pure function of the time, read from useT()
// in seconds from the start of the film.

/** The film's page. */
export const L = {
  bg: "#ffffff",
  soft: "#f5f5f7",
  softer: "#fafafa",
  ink: "#1d1d1f",
  ink2: "#424245",
  muted: "#6e6e73",
  faint: "#a1a1a6",
  line: "rgb(0 0 0 / 8%)",
  accent: "#E8614A",
  rose: "#f33869",
  accentSoft: "rgb(232 97 74 / 10%)",
  green: "#1f8f4e",
  greenSoft: "rgb(52 199 89 / 12%)",
  amber: "#b25e00",
  amberSoft: "rgb(255 149 0 / 12%)",
  red: "#d70015",
  redSoft: "rgb(255 59 48 / 10%)",
  shadow: "0 2px 6px rgb(0 0 0 / 4%), 0 24px 60px rgb(0 0 0 / 8%)",
};

/** Muse, by Meta. */
export const META = { blue: "#0064E0", sky: "#0082FB", soft: "rgb(0 100 224 / 9%)" };

/** The app's own dark theme, Midnight: a blue-black ground with a periwinkle accent, every token from
 *  app/src/renderer/app/lib/theme.ts (background #13151c, contrast 35, accent #7c8cf8). `bg`, `panel`
 *  and `raised` are the admin layer (rail, sub nav, chat); `page` and `card` the page inside it. */
export const C = {
  bg: "#1b1d24",
  panel: "#16171d",
  page: "#13151c",
  card: "#1a1c23",
  raised: "#2d2f36",
  line: "rgb(237 237 237 / 9%)",
  lineSoft: "rgb(237 237 237 / 5%)",
  hover: "rgb(237 237 237 / 4%)",
  active: "rgb(237 237 237 / 7%)",
  fill: "rgb(236 236 237 / 5%)",
  fg: "#d5d6d7",
  strong: "#e6e6e7",
  muted: "#8f8f93",
  dim: "#76777c",
  accent: "#7c8cf8",
  rose: "#f33869",
  accentSoft: "rgb(124 140 248 / 16%)",
  success: "#34d399",
  successSoft: "rgb(52 211 153 / 14%)",
  warning: "#fbbf24",
  danger: "#f87171",
  meta: "#5b9dff",
  metaSoft: "rgb(59 140 255 / 16%)",
};

export const FONT = "'Cal Sans', ui-sans-serif, system-ui, sans-serif";
export const MONO = "'Geist Mono', ui-monospace, monospace";

/** Seconds since the film started. */
export function useT(): number {
  return useCurrentFrame() / FPS;
}

const out = Easing.bezier(0.22, 1, 0.36, 1);
const inOut = Easing.bezier(0.65, 0, 0.35, 1);

/** 0 → 1 between `a` and `a + dur` seconds, eased out. */
export function prog(t: number, a: number, dur = 0.8, ease: "out" | "inOut" | "linear" = "out"): number {
  return interpolate(t, [a, a + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease === "out" ? out : ease === "inOut" ? inOut : (x) => x,
  });
}

/** Keyframes with clamping. */
export function lerp(t: number, input: number[], output: number[], ease: "out" | "inOut" | "linear" = "inOut"): number {
  return interpolate(t, input, output, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease === "out" ? out : ease === "inOut" ? inOut : (x) => x,
  });
}

/** Slides its children up and fades them in quickly at `at`, and up and out at `outAt` when given. No blur. */
export function Appear({ at, outAt, y = 28, x = 0, scale = 1, dur = 0.55, outDur = 0.35, style, children, className }: { at: number; outAt?: number; y?: number; x?: number; scale?: number; dur?: number; outDur?: number; style?: React.CSSProperties; children: React.ReactNode; className?: string }): React.ReactElement | null {
  const t = useT();
  const p = prog(t, at, dur);
  const q = outAt === undefined ? 0 : prog(t, outAt, outDur, "inOut");
  if (p <= 0 || q >= 1) return null;
  return (
    <div className={className} style={{ opacity: p * (1 - q), transform: `translate(${x * (1 - p)}px, ${y * (1 - p) - 14 * q}px) scale(${scale + (1 - scale) * p})`, ...style }}>
      {children}
    </div>
  );
}

/** Shows each of `items` from its `at` until the next one's, the old one drifting up and out as the new one rises in. */
export function Swap({ items, end, style, y = 26 }: { items: { at: number; node: React.ReactNode }[]; end?: number; style?: React.CSSProperties; y?: number }): React.ReactElement {
  return (
    <>
      {items.map((it, i) => {
        const next = items[i + 1]?.at ?? end;
        // the old one is gone just as the new one starts, so two lines never sit on top of each other
        return (
          <Appear key={i} at={it.at} outAt={next === undefined ? undefined : next - 0.32} outDur={0.32} y={y} dur={0.55} style={{ position: "absolute", inset: 0, ...style }}>
            {it.node}
          </Appear>
        );
      })}
    </>
  );
}

/** Types `text` out from `at`, `cps` characters a second, with a caret while typing. */
export function Typed({ text, at, cps = 28, caret = true, color = L.accent, style }: { text: string; at: number; cps?: number; caret?: boolean; color?: string; style?: React.CSSProperties }): React.ReactElement {
  const t = useT();
  const n = Math.max(0, Math.min(text.length, Math.floor((t - at) * cps)));
  const typing = t >= at && n < text.length;
  const blink = Math.floor(t * 2) % 2 === 0;
  return (
    <span style={style}>
      {text.slice(0, n)}
      {caret && (typing || (t >= at && t < at + text.length / cps + 0.8 && blink)) ? <span style={{ display: "inline-block", width: "0.07em", height: "1.05em", marginLeft: 2, verticalAlign: "-0.15em", background: color }} /> : null}
    </span>
  );
}

// The mark's four diamonds, each with its hole, in the site's colours: cyan on top, orange on the
// right, magenta at the bottom, violet on the left.
const DIAMONDS = [
  { color: "#26d9f0", origin: "50% 23%", d: "M4.67129 3.14634C4.47603 3.34161 4.47603 3.65819 4.67129 3.85345L7.14616 6.32833C7.34142 6.52359 7.65801 6.52359 7.85327 6.32833L10.3281 3.85345C10.5234 3.65819 10.5234 3.34161 10.3281 3.14634L7.85327 0.671471C7.65801 0.476209 7.34142 0.476209 7.14616 0.671471L4.67129 3.14634ZM7.49971 5.26766L5.73195 3.4999L7.49971 1.73213L9.26748 3.4999L7.49971 5.26766Z" },
  { color: "#ff5a1f", origin: "77% 50%", d: "M8.67129 7.14634C8.47603 7.34161 8.47603 7.65819 8.67129 7.85345L11.1462 10.3283C11.3414 10.5236 11.658 10.5236 11.8533 10.3283L14.3281 7.85345C14.5234 7.65819 14.5234 7.34161 14.3281 7.14634L11.8533 4.67147C11.658 4.47621 11.3414 4.47621 11.1462 4.67147L8.67129 7.14634ZM11.4997 9.26766L9.73195 7.4999L11.4997 5.73213L13.2675 7.4999L11.4997 9.26766Z" },
  { color: "#ec1480", origin: "50% 77%", d: "M4.67129 11.8535C4.47603 11.6582 4.47603 11.3416 4.67129 11.1463L7.14616 8.67147C7.34142 8.47621 7.65801 8.47621 7.85327 8.67147L10.3281 11.1463C10.5234 11.3416 10.5234 11.6582 10.3281 11.8535L7.85327 14.3283C7.65801 14.5236 7.34142 14.5236 7.14616 14.3283L4.67129 11.8535ZM5.73195 11.4999L7.49971 13.2677L9.26748 11.4999L7.49971 9.73213L5.73195 11.4999Z" },
  { color: "#9b3dff", origin: "23% 50%", d: "M0.671288 7.14649C0.476026 7.34175 0.476026 7.65834 0.671288 7.8536L3.14616 10.3285C3.34142 10.5237 3.65801 10.5237 3.85327 10.3285L6.32814 7.8536C6.5234 7.65834 6.5234 7.34175 6.32814 7.14649L3.85327 4.67162C3.65801 4.47636 3.34142 4.47636 3.14616 4.67162L0.671288 7.14649ZM3.49972 9.26781L1.73195 7.50005L3.49972 5.73228L5.26748 7.50005L3.49972 9.26781Z" },
];

/** The SuperGrid mark: four diamonds on a grid, each its own colour, or all in `color` when given.
 *  `build` (0 to 1 for each diamond) settles them in one at a time. */
export function Mark({ size = 64, color, build, style }: { size?: number; color?: string; build?: number[]; style?: React.CSSProperties }): React.ReactElement {
  return (
    <svg width={size} height={size} viewBox="0 0 15 15" fill="none" style={{ overflow: "visible", ...style }}>
      {DIAMONDS.map((p, i) => {
        const k = build ? (build[i] ?? 1) : 1;
        if (k <= 0) return null;
        return <path key={p.color} d={p.d} fill={color ?? p.color} fillRule="evenodd" clipRule="evenodd" opacity={k} style={k < 1 ? { transformBox: "view-box", transformOrigin: p.origin, transform: `scale(${0.3 + 0.7 * k}) rotate(${(1 - k) * -90}deg)` } : undefined} />;
      })}
    </svg>
  );
}

// The infinity loop, as a path in a 100 × 50 box.
const LOOP = (() => {
  const pts: string[] = [];
  for (let i = 0; i <= 96; i++) {
    const a = (i / 96) * Math.PI * 2;
    const d = 1 + Math.sin(a) ** 2;
    pts.push(`${(50 + (42 * Math.cos(a)) / d).toFixed(2)} ${(25 + (42 * Math.sin(a) * Math.cos(a)) / d).toFixed(2)}`);
  }
  return `M${pts.join(" L")}Z`;
})();

/** Muse's sign: an infinity loop in Meta blue. */
export function MuseGlyph({ size = 40, style }: { size?: number; style?: React.CSSProperties }): React.ReactElement {
  const id = React.useId();
  return (
    <svg width={size} height={size / 2} viewBox="0 0 100 50" style={{ flexShrink: 0, ...style }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={META.blue} />
          <stop offset="1" stopColor={META.sky} />
        </linearGradient>
      </defs>
      <path d={LOOP} fill="none" stroke={`url(#${id})`} strokeWidth={9} strokeLinejoin="round" />
    </svg>
  );
}

/** "Muse Code", "Muse Image" and so on, with the loop and, when asked, "by Meta". */
export function Muse({ product, size = 32, byMeta = false, dark = false, style }: { product?: string; size?: number; byMeta?: boolean; dark?: boolean; style?: React.CSSProperties }): React.ReactElement {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: size * 0.32, whiteSpace: "nowrap", color: dark ? "#fff" : L.ink, ...style }}>
      <MuseGlyph size={size * 1.35} />
      <span style={{ fontSize: size, letterSpacing: "0.02em" }}>Muse{product ? ` ${product}` : ""}</span>
      {byMeta ? <span style={{ fontSize: size * 0.62, color: dark ? C.muted : L.muted, marginLeft: size * 0.08 }}>by Meta</span> : null}
    </span>
  );
}

/** A small rounded label on the white page. */
export function Chip({ children, tone = "neutral", style }: { children: React.ReactNode; tone?: "neutral" | "accent" | "success" | "warning" | "danger" | "meta"; style?: React.CSSProperties }): React.ReactElement {
  const tones = {
    neutral: { bg: L.soft, fg: L.ink2 },
    accent: { bg: L.accentSoft, fg: "#c94a34" },
    success: { bg: L.greenSoft, fg: L.green },
    warning: { bg: L.amberSoft, fg: L.amber },
    danger: { bg: L.redSoft, fg: L.red },
    meta: { bg: META.soft, fg: META.blue },
  }[tone];
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "8px 18px", borderRadius: 999, background: tones.bg, color: tones.fg, fontSize: 24, lineHeight: 1.2, letterSpacing: "0.02em", fontWeight: 500, whiteSpace: "nowrap", ...style }}>{children}</span>;
}

/** The big line a beat leads with, in ink, with `rest` run on after it in grey, the site's two-tone
 *  headline. No full stops, ever. */
export function Title({ children, rest, size = 104, style, color, dark = false }: { children: React.ReactNode; rest?: React.ReactNode; size?: number; style?: React.CSSProperties; color?: string; dark?: boolean }): React.ReactElement {
  return (
    <div className="balance" style={{ fontFamily: FONT, fontSize: size, lineHeight: 1.06, letterSpacing: "0.02em", fontWeight: 500, color: color ?? (dark ? "#fff" : L.ink), textAlign: "center", ...style }}>
      {children}
      {rest ? <span style={{ color: dark ? "rgb(255 255 255 / 45%)" : L.faint }}> {rest}</span> : null}
    </div>
  );
}

/** The quieter line under a title. Pretty-wrapped so it never strands a word. */
export function Sub({ children, size = 38, style, dark = false }: { children: React.ReactNode; size?: number; style?: React.CSSProperties; dark?: boolean }): React.ReactElement {
  return <div className="pretty" style={{ fontFamily: FONT, fontSize: size, lineHeight: 1.35, letterSpacing: "0.025em", color: dark ? "rgb(255 255 255 / 68%)" : L.muted, fontWeight: 400, textAlign: "center", ...style }}>{children}</div>;
}

/** A section's small lead-in, in the blueprint's mono. */
export function Eyebrow({ children, dark = false, color, size = 20, style }: { children: React.ReactNode; dark?: boolean; color?: string; size?: number; style?: React.CSSProperties }): React.ReactElement {
  return <div style={{ fontFamily: MONO, fontSize: size, letterSpacing: "0.22em", textTransform: "uppercase", color: color ?? (dark ? "rgb(255 255 255 / 55%)" : L.accent), textAlign: "center", ...style }}>{children}</div>;
}

/** The grey half of a two-tone headline filling in to rose a word at a time, from the first word at
 *  `from` to the last at `to`. On the site it runs on the scroll; here it runs on the voice. */
export function Fill({ text, from, to, base = L.faint }: { text: string; from: number; to: number; base?: string }): React.ReactElement {
  const t = useT();
  const words = text.split(" ");
  return (
    <>
      {words.map((w, i) => {
        const k = prog(t, from + ((to - from) * i) / Math.max(1, words.length - 1), 0.4, "inOut");
        return (
          <React.Fragment key={i}>
            {i ? " " : null}
            <span style={{ color: `color-mix(in srgb, ${L.rose} ${(k * 100).toFixed(1)}%, ${base})` }}>{w}</span>
          </React.Fragment>
        );
      })}
    </>
  );
}

/** A line that rises in a piece at a time, `step` apart from `at`, or each at its own time in `ats`. */
export function Rise({ words, at = 0, step = 0.08, ats }: { words: React.ReactNode[]; at?: number; step?: number; ats?: number[] }): React.ReactElement {
  const t = useT();
  return (
    <>
      {words.map((w, i) => {
        const p = prog(t, ats?.[i] ?? at + i * step, 0.5);
        return (
          <React.Fragment key={i}>
            {i ? " " : null}
            <span style={{ display: "inline-block", opacity: p, transform: `translateY(${(1 - p) * 0.3}em)` }}>{w}</span>
          </React.Fragment>
        );
      })}
    </>
  );
}

/** Words filled with a gradient instead of a colour. */
export function GradText({ children, gradient, style }: { children: React.ReactNode; gradient: string; style?: React.CSSProperties }): React.ReactElement {
  return <span style={{ backgroundImage: gradient, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", WebkitTextFillColor: "transparent", paddingBottom: "0.06em", ...style }}>{children}</span>;
}

/** A white tile with a hairline edge, like the site's cards. `focus` gives it a coral edge and lifts it. */
export function Panel({ children, style, focus = 0 }: { children?: React.ReactNode; style?: React.CSSProperties; focus?: number }): React.ReactElement {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 28,
        boxShadow: focus > 0 ? `0 0 0 ${1 + focus}px rgb(232 97 74 / ${Math.round(20 + focus * 70)}%), 0 30px 70px rgb(0 0 0 / ${Math.round(focus * 8)}%)` : `0 0 0 1px ${L.line}`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** The mouse pointer, gliding through `path` ([time, x, y]) and pressing at each time in `clicks`. */
export function Cursor({ path, clicks = [], hideAt }: { path: [number, number, number][]; clicks?: number[]; hideAt?: number }): React.ReactElement | null {
  const t = useT();
  if (t < path[0]![0] - 0.3) return null;
  const gone = hideAt === undefined ? 0 : prog(t, hideAt, 0.3);
  if (gone >= 1) return null;
  const times = path.map((p) => p[0]);
  const x = path.length > 1 ? lerp(t, times, path.map((p) => p[1])) : path[0]![1];
  const y = path.length > 1 ? lerp(t, times, path.map((p) => p[2])) : path[0]![2];
  const appear = prog(t, path[0]![0] - 0.3, 0.3);
  const press = clicks.reduce((m, c) => Math.max(m, t >= c - 0.08 && t < c + 0.12 ? 1 : 0), 0);
  const ring = clicks.map((c) => (t >= c && t < c + 0.5 ? (t - c) / 0.5 : -1)).find((r) => r >= 0) ?? -1;
  return (
    <div style={{ position: "absolute", left: x, top: y, zIndex: 100, opacity: appear * (1 - gone), pointerEvents: "none" }}>
      {ring >= 0 ? <div style={{ position: "absolute", left: -20, top: -20, width: 40, height: 40, borderRadius: 999, border: `2px solid ${L.accent}`, opacity: 1 - ring, transform: `scale(${0.4 + ring})` }} /> : null}
      <svg width={24} height={28} viewBox="0 0 26 30" style={{ transform: `scale(${1 - press * 0.12})`, transformOrigin: "0 0", filter: "drop-shadow(0 3px 6px rgb(0 0 0 / 50%))" }}>
        <path d="M2 2 L2 23 L7.5 18 L11.5 27 L15.5 25.2 L11.6 16.5 L19 16.5 Z" fill="#fff" stroke="#111" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/** A scene: shown from `from` to `to`, its content easing out over the last moment. */
export function Scene({ from, to, children, fadeOut = 0.4, shift = 0, dark = false }: { from: number; to: number; children: React.ReactNode; fadeOut?: number; shift?: number; dark?: boolean }): React.ReactElement | null {
  const t = useT();
  if (t < from || t >= to) return null;
  const q = prog(t, to - fadeOut, fadeOut, "inOut");
  const y = shift - 12 * q;
  return <div style={{ position: "absolute", inset: 0, opacity: 1 - q, transform: y !== 0 ? `translateY(${y}px)` : undefined, fontFamily: FONT, color: dark ? "#fff" : L.ink }}>{children}</div>;
}

export const center: React.CSSProperties = { position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" };

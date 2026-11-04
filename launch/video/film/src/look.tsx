import * as React from "react";
import { FONT, L, MONO, prog, useT } from "./kit";
import { beats } from "./timeline";

// The look of the sales page (launch/site), brought into the film: the dark card (#1B1D24) inset
// from the white page, a slow glow of violet, blue, cyan, magenta and orange inside it, a dot grid
// with a light wandering over it, and blueprint guides, crosshairs and small mono notes drawn around
// whatever a frame is about. The white scenes get the same in a whisper: dots at the edges and a
// quiet frame of guides. Every value is a pure function of the time.

export const INK = "#1B1D24";
/** The site's own gradient, violet through magenta to orange. */
export const GRAD = "linear-gradient(90deg, #9b3dff, #ec1480 50%, #ff5a1f)";
/** The wider spectrum from the hero, for the odd word that should glow. */
export const SPECTRUM = "linear-gradient(90deg, #26d9f0, #6b7bff 30%, #b04dff 55%, #ec1480 75%, #ff7a3d)";

/** How far a scene scrolls when the page moves between the white and the dark card, in seconds. */
export const SCROLL = 1.1;
export const scrolls = { reveal: beats.reveal - 0.5, app: beats.app - 0.6, cto: beats.cto - 0.55, end: beats.end - 0.35 } as const;
const CARD = { inset: 16, radius: 36 };

// ---- the glow ----

type Blob = { rgb: string; a: number; x: number; y: number; w: number; h: number; period: number; dx: number; dy: number; s0: number; s1: number; flip?: boolean };

// Positions are the blob's centre and size in percent of the frame. Each drifts between two states
// on its own loop, like the site's CSS keyframes, only a little quicker so the film sees it move.
const MOODS = {
  // the site's hero: the colour pooled along the bottom
  hero: [
    { rgb: "138 18 224", a: 0.62, x: 9, y: 58, w: 62, h: 92, period: 16, dx: 8, dy: -6, s0: 1, s1: 1.14 },
    { rgb: "64 92 255", a: 0.5, x: 50, y: 44, w: 52, h: 40, period: 20, dx: -10, dy: -4, s0: 1.08, s1: 0.94 },
    { rgb: "38 236 240", a: 0.5, x: 88, y: 38, w: 48, h: 48, period: 18, dx: -6, dy: 10, s0: 0.95, s1: 1.12 },
    { rgb: "226 7 126", a: 0.58, x: 48, y: 78, w: 64, h: 72, period: 15, dx: -10, dy: -4, s0: 1.08, s1: 0.94, flip: true },
    { rgb: "255 84 20", a: 0.62, x: 89, y: 68, w: 62, h: 80, period: 19, dx: 8, dy: -6, s0: 1, s1: 1.14, flip: true },
  ],
  // behind the app: the window covers the middle, so the colour sits at the edges and backlights it
  tour: [
    { rgb: "138 18 224", a: 0.66, x: 2, y: 62, w: 34, h: 110, period: 16, dx: 6, dy: -8, s0: 1, s1: 1.12 },
    { rgb: "64 92 255", a: 0.3, x: 22, y: -14, w: 46, h: 36, period: 20, dx: 10, dy: 4, s0: 1, s1: 1.1 },
    { rgb: "38 236 240", a: 0.26, x: 84, y: -10, w: 38, h: 40, period: 18, dx: -8, dy: 6, s0: 0.95, s1: 1.12 },
    { rgb: "226 7 126", a: 0.5, x: 50, y: 108, w: 70, h: 40, period: 15, dx: -6, dy: -4, s0: 1.06, s1: 0.94, flip: true },
    { rgb: "255 84 20", a: 0.66, x: 98, y: 66, w: 34, h: 110, period: 19, dx: -6, dy: -6, s0: 1, s1: 1.14, flip: true },
  ],
  // the site's panels: one soft colour in a corner
  violet: [{ rgb: "138 18 224", a: 0.6, x: 10, y: 100, w: 70, h: 90, period: 16, dx: 6, dy: -6, s0: 1, s1: 1.1 }],
  magenta: [
    { rgb: "226 7 126", a: 0.5, x: 10, y: 0, w: 70, h: 90, period: 15, dx: 6, dy: 6, s0: 1, s1: 1.1 },
    { rgb: "255 84 20", a: 0.3, x: 95, y: 105, w: 60, h: 70, period: 19, dx: -6, dy: -6, s0: 1, s1: 1.1 },
  ],
  // the white page: pastel, barely there
  page: [
    { rgb: "155 61 255", a: 0.07, x: 4, y: 104, w: 60, h: 70, period: 16, dx: 6, dy: -6, s0: 1, s1: 1.1 },
    { rgb: "255 120 60", a: 0.07, x: 96, y: 104, w: 60, h: 70, period: 19, dx: -6, dy: -6, s0: 1, s1: 1.1 },
    { rgb: "38 200 240", a: 0.05, x: 92, y: -6, w: 50, h: 50, period: 18, dx: -6, dy: 6, s0: 1, s1: 1.1 },
  ],
} satisfies Record<string, Blob[]>;

export type Mood = keyof typeof MOODS;

/** The glow: each mood weighted 0 to 1, so the light can move from one to the next. */
export function Aurora({ moods, fade = 0 }: { moods: Partial<Record<Mood, number>>; fade?: number }): React.ReactElement {
  const t = useT();
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {(Object.keys(moods) as Mood[]).map((m) => {
        const weight = moods[m] ?? 0;
        if (weight <= 0.002) return null;
        return MOODS[m].map((b: Blob, i: number) => {
          // ping-pong between the two states, eased at each end
          let k = 0.5 - 0.5 * Math.cos((Math.PI * t) / b.period);
          if (b.flip) k = 1 - k;
          const s = b.s0 + (b.s1 - b.s0) * k;
          const a = b.a * weight;
          const stop = (f: number) => `rgb(${b.rgb} / ${(a * f).toFixed(3)})`;
          return (
            <div
              key={`${m}${i}`}
              style={{
                position: "absolute",
                left: `${b.x - b.w / 2}%`,
                top: `${b.y - b.h / 2}%`,
                width: `${b.w}%`,
                height: `${b.h}%`,
                borderRadius: "50%",
                transform: `translate(${b.dx * k}%, ${b.dy * k}%) scale(${s})`,
                background: `radial-gradient(closest-side, ${stop(1)} 0%, ${stop(0.92)} 22%, ${stop(0.66)} 44%, ${stop(0.36)} 64%, ${stop(0.13)} 82%, ${stop(0)} 100%)`,
              }}
            />
          );
        });
      })}
      {/* the site's hero keeps its headline on the flat dark at the top */}
      {fade > 0 ? <div style={{ position: "absolute", inset: 0, opacity: fade, background: `linear-gradient(to bottom, ${INK} 0%, ${INK} 12%, rgb(27 29 36 / 82%) 28%, rgb(27 29 36 / 40%) 50%, rgb(27 29 36 / 10%) 70%, transparent)` }} /> : null}
    </div>
  );
}

// ---- the dot grid ----

const mask = (m: string): React.CSSProperties => ({ maskImage: m, WebkitMaskImage: m });

/** The dot grid, creeping one cell every 48 seconds. On the dark a light wanders over it, brightening the dots it passes. */
export function Dots({ dark = true, gap = 26, alpha, fadeMask, lit = true }: { dark?: boolean; gap?: number; alpha?: number; fadeMask?: string; lit?: boolean }): React.ReactElement {
  const t = useT();
  const creep = ((t / 48) * gap) % gap;
  const rgb = dark ? "255 255 255" : "0 0 0";
  const base = alpha ?? (dark ? 0.085 : 0.075);
  const dots = (a: number) => `radial-gradient(circle, rgb(${rgb} / ${a}) 1.25px, transparent 1.9px)`;
  const m = fadeMask ?? (dark ? "linear-gradient(to bottom, rgb(0 0 0 / 40%), #000 45%, #000 80%, rgb(0 0 0 / 45%))" : "radial-gradient(ellipse 72% 70% at 50% 50%, transparent 40%, #000 100%)");
  // the light's path: a slow figure across the frame
  const lx = 50 + 38 * Math.sin(t * 0.11 + 0.4);
  const ly = 42 + 22 * Math.sin(t * 0.17 + 1.3);
  return (
    <>
      <div style={{ position: "absolute", inset: 0, backgroundImage: dots(base), backgroundSize: `${gap}px ${gap}px`, backgroundPosition: `${creep}px ${creep}px`, ...mask(m) }} />
      {dark && lit ? <div style={{ position: "absolute", inset: 0, backgroundImage: dots(0.26), backgroundSize: `${gap}px ${gap}px`, backgroundPosition: `${creep}px ${creep}px`, ...mask(`radial-gradient(560px 420px at ${lx}% ${ly}%, #000 20%, transparent 100%)`) }} /> : null}
    </>
  );
}

// ---- blueprint ----

const tone = (dark: boolean) => ({
  line: dark ? "rgb(255 255 255 / 13%)" : "rgb(0 0 0 / 11%)",
  dash: dark ? "rgb(255 255 255 / 11%)" : "rgb(0 0 0 / 10%)",
  mark: dark ? "rgb(255 255 255 / 38%)" : "rgb(0 0 0 / 28%)",
  note: dark ? "rgb(255 255 255 / 40%)" : L.faint,
});

/** A guide line from (x, y), `len` long, fading out at both ends; drawn out from its middle as `k` goes 0 → 1. */
export function Guide({ x, y, len, vertical, dark = false, k = 1, strong = 1 }: { x: number; y: number; len: number; vertical?: boolean; dark?: boolean; k?: number; strong?: number }): React.ReactElement | null {
  if (k <= 0) return null;
  const c = tone(dark).line;
  const g = `linear-gradient(${vertical ? "to bottom" : "to right"}, transparent, ${c} 25%, ${c} 75%, transparent)`;
  return <div style={{ position: "absolute", left: x, top: y, width: vertical ? 1 : len, height: vertical ? len : 1, background: g, opacity: strong, transform: vertical ? `scaleY(${k})` : `scaleX(${k})` }} />;
}

/** A crosshair centred on (x, y). */
export function Cross({ x, y, size = 22, dark = false, k = 1 }: { x: number; y: number; size?: number; dark?: boolean; k?: number }): React.ReactElement | null {
  if (k <= 0) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={tone(dark).mark} strokeWidth={20 / size} style={{ position: "absolute", left: x - size / 2, top: y - size / 2, opacity: k, transform: `rotate(${(1 - k) * 90}deg) scale(${0.6 + 0.4 * k})` }}>
      <path d="M10 0v20M0 10h20" />
      <circle cx="10" cy="10" r="4" />
    </svg>
  );
}

/** A small mono note, the blueprint's handwriting. */
export function Note({ children, dark = false, color, size = 15, style }: { children: React.ReactNode; dark?: boolean; color?: string; size?: number; style?: React.CSSProperties }): React.ReactElement {
  return <div style={{ fontFamily: MONO, fontSize: size, letterSpacing: "0.2em", textTransform: "uppercase", whiteSpace: "nowrap", color: color ?? tone(dark).note, ...style }}>{children}</div>;
}

/** Tick marks along a horizontal line, every sixth one longer. */
export function Ticks({ x, y, len, n = 25, dark = false, k = 1 }: { x: number; y: number; len: number; n?: number; dark?: boolean; k?: number }): React.ReactElement | null {
  if (k <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: len, height: 0 }}>
      {Array.from({ length: n }, (_, i) => {
        const a = Math.max(0, Math.min(1, k * (n + 6) - i));
        const h = i % 6 === 0 ? 10 : 6;
        return <div key={i} style={{ position: "absolute", left: (len * i) / (n - 1), top: -h / 2, width: 1, height: h, background: tone(dark).line, opacity: a * 1.4 }} />;
      })}
    </div>
  );
}

/** A rectangle drawn up like the site's hero shot: a dashed frame just outside it, guides running out
 *  past it (`reach` px each way), crosshairs at the top corners, ticks along the top and mono notes on
 *  the guides. Drawn in from `at`, in the parent's own coordinates, so it can sit inside a scaled thing. */
export function Blueprint({ x, y, w, h, at, outAt, dark = false, gap = 18, radius = 24, notes = {}, reach = 1400, reachV = 700, ticks = true, sides = true }: { x: number; y: number; w: number; h: number; at: number; outAt?: number; dark?: boolean; gap?: number; radius?: number; notes?: { tl?: React.ReactNode; tr?: React.ReactNode; left?: React.ReactNode; right?: React.ReactNode }; reach?: number; reachV?: number; ticks?: boolean; sides?: boolean }): React.ReactElement | null {
  const t = useT();
  const gone = outAt === undefined ? 0 : prog(t, outAt, 0.5, "inOut");
  if (t < at || gone >= 1) return null;
  const k = (d: number, dur = 1.1) => prog(t, at + d, dur, "inOut");
  const x0 = x - gap;
  const x1 = x + w + gap;
  const y0 = y - gap;
  const noteK = prog(t, at + 0.7, 0.8);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 0, height: 0, opacity: 1 - gone, pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: x0, top: y0, width: x1 - x0, height: h + gap * 2, borderRadius: radius, border: `1px dashed ${tone(dark).dash}`, opacity: k(0.25, 0.9) }} />
      <Guide x={x0 - reach} y={y0} len={x1 - x0 + reach * 2} dark={dark} k={k(0)} />
      {sides ? <Guide x={x0} y={y0 - reachV} len={h + gap + reachV * 1.4} vertical dark={dark} k={k(0.1)} /> : null}
      {sides ? <Guide x={x1} y={y0 - reachV} len={h + gap + reachV * 1.4} vertical dark={dark} k={k(0.1)} /> : null}
      {ticks ? <Ticks x={x0 + (x1 - x0) * 0.02} y={y0} len={(x1 - x0) * 0.96} dark={dark} k={k(0.3, 1.2)} /> : null}
      <Cross x={x0} y={y0} dark={dark} k={k(0.4, 0.7)} />
      <Cross x={x1} y={y0} dark={dark} k={k(0.45, 0.7)} />
      <div style={{ opacity: noteK }}>
        {notes.tl ? <Note dark={dark} style={{ position: "absolute", left: x0 + 2, top: y0 - 34 }}>{notes.tl}</Note> : null}
        {notes.tr ? <Note dark={dark} style={{ position: "absolute", left: x1 - 2, top: y0 - 34, transform: "translateX(-100%)" }}>{notes.tr}</Note> : null}
        {notes.left ? <SideNote x={x0 - 26} y={y + h / 2} dark={dark} turn={-90}>{notes.left}</SideNote> : null}
        {notes.right ? <SideNote x={x1 + 26} y={y + h / 2} dark={dark} turn={90}>{notes.right}</SideNote> : null}
      </div>
    </div>
  );
}

function SideNote({ x, y, dark, turn, children }: { x: number; y: number; dark: boolean; turn: number; children: React.ReactNode }): React.ReactElement {
  const rule = <span style={{ width: 34, height: 1, background: tone(dark).mark, opacity: 0.6 }} />;
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) rotate(${turn}deg)` }}>
      <Note dark={dark} style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {rule}
        {children}
        {rule}
      </Note>
    </div>
  );
}

/** A callout: a dot on the thing, a short leader out to the side and a note at its end. */
export function Callout({ x, y, len = 70, side = "right", k, children, color = L.accent, dark = false }: { x: number; y: number; len?: number; side?: "right" | "left"; k: number; children: React.ReactNode; color?: string; dark?: boolean }): React.ReactElement | null {
  if (k <= 0) return null;
  const dir = side === "right" ? 1 : -1;
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: Math.min(1, k * 2) }}>
      <div style={{ position: "absolute", left: -5, top: -5, width: 10, height: 10, borderRadius: 99, border: `1.5px solid ${color}`, background: dark ? INK : "#fff", transform: `scale(${0.5 + 0.5 * k})` }} />
      <div style={{ position: "absolute", top: 0, left: dir > 0 ? 6 : -6 - len, width: len, height: 1, background: color, opacity: 0.6, transform: `scaleX(${k})`, transformOrigin: dir > 0 ? "0 0" : "100% 0" }} />
      <Note color={color} style={{ position: "absolute", top: -10, left: dir > 0 ? len + 16 : undefined, right: dir > 0 ? undefined : len + 16, opacity: prog(k, 0.5, 0.5) }}>{children}</Note>
    </div>
  );
}

// ---- the white page and the dark card ----

/** The white page: a pastel glow in the corners, dots at the edges and a quiet frame of guides.
 *  Hidden while the dark card covers it, and left plain white while the app is on it. */
export function PageBackdrop(): React.ReactElement {
  const t = useT();
  const covered = (t > scrolls.reveal + SCROLL && t < scrolls.app) || t > scrolls.end + SCROLL;
  const m = 64;
  const draw = t > scrolls.app ? 1 : prog(t, 0.2, 1.4, "inOut");
  const deco = t < scrolls.app ? 1 : prog(t, scrolls.cto + 0.3, 0.8, "inOut");
  return (
    <div style={{ position: "absolute", inset: 0, background: L.bg }}>
      {covered || deco <= 0 ? null : (
        <div style={{ position: "absolute", inset: 0, opacity: deco }}>
          <Aurora moods={{ page: 1 }} />
          <Dots dark={false} />
          <Guide x={0} y={m} len={1920} k={draw} strong={0.8} />
          <Guide x={0} y={1080 - m} len={1920} k={draw} strong={0.8} />
          <Guide x={m} y={0} len={1080} vertical k={draw} strong={0.8} />
          <Guide x={1920 - m} y={0} len={1080} vertical k={draw} strong={0.8} />
          {[
            [m, m],
            [1920 - m, m],
            [m, 1080 - m],
            [1920 - m, 1080 - m],
          ].map(([x, y], i) => (
            <Cross key={i} x={x!} y={y!} size={18} k={t > scrolls.app ? 1 : prog(t, 0.6 + i * 0.08, 0.7)} />
          ))}
        </div>
      )}
    </div>
  );
}

/** The dark card, inset from the white page like the site's hero. It scrolls up into place at `rise`
 *  and, when given, scrolls on up and away at `leave`, the white page coming up behind it. Children are
 *  laid out on the full 1920 × 1080 frame. */
export function Stage({ rise, leave, moods, fade, children }: { rise: number; leave?: number; moods: (t: number) => Partial<Record<Mood, number>>; fade?: (t: number) => number; children: React.ReactNode }): React.ReactElement | null {
  const t = useT();
  if (t < rise || (leave !== undefined && t >= leave + SCROLL)) return null;
  const r = prog(t, rise, SCROLL, "inOut");
  const s = leave === undefined ? 0 : prog(t, leave, SCROLL, "inOut");
  const top = CARD.inset + 1080 * (1 - r) - 1080 * s;
  return (
    <div style={{ position: "absolute", left: CARD.inset, top, width: 1920 - CARD.inset * 2, height: 1080 - CARD.inset * 2, borderRadius: CARD.radius, overflow: "hidden", background: INK, fontFamily: FONT, color: "#fff" }}>
      <div style={{ position: "absolute", left: -CARD.inset, top: -CARD.inset, width: 1920, height: 1080 }}>
        <Aurora moods={moods(t)} fade={fade?.(t) ?? 0} />
        <Dots />
        {children}
      </div>
    </div>
  );
}

/** How far white content is pushed by the page scrolling: up and away as a card rises over it, or up
 *  into place as a card leaves above it. `scrollOn` is the page scrolling from one white section to the next. */
export function pageShift(t: number): number {
  const up = (a: number) => -1080 * prog(t, a, SCROLL, "inOut");
  if (t < scrolls.reveal + SCROLL) return up(scrolls.reveal);
  if (t < scrolls.app + SCROLL) return 1080 * (1 - prog(t, scrolls.app, SCROLL, "inOut"));
  if (t < scrolls.end) return 0;
  return up(scrolls.end);
}

/** The page scrolling on from one white section to the next at `at`: the old one goes up and away as the
 *  new one comes up from below. */
export function scrollOn(t: number, at: number): { out: number; in: number } {
  const p = prog(t, at, SCROLL, "inOut");
  return { out: -1080 * p, in: 1080 * (1 - p) };
}

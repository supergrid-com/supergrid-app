// Color math, dependency free. Hex in, hex out; OKLCH in between so ramps and mixes look even.

export type Oklch = { l: number; c: number; h: number };
export type Rgb = { r: number; g: number; b: number };

export const isHex = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);

/** Accepts #rgb, #rrggbb, #rrggbbaa (alpha dropped) and returns #rrggbb lowercase, or null. */
export function normalizeHex(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(s)) return `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`;
  if (/^#[0-9a-f]{6}$/.test(s)) return s;
  if (/^#[0-9a-f]{8}$/.test(s)) return s.slice(0, 7);
  return null;
}

export function hexToRgb(hex: string): Rgb {
  const h = normalizeHex(hex) ?? "#000000";
  return { r: parseInt(h.slice(1, 3), 16) / 255, g: parseInt(h.slice(3, 5), 16) / 255, b: parseInt(h.slice(5, 7), 16) / 255 };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const c = (x: number) => Math.round(Math.min(1, Math.max(0, x)) * 255).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

export function rgbToOklch({ r, g, b }: Rgb): Oklch {
  const lr = toLinear(r), lg = toLinear(g), lb = toLinear(b);
  const l_ = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m_ = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s_ = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bb = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  const c = Math.sqrt(a * a + bb * bb);
  let h = (Math.atan2(bb, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { l: L, c: c < 1e-4 ? 0 : c, h: c < 1e-4 ? 0 : h };
}

function oklchToLinearRgb({ l, c, h }: Oklch): Rgb {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return {
    r: 4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    g: -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    b: -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  };
}

const inGamut = ({ r, g, b }: Rgb) => r >= -1e-4 && r <= 1 + 1e-4 && g >= -1e-4 && g <= 1 + 1e-4 && b >= -1e-4 && b <= 1 + 1e-4;

/** Reduces chroma until the color fits sRGB, so a ramp never clips to a different hue. */
export function oklchToRgb(color: Oklch): Rgb {
  let c = color.c;
  let rgb = oklchToLinearRgb({ ...color, c });
  let lo = 0, hi = c;
  if (!inGamut(rgb)) {
    for (let i = 0; i < 24; i++) {
      c = (lo + hi) / 2;
      rgb = oklchToLinearRgb({ ...color, c });
      if (inGamut(rgb)) lo = c; else hi = c;
    }
    rgb = oklchToLinearRgb({ ...color, c: lo });
  }
  return { r: toGamma(Math.min(1, Math.max(0, rgb.r))), g: toGamma(Math.min(1, Math.max(0, rgb.g))), b: toGamma(Math.min(1, Math.max(0, rgb.b))) };
}

export const hexToOklch = (hex: string): Oklch => rgbToOklch(hexToRgb(hex));
export const oklchToHex = (c: Oklch): string => rgbToHex(oklchToRgb(c));

/** WCAG relative luminance. */
export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** White or near-black, whichever reads better on `bg`. */
export function foregroundFor(bg: string, light = "#ffffff", dark = "#0a0a0a"): string {
  return contrastRatio(bg, light) >= contrastRatio(bg, dark) ? light : dark;
}

export const isDark = (hex: string): boolean => luminance(hex) < 0.18;

/** `mix(a, b, 0.25)` is three parts a to one part b, mixed in OKLab so greys stay neutral. */
export function mix(a: string, b: string, amount: number): string {
  const ca = hexToOklch(a), cb = hexToOklch(b);
  const t = Math.min(1, Math.max(0, amount));
  // mix in rectangular form so hue wraps correctly
  const ax = ca.c * Math.cos((ca.h * Math.PI) / 180), ay = ca.c * Math.sin((ca.h * Math.PI) / 180);
  const bx = cb.c * Math.cos((cb.h * Math.PI) / 180), by = cb.c * Math.sin((cb.h * Math.PI) / 180);
  const x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
  let h = (Math.atan2(y, x) * 180) / Math.PI;
  if (h < 0) h += 360;
  return oklchToHex({ l: ca.l + (cb.l - ca.l) * t, c: Math.sqrt(x * x + y * y), h });
}

/** Lighter or darker by a step of OKLab lightness; negative darkens. */
export function shift(hex: string, dl: number): string {
  const c = hexToOklch(hex);
  return oklchToHex({ ...c, l: Math.min(1, Math.max(0, c.l + dl)) });
}

export const SHADE_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
export type ShadeStep = (typeof SHADE_STEPS)[number];
export type Ramp = Record<ShadeStep, string>;

// Lightness targets per step, close to Tailwind's palettes; chroma eases off toward both ends.
const RAMP_L: Record<ShadeStep, number> = { 50: 0.975, 100: 0.945, 200: 0.89, 300: 0.81, 400: 0.72, 500: 0.63, 600: 0.55, 700: 0.47, 800: 0.39, 900: 0.32, 950: 0.24 };
const RAMP_C: Record<ShadeStep, number> = { 50: 0.12, 100: 0.25, 200: 0.45, 300: 0.7, 400: 0.9, 500: 1, 600: 1, 700: 0.92, 800: 0.8, 900: 0.66, 950: 0.5 };

/**
 * A 50–950 ramp from one color. The base keeps its hue and sets the peak chroma; it lands on the
 * step whose lightness is nearest, so `ramp(primary)[600]` is usually the primary itself.
 */
export function ramp(hex: string): Ramp {
  const base = hexToOklch(hex);
  const out = {} as Ramp;
  const nearest = SHADE_STEPS.reduce((best, s) => (Math.abs(RAMP_L[s] - base.l) < Math.abs(RAMP_L[best] - base.l) ? s : best), 500 as ShadeStep);
  const peak = base.c / (RAMP_C[nearest] || 1);
  for (const s of SHADE_STEPS) out[s] = s === nearest ? normalizeHex(hex)! : oklchToHex({ l: RAMP_L[s], c: Math.min(0.37, peak * RAMP_C[s]), h: base.h });
  return out;
}

/** The step a color sits on in its own ramp. */
export function shadeOf(hex: string): ShadeStep {
  const l = hexToOklch(hex).l;
  return SHADE_STEPS.reduce((best, s) => (Math.abs(RAMP_L[s] - l) < Math.abs(RAMP_L[best] - l) ? s : best), 500 as ShadeStep);
}

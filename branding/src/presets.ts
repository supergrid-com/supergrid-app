import { defaultMark, type MarkConfig } from "./mark";
import { applyPalette, palettes } from "./palettes";

// Variations on the tile grid. Loading one keeps the current colours, so a palette survives a
// change of shape.
export type ShapePreset = { name: string; mark: Partial<MarkConfig> };

const flat = { lift: "none" } as const;

export const presets: ShapePreset[] = [
  { name: "Diamond, notched", mark: { ...flat, rotate: 45, gap: 4, notch: 30 } },
  { name: "Diamond, notched, mid", mark: { ...flat, rotate: 45, gap: 7, notch: 27, radius: 15 } },
  { name: "Diamond, notched, open", mark: { ...flat, rotate: 45, gap: 11, notch: 24, radius: 16 } },
  { name: "Lifted", mark: {} },
  { name: "Notched", mark: { ...flat, gap: 4, radius: 12, notch: 34 } },
  { name: "Diamond", mark: { ...flat, rotate: 45, gap: 6, radius: 14 } },
  { name: "Lifted, lit", mark: { accentOn: "lifted" } },
  { name: "Slipped", mark: { liftAngle: 0, liftOffset: 9 } },
  { name: "Turned", mark: { liftAngle: 45, liftOffset: 4, radius: 16 } },
  { name: "Tumbling", mark: { liftAngle: -22, liftOffset: 11, gap: 6 } },
  { name: "Diamond, lifted", mark: { rotate: 45, gap: 6, liftAngle: 0, liftOffset: 8, accentOn: "lifted" } },
  { name: "Notched, lit", mark: { ...flat, gap: 4, notch: 34, accentOn: "first" } },
  { name: "Tight", mark: { ...flat, gap: 3, radius: 8 } },
  { name: "Soft", mark: { ...flat, gap: 6, radius: 36 } },
  { name: "Pinwheel", mark: { ...flat, spin: 12, gap: 9 } },
  { name: "Outline", mark: { fill: "outline", line: 5, gap: 9 } },
  { name: "Nine", mark: { n: 3, gap: 6, radius: 16, liftAngle: 16, liftOffset: 5 } },
  { name: "Nine, notched", mark: { ...flat, n: 3, gap: 4, notch: 30, radius: 14 } },
  { name: "Nine, centre lit", mark: { n: 3, gap: 6, lift: "center", liftAngle: 45, liftOffset: 0, accentOn: "lifted" } },
  { name: "App tile", mark: { tile: "rounded", padding: 16 } },
];

export function applyPreset(current: MarkConfig, p: ShapePreset): MarkConfig {
  const { fg, bg, accent, gradient, g1, g2, g3 } = current;
  return { ...defaultMark, fg, bg, accent, gradient, g1, g2, g3, ...p.mark };
}

const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)];
const between = (a: number, b: number, step = 1) => Math.round((a + Math.random() * (b - a)) / step) * step;

export function randomMark(current: MarkConfig): MarkConfig {
  return {
    ...applyPalette(current, pick(palettes)),
    n: pick([2, 2, 2, 3]),
    gap: between(3, 10),
    radius: between(4, 34),
    notch: pick([0, 0, between(20, 40)]),
    fill: pick(["solid", "solid", "solid", "outline"] as const),
    rotate: pick([0, 0, 45]),
    spin: pick([0, 0, 0, between(6, 16)]),
    lift: pick(["none", "tr", "tr", "tl", "br"] as const),
    liftAngle: between(-30, 30),
    liftOffset: between(0, 12),
    accentOn: pick(["none", "none", "lifted", "first"] as const),
  };
}

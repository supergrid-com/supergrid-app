import type { MarkConfig } from "./mark";

// Candidate palettes: a ground, an ink and one accent, and optionally a three-stop gradient on
// the tiles or the ground. The rest of a brand palette can grow out of whichever of these sticks.
export type Palette = {
  name: string;
  note: string;
  bg: string;
  fg: string;
  accent: string;
  gradient?: "tiles" | "ground";
  stops?: [string, string, string];
};

// Warm dark-UI gradient: yellow through peach into magenta.
const SUNSET: [string, string, string] = ["#f2f47a", "#f7a8a8", "#f36ef0"];
// The gradient borders on AI buttons: teal through yellow into pink.
const GLOW: [string, string, string] = ["#3fd5c8", "#ece46a", "#f472b6"];

export const palettes: Palette[] = [
  { name: "Mono", note: "Your references: white tiles on black", bg: "#000000", fg: "#ffffff", accent: "#4d7cff" },
  { name: "Sunset", note: "Near-black, tiles in a yellow-to-magenta gradient", bg: "#0b0b0b", fg: "#ffffff", accent: "#f36ef0", gradient: "tiles", stops: SUNSET },
  { name: "Sunset ground", note: "The gradient as the ground, tiles in black", bg: "#f7a8a8", fg: "#0b0b0b", accent: "#ffffff", gradient: "ground", stops: SUNSET },
  { name: "Glow", note: "Teal, yellow and pink, like gradient-edged AI buttons", bg: "#121212", fg: "#ffffff", accent: "#f472b6", gradient: "tiles", stops: GLOW },
  { name: "Blueprint", note: "Drafting blue with a highlighter yellow", bg: "#0b2a5b", fg: "#e8f0ff", accent: "#ffd23f" },
  { name: "Cyanotype", note: "Bright print blue, white lines, pale cyan", bg: "#1546a8", fg: "#ffffff", accent: "#9fd8ff" },
  { name: "Voltage", note: "Black and high-voltage yellow", bg: "#0c0c0c", fg: "#f5f5f5", accent: "#ffd400" },
  { name: "Graphite", note: "The sketch: white on warm grey", bg: "#2a2a2a", fg: "#ffffff", accent: "#ffffff" },
  { name: "Signal", note: "Near-black with an electric lime", bg: "#0e0e0e", fg: "#f2f2f2", accent: "#c6ff3d" },
  { name: "Ember", note: "Ink black and a hot orange", bg: "#111111", fg: "#f5f5f4", accent: "#ff5f1f" },
  { name: "Paper", note: "Newsprint with international orange", bg: "#f4f1ea", fg: "#141414", accent: "#ff4f00" },
  { name: "Klein", note: "White page, one ultramarine", bg: "#ffffff", fg: "#0a0a0a", accent: "#1f3dff" },
  { name: "Field", note: "Deep green with a mint signal", bg: "#0f1a14", fg: "#e6f2ea", accent: "#35d07f" },
  { name: "Plasma", note: "Night purple and an arc-light violet", bg: "#141026", fg: "#f1edff", accent: "#9b7bff" },
];

// WCAG relative luminance and contrast ratio.
function luminance(hex: string): number {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export function applyPalette(c: MarkConfig, p: Palette): MarkConfig {
  const [g1, g2, g3] = p.stops ?? [c.g1, c.g2, c.g3];
  return { ...c, bg: p.bg, fg: p.fg, accent: p.accent, gradient: p.gradient ?? "none", g1, g2, g3 };
}

export function usesPalette(c: MarkConfig, p: Palette): boolean {
  const sameStops = !p.stops || (p.stops[0] === c.g1 && p.stops[1] === c.g2 && p.stops[2] === c.g3);
  return p.bg === c.bg && p.fg === c.fg && p.accent === c.accent && (p.gradient ?? "none") === c.gradient && sameStops;
}

// A swatch for a palette: its ground, with the gradient or accent cutting across the corner.
export function paletteChip(p: Palette): string {
  const corner = p.stops ? `linear-gradient(45deg, ${p.stops.join(", ")})` : p.accent;
  return p.gradient === "ground"
    ? corner
    : `linear-gradient(135deg, ${p.bg} 55%, transparent 55%), ${p.stops ? corner : `linear-gradient(${p.accent}, ${p.accent})`}`;
}

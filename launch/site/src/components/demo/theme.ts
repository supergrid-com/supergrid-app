// The app's themes, ported from app/src/renderer/app/lib/theme.ts: a theme is an accent, a
// background and a contrast (0–100), and every token derives from them. The interface is the page
// in the card (--i-*); the sidebar is the admin layer around it, the rail, the sub nav and the chat
// (--a-*). The sidebar matches the interface unless it has a preset of its own.

export type Knobs = { accent: string; background: string; contrast: number };
export type Preset = Knobs & { id: string; name: string };

export const PRESETS: Preset[] = [
  { id: "light", name: "Light", accent: "#e8604a", background: "#ffffff", contrast: 30 },
  { id: "pure-light", name: "Pure Light", accent: "#e8604a", background: "#ffffff", contrast: 60 },
  { id: "dark", name: "Dark", accent: "#e8604a", background: "#181818", contrast: 30 },
  { id: "graphite", name: "Graphite", accent: "#e8604a", background: "#1f1f1f", contrast: 25 },
  { id: "midnight", name: "Midnight", accent: "#7c8cf8", background: "#13151c", contrast: 35 },
  { id: "pitch", name: "Pitch", accent: "#e8604a", background: "#0a0a0a", contrast: 45 },
];

export const ACCENTS = ["#e8604a", "#f59e0b", "#22c55e", "#14b8a6", "#3b82f6", "#7c8cf8", "#a855f7", "#ec4899"];

export function preset(id: string): Preset {
  return PRESETS.find((p) => p.id === id) ?? PRESETS[0]!;
}

type Rgb = [number, number, number];

function parseHex(hex: string): Rgb {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function toHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((n) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, "0")).join("")}`;
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  const k = Math.min(1, Math.max(0, t));
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

function alpha([r, g, b]: Rgb, a: number): string {
  return `rgb(${Math.round(r)} ${Math.round(g)} ${Math.round(b)} / ${Math.round(Math.min(1, Math.max(0, a)) * 100)}%)`;
}

function luminance([r, g, b]: Rgb): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];

function onColor(c: Rgb): string {
  return luminance(c) > 0.45 ? "#111111" : "#ffffff";
}

function base(knobs: Knobs) {
  const bg = parseHex(knobs.background);
  const dark = luminance(bg) < 0.35;
  const ink = mix(bg, dark ? WHITE : BLACK, 0.92);
  return { bg, dark, ink, accent: parseHex(knobs.accent), k: Math.min(1, Math.max(0, knobs.contrast / 100)) };
}

/** The sidebar knobs that match an interface: its window color, accent and contrast. */
function matching(iface: Knobs): Knobs {
  const { bg, ink, k } = base(iface);
  return { accent: iface.accent, background: toHex(mix(bg, ink, 0.03 + 0.02 * k)), contrast: iface.contrast };
}

/** Every token, for the interface and (when it has its own theme) the sidebar. */
export function themeVars(iface: Knobs, sidebar: Knobs | null): { vars: Record<string, string>; dark: boolean; adminDark: boolean } {
  const i = base(iface);
  const card = i.dark ? mix(i.bg, WHITE, 0.015 + 0.04 * i.k) : mix(i.bg, WHITE, 0.5);
  const s = base(sidebar ?? matching(iface));
  const adminAccent = sidebar ? s.accent : i.accent;
  const vars: Record<string, string> = {
    "--i-bg": toHex(i.bg),
    "--i-fg": toHex(mix(i.bg, i.ink, 0.86 + 0.1 * i.k)),
    "--i-strong": toHex(mix(i.bg, i.ink, 0.97)),
    "--i-muted": toHex(mix(i.bg, i.ink, 0.52 + 0.14 * i.k)),
    "--i-card": toHex(card),
    "--i-fill": alpha(i.ink, 0.03 + 0.05 * i.k),
    "--i-line": alpha(i.ink, 0.03 + 0.15 * i.k),
    "--i-input": alpha(i.ink, 0.05 + 0.18 * i.k),
    "--i-accent": toHex(i.accent),
    "--i-accent-soft": alpha(i.accent, i.dark ? 0.16 : 0.1),
    "--i-on-accent": onColor(i.accent),
    "--i-success": i.dark ? "#34d399" : "#047857",
    "--i-success-soft": i.dark ? "rgb(52 211 153 / 14%)" : "rgb(16 185 129 / 12%)",
    "--i-warning": i.dark ? "#fbbf24" : "#b45309",
    "--i-warning-soft": i.dark ? "rgb(251 191 36 / 14%)" : "rgb(245 158 11 / 14%)",
    "--i-meta": i.dark ? "#5b9dff" : "#0064e0",
    "--i-meta-soft": i.dark ? "rgb(59 140 255 / 16%)" : "rgb(0 100 224 / 9%)",
    "--a-bg": toHex(s.bg),
    "--a-panel": toHex(mix(s.bg, BLACK, s.dark ? 0.14 + 0.16 * s.k : 0.015 + 0.035 * s.k)),
    "--a-raised": toHex(s.dark ? mix(s.bg, WHITE, 0.06 + 0.06 * s.k) : mix(s.bg, WHITE, 0.55 + 0.45 * s.k)),
    "--a-strong": toHex(mix(s.bg, s.ink, 0.96)),
    "--a-fg": toHex(mix(s.bg, s.ink, 0.78 + 0.1 * s.k)),
    "--a-muted": toHex(mix(s.bg, s.ink, 0.52 + 0.12 * s.k)),
    "--a-dim": toHex(mix(s.bg, s.ink, 0.4 + 0.1 * s.k)),
    "--a-hover": alpha(s.ink, 0.025 + 0.035 * s.k),
    "--a-active": alpha(s.ink, 0.05 + 0.06 * s.k),
    "--a-line": alpha(s.ink, 0.05 + 0.1 * s.k),
    "--a-accent": toHex(adminAccent),
    "--a-on-accent": onColor(adminAccent),
  };
  return { vars, dark: i.dark, adminDark: s.dark };
}

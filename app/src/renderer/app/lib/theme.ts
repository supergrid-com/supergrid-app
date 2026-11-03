// The app's themes, after Linear's: a theme is three knobs, an accent, a background and a contrast
// (0–100), and every token derives from them. There are two layers. The interface is the page
// inside a workspace's card and everything on it (apps, settings). The sidebar is the admin layer
// around it: the rail, the sub nav, the chat and the backdrop. Each has presets and a custom
// setting; the sidebar can also just match the interface. Light or dark is read from the
// background, so Tailwind's dark: variant and color-scheme follow the interface's background.
//
// Contrast is mostly opacity: hairlines, hover and active fills, and how far cards and panels sit
// from the background. Text strength moves with it a little.
//
// The interface's accent is the workspace's: it is saved with the workspace (lib/accent.ts) and
// painted over the theme's, so each workspace keeps its color through any theme. A preset's
// accent is what shows until the workspace picks one.

export type Knobs = { accent: string; background: string; contrast: number };
export type Preset = Knobs & { id: string; name: string };

export type InterfaceChoice = { preset: string } & Knobs;
/** Off, the sidebar matches the interface; on, it has a preset or custom knobs of its own. */
export type SidebarChoice = { enabled: boolean; preset: string } & Knobs;
export type Appearance = { interface: InterfaceChoice; sidebar: SidebarChoice };

// One list for both layers. The default accent is coral, as before. "system" follows the OS
// between Light and Dark.
export const presets: Preset[] = [
  { id: "light", name: "Light", accent: "#e8604a", background: "#ffffff", contrast: 30 },
  { id: "pure-light", name: "Pure Light", accent: "#e8604a", background: "#ffffff", contrast: 60 },
  { id: "dark", name: "Dark", accent: "#e8604a", background: "#181818", contrast: 30 },
  { id: "graphite", name: "Graphite", accent: "#e8604a", background: "#1f1f1f", contrast: 25 },
  { id: "midnight", name: "Midnight", accent: "#7c8cf8", background: "#13151c", contrast: 35 },
  { id: "pitch", name: "Pitch", accent: "#e8604a", background: "#0a0a0a", contrast: 45 },
];
export const SYSTEM = "system";
export const CUSTOM = "custom";

export const defaultAppearance: Appearance = {
  interface: { preset: SYSTEM, ...pick("light") },
  sidebar: { enabled: false, preset: "graphite", ...pick("graphite") },
};

export function pick(id: string): Knobs {
  const p = presets.find((x) => x.id === id) ?? presets[0]!;
  return { accent: p.accent, background: p.background, contrast: p.contrast };
}

// ---- color math: sRGB only, which is all the knobs take ----

type Rgb = [number, number, number];

export function parseHex(hex: string): Rgb | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1]!;
  if (h.length === 3) h = h.replace(/./g, (c) => c + c);
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function toHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((n) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, "0")).join("")}`;
}

/** `t` of the way from a to b. */
function mix(a: Rgb, b: Rgb, t: number): Rgb {
  const k = Math.min(1, Math.max(0, t));
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

function alpha([r, g, b]: Rgb, a: number): string {
  return `rgb(${Math.round(r)} ${Math.round(g)} ${Math.round(b)} / ${Math.round(Math.min(1, Math.max(0, a)) * 100)}%)`;
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function luminance([r, g, b]: Rgb): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function isDark(background: string): boolean {
  const rgb = parseHex(background);
  return rgb ? luminance(rgb) < 0.35 : false;
}

const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];

/** Text on a color: white or near-black, whichever reads. */
export function onColor(c: Rgb | string): string {
  const rgb = typeof c === "string" ? (parseHex(c) ?? WHITE) : c;
  return luminance(rgb) > 0.45 ? "#111111" : "#ffffff";
}

// ---- the derivations ----

type Vars = Record<string, string>;

/** What both layers share: the background, which way is "ink", and the contrast as 0–1. */
function base(knobs: Knobs) {
  const bg = parseHex(knobs.background) ?? WHITE;
  const dark = luminance(bg) < 0.35;
  // ink keeps a trace of the background's hue, so a tinted theme's text and lines are tinted too
  const ink = mix(bg, dark ? WHITE : BLACK, 0.92);
  const accent = parseHex(knobs.accent) ?? parseHex("#e8604a")!;
  const k = Math.min(1, Math.max(0, knobs.contrast / 100));
  return { bg, dark, ink, accent, k };
}

/** The interface layer: the page and everything on it. */
export function interfaceVars(knobs: Knobs): Vars {
  const { bg, dark, ink, accent, k } = base(knobs);
  // cards lift off a dark page by getting lighter; on a light page they stay white and the shadow does it
  const card = dark ? mix(bg, WHITE, 0.015 + 0.04 * k) : mix(bg, WHITE, 0.5);
  const v: Vars = {
    "--background": toHex(bg),
    "--foreground": toHex(mix(bg, ink, 0.86 + 0.1 * k)),
    "--card": toHex(card),
    "--card-foreground": toHex(mix(bg, ink, 0.86 + 0.1 * k)),
    "--popover": toHex(card),
    "--popover-foreground": toHex(mix(bg, ink, 0.86 + 0.1 * k)),
    "--primary": toHex(mix(bg, ink, 0.9)),
    "--primary-foreground": toHex(mix(bg, ink, 0.02)),
    "--secondary": alpha(ink, 0.03 + 0.05 * k),
    "--secondary-foreground": toHex(mix(bg, ink, 0.86 + 0.1 * k)),
    "--muted": alpha(ink, 0.03 + 0.05 * k),
    "--muted-foreground": toHex(mix(bg, ink, 0.52 + 0.14 * k)),
    "--accent": alpha(ink, 0.03 + 0.05 * k),
    "--accent-foreground": toHex(mix(bg, ink, 0.9)),
    "--border": alpha(ink, 0.03 + 0.15 * k),
    "--input": alpha(ink, 0.05 + 0.18 * k),
    // focus rings are the accent (app.css); this is what is left for anything still on ring-ring
    "--ring": "var(--active)",
    // the window behind the card: a step away from the page, toward the ink
    "--app-bg": toHex(mix(bg, ink, 0.03 + 0.02 * k)),
    "--code": toHex(card),
    "--code-foreground": "var(--foreground)",
    "--code-highlight": alpha(ink, 0.03 + 0.05 * k),
    "--theme-accent": toHex(accent),
    "--theme-accent-foreground": onColor(accent),
    // the ui kit's own sidebar tokens, for anything built on components/ui/sidebar
    "--sidebar": toHex(mix(bg, ink, 0.03 + 0.02 * k)),
    "--sidebar-accent": alpha(ink, 0.03 + 0.05 * k),
    "--sidebar-accent-foreground": toHex(mix(bg, ink, 0.9)),
    "--sidebar-border": alpha(ink, 0.03 + 0.12 * k),
    "--sidebar-foreground": toHex(mix(bg, ink, 0.6)),
    "--sidebar-primary": toHex(mix(bg, ink, 0.9)),
    "--sidebar-primary-foreground": toHex(mix(bg, ink, 0.02)),
    "--sidebar-ring": toHex(mix(bg, ink, 0.4 + 0.25 * k)),
  };
  // the status colors are fixed per light and dark (Tailwind's), as before
  if (dark) {
    Object.assign(v, {
      "--destructive": "color-mix(in srgb, var(--color-red-500) 90%, var(--color-white))",
      "--destructive-foreground": "var(--color-red-400)",
      "--info": "var(--color-blue-500)",
      "--info-foreground": "var(--color-blue-400)",
      "--success": "var(--color-emerald-500)",
      "--success-foreground": "var(--color-emerald-400)",
      "--warning": "var(--color-amber-500)",
      "--warning-foreground": "var(--color-amber-400)",
      "--chart-1": "var(--color-blue-700)",
      "--chart-2": "var(--color-emerald-500)",
      "--chart-3": "var(--color-amber-500)",
      "--chart-4": "var(--color-purple-500)",
      "--chart-5": "var(--color-rose-500)",
    });
  } else {
    Object.assign(v, {
      "--destructive": "var(--color-red-500)",
      "--destructive-foreground": "var(--color-red-700)",
      "--info": "var(--color-blue-500)",
      "--info-foreground": "var(--color-blue-700)",
      "--success": "var(--color-emerald-500)",
      "--success-foreground": "var(--color-emerald-700)",
      "--warning": "var(--color-amber-500)",
      "--warning-foreground": "var(--color-amber-700)",
      "--chart-1": "var(--color-orange-600)",
      "--chart-2": "var(--color-teal-600)",
      "--chart-3": "var(--color-cyan-900)",
      "--chart-4": "var(--color-amber-400)",
      "--chart-5": "var(--color-amber-500)",
    });
  }
  return v;
}

/** The sidebar layer: the rail, the sub nav, the chat and the backdrop. */
export function sidebarVars(knobs: Knobs, ownAccent: boolean): Vars {
  const { bg, dark, ink, accent, k } = base(knobs);
  return {
    "--admin-bg": toHex(bg),
    // the second panel sits a step into the background; the raised surface (the composer) a step out
    "--admin-panel": toHex(mix(bg, BLACK, dark ? 0.14 + 0.16 * k : 0.015 + 0.035 * k)),
    "--admin-raised": toHex(dark ? mix(bg, WHITE, 0.06 + 0.06 * k) : mix(bg, WHITE, 0.55 + 0.45 * k)),
    "--admin-strong": toHex(mix(bg, ink, 0.96)),
    "--admin-fg": toHex(mix(bg, ink, 0.78 + 0.1 * k)),
    "--admin-muted": toHex(mix(bg, ink, 0.52 + 0.12 * k)),
    "--admin-dim": toHex(mix(bg, ink, 0.4 + 0.1 * k)),
    // quiet fills: the rail sits beside page-colored panels, so its rows mark themselves lightly
    "--admin-hover": alpha(ink, 0.025 + 0.035 * k),
    "--admin-active": alpha(ink, 0.05 + 0.06 * k),
    "--admin-line": alpha(ink, 0.05 + 0.1 * k),
    "--admin-ring": alpha(ink, 0.3 + 0.2 * k),
    // its own accent, or the interface's (which the workspace's own accent can override)
    "--admin-accent": ownAccent ? toHex(accent) : "var(--active)",
    "--admin-accent-foreground": ownAccent ? onColor(accent) : "var(--active-foreground)",
  };
}

/** The sidebar knobs that match an interface: its window color, accent and contrast. */
export function matchingSidebar(iface: Knobs): Knobs {
  const { bg, ink, k } = base(iface);
  return { accent: iface.accent, background: toHex(mix(bg, ink, 0.03 + 0.02 * k)), contrast: iface.contrast };
}

/** The interface knobs the choice resolves to; "system" follows `osDark`. */
export function resolveInterface(c: InterfaceChoice, osDark: boolean): Knobs {
  if (c.preset === SYSTEM) return pick(osDark ? "dark" : "light");
  if (c.preset === CUSTOM) return c;
  return pick(c.preset);
}

export function resolveSidebar(c: SidebarChoice, iface: Knobs): { knobs: Knobs; own: boolean } {
  if (!c.enabled) return { knobs: matchingSidebar(iface), own: false };
  if (c.preset === CUSTOM) return { knobs: c, own: true };
  return { knobs: pick(c.preset), own: true };
}

/** The whole theme as one stylesheet. html:root outranks the fallbacks in app.css. */
export function themeCss(a: Appearance, osDark: boolean): { css: string; dark: boolean; adminDark: boolean } {
  const iface = resolveInterface(a.interface, osDark);
  const side = resolveSidebar(a.sidebar, iface);
  const vars = { ...interfaceVars(iface), ...sidebarVars(side.knobs, side.own), "--active": "var(--theme-accent)", "--active-foreground": "var(--theme-accent-foreground)" };
  const body = Object.entries(vars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n");
  return { css: `html:root {\n${body}\n}\n`, dark: isDark(iface.background), adminDark: isDark(side.knobs.background) };
}

/** The knobs a choice shows in its controls (a preset's own values, or the custom ones). */
export function knobsOf(c: { preset: string } & Knobs, fallback: Knobs): Knobs {
  if (c.preset === CUSTOM) return c;
  return presets.some((x) => x.id === c.preset) ? pick(c.preset) : fallback;
}

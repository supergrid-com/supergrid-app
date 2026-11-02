import { foregroundFor, isDark, mix, ramp, SHADE_STEPS, shift } from "./color";
import { RADIUS_REM, SPACING_REM } from "./defaults";
import { fontStack, fontStylesheets } from "./fonts";
import type { Theme } from "./types";

// A theme → the CSS custom properties the kit reads. The names are the ones shadcn-style kits and
// the desktop app already use (`--primary`, `--radius`, `--font-sans`…) plus `--sg-*` for ramps and
// the few knobs the kit's data-slot rules read. Nothing here knows about components.

export type TokenMap = Record<string, string>;

const STATUS = { success: "#16a34a", warning: "#f59e0b", danger: "#dc2626", info: "#2563eb" };

/** Every variable a theme sets, without the leading `--`. */
export function themeToTokens(theme: Theme): TokenMap {
  const { colors: c, fonts } = theme;
  const dark = theme.mode === "dark" || isDark(c.background);
  const bg = c.background, fg = c.foreground;
  // tints are mixes of the foreground into the background, so they follow any background color
  const tint = (amount: number) => mix(bg, fg, amount);
  const soft = (hex: string) => mix(bg, hex, dark ? 0.14 : 0.1);
  const status = { success: c.success ?? STATUS.success, warning: c.warning ?? STATUS.warning, danger: c.danger ?? STATUS.danger, info: c.info ?? STATUS.info };
  const statusFg = (hex: string) => (dark ? shift(hex, 0.12) : shift(hex, -0.12));
  const t: TokenMap = {
    "sg-theme": theme.id,
    "sg-mode": theme.mode,
    // fonts
    "font-sans": fontStack(fonts.body),
    "font-heading": fontStack(fonts.heading),
    "font-accent": fontStack(fonts.accent ?? fonts.heading),
    "font-mono": fonts.mono ? fontStack(fonts.mono) : "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    // surfaces
    background: bg,
    foreground: fg,
    card: dark ? tint(0.03) : bg,
    "card-foreground": fg,
    popover: dark ? tint(0.05) : bg,
    "popover-foreground": fg,
    "app-bg": tint(0.025),
    // brand
    primary: c.primary,
    "primary-foreground": foregroundFor(c.primary),
    secondary: c.secondary,
    "secondary-foreground": foregroundFor(c.secondary),
    accent: c.accent,
    "accent-foreground": foregroundFor(c.accent),
    // the quiet layer: hover fills, muted text, lines
    muted: tint(0.045),
    "muted-foreground": mix(fg, bg, 0.4),
    border: tint(dark ? 0.12 : 0.09),
    input: tint(dark ? 0.16 : 0.12),
    ring: c.primary,
    // status
    destructive: status.danger,
    "destructive-foreground": statusFg(status.danger),
    success: status.success,
    "success-foreground": statusFg(status.success),
    warning: status.warning,
    "warning-foreground": statusFg(status.warning),
    info: status.info,
    "info-foreground": statusFg(status.info),
    // soft fills for badges and alerts
    "sg-primary-soft": soft(c.primary),
    "sg-secondary-soft": soft(c.secondary),
    "sg-accent-soft": soft(c.accent),
    // shape
    radius: RADIUS_REM[theme.radius],
    "radius-button": theme.buttons.radius === "pill" ? "9999px" : theme.buttons.radius === "square" ? "0px" : "var(--radius)",
    "radius-input": theme.inputs.radius === "pill" ? "9999px" : theme.inputs.radius === "square" ? "0px" : "var(--radius)",
    "radius-card": theme.radius === "full" ? "1.5rem" : "calc(var(--radius) * 1.6)",
    spacing: SPACING_REM[theme.spacing],
    // buttons and inputs: read by the kit's data-slot rules
    "sg-button-weight": theme.buttons.weight === "bold" ? "700" : theme.buttons.weight === "semibold" ? "600" : "500",
    "sg-button-transform": theme.buttons.uppercase ? "uppercase" : "none",
    "sg-button-tracking": `${theme.buttons.tracking ?? (theme.buttons.uppercase ? 0.04 : 0)}em`,
    "sg-button-shadow": theme.buttons.shadow === false ? "none" : "0 1px 2px 0 rgb(0 0 0 / 0.08)",
    "sg-input-bg": theme.inputs.style === "filled" ? "var(--muted)" : "var(--background)",
    "sg-input-border": theme.inputs.style === "filled" ? "transparent" : "var(--input)",
  };
  // ramps: brand colors, a neutral from the foreground, and the custom ones
  const ramps: Record<string, string> = { primary: c.primary, secondary: c.secondary, accent: c.accent, neutral: fg, ...(c.custom ?? {}) };
  for (const [name, hex] of Object.entries(ramps)) {
    const r = ramp(hex);
    t[`sg-${name}`] = hex;
    for (const s of SHADE_STEPS) t[`sg-${name}-${s}`] = r[s];
  }
  // assets, as url() values so a background-image can use them
  const a = theme.assets;
  if (a.logo) t["sg-logo"] = `url("${a.logo}")`;
  if (a.logoDark) t["sg-logo-dark"] = `url("${a.logoDark}")`;
  if (a.icon) t["sg-icon"] = `url("${a.icon}")`;
  return t;
}

export type CssOptions = {
  /** Where the variables land. `:root` for a whole page, a class for a scoped preview. */
  selector?: string;
  /** Add the `@import` lines for web fonts (only valid at the top of a stylesheet). */
  fonts?: boolean;
};

/** The stylesheet an app links or inlines. Pure variables plus `color-scheme`; the kit's rules live with the kit. */
export function themeToCss(theme: Theme, { selector = ":root", fonts = true }: CssOptions = {}): string {
  const tokens = themeToTokens(theme);
  const imports = fonts ? fontStylesheets([theme.fonts.heading, theme.fonts.body, ...(theme.fonts.accent ? [theme.fonts.accent] : []), ...(theme.fonts.mono ? [theme.fonts.mono] : [])]).map((u) => `@import url("${u}");`) : [];
  const vars = Object.entries(tokens).map(([k, v]) => `  --${k}: ${v};`).join("\n");
  return [...imports, `${selector} {`, `  color-scheme: ${theme.mode};`, vars, "}", ""].join("\n");
}

/** The same variables as a React `style` object, for a scoped preview container. */
export function themeToStyle(theme: Theme): Record<string, string> {
  const out: Record<string, string> = { colorScheme: theme.mode };
  for (const [k, v] of Object.entries(themeToTokens(theme))) out[`--${k}`] = v;
  return out;
}

/** The stylesheets a page must load for the theme's fonts; `themeToCss` already imports them. */
export function themeFontLinks(theme: Theme): string[] {
  return fontStylesheets([theme.fonts.heading, theme.fonts.body, ...(theme.fonts.accent ? [theme.fonts.accent] : []), ...(theme.fonts.mono ? [theme.fonts.mono] : [])]);
}

/** A short fingerprint of a theme, for ETags and cache keys. */
export function themeVersion(theme: Theme): string {
  const s = JSON.stringify(theme);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}

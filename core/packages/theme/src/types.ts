// The theme: everything a workspace's apps share about how they look. Runtime data, never build input.
// A theme compiles to CSS custom properties (see css.ts) that the base-ui kit (`@supergrid/ui`) and
// the desktop app's own components read, so changing a theme never rebuilds a component.

export type ThemeMode = "light" | "dark";

/** A font family and where it comes from. `google` families are loaded with one @import. */
export type FontSpec = {
  family: string;
  /** `google` loads from Google Fonts, `system` is a local or stack name, `custom` needs `url` (a stylesheet). */
  provider?: "google" | "system" | "custom";
  /** Weights to load for a Google font. Default 400, 500, 600, 700. */
  weights?: number[];
  /** A stylesheet URL for a `custom` provider. */
  url?: string;
};

export type ThemeFonts = {
  heading: FontSpec;
  body: FontSpec;
  /** Pull quotes, labels, eyebrow text. Falls back to heading. */
  accent?: FontSpec;
  /** Code. Falls back to a system monospace stack. */
  mono?: FontSpec;
};

/** A hex color, `#rrggbb`. */
export type Hex = string;

export type ThemeColors = {
  /** The brand color: primary buttons, links, focus rings. */
  primary: Hex;
  /** A second brand color, for secondary buttons and highlights. */
  secondary: Hex;
  /** A sparing emphasis color: badges, callouts, the active nav item. */
  accent: Hex;
  /** The page background and body text. */
  background: Hex;
  foreground: Hex;
  /** Status colors. Derived from sensible defaults when absent. */
  success?: Hex;
  warning?: Hex;
  danger?: Hex;
  info?: Hex;
  /** Named extra colors, each with a generated 50–950 ramp: `{ teal: "#0d9488" }` → `--sg-teal-500`. */
  custom?: Record<string, Hex>;
};

export type Radius = "none" | "sm" | "md" | "lg" | "xl" | "full";
export type Spacing = "tight" | "normal" | "relaxed";

export type ThemeButtons = {
  /** `theme` follows the theme radius; `pill` and `square` override it for buttons only. */
  radius?: "theme" | "pill" | "square";
  weight?: "medium" | "semibold" | "bold";
  uppercase?: boolean;
  /** Letter spacing in em; useful with uppercase. */
  tracking?: number;
  shadow?: boolean;
};

export type ThemeInputs = {
  /** `outline` is a bordered field on the background; `filled` sits on the muted surface. */
  style?: "outline" | "filled";
  radius?: "theme" | "pill" | "square";
};

export type ThemeAssets = {
  /** URLs or data URLs. The desktop editor stores picked files as data URLs until media lands in R2. */
  logo?: string;
  /** A logo for dark surfaces, when the main one does not work there. */
  logoDark?: string;
  favicon?: string;
  /** A square mark for app icons, avatars and social cards. */
  icon?: string;
  /** The image social previews use. */
  ogImage?: string;
};

export type Theme = {
  /** A slug, unique in the workspace: `default`, `dark`, `spring-test`. */
  id: string;
  name: string;
  mode: ThemeMode;
  fonts: ThemeFonts;
  colors: ThemeColors;
  radius: Radius;
  spacing: Spacing;
  buttons: ThemeButtons;
  inputs: ThemeInputs;
  assets: ThemeAssets;
  /** Free-form notes for people and agents: what the theme is for, what not to change. */
  notes?: string;
};

/** What a list shows: enough to pick one. */
export type ThemeSummary = { id: string; name: string; mode: ThemeMode; isDefault: boolean; updated_at: string | null; primary: Hex };

/** A theme as stored: the document plus its bookkeeping. */
export type ThemeRecord = { theme: Theme; isDefault: boolean; created_at: string | null; updated_at: string | null };

/** A partial theme, for patches: every branch optional, custom colors merged by key (null removes one). */
export type ThemePatch = {
  name?: string;
  mode?: ThemeMode;
  fonts?: Partial<ThemeFonts>;
  colors?: Partial<Omit<ThemeColors, "custom">> & { custom?: Record<string, Hex | null> };
  radius?: Radius;
  spacing?: Spacing;
  buttons?: ThemeButtons;
  inputs?: ThemeInputs;
  assets?: Partial<Record<keyof ThemeAssets, string | null>>;
  notes?: string | null;
};

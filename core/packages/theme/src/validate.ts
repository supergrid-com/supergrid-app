import { normalizeHex } from "./color";
import { defaultTheme } from "./defaults";
import type { FontSpec, Theme, ThemeAssets, ThemeButtons, ThemeColors, ThemeFonts, ThemeInputs, ThemePatch } from "./types";

// Hand-written checks: a theme comes from a form, an agent or an RPC call, and each problem is named
// so the caller can show it. `parseTheme` returns a clean copy or throws with every problem listed.

export class ThemeError extends Error {
  constructor(public problems: string[]) {
    super(problems.join("; "));
  }
}

export const THEME_ID = /^[a-z][a-z0-9-]{0,39}$/;
export const COLOR_KEY = /^[a-z][a-z0-9-]{0,29}$/;
const MAX_ASSET = 400_000;
const MAX_CUSTOM = 16;
const RADII = ["none", "sm", "md", "lg", "xl", "full"] as const;
const SPACINGS = ["tight", "normal", "relaxed"] as const;
const BTN_RADII = ["theme", "pill", "square"] as const;
const WEIGHTS = ["medium", "semibold", "bold"] as const;
const INPUT_STYLES = ["outline", "filled"] as const;

type Ctx = { problems: string[] };
const bad = (ctx: Ctx, msg: string) => { ctx.problems.push(msg); };
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

function enumOf<T extends string>(ctx: Ctx, v: unknown, name: string, list: readonly T[], dflt: T): T {
  if (v == null) return dflt;
  if (typeof v !== "string" || !list.includes(v as T)) { bad(ctx, `${name} must be one of ${list.join(", ")}`); return dflt; }
  return v as T;
}

function hex(ctx: Ctx, v: unknown, name: string, dflt?: string): string | undefined {
  if (v == null || v === "") return dflt;
  const h = normalizeHex(v);
  if (!h) { bad(ctx, `${name} must be a hex color like #3b5bdb`); return dflt; }
  return h;
}

function font(ctx: Ctx, v: unknown, name: string, dflt?: FontSpec): FontSpec | undefined {
  if (v == null) return dflt;
  if (typeof v === "string") v = { family: v };
  if (!isObj(v)) { bad(ctx, `${name} must be a font like { family: "Inter" }`); return dflt; }
  const family = typeof v.family === "string" ? v.family.trim() : "";
  if (!family || family.length > 120) { bad(ctx, `${name}.family is required (up to 120 characters)`); return dflt; }
  const out: FontSpec = { family };
  if (v.provider != null) out.provider = enumOf(ctx, v.provider, `${name}.provider`, ["google", "system", "custom"] as const, "google");
  if (v.weights != null) {
    if (!Array.isArray(v.weights) || v.weights.some((w) => typeof w !== "number" || w < 100 || w > 900)) bad(ctx, `${name}.weights must be numbers from 100 to 900`);
    else out.weights = [...new Set(v.weights as number[])].sort((a, b) => a - b);
  }
  if (v.url != null) {
    if (typeof v.url !== "string" || !/^https:\/\//.test(v.url) || v.url.length > 500) bad(ctx, `${name}.url must be an https URL`);
    else out.url = v.url;
  }
  if (out.provider === "custom" && !out.url) bad(ctx, `${name}.url is required for a custom font`);
  return out;
}

function asset(ctx: Ctx, v: unknown, name: string): string | undefined {
  if (v == null || v === "") return undefined;
  if (typeof v !== "string") { bad(ctx, `${name} must be a URL or data URL`); return undefined; }
  if (v.length > MAX_ASSET) { bad(ctx, `${name} is larger than ${Math.round(MAX_ASSET / 1000)} KB; upload it and use its URL`); return undefined; }
  if (!/^(https?:\/\/|data:image\/|\/)/.test(v)) { bad(ctx, `${name} must be an https URL, a /path, or a data:image URL`); return undefined; }
  return v;
}

function fonts(ctx: Ctx, v: unknown, base: ThemeFonts): ThemeFonts {
  if (v == null) return base;
  if (!isObj(v)) { bad(ctx, "fonts must be an object"); return base; }
  const out: ThemeFonts = { heading: font(ctx, v.heading, "fonts.heading", base.heading)!, body: font(ctx, v.body, "fonts.body", base.body)! };
  const accent = "accent" in v ? (v.accent === null ? undefined : font(ctx, v.accent, "fonts.accent", base.accent)) : base.accent;
  const mono = "mono" in v ? (v.mono === null ? undefined : font(ctx, v.mono, "fonts.mono", base.mono)) : base.mono;
  if (accent) out.accent = accent;
  if (mono) out.mono = mono;
  return out;
}

function colors(ctx: Ctx, v: unknown, base: ThemeColors): ThemeColors {
  if (v == null) return base;
  if (!isObj(v)) { bad(ctx, "colors must be an object"); return base; }
  const out: ThemeColors = {
    primary: hex(ctx, v.primary, "colors.primary", base.primary)!,
    secondary: hex(ctx, v.secondary, "colors.secondary", base.secondary)!,
    accent: hex(ctx, v.accent, "colors.accent", base.accent)!,
    background: hex(ctx, v.background, "colors.background", base.background)!,
    foreground: hex(ctx, v.foreground, "colors.foreground", base.foreground)!,
  };
  for (const k of ["success", "warning", "danger", "info"] as const) {
    const val = k in v ? (v[k] === null ? undefined : hex(ctx, v[k], `colors.${k}`)) : base[k];
    if (val) out[k] = val;
  }
  const custom: Record<string, string> = { ...(base.custom ?? {}) };
  if (v.custom != null) {
    if (!isObj(v.custom)) bad(ctx, "colors.custom must be an object of name → hex");
    else {
      for (const [k, val] of Object.entries(v.custom)) {
        if (!COLOR_KEY.test(k)) { bad(ctx, `colors.custom "${k}" must be a lowercase name like teal or brand-2`); continue; }
        if (val === null) { delete custom[k]; continue; }
        const h = hex(ctx, val, `colors.custom.${k}`);
        if (h) custom[k] = h;
      }
    }
  }
  if (Object.keys(custom).length > MAX_CUSTOM) bad(ctx, `colors.custom is limited to ${MAX_CUSTOM} colors`);
  if (Object.keys(custom).length) out.custom = custom;
  return out;
}

function buttons(ctx: Ctx, v: unknown, base: ThemeButtons): ThemeButtons {
  if (v == null) return base;
  if (!isObj(v)) { bad(ctx, "buttons must be an object"); return base; }
  const out: ThemeButtons = { ...base };
  if ("radius" in v) out.radius = enumOf(ctx, v.radius, "buttons.radius", BTN_RADII, "theme");
  if ("weight" in v) out.weight = enumOf(ctx, v.weight, "buttons.weight", WEIGHTS, "medium");
  if ("uppercase" in v) out.uppercase = v.uppercase === true;
  if ("shadow" in v) out.shadow = v.shadow !== false;
  if ("tracking" in v) {
    if (v.tracking == null) delete out.tracking;
    else if (typeof v.tracking !== "number" || v.tracking < -0.05 || v.tracking > 0.3) bad(ctx, "buttons.tracking is an em value from -0.05 to 0.3");
    else out.tracking = v.tracking;
  }
  return out;
}

function inputs(ctx: Ctx, v: unknown, base: ThemeInputs): ThemeInputs {
  if (v == null) return base;
  if (!isObj(v)) { bad(ctx, "inputs must be an object"); return base; }
  const out: ThemeInputs = { ...base };
  if ("style" in v) out.style = enumOf(ctx, v.style, "inputs.style", INPUT_STYLES, "outline");
  if ("radius" in v) out.radius = enumOf(ctx, v.radius, "inputs.radius", BTN_RADII, "theme");
  return out;
}

function assets(ctx: Ctx, v: unknown, base: ThemeAssets): ThemeAssets {
  if (v == null) return base;
  if (!isObj(v)) { bad(ctx, "assets must be an object"); return base; }
  const out: ThemeAssets = { ...base };
  for (const k of ["logo", "logoDark", "favicon", "icon", "ogImage"] as const) {
    if (!(k in v)) continue;
    const val = v[k] === null ? undefined : asset(ctx, v[k], `assets.${k}`);
    if (val) out[k] = val; else delete out[k];
  }
  return out;
}

/**
 * A clean theme from untrusted input. With `base`, the input is a patch over it (missing branches keep
 * the base's values, `null` removes an optional one); without, missing branches take the default theme's.
 */
export function parseTheme(input: unknown, base?: Theme): Theme {
  const ctx: Ctx = { problems: [] };
  const from = base ?? defaultTheme;
  if (!isObj(input)) throw new ThemeError(["a theme must be an object"]);
  const id = base ? base.id : typeof input.id === "string" ? input.id.trim().toLowerCase() : "";
  if (!THEME_ID.test(id)) bad(ctx, "id must be a slug like default, dark or spring-test (lowercase, up to 40 characters)");
  let name = typeof input.name === "string" ? input.name.trim() : base ? base.name : "";
  if (!name) { if (base) name = base.name; else bad(ctx, "name is required"); }
  if (name.length > 60) bad(ctx, "name is limited to 60 characters");
  const out: Theme = {
    id,
    name,
    mode: enumOf(ctx, input.mode, "mode", ["light", "dark"] as const, from.mode),
    fonts: fonts(ctx, input.fonts, from.fonts),
    colors: colors(ctx, input.colors, from.colors),
    radius: enumOf(ctx, input.radius, "radius", RADII, from.radius),
    spacing: enumOf(ctx, input.spacing, "spacing", SPACINGS, from.spacing),
    buttons: buttons(ctx, input.buttons, from.buttons),
    inputs: inputs(ctx, input.inputs, from.inputs),
    assets: assets(ctx, input.assets, from.assets),
  };
  if ("notes" in input) {
    if (input.notes == null || input.notes === "") { /* removed */ }
    else if (typeof input.notes !== "string" || input.notes.length > 4000) bad(ctx, "notes is text up to 4000 characters");
    else out.notes = input.notes;
  } else if (from.notes) out.notes = from.notes;
  if (ctx.problems.length) throw new ThemeError(ctx.problems);
  return out;
}

/** `parseTheme(patch, base)` with a typed patch. */
export const applyPatch = (base: Theme, patch: ThemePatch): Theme => parseTheme(patch as unknown, base);

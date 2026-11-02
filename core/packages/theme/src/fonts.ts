import type { FontSpec } from "./types";

// A curated list the editor offers. Anything else can be typed in: a Google family name, a system
// stack, or a custom stylesheet URL.
export type FontChoice = { family: string; provider: "google" | "system"; category: "sans" | "serif" | "display" | "mono"; stack?: string };

export const FONT_CHOICES: FontChoice[] = [
  { family: "Inter", provider: "google", category: "sans" },
  { family: "Geist", provider: "google", category: "sans" },
  { family: "DM Sans", provider: "google", category: "sans" },
  { family: "Manrope", provider: "google", category: "sans" },
  { family: "Plus Jakarta Sans", provider: "google", category: "sans" },
  { family: "Figtree", provider: "google", category: "sans" },
  { family: "Outfit", provider: "google", category: "sans" },
  { family: "Poppins", provider: "google", category: "sans" },
  { family: "Nunito", provider: "google", category: "sans" },
  { family: "Work Sans", provider: "google", category: "sans" },
  { family: "Source Sans 3", provider: "google", category: "sans" },
  { family: "IBM Plex Sans", provider: "google", category: "sans" },
  { family: "Lexend", provider: "google", category: "sans" },
  { family: "Space Grotesk", provider: "google", category: "display" },
  { family: "Bricolage Grotesque", provider: "google", category: "display" },
  { family: "Syne", provider: "google", category: "display" },
  { family: "Unbounded", provider: "google", category: "display" },
  { family: "Playfair Display", provider: "google", category: "serif" },
  { family: "DM Serif Display", provider: "google", category: "serif" },
  { family: "Instrument Serif", provider: "google", category: "serif" },
  { family: "Fraunces", provider: "google", category: "serif" },
  { family: "Lora", provider: "google", category: "serif" },
  { family: "Merriweather", provider: "google", category: "serif" },
  { family: "Source Serif 4", provider: "google", category: "serif" },
  { family: "JetBrains Mono", provider: "google", category: "mono" },
  { family: "IBM Plex Mono", provider: "google", category: "mono" },
  { family: "Geist Mono", provider: "google", category: "mono" },
  { family: "Fira Code", provider: "google", category: "mono" },
  { family: "System", provider: "system", category: "sans", stack: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" },
  { family: "Georgia", provider: "system", category: "serif", stack: "Georgia, 'Times New Roman', serif" },
  { family: "System mono", provider: "system", category: "mono", stack: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" },
];

const FALLBACK: Record<FontChoice["category"], string> = {
  sans: "ui-sans-serif, system-ui, sans-serif",
  serif: "ui-serif, Georgia, serif",
  display: "ui-sans-serif, system-ui, sans-serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
};

export const DEFAULT_WEIGHTS = [400, 500, 600, 700];

export function fontChoice(family: string): FontChoice | undefined {
  return FONT_CHOICES.find((f) => f.family.toLowerCase() === family.trim().toLowerCase());
}

/** The `font-family` value for a spec: quoted family plus a generic fallback stack. */
export function fontStack(spec: FontSpec): string {
  const choice = fontChoice(spec.family);
  if (choice?.provider === "system" && choice.stack) return choice.stack;
  if (/,/.test(spec.family)) return spec.family; // already a stack
  const category = choice?.category ?? (spec.provider === "system" ? "sans" : "sans");
  const fam = /^[\w-]+$/.test(spec.family) ? spec.family : `'${spec.family.replace(/'/g, "")}'`;
  return `${fam}, ${FALLBACK[category]}`;
}

/** Whether a spec needs Google Fonts: declared, or a known Google family with no provider given. */
export function isGoogle(spec: FontSpec): boolean {
  if (spec.provider === "google") return true;
  if (spec.provider) return false;
  return fontChoice(spec.family)?.provider === "google";
}

/** One stylesheet URL for every Google font a theme uses, or null when it uses none. */
export function googleFontsUrl(specs: FontSpec[]): string | null {
  const families = new Map<string, Set<number>>();
  for (const s of specs) {
    if (!isGoogle(s)) continue;
    const set = families.get(s.family) ?? new Set<number>();
    for (const w of s.weights?.length ? s.weights : DEFAULT_WEIGHTS) set.add(w);
    families.set(s.family, set);
  }
  if (!families.size) return null;
  const parts = [...families].map(([family, weights]) => `family=${encodeURIComponent(family).replace(/%20/g, "+")}:wght@${[...weights].sort((a, b) => a - b).join(";")}`);
  return `https://fonts.googleapis.com/css2?${parts.join("&")}&display=swap`;
}

/** Every stylesheet a theme's fonts need: the Google one and any custom URLs. */
export function fontStylesheets(specs: FontSpec[]): string[] {
  const out: string[] = [];
  const g = googleFontsUrl(specs);
  if (g) out.push(g);
  for (const s of specs) if (s.provider === "custom" && s.url && !out.includes(s.url)) out.push(s.url);
  return out;
}

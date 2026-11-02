import type { Theme } from "./types";

/** The theme a workspace starts with. Neutral enough to look fine anywhere; the first thing a user changes is `colors.primary`. */
export const defaultTheme: Theme = {
  id: "default",
  name: "Default",
  mode: "light",
  fonts: { heading: { family: "Inter", provider: "google" }, body: { family: "Inter", provider: "google" }, mono: { family: "JetBrains Mono", provider: "google" } },
  colors: { primary: "#3b5bdb", secondary: "#0f766e", accent: "#f59e0b", background: "#ffffff", foreground: "#171717" },
  radius: "md",
  spacing: "normal",
  buttons: { radius: "theme", weight: "medium", uppercase: false, shadow: true },
  inputs: { style: "outline", radius: "theme" },
  assets: {},
};

/** A dark counterpart with the same brand colors, for "add a dark theme". */
export const darkTheme: Theme = {
  ...defaultTheme,
  id: "dark",
  name: "Dark",
  mode: "dark",
  colors: { ...defaultTheme.colors, primary: "#748ffc", secondary: "#2dd4bf", accent: "#fbbf24", background: "#0b0b0f", foreground: "#ededf0" },
};

export const RADIUS_REM: Record<Theme["radius"], string> = { none: "0rem", sm: "0.25rem", md: "0.5rem", lg: "0.75rem", xl: "1rem", full: "1.25rem" };
/** The base unit Tailwind's spacing utilities multiply: `--spacing`. */
export const SPACING_REM: Record<Theme["spacing"], string> = { tight: "0.225rem", normal: "0.25rem", relaxed: "0.29rem" };

import * as React from "react";
import type { Mode } from "../../src/types";

// What every page inside the shell knows about the signed-in user and the platform. Comes from
// the shell route's loader (the settings table and the session) and is read with usePlatform().
export type PlatformData = {
  branding: { name: string; accent: string };
  mode: Mode;
  user: { id: string; name: string; email: string; initials: string; operator: boolean; impersonated: boolean };
  /** The organizations the user belongs to (every organization for the operator). */
  orgs: { id: string; name: string }[];
  activeOrgId: string | null;
  /** The workspaces the user can open. */
  workspaces: { id: string; name: string }[];
  /** May open the Organization page. */
  canOrg: boolean;
  /** How many parts have an update waiting. Operators only. */
  updates: number;
  /** Cloudflare is connected. */
  connected: boolean;
};

// UI-only state, kept in localStorage: the color theme and the side nav.
type Theme = "light" | "dark" | "system";

export const NAV_DEFAULT_WIDTH = 272;
export const NAV_MIN_WIDTH = 220;
export const NAV_MAX_WIDTH = 420;

type PlatformState = PlatformData & {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  navDocked: boolean;
  setNavDocked: (v: boolean) => void;
  navOpen: boolean;
  setNavOpen: (v: boolean) => void;
  navWidth: number;
  setNavWidth: (w: number) => void;
};

const PlatformContext = React.createContext<PlatformState | null>(null);

function read<T extends string>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    return (window.localStorage.getItem(key) as T) || fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {}
}

function applyTheme(theme: Theme): void {
  const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("") || "?";
}

export function PlatformProvider({ data, children }: { data: PlatformData; children: React.ReactNode }): React.ReactElement {
  const [theme, setThemeState] = React.useState<Theme>("system");
  const [navDocked, setNavDockedState] = React.useState(false);
  const [navOpen, setNavOpen] = React.useState(false);
  const [navWidth, setNavWidthState] = React.useState(NAV_DEFAULT_WIDTH);

  React.useEffect(() => {
    setThemeState(read("sg.theme", "system"));
    setNavDockedState(read<string>("sg.navDocked", "0") === "1");
    const w = Number(read<string>("sg.navWidth", String(NAV_DEFAULT_WIDTH)));
    if (Number.isFinite(w)) setNavWidthState(Math.min(NAV_MAX_WIDTH, Math.max(NAV_MIN_WIDTH, w)));
  }, []);

  const setTheme = React.useCallback((t: Theme) => {
    setThemeState(t);
    write("sg.theme", t);
    applyTheme(t);
  }, []);
  const setNavDocked = React.useCallback((v: boolean) => {
    setNavDockedState(v);
    setNavOpen(false);
    write("sg.navDocked", v ? "1" : "0");
  }, []);
  const setNavWidth = React.useCallback((w: number) => {
    const v = Math.round(Math.min(NAV_MAX_WIDTH, Math.max(NAV_MIN_WIDTH, w)));
    setNavWidthState(v);
    write("sg.navWidth", String(v));
  }, []);

  const value = React.useMemo(
    () => ({ ...data, theme, setTheme, navDocked, setNavDocked, navOpen, setNavOpen, navWidth, setNavWidth }),
    [data, theme, setTheme, navDocked, setNavDocked, navOpen, navWidth, setNavWidth],
  );
  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}

export function usePlatform(): PlatformState {
  const ctx = React.useContext(PlatformContext);
  if (!ctx) throw new Error("usePlatform must be used inside PlatformProvider");
  return ctx;
}

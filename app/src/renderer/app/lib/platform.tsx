import * as React from "react";
import { type Mode, orgs } from "~/lib/mock";

// UI-only state for the POC: the platform mode, the active organization, the color theme and
// the side nav. In the real platform these come from the settings table and the session.

type Theme = "light" | "dark" | "system";
// The admin layer behind a workspace's cards: see the themes in app.css.
export const adminThemes = [
  { id: "auto", name: "Match appearance", swatch: "#f5f5f3" },
  { id: "graphite", name: "Graphite", swatch: "#171717" },
  { id: "mist", name: "Mist", swatch: "#e9e9ec" },
  { id: "blush", name: "Blush", swatch: "#f4e1e8" },
  { id: "forest", name: "Forest", swatch: "#0f2a1f" },
] as const;
export type AdminTheme = (typeof adminThemes)[number]["id"];
// The workspace rail is either full width or icons only (⌘B).
export type RailState = "open" | "collapsed";

export const NAV_DEFAULT_WIDTH = 272;
// the side chat panel in a workspace
// the second panel beside the rail
export const SUB_NAV_DEFAULT_WIDTH = 272;
export const SUB_NAV_MIN_WIDTH = 208;
export const SUB_NAV_MAX_WIDTH = 420;
export const CHAT_SIDE_DEFAULT_WIDTH = 420;
export const CHAT_SIDE_MIN_WIDTH = 320;
export const CHAT_SIDE_MAX_WIDTH = 720;
export const NAV_MIN_WIDTH = 220;
export const NAV_MAX_WIDTH = 420;

type PlatformState = {
  mode: Mode;
  setMode: (mode: Mode) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  orgId: string;
  setOrgId: (id: string) => void;
  navDocked: boolean;
  setNavDocked: (v: boolean) => void;
  navOpen: boolean;
  setNavOpen: (v: boolean) => void;
  navWidth: number;
  setNavWidth: (w: number) => void;
  railState: RailState;
  setRailState: (v: RailState) => void;
  chatWidth: number;
  setChatWidth: (w: number) => void;
  subNavWidth: number;
  setSubNavWidth: (w: number) => void;
  adminTheme: AdminTheme;
  setAdminTheme: (t: AdminTheme) => void;
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

function applyAdminTheme(t: AdminTheme): void {
  document.documentElement.setAttribute("data-admin-theme", t);
}

function applyTheme(theme: Theme): void {
  const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function PlatformProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [mode, setModeState] = React.useState<Mode>("agency");
  const [theme, setThemeState] = React.useState<Theme>("system");
  const [orgId, setOrgIdState] = React.useState<string>(orgs[0].id);
  const [navDocked, setNavDockedState] = React.useState(false);
  const [navOpen, setNavOpen] = React.useState(false);
  const [navWidth, setNavWidthState] = React.useState(NAV_DEFAULT_WIDTH);
  const [railState, setRailStateRaw] = React.useState<RailState>("open");
  const [chatWidth, setChatWidthRaw] = React.useState(CHAT_SIDE_DEFAULT_WIDTH);
  const [subNavWidth, setSubNavWidthRaw] = React.useState(SUB_NAV_DEFAULT_WIDTH);
  const [adminTheme, setAdminThemeRaw] = React.useState<AdminTheme>("auto");

  React.useEffect(() => {
    setModeState(read("sg.mode", "agency"));
    setRailStateRaw(read<RailState>("sg.rail", "open"));
    const at = read<AdminTheme>("sg.adminTheme", "auto");
    setAdminThemeRaw(at);
    applyAdminTheme(at);
    const sw = Number(read<string>("sg.subNavWidth", String(SUB_NAV_DEFAULT_WIDTH)));
    if (Number.isFinite(sw)) setSubNavWidthRaw(Math.min(SUB_NAV_MAX_WIDTH, Math.max(SUB_NAV_MIN_WIDTH, sw)));
    const cw = Number(read<string>("sg.chatWidth", String(CHAT_SIDE_DEFAULT_WIDTH)));
    if (Number.isFinite(cw)) setChatWidthRaw(Math.min(CHAT_SIDE_MAX_WIDTH, Math.max(CHAT_SIDE_MIN_WIDTH, cw)));
    setThemeState(read("sg.theme", "system"));
    setOrgIdState(read("sg.org", orgs[0].id));
    setNavDockedState(read<string>("sg.navDocked", "0") === "1");
    const w = Number(read<string>("sg.navWidth", String(NAV_DEFAULT_WIDTH)));
    if (Number.isFinite(w)) setNavWidthState(Math.min(NAV_MAX_WIDTH, Math.max(NAV_MIN_WIDTH, w)));
  }, []);

  const setMode = React.useCallback((m: Mode) => {
    setModeState(m);
    write("sg.mode", m);
  }, []);
  const setTheme = React.useCallback((t: Theme) => {
    setThemeState(t);
    write("sg.theme", t);
    applyTheme(t);
  }, []);
  const setOrgId = React.useCallback((id: string) => {
    setOrgIdState(id);
    write("sg.org", id);
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
  const setAdminTheme = React.useCallback((t: AdminTheme) => {
    setAdminThemeRaw(t);
    write("sg.adminTheme", t);
    applyAdminTheme(t);
  }, []);
  const setChatWidth = React.useCallback((w: number) => {
    const v = Math.round(Math.min(CHAT_SIDE_MAX_WIDTH, Math.max(CHAT_SIDE_MIN_WIDTH, w)));
    setChatWidthRaw(v);
    write("sg.chatWidth", String(v));
  }, []);
  const setSubNavWidth = React.useCallback((w: number) => {
    const v = Math.round(Math.min(SUB_NAV_MAX_WIDTH, Math.max(SUB_NAV_MIN_WIDTH, w)));
    setSubNavWidthRaw(v);
    write("sg.subNavWidth", String(v));
  }, []);
  const setRailState = React.useCallback((v: RailState) => {
    setRailStateRaw(v);
    write("sg.rail", v);
  }, []);

  const value = React.useMemo(
    () => ({ mode, setMode, theme, setTheme, orgId, setOrgId, navDocked, setNavDocked, navOpen, setNavOpen, navWidth, setNavWidth, railState, setRailState, chatWidth, setChatWidth, subNavWidth, setSubNavWidth, adminTheme, setAdminTheme }),
    [mode, setMode, theme, setTheme, orgId, setOrgId, navDocked, setNavDocked, navOpen, navWidth, setNavWidth, railState, setRailState, chatWidth, setChatWidth, subNavWidth, setSubNavWidth, adminTheme, setAdminTheme],
  );
  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}

export function usePlatform(): PlatformState {
  const ctx = React.useContext(PlatformContext);
  if (!ctx) throw new Error("usePlatform must be used inside PlatformProvider");
  return ctx;
}

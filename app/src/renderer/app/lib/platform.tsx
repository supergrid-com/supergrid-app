import * as React from "react";
import { type Appearance, defaultAppearance, type InterfaceChoice, presets, type SidebarChoice, themeCss } from "~/lib/theme";

// The window's own preferences, kept in localStorage: the appearance (the interface and sidebar
// themes, lib/theme.ts) and the rail's and panels' sizes.

export type { Appearance };
// The workspace rail is either full width or icons only (⌘B).
export type RailState = "open" | "collapsed";

export const NAV_DEFAULT_WIDTH = 256;
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
  appearance: Appearance;
  setInterface: (c: InterfaceChoice) => void;
  setSidebar: (c: SidebarChoice) => void;
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
  /** Whether the page is dark (the interface's background). */
  pageDark: boolean;
  /** Whether the sidebar layer is dark, which the chat follows rather than the page theme. */
  adminDark: boolean;
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

const APPEARANCE_KEY = "sg.appearance";

function readAppearance(): Appearance {
  try {
    const raw = window.localStorage.getItem(APPEARANCE_KEY);
    if (raw) {
      const a = JSON.parse(raw) as Partial<Appearance>;
      if (a.interface && a.sidebar) {
        // before the toggle, "match" was a preset of its own
        const side = { ...defaultAppearance.sidebar, ...a.sidebar } as SidebarChoice & { preset: string };
        if (!("enabled" in a.sidebar)) side.enabled = side.preset !== "match";
        if (side.preset === "match") side.preset = defaultAppearance.sidebar.preset;
        // a preset that is gone keeps its knobs as Custom
        else if (side.preset !== "custom" && !presets.some((p) => p.id === side.preset)) side.preset = "custom";
        return { interface: { ...defaultAppearance.interface, ...a.interface }, sidebar: side };
      }
    }
    // the setting before themes had knobs: light, dark or system. applyAppearance writes the same key for index.html on
    // every start, along with the theme's stylesheet, which the old setting never had; so it's only the old one without it
    const old = window.localStorage.getItem("sg.theme");
    const legacy = window.localStorage.getItem("sg.theme.css") === null;
    if (legacy && (old === "light" || old === "dark")) return { ...defaultAppearance, interface: { ...defaultAppearance.interface, preset: old } };
  } catch {}
  return defaultAppearance;
}

/**
 * Writes the theme's stylesheet into the document and remembers it, so index.html can put it
 * back before the first paint. The dark class follows the interface's background.
 */
function applyAppearance(a: Appearance): { dark: boolean; adminDark: boolean } {
  const osDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const { css, dark, adminDark } = themeCss(a, osDark);
  let el = document.getElementById("sg-theme") as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = "sg-theme";
    document.head.appendChild(el);
  }
  if (el.textContent !== css) el.textContent = css;
  document.documentElement.classList.toggle("dark", dark);
  write("sg.theme", a.interface.preset === "system" ? "system" : dark ? "dark" : "light");
  write("sg.theme.dark", dark ? "1" : "0");
  write("sg.theme.css", css);
  return { dark, adminDark };
}

export function PlatformProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [appearance, setAppearanceState] = React.useState<Appearance>(readAppearance);
  const [navDocked, setNavDockedState] = React.useState(false);
  const [navOpen, setNavOpen] = React.useState(false);
  const [navWidth, setNavWidthState] = React.useState(NAV_DEFAULT_WIDTH);
  const [railState, setRailStateRaw] = React.useState<RailState>("open");
  const [chatWidth, setChatWidthRaw] = React.useState(CHAT_SIDE_DEFAULT_WIDTH);
  const [subNavWidth, setSubNavWidthRaw] = React.useState(SUB_NAV_DEFAULT_WIDTH);

  React.useEffect(() => {
    setRailStateRaw(read<RailState>("sg.rail", "open"));
    const sw = Number(read<string>("sg.subNavWidth", String(SUB_NAV_DEFAULT_WIDTH)));
    if (Number.isFinite(sw)) setSubNavWidthRaw(Math.min(SUB_NAV_MAX_WIDTH, Math.max(SUB_NAV_MIN_WIDTH, sw)));
    const cw = Number(read<string>("sg.chatWidth", String(CHAT_SIDE_DEFAULT_WIDTH)));
    if (Number.isFinite(cw)) setChatWidthRaw(Math.min(CHAT_SIDE_MAX_WIDTH, Math.max(CHAT_SIDE_MIN_WIDTH, cw)));
    setNavDockedState(read<string>("sg.navDocked", "0") === "1");
    const w = Number(read<string>("sg.navWidth", String(NAV_DEFAULT_WIDTH)));
    if (Number.isFinite(w)) setNavWidthState(Math.min(NAV_MAX_WIDTH, Math.max(NAV_MIN_WIDTH, w)));
  }, []);

  // the theme, applied: System follows the OS, including while the app is open
  const [resolved, setResolved] = React.useState(() => ({ dark: document.documentElement.classList.contains("dark"), adminDark: document.documentElement.classList.contains("dark") }));
  React.useEffect(() => {
    const os = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setResolved(applyAppearance(appearance));
    update();
    os.addEventListener("change", update);
    return () => os.removeEventListener("change", update);
  }, [appearance]);

  const setAppearance = React.useCallback((a: Appearance) => {
    setAppearanceState(a);
    write(APPEARANCE_KEY, JSON.stringify(a));
  }, []);
  const setInterface = React.useCallback((c: InterfaceChoice) => setAppearance({ ...appearance, interface: c }), [appearance, setAppearance]);
  const setSidebar = React.useCallback((c: SidebarChoice) => setAppearance({ ...appearance, sidebar: c }), [appearance, setAppearance]);
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
    () => ({ appearance, setInterface, setSidebar, navDocked, setNavDocked, navOpen, setNavOpen, navWidth, setNavWidth, railState, setRailState, chatWidth, setChatWidth, subNavWidth, setSubNavWidth, pageDark: resolved.dark, adminDark: resolved.adminDark }),
    [appearance, setInterface, setSidebar, navDocked, setNavDocked, navOpen, navWidth, setNavWidth, railState, setRailState, chatWidth, setChatWidth, subNavWidth, setSubNavWidth, resolved],
  );
  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}

export function usePlatform(): PlatformState {
  const ctx = React.useContext(PlatformContext);
  if (!ctx) throw new Error("usePlatform must be used inside PlatformProvider");
  return ctx;
}

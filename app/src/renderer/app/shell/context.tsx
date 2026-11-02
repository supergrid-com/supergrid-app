import * as React from "react";
import { useOutletContext, useSearchParams } from "react-router";
import type { WorkspaceSummary } from "~/lib/workspaces";
import type { OrgSectionId } from "~/shell/sections";

// What the workspace shell shares with its pages and panels: the workspace and the agent panel
// toggle. A page's title and actions reach the title bar through FrameSlots (workspace/frame.tsx).

export type Shell = {
  ws: WorkspaceSummary;
  agentOpen: boolean;
  toggleAgent: () => void;
};

export const ShellContext = React.createContext<Shell | null>(null);

export function useShell(): Shell {
  const s = React.useContext(ShellContext);
  if (!s) throw new Error("useShell outside the workspace shell");
  return s;
}

/** The organization modal lives in the URL (?org=<section>), so it opens over any page and back closes it. */
export function useOrgModal(): { section: OrgSectionId | null; open: (section?: OrgSectionId) => void; close: () => void } {
  const [params, setParams] = useSearchParams();
  const section = (params.get("org") as OrgSectionId | null) ?? null;
  const open = React.useCallback(
    (s: OrgSectionId = "workspaces") =>
      setParams((p) => {
        p.set("org", s);
        return p;
      }),
    [setParams],
  );
  const close = React.useCallback(
    () =>
      setParams((p) => {
        p.delete("org");
        return p;
      }),
    [setParams],
  );
  return { section, open, close };
}

/** A boolean kept in localStorage, for the shell's own toggles. */
export function useStoredFlag(key: string, fallback: boolean): [boolean, (v: boolean) => void] {
  const [value, setValue] = React.useState(() => {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : v === "1";
    } catch {
      return fallback;
    }
  });
  const set = React.useCallback(
    (v: boolean) => {
      setValue(v);
      try {
        localStorage.setItem(key, v ? "1" : "0");
      } catch {}
    },
    [key],
  );
  return [value, set];
}

/** Opens the sidebar over the page on a narrow window; the shell passes it to its pages. */
export function useOpenNav(): () => void {
  return useOutletContext<{ onOpenNav: () => void } | undefined>()?.onOpenNav ?? (() => {});
}

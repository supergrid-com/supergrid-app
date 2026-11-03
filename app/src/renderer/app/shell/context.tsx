import * as React from "react";
import { useOutletContext, useSearchParams } from "react-router";
import type { WorkspaceSummary } from "~/lib/workspaces";
import type { SettingsSectionId } from "~/shell/sections";

// What the workspace shell shares with its pages and panels: the workspace, the agent panel
// toggle and the thread it shows. A page's title and actions reach the title bar through FrameSlots (workspace/frame.tsx).

export type Shell = {
  ws: WorkspaceSummary;
  agentOpen: boolean;
  toggleAgent: () => void;
  /** The agent thread shown in its panel; null is a new thread. */
  threadId: string | null;
  /** Opens the agent panel on a thread, or on a new one with null. */
  openThread: (id: string | null) => void;
};

export const ShellContext = React.createContext<Shell | null>(null);

export function useShell(): Shell {
  const s = React.useContext(ShellContext);
  if (!s) throw new Error("useShell outside the workspace shell");
  return s;
}

/** The settings modal lives in the URL (?org=<section>), so it opens over any page and back closes it. */
export function useOrgModal(): { section: SettingsSectionId | null; open: (section?: SettingsSectionId, opts?: { create?: boolean }) => void; close: () => void } {
  const [params, setParams] = useSearchParams();
  const section = (params.get("org") as SettingsSectionId | null) ?? null;
  const open = React.useCallback(
    (s: SettingsSectionId = "general", opts?: { create?: boolean }) =>
      setParams((p) => {
        p.set("org", s);
        // `create` opens the workspaces section straight on its New workspace form
        if (opts?.create) p.set("create", "1");
        else p.delete("create");
        return p;
      }),
    [setParams],
  );
  const close = React.useCallback(
    () =>
      setParams((p) => {
        p.delete("org");
        p.delete("create");
        return p;
      }),
    [setParams],
  );
  return { section, open, close };
}

/** The docs modal, in the URL like settings (?docs=<page id>). */
export function useDocsModal(): { page: string | null; open: (page?: string) => void; close: () => void } {
  const [params, setParams] = useSearchParams();
  const page = params.get("docs");
  const open = React.useCallback(
    (id = "overview") =>
      setParams((p) => {
        p.set("docs", id);
        return p;
      }),
    [setParams],
  );
  const close = React.useCallback(
    () =>
      setParams((p) => {
        p.delete("docs");
        return p;
      }),
    [setParams],
  );
  return { page, open, close };
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

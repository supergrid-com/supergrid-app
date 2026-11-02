import * as React from "react";
import { useSearchParams } from "react-router";

// A workspace shows one page at a time, picked from the sidebar, like a
// traditional admin. The page lives in the URL:
//   /w/acme?page=contacts:c_lena   /w/acme?page=workflows:wf_1:runs   /w/acme?page=settings:theme
// No page means home. Keys split on ":", so ids are `[a-z0-9_-]` and `segment` / `new` / `runs`
// are reserved words inside a key.

export type WorkspacePage =
  | { kind: "home" }
  /** The list, one contact, or the list narrowed to a segment. */
  | { kind: "contacts"; id?: string; segment?: string }
  /** A custom object type's list, or one record (`new` for a blank one). */
  | { kind: "objects"; type: string; id?: string }
  /** The list, or one workflow (`new` for a blank one) on its editor or runs tab. */
  | { kind: "workflows"; id?: string; tab?: "editor" | "runs" }
  | { kind: "hooks" }
  | { kind: "secrets" }
  | { kind: "analytics" }
  /** Assets: the library, one asset open in its sheet, or the analytics tab. */
  | { kind: "media"; id?: string; tab?: "analytics" }
  | { kind: "design" }
  | { kind: "settings"; section?: SettingsSection };

// Pages that are just themselves: no id, no sub items.
export const simplePages = ["hooks", "secrets", "analytics", "design"] as const;
export type SimplePage = (typeof simplePages)[number];

// The settings sub nav, like Shopify's: one page per section.
export const settingsSections = ["general", "events", "theme", "secrets"] as const;
export type SettingsSection = (typeof settingsSections)[number];

export function pageKey(p: WorkspacePage): string {
  switch (p.kind) {
    case "home":
      return "";
    case "contacts":
      return p.id ? `contacts:${p.id}` : p.segment ? `contacts:segment:${p.segment}` : "contacts";
    case "objects":
      return p.id ? `objects:${p.type}:${p.id}` : `objects:${p.type}`;
    case "workflows":
      return p.id ? (p.tab === "runs" ? `workflows:${p.id}:runs` : `workflows:${p.id}`) : "workflows";
    case "media":
      return p.id ? `media:${p.id}` : p.tab === "analytics" ? "media:analytics" : "media";
    case "settings":
      return p.section ? `settings:${p.section}` : "settings";
    default:
      return p.kind;
  }
}

export function parsePage(s: string | null): WorkspacePage {
  if (!s) return { kind: "home" };
  const [kind, a, ...rest] = s.split(":");
  const b = rest.join(":");
  if (kind === "contacts") return a === "segment" ? { kind, segment: b || undefined } : { kind, id: a || undefined };
  if (kind === "objects" && a) return { kind, type: a, id: b || undefined };
  if (kind === "workflows") return a ? { kind, id: a, tab: rest[0] === "runs" ? "runs" : undefined } : { kind };
  if (kind === "media") return a === "analytics" ? { kind, tab: "analytics" } : a ? { kind, id: a } : { kind };
  if (kind === "settings") return { kind, section: (settingsSections as readonly string[]).includes(a) ? (a as SettingsSection) : undefined };
  if ((simplePages as readonly string[]).includes(kind)) return { kind: kind as SimplePage };
  return { kind: "home" };
}

export function pageHref(wsId: string, p: WorkspacePage): string {
  const k = pageKey(p);
  return k ? `/w/${wsId}?page=${encodeURIComponent(k)}` : `/w/${wsId}`;
}

export type WorkspacePageApi = {
  page: WorkspacePage;
  // `side` changes the side chat in the same update: a value opens it, null closes it
  go: (p: WorkspacePage, opts?: { side?: string | null }) => void;
  is: (kind: WorkspacePage["kind"]) => boolean;
};

export function useWorkspacePage(): WorkspacePageApi {
  const [sp, setSp] = useSearchParams();
  const page = React.useMemo(() => parsePage(sp.get("page")), [sp]);
  const go = React.useCallback(
    (p: WorkspacePage, opts?: { side?: string | null }) => {
      setSp(
        (prev) => {
          const n = new URLSearchParams(prev);
          const k = pageKey(p);
          if (k) n.set("page", k);
          else n.delete("page");
          if (opts && "side" in opts) {
            if (opts.side) n.set("side", opts.side);
            else n.delete("side");
          }
          return n;
        },
        { preventScrollReset: true },
      );
    },
    [setSp],
  );
  return { page, go, is: (kind) => page.kind === kind };
}

// The side chat: a panel on the right of whatever page is open, kept in the URL as
// `?side=chat` (new) or `?side=chat:c_funnel`, so it survives navigation within the workspace.
export type SideChat = { id?: string };

export function useSideChat(): { side: SideChat | undefined; open: (id?: string) => void; close: () => void } {
  const [sp, setSp] = useSearchParams();
  const raw = sp.get("side");
  const side = React.useMemo<SideChat | undefined>(() => {
    if (!raw) return undefined;
    const [kind, id] = raw.split(":");
    return kind === "chat" ? { id: id || undefined } : undefined;
  }, [raw]);
  const set = React.useCallback(
    (value: string | null) =>
      setSp(
        (prev) => {
          const n = new URLSearchParams(prev);
          if (value) n.set("side", value);
          else n.delete("side");
          return n;
        },
        { preventScrollReset: true },
      ),
    [setSp],
  );
  return {
    side,
    open: React.useCallback((id?: string) => set(id ? `chat:${id}` : "chat"), [set]),
    close: React.useCallback(() => set(null), [set]),
  };
}

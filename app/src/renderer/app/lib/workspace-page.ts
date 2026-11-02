import * as React from "react";
import { useSearchParams } from "react-router";
import type { AppId } from "~/lib/mock";

// A workspace shows one page at a time, picked from the sidebar, like a
// traditional admin. The page lives in the URL:
//   /w/acme?page=app:pages:nav/header   /w/acme?page=data:contacts
// No page means home.

export type WorkspacePage =
  | { kind: "home" }
  | { kind: "data"; table?: string }
  | { kind: "app"; app: AppId; path?: string }
  | { kind: "workflows" }
  | { kind: "files" }
  | { kind: "secrets" }
  | { kind: "integrations" }
  | { kind: "analytics" }
  | { kind: "contacts" }
  | { kind: "logging" }
  | { kind: "sitemap" }
  | { kind: "media" }
  | { kind: "design" }
  | { kind: "settings"; section?: SettingsSection };

// Pages that are just themselves: no id, no sub items.
export const simplePages = ["workflows", "files", "secrets", "integrations", "analytics", "contacts", "logging", "sitemap", "media", "design"] as const;
export type SimplePage = (typeof simplePages)[number];

// The settings sub nav, like Shopify's: one page per section.
export const settingsSections = ["general", "plan", "access", "apps", "data", "theme", "domains", "integrations", "notifications", "secrets", "advanced"] as const;
export type SettingsSection = (typeof settingsSections)[number];

export function pageKey(p: WorkspacePage): string {
  switch (p.kind) {
    case "home":
      return "";
    case "data":
      return p.table ? `data:${p.table}` : "data";
    case "app":
      return p.path ? `app:${p.app}:${p.path}` : `app:${p.app}`;
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
  if (kind === "data") return { kind, table: a || undefined };
  if (kind === "app" && a) return { kind, app: a as AppId, path: b || undefined };
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

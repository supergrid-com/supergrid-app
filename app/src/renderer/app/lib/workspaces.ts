import * as React from "react";
import type { WorkspaceSummary } from "../../../shared/bridge";
import { sg } from "~/lib/bridge";
import type { CloudflareLink } from "~/lib/orgs";

// The organization's workspaces, read from its Cloudflare account through cf (src/main/workspaces.ts),
// shared by the launch screen, the workspace shell and the organization modal. One fetch per
// account and prefix; refresh() reads the account again.

export type { WorkspaceSummary };

type Entry = { list: WorkspaceSummary[] | null; error?: string; loading: boolean; at: number };
const store = new Map<string, Entry>();
const listeners = new Set<() => void>();
const keyOf = (link: CloudflareLink) => `${link.accountId}:${link.prefix}`;

// Electron wraps a main-process error as "Error invoking remote method '…': Error: …"; keep the message.
export const clean = (e: unknown) => String((e as Error)?.message ?? e).replace(/^Error invoking remote method '[^']*': (?:Error: )?/, "");

function set(key: string, next: Entry): void {
  store.set(key, next);
  for (const l of listeners) l();
}

export async function refreshWorkspaces(link: CloudflareLink): Promise<WorkspaceSummary[] | null> {
  if (!sg) return null;
  const key = keyOf(link);
  const cur = store.get(key);
  set(key, { list: cur?.list ?? null, loading: true, at: cur?.at ?? 0 });
  try {
    const list = await sg.workspaces.list(link.accountId, link.prefix);
    set(key, { list, loading: false, at: Date.now() });
    return list;
  } catch (e) {
    set(key, { list: cur?.list ?? null, error: clean(e), loading: false, at: Date.now() });
    return null;
  }
}

/** The workspaces for this link, loaded on first use. `list` is null until the first answer. */
export function useWorkspaces(link: CloudflareLink | null): Entry & { refresh: () => Promise<WorkspaceSummary[] | null> } {
  const key = link ? keyOf(link) : "";
  const entry = React.useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => store.get(key),
    () => store.get(key),
  );
  React.useEffect(() => {
    if (link && !store.get(key)) void refreshWorkspaces(link);
  }, [key]);
  const refresh = React.useCallback(() => (link ? refreshWorkspaces(link) : Promise.resolve(null)), [key]);
  return { ...(entry ?? { list: null, loading: !!link && !!sg, at: 0 }), refresh };
}

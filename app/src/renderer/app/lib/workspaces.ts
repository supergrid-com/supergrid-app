import * as React from "react";
import type { WorkspaceSummary } from "../../../shared/bridge";
import { sg } from "~/lib/bridge";
import type { Org } from "~/lib/orgs";

// The organization's workspaces: the ones that live only on this Mac (the demo, src/main/local.ts), then the ones read from
// its Cloudflare account through cf (src/main/workspaces.ts) when it has one. Shared by the launch screen, the workspace
// shell and the organization modal. One fetch per organization and account; refresh() reads them again.

export type { WorkspaceSummary };

type Entry = { list: WorkspaceSummary[] | null; error?: string; loading: boolean; at: number };
const store = new Map<string, Entry>();
const listeners = new Set<() => void>();
type Source = Pick<Org, "id" | "cloudflare">;
const keyOf = (org: Source) => `${org.id}:${org.cloudflare ? `${org.cloudflare.accountId}:${org.cloudflare.prefix}` : "local"}`;

// Electron wraps a main-process error as "Error invoking remote method '…': Error: …"; keep the message.
export const clean = (e: unknown) => String((e as Error)?.message ?? e).replace(/^Error invoking remote method '[^']*': (?:Error: )?/, "");

function set(key: string, next: Entry): void {
  store.set(key, next);
  for (const l of listeners) l();
}

export async function refreshWorkspaces(org: Source): Promise<WorkspaceSummary[] | null> {
  if (!sg) return null;
  const key = keyOf(org);
  const cur = store.get(key);
  set(key, { list: cur?.list ?? null, loading: true, at: cur?.at ?? 0 });
  const local = await sg.workspaces.local(org.id).catch(() => [] as WorkspaceSummary[]);
  if (!org.cloudflare) {
    set(key, { list: local, loading: false, at: Date.now() });
    return local;
  }
  try {
    const list = [...local, ...(await sg.workspaces.list(org.cloudflare.accountId, org.cloudflare.prefix))];
    set(key, { list, loading: false, at: Date.now() });
    return list;
  } catch (e) {
    // the account didn't answer: the ones on this Mac still open
    const list = cur?.list ?? (local.length ? local : null);
    set(key, { list, error: clean(e), loading: false, at: Date.now() });
    return null;
  }
}

/** The workspaces for this organization, loaded on first use. `list` is null until the first answer. */
export function useWorkspaces(org: Source | null): Entry & { refresh: () => Promise<WorkspaceSummary[] | null> } {
  const key = org ? keyOf(org) : "";
  const entry = React.useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => store.get(key),
    () => store.get(key),
  );
  React.useEffect(() => {
    if (org && !store.get(key)) void refreshWorkspaces(org);
  }, [key]);
  const refresh = React.useCallback(() => (org ? refreshWorkspaces(org) : Promise.resolve(null)), [key]);
  return { ...(entry ?? { list: null, loading: !!org && !!sg, at: 0 }), refresh };
}

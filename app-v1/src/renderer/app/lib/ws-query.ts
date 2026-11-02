import type { RpcMethod } from "@supergrid/app-kit/rpc";
import * as React from "react";
import { toastManager } from "~/components/ui/toast";
import { call, type RpcArgs, type RpcResult } from "~/lib/ws-api";

// A small cache in front of the workspace RPC: one entry per workspace, method and arguments.
// Components subscribe with useSyncExternalStore, so every page showing the same query shares
// one fetch and one result. An entry is fresh for 30s; a mutation invalidates by tag (every
// query carries its method name as a tag, plus any the caller adds) and live entries refetch.

const FRESH_MS = 30_000;

type Entry = {
  ws: string;
  method: string;
  tags: Set<string>;
  data?: unknown;
  error?: string;
  /** When the data landed, 0 when it never did or was invalidated. */
  at: number;
  inflight?: Promise<void>;
  /** Components reading this entry right now. */
  subs: number;
  run: () => Promise<unknown>;
};

const store = new Map<string, Entry>();
const listeners = new Set<() => void>();
const notify = () => { for (const l of listeners) l(); };
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };

/** JSON with object keys sorted, so `{a,b}` and `{b,a}` share a cache line. */
export function stableStringify(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(",")}]`;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o).filter((k) => o[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(o[k])}`).join(",")}}`;
  }
  return JSON.stringify(v) ?? "null";
}

const keyOf = (ws: string, method: string, args: unknown[]) => `${ws}|${method}|${stableStringify(args)}`;

// Entries are replaced, never mutated, so a snapshot's identity says whether it changed.
function patch(key: string, next: Partial<Entry>): Entry | undefined {
  const cur = store.get(key);
  if (!cur) return undefined;
  const entry = { ...cur, ...next };
  store.set(key, entry);
  notify();
  return entry;
}

function fetchEntry(key: string): Promise<void> {
  const cur = store.get(key);
  if (!cur) return Promise.resolve();
  if (cur.inflight) return cur.inflight;
  const inflight = cur
    .run()
    .then((data) => { patch(key, { data, error: undefined, at: Date.now(), inflight: undefined }); })
    .catch((e: unknown) => { patch(key, { error: String((e as Error)?.message ?? e), inflight: undefined }); });
  patch(key, { inflight });
  return inflight;
}

function ensure<M extends RpcMethod>(ws: string, method: M, args: RpcArgs<M>, tags: string[] | undefined): string {
  const key = keyOf(ws, method, args);
  let entry = store.get(key);
  if (!entry) {
    entry = { ws, method, tags: new Set([method, ...(tags ?? [])]), at: 0, subs: 0, run: () => call(ws, method, ...args) };
    store.set(key, entry);
  } else if (tags) for (const t of tags) entry.tags.add(t);
  return key;
}

export type WsQuery<T> = { data: T | undefined; error: string | undefined; loading: boolean; refetch: () => Promise<void> };

export function useWsQuery<M extends RpcMethod>(ws: string, method: M, args: RpcArgs<M>, opts: { tags?: string[]; enabled?: boolean } = {}): WsQuery<RpcResult<M>> {
  const enabled = opts.enabled ?? true;
  const tags = opts.tags;
  const key = ensure(ws, method, args, tags);
  const entry = React.useSyncExternalStore(subscribe, () => store.get(key), () => store.get(key));
  React.useEffect(() => {
    if (!enabled) return;
    const cur = store.get(key);
    if (!cur) return;
    cur.subs += 1;
    if (!cur.inflight && (cur.at === 0 || Date.now() - cur.at > FRESH_MS)) void fetchEntry(key);
    return () => { cur.subs -= 1; };
  }, [key, enabled]);
  const refetch = React.useCallback(() => fetchEntry(key), [key]);
  const data = enabled ? (entry?.data as RpcResult<M> | undefined) : undefined;
  return { data, error: enabled ? entry?.error : undefined, loading: enabled && data === undefined && !entry?.error, refetch };
}

/** Marks every query of the workspace stale that carries one of the tags (or a method name); none means all. Live ones refetch. */
export function invalidate(ws: string, ...tags: string[]): void {
  for (const [key, e] of store) {
    if (e.ws !== ws) continue;
    if (tags.length && !tags.some((t) => e.tags.has(t))) continue;
    patch(key, { at: 0 });
    if (e.subs > 0) void fetchEntry(key);
  }
}

/** Rewrites cached data in place, for an optimistic edit. `args` null means every query of that method. */
export function setData<M extends RpcMethod>(ws: string, method: M, args: RpcArgs<M> | null, updater: (old: RpcResult<M>) => RpcResult<M>): void {
  const only = args ? keyOf(ws, method, args) : null;
  for (const [key, e] of store) {
    if (e.ws !== ws || e.method !== method || (only && key !== only) || e.data === undefined) continue;
    patch(key, { data: updater(e.data as RpcResult<M>) });
  }
}

/** What's cached right now, for a reader outside React. */
export function peek<M extends RpcMethod>(ws: string, method: M, args: RpcArgs<M>): RpcResult<M> | undefined {
  return store.get(keyOf(ws, method, args))?.data as RpcResult<M> | undefined;
}

export type WsMutation<M extends RpcMethod> = { run: (...args: RpcArgs<M>) => Promise<RpcResult<M> | null>; pending: boolean };

/**
 * A mutation: runs the call, then invalidates the given tags. An `optimistic` step runs first and
 * returns its own undo, which is called when the request fails. Failures show a toast and resolve
 * to null, so a click handler can `await run()` without a try.
 */
export function useWsMutation<M extends RpcMethod>(ws: string, method: M, opts: { invalidates?: string[]; optimistic?: (...args: RpcArgs<M>) => () => void; title?: string } = {}): WsMutation<M> {
  const [pending, setPending] = React.useState(false);
  const { invalidates, optimistic, title } = opts;
  const run = React.useCallback(
    async (...args: RpcArgs<M>): Promise<RpcResult<M> | null> => {
      const undo = optimistic?.(...args);
      setPending(true);
      try {
        const out = await call(ws, method, ...args);
        invalidate(ws, ...(invalidates ?? [method]));
        return out;
      } catch (e) {
        undo?.();
        toastManager.add({ title: title ?? "That did not save", description: String((e as Error)?.message ?? e), type: "error" });
        return null;
      } finally {
        setPending(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the option arrays are written inline by callers
    [ws, method, optimistic, title, stableStringify(invalidates)],
  );
  return { run, pending };
}

// React bindings for the tracker: one `<Analytics/>` in the site layout, `useTrack()` anywhere, `useEvent()` for "this rendered".
import { createContext, createElement, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useLocation } from "react-router";
import { createTracker, type Tracker } from "./client";

const TrackerContext = createContext<Tracker | null>(null);
let shared: Tracker | null = null;

/** Sends one page.view per navigation and gives descendants a tracker. Place it in public layouts, not admin screens. */
export function Analytics({ app, children }: { app: string; children?: ReactNode }) {
  const tracker = useMemo(() => (shared ??= createTracker({ app })), [app]);
  const { pathname, search } = useLocation();
  useEffect(() => { tracker.page(); }, [tracker, pathname, search]);
  return createElement(TrackerContext.Provider, { value: tracker }, children ?? null);
}

/** The tracker from the nearest `<Analytics/>`, or a lazily created one so a stray call never throws. */
export function useTrack(): Tracker {
  const fromContext = useContext(TrackerContext);
  return fromContext ?? (shared ??= createTracker({ app: "site" }));
}

/** Track once when the component mounts, and again whenever `deps` change. */
export function useEvent(name: string, props?: Record<string, unknown>, deps: unknown[] = []) {
  const tracker = useTrack();
  const latest = useRef(props);
  latest.current = props;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { tracker.track(name, latest.current); }, [tracker, name, ...deps]);
}

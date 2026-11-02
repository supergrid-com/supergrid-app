// The browser side of events: a small tracker that batches calls and posts them to the workspace with sendBeacon.
// Framework-free; `@supergrid/app-kit/react` wraps it for React Router apps.
import type { EventInput, Utm } from "./rpc";

export type Tracker = {
  /** Record something the visitor did. Reserved names (contact.*, object.*…) are refused by the workspace; `page.view` is fine. */
  track(name: string, props?: Record<string, unknown>): void;
  /** A page view for the current location (or the one given). */
  page(input?: { url?: string; path?: string; referrer?: string; props?: Record<string, unknown> }): void;
  /** Tie this visitor to a contact. Only call it after the app itself validated the email (a form the visitor filled in). */
  identify(contact: { email: string; name?: string }): void;
  /** Send whatever is buffered now. Called on hide/unload automatically. */
  flush(): void;
};

type Pending = { events: EventInput[]; identify?: { email: string; name?: string } };

const utmOf = (search: string): Utm | undefined => {
  const p = new URLSearchParams(search);
  const utm: Utm = {};
  for (const k of ["source", "medium", "campaign", "term", "content"] as const) { const v = p.get(`utm_${k}`); if (v) utm[k] = v; }
  return Object.keys(utm).length ? utm : undefined;
};

/**
 * One tracker per page. `app` names the app the events belong to (its manifest id); `endpoint` defaults to the workspace's
 * own `/_ws/events`, same origin, which also sets the visitor cookie.
 */
export function createTracker(opts: { app: string; endpoint?: string; flushAfter?: number; maxBatch?: number } = { app: "site" }): Tracker {
  const endpoint = opts.endpoint ?? "/_ws/events";
  const wait = opts.flushAfter ?? 2000;
  const max = opts.maxBatch ?? 10;
  let pending: Pending = { events: [] };
  let timer: ReturnType<typeof setTimeout> | undefined;
  const send = (body: Pending) => {
    const text = JSON.stringify({ ...body, app: opts.app });
    // text/plain keeps it a simple request: no preflight, and sendBeacon can carry it after the page is gone.
    if (typeof navigator !== "undefined" && navigator.sendBeacon?.(endpoint, new Blob([text], { type: "text/plain" }))) return;
    fetch(endpoint, { method: "POST", body: text, headers: { "content-type": "text/plain" }, keepalive: true, credentials: "same-origin" }).catch(() => {});
  };
  const flush = () => {
    if (timer) { clearTimeout(timer); timer = undefined; }
    if (!pending.events.length && !pending.identify) return;
    const body = pending;
    pending = { events: [] };
    send(body);
  };
  const queue = (e: EventInput) => {
    pending.events.push(e);
    if (pending.events.length >= max) flush();
    else timer ??= setTimeout(flush, wait);
  };
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });
    window.addEventListener("pagehide", flush);
  }
  const here = () => (typeof location !== "undefined" ? { url: location.href, path: location.pathname, referrer: document.referrer || undefined, utm: utmOf(location.search) } : {});
  return {
    track: (name, props) => queue({ name, props, ...here() }),
    page: (input = {}) => queue({ name: "page.view", props: input.props, ...here(), ...input }),
    identify: (contact) => { pending.identify = contact; flush(); },
    flush,
  };
}

// Server-side events for an app Worker: `ctx.events.emit(...)` in loaders and actions. The workspace fills in geo, the
// visitor (from the cookie it forwarded as x-sg-anon) and the request's URL, so an emit here lines up with the browser's.
import type { EventInput, WorkspaceRpc } from "./rpc";

export type AppEvents = {
  /** Emit one event as this app. Returns the event id. */
  emit(name: string, props?: Record<string, unknown>, opts?: { contactId?: string | null; anonymousId?: string | null; ts?: string }): Promise<string>;
  /** Several at once, one round trip. */
  emitAll(events: EventInput[]): Promise<string[]>;
  /** The visitor behind this request, if the browser has the workspace's cookie. */
  anonymousId: string | null;
};

export function createEvents(workspace: Pick<WorkspaceRpc, "emit">, appId: string, request: Request): AppEvents {
  const anonymousId = request.headers.get("x-sg-anon");
  const url = request.url;
  const fill = (e: EventInput): EventInput => ({ anonymousId, url, referrer: request.headers.get("referer") ?? undefined, userAgent: request.headers.get("user-agent") ?? undefined, ...e });
  return {
    anonymousId,
    emitAll: (events) => workspace.emit(appId, events.map(fill)),
    emit: async (name, props, opts = {}) => (await workspace.emit(appId, [fill({ name, props, ...opts })]))[0],
  };
}

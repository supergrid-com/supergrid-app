// Used by the platform admin shell around an app's iframe.
import type { AppToHost, HostInit } from "./protocol";

/**
 * `opts.origin` is the workspace's origin. The iframe's `src` is a platform route that redirects to the workspace
 * (the handoff), so messages arrive from the workspace's origin, not from `iframe.src`.
 */
export function mountAppFrame(iframe: HTMLIFrameElement, init: Omit<HostInit, "type">, on: {
  navigate?: (path: string) => void; title?: (title: string) => void; ready?: (app: string) => void;
} = {}, opts: { origin?: string } = {}) {
  const origin = opts.origin ?? new URL(iframe.src).origin;
  const listener = (e: MessageEvent<AppToHost>) => {
    if (e.origin !== origin || e.source !== iframe.contentWindow) return;
    const m = e.data;
    if (m?.type === "sg:ready") { iframe.contentWindow?.postMessage({ type: "sg:init", ...init } satisfies HostInit, origin); on.ready?.(m.app); }
    else if (m?.type === "sg:resize") iframe.style.height = `${Math.max(240, m.height)}px`;
    else if (m?.type === "sg:navigate") on.navigate?.(m.path);
    else if (m?.type === "sg:title") on.title?.(m.title);
  };
  window.addEventListener("message", listener);
  return () => window.removeEventListener("message", listener);
}

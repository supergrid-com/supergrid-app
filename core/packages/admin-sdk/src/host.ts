// Used by the shell around an app's admin iframe: the desktop's app page, or the platform's frame route.
import type { Asset } from "@supergrid/app-kit/rpc";
import type { AppPick, AppToHost, HostInit, Scheme } from "./protocol";

export type FrameHandlers = {
  navigate?: (path: string) => void;
  title?: (title: string) => void;
  ready?: (app: string) => void;
  /** Open the media picker and resolve with what was chosen, or null. */
  pick?: (req: Omit<AppPick, "type" | "id">) => Promise<Asset[] | null>;
  toast?: (t: { title: string; description?: string; tone?: "success" | "error" | "info" }) => void;
  /** The app asks the shell to open one of its own pages. */
  open?: (to: string) => void;
  /** The app reported its content height; the default sets the iframe's style.height. */
  resize?: (height: number) => void;
};

export type MountedFrame = {
  /** Stop listening. */
  unmount: () => void;
  /** Tell the app the page theme changed. */
  setScheme: (scheme: Scheme) => void;
  /** Move the app inside its admin (relative to basePath). */
  go: (path: string) => void;
};

/**
 * `opts.origin` is the workspace's origin. The iframe's `src` may be a handoff URL that redirects to the workspace,
 * so messages arrive from the workspace's origin, not from `iframe.src`; pass it when they differ.
 */
export function mountAppFrame(iframe: HTMLIFrameElement, init: Omit<HostInit, "type">, on: FrameHandlers = {}, opts: { origin?: string; autoHeight?: boolean } = {}): MountedFrame {
  const origin = opts.origin ?? new URL(iframe.src).origin;
  const post = (m: unknown) => iframe.contentWindow?.postMessage(m, origin);
  const listener = async (e: MessageEvent<AppToHost>) => {
    if (e.origin !== origin || e.source !== iframe.contentWindow) return;
    const m = e.data;
    if (!m || typeof m !== "object") return;
    switch (m.type) {
      case "sg:ready": post({ type: "sg:init", ...init } satisfies HostInit); on.ready?.(m.app); break;
      case "sg:resize": if (on.resize) on.resize(m.height); else if (opts.autoHeight !== false) iframe.style.height = `${Math.max(240, m.height)}px`; break;
      case "sg:navigate": on.navigate?.(m.path); break;
      case "sg:title": on.title?.(m.title); break;
      case "sg:toast": on.toast?.({ title: m.title, description: m.description, tone: m.tone }); break;
      case "sg:open": on.open?.(m.to); break;
      case "sg:pick": {
        const assets = on.pick ? await on.pick({ kinds: m.kinds, multiple: m.multiple, title: m.title }).catch(() => null) : null;
        post({ type: "sg:picked", id: m.id, assets });
        break;
      }
    }
  };
  window.addEventListener("message", listener);
  return {
    unmount: () => window.removeEventListener("message", listener),
    setScheme: (scheme) => post({ type: "sg:scheme", scheme }),
    go: (path) => post({ type: "sg:go", path }),
  };
}

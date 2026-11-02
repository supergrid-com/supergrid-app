// Used inside an app's admin pages. Works standalone (no parent) so an app can be developed and screenshotted alone.
import type { AppToHost, HostInit, Session } from "./protocol";

export type AdminHost = {
  embedded: boolean;
  session: Session | null;
  tokens: Record<string, string>;
  navigate(path: string): void;
  setTitle(title: string): void;
};

const STANDALONE: Session = { user: { id: "dev", name: "Developer", email: "dev@localhost", role: "owner", permissions: [] }, workspace: { id: "local", name: "Local" } };

export function connectAdminHost(appId: string, opts: { timeoutMs?: number } = {}): Promise<AdminHost> {
  const embedded = typeof window !== "undefined" && window.parent !== window;
  const send = (m: AppToHost) => embedded && window.parent.postMessage(m, "*");
  const host = (session: Session | null, tokens: Record<string, string>): AdminHost => ({
    embedded, session, tokens,
    navigate: (path) => send({ type: "sg:navigate", path }),
    setTitle: (title) => { document.title = title; send({ type: "sg:title", title }); },
  });
  if (!embedded) return Promise.resolve(host(STANDALONE, {}));
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(host(STANDALONE, {})), opts.timeoutMs ?? 3000);
    window.addEventListener("message", (e: MessageEvent<HostInit>) => {
      if (e.data?.type !== "sg:init") return;
      clearTimeout(timer);
      for (const [k, v] of Object.entries(e.data.tokens)) document.documentElement.style.setProperty(`--sg-${k}`, v);
      resolve(host(e.data.session, e.data.tokens));
    });
    send({ type: "sg:ready", app: appId });
    // Keep the shell's iframe sized to the content.
    const ro = new ResizeObserver(() => send({ type: "sg:resize", height: document.documentElement.scrollHeight }));
    ro.observe(document.body);
  });
}

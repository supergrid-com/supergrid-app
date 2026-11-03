// Used inside an app's admin pages. Works standalone (no parent) so an app can be developed and screenshotted alone.
import type { NavItem } from "@supergrid/app-kit/manifest";
import type { Asset, AssetKind } from "@supergrid/app-kit/rpc";
import type { AppToHost, HostToApp, Scheme, Session } from "./protocol";

export type AdminHost = {
  /** True inside the shell's iframe; false when the admin runs on its own in a tab. */
  embedded: boolean;
  session: Session;
  tokens: Record<string, string>;
  /** `/admin/<id>` */
  basePath: string;
  nav: NavItem[];
  scheme: Scheme;
  /** Tell the shell the app moved, so its menu and the address follow. Path relative to basePath. */
  navigate(path: string): void;
  setTitle(title: string): void;
  /** The workspace's media picker, as a drawer in the shell. Null when the user closes it. Standalone: a file input would be the app's own. */
  pickAssets(opts?: { kinds?: AssetKind[]; multiple?: boolean; title?: string }): Promise<Asset[] | null>;
  pickAsset(opts?: { kinds?: AssetKind[]; title?: string }): Promise<Asset | null>;
  toast(title: string, opts?: { description?: string; tone?: "success" | "error" | "info" }): void;
  /** Open a page of the shell (`database/<table>`, `library`, `workflows`). */
  open(to: string): void;
  /** The shell's theme, as it changes. Returns the unsubscribe. */
  onScheme(cb: (scheme: Scheme) => void): () => void;
  /** The shell moved the iframe (the user clicked the app's menu). Returns the unsubscribe. */
  onNavigate(cb: (path: string) => void): () => void;
};

const STANDALONE: Session = { user: { id: "dev", name: "Developer", email: "dev@localhost", role: "owner", permissions: ["*"] }, workspace: { id: "local", name: "Local", url: typeof location !== "undefined" ? location.origin : "" } };
const prefersDark = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: dark)").matches;

/** Connects to the shell around the admin iframe, or resolves with a stand-in host when there is none. */
export function connectAdminHost(appId: string, opts: { timeoutMs?: number; nav?: NavItem[] } = {}): Promise<AdminHost> {
  const embedded = typeof window !== "undefined" && window.parent !== window;
  const send = (m: AppToHost) => embedded && window.parent.postMessage(m, "*");
  const schemeListeners = new Set<(s: Scheme) => void>();
  const navListeners = new Set<(p: string) => void>();
  const picks = new Map<string, (a: Asset[] | null) => void>();
  let seq = 0;
  const applyScheme = (s: Scheme) => {
    if (typeof document !== "undefined") document.documentElement.classList.toggle("dark", s === "dark");
  };
  const host = (session: Session, tokens: Record<string, string>, basePath: string, scheme: Scheme, nav: NavItem[]): AdminHost => {
    const h: AdminHost = {
      embedded, session, tokens, basePath, nav, scheme,
      navigate: (path) => send({ type: "sg:navigate", path }),
      setTitle: (title) => { document.title = title; send({ type: "sg:title", title }); },
      pickAssets: (o = {}) => {
        if (!embedded) return Promise.resolve(null);
        const id = `p${++seq}`;
        return new Promise((resolve) => { picks.set(id, resolve); send({ type: "sg:pick", id, kinds: o.kinds ?? ["image"], multiple: !!o.multiple, title: o.title }); });
      },
      pickAsset: async (o = {}) => (await h.pickAssets({ ...o, multiple: false }))?.[0] ?? null,
      toast: (title, o = {}) => (embedded ? send({ type: "sg:toast", title, ...o }) : console.info(`[toast] ${title}${o.description ? `: ${o.description}` : ""}`)),
      open: (to) => send({ type: "sg:open", to }),
      onScheme: (cb) => { schemeListeners.add(cb); return () => schemeListeners.delete(cb); },
      onNavigate: (cb) => { navListeners.add(cb); return () => navListeners.delete(cb); },
    };
    return h;
  };
  const standalone = () => { const s: Scheme = prefersDark() ? "dark" : "light"; applyScheme(s); return host(STANDALONE, {}, `/admin/${appId}`, s, opts.nav ?? []); };
  if (!embedded) return Promise.resolve(standalone());
  return new Promise((resolve) => {
    let current: AdminHost | null = null;
    const timer = setTimeout(() => resolve(standalone()), opts.timeoutMs ?? 3000);
    window.addEventListener("message", (e: MessageEvent<HostToApp>) => {
      const m = e.data;
      if (!m || typeof m !== "object" || typeof m.type !== "string") return;
      if (m.type === "sg:init") {
        clearTimeout(timer);
        for (const [k, v] of Object.entries(m.tokens)) document.documentElement.style.setProperty(`--sg-${k}`, v);
        applyScheme(m.scheme);
        current = host(m.session, m.tokens, m.basePath, m.scheme, m.nav ?? opts.nav ?? []);
        resolve(current);
      } else if (m.type === "sg:scheme") {
        applyScheme(m.scheme);
        if (current) current.scheme = m.scheme;
        for (const cb of schemeListeners) cb(m.scheme);
      } else if (m.type === "sg:go") {
        for (const cb of navListeners) cb(m.path);
      } else if (m.type === "sg:picked") {
        picks.get(m.id)?.(m.assets);
        picks.delete(m.id);
      }
    });
    send({ type: "sg:ready", app: appId });
    // Keep the shell's iframe sized to the content.
    const ro = new ResizeObserver(() => send({ type: "sg:resize", height: document.documentElement.scrollHeight }));
    ro.observe(document.body);
  });
}

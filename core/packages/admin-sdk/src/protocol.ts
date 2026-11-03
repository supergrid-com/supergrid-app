// postMessage protocol between the shell (host: the desktop, or the platform) and an app's admin iframe (app).
// Every message carries a `type` starting with `sg:`. The host speaks first only after the app says it is ready.
import type { NavItem } from "@supergrid/app-kit/manifest";
import type { Asset, AssetKind } from "@supergrid/app-kit/rpc";

/** The signed-in staff member, as the shell resolved them for this workspace. Same shape as `ctx.user` in app-kit. */
export type SessionUser = { id: string; name: string; email: string; role: string; permissions: string[] };
export type Session = { user: SessionUser; workspace: { id: string; name: string; url: string } };
export type Scheme = "light" | "dark";

// host → app
/** The answer to sg:ready: who is signed in, the admin tokens, the app's own menu and where its admin lives. */
export type HostInit = { type: "sg:init"; session: Session; tokens: Record<string, string>; basePath: string; scheme: Scheme; nav: NavItem[] };
/** The page theme changed. */
export type HostScheme = { type: "sg:scheme"; scheme: Scheme };
/** The host moved the iframe itself (the user clicked the app's menu in the shell). */
export type HostNavigate = { type: "sg:go"; path: string };
/** What the user picked, or null when they closed the picker. */
export type HostPicked = { type: "sg:picked"; id: string; assets: Asset[] | null };
export type HostToApp = HostInit | HostScheme | HostNavigate | HostPicked;

// app → host
export type AppReady = { type: "sg:ready"; app: string };
export type AppResize = { type: "sg:resize"; height: number };
/** The app moved inside its admin; the path is relative to basePath. */
export type AppNavigate = { type: "sg:navigate"; path: string };
export type AppTitle = { type: "sg:title"; title: string };
/** Open the workspace's media picker and answer with sg:picked under the same id. */
export type AppPick = { type: "sg:pick"; id: string; kinds: AssetKind[]; multiple: boolean; title?: string };
/** Show a toast in the shell, outside the iframe. */
export type AppToast = { type: "sg:toast"; title: string; description?: string; tone?: "success" | "error" | "info" };
/** Open a page of the shell itself (`database/app_forms_forms`, `library/themes`). */
export type AppOpen = { type: "sg:open"; to: string };
export type AppToHost = AppReady | AppResize | AppNavigate | AppTitle | AppPick | AppToast | AppOpen;

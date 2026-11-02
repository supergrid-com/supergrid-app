// postMessage protocol between the platform admin shell (host) and an app's admin iframe (app).
/** The signed-in staff member, as the platform resolved them for this workspace. Same shape as `ctx.user` in app-kit. */
export type SessionUser = { id: string; name: string; email: string; role: string; permissions: string[] };
export type Session = { user: SessionUser; workspace: { id: string; name: string } };
export type HostInit = { type: "sg:init"; session: Session; tokens: Record<string, string>; basePath: string };
export type AppReady = { type: "sg:ready"; app: string };
export type AppResize = { type: "sg:resize"; height: number };
export type AppNavigate = { type: "sg:navigate"; path: string };
export type AppTitle = { type: "sg:title"; title: string };
export type HostToApp = HostInit;
export type AppToHost = AppReady | AppResize | AppNavigate | AppTitle;

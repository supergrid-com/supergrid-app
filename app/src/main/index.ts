import { app, BrowserWindow, ipcMain, screen, shell } from "electron";
import { join } from "node:path";
import { channels, type AppInfo, type D1Target, type LocalState } from "../shared/bridge";
import { registerAgent } from "./agent";
import { localSummary, registerApps } from "./apps";
import * as cfCli from "./cf-cli";
import * as config from "./config";
import * as cloudflare from "./cloudflare";
import * as d1 from "./d1";
import { registerDemo } from "./demo";
import { registerLibrary } from "./library";
import { localWorkspaces } from "./local";
import * as workspaces from "./workspaces";
import * as workspaceApi from "./workspace-api";

// The main process owns everything that needs a machine: the coding agent, the Cloudflare connection and its token,
// the @supergrid/cloud operations against the account, and later git clones, the ACP agent and
// local preview. The renderer asks through the bridge in ../shared/bridge.ts.

// In development the renderer is inspectable over the DevTools protocol (http://localhost:9339/json), for tools that look inside the window.
if (process.env.ELECTRON_RENDERER_URL) app.commandLine.appendSwitch("remote-debugging-port", process.env.SG_DEVTOOLS_PORT ?? "9339");

function createWindow(): BrowserWindow {
  // Opens at most of the screen it starts on, short of filling it: 90% of the work area, up to 1800 × 1120.
  const area = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workAreaSize;
  const win = new BrowserWindow({
    width: Math.max(900, Math.min(1800, Math.round(area.width * 0.9))),
    height: Math.max(600, Math.min(1120, Math.round(area.height * 0.9))),
    center: true,
    minWidth: 900,
    minHeight: 600,
    show: false,
    // The desk's top bar is the title bar: traffic lights sit in it, the strip is draggable.
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    // Centres the lights 28px down, the line every top bar's controls sit on.
    trafficLightPosition: { x: 16, y: 21 },
    backgroundColor: "#13151c",
    webPreferences: { preload: join(__dirname, "../preload/index.mjs"), sandbox: false, contextIsolation: true },
  });
  win.once("ready-to-show", () => win.show());
  // in development the renderer's console lands in the terminal too, so a page problem shows up without the devtools
  if (process.env.ELECTRON_RENDERER_URL) win.webContents.on("console-message", (e) => { if (e.level === "warning" || e.level === "error") console.log(`[renderer:${e.level}] ${e.message}`); });
  // Any link that would open a new window opens the user's browser instead (sites, docs).
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  // The window only ever shows the app: a navigation anywhere else (a link without a target, a
  // redirect) is stopped, and a web address goes to the browser instead.
  const appOrigin = process.env.ELECTRON_RENDERER_URL ? new URL(process.env.ELECTRON_RENDERER_URL).origin : null;
  win.webContents.on("will-navigate", (e, url) => {
    const inApp = url.startsWith("file:") || (appOrigin !== null && new URL(url).origin === appOrigin);
    if (inApp) return;
    e.preventDefault();
    if (/^https?:/.test(url)) void shell.openExternal(url);
  });
  if (process.env.ELECTRON_RENDERER_URL) void win.loadURL(process.env.ELECTRON_RENDERER_URL);
  else void win.loadFile(join(__dirname, "../renderer/index.html"));
  return win;
}

ipcMain.handle(channels.info, (): AppInfo => ({ version: app.getVersion(), platform: process.platform, arch: process.arch, electron: process.versions.electron }));
ipcMain.handle(channels.openExternal, async (_e, url: unknown) => {
  if (typeof url === "string" && /^https?:/.test(url)) await shell.openExternal(url);
});
ipcMain.handle(channels.cfStatus, () => cloudflare.status());
ipcMain.handle(channels.cfLogin, () => cloudflare.connect());
ipcMain.handle(channels.cfSetToken, (_e, token: unknown) => {
  if (typeof token !== "string" || !token.trim()) throw new Error("Paste the token first.");
  return cloudflare.setToken(token.trim());
});
ipcMain.handle(channels.cfDisconnect, () => cloudflare.disconnect());
ipcMain.handle(channels.cfSelect, (_e, opts: { accountId?: string; prefix?: string }) => cloudflare.select({ accountId: typeof opts?.accountId === "string" ? opts.accountId : undefined, prefix: typeof opts?.prefix === "string" ? opts.prefix : undefined }));
app.on("before-quit", () => cfCli.stopLogin());
ipcMain.handle(channels.stateRead, () => config.readState());
ipcMain.handle(channels.stateWrite, (_e, patch: unknown) => config.writeState(patch && typeof patch === "object" ? (patch as Partial<LocalState>) : {}));
ipcMain.handle(channels.cfCliStatus, (_e, refresh: unknown) => cfCli.status(refresh === true));
ipcMain.handle(channels.cfCliLogin, () => cfCli.login());
ipcMain.handle(channels.cfCliLogout, () => cfCli.logout());
const str = (v: unknown, what: string) => {
  if (typeof v !== "string" || !v) throw new Error(`Missing ${what}.`);
  return v;
};
ipcMain.handle(channels.wsList, (_e, accountId: unknown, prefix: unknown) => workspaces.listWorkspaces(str(accountId, "account"), str(prefix, "prefix")));
ipcMain.handle(channels.wsLocal, (_e, orgId: unknown) => Promise.all(localWorkspaces().filter((w) => w.org === str(orgId, "organization")).map((w) => localSummary(w, false))));
ipcMain.handle(channels.wsRelease, () => workspaces.nextRelease());
ipcMain.handle(channels.wsFreshId, (_e, accountId: unknown, prefix: unknown) => workspaces.freshId(str(accountId, "account"), str(prefix, "prefix")));
ipcMain.handle(channels.wsCreate, (e, opts: { accountId?: unknown; prefix?: unknown; id?: unknown; name?: unknown }) =>
  workspaces.createWorkspace(e.sender, { accountId: str(opts?.accountId, "account"), prefix: str(opts?.prefix, "prefix"), id: str(opts?.id, "workspace id"), name: str(opts?.name, "name") }),
);

ipcMain.handle(channels.wsRpc, (_e, wsId: unknown, method: unknown, args: unknown) => {
  if (typeof wsId !== "string" || typeof method !== "string" || !Array.isArray(args)) throw new Error("A workspace call needs an id, a method and its arguments.");
  return workspaceApi.rpc(wsId, method, args);
});
ipcMain.handle(channels.wsResetToken, (_e, wsId: unknown) => {
  if (typeof wsId === "string") workspaceApi.resetToken(wsId);
});
ipcMain.handle(channels.wsRemove, (_e, wsId: unknown) => workspaceApi.deleteWorkspace(str(wsId, "workspace id")));
ipcMain.handle(channels.wsMediaToken, (_e, wsId: unknown, token: unknown) => {
  if (typeof wsId !== "string") throw new Error("A media token needs a workspace.");
  return workspaceApi.setMediaToken(wsId, typeof token === "string" && token.trim() ? token.trim() : undefined);
});

// the workspace's D1: the target names the account and the Worker whose DB binding is the database, or in Dev the dev
// server whose local D1 answers instead (which needs no account: a workspace that lives only on this Mac has none)
const target = (v: unknown): D1Target => {
  const t = v as Partial<D1Target> | undefined;
  const local = t?.local && typeof t.local.ws === "string" && typeof t.local.url === "string" && t.local.url ? { ws: t.local.ws, url: t.local.url } : undefined;
  if (!t || typeof t.accountId !== "string" || (!t.accountId && !local) || typeof t.worker !== "string" || !t.worker) throw new Error("A database call needs the account and the workspace Worker.");
  return { accountId: t.accountId, worker: t.worker, ...(local ? { local } : {}) };
};
const sqlOf = (sql: unknown, params: unknown): [string, unknown[]] => {
  if (typeof sql !== "string" || !sql.trim()) throw new Error("Nothing to run.");
  return [sql, Array.isArray(params) ? params : []];
};
ipcMain.handle(channels.d1Query, (_e, t: unknown, sql: unknown, params: unknown) => d1.query(target(t), ...sqlOf(sql, params)));
ipcMain.handle(channels.d1Raw, (_e, t: unknown, sql: unknown, params: unknown) => d1.raw(target(t), ...sqlOf(sql, params)));
ipcMain.handle(channels.d1Info, (_e, t: unknown) => d1.info(target(t)));
ipcMain.handle(channels.d1Bookmark, (_e, t: unknown, timestamp: unknown) => d1.bookmark(target(t), typeof timestamp === "string" && timestamp ? timestamp : undefined));
ipcMain.handle(channels.d1Restore, (_e, t: unknown, to: unknown) => {
  const o = (to ?? {}) as { bookmark?: unknown; timestamp?: unknown };
  return d1.restore(target(t), { bookmark: typeof o.bookmark === "string" && o.bookmark ? o.bookmark : undefined, timestamp: typeof o.timestamp === "string" && o.timestamp ? o.timestamp : undefined });
});
ipcMain.handle(channels.d1Export, (_e, t: unknown) => d1.exportSql(target(t)));

registerAgent();
registerLibrary();
registerApps();
registerDemo();

// The name and icon a packaged build gets from its bundle (package.json "build"). In development the
// Dock shows build/icon.png; scripts/brand-electron.mjs renames the dev Electron.app for the menu bar.
app.setName("SuperGrid");
app.setAboutPanelOptions({ applicationName: "SuperGrid", applicationVersion: app.getVersion(), version: "", copyright: `© ${new Date().getFullYear()} SuperGrid`, website: "https://supergrid.com" });

void app.whenReady().then(() => {
  if (process.env.ELECTRON_RENDERER_URL && process.platform === "darwin") app.dock?.setIcon(join(app.getAppPath(), "build/icon.png"));
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

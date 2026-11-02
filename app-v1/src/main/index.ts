import { app, BrowserWindow, ipcMain, shell } from "electron";
import { join } from "node:path";
import { channels, type AppInfo } from "../shared/bridge";
import { registerAgent } from "./agent";
import * as cloudflare from "./cloudflare";
import { listWorkspaces } from "./workspaces";
import * as workspaceApi from "./workspace-api";

// The main process owns everything that needs a machine: the coding agent, the Cloudflare connection and its token,
// the @supergrid/cloud operations against the account, and later git clones, the ACP agent and
// local preview. The renderer asks through the bridge in ../shared/bridge.ts.

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    show: false,
    // The desk's top bar is the title bar: traffic lights sit in it, the strip is draggable.
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    // Centres the lights 28px down, the line every top bar's controls sit on.
    trafficLightPosition: { x: 16, y: 21 },
    backgroundColor: "#171717",
    webPreferences: { preload: join(__dirname, "../preload/index.mjs"), sandbox: false, contextIsolation: true },
  });
  win.once("ready-to-show", () => win.show());
  // Any link that would open a new window opens the user's browser instead (sites, docs).
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void shell.openExternal(url);
    return { action: "deny" };
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
ipcMain.handle(channels.wsList, async () => {
  const { cf, prefix } = await cloudflare.client();
  return listWorkspaces(cf, prefix);
});

ipcMain.handle(channels.wsRpc, (_e, wsId: unknown, method: unknown, args: unknown) => {
  if (typeof wsId !== "string" || typeof method !== "string" || !Array.isArray(args)) throw new Error("A workspace call needs an id, a method and its arguments.");
  return workspaceApi.rpc(wsId, method, args);
});
ipcMain.handle(channels.wsResetToken, (_e, wsId: unknown) => {
  if (typeof wsId === "string") workspaceApi.resetToken(wsId);
});
ipcMain.handle(channels.wsMediaToken, (_e, wsId: unknown, token: unknown) => {
  if (typeof wsId !== "string") throw new Error("A media token needs a workspace.");
  return workspaceApi.setMediaToken(wsId, typeof token === "string" && token.trim() ? token.trim() : undefined);
});

registerAgent();

void app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

import { contextBridge, ipcRenderer } from "electron";
import { channels, type Bridge } from "../shared/bridge";

// What the renderer may ask the main process. Nothing else from Node or Electron reaches the page.
const bridge: Bridge = {
  info: () => ipcRenderer.invoke(channels.info),
  openExternal: (url) => ipcRenderer.invoke(channels.openExternal, url),
  cloudflare: {
    status: () => ipcRenderer.invoke(channels.cfStatus),
    login: () => ipcRenderer.invoke(channels.cfLogin),
    select: (opts) => ipcRenderer.invoke(channels.cfSelect, opts),
  },
  workspaces: {
    list: () => ipcRenderer.invoke(channels.wsList),
  },
};

contextBridge.exposeInMainWorld("sg", bridge);

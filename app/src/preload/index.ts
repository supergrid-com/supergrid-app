import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import { channels, type Bridge } from "../shared/bridge";

function listen<T>(channel: string, cb: (value: T) => void): () => void {
  const handler = (_e: IpcRendererEvent, value: T) => cb(value);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

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
  agent: {
    status: () => ipcRenderer.invoke(channels.agentStatus),
    start: () => ipcRenderer.invoke(channels.agentStart),
    stop: () => ipcRenderer.invoke(channels.agentStop),
    send: (message) => ipcRenderer.invoke(channels.agentSend, message),
    workspaceDir: (id) => ipcRenderer.invoke(channels.agentDir, id),
    onMessage: (cb) => listen(channels.agentMessage, cb),
    onLog: (cb) => listen(channels.agentLog, cb),
    onExit: (cb) => listen(channels.agentExit, cb),
  },
};

contextBridge.exposeInMainWorld("sg", bridge);

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
    setToken: (token) => ipcRenderer.invoke(channels.cfSetToken, token),
    disconnect: () => ipcRenderer.invoke(channels.cfDisconnect),
    select: (opts) => ipcRenderer.invoke(channels.cfSelect, opts),
  },
  state: {
    read: () => ipcRenderer.invoke(channels.stateRead),
    write: (patch) => ipcRenderer.invoke(channels.stateWrite, patch),
  },
  cf: {
    status: (refresh) => ipcRenderer.invoke(channels.cfCliStatus, refresh === true),
    login: () => ipcRenderer.invoke(channels.cfCliLogin),
    logout: () => ipcRenderer.invoke(channels.cfCliLogout),
  },
  workspaces: {
    list: (accountId, prefix) => ipcRenderer.invoke(channels.wsList, accountId, prefix),
    release: () => ipcRenderer.invoke(channels.wsRelease),
    freshId: (accountId, prefix) => ipcRenderer.invoke(channels.wsFreshId, accountId, prefix),
    create: (opts) => ipcRenderer.invoke(channels.wsCreate, opts),
    onProgress: (cb) => listen(channels.wsProgress, cb),
  },
  ws: {
    rpc: (wsId, method, args) => ipcRenderer.invoke(channels.wsRpc, wsId, method, args),
    resetToken: (wsId) => ipcRenderer.invoke(channels.wsResetToken, wsId),
    setMediaToken: (wsId, token) => ipcRenderer.invoke(channels.wsMediaToken, wsId, token),
  },
  agent: {
    status: () => ipcRenderer.invoke(channels.agentStatus),
    start: () => ipcRenderer.invoke(channels.agentStart),
    stop: () => ipcRenderer.invoke(channels.agentStop),
    send: (message) => ipcRenderer.invoke(channels.agentSend, message),
    workspaceDir: (id) => ipcRenderer.invoke(channels.agentDir, id),
    mcpServers: (id) => ipcRenderer.invoke(channels.agentMcp, id),
    onMessage: (cb) => listen(channels.agentMessage, cb),
    onLog: (cb) => listen(channels.agentLog, cb),
    onExit: (cb) => listen(channels.agentExit, cb),
  },
};

contextBridge.exposeInMainWorld("sg", bridge);

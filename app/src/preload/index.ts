import { contextBridge, ipcRenderer, webUtils, type IpcRendererEvent } from "electron";
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
    get: (wsId) => ipcRenderer.invoke(channels.wsGet, wsId),
    setMode: (wsId, mode) => ipcRenderer.invoke(channels.wsSetMode, wsId, mode),
    rpc: (wsId, method, args) => ipcRenderer.invoke(channels.wsRpc, wsId, method, args),
    resetToken: (wsId) => ipcRenderer.invoke(channels.wsResetToken, wsId),
    setMediaToken: (wsId, token) => ipcRenderer.invoke(channels.wsMediaToken, wsId, token),
    adminUrl: (wsId, app, next) => ipcRenderer.invoke(channels.wsAdminUrl, wsId, app, next ?? "/"),
    appManifest: (wsId, app) => ipcRenderer.invoke(channels.wsAppManifest, wsId, app),
    appCall: (wsId, app, operation, input) => ipcRenderer.invoke(channels.wsAppCall, wsId, app, operation, input ?? {}),
  },
  apps: {
    repo: (wsId) => ipcRenderer.invoke(channels.appsRepo, wsId),
    list: (wsId) => ipcRenderer.invoke(channels.appsList, wsId),
    dir: (wsId) => ipcRenderer.invoke(channels.appsDir, wsId),
    create: (wsId, input) => ipcRenderer.invoke(channels.appsCreate, wsId, input),
    reveal: (wsId, path) => ipcRenderer.invoke(channels.appsReveal, wsId, path),
    files: (wsId, path) => ipcRenderer.invoke(channels.appsFiles, wsId, path ?? ""),
    read: (wsId, path) => ipcRenderer.invoke(channels.appsRead, wsId, path),
    deploy: (wsId) => ipcRenderer.invoke(channels.appsDeploy, wsId),
    onDeploy: (cb) => listen(channels.appsDeployProgress, cb),
    deploys: (wsId) => ipcRenderer.invoke(channels.appsDeploys, wsId),
    devStatus: (wsId) => ipcRenderer.invoke(channels.appsDevStatus, wsId),
    devStart: (wsId) => ipcRenderer.invoke(channels.appsDevStart, wsId),
    devStop: (wsId) => ipcRenderer.invoke(channels.appsDevStop, wsId),
    devLog: (wsId) => ipcRenderer.invoke(channels.appsDevLog, wsId),
    onDevLog: (cb) => listen(channels.appsDevLogLine, cb),
    git: (wsId) => ipcRenderer.invoke(channels.appsGit, wsId),
    packages: (wsId) => ipcRenderer.invoke(channels.appsPackages, wsId),
  },
  d1: {
    query: (target, sql, params) => ipcRenderer.invoke(channels.d1Query, target, sql, params ?? []),
    raw: (target, sql, params) => ipcRenderer.invoke(channels.d1Raw, target, sql, params ?? []),
    info: (target) => ipcRenderer.invoke(channels.d1Info, target),
    bookmark: (target, timestamp) => ipcRenderer.invoke(channels.d1Bookmark, target, timestamp),
    restore: (target, to) => ipcRenderer.invoke(channels.d1Restore, target, to),
    export: (target) => ipcRenderer.invoke(channels.d1Export, target),
  },
  library: {
    pick: (opts) => ipcRenderer.invoke(channels.libPick, opts),
    pathOf: (file) => webUtils.getPathForFile(file),
    cancel: (job) => ipcRenderer.invoke(channels.libCancel, job),
    onProgress: (cb) => listen(channels.libProgress, cb),
    images: {
      list: (accountId) => ipcRenderer.invoke(channels.libImagesList, accountId),
      upload: (accountId, job, file, meta) => ipcRenderer.invoke(channels.libImagesUpload, accountId, job, file, meta),
      update: (accountId, id, meta) => ipcRenderer.invoke(channels.libImagesUpdate, accountId, id, meta),
      remove: (accountId, ids) => ipcRenderer.invoke(channels.libImagesRemove, accountId, ids),
    },
    stream: {
      list: (accountId) => ipcRenderer.invoke(channels.libStreamList, accountId),
      get: (accountId, uid) => ipcRenderer.invoke(channels.libStreamGet, accountId, uid),
      upload: (accountId, job, file, opts) => ipcRenderer.invoke(channels.libStreamUpload, accountId, job, file, opts),
      update: (accountId, uid, opts) => ipcRenderer.invoke(channels.libStreamUpdate, accountId, uid, opts),
      remove: (accountId, uids) => ipcRenderer.invoke(channels.libStreamRemove, accountId, uids),
      analytics: (accountId, opts) => ipcRenderer.invoke(channels.libStreamAnalytics, accountId, opts),
    },
    files: {
      list: (accountId, bucket, opts) => ipcRenderer.invoke(channels.libFilesList, accountId, bucket, opts ?? {}),
      upload: (accountId, job, bucket, file, opts) => ipcRenderer.invoke(channels.libFilesUpload, accountId, job, bucket, file, opts),
      remove: (accountId, bucket, keys) => ipcRenderer.invoke(channels.libFilesRemove, accountId, bucket, keys),
      save: (accountId, bucket, key) => ipcRenderer.invoke(channels.libFilesSave, accountId, bucket, key),
    },
  },
  agent: {
    status: () => ipcRenderer.invoke(channels.agentStatus),
    start: () => ipcRenderer.invoke(channels.agentStart),
    stop: () => ipcRenderer.invoke(channels.agentStop),
    send: (message) => ipcRenderer.invoke(channels.agentSend, message),
    workspaceDir: (id) => ipcRenderer.invoke(channels.agentDir, id),
    mcpServers: (id, client) => ipcRenderer.invoke(channels.agentMcp, id, client),
    bindClient: (client, opts) => ipcRenderer.invoke(channels.agentBind, client, opts),
    setContext: (wsId, context) => ipcRenderer.invoke(channels.agentContext, wsId, context),
    answer: (answer) => ipcRenderer.invoke(channels.agentAnswer, answer),
    onMessage: (cb) => listen(channels.agentMessage, cb),
    onLog: (cb) => listen(channels.agentLog, cb),
    onExit: (cb) => listen(channels.agentExit, cb),
    onAsk: (cb) => listen(channels.agentAsk, cb),
    onWidget: (cb) => listen(channels.agentWidget, cb),
    onNavigate: (cb) => listen(channels.agentNavigate, cb),
  },
};

contextBridge.exposeInMainWorld("sg", bridge);

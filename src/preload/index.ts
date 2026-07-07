import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IPC, type AppApi } from '../shared/ipc'
import type { ChatStreamEvent, UpdateStatusEvent } from '../shared/types'

/**
 * Preload bridge. Implements the `AppApi` contract by wrapping ipcRenderer.
 * `invoke` for request/response; `on` for main->renderer streaming events.
 * A subscribe helper returns an unsubscribe function so React effects can
 * clean up listeners.
 */
function subscribe<T>(channel: string, cb: (payload: T) => void): () => void {
  const listener = (_e: Electron.IpcRendererEvent, payload: T): void =>
    cb(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

const api: AppApi = {
  // Config
  getConfig: () => ipcRenderer.invoke(IPC.configGet),
  updateConfig: (patch) => ipcRenderer.invoke(IPC.configUpdate, patch),
  getConfigPath: () => ipcRenderer.invoke(IPC.configPath),
  restoreConfigBackup: () => ipcRenderer.invoke(IPC.configRestoreBackup),

  // Models
  listModels: () => ipcRenderer.invoke(IPC.modelsList),

  // Ollama
  getOllamaStatus: () => ipcRenderer.invoke(IPC.ollamaStatus),
  startOllama: () => ipcRenderer.invoke(IPC.ollamaStart),
  loadOllamaModel: (name) => ipcRenderer.invoke(IPC.ollamaLoadModel, name),
  pullOllamaModel: (name) => ipcRenderer.invoke(IPC.ollamaPullModel, name),
  cancelOllamaPull: (name) => ipcRenderer.invoke(IPC.ollamaCancelPull, name),
  onOllamaPullProgress: (cb) => subscribe(IPC.ollamaPullProgress, cb),

  // Providers
  testProvider: (provider) => ipcRenderer.invoke(IPC.providerTest, provider),

  // Chat
  sendChat: (req) => ipcRenderer.invoke(IPC.chatSend, req),
  stopChat: (requestId) => ipcRenderer.invoke(IPC.chatStop, requestId),
  estimateCost: (req) => ipcRenderer.invoke(IPC.chatEstimateCost, req),
  onChatStream: (cb) => subscribe<ChatStreamEvent>(IPC.chatStream, cb),

  // Conversations
  listConversations: () => ipcRenderer.invoke(IPC.convList),
  loadConversation: (id) => ipcRenderer.invoke(IPC.convLoad, id),
  saveConversation: (conv) => ipcRenderer.invoke(IPC.convSave, conv),
  deleteConversation: (id) => ipcRenderer.invoke(IPC.convDelete, id),

  // Projects / files
  createProject: (name) => ipcRenderer.invoke(IPC.projectCreate, name),
  openProject: (rootPath) => ipcRenderer.invoke(IPC.projectOpen, rootPath),
  setActiveProject: (rootPath) =>
    ipcRenderer.invoke(IPC.projectSetActive, rootPath),
  getFileTree: () => ipcRenderer.invoke(IPC.fileTree),
  readFile: (relPath) => ipcRenderer.invoke(IPC.fileRead, relPath),
  writeFile: (relPath, content) =>
    ipcRenderer.invoke(IPC.fileWrite, relPath, content),
  deleteFile: (relPath) => ipcRenderer.invoke(IPC.fileDelete, relPath),
  renameFile: (relPath, newRelPath) =>
    ipcRenderer.invoke(IPC.fileRename, relPath, newRelPath),
  applyFileBlocks: (raw) => ipcRenderer.invoke(IPC.fileApplyBlocks, raw),
  onFileChanged: (cb) => subscribe<string>(IPC.fileChanged, cb),

  // Preview
  startPreview: () => ipcRenderer.invoke(IPC.previewStart),
  stopPreview: () => ipcRenderer.invoke(IPC.previewStop),
  getPreviewStatus: () => ipcRenderer.invoke(IPC.previewStatus),

  // Screenshot + Gemini
  captureScreenshot: () => ipcRenderer.invoke(IPC.screenshotCapture),
  analyzeScreenshot: (base64) => ipcRenderer.invoke(IPC.geminiAnalyze, base64),
  applyGeminiFix: (analysis) =>
    ipcRenderer.invoke(IPC.geminiApplyFix, analysis),

  // Updates
  checkForUpdates: () => ipcRenderer.invoke(IPC.updateCheck),
  installUpdate: () => ipcRenderer.invoke(IPC.updateInstall),
  onUpdateStatus: (cb) => subscribe<UpdateStatusEvent>(IPC.updateStatus, cb),

  // Dialogs / misc
  pickFolder: () => ipcRenderer.invoke(IPC.dialogPickFolder),
  exportLogs: () => ipcRenderer.invoke(IPC.logsExport),
  getAppVersion: () => ipcRenderer.invoke(IPC.appVersion),
  openExternal: (url) => ipcRenderer.invoke(IPC.openExternal, url),
  checkPrereqs: () => ipcRenderer.invoke(IPC.prereqsCheck),
  detectGpuVram: () => ipcRenderer.invoke(IPC.gpuDetectVram)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define global)
  window.electron = electronAPI
  // @ts-ignore (define global)
  window.api = api
}

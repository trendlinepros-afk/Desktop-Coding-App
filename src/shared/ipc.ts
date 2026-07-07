/**
 * IPC channel names and the typed API surface exposed on `window.api`.
 *
 * Every renderer <-> main interaction goes through one of these channels.
 * The preload script (`src/preload/index.ts`) implements `AppApi` by wrapping
 * `ipcRenderer.invoke` / `ipcRenderer.on`; the main process registers matching
 * handlers in `src/main/ipc.ts`. Keeping the channel strings and the `AppApi`
 * interface in one shared file is what keeps both sides in sync.
 */

import type { AppConfig } from './config'
import type {
  ChatRequest,
  ChatStreamEvent,
  Conversation,
  ConversationSummary,
  CostEstimate,
  FileNode,
  GeminiAnalysisData,
  ModelDescriptor,
  OllamaStatus,
  ProjectInfo,
  PreviewStatus,
  Prereq,
  ProviderStatus,
  RunStatus,
  UpdateStatusEvent
} from './types'

export const IPC = {
  // Config
  configGet: 'config:get',
  configUpdate: 'config:update',
  configPath: 'config:path',
  configRestoreBackup: 'config:restore-backup',

  // Models
  modelsList: 'models:list',

  // Ollama
  ollamaStatus: 'ollama:status',
  ollamaStart: 'ollama:start',
  ollamaLoadModel: 'ollama:load-model',
  ollamaUnloadModel: 'ollama:unload-model',
  ollamaPullModel: 'ollama:pull-model',
  ollamaPullProgress: 'ollama:pull-progress', // main -> renderer event
  ollamaCancelPull: 'ollama:cancel-pull',

  // Providers
  providerTest: 'provider:test',

  // Chat
  chatSend: 'chat:send',
  chatStream: 'chat:stream', // main -> renderer event
  chatStop: 'chat:stop',
  chatEstimateCost: 'chat:estimate-cost',

  // Conversations
  convList: 'conv:list',
  convLoad: 'conv:load',
  convSave: 'conv:save',
  convDelete: 'conv:delete',

  // Projects / files
  projectCreate: 'project:create',
  projectOpen: 'project:open',
  projectSetActive: 'project:set-active',
  fileTree: 'file:tree',
  fileRead: 'file:read',
  fileWrite: 'file:write',
  fileDelete: 'file:delete',
  fileRename: 'file:rename',
  fileApplyBlocks: 'file:apply-blocks',
  filePreviewBlocks: 'file:preview-blocks',
  fileChanged: 'file:changed', // main -> renderer event (watcher)

  // Preview
  previewStart: 'preview:start',
  previewStop: 'preview:stop',
  previewStatus: 'preview:status',

  // Run (Play button + diagnostics console)
  runStart: 'run:start',
  runStop: 'run:stop',
  runStatus: 'run:status',
  runCommand: 'run:command',
  runLog: 'run:log', // main -> renderer event
  runExit: 'run:exit', // main -> renderer event

  // Screenshot + Gemini
  screenshotCapture: 'screenshot:capture',
  geminiAnalyze: 'gemini:analyze',
  geminiApplyFix: 'gemini:apply-fix',

  // Updates
  updateCheck: 'update:check',
  updateStatus: 'update:status', // main -> renderer event
  updateInstall: 'update:install',

  // Dialogs / misc
  dialogPickFolder: 'dialog:pick-folder',
  logsExport: 'logs:export',
  appVersion: 'app:version',
  openExternal: 'app:open-external',
  prereqsCheck: 'prereqs:check',
  gpuDetectVram: 'gpu:detect-vram'
} as const

/** The API object exposed on `window.api` by the preload bridge. */
export interface AppApi {
  // Config
  getConfig(): Promise<AppConfig>
  updateConfig(patch: Partial<AppConfig>): Promise<AppConfig>
  getConfigPath(): Promise<string>
  restoreConfigBackup(): Promise<AppConfig>

  // Models
  listModels(): Promise<ModelDescriptor[]>

  // Ollama
  getOllamaStatus(): Promise<OllamaStatus>
  startOllama(): Promise<OllamaStatus>
  loadOllamaModel(name: string): Promise<{ ok: boolean; error?: string }>
  unloadOllamaModel(name: string): Promise<{ ok: boolean; error?: string }>
  pullOllamaModel(name: string): Promise<{ ok: boolean; error?: string }>
  cancelOllamaPull(name: string): Promise<void>
  onOllamaPullProgress(
    cb: (p: { name: string; status: string; percent: number }) => void
  ): () => void

  // Providers
  testProvider(provider: string): Promise<ProviderStatus>

  // Chat
  sendChat(req: ChatRequest): Promise<{ requestId: string }>
  stopChat(requestId: string): Promise<void>
  estimateCost(req: ChatRequest): Promise<CostEstimate>
  onChatStream(cb: (e: ChatStreamEvent) => void): () => void

  // Conversations
  listConversations(): Promise<ConversationSummary[]>
  loadConversation(id: string): Promise<Conversation | null>
  saveConversation(conv: Conversation): Promise<Conversation>
  deleteConversation(id: string): Promise<void>

  // Projects / files
  createProject(name: string): Promise<ProjectInfo>
  openProject(rootPath: string): Promise<ProjectInfo>
  setActiveProject(rootPath: string): Promise<ProjectInfo>
  getFileTree(): Promise<FileNode[]>
  readFile(relPath: string): Promise<string>
  writeFile(relPath: string, content: string): Promise<void>
  deleteFile(relPath: string): Promise<void>
  renameFile(relPath: string, newRelPath: string): Promise<void>
  applyFileBlocks(
    raw: string
  ): Promise<{ path: string; action: string }[]>
  previewFileBlocks(
    raw: string
  ): Promise<{ path: string; action: string }[]>
  onFileChanged(cb: (path: string) => void): () => void

  // Preview
  startPreview(): Promise<PreviewStatus>
  stopPreview(): Promise<void>
  getPreviewStatus(): Promise<PreviewStatus>

  // Run
  startRun(): Promise<RunStatus>
  stopRun(): Promise<void>
  getRunStatus(): Promise<RunStatus>
  runCommand(command: string): Promise<number | null>
  onRunLog(cb: (line: string) => void): () => void
  onRunExit(cb: (code: number | null) => void): () => void

  // Screenshot + Gemini
  captureScreenshot(): Promise<{ base64: string } | { error: string }>
  analyzeScreenshot(
    base64: string
  ): Promise<GeminiAnalysisData | { error: string }>
  applyGeminiFix(
    analysis: GeminiAnalysisData
  ): Promise<{ ok: boolean; changes: GeminiAnalysisData['changes']; error?: string }>

  // Updates
  checkForUpdates(): Promise<void>
  installUpdate(): Promise<void>
  onUpdateStatus(cb: (e: UpdateStatusEvent) => void): () => void

  // Dialogs / misc
  pickFolder(): Promise<string | null>
  exportLogs(): Promise<string | null>
  getAppVersion(): Promise<string>
  openExternal(url: string): Promise<void>
  checkPrereqs(): Promise<Prereq[]>
  /** Auto-detect total GPU VRAM (GB); null if it can't be determined. */
  detectGpuVram(): Promise<number | null>
}

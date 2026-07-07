import { create } from 'zustand'
import type { AppConfig } from '@shared/config'
import type {
  ChatMessage,
  ChatRequest,
  Conversation,
  ConversationSummary,
  CostEstimate,
  FileNode,
  GeminiAnalysisData,
  ModelDescriptor,
  OllamaStatus,
  PreviewStatus,
  ProjectInfo,
  UpdateStatusEvent
} from '@shared/types'

export type RightPanelMode = 'editor' | 'preview'

/** A pending paid-request confirmation surfaced as a modal. */
export interface PendingSend {
  estimate: CostEstimate
  text: string
}

interface AppState {
  // Config
  config: AppConfig | null
  loadConfig: () => Promise<void>
  updateConfig: (patch: Partial<AppConfig>) => Promise<void>
  applyTheme: () => void

  // Models
  models: ModelDescriptor[]
  selectedModelId: string | null
  refreshModels: () => Promise<void>
  selectModel: (id: string) => Promise<void>
  toggleFavorite: (id: string) => Promise<void>

  // Ollama
  ollamaStatus: OllamaStatus | null
  refreshOllama: () => Promise<void>

  // Conversation
  conversations: ConversationSummary[]
  current: Conversation | null
  refreshConversations: () => Promise<void>
  newConversation: () => void
  loadConversation: (id: string) => Promise<void>
  deleteConversation: (id: string) => Promise<void>

  // Chat streaming
  isStreaming: boolean
  currentRequestId: string | null
  pendingSend: PendingSend | null
  sendMessage: (text: string) => Promise<void>
  confirmPendingSend: () => Promise<void>
  cancelPendingSend: () => void
  stopStreaming: () => void

  // Project / files
  project: ProjectInfo | null
  fileTree: FileNode[]
  openFilePath: string | null
  openFileContent: string
  createProject: (name: string) => Promise<void>
  openProject: (rootPath: string) => Promise<void>
  refreshFileTree: () => Promise<void>
  openFile: (relPath: string) => Promise<void>
  saveOpenFile: (content: string) => Promise<void>
  deleteFile: (relPath: string) => Promise<void>

  // Right panel / preview
  rightPanelMode: RightPanelMode
  setRightPanelMode: (m: RightPanelMode) => void
  previewStatus: PreviewStatus | null
  startPreview: () => Promise<void>
  stopPreview: () => Promise<void>

  // Gemini analysis
  analyzeCurrentPreview: () => Promise<void>
  resolveGeminiAnalysis: (messageId: string, fix: boolean) => Promise<void>

  // Settings
  settingsOpen: boolean
  setSettingsOpen: (open: boolean) => void

  // Banner
  banner: { kind: 'error' | 'info'; text: string } | null
  setBanner: (b: AppState['banner']) => void

  // Auto-update (surfaced app-wide, not just in Settings)
  updateStatus: UpdateStatusEvent | null
  setUpdateStatus: (e: UpdateStatusEvent) => void
  checkForUpdates: () => void
  installUpdate: () => void
  dismissUpdate: () => void

  // ---- Stream event handlers (called by the App-level subscription) ----
  handleStreamToken: (token: string) => void
  handleStreamDone: (content: string) => Promise<void>
  handleStreamError: (error: string) => void

  // ---- Internal helpers (prefixed _) ----
  _buildRequest: (text: string) => ChatRequest
  _dispatchSend: (text: string) => Promise<void>
  _appendMessage: (m: ChatMessage) => void
  _appendSystemMessage: (text: string) => void
  _patchGemini: (messageId: string, patch: Partial<GeminiAnalysisData>) => void
  _persistCurrent: () => Promise<void>
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
}

function newBlankConversation(model: string): Conversation {
  const now = new Date().toISOString()
  return {
    id: uid('conv'),
    title: 'New conversation',
    createdAt: now,
    updatedAt: now,
    model,
    projectName: null,
    messages: [],
    vaultRelativePath: ''
  }
}

export const useStore = create<AppState>((set, get) => ({
  // ---- Config ----
  config: null,
  loadConfig: async () => {
    const config = await window.api.getConfig()
    set({ config, selectedModelId: config.lastSelectedModel })
    get().applyTheme()
  },
  updateConfig: async (patch) => {
    const config = await window.api.updateConfig(patch)
    set({ config })
    if (patch.theme) get().applyTheme()
  },
  applyTheme: () => {
    const cfg = get().config
    if (!cfg) return
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const dark = cfg.theme === 'dark' || (cfg.theme === 'system' && prefersDark)
    document.documentElement.classList.toggle('dark', dark)
  },

  // ---- Models ----
  models: [],
  selectedModelId: null,
  refreshModels: async () => {
    const models = await window.api.listModels()
    set({ models })
    const sel = get().selectedModelId
    if (!sel || !models.find((m) => m.id === sel)) {
      const firstAvailable = models.find((m) => m.available)
      if (firstAvailable) set({ selectedModelId: firstAvailable.id })
    }
  },
  selectModel: async (id) => {
    set({ selectedModelId: id })
    await get().updateConfig({ lastSelectedModel: id })
    const current = get().current
    if (current) set({ current: { ...current, model: id } })
  },
  toggleFavorite: async (id) => {
    const favs = get().config?.favoriteModels ?? []
    const next = favs.includes(id)
      ? favs.filter((f) => f !== id)
      : [...favs, id]
    await get().updateConfig({ favoriteModels: next })
  },

  // ---- Ollama ----
  ollamaStatus: null,
  refreshOllama: async () => set({ ollamaStatus: await window.api.getOllamaStatus() }),

  // ---- Conversations ----
  conversations: [],
  current: null,
  refreshConversations: async () =>
    set({ conversations: await window.api.listConversations() }),
  newConversation: () =>
    set({ current: newBlankConversation(get().selectedModelId ?? 'ollama:unknown') }),
  loadConversation: async (id) => {
    const conv = await window.api.loadConversation(id)
    if (conv) set({ current: conv, selectedModelId: conv.model })
  },
  deleteConversation: async (id) => {
    await window.api.deleteConversation(id)
    if (get().current?.id === id) set({ current: null })
    await get().refreshConversations()
  },

  // ---- Chat streaming ----
  isStreaming: false,
  currentRequestId: null,
  pendingSend: null,

  sendMessage: async (text) => {
    if (!text.trim() || get().isStreaming) return
    // Require an active project so generated files have a destination.
    if (!get().project) {
      get().setBanner({
        kind: 'error',
        text: 'Create or open a project before chatting.'
      })
      return
    }
    const modelId = get().selectedModelId
    if (!modelId) {
      get().setBanner({ kind: 'error', text: 'No model selected.' })
      return
    }
    const model = get().models.find((m) => m.id === modelId)
    if (model && !model.available) {
      get().setBanner({
        kind: 'error',
        text: `Model unavailable: ${model.unavailableReason ?? 'unknown reason'}`
      })
      return
    }
    // Cloud models: confirm token/cost before spending.
    if (model && !model.isLocal) {
      const estimate = await window.api.estimateCost(get()._buildRequest(text))
      set({ pendingSend: { estimate, text } })
      return
    }
    await get()._dispatchSend(text)
  },

  confirmPendingSend: async () => {
    const pending = get().pendingSend
    if (!pending) return
    set({ pendingSend: null })
    await get()._dispatchSend(pending.text)
  },
  cancelPendingSend: () => set({ pendingSend: null }),

  stopStreaming: () => {
    const id = get().currentRequestId
    if (id) window.api.stopChat(id)
    set({ isStreaming: false, currentRequestId: null })
  },

  // ---- Project / files ----
  project: null,
  fileTree: [],
  openFilePath: null,
  openFileContent: '',
  createProject: async (name) => {
    const project = await window.api.createProject(name)
    set({ project })
    await get().refreshFileTree()
    const current = get().current
    if (current) set({ current: { ...current, projectName: project.name } })
  },
  openProject: async (rootPath) => {
    const project = await window.api.openProject(rootPath)
    set({ project })
    await get().refreshFileTree()
  },
  refreshFileTree: async () => {
    if (!get().project) return
    try {
      set({ fileTree: await window.api.getFileTree() })
    } catch {
      set({ fileTree: [] })
    }
  },
  openFile: async (relPath) => {
    try {
      const content = await window.api.readFile(relPath)
      set({ openFilePath: relPath, openFileContent: content })
    } catch (err) {
      get().setBanner({
        kind: 'error',
        text: `Cannot open ${relPath}: ${(err as Error).message}`
      })
    }
  },
  saveOpenFile: async (content) => {
    const path = get().openFilePath
    if (!path) return
    await window.api.writeFile(path, content)
    set({ openFileContent: content })
    await get().refreshFileTree()
  },
  deleteFile: async (relPath) => {
    await window.api.deleteFile(relPath)
    if (get().openFilePath === relPath) set({ openFilePath: null, openFileContent: '' })
    await get().refreshFileTree()
  },

  // ---- Right panel / preview ----
  rightPanelMode: 'editor',
  setRightPanelMode: (m) => set({ rightPanelMode: m }),
  previewStatus: null,
  startPreview: async () => {
    const previewStatus = await window.api.startPreview()
    set({ previewStatus })
    if (previewStatus.error) get().setBanner({ kind: 'error', text: previewStatus.error })
  },
  stopPreview: async () => {
    await window.api.stopPreview()
    set({ previewStatus: null })
  },

  // ---- Gemini analysis ----
  analyzeCurrentPreview: async () => {
    const cfg = get().config
    if (!cfg?.geminiAnalysisEnabled) {
      get().setBanner({ kind: 'error', text: 'Gemini analysis is disabled or unconfigured.' })
      return
    }
    if (!get().current) get().newConversation()
    const shot = await window.api.captureScreenshot()
    if ('error' in shot) {
      get()._appendSystemMessage(`⚠️ ${shot.error}`)
      await get()._persistCurrent()
      return
    }
    const result = await window.api.analyzeScreenshot(shot.base64)
    if ('error' in result) {
      get()._appendSystemMessage(`⚠️ ${result.error}`)
      await get()._persistCurrent()
      return
    }
    const message: ChatMessage = {
      id: uid('msg'),
      role: 'assistant',
      kind: 'gemini-analysis',
      content: '',
      createdAt: new Date().toISOString(),
      gemini: result
    }
    get()._appendMessage(message)
    if (cfg.autoFixFromGemini) {
      get()._appendSystemMessage(`Gemini detected ${result.issueCount} issue(s). Auto-fixing...`)
      await get().resolveGeminiAnalysis(message.id, true)
    }
    await get()._persistCurrent()
  },

  resolveGeminiAnalysis: async (messageId, fix) => {
    const current = get().current
    if (!current) return
    const msg = current.messages.find((m) => m.id === messageId)
    if (!msg?.gemini) return
    const autoFix = get().config?.autoFixFromGemini
    if (!fix) {
      get()._patchGemini(messageId, { actionTaken: 'Skipped' })
      await get()._persistCurrent()
      return
    }
    const res = await window.api.applyGeminiFix(msg.gemini)
    if (res.ok) {
      get()._patchGemini(messageId, {
        actionTaken: autoFix ? 'Auto-Fixed' : 'Fixed',
        changes: res.changes
      })
      get()._appendSystemMessage(`Applied ${res.changes.length} file change(s).`)
      await get().refreshFileTree()
    } else {
      get()._appendSystemMessage(`⚠️ Auto-fix failed: ${res.error}`)
    }
    await get()._persistCurrent()
  },

  // ---- Settings ----
  settingsOpen: false,
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),

  // ---- Banner ----
  banner: null,
  setBanner: (banner) => set({ banner }),

  // ---- Auto-update ----
  updateStatus: null,
  setUpdateStatus: (updateStatus) => set({ updateStatus }),
  checkForUpdates: () => {
    // Optimistically reflect that a check is in flight; the main process will
    // follow up with 'available' / 'not-available' / 'error' events.
    set({ updateStatus: { state: 'checking' } })
    void window.api.checkForUpdates()
  },
  installUpdate: () => void window.api.installUpdate(),
  dismissUpdate: () => set({ updateStatus: null }),

  // ---- Stream event handlers ----
  handleStreamToken: (token) => {
    const current = get().current
    if (!current) return
    const messages = [...current.messages]
    const last = messages[messages.length - 1]
    if (last && last.role === 'assistant' && last.kind === 'chat') {
      messages[messages.length - 1] = { ...last, content: last.content + token }
      set({ current: { ...current, messages } })
    }
  },

  handleStreamDone: async (_content) => {
    set({ isStreaming: false, currentRequestId: null })
    const current = get().current
    if (!current) return
    const last = current.messages[current.messages.length - 1]
    // Write any file blocks the assistant emitted to the active project.
    if (last?.role === 'assistant' && last.content && get().project) {
      try {
        const changes = await window.api.applyFileBlocks(last.content)
        if (changes.length) {
          await get().refreshFileTree()
          get()._appendSystemMessage(
            `Wrote ${changes.length} file(s): ${changes.map((c) => c.path).join(', ')}`
          )
        }
      } catch {
        // non-fatal
      }
    }
    await get()._persistCurrent()
    // Auto-analyze the live preview after a completed task, if enabled.
    if (get().config?.geminiAnalysisEnabled && get().previewStatus?.running) {
      await get().analyzeCurrentPreview()
    }
  },

  handleStreamError: (error) => {
    set({ isStreaming: false, currentRequestId: null })
    get().setBanner({ kind: 'error', text: `Model error: ${error}` })
    const current = get().current
    if (current) {
      const messages = [...current.messages]
      const last = messages[messages.length - 1]
      if (last?.role === 'assistant' && !last.content) {
        messages[messages.length - 1] = {
          ...last,
          content: `⚠️ ${error}. Try another model?`
        }
        set({ current: { ...current, messages } })
      }
    }
  },

  // ---- Internal helpers ----
  _buildRequest: (text) => {
    const cfg = get().config!
    const history = (get().current?.messages ?? [])
      .filter((m) => m.kind === 'chat' && m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }))
    return {
      modelId: get().selectedModelId!,
      messages: [...history, { role: 'user', content: text }],
      temperature: cfg.temperature,
      maxTokens: cfg.maxTokens
    }
  },

  _dispatchSend: async (text) => {
    const selectedModelId = get().selectedModelId!
    // Build the request from the history BEFORE appending the new turn, so the
    // user message is not duplicated and the empty assistant placeholder is
    // excluded.
    const req = get()._buildRequest(text)
    let current = get().current ?? newBlankConversation(selectedModelId)
    const now = new Date().toISOString()
    const userMsg: ChatMessage = {
      id: uid('msg'),
      role: 'user',
      kind: 'chat',
      content: text,
      createdAt: now
    }
    const assistantMsg: ChatMessage = {
      id: uid('msg'),
      role: 'assistant',
      kind: 'chat',
      content: '',
      model: selectedModelId,
      createdAt: now
    }
    if (current.messages.length === 0) current = { ...current, title: text.slice(0, 60) }
    current = {
      ...current,
      model: selectedModelId,
      projectName: get().project?.name ?? current.projectName,
      messages: [...current.messages, userMsg, assistantMsg]
    }
    set({ current, isStreaming: true })
    const { requestId } = await window.api.sendChat(req)
    set({ currentRequestId: requestId })
  },

  _appendMessage: (m) => {
    const current = get().current
    if (!current) return
    set({ current: { ...current, messages: [...current.messages, m] } })
  },

  _appendSystemMessage: (text) =>
    get()._appendMessage({
      id: uid('msg'),
      role: 'system',
      kind: 'chat',
      content: text,
      createdAt: new Date().toISOString()
    }),

  _patchGemini: (messageId, patch) => {
    const current = get().current
    if (!current) return
    const messages = current.messages.map((m) =>
      m.id === messageId && m.gemini ? { ...m, gemini: { ...m.gemini, ...patch } } : m
    )
    set({ current: { ...current, messages } })
  },

  _persistCurrent: async () => {
    const current = get().current
    if (!current || !get().config?.obsidianVaultPath) return
    try {
      const saved = await window.api.saveConversation(current)
      set({ current: saved })
      await get().refreshConversations()
    } catch {
      // vault not set or write failed; ignore
    }
  }
}))

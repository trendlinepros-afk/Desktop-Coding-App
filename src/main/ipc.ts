import { ipcMain, dialog, app, BrowserWindow, shell } from 'electron'
import { writeFileSync } from 'fs'
import { join } from 'path'
import { IPC } from '../shared/ipc'
import type { AppConfig } from '../shared/config'
import type {
  ChatRequest,
  Conversation,
  GeminiAnalysisData
} from '../shared/types'
import { configStore } from './services/config-persistence'
import { listModels } from './services/models'
import { ollamaService } from './services/ollama'
import { apiProviderService } from './services/api-providers'
import { chatOrchestrator } from './services/chat'
import { conversationStore } from './services/conversation-store'
import { fileManager } from './services/file-manager'
import { previewManager } from './services/preview-manager'
import { runnerService } from './services/runner'
import { screenshotService } from './services/screenshot-service'
import { geminiAnalyzer } from './services/gemini-analyzer'
import { updaterService } from './services/updater'
import { checkPrereqs } from './services/prereqs'
import { detectVramGb } from './services/gpu'
import { logger } from './services/logger'
import type { ProviderId } from '../shared/config'

/**
 * Registers all IPC handlers, bridging the renderer's `window.api` calls to the
 * main-process services. Channel strings come from the shared IPC contract so
 * preload and main can never drift apart.
 */
export function registerIpc(getWindow: () => BrowserWindow | null): void {
  // ---- Config ----
  ipcMain.handle(IPC.configGet, () => configStore.load())
  ipcMain.handle(IPC.configUpdate, (_e, patch: Partial<AppConfig>) =>
    configStore.update(patch)
  )
  ipcMain.handle(IPC.configPath, () => configStore.path())
  ipcMain.handle(IPC.configRestoreBackup, () => configStore.restoreBackup())

  // ---- Models ----
  ipcMain.handle(IPC.modelsList, () => listModels())

  // ---- Ollama ----
  ipcMain.handle(IPC.ollamaStatus, () => ollamaService.status())
  ipcMain.handle(IPC.ollamaStart, () => ollamaService.start())
  ipcMain.handle(IPC.ollamaLoadModel, (_e, name: string) =>
    ollamaService.loadModel(name)
  )
  ipcMain.handle(IPC.ollamaUnloadModel, (_e, name: string) =>
    ollamaService.unloadModel(name)
  )
  ipcMain.handle(IPC.ollamaPullModel, (_e, name: string) =>
    ollamaService.pullModel(name, (status, percent) => {
      getWindow()?.webContents.send(IPC.ollamaPullProgress, {
        name,
        status,
        percent
      })
    })
  )
  ipcMain.handle(IPC.ollamaCancelPull, (_e, name: string) =>
    ollamaService.cancelPull(name)
  )

  // ---- Providers ----
  ipcMain.handle(IPC.providerTest, (_e, provider: ProviderId) =>
    apiProviderService.testProvider(provider)
  )

  // ---- Chat ----
  ipcMain.handle(IPC.chatSend, async (_e, req: ChatRequest) => {
    const requestId = chatOrchestrator.newRequestId()
    // Fire-and-forget; tokens stream over the chat channel.
    void chatOrchestrator.run(requestId, req, (event) => {
      getWindow()?.webContents.send(IPC.chatStream, event)
    })
    return { requestId }
  })
  ipcMain.handle(IPC.chatStop, (_e, requestId: string) =>
    chatOrchestrator.stop(requestId)
  )
  ipcMain.handle(IPC.chatEstimateCost, (_e, req: ChatRequest) =>
    chatOrchestrator.estimateCost(req)
  )

  // ---- Conversations ----
  ipcMain.handle(IPC.convList, () => conversationStore.list())
  ipcMain.handle(IPC.convLoad, (_e, id: string) => conversationStore.load(id))
  ipcMain.handle(IPC.convSave, (_e, conv: Conversation) =>
    conversationStore.save(conv)
  )
  ipcMain.handle(IPC.convDelete, (_e, id: string) =>
    conversationStore.delete(id)
  )

  // ---- Projects / files ----
  ipcMain.handle(IPC.projectCreate, (_e, name: string) =>
    fileManager.createProject(name)
  )
  ipcMain.handle(IPC.projectOpen, (_e, rootPath: string) =>
    fileManager.openProject(rootPath)
  )
  ipcMain.handle(IPC.projectSetActive, (_e, rootPath: string) =>
    fileManager.setActive(rootPath)
  )
  ipcMain.handle(IPC.fileTree, () => fileManager.getFileTree())
  ipcMain.handle(IPC.fileRead, (_e, relPath: string) =>
    fileManager.readFile(relPath)
  )
  ipcMain.handle(IPC.fileWrite, (_e, relPath: string, content: string) =>
    fileManager.writeFile(relPath, content)
  )
  ipcMain.handle(IPC.fileDelete, (_e, relPath: string) =>
    fileManager.deleteFile(relPath)
  )
  ipcMain.handle(IPC.fileRename, (_e, relPath: string, newRelPath: string) =>
    fileManager.renameFile(relPath, newRelPath)
  )
  ipcMain.handle(IPC.fileApplyBlocks, (_e, raw: string) =>
    fileManager.applyFileBlocks(raw)
  )
  ipcMain.handle(IPC.filePreviewBlocks, (_e, raw: string) =>
    fileManager.previewFileBlocks(raw)
  )

  // ---- Preview ----
  ipcMain.handle(IPC.previewStart, () => previewManager.start())
  ipcMain.handle(IPC.previewStop, () => previewManager.stop())
  ipcMain.handle(IPC.previewStatus, () => previewManager.getStatus())

  // ---- Run ----
  runnerService.setListeners(
    (line) => getWindow()?.webContents.send(IPC.runLog, line),
    (code) => getWindow()?.webContents.send(IPC.runExit, code)
  )
  ipcMain.handle(IPC.runStart, () => runnerService.start())
  ipcMain.handle(IPC.runStop, () => runnerService.stop())
  ipcMain.handle(IPC.runStatus, () => runnerService.getStatus())
  ipcMain.handle(IPC.runCommand, (_e, command: string) =>
    runnerService.runCommand(command)
  )

  // ---- Screenshot + Gemini ----
  ipcMain.handle(IPC.screenshotCapture, () => screenshotService.capture())
  ipcMain.handle(IPC.geminiAnalyze, (_e, base64: string) =>
    geminiAnalyzer.analyze(base64)
  )
  ipcMain.handle(IPC.geminiApplyFix, (_e, analysis: GeminiAnalysisData) =>
    geminiAnalyzer.applyFix(analysis)
  )

  // ---- Updates ----
  ipcMain.handle(IPC.updateCheck, () => updaterService.check())
  ipcMain.handle(IPC.updateInstall, () => updaterService.install())

  // ---- Dialogs / misc ----
  ipcMain.handle(IPC.dialogPickFolder, async () => {
    const win = getWindow()
    const result = win
      ? await dialog.showOpenDialog(win, { properties: ['openDirectory'] })
      : await dialog.showOpenDialog({ properties: ['openDirectory'] })
    return result.canceled ? null : result.filePaths[0]
  })
  ipcMain.handle(IPC.logsExport, async () => {
    const win = getWindow()
    const result = await dialog.showSaveDialog(win ?? undefined!, {
      defaultPath: join(app.getPath('desktop'), 'app-logs.txt'),
      filters: [{ name: 'Text', extensions: ['txt', 'log'] }]
    })
    if (result.canceled || !result.filePath) return null
    try {
      writeFileSync(result.filePath, logger.read(), 'utf-8')
      shell.showItemInFolder(result.filePath)
      return result.filePath
    } catch (err) {
      logger.error('Export logs failed', err)
      return null
    }
  })
  ipcMain.handle(IPC.appVersion, () => app.getVersion())
  ipcMain.handle(IPC.openExternal, (_e, url: string) => {
    // Only allow http(s) links to be opened externally.
    if (/^https?:\/\//i.test(url)) return shell.openExternal(url)
    return undefined
  })
  ipcMain.handle(IPC.prereqsCheck, () => checkPrereqs())
  ipcMain.handle(IPC.gpuDetectVram, () => detectVramGb())

  // Forward file-watcher changes to the renderer.
  fileManager.setChangeListener((path) => {
    getWindow()?.webContents.send(IPC.fileChanged, path)
  })
}

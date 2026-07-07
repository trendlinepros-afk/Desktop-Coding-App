import { app, shell, BrowserWindow, nativeTheme } from 'electron'
import { join } from 'path'
import { registerIpc } from './ipc'
import { configStore } from './services/config-persistence'
import { fileManager } from './services/file-manager'
import { previewManager } from './services/preview-manager'
import { runnerService } from './services/runner'
import { ollamaService } from './services/ollama'
import { updaterService } from './services/updater'
import { logger } from './services/logger'

let mainWindow: BrowserWindow | null = null

// Safety net: log stray errors instead of letting Electron pop the default
// "A JavaScript error occurred in the main process" dialog and risk a crash.
// Individual services still handle their own expected failures; this only
// catches anything that slips through (e.g. an async spawn error).
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception in main process', err?.stack ?? String(err))
})
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection in main process', String(reason))
})

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1000,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    title: 'Local LLM Coding Assistant',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      // Required so the renderer can host the live preview in a <webview>.
      webviewTag: true
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) {
    mainWindow.loadURL(devUrl)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  updaterService.init(mainWindow)
}

app.whenReady().then(() => {
  logger.info('App starting', app.getVersion())

  // Apply persisted theme to the OS-level nativeTheme source.
  const cfg = configStore.load()
  nativeTheme.themeSource = cfg.theme

  // Restore the last active project if configured.
  if (cfg.projectsRootPath) {
    // Nothing auto-opened; renderer chooses/creates the active project.
  }

  registerIpc(() => mainWindow)
  createWindow()

  // Auto-start Ollama in the background if enabled.
  if (cfg.autoStartOllama) {
    ollamaService.start().catch((err) => logger.error('Ollama autostart', err))
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  // Clean up preview server / run process / watchers so no orphans remain.
  previewManager.stop().catch(() => {})
  runnerService.stop()
  fileManager.dispose()
})

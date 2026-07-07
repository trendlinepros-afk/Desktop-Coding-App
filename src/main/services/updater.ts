import { autoUpdater } from 'electron-updater'
import { app, type BrowserWindow } from 'electron'
import { configStore } from './config-persistence'
import { logger } from './logger'
import { IPC } from '../../shared/ipc'
import type { UpdateStatusEvent } from '../../shared/types'

/**
 * Wraps electron-updater. Emits UpdateStatusEvent to the renderer over the
 * `update:status` channel so the UI can show progress and release notes.
 *
 * Config persistence across updates is handled separately by the
 * config-persistence module (config lives in userData, outside the app bundle),
 * so nothing here needs to migrate settings — they are simply preserved.
 */
export class UpdaterService {
  private win: BrowserWindow | null = null

  init(win: BrowserWindow): void {
    this.win = win
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true
    autoUpdater.logger = {
      info: (m: unknown) => logger.info('[updater]', m),
      warn: (m: unknown) => logger.warn('[updater]', m),
      error: (m: unknown) => logger.error('[updater]', m),
      debug: () => {}
    } as never

    autoUpdater.on('checking-for-update', () => this.emit({ state: 'checking' }))
    autoUpdater.on('update-available', (info) =>
      this.emit({
        state: 'available',
        version: info.version,
        releaseNotes: normalizeNotes(info.releaseNotes)
      })
    )
    autoUpdater.on('update-not-available', (info) =>
      // info.version is the latest published version, which equals the current
      // one here — surface it so the UI can say "you're on vX.Y.Z".
      this.emit({ state: 'not-available', version: info?.version ?? app.getVersion() })
    )
    autoUpdater.on('download-progress', (p) =>
      this.emit({ state: 'downloading', percent: Math.round(p.percent) })
    )
    autoUpdater.on('update-downloaded', (info) =>
      this.emit({
        state: 'downloaded',
        version: info.version,
        releaseNotes: normalizeNotes(info.releaseNotes)
      })
    )
    autoUpdater.on('error', (err) =>
      this.emit({ state: 'error', error: err.message })
    )

    if (configStore.load().autoCheckUpdates) {
      // Check shortly after launch so it doesn't block startup.
      setTimeout(() => this.check(), 4000)
    }
  }

  async check(): Promise<void> {
    try {
      await autoUpdater.checkForUpdates()
    } catch (err) {
      logger.error('Update check failed', err)
      this.emit({
        state: 'error',
        error: err instanceof Error ? err.message : String(err)
      })
    }
  }

  install(): void {
    autoUpdater.quitAndInstall()
  }

  private emit(event: UpdateStatusEvent): void {
    this.win?.webContents.send(IPC.updateStatus, event)
  }
}

function normalizeNotes(
  notes: string | { note: string | null }[] | null | undefined
): string {
  if (!notes) return ''
  if (typeof notes === 'string') return notes
  return notes.map((n) => n.note ?? '').join('\n\n')
}

export const updaterService = new UpdaterService()

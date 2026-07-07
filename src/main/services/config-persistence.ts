import { app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync, copyFileSync } from 'fs'
import { DEFAULT_CONFIG, type AppConfig } from '../../shared/config'
import { logger } from './logger'

/**
 * Config persistence with update-survivability.
 *
 * The config lives at `<userData>/config.json`, which is OUTSIDE the app
 * bundle and therefore preserved across app updates. On every load the stored
 * object is deep-merged over DEFAULT_CONFIG, so fields added in newer versions
 * appear with defaults and previously-saved values (API keys, paths, toggles)
 * are retained. Before each write we snapshot the previous good file to
 * `config.backup.json`, enabling recovery if the main file becomes corrupt.
 */
class ConfigStore {
  private cache: AppConfig | null = null

  private get file(): string {
    return join(app.getPath('userData'), 'config.json')
  }

  private get backupFile(): string {
    return join(app.getPath('userData'), 'config.backup.json')
  }

  path(): string {
    return this.file
  }

  load(): AppConfig {
    if (this.cache) return this.cache
    if (!existsSync(this.file)) {
      this.cache = { ...DEFAULT_CONFIG }
      this.persist(this.cache)
      return this.cache
    }
    try {
      const raw = readFileSync(this.file, 'utf-8')
      const parsed = JSON.parse(raw) as Partial<AppConfig>
      this.cache = mergeConfig(DEFAULT_CONFIG, parsed)
      return this.cache
    } catch (err) {
      logger.error('Config file corrupt, attempting backup restore', err)
      const restored = this.tryRestoreBackup()
      if (restored) return restored
      logger.warn('No usable backup; falling back to defaults')
      this.cache = { ...DEFAULT_CONFIG }
      return this.cache
    }
  }

  update(patch: Partial<AppConfig>): AppConfig {
    const current = this.load()
    const next = mergeConfig(current, patch)
    this.persist(next)
    this.cache = next
    return next
  }

  private persist(cfg: AppConfig): void {
    try {
      // Snapshot previous good file before overwriting.
      if (existsSync(this.file)) {
        try {
          copyFileSync(this.file, this.backupFile)
        } catch (e) {
          logger.warn('Could not write config backup', e)
        }
      }
      writeFileSync(this.file, JSON.stringify(cfg, null, 2), 'utf-8')
    } catch (err) {
      logger.error('Failed to persist config', err)
    }
  }

  /** Explicit restore requested by the user (Settings) or automatic on corrupt load. */
  restoreBackup(): AppConfig {
    const restored = this.tryRestoreBackup()
    if (restored) return restored
    throw new Error('No config backup available to restore.')
  }

  private tryRestoreBackup(): AppConfig | null {
    if (!existsSync(this.backupFile)) return null
    try {
      const raw = readFileSync(this.backupFile, 'utf-8')
      const parsed = JSON.parse(raw) as Partial<AppConfig>
      const merged = mergeConfig(DEFAULT_CONFIG, parsed)
      this.persist(merged)
      this.cache = merged
      logger.info('Config restored from backup')
      return merged
    } catch (err) {
      logger.error('Backup config also corrupt', err)
      return null
    }
  }
}

/**
 * Deep-merge `patch` over `base` for the AppConfig shape. Nested `api.*`
 * provider objects are merged per-provider; arrays and scalars are replaced.
 */
function mergeConfig(base: AppConfig, patch: Partial<AppConfig>): AppConfig {
  const out: AppConfig = { ...base, ...patch }
  out.api = {
    openai: { ...base.api.openai, ...patch.api?.openai },
    anthropic: { ...base.api.anthropic, ...patch.api?.anthropic },
    gemini: { ...base.api.gemini, ...patch.api?.gemini },
    deepseek: { ...base.api.deepseek, ...patch.api?.deepseek }
  }
  if (patch.customModels) out.customModels = patch.customModels
  if (patch.favoriteModels) out.favoriteModels = patch.favoriteModels
  // Config version is owned by the app, never downgraded by a stored value.
  out.configVersion = Math.max(base.configVersion, patch.configVersion ?? 0)
  return out
}

export const configStore = new ConfigStore()

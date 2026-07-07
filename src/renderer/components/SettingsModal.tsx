import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import {
  PROVIDER_LABELS,
  PROVIDER_MODELS,
  type ProviderId,
  type ThemeMode
} from '@shared/config'
import type { ProviderStatus, UpdateStatusEvent } from '@shared/types'

/**
 * Full application settings panel rendered as a modal overlay. Reads and writes
 * every field through the store's `updateConfig`. Organised into four sections
 * selectable from a left-hand nav.
 */

type Section = 'general' | 'api' | 'ollama' | 'advanced'

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'api', label: 'API Configuration' },
  { id: 'ollama', label: 'Ollama' },
  { id: 'advanced', label: 'Advanced' }
]

const PROVIDERS: ProviderId[] = ['openai', 'anthropic', 'gemini', 'deepseek']

function updateStatusLabel(e: UpdateStatusEvent): string {
  switch (e.state) {
    case 'checking':
      return 'Checking for updates…'
    case 'available':
      return `Update available${e.version ? ` (v${e.version})` : ''}`
    case 'downloading':
      return `Downloading… ${Math.round(e.percent ?? 0)}%`
    case 'downloaded':
      return `Update downloaded${e.version ? ` (v${e.version})` : ''} — ready to install`
    case 'not-available':
      return 'You are on the latest version'
    case 'error':
      return `Update error: ${e.error ?? 'unknown'}`
    default:
      return ''
  }
}

function providerStatusText(s: ProviderStatus): string {
  const base =
    s.status === 'valid'
      ? '✓ Valid'
      : s.status === 'invalid'
        ? '✗ Invalid'
        : s.status === 'unconfigured'
          ? '⚠ Not configured'
          : 'Unknown'
  return s.message ? `${base} — ${s.message}` : base
}

export function SettingsModal(): JSX.Element | null {
  const config = useStore((s) => s.config)
  const settingsOpen = useStore((s) => s.settingsOpen)
  const setSettingsOpen = useStore((s) => s.setSettingsOpen)
  const updateConfig = useStore((s) => s.updateConfig)
  const ollamaStatus = useStore((s) => s.ollamaStatus)
  const refreshOllama = useStore((s) => s.refreshOllama)
  const conversations = useStore((s) => s.conversations)
  const refreshConversations = useStore((s) => s.refreshConversations)
  const setBanner = useStore((s) => s.setBanner)
  // Update status is owned by the store (subscribed app-wide in App.tsx) so the
  // Settings view and the global UpdateBanner always agree.
  const updateStatus = useStore((s) => s.updateStatus)
  const checkForUpdates = useStore((s) => s.checkForUpdates)
  const installUpdate = useStore((s) => s.installUpdate)

  const [section, setSection] = useState<Section>('general')
  const [configPath, setConfigPath] = useState('')
  const [testResults, setTestResults] = useState<Partial<Record<ProviderId, ProviderStatus>>>({})
  const [testing, setTesting] = useState<Partial<Record<ProviderId, boolean>>>({})
  const overlayRef = useRef<HTMLDivElement>(null)

  // Fetch the config file path when the modal opens.
  useEffect(() => {
    if (!settingsOpen) return
    let alive = true
    void window.api.getConfigPath().then((p) => {
      if (alive) setConfigPath(p)
    })
    return () => {
      alive = false
    }
  }, [settingsOpen])

  if (!settingsOpen || !config) return null

  const close = (): void => setSettingsOpen(false)

  const setProvider = (p: ProviderId, patch: Partial<{ apiKey: string; model: string }>): void => {
    void updateConfig({
      api: { ...config.api, [p]: { ...config.api[p], ...patch } }
    })
  }

  const runTest = async (p: ProviderId): Promise<void> => {
    setTesting((t) => ({ ...t, [p]: true }))
    try {
      const res = await window.api.testProvider(p)
      setTestResults((r) => ({ ...r, [p]: res }))
    } catch (err) {
      setTestResults((r) => ({
        ...r,
        [p]: { provider: p, status: 'unknown', message: (err as Error).message }
      }))
    } finally {
      setTesting((t) => ({ ...t, [p]: false }))
    }
  }

  const browseFolder = async (key: 'projectsRootPath' | 'obsidianVaultPath'): Promise<void> => {
    const dir = await window.api.pickFolder()
    if (dir) void updateConfig({ [key]: dir } as Record<typeof key, string>)
  }

  const clearHistory = async (): Promise<void> => {
    if (!window.confirm(`Delete all ${conversations.length} conversation(s)? This cannot be undone.`))
      return
    for (const c of conversations) {
      try {
        await window.api.deleteConversation(c.id)
      } catch {
        // continue clearing remaining conversations
      }
    }
    await refreshConversations()
    setBanner({ kind: 'info', text: 'Chat history cleared.' })
  }

  const restoreBackup = async (): Promise<void> => {
    try {
      await window.api.restoreConfigBackup()
      location.reload()
    } catch (err) {
      setBanner({ kind: 'error', text: `Restore failed: ${(err as Error).message}` })
    }
  }

  const labelCls = 'block text-sm font-medium text-content'
  const inputCls =
    'mt-1 w-full rounded border border-border bg-surface-muted px-2 py-1.5 text-sm text-content outline-none focus:border-accent'

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onMouseDown={(e) => {
        if (e.target === overlayRef.current) close()
      }}
    >
      <div className="flex max-h-[85vh] w-[640px] flex-col overflow-hidden rounded-lg border border-border bg-surface-raised shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-lg font-semibold text-content">Settings</h2>
          <button
            type="button"
            className="rounded px-2 py-1 text-sm text-content-muted hover:bg-surface-muted"
            onClick={close}
          >
            ✕
          </button>
        </div>

        <div className="flex min-h-0 flex-1">
          <nav className="w-40 shrink-0 border-r border-border p-2">
            {SECTIONS.map((s) => (
              <button
                type="button"
                key={s.id}
                onClick={() => setSection(s.id)}
                className={`mb-1 block w-full rounded px-2 py-1.5 text-left text-sm ${
                  section === s.id
                    ? 'bg-accent text-accent-fg'
                    : 'text-content hover:bg-surface-muted'
                }`}
              >
                {s.label}
              </button>
            ))}
          </nav>

          <div className="min-w-0 flex-1 space-y-5 overflow-y-auto p-4">
            {section === 'general' && (
              <>
                <div>
                  <label className={labelCls}>GPU VRAM (GB)</label>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={config.gpuVramGb}
                    onChange={(e) =>
                      void updateConfig({ gpuVramGb: Number(e.target.value) || 0 })
                    }
                    className={inputCls}
                  />
                </div>

                <label className="flex items-center gap-2 text-sm text-content">
                  <input
                    type="checkbox"
                    checked={config.autoCheckUpdates}
                    onChange={(e) =>
                      void updateConfig({ autoCheckUpdates: e.target.checked })
                    }
                  />
                  Auto-check for updates
                </label>

                <div className="space-y-2">
                  <button
                    type="button"
                    className="rounded border border-border px-3 py-1.5 text-sm hover:bg-surface-muted"
                    onClick={() => checkForUpdates()}
                  >
                    Check for Updates
                  </button>
                  {updateStatus && (
                    <div className="text-sm text-content-muted">
                      {updateStatusLabel(updateStatus)}
                    </div>
                  )}
                  {updateStatus?.state === 'downloaded' && (
                    <button
                      type="button"
                      className="rounded bg-accent px-3 py-1.5 text-sm text-accent-fg hover:opacity-90"
                      onClick={() => installUpdate()}
                    >
                      Restart &amp; Install
                    </button>
                  )}
                </div>

                <div>
                  <label className={labelCls}>Theme</label>
                  <select
                    value={config.theme}
                    onChange={(e) =>
                      void updateConfig({ theme: e.target.value as ThemeMode })
                    }
                    className={inputCls}
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Projects folder</label>
                  <div className="mt-1 flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={config.projectsRootPath}
                      placeholder="Not set"
                      className={`${inputCls} mt-0 flex-1`}
                    />
                    <button
                      type="button"
                      className="rounded border border-border px-3 py-1.5 text-sm hover:bg-surface-muted"
                      onClick={() => void browseFolder('projectsRootPath')}
                    >
                      Browse
                    </button>
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Obsidian vault</label>
                  <div className="mt-1 flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={config.obsidianVaultPath}
                      placeholder="Not set"
                      className={`${inputCls} mt-0 flex-1`}
                    />
                    <button
                      type="button"
                      className="rounded border border-border px-3 py-1.5 text-sm hover:bg-surface-muted"
                      onClick={() => void browseFolder('obsidianVaultPath')}
                    >
                      Browse
                    </button>
                  </div>
                </div>
              </>
            )}

            {section === 'api' && (
              <>
                <div className="rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                  API keys are stored in plain text. Keep your config file secure.
                  {configPath && (
                    <div className="mt-1 break-all opacity-80">Config: {configPath}</div>
                  )}
                </div>

                {PROVIDERS.map((p) => {
                  const result = testResults[p]
                  return (
                    <div
                      key={p}
                      className="space-y-2 rounded border border-border bg-surface p-3"
                    >
                      <div className="text-sm font-semibold text-content">
                        {PROVIDER_LABELS[p]}
                      </div>
                      <div>
                        <label className={labelCls}>API key</label>
                        <input
                          type="password"
                          value={config.api[p].apiKey}
                          onChange={(e) => setProvider(p, { apiKey: e.target.value })}
                          placeholder="sk-…"
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Model</label>
                        <select
                          value={config.api[p].model}
                          onChange={(e) => setProvider(p, { model: e.target.value })}
                          className={inputCls}
                        >
                          {PROVIDER_MODELS[p].map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          disabled={testing[p]}
                          onClick={() => void runTest(p)}
                          className="rounded border border-border px-3 py-1.5 text-sm hover:bg-surface-muted disabled:opacity-50"
                        >
                          {testing[p] ? 'Testing…' : 'Test'}
                        </button>
                        {result && (
                          <span
                            className={`text-sm ${
                              result.status === 'valid'
                                ? 'text-green-600 dark:text-green-400'
                                : result.status === 'invalid'
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-content-muted'
                            }`}
                          >
                            {providerStatusText(result)}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}

                <div className="space-y-2 rounded border border-border bg-surface p-3">
                  <div className="text-sm font-semibold text-content">Gemini Analysis</div>
                  <label
                    className={`flex items-center gap-2 text-sm ${
                      config.api.gemini.apiKey ? 'text-content' : 'text-content-muted'
                    }`}
                    title={
                      config.api.gemini.apiKey
                        ? undefined
                        : 'Add a Google Gemini API key to enable analysis'
                    }
                  >
                    <input
                      type="checkbox"
                      disabled={!config.api.gemini.apiKey}
                      checked={config.geminiAnalysisEnabled}
                      onChange={(e) =>
                        void updateConfig({ geminiAnalysisEnabled: e.target.checked })
                      }
                    />
                    Have Gemini Analyze Screenshots
                  </label>
                  <p className="text-xs text-content-muted">
                    Analyzes live preview screenshots for bugs and UI issues.
                  </p>
                </div>
              </>
            )}

            {section === 'ollama' && (
              <>
                <div>
                  <label className={labelCls}>Endpoint</label>
                  <input
                    type="text"
                    value={config.ollamaEndpoint}
                    onChange={(e) => void updateConfig({ ollamaEndpoint: e.target.value })}
                    placeholder="http://localhost:11434"
                    className={inputCls}
                  />
                </div>

                <label className="flex items-center gap-2 text-sm text-content">
                  <input
                    type="checkbox"
                    checked={config.autoStartOllama}
                    onChange={(e) => void updateConfig({ autoStartOllama: e.target.checked })}
                  />
                  Auto-start Ollama on launch
                </label>

                <div className="flex items-center gap-3">
                  <span className="text-sm text-content">Status:</span>
                  <span
                    className={`text-sm font-medium ${
                      ollamaStatus?.connected
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {ollamaStatus?.connected ? 'Connected' : 'Disconnected'}
                  </span>
                  <button
                    type="button"
                    className="rounded border border-border px-3 py-1.5 text-sm hover:bg-surface-muted"
                    onClick={() => {
                      void (async () => {
                        await window.api.startOllama()
                        await refreshOllama()
                      })()
                    }}
                  >
                    Reconnect
                  </button>
                </div>

                <p className="text-sm text-content-muted">
                  Ollama not installed?{' '}
                  <a
                    href="https://ollama.com/download"
                    className="text-accent underline"
                    rel="noreferrer"
                  >
                    Download Ollama
                  </a>
                  . After installing a model, use the "Load Model" button next to the
                  model switcher to load it into memory.
                </p>
              </>
            )}

            {section === 'advanced' && (
              <>
                <div>
                  <label className={labelCls}>
                    Temperature: {config.temperature.toFixed(2)}
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={config.temperature}
                    onChange={(e) =>
                      void updateConfig({ temperature: Number(e.target.value) })
                    }
                    className="mt-1 w-full"
                  />
                </div>

                <div>
                  <label className={labelCls}>Max tokens</label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={config.maxTokens}
                    onChange={(e) =>
                      void updateConfig({ maxTokens: Number(e.target.value) || 1 })
                    }
                    className={inputCls}
                  />
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    type="button"
                    className="rounded border border-red-500/50 px-3 py-1.5 text-sm text-red-600 hover:bg-red-500/10 dark:text-red-400"
                    onClick={() => void clearHistory()}
                  >
                    Clear all chat history
                  </button>
                  <button
                    type="button"
                    className="rounded border border-border px-3 py-1.5 text-sm hover:bg-surface-muted"
                    onClick={() => void restoreBackup()}
                  >
                    Restore config from backup
                  </button>
                  <button
                    type="button"
                    className="rounded border border-border px-3 py-1.5 text-sm hover:bg-surface-muted"
                    onClick={() => void window.api.exportLogs()}
                  >
                    Export app logs
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

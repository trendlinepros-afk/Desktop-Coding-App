import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'

/**
 * Live preview panel. Renders the running preview server in an iframe, offers
 * start/stop/reload controls, and a Screenshot button that (when Gemini
 * analysis is enabled) triggers an automated visual review of the current view.
 * The iframe auto-reloads whenever a project file changes.
 */
export function LivePreview(): JSX.Element {
  const previewStatus = useStore((s) => s.previewStatus)
  const startPreview = useStore((s) => s.startPreview)
  const stopPreview = useStore((s) => s.stopPreview)
  const analyzeCurrentPreview = useStore((s) => s.analyzeCurrentPreview)
  const config = useStore((s) => s.config)
  const setBanner = useStore((s) => s.setBanner)

  const [reloadKey, setReloadKey] = useState<number>(0)
  const [starting, setStarting] = useState<boolean>(false)

  const running = previewStatus?.running ?? false
  const url = previewStatus?.url ?? null

  // Auto-reload the iframe whenever a file on disk changes.
  useEffect(() => {
    const unsubscribe = window.api.onFileChanged(() => {
      setReloadKey((k) => k + 1)
    })
    return unsubscribe
  }, [])

  const handleStart = async (): Promise<void> => {
    setStarting(true)
    try {
      await startPreview()
    } finally {
      setStarting(false)
    }
  }

  const handleScreenshot = async (): Promise<void> => {
    if (!running) return
    if (config?.geminiAnalysisEnabled) {
      await analyzeCurrentPreview()
    } else {
      setBanner({
        kind: 'info',
        text: 'Enable "Have Gemini Analyze Screenshots" in Settings to analyze.'
      })
    }
  }

  const btnClass =
    'rounded border border-border px-2.5 py-1 text-xs text-content hover:bg-surface-muted disabled:opacity-40 disabled:hover:bg-transparent'

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <div className="flex items-center gap-2 border-b border-border bg-surface-muted px-3 py-1.5">
        {running ? (
          <>
            <span className="truncate text-xs text-content-muted" title={url ?? undefined}>
              {url ?? 'Preview running'}
            </span>
            <button className={btnClass} onClick={() => setReloadKey((k) => k + 1)}>
              Reload
            </button>
            <button className={btnClass} onClick={() => void stopPreview()}>
              Stop
            </button>
          </>
        ) : (
          <button
            className="rounded bg-accent px-2.5 py-1 text-xs text-accent-fg hover:opacity-90 disabled:opacity-40"
            disabled={starting}
            onClick={() => void handleStart()}
          >
            {starting ? 'Starting…' : 'Start Preview'}
          </button>
        )}
        <button
          className={`ml-auto ${btnClass}`}
          disabled={!running}
          title={
            config?.geminiAnalysisEnabled
              ? 'Capture the preview and have Gemini analyze it'
              : 'Enable Gemini screenshot analysis in Settings to use this'
          }
          onClick={() => void handleScreenshot()}
        >
          Screenshot
        </button>
      </div>

      <div className="min-h-0 flex-1">
        {running && url ? (
          <div className="h-full w-full border border-border">
            <iframe
              key={reloadKey}
              src={url}
              className="h-full w-full border-0"
              title="preview"
            />
          </div>
        ) : running ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-content-muted">Starting preview server…</p>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
            <p className="text-sm text-content-muted">
              {starting ? 'Starting preview server…' : 'Preview is not running.'}
            </p>
            {previewStatus?.error && (
              <p className="text-sm text-red-600 dark:text-red-400">{previewStatus.error}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

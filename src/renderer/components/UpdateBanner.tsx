import { useEffect } from 'react'
import { useStore } from '../store/useStore'

/**
 * App-wide auto-update banner. Renders across the top of the window whenever an
 * update is in flight or ready, independent of the Settings modal. This is what
 * makes applying updates effortless: the app auto-checks shortly after launch,
 * auto-downloads, and this banner then offers a one-click "Restart & Install".
 *
 * States shown:
 *  - available / downloading: progress info (dismissible)
 *  - downloaded: prominent "Restart & Install" call to action
 *  - error: shown so a failed update is never silent
 *
 * The idle states (checking / not-available) are intentionally not shown here
 * to avoid noise — those are surfaced in Settings where the user asked.
 */
export function UpdateBanner(): JSX.Element | null {
  const updateStatus = useStore((s) => s.updateStatus)
  const installUpdate = useStore((s) => s.installUpdate)
  const dismissUpdate = useStore((s) => s.dismissUpdate)

  // Auto-dismiss the transient "you're up to date" confirmation after a bit.
  useEffect(() => {
    if (updateStatus?.state !== 'not-available') return
    const t = setTimeout(() => dismissUpdate(), 6000)
    return () => clearTimeout(t)
  }, [updateStatus, dismissUpdate])

  if (!updateStatus) return null
  const { state } = updateStatus

  if (state === 'not-available') {
    return (
      <div className="flex items-center justify-between gap-4 bg-green-500/15 px-4 py-2 text-sm text-green-700 dark:text-green-400">
        <span className="font-medium">
          ✓ You are on the current version
          {updateStatus.version ? ` (v${updateStatus.version})` : ''}.
        </span>
        <button
          className="text-xs opacity-70 hover:opacity-100"
          onClick={() => dismissUpdate()}
        >
          Dismiss ✕
        </button>
      </div>
    )
  }

  if (state === 'downloaded') {
    return (
      <div className="flex items-center justify-between gap-4 bg-accent px-4 py-2 text-sm text-accent-fg">
        <span>
          Update{updateStatus.version ? ` v${updateStatus.version}` : ''} downloaded
          and ready. Restart to install.
        </span>
        <div className="flex items-center gap-2">
          <button
            className="rounded bg-white/20 px-3 py-1 text-sm font-medium hover:bg-white/30"
            onClick={() => installUpdate()}
          >
            Restart &amp; Install
          </button>
          <button
            className="text-xs opacity-80 hover:opacity-100"
            onClick={() => dismissUpdate()}
            title="Install later (on next quit)"
          >
            Later ✕
          </button>
        </div>
      </div>
    )
  }

  if (state === 'available' || state === 'downloading') {
    return (
      <div className="flex items-center justify-between gap-4 bg-accent/15 px-4 py-2 text-sm text-accent">
        <span>
          {state === 'available'
            ? `Update${updateStatus.version ? ` v${updateStatus.version}` : ''} available — downloading…`
            : `Downloading update… ${Math.round(updateStatus.percent ?? 0)}%`}
        </span>
        <button
          className="text-xs opacity-70 hover:opacity-100"
          onClick={() => dismissUpdate()}
        >
          Dismiss ✕
        </button>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="flex items-center justify-between gap-4 bg-red-500/15 px-4 py-2 text-sm text-red-700 dark:text-red-300">
        <span>Update failed: {updateStatus.error ?? 'unknown error'}</span>
        <button
          className="text-xs opacity-70 hover:opacity-100"
          onClick={() => dismissUpdate()}
        >
          Dismiss ✕
        </button>
      </div>
    )
  }

  return null
}

import { useEffect, useState } from 'react'
import type { Prereq } from '@shared/types'

/**
 * On launch, checks external prerequisites (Ollama, Node.js) and, if any are
 * missing, shows a one-time notification listing what's absent, what it
 * affects, and a button to open its download page. Nothing here blocks using
 * the app — it's purely informational so a user who skipped a prerequisite at
 * install time knows why a feature (e.g. local models) is unavailable.
 */
export function PrereqNotice(): JSX.Element | null {
  const [missing, setMissing] = useState<Prereq[] | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    let alive = true
    void window.api
      .checkPrereqs()
      .then((prereqs) => {
        if (!alive) return
        const absent = prereqs.filter((p) => !p.installed)
        setMissing(absent)
      })
      .catch(() => setMissing([]))
    return () => {
      alive = false
    }
  }, [])

  if (dismissed || !missing || missing.length === 0) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[460px] rounded-lg border border-border bg-surface-raised p-5 shadow-xl">
        <h2 className="mb-1 text-lg font-semibold text-content">
          Some prerequisites are missing
        </h2>
        <p className="mb-4 text-sm text-content-muted">
          The app works without these, but the features below are unavailable
          until they're installed. You can install them any time and restart.
        </p>

        <div className="space-y-3">
          {missing.map((p) => (
            <div
              key={p.id}
              className="rounded border border-border bg-surface p-3"
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="font-medium text-content">{p.name}</span>
                <button
                  type="button"
                  className="rounded bg-accent px-3 py-1 text-xs text-accent-fg hover:opacity-90"
                  onClick={() => void window.api.openExternal(p.downloadUrl)}
                >
                  Download {p.name}
                </button>
              </div>
              <p className="text-xs text-content-muted">{p.impact}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            className="rounded border border-border px-3 py-1.5 text-sm text-content hover:bg-surface-muted"
            onClick={() => setDismissed(true)}
          >
            Continue anyway
          </button>
        </div>
      </div>
    </div>
  )
}

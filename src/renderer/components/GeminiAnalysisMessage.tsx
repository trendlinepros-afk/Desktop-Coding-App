import type { ChatMessage } from '@shared/types'
import { useStore } from '../store/useStore'

interface GeminiAnalysisMessageProps {
  message: ChatMessage
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/** Renders a Gemini vision analysis message with fix / skip controls. */
export function GeminiAnalysisMessage({
  message
}: GeminiAnalysisMessageProps): JSX.Element | null {
  const config = useStore((s) => s.config)
  const resolveGeminiAnalysis = useStore((s) => s.resolveGeminiAnalysis)

  const g = message.gemini
  if (!g) return null

  const autoFix = config?.autoFixFromGemini ?? false
  const showButtons = !autoFix && g.actionTaken === null

  const statusLabel = g.actionTaken ?? 'Pending'

  return (
    <div className="my-2 rounded-lg border border-border bg-surface-raised p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-content">Gemini Analysis</span>
        <span className="text-xs text-content-muted">{formatTime(message.createdAt)}</span>
      </div>

      {g.screenshotBase64 && (
        <img
          src={`data:image/png;base64,${g.screenshotBase64}`}
          alt="Analyzed preview screenshot"
          className="mb-2 max-h-[200px] w-auto rounded border border-border object-contain"
        />
      )}

      <div className="mb-2 flex items-center gap-2">
        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-content-muted">
          {g.issueCount} issue(s) detected
        </span>
      </div>

      {g.analysis && (
        <p className="mb-2 whitespace-pre-wrap break-words text-sm text-content">
          {g.analysis}
        </p>
      )}

      {g.changes.length > 0 && (
        <ul className="mb-2 space-y-0.5 rounded bg-surface-muted p-2 text-xs text-content-muted">
          {g.changes.map((c, idx) => (
            <li key={idx} className="flex justify-between gap-2">
              <span className="truncate font-mono">{c.path}</span>
              <span className="shrink-0 uppercase">{c.action}</span>
            </li>
          ))}
        </ul>
      )}

      {showButtons ? (
        <div className="flex gap-2">
          <button
            className="rounded bg-accent px-3 py-1.5 text-sm text-accent-fg hover:opacity-90"
            onClick={() => void resolveGeminiAnalysis(message.id, true)}
          >
            Fix
          </button>
          <button
            className="rounded border border-border px-3 py-1.5 text-sm hover:bg-surface-muted"
            onClick={() => void resolveGeminiAnalysis(message.id, false)}
          >
            Don&apos;t Fix
          </button>
        </div>
      ) : (
        <div className="text-xs font-medium text-content-muted">
          Status: {statusLabel}
        </div>
      )}
    </div>
  )
}

import { useStore } from '../store/useStore'

/**
 * Confirmation modal shown before sending a request to a paid cloud model.
 * Displays the estimated token usage and dollar cost; the user confirms or
 * cancels. Local (Ollama) models never trigger this.
 */
export function CostConfirmModal(): JSX.Element | null {
  const { pendingSend, confirmPendingSend, cancelPendingSend } = useStore()
  if (!pendingSend) return null
  const { estimate } = pendingSend

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[420px] rounded-lg border border-border bg-surface-raised p-5 shadow-xl">
        <h2 className="mb-2 text-lg font-semibold">Confirm paid request</h2>
        <p className="mb-4 text-sm text-content-muted">
          This request uses <b>{estimate.modelId}</b>.
        </p>
        <div className="mb-4 space-y-1 rounded bg-surface-muted p-3 text-sm">
          <div className="flex justify-between">
            <span>Input tokens (est.)</span>
            <span>{estimate.inputTokens.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Max output tokens</span>
            <span>{estimate.estimatedOutputTokens.toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Estimated cost</span>
            <span>${estimate.estimatedCostUsd.toFixed(4)}</span>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            className="rounded border border-border px-3 py-1.5 text-sm hover:bg-surface-muted"
            onClick={cancelPendingSend}
          >
            Cancel
          </button>
          <button
            className="rounded bg-accent px-3 py-1.5 text-sm text-accent-fg hover:opacity-90"
            onClick={() => void confirmPendingSend()}
          >
            Continue (~${estimate.estimatedCostUsd.toFixed(4)})
          </button>
        </div>
      </div>
    </div>
  )
}

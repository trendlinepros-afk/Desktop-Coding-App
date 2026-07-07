import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import type { ModelDescriptor } from '@shared/types'

/**
 * Model dropdown shown above the chat. Lists every model from the store,
 * greys out unavailable ones, and exposes a "Load Model" action for the
 * selected local (Ollama) model.
 */

/** Extract the Ollama model name from an id like "ollama:mistral:7b". */
function ollamaNameFromId(id: string): string | null {
  if (!id.startsWith('ollama:')) return null
  return id.slice('ollama:'.length)
}

/** Inline VRAM label for a model (local only). */
function vramLabel(model: ModelDescriptor): string {
  if (!model.isLocal) return ''
  if (model.vramGb != null) return `${model.vramGb} GB`
  return '— GB'
}

/** Build the hover tooltip text for a model row. */
function tooltipFor(model: ModelDescriptor, gpuVramGb: number): string {
  const lines: string[] = [model.name, `Provider: ${model.providerLabel}`]
  if (model.isLocal) {
    if (model.vramGb != null) {
      const pct =
        gpuVramGb > 0 ? Math.round((model.vramGb / gpuVramGb) * 100) : 0
      lines.push(`VRAM: ${model.vramGb} GB (${pct}% of ${gpuVramGb} GB total)`)
    } else {
      lines.push('VRAM: unknown')
    }
  } else {
    lines.push('Cloud API')
  }
  if (model.speedHint) lines.push(`Speed: ${model.speedHint}`)
  if (!model.available && model.unavailableReason) {
    lines.push(`Unavailable: ${model.unavailableReason}`)
  }
  return lines.join('\n')
}

type LoadState = 'idle' | 'loading' | 'loaded' | 'error'

export function ModelSwitcher(): JSX.Element {
  const models = useStore((s) => s.models)
  const selectedModelId = useStore((s) => s.selectedModelId)
  const selectModel = useStore((s) => s.selectModel)
  const config = useStore((s) => s.config)
  const setBanner = useStore((s) => s.setBanner)

  const [open, setOpen] = useState(false)
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const containerRef = useRef<HTMLDivElement>(null)

  const gpuVramGb = config?.gpuVramGb ?? 0
  const selected = models.find((m) => m.id === selectedModelId) ?? null
  const selectedOllamaName = selected ? ollamaNameFromId(selected.id) : null

  // Close the dropdown on any click outside the component.
  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  // Reset transient load state whenever the selected model changes.
  useEffect(() => {
    setLoadState('idle')
  }, [selectedModelId])

  const handleSelect = (model: ModelDescriptor): void => {
    if (!model.available) return
    void selectModel(model.id)
    setOpen(false)
  }

  const handleLoad = async (): Promise<void> => {
    if (!selectedOllamaName) return
    setLoadState('loading')
    try {
      const res = await window.api.loadOllamaModel(selectedOllamaName)
      if (res.ok) {
        setLoadState('loaded')
      } else {
        setLoadState('error')
        setBanner({ kind: 'error', text: `Failed to load model: ${res.error ?? 'unknown error'}` })
      }
    } catch (err) {
      setLoadState('error')
      setBanner({ kind: 'error', text: `Failed to load model: ${(err as Error).message}` })
    }
  }

  return (
    <div ref={containerRef} className="relative flex items-center gap-2">
      <button
        type="button"
        className="flex min-w-[220px] items-center justify-between gap-2 rounded border border-border bg-surface-raised px-3 py-1.5 text-sm hover:bg-surface-muted"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex flex-col items-start leading-tight">
          <span className="font-medium text-content">
            {selected ? selected.name : 'Select a model'}
          </span>
          {selected && (
            <span className="text-xs text-content-muted">
              {selected.providerLabel}
              {vramLabel(selected) ? ` · ${vramLabel(selected)}` : ''}
            </span>
          )}
        </span>
        <span className="text-content-muted">▾</span>
      </button>

      {selectedOllamaName && (
        <button
          type="button"
          className="rounded border border-border bg-surface-raised px-3 py-1.5 text-sm hover:bg-surface-muted disabled:opacity-50"
          disabled={loadState === 'loading'}
          onClick={() => void handleLoad()}
          title="Load the selected local model into Ollama memory"
        >
          {loadState === 'loading'
            ? 'Loading…'
            : loadState === 'loaded'
              ? 'Loaded ✓'
              : 'Load Model'}
        </button>
      )}

      {open && (
        <div className="absolute left-0 top-full z-40 mt-1 max-h-80 w-80 overflow-y-auto rounded-md border border-border bg-surface-raised py-1 shadow-xl">
          {models.length === 0 && (
            <div className="px-3 py-2 text-sm text-content-muted">No models available</div>
          )}
          {models.map((model) => {
            const isSelected = model.id === selectedModelId
            return (
              <button
                type="button"
                key={model.id}
                title={tooltipFor(model, gpuVramGb)}
                disabled={!model.available}
                onClick={() => handleSelect(model)}
                className={`flex w-full items-start justify-between gap-2 px-3 py-2 text-left text-sm ${
                  model.available
                    ? 'cursor-pointer text-content hover:bg-surface-muted'
                    : 'cursor-not-allowed text-content-muted opacity-60'
                } ${isSelected ? 'bg-accent/15' : ''}`}
              >
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="flex items-center gap-1.5 font-medium">
                    {model.name}
                    {isSelected && <span className="text-accent">●</span>}
                  </span>
                  <span className="text-xs text-content-muted">{model.providerLabel}</span>
                  {model.description && (
                    <span className="mt-0.5 text-xs text-content-muted">
                      {model.description}
                    </span>
                  )}
                  {!model.available && model.unavailableReason && (
                    <span className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">
                      {model.unavailableReason}
                    </span>
                  )}
                </span>
                {/* Inline VRAM badge — always visible, no hover needed. */}
                {vramLabel(model) && (
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${
                      model.available
                        ? 'bg-surface-muted text-content-muted'
                        : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                    }`}
                    title="Estimated VRAM (from the model's size)"
                  >
                    {vramLabel(model)}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

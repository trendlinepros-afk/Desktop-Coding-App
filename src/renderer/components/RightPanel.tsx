import { useStore } from '../store/useStore'
import type { RightPanelMode } from '../store/useStore'
import { CodeEditor } from './CodeEditor'
import { LivePreview } from './LivePreview'

/**
 * Wraps the right-hand workspace, toggling between the code editor and the live
 * preview via a segmented control driven by the store's rightPanelMode.
 */
export function RightPanel(): JSX.Element {
  const rightPanelMode = useStore((s) => s.rightPanelMode)
  const setRightPanelMode = useStore((s) => s.setRightPanelMode)

  const segClass = (mode: RightPanelMode): string =>
    `px-3 py-1 text-sm rounded transition-colors ${
      rightPanelMode === mode
        ? 'bg-accent text-accent-fg'
        : 'text-content-muted hover:bg-surface-muted'
    }`

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <div className="flex items-center gap-1 border-b border-border bg-surface p-2">
        <div className="flex gap-1 rounded bg-surface-muted p-0.5">
          <button className={segClass('editor')} onClick={() => setRightPanelMode('editor')}>
            Code Editor
          </button>
          <button className={segClass('preview')} onClick={() => setRightPanelMode('preview')}>
            Live Preview
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        {rightPanelMode === 'editor' ? <CodeEditor /> : <LivePreview />}
      </div>
    </div>
  )
}

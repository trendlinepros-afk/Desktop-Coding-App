import { useEffect, useState } from 'react'
import type { OnMount } from '@monaco-editor/react'
import Editor from '@monaco-editor/react'
import { useStore } from '../store/useStore'
import { FileTree } from './FileTree'

/** Map a file extension to a Monaco language id. */
function languageForPath(path: string | null): string {
  if (!path) return 'plaintext'
  const ext = path.slice(path.lastIndexOf('.') + 1).toLowerCase()
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'typescript'
    case 'js':
    case 'jsx':
      return 'javascript'
    case 'py':
      return 'python'
    case 'java':
      return 'java'
    case 'html':
      return 'html'
    case 'css':
      return 'css'
    case 'json':
      return 'json'
    case 'md':
      return 'markdown'
    default:
      return 'plaintext'
  }
}

function editorTheme(): 'vs-dark' | 'light' {
  return document.documentElement.classList.contains('dark') ? 'vs-dark' : 'light'
}

/**
 * Monaco-based editor for the currently open file. Handles the three top-level
 * states: no project (prompt to create/open), project but no open file (tree +
 * hint), and an open file (tree + editor).
 */
export function CodeEditor(): JSX.Element {
  const project = useStore((s) => s.project)
  const openFilePath = useStore((s) => s.openFilePath)
  const openFileContent = useStore((s) => s.openFileContent)
  const saveOpenFile = useStore((s) => s.saveOpenFile)
  const setBanner = useStore((s) => s.setBanner)

  const [draft, setDraft] = useState<string>(openFileContent)

  // Re-sync the local draft whenever the open file (or its content) changes.
  useEffect(() => {
    setDraft(openFileContent)
  }, [openFilePath, openFileContent])

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(draft)
    } catch {
      setBanner({ kind: 'error', text: 'Copy to clipboard failed.' })
    }
  }

  const handleMount: OnMount = (editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      void saveOpenFile(editor.getValue())
    })
  }

  // ---- No project ----
  // The project create/open buttons live in the chat panel only (single source),
  // so here we just point the user there instead of duplicating them.
  if (!project) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1 bg-surface p-8 text-center">
        <h2 className="text-lg font-semibold text-content">No project open</h2>
        <p className="max-w-xs text-sm text-content-muted">
          Use <span className="font-medium text-content">New Project</span> or{' '}
          <span className="font-medium text-content">Open Folder</span> in the
          chat panel to start coding.
        </p>
      </div>
    )
  }

  const btnClass =
    'rounded border border-border px-2 py-0.5 text-xs text-content hover:bg-surface-muted disabled:opacity-40'

  return (
    <div className="flex h-full min-h-0">
      <div className="w-[220px] shrink-0 overflow-hidden border-r border-border bg-surface">
        <FileTree />
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-surface">
        {openFilePath ? (
          <>
            <div className="flex items-center gap-2 border-b border-border bg-surface-muted px-3 py-1.5">
              <span className="truncate text-xs text-content-muted" title={openFilePath}>
                {openFilePath}
              </span>
              <div className="ml-auto flex gap-1">
                <button className={btnClass} onClick={() => void handleCopy()}>
                  Copy
                </button>
                <button
                  className="rounded bg-accent px-2 py-0.5 text-xs text-accent-fg hover:opacity-90"
                  onClick={() => void saveOpenFile(draft)}
                >
                  Save
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1">
              <Editor
                height="100%"
                language={languageForPath(openFilePath)}
                theme={editorTheme()}
                value={draft}
                onChange={(value) => setDraft(value ?? '')}
                onMount={handleMount}
                options={{ fontSize: 13, minimap: { enabled: false }, automaticLayout: true }}
              />
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-content-muted">Select a file to edit.</p>
          </div>
        )}
      </div>
    </div>
  )
}

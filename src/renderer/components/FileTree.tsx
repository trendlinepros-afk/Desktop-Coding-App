import { useState } from 'react'
import type { FileNode } from '@shared/types'
import { useStore } from '../store/useStore'

/**
 * Recursive file tree for the active project. Reads everything it needs from the
 * store (fileTree, openFilePath, openFile, deleteFile, refreshFileTree) and
 * exposes a small toolbar for New File / Rename / Delete operations that talk to
 * the main process directly via window.api.
 */
export function FileTree(): JSX.Element {
  const fileTree = useStore((s) => s.fileTree)
  const openFilePath = useStore((s) => s.openFilePath)
  const openFile = useStore((s) => s.openFile)
  const deleteFile = useStore((s) => s.deleteFile)
  const refreshFileTree = useStore((s) => s.refreshFileTree)
  const setBanner = useStore((s) => s.setBanner)

  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = (path: string): void => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const handleNewFile = async (): Promise<void> => {
    const rel = window.prompt('New file path (relative to project root):')
    if (!rel || !rel.trim()) return
    try {
      await window.api.writeFile(rel.trim(), '')
      await refreshFileTree()
      await openFile(rel.trim())
    } catch (err) {
      setBanner({ kind: 'error', text: `Cannot create ${rel}: ${(err as Error).message}` })
    }
  }

  const handleRename = async (): Promise<void> => {
    if (!openFilePath) return
    const next = window.prompt('New path for this file:', openFilePath)
    if (!next || !next.trim() || next.trim() === openFilePath) return
    try {
      await window.api.renameFile(openFilePath, next.trim())
      await refreshFileTree()
      await openFile(next.trim())
    } catch (err) {
      setBanner({ kind: 'error', text: `Cannot rename: ${(err as Error).message}` })
    }
  }

  const handleDelete = async (): Promise<void> => {
    if (!openFilePath) return
    if (!window.confirm(`Delete ${openFilePath}?`)) return
    try {
      await deleteFile(openFilePath)
    } catch (err) {
      setBanner({ kind: 'error', text: `Cannot delete: ${(err as Error).message}` })
    }
  }

  const btnClass =
    'rounded border border-border px-2 py-0.5 text-xs text-content hover:bg-surface-muted disabled:opacity-40 disabled:hover:bg-transparent'

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap gap-1 border-b border-border p-2">
        <button className={btnClass} onClick={() => void handleNewFile()}>
          New File
        </button>
        <button className={btnClass} disabled={!openFilePath} onClick={() => void handleRename()}>
          Rename
        </button>
        <button className={btnClass} disabled={!openFilePath} onClick={() => void handleDelete()}>
          Delete
        </button>
      </div>
      <div className="flex-1 overflow-auto py-1">
        {fileTree.length === 0 ? (
          <p className="px-3 py-4 text-xs text-content-muted">No files yet.</p>
        ) : (
          fileTree.map((node) => (
            <TreeRow
              key={node.path}
              node={node}
              depth={0}
              expanded={expanded}
              toggle={toggle}
              openFilePath={openFilePath}
              onOpenFile={(p) => void openFile(p)}
            />
          ))
        )}
      </div>
    </div>
  )
}

interface TreeRowProps {
  node: FileNode
  depth: number
  expanded: Set<string>
  toggle: (path: string) => void
  openFilePath: string | null
  onOpenFile: (path: string) => void
}

function TreeRow({
  node,
  depth,
  expanded,
  toggle,
  openFilePath,
  onOpenFile
}: TreeRowProps): JSX.Element {
  const isOpen = expanded.has(node.path)
  const isActive = !node.isDirectory && node.path === openFilePath
  const indent = { paddingLeft: `${depth * 14 + 8}px` }

  return (
    <div>
      <button
        style={indent}
        className={`flex w-full items-center gap-1 py-1 pr-2 text-left text-sm text-content hover:bg-surface-muted ${
          isActive ? 'bg-accent/20' : ''
        }`}
        onClick={() => (node.isDirectory ? toggle(node.path) : onOpenFile(node.path))}
      >
        <span className="w-3 shrink-0 text-xs text-content-muted">
          {node.isDirectory ? (isOpen ? '▾' : '▸') : ''}
        </span>
        <span className="shrink-0">{node.isDirectory ? '📁' : '📄'}</span>
        <span className="truncate">{node.name}</span>
      </button>
      {node.isDirectory && isOpen && node.children && node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <TreeRow
              key={child.path}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              toggle={toggle}
              openFilePath={openFilePath}
              onOpenFile={onOpenFile}
            />
          ))}
        </div>
      )}
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import type { ThemeMode } from '@shared/config'

/**
 * Top menu / toolbar. Hosts the classic File/Edit/Settings/Help menus plus a
 * sidebar toggle on the left, and the "Auto Fix Errors From Gemini" and theme
 * quick-toggles on the right.
 */

interface MenuBarProps {
  sidebarOpen: boolean
  onToggleSidebar: () => void
}

interface MenuItem {
  label: string
  onClick: () => void
  disabled?: boolean
}

type MenuName = 'file' | 'edit' | 'settings' | 'help'

export function MenuBar({ sidebarOpen, onToggleSidebar }: MenuBarProps): JSX.Element {
  const config = useStore((s) => s.config)
  const updateConfig = useStore((s) => s.updateConfig)
  const newConversation = useStore((s) => s.newConversation)
  const project = useStore((s) => s.project)
  const setNewProjectOpen = useStore((s) => s.setNewProjectOpen)
  const setSettingsOpen = useStore((s) => s.setSettingsOpen)

  const [openMenu, setOpenMenu] = useState<MenuName | null>(null)
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!openMenu) return
    const onDocClick = (e: MouseEvent): void => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenMenu(null)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [openMenu])

  const handleNewProject = (): void => setNewProjectOpen(true)

  const handleAbout = async (): Promise<void> => {
    try {
      const version = await window.api.getAppVersion()
      window.alert(`Local LLM Coding Assistant\nVersion ${version}`)
    } catch (err) {
      window.alert(`Local LLM Coding Assistant\nVersion unknown (${(err as Error).message})`)
    }
  }

  const menus: Record<MenuName, MenuItem[]> = {
    file: [
      // New Conversation requires an active project (same rule as the sidebar).
      { label: 'New Conversation', onClick: () => newConversation(), disabled: !project },
      { label: 'New Project…', onClick: handleNewProject }
    ],
    edit: [
      { label: 'Undo', onClick: () => document.execCommand('undo') },
      { label: 'Redo', onClick: () => document.execCommand('redo') },
      { label: 'Cut', onClick: () => document.execCommand('cut') },
      { label: 'Copy', onClick: () => document.execCommand('copy') },
      { label: 'Paste', onClick: () => document.execCommand('paste') }
    ],
    settings: [{ label: 'Open Settings…', onClick: () => setSettingsOpen(true) }],
    help: [
      { label: 'About', onClick: () => void handleAbout() },
      { label: 'Check for Updates', onClick: () => void window.api.checkForUpdates() }
    ]
  }

  const runItem = (item: MenuItem): void => {
    if (item.disabled) return
    setOpenMenu(null)
    item.onClick()
  }

  const menuButton = (name: MenuName, label: string): JSX.Element => (
    <div className="relative">
      <button
        type="button"
        className={`rounded px-2 py-1 text-sm hover:bg-surface-muted ${
          openMenu === name ? 'bg-surface-muted' : ''
        }`}
        onClick={() => setOpenMenu((v) => (v === name ? null : name))}
      >
        {label}
      </button>
      {openMenu === name && (
        <div className="absolute left-0 top-full z-40 mt-1 min-w-[180px] rounded-md border border-border bg-surface-raised py-1 shadow-xl">
          {menus[name].map((item) => (
            <button
              type="button"
              key={item.label}
              disabled={item.disabled}
              onClick={() => runItem(item)}
              className="block w-full px-3 py-1.5 text-left text-sm text-content hover:bg-surface-muted disabled:opacity-50"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )

  const geminiEnabled = config?.geminiAnalysisEnabled ?? false
  const autoFixOn = config?.autoFixFromGemini ?? false

  const toggleAutoFix = (): void => {
    if (!geminiEnabled) return
    void updateConfig({ autoFixFromGemini: !autoFixOn })
  }

  const cycleTheme = (): void => {
    if (!config) return
    const order: ThemeMode[] = ['light', 'dark', 'system']
    const next = order[(order.indexOf(config.theme) + 1) % order.length]
    void updateConfig({ theme: next })
  }

  const themeGlyph =
    config?.theme === 'dark' ? '🌙' : config?.theme === 'light' ? '☀️' : '🖥️'

  return (
    <div
      ref={barRef}
      className="flex items-center justify-between border-b border-border bg-surface px-2 py-1"
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          className={`rounded px-2 py-1 text-sm hover:bg-surface-muted ${
            sidebarOpen ? 'text-content' : 'text-content-muted'
          }`}
          onClick={onToggleSidebar}
          title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
        >
          ☰
        </button>
        <span className="mr-2 select-none px-1 text-sm font-semibold text-content">
          Local LLM Coding Assistant
        </span>
        {menuButton('file', 'File')}
        {menuButton('edit', 'Edit')}
        {menuButton('settings', 'Settings')}
        {menuButton('help', 'Help')}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!geminiEnabled}
          onClick={toggleAutoFix}
          title={
            geminiEnabled
              ? 'Automatically apply Gemini-suggested fixes'
              : 'Enable Gemini analysis in Settings first'
          }
          className={`rounded px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            autoFixOn && geminiEnabled
              ? 'bg-accent text-accent-fg'
              : 'border border-border bg-surface-raised text-content hover:bg-surface-muted'
          }`}
        >
          Auto Fix Errors From Gemini: {autoFixOn && geminiEnabled ? 'On' : 'Off'}
        </button>

        <button
          type="button"
          onClick={cycleTheme}
          title={`Theme: ${config?.theme ?? 'system'} (click to cycle)`}
          className="rounded border border-border bg-surface-raised px-2 py-1 text-sm hover:bg-surface-muted"
        >
          {themeGlyph}
        </button>
      </div>
    </div>
  )
}

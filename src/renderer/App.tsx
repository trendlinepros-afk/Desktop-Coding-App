import { useEffect, useRef, useState } from 'react'
import { useStore } from './store/useStore'
import { MenuBar } from './components/MenuBar'
import { ModelSwitcher } from './components/ModelSwitcher'
import { ChatPanel } from './components/ChatPanel'
import { RightPanel } from './components/RightPanel'
import { ConversationSidebar } from './components/ConversationSidebar'
import { SettingsModal } from './components/SettingsModal'
import { CostConfirmModal } from './components/CostConfirmModal'
import { Banner } from './components/Banner'
import { UpdateBanner } from './components/UpdateBanner'
import { PrereqNotice } from './components/PrereqNotice'

/**
 * Root layout: menu bar on top, a collapsible conversation sidebar on the left,
 * and a resizable 50/50 split between the chat panel and the right panel
 * (code editor / live preview). Wires up the main->renderer streaming and
 * event subscriptions once on mount.
 */
export default function App(): JSX.Element {
  const {
    loadConfig,
    refreshModels,
    refreshOllama,
    refreshConversations,
    newConversation,
    applyTheme,
    handleStreamToken,
    handleStreamDone,
    handleStreamError,
    refreshFileTree,
    setUpdateStatus,
    settingsOpen,
    pendingSend
  } = useStore()

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [splitPct, setSplitPct] = useState(50)
  const draggingRef = useRef(false)

  // One-time bootstrap + subscriptions.
  useEffect(() => {
    void (async () => {
      await loadConfig()
      newConversation()
      await Promise.all([refreshModels(), refreshOllama(), refreshConversations()])
    })()

    const offChat = window.api.onChatStream((e) => {
      if (e.type === 'token') handleStreamToken(e.token)
      else if (e.type === 'done') void handleStreamDone(e.content)
      else if (e.type === 'error') handleStreamError(e.error)
    })
    const offFile = window.api.onFileChanged(() => void refreshFileTree())
    // Surface auto-update events app-wide so the "Restart & Install" prompt
    // appears even when the Settings modal is closed (the app auto-checks a
    // few seconds after launch).
    const offUpdate = window.api.onUpdateStatus((e) => setUpdateStatus(e))
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const onScheme = (): void => applyTheme()
    mql.addEventListener('change', onScheme)

    // Refresh model availability periodically (Ollama up/down, keys changed).
    const interval = setInterval(() => {
      void refreshOllama()
      void refreshModels()
    }, 15000)

    return () => {
      offChat()
      offFile()
      offUpdate()
      mql.removeEventListener('change', onScheme)
      clearInterval(interval)
    }
    // Intentionally run once on mount; store actions are stable references.
  }, [])

  // Split-pane drag handling.
  useEffect(() => {
    const onMove = (e: MouseEvent): void => {
      if (!draggingRef.current) return
      const pct = (e.clientX / window.innerWidth) * 100
      setSplitPct(Math.min(75, Math.max(25, pct)))
    }
    const onUp = (): void => {
      draggingRef.current = false
      document.body.style.cursor = ''
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  return (
    <div className="flex h-full flex-col bg-surface text-content">
      <MenuBar
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />
      <UpdateBanner />
      <Banner />
      <div className="flex min-h-0 flex-1">
        {sidebarOpen && <ConversationSidebar />}
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-border px-3 py-2">
            <ModelSwitcher />
          </div>
          <div className="flex min-h-0 flex-1">
            <div style={{ width: `${splitPct}%` }} className="min-w-0">
              <ChatPanel />
            </div>
            <div
              className="w-1 cursor-col-resize bg-border hover:bg-accent"
              onMouseDown={() => {
                draggingRef.current = true
                document.body.style.cursor = 'col-resize'
              }}
            />
            <div style={{ width: `${100 - splitPct}%` }} className="min-w-0">
              <RightPanel />
            </div>
          </div>
        </div>
      </div>
      {settingsOpen && <SettingsModal />}
      {pendingSend && <CostConfirmModal />}
      <PrereqNotice />
    </div>
  )
}

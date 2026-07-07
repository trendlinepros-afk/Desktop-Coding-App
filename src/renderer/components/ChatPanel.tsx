import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, KeyboardEvent } from 'react'
import { useStore } from '../store/useStore'
import { MessageBubble } from './MessageBubble'
import { GeminiAnalysisMessage } from './GeminiAnalysisMessage'

/** Left-side chat interface: message list + input composer. */
export function ChatPanel(): JSX.Element {
  const current = useStore((s) => s.current)
  const isStreaming = useStore((s) => s.isStreaming)
  const sendMessage = useStore((s) => s.sendMessage)
  const stopStreaming = useStore((s) => s.stopStreaming)
  // Chatting requires an active project so generated files have a destination
  // and the AI knows which folder it's working in.
  const project = useStore((s) => s.project)
  const openProject = useStore((s) => s.openProject)
  const setNewProjectOpen = useStore((s) => s.setNewProjectOpen)

  const [text, setText] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const messages = current?.messages ?? []
  const lastContent = messages[messages.length - 1]?.content ?? ''

  // Auto-scroll to the bottom when messages change or tokens stream in.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length, lastContent, isStreaming])

  const submit = (): void => {
    const trimmed = text.trim()
    if (!trimmed || isStreaming || !project) return
    void sendMessage(trimmed)
    setText('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const newProject = (): void => setNewProjectOpen(true)

  const openFolder = async (): Promise<void> => {
    const dir = await window.api.pickFolder()
    if (dir) await openProject(dir)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  const onInput = (e: ChangeEvent<HTMLTextAreaElement>): void => {
    setText(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex h-full flex-col bg-surface">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
        {!project ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-content-muted">
            <p className="text-sm font-medium text-content">No project open</p>
            <p className="mt-1 max-w-xs text-xs">
              Create or open a project first so the assistant knows which folder
              to work in and where to write files.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
                onClick={() => void newProject()}
              >
                New Project
              </button>
              <button
                className="rounded-md border border-border px-4 py-2 text-sm text-content hover:bg-surface-muted"
                onClick={() => void openFolder()}
              >
                Open Folder
              </button>
            </div>
          </div>
        ) : isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-content-muted">
            <p className="text-sm font-medium">Start a conversation</p>
            <p className="mt-1 text-xs">
              Ask a question or describe what you want to build in{' '}
              <span className="font-medium text-content">{project.name}</span>.
            </p>
          </div>
        ) : (
          messages.map((m) =>
            m.kind === 'gemini-analysis' ? (
              <GeminiAnalysisMessage key={m.id} message={m} />
            ) : (
              <MessageBubble key={m.id} message={m} />
            )
          )
        )}
      </div>

      <div className="border-t border-border bg-surface p-3">
        {project && (
          <div className="mb-1.5 px-1 text-xs text-content-muted">
            Working in <span className="font-medium text-content">{project.name}</span>
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={onInput}
            onKeyDown={onKeyDown}
            rows={1}
            disabled={!project}
            placeholder={
              project
                ? 'Send a message… (Enter to send, Shift+Enter for newline)'
                : 'Create or open a project to start chatting…'
            }
            className="max-h-40 flex-1 resize-none rounded-md border border-border bg-surface-muted px-3 py-2 text-sm text-content placeholder:text-content-muted focus:outline-none focus:ring-1 focus:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
          />
          {isStreaming ? (
            <button
              className="shrink-0 rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
              onClick={stopStreaming}
            >
              Stop
            </button>
          ) : (
            <button
              className="shrink-0 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-50"
              onClick={submit}
              disabled={!text.trim() || !project}
            >
              Send
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

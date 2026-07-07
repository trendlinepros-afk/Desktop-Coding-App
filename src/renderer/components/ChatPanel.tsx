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
    if (!trimmed || isStreaming) return
    void sendMessage(trimmed)
    setText('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
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
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-content-muted">
            <p className="text-sm font-medium">Start a conversation</p>
            <p className="mt-1 text-xs">
              Ask a question or describe what you want to build.
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
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={onInput}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Send a message… (Enter to send, Shift+Enter for newline)"
            className="max-h-40 flex-1 resize-none rounded-md border border-border bg-surface-muted px-3 py-2 text-sm text-content placeholder:text-content-muted focus:outline-none focus:ring-1 focus:ring-accent"
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
              disabled={!text.trim()}
            >
              Send
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

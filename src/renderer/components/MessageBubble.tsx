import type { ChatMessage } from '@shared/types'
import { CodeBlock } from './CodeBlock'

interface MessageBubbleProps {
  message: ChatMessage
}

type Segment =
  | { type: 'text'; content: string }
  | { type: 'code'; content: string; language?: string }

/**
 * Minimal markdown parse: split content on triple-backtick fenced code blocks.
 * Everything outside fences is treated as plain text (line breaks preserved).
 */
function parseSegments(content: string): Segment[] {
  const segments: Segment[] = []
  const fence = /```([^\n`]*)\n?([\s\S]*?)```/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = fence.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: content.slice(lastIndex, match.index) })
    }
    const info = (match[1] ?? '').trim()
    // language = first token of the info string, stripped of any path/title.
    const langToken = info.split(/\s+/)[0] ?? ''
    const language = langToken.split(/[/\\]/).pop() || undefined
    segments.push({
      type: 'code',
      content: match[2].replace(/\n$/, ''),
      language
    })
    lastIndex = fence.lastIndex
  }

  if (lastIndex < content.length) {
    segments.push({ type: 'text', content: content.slice(lastIndex) })
  }

  return segments
}

/** Renders a single non-Gemini chat message (user / assistant / system). */
export function MessageBubble({ message }: MessageBubbleProps): JSX.Element {
  const { role } = message

  if (role === 'system') {
    return (
      <div className="my-1 text-center text-xs italic text-content-muted">
        {message.content}
      </div>
    )
  }

  const isUser = role === 'user'
  const segments = parseSegments(message.content)

  return (
    <div className={`my-2 flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`prose-chat rounded-lg px-3 py-2 text-sm ${
            isUser
              ? 'bg-accent text-accent-fg'
              : 'bg-surface-muted text-content'
          }`}
        >
          {segments.map((seg, idx) =>
            seg.type === 'code' ? (
              <CodeBlock key={idx} code={seg.content} language={seg.language} />
            ) : (
              seg.content.trim().length > 0 && (
                <p key={idx} className="whitespace-pre-wrap break-words">
                  {seg.content.trim()}
                </p>
              )
            )
          )}
        </div>
        {!isUser && message.model && (
          <div className="mt-0.5 px-1 text-[10px] text-content-muted">
            {message.model}
          </div>
        )}
      </div>
    </div>
  )
}

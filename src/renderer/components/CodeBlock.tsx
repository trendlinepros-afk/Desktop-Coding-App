import { useState } from 'react'

interface CodeBlockProps {
  code: string
  language?: string
}

/** Keywords covering JS/TS, Python, Java, and HTML/CSS reasonably well. */
const KEYWORDS = new Set([
  // JS/TS
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while',
  'do', 'switch', 'case', 'break', 'continue', 'new', 'class', 'extends',
  'super', 'this', 'typeof', 'instanceof', 'in', 'of', 'try', 'catch',
  'finally', 'throw', 'async', 'await', 'yield', 'import', 'from', 'export',
  'default', 'interface', 'type', 'enum', 'implements', 'public', 'private',
  'protected', 'readonly', 'static', 'abstract', 'as', 'declare', 'namespace',
  'true', 'false', 'null', 'undefined', 'void', 'never', 'any', 'unknown',
  'boolean', 'number', 'string', 'object', 'symbol',
  // Python
  'def', 'elif', 'lambda', 'pass', 'with', 'None', 'True', 'False', 'and',
  'or', 'not', 'is', 'global', 'nonlocal', 'del', 'raise', 'except', 'assert',
  'self',
  // Java
  'int', 'long', 'float', 'double', 'char', 'byte', 'short', 'final', 'package',
  'this', 'throws', 'synchronized', 'volatile', 'transient', 'native'
])

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Lightweight, dependency-free highlighter. Operates on already HTML-escaped
 * source so injected spans are safe. Tokenizes strings, comments, numbers and
 * keywords in a single left-to-right scan. Never throws on odd input.
 */
function highlight(rawCode: string): string {
  try {
    const src = escapeHtml(rawCode)
    let out = ''
    let i = 0
    const len = src.length

    const isIdentChar = (c: string): boolean => /[A-Za-z0-9_$]/.test(c)

    while (i < len) {
      const ch = src[i]

      // Line comment: // ...  or  # ...
      if ((ch === '/' && src[i + 1] === '/') || ch === '#') {
        let j = i
        while (j < len && src[j] !== '\n') j++
        out += `<span class="text-content-muted">${src.slice(i, j)}</span>`
        i = j
        continue
      }

      // Block comment: /* ... */
      if (ch === '/' && src[i + 1] === '*') {
        let j = i + 2
        while (j < len && !(src[j] === '*' && src[j + 1] === '/')) j++
        j = Math.min(j + 2, len)
        out += `<span class="text-content-muted">${src.slice(i, j)}</span>`
        i = j
        continue
      }

      // Strings: '...', "...", `...`  (note: quotes are already escaped to entities)
      // Detect the escaped forms &#39; and &quot; and the literal backtick.
      const quoteMatchers: { open: string; close: string }[] = [
        { open: '&#39;', close: '&#39;' },
        { open: '&quot;', close: '&quot;' },
        { open: '`', close: '`' }
      ]
      let matchedQuote = false
      for (const q of quoteMatchers) {
        if (src.startsWith(q.open, i)) {
          let j = i + q.open.length
          while (j < len) {
            if (src[j] === '\\') {
              j += 2
              continue
            }
            if (src.startsWith(q.close, j)) {
              j += q.close.length
              break
            }
            if (src[j] === '\n' && q.close !== '`') {
              // Unterminated single/double quoted string on a line — stop here.
              break
            }
            j++
          }
          out += `<span class="text-emerald-500">${src.slice(i, j)}</span>`
          i = j
          matchedQuote = true
          break
        }
      }
      if (matchedQuote) continue

      // Numbers
      if (/[0-9]/.test(ch)) {
        let j = i
        while (j < len && /[0-9a-fA-FxX._]/.test(src[j])) j++
        out += `<span class="text-amber-500">${src.slice(i, j)}</span>`
        i = j
        continue
      }

      // Identifiers / keywords
      if (/[A-Za-z_$]/.test(ch)) {
        let j = i
        while (j < len && isIdentChar(src[j])) j++
        const word = src.slice(i, j)
        if (KEYWORDS.has(word)) {
          out += `<span class="text-sky-500">${word}</span>`
        } else {
          out += word
        }
        i = j
        continue
      }

      // Any other character (already escaped)
      out += ch
      i++
    }

    return out
  } catch {
    return escapeHtml(rawCode)
  }
}

/** Display-only, syntax-highlighted code block with a copy button. */
export function CodeBlock({ code, language }: CodeBlockProps): JSX.Element {
  const [copied, setCopied] = useState(false)

  const onCopy = (): void => {
    void navigator.clipboard
      .writeText(code)
      .then(() => {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1500)
      })
      .catch(() => {
        // clipboard unavailable — silently ignore
      })
  }

  return (
    <div className="my-2 overflow-hidden rounded-md border border-border">
      <div className="flex items-center justify-between border-b border-border bg-surface-muted px-3 py-1.5">
        <span className="text-xs font-medium text-content-muted">
          {language || 'text'}
        </span>
        <button
          className="text-xs text-content-muted hover:text-content"
          onClick={onCopy}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto bg-surface-muted p-3 font-mono text-[13px] leading-relaxed">
        <code dangerouslySetInnerHTML={{ __html: highlight(code) }} />
      </pre>
    </div>
  )
}

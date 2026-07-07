import { describe, it, expect } from 'vitest'
import { parseFileBlocks } from './file-blocks'

describe('parseFileBlocks', () => {
  it('uses an explicit title path', () => {
    const raw = '```tsx title="src/App.tsx"\nexport const A = 1\n```'
    expect(parseFileBlocks(raw)).toEqual([
      { path: 'src/App.tsx', content: 'export const A = 1\n', action: 'update' }
    ])
  })

  it('infers a filename for a single unlabeled code block and skips bash', () => {
    // Mirrors the snake-game response: a bash install block + an unlabeled
    // python block. The bash block must be skipped and the python one saved.
    const raw = [
      "Install it first:",
      '```bash',
      'pip install pygame',
      '```',
      "Here's the game:",
      '```python',
      'import pygame',
      'pygame.init()',
      '```'
    ].join('\n')
    const blocks = parseFileBlocks(raw)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].path).toBe('main.py')
    expect(blocks[0].content).toContain('import pygame')
  })

  it('detects a first-line filename comment', () => {
    const raw = '```python\n# game.py\nprint("hi")\n```'
    expect(parseFileBlocks(raw)[0].path).toBe('game.py')
  })

  it('infers distinct filenames for html/css/js when unlabeled', () => {
    const raw = [
      '```html',
      '<h1>hi</h1>',
      '```',
      '```css',
      'body{}',
      '```',
      '```js',
      'console.log(1)',
      '```'
    ].join('\n')
    const paths = parseFileBlocks(raw)
      .map((b) => b.path)
      .sort()
    expect(paths).toEqual(['index.html', 'index.js', 'style.css'])
  })

  it('treats a DELETE body as a delete action', () => {
    const raw = '```text title="old.txt"\nDELETE\n```'
    expect(parseFileBlocks(raw)).toEqual([
      { path: 'old.txt', content: '', action: 'delete' }
    ])
  })
})

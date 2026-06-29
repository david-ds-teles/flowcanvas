import { describe, it, expect } from 'vitest'
import { slugify, outlineOf, buildSourceIndex, citedDocPaths } from './spine'
import { renderMarkdown } from '../render-md'
import type { CanvasNode } from './jsoncanvas'

describe('spine slug parity (Q2)', () => {
  it('slugify === rendered heading id === agent anchor convention', async () => {
    const heading = 'Order lifecycle'
    const slug = slugify(heading)                       // 'order-lifecycle'
    expect(slug).toBe('order-lifecycle')
    const html = await renderMarkdown(`## ${heading}`)
    expect(html).toContain(`id="${slug}"`)             // rehype-slug emits the same id
  })

  it('outlineOf reads ATX headings; buildSourceIndex reverses meta.source', () => {
    expect(outlineOf('# A\n## Order lifecycle')).toEqual([
      { anchor: 'a', text: 'A', depth: 1 },
      { anchor: 'order-lifecycle', text: 'Order lifecycle', depth: 2 },
    ])
    const nodes: CanvasNode[] = [
      { id: 'n1', type: 'text', text: '', x: 0, y: 0, width: 1, height: 1,
        meta: { source: { path: 'd.md', anchor: 'order-lifecycle' } } },
      { id: 'n2', type: 'text', text: '', x: 0, y: 0, width: 1, height: 1,
        meta: { source: { path: 'other.md', anchor: 'x' } } },
    ]
    expect(buildSourceIndex(nodes, 'd.md').get('order-lifecycle')).toEqual(['n1'])
    expect(citedDocPaths(nodes)).toEqual(['d.md', 'other.md'])
  })

  it('outlineOf reuses one slugger so duplicate headings get -1 suffixes', () => {
    expect(outlineOf('## Setup\n## Setup')).toEqual([
      { anchor: 'setup', text: 'Setup', depth: 2 },
      { anchor: 'setup-1', text: 'Setup', depth: 2 },
    ])
  })

  it('outlineOf skips ATX-heading-looking lines inside fenced code blocks', () => {
    const md = '# Real\n```\n# not a heading\n## also not\n```\n## Also real'
    expect(outlineOf(md)).toEqual([
      { anchor: 'real', text: 'Real', depth: 1 },
      { anchor: 'also-real', text: 'Also real', depth: 2 },
    ])
  })

  it('buildSourceIndex ignores nodes citing other docs or lacking an anchor', () => {
    const nodes: CanvasNode[] = [
      { id: 'a', type: 'text', text: '', x: 0, y: 0, width: 1, height: 1,
        meta: { source: { path: 'd.md', anchor: 's' } } },
      { id: 'b', type: 'text', text: '', x: 0, y: 0, width: 1, height: 1,
        meta: { source: { path: 'd.md', anchor: 's' } } },
      { id: 'c', type: 'text', text: '', x: 0, y: 0, width: 1, height: 1,
        meta: { source: { path: 'd.md' } } },                  // no anchor — skipped
    ]
    expect(buildSourceIndex(nodes, 'd.md').get('s')).toEqual(['a', 'b'])
  })
})

import { describe, it, expect } from 'vitest'
import { migrateDoc } from './migrate'
import type { CanvasEdge, CanvasNode, FlowcanvasDoc } from './jsoncanvas'

const fileNode = (id: string, file: string, links?: string[]): CanvasNode => ({
  id, type: 'file', file, x: 0, y: 0, width: 100, height: 100,
  meta: { origin: 'user', frontmatter: links ? { links } : {} },
})

const docAt = (
  schemaVersion: '0.1' | '0.2' | '0.3' | '0.4',
  nodes: CanvasNode[] = [],
  edges: CanvasEdge[] = [],
): FlowcanvasDoc => ({
  nodes,
  edges,
  flowcanvas: {
    schemaVersion,
    session: { createdAt: '2026-01-01', updatedAt: '2026-01-01', revision: 0 },
    comments: [],
  },
})

describe('migrateDoc', () => {
  it('0.1 → 0.4: bakes derived links: edges, then floats + bumps to 0.4', () => {
    const nodes = [
      fileNode('a', 'examples/a.md', ['examples/b.md']),
      fileNode('b', 'examples/b.md'),
    ]
    const { doc, migrated } = migrateDoc(docAt('0.1', nodes))
    expect(migrated).toBe(true)
    expect(doc.flowcanvas.schemaVersion).toBe('0.4')
    expect(doc.edges).toHaveLength(1)
    expect(doc.edges[0]).toMatchObject({ fromNode: 'a', toNode: 'b', meta: { origin: 'links' } })
  })

  it('0.2 → 0.4: bumps through (edges untouched, migrated true)', () => {
    const { doc, migrated } = migrateDoc(docAt('0.2'))
    expect(migrated).toBe(true)
    expect(doc.flowcanvas.schemaVersion).toBe('0.4')
    expect(doc.edges).toEqual([])
  })

  it('0.3 → 0.4: floats existing edges (drops auto-assigned sides) and bumps', () => {
    const pinned: CanvasEdge = {
      id: 'e1', fromNode: 'a', toNode: 'b', fromSide: 'right', toSide: 'left',
      toEnd: 'arrow', color: '6', meta: { origin: 'user', rel: 'related' },
    }
    const { doc, migrated } = migrateDoc(docAt('0.3', [], [pinned]))
    expect(migrated).toBe(true)
    expect(doc.flowcanvas.schemaVersion).toBe('0.4')
    expect(doc.edges[0].fromSide).toBeUndefined()
    expect(doc.edges[0].toSide).toBeUndefined()
    // non-side fields are preserved — only the handle sides are dropped
    expect(doc.edges[0]).toMatchObject({ id: 'e1', toEnd: 'arrow', color: '6', meta: { origin: 'user', rel: 'related' } })
  })

  it('0.4 → 0.4: idempotent (migrated false, doc reference-preserved)', () => {
    const input = docAt('0.4')
    const { doc, migrated } = migrateDoc(input)
    expect(migrated).toBe(false)
    expect(doc).toBe(input)
  })
})

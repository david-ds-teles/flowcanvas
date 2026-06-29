import { describe, it, expect } from 'vitest'
import { migrateDoc } from './migrate'
import type { CanvasNode, FlowcanvasDoc } from './jsoncanvas'

const fileNode = (id: string, file: string, links?: string[]): CanvasNode => ({
  id, type: 'file', file, x: 0, y: 0, width: 100, height: 100,
  meta: { origin: 'user', frontmatter: links ? { links } : {} },
})

const docAt = (schemaVersion: '0.1' | '0.2' | '0.3', nodes: CanvasNode[] = []): FlowcanvasDoc => ({
  nodes,
  edges: [],
  flowcanvas: {
    schemaVersion,
    session: { createdAt: '2026-01-01', updatedAt: '2026-01-01', revision: 0 },
    comments: [],
  },
})

describe('migrateDoc', () => {
  it('0.1 → 0.3: bakes derived links: edges and bumps to 0.3', () => {
    const nodes = [
      fileNode('a', 'examples/a.md', ['examples/b.md']),
      fileNode('b', 'examples/b.md'),
    ]
    const { doc, migrated } = migrateDoc(docAt('0.1', nodes))
    expect(migrated).toBe(true)
    expect(doc.flowcanvas.schemaVersion).toBe('0.3')
    expect(doc.edges).toHaveLength(1)
    expect(doc.edges[0]).toMatchObject({ fromNode: 'a', toNode: 'b', meta: { origin: 'links' } })
  })

  it('0.2 → 0.3: no-op-but-bumped (edges untouched, migrated true)', () => {
    const input = docAt('0.2')
    const { doc, migrated } = migrateDoc(input)
    expect(migrated).toBe(true)
    expect(doc.flowcanvas.schemaVersion).toBe('0.3')
    expect(doc.edges).toEqual(input.edges)
  })

  it('0.3 → 0.3: idempotent (migrated false, doc reference-preserved)', () => {
    const input = docAt('0.3')
    const { doc, migrated } = migrateDoc(input)
    expect(migrated).toBe(false)
    expect(doc).toBe(input)
  })
})

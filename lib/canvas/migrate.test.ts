import { describe, it, expect } from 'vitest'
import { migrateDoc, normalizePorts } from './migrate'
import type { CanvasEdge, CanvasNode, FlowcanvasDoc } from './jsoncanvas'

const fileNode = (id: string, file: string, links?: string[]): CanvasNode => ({
  id, type: 'file', file, x: 0, y: 0, width: 100, height: 100,
  meta: { origin: 'user', frontmatter: links ? { links } : {} },
})

const docAt = (
  schemaVersion: '0.1' | '0.2' | '0.3' | '0.4' | '0.5',
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
  it('0.1 → 0.5: bakes derived links: edges, floats, then seeds ports + bumps to 0.5', () => {
    const nodes = [
      fileNode('a', 'examples/a.md', ['examples/b.md']),
      fileNode('b', 'examples/b.md'),
    ]
    const { doc, migrated } = migrateDoc(docAt('0.1', nodes))
    expect(migrated).toBe(true)
    expect(doc.flowcanvas.schemaVersion).toBe('0.5')
    expect(doc.edges).toHaveLength(1)
    expect(doc.edges[0]).toMatchObject({ fromNode: 'a', toNode: 'b', meta: { origin: 'links' } })
    // the full ladder runs the 0.4 → 0.5 step last: a port is seeded on each endpoint node + referenced by the edge
    expect(doc.nodes[0].meta?.ports).toHaveLength(1)
    expect(doc.nodes[1].meta?.ports).toHaveLength(1)
    expect(doc.edges[0].fromPort).toBe(doc.nodes[0].meta?.ports?.[0].id)
  })

  it('0.2 → 0.5: bumps through (edges untouched, migrated true)', () => {
    const { doc, migrated } = migrateDoc(docAt('0.2'))
    expect(migrated).toBe(true)
    expect(doc.flowcanvas.schemaVersion).toBe('0.5')
    expect(doc.edges).toEqual([])
  })

  it('0.3 → 0.5: floats existing edges (drops auto-assigned sides) and bumps', () => {
    const pinned: CanvasEdge = {
      id: 'e1', fromNode: 'a', toNode: 'b', fromSide: 'right', toSide: 'left',
      toEnd: 'arrow', color: '6', meta: { origin: 'user', rel: 'related' },
    }
    const { doc, migrated } = migrateDoc(docAt('0.3', [], [pinned]))
    expect(migrated).toBe(true)
    expect(doc.flowcanvas.schemaVersion).toBe('0.5')
    expect(doc.edges[0].fromSide).toBeUndefined()
    expect(doc.edges[0].toSide).toBeUndefined()
    // non-side fields are preserved — only the handle sides are dropped (dangling edge: no nodes ⇒ no ports seeded)
    expect(doc.edges[0]).toMatchObject({ id: 'e1', toEnd: 'arrow', color: '6', meta: { origin: 'user', rel: 'related' } })
  })

  it('0.4 → 0.5: seeds a ConnectionPort on each node + maps rel → edgeType (worked example)', () => {
    const nodes: CanvasNode[] = [
      { id: 'a', type: 'file', file: 'a.md', x: 0,   y: 0, width: 100, height: 60, meta: { origin: 'user' } },
      { id: 'b', type: 'file', file: 'b.md', x: 300, y: 0, width: 100, height: 60, meta: { origin: 'user' } },
    ]
    const edges: CanvasEdge[] = [
      // floating — no fromSide/toSide, no fromPort/toPort
      { id: 'e1', fromNode: 'a', toNode: 'b', toEnd: 'arrow', meta: { origin: 'user', rel: 'calls' } },
    ]
    const { doc, migrated } = migrateDoc(docAt('0.4', nodes, edges))
    expect(migrated).toBe(true)
    expect(doc.flowcanvas.schemaVersion).toBe('0.5')
    // autoPort(a→b) = a's right edge midpoint; autoPort(b→a) = b's left edge midpoint
    expect(doc.nodes[0].meta?.ports).toMatchObject([{ side: 'right', t: 0.5 }])
    expect(doc.nodes[1].meta?.ports).toMatchObject([{ side: 'left', t: 0.5 }])
    // edge references those ports + carries the mapped edgeType (calls → request)
    const e = doc.edges[0]
    expect(e.fromPort).toBe(doc.nodes[0].meta?.ports?.[0].id)
    expect(e.toPort).toBe(doc.nodes[1].meta?.ports?.[0].id)
    expect(e.meta?.edgeType).toBe('request')
  })

  it('0.5 → 0.5: idempotent (migrated false, doc reference-preserved)', () => {
    const input = docAt('0.5')
    const { doc, migrated } = migrateDoc(input)
    expect(migrated).toBe(false)
    expect(doc).toBe(input)
  })
})

describe('normalizePorts', () => {
  it('is idempotent — a second call returns the same reference', () => {
    const nodes: CanvasNode[] = [
      { id: 'a', type: 'file', file: 'a.md', x: 0,   y: 0, width: 100, height: 60, meta: { origin: 'user' } },
      { id: 'b', type: 'file', file: 'b.md', x: 300, y: 0, width: 100, height: 60, meta: { origin: 'user' } },
    ]
    const edges: CanvasEdge[] = [{ id: 'e1', fromNode: 'a', toNode: 'b', meta: { origin: 'user' } }]
    const once = normalizePorts(docAt('0.5', nodes, edges))
    const twice = normalizePorts(once)
    expect(twice).toBe(once)   // every endpoint already resolves ⇒ no change ⇒ same reference
  })

  it('seeds a pinned-side port from edge.fromSide (authoring sugar), not the autoPort side', () => {
    const nodes: CanvasNode[] = [
      { id: 'a', type: 'file', file: 'a.md', x: 0,   y: 0, width: 100, height: 60, meta: { origin: 'user' } },
      { id: 'b', type: 'file', file: 'b.md', x: 300, y: 0, width: 100, height: 60, meta: { origin: 'user' } },
    ]
    // fromSide 'bottom' is pinned authoring sugar — exercises seedSideT's pinned branch.
    // Geometric autoPort(a→b) would otherwise pick 'right'; the pin must win.
    const edges: CanvasEdge[] = [{ id: 'e1', fromNode: 'a', toNode: 'b', fromSide: 'bottom', meta: { origin: 'user' } }]
    const out = normalizePorts(docAt('0.5', nodes, edges))
    const aPorts = out.nodes[0].meta?.ports ?? []
    const fromPort = aPorts.find((p) => p.id === out.edges[0].fromPort)
    expect(fromPort).toMatchObject({ side: 'bottom', t: 0.5 })   // pinned branch, NOT autoPort 'right'
    // the unpinned target endpoint still falls back to geometric autoPort ('left' of b)
    expect(out.nodes[1].meta?.ports).toMatchObject([{ side: 'left', t: 0.5 }])
  })
})

import { describe, it, expect } from 'vitest'
import type { CanvasNode, CanvasEdge } from './jsoncanvas'
import { computeLayout, organizeByType, type MeasuredSizes } from './layout'

// Small board: two connected top-level nodes, an island, and a group with one child.
const nodes: CanvasNode[] = [
  { id: 'n1', type: 'file', file: 'a.md', x: 0, y: 0, width: 200, height: 120, meta: { origin: 'user' } },
  { id: 'n2', type: 'file', file: 'b.md', x: 0, y: 0, width: 200, height: 120, meta: { origin: 'user' } },
  { id: 'n3', type: 'text', text: 'island', x: 0, y: 0, width: 160, height: 100, meta: { origin: 'user' } },
  { id: 'g1', type: 'group', label: 'box', x: 0, y: 0, width: 300, height: 200, meta: { origin: 'user', shape: 'rectangle' } },
  { id: 'c1', type: 'file', file: 'c.md', x: 0, y: 0, width: 150, height: 100, parentId: 'g1', meta: { origin: 'user' } },
]
const edges: CanvasEdge[] = [
  { id: 'e1', fromNode: 'n1', toNode: 'n2', meta: { origin: 'links' } },
  { id: 'e2', fromNode: 'c1', toNode: 'n2', meta: { origin: 'user' } }, // child→n2 resolves to g1→n2
]
// n1 is a tall measured card — the fallback ladder must use 300, not the authored 120.
const measured: MeasuredSizes = { n1: { width: 200, height: 300 } }

const sizeOf = (id: string) => {
  const m = measured[id]
  if (m) return m
  const n = nodes.find((x) => x.id === id)!
  return { width: n.width, height: n.height }
}
const intersects = (
  a: { x: number; y: number },
  b: { x: number; y: number },
  sa: { width: number; height: number },
  sb: { width: number; height: number },
) => a.x < b.x + sb.width && a.x + sa.width > b.x && a.y < b.y + sb.height && a.y + sa.height > b.y

describe('layout / computeLayout (ELK re-organize)', () => {
  it('lays out only top-level nodes (grouped children excluded)', async () => {
    const out = await computeLayout(nodes, edges, measured)
    expect(Object.keys(out).sort()).toEqual(['g1', 'n1', 'n2', 'n3'])
    expect(out.c1).toBeUndefined()
  })

  it('returns finite coordinates for every top-level node', async () => {
    const out = await computeLayout(nodes, edges, measured)
    for (const id of Object.keys(out)) {
      expect(Number.isFinite(out[id].x)).toBe(true)
      expect(Number.isFinite(out[id].y)).toBe(true)
    }
  })

  it('produces a non-overlapping arrangement using measured heights', async () => {
    const out = await computeLayout(nodes, edges, measured)
    const ids = Object.keys(out)
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = ids[i]
        const b = ids[j]
        expect(intersects(out[a], out[b], sizeOf(a), sizeOf(b))).toBe(false)
      }
    }
  })
})

// #7/#8 — type-banded system-design layout.
const kindNodes: CanvasNode[] = [
  { id: 'actorTop', type: 'text', text: '', x: 0, y: 0, width: 200, height: 120, meta: { origin: 'agent', kind: 'actor' } },
  { id: 'svcTop', type: 'file', file: 's.md', x: 0, y: 0, width: 240, height: 140, meta: { origin: 'agent', kind: 'service' } },
  { id: 'g', type: 'group', label: 'sys', x: 0, y: 0, width: 300, height: 200, meta: { origin: 'agent', shape: 'rectangle', kind: 'boundary' } },
  { id: 'svcA', type: 'file', file: 'a.md', x: 0, y: 0, width: 240, height: 140, parentId: 'g', meta: { origin: 'agent', kind: 'service' } },
  { id: 'svcB', type: 'file', file: 'b.md', x: 0, y: 0, width: 240, height: 140, parentId: 'g', meta: { origin: 'agent', kind: 'service' } },
  { id: 'db', type: 'file', file: 'db.md', x: 0, y: 0, width: 240, height: 160, parentId: 'g', meta: { origin: 'agent', kind: 'datastore' } },
]

describe('layout / organizeByType (type-banded system-design layout)', () => {
  it('positions every node and sizes the group container', () => {
    const { positions, sizes } = organizeByType(kindNodes)
    expect(Object.keys(positions).sort()).toEqual(['actorTop', 'db', 'g', 'svcA', 'svcB', 'svcTop'])
    expect(sizes.g.width).toBeGreaterThan(0)
    expect(sizes.g.height).toBeGreaterThan(0)
  })

  it('orders top-level bands left→right by kind (actor before service before group)', () => {
    const { positions } = organizeByType(kindNodes)
    expect(positions.actorTop.x).toBeLessThan(positions.svcTop.x)
    expect(positions.svcTop.x).toBeLessThan(positions.g.x)
  })

  it('bands group children by kind — same-kind share a column and stack; other kinds shift right', () => {
    const { positions } = organizeByType(kindNodes)
    expect(positions.svcA.x).toBe(positions.svcB.x)        // both service → same band column
    expect(positions.svcA.y).not.toBe(positions.svcB.y)    // stacked vertically
    expect(positions.db.x).toBeGreaterThan(positions.svcA.x) // datastore band is right of the service band
  })

  it('resizes the group to fully enclose its children (design-system §8)', () => {
    const { positions, sizes } = organizeByType(kindNodes)
    const g = positions.g
    const gs = sizes.g
    for (const c of kindNodes.filter((n) => n.parentId === 'g')) {
      const p = positions[c.id]
      expect(p.x).toBeGreaterThanOrEqual(g.x)
      expect(p.y).toBeGreaterThanOrEqual(g.y)
      expect(p.x + c.width).toBeLessThanOrEqual(g.x + gs.width)
      expect(p.y + c.height).toBeLessThanOrEqual(g.y + gs.height)
    }
  })

  it('pins the core-doc card to the leftmost band when coreDocPath is given', () => {
    const withCore: CanvasNode[] = [
      { id: 'core', type: 'file', file: 'board.md', x: 0, y: 0, width: 320, height: 220, meta: { origin: 'agent' } },
      { id: 'svc', type: 'file', file: 'board.nodes/svc.md', x: 0, y: 0, width: 260, height: 120, meta: { origin: 'agent', kind: 'service' } },
      { id: 'act', type: 'file', file: 'board.nodes/act.md', x: 0, y: 0, width: 260, height: 120, meta: { origin: 'agent', kind: 'actor' } },
    ]
    const { positions } = organizeByType(withCore, 'board.md')
    expect(positions.core.x).toBeLessThan(positions.act.x)   // core-doc card sits left of the actor band
    expect(positions.act.x).toBeLessThan(positions.svc.x)    // actors still left of services
  })

  it('without coreDocPath the core-doc-shaped card falls in the unkinded (rightmost) band', () => {
    const withCore: CanvasNode[] = [
      { id: 'core', type: 'file', file: 'board.md', x: 0, y: 0, width: 320, height: 220, meta: { origin: 'agent' } },
      { id: 'act', type: 'file', file: 'board.nodes/act.md', x: 0, y: 0, width: 260, height: 120, meta: { origin: 'agent', kind: 'actor' } },
    ]
    const { positions } = organizeByType(withCore)                // no coreDocPath → no special pinning
    expect(positions.core.x).toBeGreaterThan(positions.act.x)     // unkinded band is rightmost
  })
})

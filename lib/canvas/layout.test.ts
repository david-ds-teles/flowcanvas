import { describe, it, expect } from 'vitest'
import type { CanvasNode, CanvasEdge } from './jsoncanvas'
import { computeLayout, organizeByType, GROUP_PAD, MAX_GROUP_WIDTH, MAX_ROW_WIDTH, type MeasuredSizes } from './layout'

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

// "Organize by type" — readable, wrapped system-design layout.
const kindNodes: CanvasNode[] = [
  { id: 'actorTop', type: 'text', text: '', x: 0, y: 0, width: 200, height: 120, meta: { origin: 'agent', kind: 'actor' } },
  { id: 'extTop', type: 'file', file: 's.md', x: 0, y: 0, width: 240, height: 140, meta: { origin: 'agent', kind: 'external' } },
  { id: 'g', type: 'group', label: 'sys', x: 0, y: 0, width: 300, height: 200, meta: { origin: 'agent', shape: 'rectangle', kind: 'boundary' } },
  { id: 'svcA', type: 'file', file: 'a.md', x: 0, y: 0, width: 240, height: 140, parentId: 'g', meta: { origin: 'agent', kind: 'service' } },
  { id: 'svcB', type: 'file', file: 'b.md', x: 0, y: 0, width: 240, height: 140, parentId: 'g', meta: { origin: 'agent', kind: 'service' } },
  { id: 'db', type: 'file', file: 'db.md', x: 0, y: 0, width: 240, height: 160, parentId: 'g', meta: { origin: 'agent', kind: 'datastore' } },
]

// A group with many children — exercises the within-group grid wrap.
const wideGroup: CanvasNode[] = [
  { id: 'wg', type: 'group', label: 'wide', x: 0, y: 0, width: 300, height: 200, meta: { origin: 'agent', kind: 'boundary' } },
  ...Array.from({ length: 6 }, (_, i): CanvasNode => ({
    id: `c${i}`, type: 'file', file: `c${i}.md`, x: 0, y: 0, width: 240, height: 120,
    parentId: 'wg', meta: { origin: 'agent', kind: 'service' },
  })),
]

// Many wide groups — exercises the top-level shelf-row wrap (the anti-strip contract).
const manyGroups: CanvasNode[] = Array.from({ length: 5 }, (_, i) => i).flatMap((i): CanvasNode[] => [
  { id: `g${i}`, type: 'group', label: `g${i}`, x: 0, y: 0, width: 300, height: 200, meta: { origin: 'agent', kind: 'boundary' } },
  { id: `g${i}c`, type: 'file', file: `g${i}c.md`, x: 0, y: 0, width: 700, height: 120, parentId: `g${i}`, meta: { origin: 'agent', kind: 'service' } },
])

describe('layout / organizeByType (readable wrapped layout)', () => {
  it('positions every node and sizes the group container', () => {
    const { positions, sizes } = organizeByType(kindNodes)
    expect(Object.keys(positions).sort()).toEqual(['actorTop', 'db', 'extTop', 'g', 'svcA', 'svcB'])
    expect(sizes.g.width).toBeGreaterThan(0)
    expect(sizes.g.height).toBeGreaterThan(0)
  })

  it('reads in tiers top→bottom: source leaves, then groups, then notes/loose cards', () => {
    const tiered: CanvasNode[] = [
      { id: 'act', type: 'file', file: 'act.md', x: 0, y: 0, width: 240, height: 120, meta: { origin: 'agent', kind: 'actor' } },
      { id: 'grp', type: 'group', label: 'sys', x: 0, y: 0, width: 300, height: 200, meta: { origin: 'agent', kind: 'boundary' } },
      { id: 'svc', type: 'file', file: 'svc.md', x: 0, y: 0, width: 240, height: 120, parentId: 'grp', meta: { origin: 'agent', kind: 'service' } },
      { id: 'note', type: 'text', text: 'legend', x: 0, y: 0, width: 240, height: 100, meta: { origin: 'agent' } },
    ]
    const { positions } = organizeByType(tiered)
    expect(positions.act.y).toBeLessThan(positions.grp.y)   // sources above subsystems
    expect(positions.grp.y).toBeLessThan(positions.note.y)  // subsystems above notes
  })

  it('orders group children by band rank so same-kind cards cluster (services before datastore)', () => {
    const { positions } = organizeByType(kindNodes)
    expect(positions.svcA.y).toBeLessThanOrEqual(positions.db.y) // datastore is last in reading order
  })

  it('wraps a many-child group into a bounded grid (group width <= MAX_GROUP_WIDTH + padding)', () => {
    const { positions, sizes } = organizeByType(wideGroup)
    expect(sizes.wg.width).toBeLessThanOrEqual(MAX_GROUP_WIDTH + 2 * GROUP_PAD)
    const rowYs = new Set(Object.keys(positions).filter((id) => id.startsWith('c')).map((id) => positions[id].y))
    expect(rowYs.size).toBeGreaterThan(1) // children wrap onto more than one row
  })

  it('wraps top-level groups into shelf rows — never an infinite horizontal strip', () => {
    const { positions, sizes } = organizeByType(manyGroups)
    const groupIds = Object.keys(sizes).filter((id) => id.startsWith('g') && !id.endsWith('c'))
    const rightEdges = groupIds.map((id) => positions[id].x + sizes[id].width)
    for (const right of rightEdges) expect(right).toBeLessThanOrEqual(80 + MAX_ROW_WIDTH) // ORIGIN_X + budget
    const rowYs = new Set(groupIds.map((id) => positions[id].y))
    expect(rowYs.size).toBeGreaterThan(1) // five wide groups span multiple rows
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

  it('pins the core-doc card as the top-left entry point when coreDocPath is given', () => {
    const withCore: CanvasNode[] = [
      { id: 'core', type: 'file', file: 'board.md', x: 0, y: 0, width: 320, height: 220, meta: { origin: 'agent' } },
      { id: 'svc', type: 'file', file: 'board.nodes/svc.md', x: 0, y: 0, width: 260, height: 120, meta: { origin: 'agent', kind: 'service' } },
      { id: 'act', type: 'file', file: 'board.nodes/act.md', x: 0, y: 0, width: 260, height: 120, meta: { origin: 'agent', kind: 'actor' } },
    ]
    const { positions } = organizeByType(withCore, 'board.md')
    expect(positions.core.x).toBeLessThan(positions.act.x)   // core-doc card sits left of the actor
    expect(positions.core.y).toBeLessThanOrEqual(positions.act.y)
  })

  it('without coreDocPath the unkinded card falls in the last (notes/loose) tier — below kinded cards', () => {
    const withCore: CanvasNode[] = [
      { id: 'core', type: 'file', file: 'board.md', x: 0, y: 0, width: 320, height: 220, meta: { origin: 'agent' } },
      { id: 'act', type: 'file', file: 'board.nodes/act.md', x: 0, y: 0, width: 260, height: 120, meta: { origin: 'agent', kind: 'actor' } },
    ]
    const { positions } = organizeByType(withCore)            // no coreDocPath → no special pinning
    expect(positions.core.y).toBeGreaterThan(positions.act.y) // unkinded card drops to the last tier
  })
})

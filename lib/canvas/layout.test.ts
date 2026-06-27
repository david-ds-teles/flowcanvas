import { describe, it, expect } from 'vitest'
import type { CanvasNode, CanvasEdge } from './jsoncanvas'
import { computeLayout, type MeasuredSizes } from './layout'

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

import { describe, it, expect, beforeEach } from 'vitest'
import type { FlowcanvasDoc } from './jsoncanvas'
import { useCanvasStore } from './store'

// The manual-edge / promotion / drag-write-back store actions can't be drag-simulated in the
// node test env, so they're exercised directly against a seeded doc (zustand outside React).
function seed(): FlowcanvasDoc {
  return {
    nodes: [
      { id: 'a', type: 'file', file: 'a.md', x: 0, y: 0, width: 100, height: 100, meta: { origin: 'user', frontmatter: { links: ['b.md'] } } },
      { id: 'b', type: 'file', file: 'b.md', x: 200, y: 0, width: 100, height: 100, meta: { origin: 'user', frontmatter: {} } },
    ],
    edges: [
      { id: 'lk:a->b', fromNode: 'a', toNode: 'b', label: 'links', color: '6', toEnd: 'arrow', meta: { origin: 'links' } },
    ],
    flowcanvas: { schemaVersion: '0.1', session: { createdAt: '2026-06-26T00:00:00Z', updatedAt: '2026-06-26T00:00:00Z', revision: 0 }, comments: [] },
  }
}

beforeEach(() => useCanvasStore.setState({ path: 'x.canvas', doc: seed(), bodies: {}, dirty: false }))

describe('store / onConnect', () => {
  it('mints a user edge with the given label and marks the doc dirty', () => {
    useCanvasStore.getState().onConnect({ source: 'b', target: 'a', sourceHandle: 'right', targetHandle: 'left' }, 'depends on')
    const { doc, dirty } = useCanvasStore.getState()
    const minted = doc!.edges.find((e) => e.fromNode === 'b' && e.toNode === 'a')!
    expect(minted).toMatchObject({ fromNode: 'b', toNode: 'a', fromSide: 'right', toSide: 'left', label: 'depends on', toEnd: 'arrow', meta: { origin: 'user' } })
    expect(dirty).toBe(true)
  })

  it('ignores a connection with a missing endpoint', () => {
    useCanvasStore.getState().onConnect({ source: '', target: 'a', sourceHandle: null, targetHandle: null }, 'x')
    expect(useCanvasStore.getState().doc!.edges).toHaveLength(1) // unchanged
  })
})

describe('store / relabelEdge', () => {
  it('promotes a derived links edge to user when relabeled (so reconcile stops rewriting it)', () => {
    useCanvasStore.getState().relabelEdge('lk:a->b', 'realizes')
    const e = useCanvasStore.getState().doc!.edges.find((x) => x.id === 'lk:a->b')!
    expect(e.label).toBe('realizes')
    expect(e.meta?.origin).toBe('user')
    expect(useCanvasStore.getState().dirty).toBe(true)
  })

  it('leaves a user edge origin unchanged on relabel', () => {
    useCanvasStore.setState({ doc: { ...seed(), edges: [{ id: 'e1', fromNode: 'a', toNode: 'b', label: 'x', meta: { origin: 'user' } }] } })
    useCanvasStore.getState().relabelEdge('e1', 'y')
    expect(useCanvasStore.getState().doc!.edges[0].meta?.origin).toBe('user')
  })

  it('leaves an agent edge origin unchanged on relabel (only links is promoted)', () => {
    useCanvasStore.setState({ doc: { ...seed(), edges: [{ id: 'ag1', fromNode: 'a', toNode: 'b', label: 'x', meta: { origin: 'agent' } }] } })
    useCanvasStore.getState().relabelEdge('ag1', 'y')
    expect(useCanvasStore.getState().doc!.edges[0].meta?.origin).toBe('agent')
  })
})

describe('store / setNodePosition', () => {
  it('writes the dropped position back to the doc node and marks dirty', () => {
    useCanvasStore.getState().setNodePosition('a', 42, -17)
    const n = useCanvasStore.getState().doc!.nodes.find((x) => x.id === 'a')!
    expect({ x: n.x, y: n.y }).toEqual({ x: 42, y: -17 })
    expect(useCanvasStore.getState().dirty).toBe(true)
  })
})

import { describe, it, expect } from 'vitest'
import { anchorForPoint, anchorToFlowPoint, type NodeGeom } from './comments'

const NODES: NodeGeom[] = [
  { id: 'a', x: 0, y: 0, width: 100, height: 80 },
  { id: 'b', x: 200, y: 50, width: 100, height: 100 },
]

describe('comments / anchorForPoint', () => {
  it('anchors a point inside a node as 0..1 fractions of its measured box', () => {
    expect(anchorForPoint({ x: 50, y: 40 }, NODES)).toEqual({ kind: 'node', nodeId: 'a', offsetX: 0.5, offsetY: 0.5 })
  })

  it('anchors a point outside every node to the bare canvas coordinate', () => {
    expect(anchorForPoint({ x: 500, y: 500 }, NODES)).toEqual({ kind: 'canvas', x: 500, y: 500 })
  })

  it('clamps offsets to [0,1] on the inclusive border (corner click)', () => {
    expect(anchorForPoint({ x: 100, y: 80 }, NODES)).toEqual({ kind: 'node', nodeId: 'a', offsetX: 1, offsetY: 1 })
  })

  it('picks the topmost (last-drawn) node when boxes overlap', () => {
    const overlap: NodeGeom[] = [
      { id: 'under', x: 0, y: 0, width: 100, height: 100 },
      { id: 'over', x: 0, y: 0, width: 100, height: 100 },
    ]
    expect(anchorForPoint({ x: 10, y: 10 }, overlap)).toMatchObject({ kind: 'node', nodeId: 'over' })
  })

  it('skips a zero-sized (unmeasured) node so it cannot swallow the click', () => {
    const nodes: NodeGeom[] = [{ id: 'ghost', x: 0, y: 0, width: 0, height: 0 }]
    expect(anchorForPoint({ x: 0, y: 0 }, nodes)).toEqual({ kind: 'canvas', x: 0, y: 0 })
  })
})

describe('comments / anchorToFlowPoint', () => {
  const byId = new Map(NODES.map((n) => [n.id, n]))

  it('returns a canvas anchor unchanged', () => {
    expect(anchorToFlowPoint({ kind: 'canvas', x: 12, y: 34 }, byId)).toEqual({ x: 12, y: 34 })
  })

  it('projects a node anchor through the live node geometry', () => {
    expect(anchorToFlowPoint({ kind: 'node', nodeId: 'b', offsetX: 0.5, offsetY: 0.25 }, byId)).toEqual({ x: 250, y: 75 })
  })

  it('round-trips: a point inside a node projects back to itself', () => {
    const p = { x: 240, y: 120 }
    const anchor = anchorForPoint(p, NODES)
    expect(anchorToFlowPoint(anchor, byId)).toEqual(p)
  })

  it('returns null for a node anchor whose node left the board', () => {
    expect(anchorToFlowPoint({ kind: 'node', nodeId: 'gone', offsetX: 0.5, offsetY: 0.5 }, byId)).toBeNull()
  })
})

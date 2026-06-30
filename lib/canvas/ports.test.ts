import { describe, it, expect } from 'vitest'
import { portPoint, sideAndT, portAt, autoPort } from './ports'
import type { Rect } from './edge-geometry'
import type { ConnectionPort } from './jsoncanvas'

const A: Rect = { x: 0, y: 0, width: 100, height: 100 }     // center (50,50)
const B: Rect = { x: 300, y: 0, width: 100, height: 100 }   // center (350,50) — directly to the right

describe('portPoint', () => {
  it('maps t=0/0.5/1 along the top edge (left→right)', () => {
    expect(portPoint(A, { id: 'p', side: 'top', t: 0 })).toEqual({ x: 0, y: 0 })
    expect(portPoint(A, { id: 'p', side: 'top', t: 0.5 })).toEqual({ x: 50, y: 0 })
    expect(portPoint(A, { id: 'p', side: 'top', t: 1 })).toEqual({ x: 100, y: 0 })
  })

  it('maps the other three sides at their midpoint', () => {
    expect(portPoint(A, { id: 'p', side: 'bottom', t: 0.5 })).toEqual({ x: 50, y: 100 })
    expect(portPoint(A, { id: 'p', side: 'left', t: 0.5 })).toEqual({ x: 0, y: 50 })
    expect(portPoint(A, { id: 'p', side: 'right', t: 0.5 })).toEqual({ x: 100, y: 50 })
  })

  it('clamps t outside 0..1', () => {
    expect(portPoint(A, { id: 'p', side: 'top', t: -1 })).toEqual({ x: 0, y: 0 })
    expect(portPoint(A, { id: 'p', side: 'top', t: 2 })).toEqual({ x: 100, y: 0 })
  })
})

describe('sideAndT', () => {
  it('classifies a point near each side with the correct t', () => {
    expect(sideAndT(A, { x: 98, y: 50 })).toEqual({ side: 'right', t: 0.5 })
    expect(sideAndT(A, { x: 2, y: 30 })).toEqual({ side: 'left', t: 0.3 })
    expect(sideAndT(A, { x: 40, y: 3 })).toEqual({ side: 'top', t: 0.4 })
    expect(sideAndT(A, { x: 60, y: 97 })).toEqual({ side: 'bottom', t: 0.6 })
  })
})

describe('portAt', () => {
  const ports: ConnectionPort[] = [{ id: 'p1', side: 'right', t: 0.5 }]   // portPoint → (100,50)

  it('reuses a port within hitRadius', () => {
    expect(portAt(A, ports, { x: 103, y: 51 }, 9)?.id).toBe('p1')
  })

  it('returns null beyond hitRadius', () => {
    expect(portAt(A, ports, { x: 120, y: 50 }, 9)).toBeNull()
  })

  it('returns null when there are no ports', () => {
    expect(portAt(A, [], { x: 100, y: 50 }, 9)).toBeNull()
  })
})

describe('autoPort', () => {
  it('two horizontally-separated boxes → { side: right, t: 0.5 } from the left box', () => {
    expect(autoPort(A, B)).toEqual({ side: 'right', t: 0.5 })
    expect(autoPort(B, A)).toEqual({ side: 'left', t: 0.5 })
  })
})

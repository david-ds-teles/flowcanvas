import { describe, it, expect } from 'vitest'
import { rectIntersection, sideOf, floatingParams, nearestT, nearestSegmentIndex, type Rect } from './edge-geometry'

const A: Rect = { x: 0, y: 0, width: 100, height: 100 }     // center (50,50)
const B: Rect = { x: 300, y: 0, width: 100, height: 100 }   // center (350,50) — directly to the right

describe('rectIntersection', () => {
  it('exits the right edge toward a node on the right', () => {
    const p = rectIntersection(A, B)
    expect(p.x).toBeCloseTo(100)   // A's right edge
    expect(p.y).toBeCloseTo(50)
  })

  it('returns the center when both rects share a center (degenerate)', () => {
    expect(rectIntersection(A, { ...A })).toEqual({ x: 50, y: 50 })
  })
})

describe('sideOf', () => {
  it('classifies each perimeter side', () => {
    expect(sideOf(A, { x: 100, y: 50 })).toBe('right')
    expect(sideOf(A, { x: 0, y: 50 })).toBe('left')
    expect(sideOf(A, { x: 50, y: 0 })).toBe('top')
    expect(sideOf(A, { x: 50, y: 100 })).toBe('bottom')
  })
})

describe('floatingParams', () => {
  it('source exits right and target enters left for a left→right pair', () => {
    const { source, target } = floatingParams(A, B)
    expect(source.side).toBe('right')
    expect(target.side).toBe('left')
    expect(source.x).toBeCloseTo(100)
    expect(target.x).toBeCloseTo(300)
  })
})

describe('nearestT', () => {
  const pts = Array.from({ length: 11 }, (_, i) => ({ x: i * 10, y: 0 }))   // sampled 0..100 along x

  it('returns 0 at the start, 1 at the end, ~0.5 at the middle', () => {
    expect(nearestT(pts, { x: 0, y: 0 })).toBeCloseTo(0)
    expect(nearestT(pts, { x: 100, y: 0 })).toBeCloseTo(1)
    expect(nearestT(pts, { x: 50, y: 6 })).toBeCloseTo(0.5)
  })

  it('falls back to 0.5 for a degenerate (too-short) sample', () => {
    expect(nearestT([], { x: 0, y: 0 })).toBe(0.5)
    expect(nearestT([{ x: 0, y: 0 }], { x: 9, y: 9 })).toBe(0.5)
  })
})

describe('nearestSegmentIndex', () => {
  // An L-shaped render path: seg 0 = horizontal (0,0)->(100,0), seg 1 = vertical (100,0)->(100,100).
  const pts = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }]
  it('picks the segment nearest the grab point', () => {
    expect(nearestSegmentIndex(pts, { x: 50, y: 4 })).toBe(0)   // hugging the horizontal segment
    expect(nearestSegmentIndex(pts, { x: 96, y: 60 })).toBe(1)  // hugging the vertical segment
  })
})

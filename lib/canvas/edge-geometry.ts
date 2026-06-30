// lib/canvas/edge-geometry.ts — 005-edges. Pure geometry for floating edges + label positioning.
// No DOM, no React, no @xyflow/react runtime — type-only import of Side keeps it on the pure
// lib/canvas/* side of the boundary (the adapter is the lone runtime-enum exception), so it stays
// unit-testable under the vitest gate. The edge component maps the returned Side → RF Position.
import type { Side } from './jsoncanvas'

export interface Rect { x: number; y: number; width: number; height: number }
export interface Point { x: number; y: number }
export interface Endpoint { x: number; y: number; side: Side }

const center = (r: Rect): Point => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 })

/**
 * Intersection of the ray from `rect`'s center toward `toward`'s center with `rect`'s perimeter — the
 * point a floating edge attaches to. Standard React-Flow floating-edge math, adapted to plain rects.
 */
export function rectIntersection(rect: Rect, toward: Rect): Point {
  const c = center(rect)
  const t = center(toward)
  const dx = t.x - c.x
  const dy = t.y - c.y
  if (dx === 0 && dy === 0) return c
  const hw = rect.width / 2
  const hh = rect.height / 2
  // Scale the direction vector until the dominant axis (|dx|/hw vs |dy|/hh) reaches the box edge.
  const scale = 1 / Math.max(Math.abs(dx) / hw, Math.abs(dy) / hh)
  return { x: c.x + dx * scale, y: c.y + dy * scale }
}

/**
 * Like `rectIntersection`, but aim at an arbitrary point (e.g. the first manual waypoint) rather than
 * another rect's center. Used so a floating endpoint exits toward the line's next bend.
 */
export function rectIntersectionToPoint(rect: Rect, toward: Point): Point {
  const c = center(rect)
  const dx = toward.x - c.x
  const dy = toward.y - c.y
  if (dx === 0 && dy === 0) return c
  const hw = rect.width / 2
  const hh = rect.height / 2
  const scale = 1 / Math.max(Math.abs(dx) / hw, Math.abs(dy) / hh)
  return { x: c.x + dx * scale, y: c.y + dy * scale }
}

/** Which side of `rect` a perimeter point lies on (small tolerance absorbs float error). */
export function sideOf(rect: Rect, p: Point): Side {
  const tol = 1
  if (p.x <= rect.x + tol) return 'left'
  if (p.x >= rect.x + rect.width - tol) return 'right'
  if (p.y <= rect.y + tol) return 'top'
  return 'bottom'
}

/** Floating endpoints for both ends of an edge between two rects (each aimed at the other's center). */
export function floatingParams(source: Rect, target: Rect): { source: Endpoint; target: Endpoint } {
  const sp = rectIntersection(source, target)
  const tp = rectIntersection(target, source)
  return {
    source: { x: sp.x, y: sp.y, side: sideOf(source, sp) },
    target: { x: tp.x, y: tp.y, side: sideOf(target, tp) },
  }
}

/** Distance from point `p` to the segment a→b (used to pick which segment a line-grab bends). */
function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y)
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

/**
 * Index i of the segment [points[i], points[i+1]] nearest to point `p` — where a grab on the line inserts
 * a new bend. `points` is the ordered render path [source, ...waypoints, target] (≥2 points).
 */
export function nearestSegmentIndex(points: Point[], p: Point): number {
  let best = 0
  let bestD = Infinity
  for (let i = 0; i < points.length - 1; i++) {
    const d = distToSegment(p, points[i], points[i + 1])
    if (d < bestD) { bestD = d; best = i }
  }
  return best
}

/**
 * Nearest parameter t∈[0,1] on a polyline sample to point `p` — used to reposition a dragged edge label
 * along its path. `points` is an ordered sampling of the path (index 0 = source end, last = target end).
 */
export function nearestT(points: Point[], p: Point): number {
  if (points.length < 2) return 0.5
  let bestI = 0
  let bestD = Infinity
  for (let i = 0; i < points.length; i++) {
    const d = (points[i].x - p.x) ** 2 + (points[i].y - p.y) ** 2
    if (d < bestD) { bestD = d; bestI = i }
  }
  return bestI / (points.length - 1)
}

/** Default Shift-snap increment (degrees) — 45° gives horizontal, vertical, AND diagonals. */
export const SNAP_STEP_DEG = 45

/**
 * Snap the angle of the segment prev→p to the nearest `stepDeg` multiple, preserving its length.
 * Used while Shift is held during a waypoint create/drag so adjacent segments align to clean angles.
 */
export function snapAngle(prev: Point, p: Point, stepDeg: number = SNAP_STEP_DEG): Point {
  const dx = p.x - prev.x
  const dy = p.y - prev.y
  const len = Math.hypot(dx, dy)
  if (len === 0) return { x: p.x, y: p.y }
  const step = (stepDeg * Math.PI) / 180
  const snapped = Math.round(Math.atan2(dy, dx) / step) * step
  return { x: prev.x + Math.cos(snapped) * len, y: prev.y + Math.sin(snapped) * len }
}

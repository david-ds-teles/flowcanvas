// lib/canvas/ports.ts — 006-semantic-edges. Pure port geometry (no DOM/React).
// Ports are the single geometric source of truth for edge endpoints (Decision 1). The edge
// renderer (Phase 2) feeds these helpers live node rects from useInternalNode; this module stays
// on the pure lib/canvas/* side so it is unit-testable under the vitest gate.
import type { ConnectionPort, Side } from './jsoncanvas'
import { rectIntersection, type Point, type Rect } from './edge-geometry'

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v))

/** Absolute perimeter point of a port. t runs start→end corner of the side (L/R top→bottom, T/B left→right). */
export function portPoint(node: Rect, port: ConnectionPort): Point {
  const t = clamp01(port.t)
  switch (port.side) {
    case 'top':    return { x: node.x + t * node.width, y: node.y }
    case 'bottom': return { x: node.x + t * node.width, y: node.y + node.height }
    case 'left':   return { x: node.x,                  y: node.y + t * node.height }
    case 'right':  return { x: node.x + node.width,     y: node.y + t * node.height }
  }
}

/** Nearest {side, t} for an absolute point against a node box (drop → port placement). */
export function sideAndT(node: Rect, p: Point): { side: Side; t: number } {
  const dLeft   = Math.abs(p.x - node.x)
  const dRight  = Math.abs(p.x - (node.x + node.width))
  const dTop    = Math.abs(p.y - node.y)
  const dBottom = Math.abs(p.y - (node.y + node.height))
  const min = Math.min(dLeft, dRight, dTop, dBottom)
  if (min === dLeft)  return { side: 'left',  t: clamp01((p.y - node.y) / node.height) }
  if (min === dRight) return { side: 'right', t: clamp01((p.y - node.y) / node.height) }
  if (min === dTop)   return { side: 'top',   t: clamp01((p.x - node.x) / node.width) }
  return { side: 'bottom', t: clamp01((p.x - node.x) / node.width) }
}

/** Nearest port within hitRadius of p (reuse), else null (create). Uses the live node box for portPoint. */
export function portAt(node: Rect, ports: ConnectionPort[], p: Point, hitRadius: number): ConnectionPort | null {
  let best: ConnectionPort | null = null
  let bestD = hitRadius
  for (const port of ports) {
    const pt = portPoint(node, port)
    const d = Math.hypot(pt.x - p.x, pt.y - p.y)
    if (d <= bestD) { bestD = d; best = port }
  }
  return best
}

/** Geometric default {side, t} for an unpinned endpoint — where the center→center ray crosses `from`. */
export function autoPort(from: Rect, to: Rect): { side: Side; t: number } {
  return sideAndT(from, rectIntersection(from, to))
}

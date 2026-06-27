import type { CommentAnchor } from './jsoncanvas'

// Pure comment-anchor geometry — no DOM, no React Flow. The layer feeds it live (measured)
// node boxes in flow space; keeping the math here lets it be unit-tested in isolation.

/** A node's box in flow (canvas) coordinates — the measured geometry, not the authored doc box. */
export interface NodeGeom {
  id: string
  x: number
  y: number
  width: number
  height: number
}

/** A point in flow (canvas) coordinates. */
export interface FlowPoint {
  x: number
  y: number
}

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n)

/**
 * Resolve a flow-space click into a {@link CommentAnchor}. If the point falls inside a node box,
 * anchor to that node as 0..1 fractions of its measured size (so the pin tracks + scales with the
 * node); otherwise anchor to the bare canvas point. Nodes are tested back-to-front so the topmost
 * (last-drawn) hit wins; zero-sized boxes are skipped so a yet-to-measure node can't swallow clicks.
 */
export function anchorForPoint(point: FlowPoint, nodes: NodeGeom[]): CommentAnchor {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i]
    if (n.width <= 0 || n.height <= 0) continue
    if (point.x >= n.x && point.x <= n.x + n.width && point.y >= n.y && point.y <= n.y + n.height) {
      return {
        kind: 'node',
        nodeId: n.id,
        offsetX: clamp01((point.x - n.x) / n.width),
        offsetY: clamp01((point.y - n.y) / n.height),
      }
    }
  }
  return { kind: 'canvas', x: point.x, y: point.y }
}

/**
 * Project an anchor back to a flow-space point for rendering. Canvas anchors are returned as-is;
 * node anchors are resolved against the current node geometry (so the pin follows drags/resizes).
 * Returns `null` when a node anchor references a node that is no longer on the board.
 */
export function anchorToFlowPoint(anchor: CommentAnchor, nodeById: Map<string, NodeGeom>): FlowPoint | null {
  if (anchor.kind === 'canvas') return { x: anchor.x, y: anchor.y }
  const n = nodeById.get(anchor.nodeId)
  if (!n) return null
  return { x: n.x + anchor.offsetX * n.width, y: n.y + anchor.offsetY * n.height }
}

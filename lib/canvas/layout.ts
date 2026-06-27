import ELK, { type ElkNode } from 'elkjs/lib/elk.bundled.js'
import type { CanvasNode, CanvasEdge } from './jsoncanvas'

const elk = new ELK()

export type LayoutPositions = Record<string, { x: number; y: number }>
export type MeasuredSizes = Record<string, { width: number; height: number }>

/**
 * ELK "Re-organize" (Phase 10, #6): a layered, left→right, orthogonal-edge arrangement of the board's
 * TOP-LEVEL nodes (parentless nodes + group containers). Grouped children are NOT laid out here — the
 * caller shifts each child by its group's delta so a group moves as a unit (the doc stays ABSOLUTE).
 *
 * Heights use a fallback ladder — live measured map (tall auto-height markdown cards) → authored box →
 * a 160px constant — so a tall card never collides. An edge into a grouped child attaches to its group;
 * intra-group edges and edges with an unknown/duplicate endpoint are dropped. Separate components
 * (islands) are spaced apart. Returns absolute top-level positions keyed by node id.
 */
export async function computeLayout(
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  measured: MeasuredSizes = {},
): Promise<LayoutPositions> {
  const parentOf = new Map(nodes.filter((n) => n.parentId).map((n) => [n.id, n.parentId as string]))
  const resolve = (id: string) => parentOf.get(id) ?? id // an edge touching a grouped child attaches to its group

  const children: ElkNode[] = nodes
    .filter((n) => !n.parentId)
    .map((n) => ({ id: n.id, width: measured[n.id]?.width ?? n.width, height: measured[n.id]?.height ?? n.height ?? 160 }))

  const topIds = new Set(children.map((c) => c.id))
  const seen = new Set<string>()
  const elkEdges = edges
    .map((e) => ({ id: e.id, s: resolve(e.fromNode), t: resolve(e.toNode) }))
    .filter((e) => e.s !== e.t && topIds.has(e.s) && topIds.has(e.t)) // drop intra-group + dangling edges
    .filter((e) => {
      const k = `${e.s}->${e.t}`
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
    .map((e) => ({ id: e.id, sources: [e.s], targets: [e.t] }))

  const graph: ElkNode = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'RIGHT',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.layered.spacing.nodeNodeBetweenLayers': '120',
      'elk.spacing.nodeNode': '80',
      'elk.separateConnectedComponents': 'true',
      'elk.spacing.componentComponent': '120',
    },
    children,
    edges: elkEdges,
  }

  const res = await elk.layout(graph)
  const out: LayoutPositions = {}
  for (const c of res.children ?? []) out[c.id] = { x: c.x ?? 0, y: c.y ?? 0 }
  return out
}

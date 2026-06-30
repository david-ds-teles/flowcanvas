import ELK, { type ElkNode } from 'elkjs/lib/elk.bundled.js'
import type { CanvasNode, ComponentKind } from './jsoncanvas'
import type { CanvasEdge } from './jsoncanvas'

const elk = new ELK()

export type LayoutPositions = Record<string, { x: number; y: number }>
export type MeasuredSizes = Record<string, { width: number; height: number }>

// ─────────────────── #7/#8 — "Organize by type" system-design layout ───────────────────
// Left→right band order: actors/externals (sources) → flow → services → queues/datastores (sinks).
// Lower rank sits further left. Mirrors a conventional layered architecture diagram.
const KIND_BAND_RANK: Record<ComponentKind, number> = {
  actor: 0, external: 1, decision: 2, process: 3, service: 4, queue: 5, datastore: 6, boundary: 7,
}
const UNKINDED_RANK = 8

function bandRank(n: CanvasNode): number {
  const k = n.meta?.kind
  return k ? KIND_BAND_RANK[k] : UNKINDED_RANK
}

const COL_GAP = 56          // gap between type-band columns
const ROW_GAP = 32          // gap between stacked nodes in a band
export const GROUP_PAD = 28        // inner padding inside a group container
export const GROUP_LABEL_PAD = 44  // extra top padding so the group label clears its children
const GROUP_GAP = 88        // gap between top-level items (leaf bands ↔ groups ↔ groups)
const ORIGIN_X = 80
const ORIGIN_Y = 80

interface ColumnLayout {
  pos: Record<string, { x: number; y: number }>
  width: number
  height: number
}

/** Lay `items` into vertical columns — one column per component-kind band, ordered left→right by rank,
 *  nodes stacked top-down within a band. Returns positions relative to (ox, oy) + the content bbox.
 *  `rankOf` overrides the band ranking (e.g. to pin the core-doc card leftmost). */
function layoutColumns(items: CanvasNode[], ox: number, oy: number, rankOf: (n: CanvasNode) => number = bandRank): ColumnLayout {
  const buckets = new Map<number, CanvasNode[]>()
  for (const n of items) buckets.set(rankOf(n), [...(buckets.get(rankOf(n)) ?? []), n])
  const ranks = [...buckets.keys()].sort((a, b) => a - b)
  const pos: Record<string, { x: number; y: number }> = {}
  let colX = ox
  let maxH = 0
  for (const r of ranks) {
    const col = [...(buckets.get(r) ?? [])].sort((a, b) => a.id.localeCompare(b.id))
    const colW = Math.max(...col.map((n) => n.width))
    let y = oy
    for (const n of col) {
      pos[n.id] = { x: Math.round(colX + (colW - n.width) / 2), y: Math.round(y) }
      y += n.height + ROW_GAP
    }
    maxH = Math.max(maxH, y - oy - ROW_GAP)
    colX += colW + COL_GAP
  }
  return { pos, width: Math.max(0, colX - ox - COL_GAP), height: Math.max(0, maxH) }
}

export interface OrganizeResult {
  positions: Record<string, { x: number; y: number }>
  sizes: Record<string, { width: number; height: number }>
}

/**
 * #7/#8 — deterministic "Organize by type". Arranges every component into vertical bands by `meta.kind`,
 * lays each group's children into the same bands INSIDE the group, and resizes each group to enclose its
 * children (so the boundary always frames its members — design-system §8). Pure geometry: no ELK, no
 * async, no DOM — fully predictable and unit-testable. Returns absolute positions for every node plus new
 * sizes for each group container (the doc stays ABSOLUTE; the adapter handles parent-relative on render).
 */
export function organizeByType(nodes: CanvasNode[], coreDocPath?: string): OrganizeResult {
  const positions: OrganizeResult['positions'] = {}
  const sizes: OrganizeResult['sizes'] = {}

  const childrenOf = new Map<string, CanvasNode[]>()
  for (const n of nodes) if (n.parentId) childrenOf.set(n.parentId, [...(childrenOf.get(n.parentId) ?? []), n])

  const groups = nodes.filter((n) => n.type === 'group' && !n.parentId)
  const leaves = nodes.filter((n) => n.type !== 'group' && !n.parentId)

  // The core-spec-doc card (kind-less file node bound as the spine) is the board's entry point — pin it to
  // its own leftmost band (rank -1, ahead of actors) so it reads as the first element on the board.
  const rankOf = (n: CanvasNode): number =>
    coreDocPath && n.type === 'file' && n.file === coreDocPath ? -1 : bandRank(n)

  // 1. Each group's children → relative band layout; size the group to fit (+ label headroom).
  const childRel = new Map<string, Record<string, { x: number; y: number }>>()
  for (const g of groups) {
    const kids = childrenOf.get(g.id) ?? []
    if (!kids.length) { sizes[g.id] = { width: g.width, height: g.height }; continue }
    const { pos, width, height } = layoutColumns(kids, 0, 0)
    childRel.set(g.id, pos)
    sizes[g.id] = { width: width + 2 * GROUP_PAD, height: height + GROUP_LABEL_PAD + GROUP_PAD }
  }

  // 2. Top-level leaves → bands on the left (core-doc card pinned leftmost via rankOf).
  const leafLayout = layoutColumns(leaves, ORIGIN_X, ORIGIN_Y, rankOf)
  Object.assign(positions, leafLayout.pos)

  // 3. Groups flow left→right after the leaf region; project each group's children to absolute coords.
  let gx = ORIGIN_X + (leaves.length ? leafLayout.width + GROUP_GAP : 0)
  for (const g of groups) {
    positions[g.id] = { x: gx, y: ORIGIN_Y }
    const rel = childRel.get(g.id)
    if (rel) for (const [cid, p] of Object.entries(rel)) {
      positions[cid] = { x: gx + GROUP_PAD + p.x, y: ORIGIN_Y + GROUP_LABEL_PAD + p.y }
    }
    gx += sizes[g.id].width + GROUP_GAP
  }

  return { positions, sizes }
}

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

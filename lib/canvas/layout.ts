import ELK, { type ElkNode } from 'elkjs/lib/elk.bundled.js'
import type { CanvasNode, ComponentKind } from './jsoncanvas'
import type { CanvasEdge } from './jsoncanvas'

const elk = new ELK()

export type LayoutPositions = Record<string, { x: number; y: number }>
export type MeasuredSizes = Record<string, { width: number; height: number }>

// ─────────────────── "Organize by type" — readable system-design layout ───────────────────
// Band rank orders cards WITHIN a block (sources → flow → services → sinks) so same-kind cards
// cluster. The board itself is laid out as compact, WRAPPED grids — never an infinite horizontal
// strip (operator 2026-06-30: a generated board MUST be readable). See organizeByType below.
const KIND_BAND_RANK: Record<ComponentKind, number> = {
  actor: 0, external: 1, decision: 2, process: 3, service: 4, queue: 5, datastore: 6, boundary: 7,
}
const UNKINDED_RANK = 8

function bandRank(n: CanvasNode): number {
  const k = n.meta?.kind
  return k ? KIND_BAND_RANK[k] : UNKINDED_RANK
}

const COL_GAP = 56          // gap between cards in a grid row
const ROW_GAP = 32          // gap between grid rows
export const GROUP_PAD = 28        // inner padding inside a group container
export const GROUP_LABEL_PAD = 44  // extra top padding so the group label clears its children
const GROUP_GAP = 88        // gap between top-level blocks and between shelf rows
const ORIGIN_X = 80
const ORIGIN_Y = 80
// Readability budgets (operator 2026-06-30): a group wraps its children to stay within MAX_GROUP_WIDTH;
// top-level blocks wrap to a new shelf row past MAX_ROW_WIDTH — so the board stays compact, never a strip.
export const MAX_GROUP_WIDTH = 1200
export const MAX_ROW_WIDTH = 2300
const GROUP_TIER_RANK = 2.5  // groups sort between source leaves (<2.5) and notes/loose cards (>2.5)

interface GridLayout {
  pos: Record<string, { x: number; y: number }>
  width: number
  height: number
}

/** Lay `items` into a compact, balanced grid (row-major), bounded so the block never exceeds `maxWidth`.
 *  Items keep their given order (the caller pre-sorts by band rank so same-kind cards cluster). A uniform
 *  cell (widest × tallest item) keeps the grid aligned and guarantees non-overlap; each card is centered
 *  in its cell. Column count targets a near-square grid, capped by the width budget. Returns positions
 *  relative to (0,0) + the content bbox. */
function layoutGrid(items: CanvasNode[], maxWidth: number): GridLayout {
  const cellW = Math.max(...items.map((n) => n.width))
  const cellH = Math.max(...items.map((n) => n.height))
  const maxColsByWidth = Math.max(1, Math.floor((maxWidth + COL_GAP) / (cellW + COL_GAP)))
  const cols = Math.min(items.length, maxColsByWidth, Math.max(1, Math.ceil(Math.sqrt(items.length))))
  const rows = Math.ceil(items.length / cols)
  const pos: Record<string, { x: number; y: number }> = {}
  items.forEach((n, i) => {
    const c = i % cols
    const r = Math.floor(i / cols)
    pos[n.id] = {
      x: Math.round(c * (cellW + COL_GAP) + (cellW - n.width) / 2),
      y: Math.round(r * (cellH + ROW_GAP) + (cellH - n.height) / 2),
    }
  })
  return {
    pos,
    width: cols * cellW + (cols - 1) * COL_GAP,
    height: rows * cellH + (rows - 1) * ROW_GAP,
  }
}

export interface OrganizeResult {
  positions: Record<string, { x: number; y: number }>
  sizes: Record<string, { width: number; height: number }>
}

/**
 * Deterministic "Organize by type" — a READABLE system-design layout (operator 2026-06-30: a generated
 * board must be easy to understand, never a horizontal strip). Pure geometry: no ELK, no async, no DOM.
 *
 * Two levels of wrapping keep the board compact:
 *   1. Each group's children are laid into a balanced GRID (band-ranked so same-kind cards cluster) and the
 *      group is resized to enclose them (design-system §8) — a many-child subsystem no longer widens forever.
 *   2. Top-level blocks (loose leaves + group containers) are SHELF-PACKED into rows, ordered by reading
 *      tier — sources (actors/externals) → subsystem groups → notes/loose cards — with each tier starting a
 *      fresh row and rows wrapping past MAX_ROW_WIDTH. The board reads top→bottom in clear bands.
 *
 * Returns absolute positions for every node plus new sizes for each group (the doc stays ABSOLUTE; the
 * adapter handles parent-relative on render).
 */
export function organizeByType(nodes: CanvasNode[], coreDocPath?: string): OrganizeResult {
  const positions: OrganizeResult['positions'] = {}
  const sizes: OrganizeResult['sizes'] = {}

  const order = new Map(nodes.map((n, i) => [n.id, i])) // stable tiebreaker = document order
  const childrenOf = new Map<string, CanvasNode[]>()
  for (const n of nodes) if (n.parentId) childrenOf.set(n.parentId, [...(childrenOf.get(n.parentId) ?? []), n])

  const groups = nodes.filter((n) => n.type === 'group' && !n.parentId)
  const leaves = nodes.filter((n) => n.type !== 'group' && !n.parentId)

  // Block reading tier: the core-spec-doc card (rare — the spine is normally not a node) is the entry point;
  // groups sit between source leaves and notes/loose cards.
  const blockRank = (n: CanvasNode): number =>
    coreDocPath && n.type === 'file' && n.file === coreDocPath ? -2
      : n.type === 'group' ? GROUP_TIER_RANK
      : bandRank(n)

  // 1. Each group's children → balanced grid; size the group to enclose them (+ label headroom).
  const childRel = new Map<string, Record<string, { x: number; y: number }>>()
  for (const g of groups) {
    const kids = [...(childrenOf.get(g.id) ?? [])].sort(
      (a, b) => bandRank(a) - bandRank(b) || order.get(a.id)! - order.get(b.id)!,
    )
    if (!kids.length) { sizes[g.id] = { width: g.width, height: g.height }; continue }
    const { pos, width, height } = layoutGrid(kids, MAX_GROUP_WIDTH)
    childRel.set(g.id, pos)
    sizes[g.id] = { width: width + 2 * GROUP_PAD, height: height + GROUP_LABEL_PAD + GROUP_PAD }
  }

  // 2. Top-level blocks (loose leaves + group containers), ordered by reading tier then document order.
  interface Block { id: string; w: number; h: number; rank: number; ord: number }
  const blocks: Block[] = [
    ...leaves.map((n) => ({ id: n.id, w: n.width, h: n.height, rank: blockRank(n), ord: order.get(n.id)! })),
    ...groups.map((g) => ({ id: g.id, w: sizes[g.id].width, h: sizes[g.id].height, rank: blockRank(g), ord: order.get(g.id)! })),
  ].sort((a, b) => a.rank - b.rank || a.ord - b.ord)

  // 3. Shelf-pack blocks into rows: wrap when the row would exceed MAX_ROW_WIDTH, or when the reading tier
  //    changes (so sources / subsystems / notes each occupy their own band). Project each group's children
  //    to absolute coords once its block position is fixed.
  const tierOf = (rank: number): number => (rank < GROUP_TIER_RANK ? 0 : rank > GROUP_TIER_RANK ? 2 : 1)
  let x = ORIGIN_X
  let y = ORIGIN_Y
  let rowH = 0
  let prevTier: number | null = null
  for (const b of blocks) {
    const tier = tierOf(b.rank)
    const overflow = x > ORIGIN_X && x + b.w > ORIGIN_X + MAX_ROW_WIDTH
    const tierBreak = prevTier !== null && tier !== prevTier
    if (overflow || tierBreak) { x = ORIGIN_X; y += rowH + GROUP_GAP; rowH = 0 }
    positions[b.id] = { x, y }
    const rel = childRel.get(b.id)
    if (rel) for (const [cid, p] of Object.entries(rel)) {
      positions[cid] = { x: x + GROUP_PAD + p.x, y: y + GROUP_LABEL_PAD + p.y }
    }
    x += b.w + GROUP_GAP
    rowH = Math.max(rowH, b.h)
    prevTier = tier
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

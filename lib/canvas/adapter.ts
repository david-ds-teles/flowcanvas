import { MarkerType, type Node as RFNode, type Edge as RFEdge } from '@xyflow/react'
import type { CSSProperties } from 'react'
import type { FlowcanvasDoc, CanvasNode, CanvasEdge, CanvasColor, Side, EdgeOrigin, RelationshipType } from './jsoncanvas'
import { nodeKind } from './jsoncanvas'

const PRESET: Record<string, string> = { '1': '#ff516a', '2': '#f59f00', '3': '#e3b341', '4': '#b6f36a', '5': '#5ef2ff', '6': '#a371f7' }   // nyx §2.4
export const colorVar = (c?: CanvasColor): string | undefined => (!c ? undefined : c.startsWith('#') ? c : PRESET[c])

export function toReactFlow(doc: FlowcanvasDoc): { nodes: RFNode[]; edges: RFEdge[] } {
  const byId = new Map(doc.nodes.map((n) => [n.id, n]))
  // React Flow requires a parent node to PRECEDE its children in the array. Single nesting level
  // (no nested groups) → a stable parentless-first partition is enough; Array.prototype.sort is stable.
  const ordered = [...doc.nodes].sort((a, b) => Number(!!a.parentId) - Number(!!b.parentId))
  const nodes = ordered.map<RFNode>((n) => {
    const kind = nodeKind(n)                              // 'markdown'|'image'|'link'|'note'|'file'|'group'
    const autoHeight = kind === 'markdown'                // content-sized so the collapse toggle visibly shrinks the card
    const vars: Record<string, string> = {}
    if (n.color) vars['--node-accent'] = colorVar(n.color) ?? ''
    if (autoHeight) vars['--fc-body-max'] = `${Math.max(72, n.height - 88)}px`   // clamp the rendered body to ~the authored box
    // Doc coords are ABSOLUTE; React Flow wants a child positioned RELATIVE to its parent. A dangling
    // parentId (parent not on the board) degrades to a top-level node at its absolute position.
    const parent = n.parentId ? byId.get(n.parentId) : undefined
    const position = parent ? { x: n.x - parent.x, y: n.y - parent.y } : { x: n.x, y: n.y }
    return {
      id: n.id,
      type: kind,
      position,
      width: n.width,
      height: autoHeight ? undefined : n.height,         // markdown auto-measures; others keep the authored box
      data: { node: n },
      deletable: true,                                   // nodes + edges are key-deletable; the doc write-back lives in use-canvas-handlers
      ...(parent ? { parentId: n.parentId, extent: 'parent' as const } : {}),
      style: Object.keys(vars).length ? (vars as CSSProperties) : undefined,
    }
  })
  const edges = doc.edges.map<RFEdge>((e) => ({
    id: e.id, source: e.fromNode, target: e.toNode,
    sourceHandle: e.fromSide, targetHandle: e.toSide,
    type: 'labeled', label: e.label,
    data: { origin: e.meta?.origin ?? 'user', rel: e.meta?.rel },   // v2 — rel drives typed-edge styling
    selectable: true,                                  // explicit (was relying on RF defaults) — Phase 2
    deletable: true,
    markerEnd: (e.toEnd ?? 'arrow') !== 'none' ? { type: MarkerType.ArrowClosed } : undefined,
  }))
  return { nodes, edges }
}

/** Map React Flow geometry back onto the prior doc, preserving meta/type/comments/session. */
export function toJSONCanvas(rfNodes: RFNode[], rfEdges: RFEdge[], prev: FlowcanvasDoc): FlowcanvasDoc {
  const prevNodeById = new Map(prev.nodes.map((n) => [n.id, n]))
  const prevEdgeById = new Map(prev.edges.map((e) => [e.id, e]))
  const rfById = new Map(rfNodes.map((n) => [n.id, n]))
  // React Flow children carry parent-RELATIVE positions; the doc stores ABSOLUTE. Single nesting level
  // → the parent is itself top-level, so its position is already absolute.
  const absPos = (rn: RFNode): { x: number; y: number } => {
    const parent = rn.parentId ? rfById.get(rn.parentId) : undefined
    return parent ? { x: parent.position.x + rn.position.x, y: parent.position.y + rn.position.y } : { x: rn.position.x, y: rn.position.y }
  }
  const nodes: CanvasNode[] = rfNodes.map((rn) => {
    const base = prevNodeById.get(rn.id)
    if (!base) throw new Error(`unknown node in RF state: ${rn.id}`)
    const { x, y } = absPos(rn)
    const next: CanvasNode = { ...base, x, y, width: rn.width ?? base.width, height: rn.height ?? base.height }
    // Membership follows React Flow's live state (set on group, dropped on ungroup) — not the stale base.
    if (rn.parentId) next.parentId = rn.parentId
    else delete (next as { parentId?: string }).parentId
    return next
  })
  const edges: CanvasEdge[] = rfEdges.map((re) => {
    const base = prevEdgeById.get(re.id)                 // carry color / fromEnd / toEnd that RF state does not model
    const data = re.data as { origin?: EdgeOrigin; rel?: RelationshipType } | undefined
    return {
      ...base,
      id: re.id, fromNode: re.source, toNode: re.target,
      fromSide: re.sourceHandle as Side | undefined, toSide: re.targetHandle as Side | undefined,
      label: typeof re.label === 'string' ? re.label : undefined,
      toEnd: base?.toEnd ?? 'arrow',
      meta: { origin: data?.origin ?? base?.meta?.origin, rel: data?.rel ?? base?.meta?.rel },   // v2 — preserve rel
    }
  })
  return { ...prev, nodes, edges }
}

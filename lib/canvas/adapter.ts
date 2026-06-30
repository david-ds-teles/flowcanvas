import { type Node as RFNode, type Edge as RFEdge } from '@xyflow/react'
import type { CSSProperties } from 'react'
import type { FlowcanvasDoc, CanvasNode, CanvasEdge, CanvasColor, EdgeOrigin, RelationshipType, ConnectionPort, Side } from './jsoncanvas'
import { nodeKind, COMPONENT_KIND_META } from './jsoncanvas'

const PRESET: Record<string, string> = { '1': '#ff516a', '2': '#f59f00', '3': '#e3b341', '4': '#b6f36a', '5': '#5ef2ff', '6': '#a371f7' }   // nyx §2.4
export const colorVar = (c?: CanvasColor): string | undefined => (!c ? undefined : c.startsWith('#') ? c : PRESET[c])

export function toReactFlow(doc: FlowcanvasDoc): { nodes: RFNode[]; edges: RFEdge[] } {
  const byId = new Map(doc.nodes.map((n) => [n.id, n]))
  // React Flow requires a parent node to PRECEDE its children in the array. Single nesting level
  // (no nested groups) → a stable parentless-first partition is enough; Array.prototype.sort is stable.
  const ordered = [...doc.nodes].sort((a, b) => Number(!!a.parentId) - Number(!!b.parentId))
  const nodes = ordered.map<RFNode>((n) => {
    const kind = nodeKind(n)                              // 'markdown'|'image'|'link'|'note'|'file'|'group'
    // 004 — a non-group node carrying meta.kind renders as the system-design component widget; a group
    // keeps type:'group' (a meta.kind:'boundary' group is tinted via --node-accent below).
    const renderType = n.meta?.kind && n.type !== 'group' ? 'component' : kind
    // A markdown card honors its authored box so manual resize sticks — EXCEPT when collapsed, where it
    // drops to its header (auto height) so the collapse toggle visibly shrinks it. Every other node already
    // keeps its authored box. (Previously markdown auto-measured, which reverted a resized card to its
    // content height — the resize "didn't stick".)
    const collapsedCard = renderType === 'markdown' && !!n.meta?.collapsed
    const vars: Record<string, string> = {}
    if (n.color) vars['--node-accent'] = colorVar(n.color) ?? ''
    else if (n.meta?.kind && n.type === 'group') vars['--node-accent'] = colorVar(COMPONENT_KIND_META[n.meta.kind].accent) ?? ''
    // Doc coords are ABSOLUTE; React Flow wants a child positioned RELATIVE to its parent. A dangling
    // parentId (parent not on the board) degrades to a top-level node at its absolute position.
    const parent = n.parentId ? byId.get(n.parentId) : undefined
    const position = parent ? { x: n.x - parent.x, y: n.y - parent.y } : { x: n.x, y: n.y }
    return {
      id: n.id,
      type: renderType,
      position,
      width: n.width,
      height: collapsedCard ? undefined : n.height,      // collapsed card → auto (header only); else the authored box
      data: { node: n },
      deletable: true,                                   // nodes + edges are key-deletable; the doc write-back lives in use-canvas-handlers
      // No extent:'parent' — a child is NOT clamped to the group box; instead the group auto-grows to
      // enclose its children on resize/drag (store.fitGroups), so the boundary adapts to its components.
      ...(parent ? { parentId: n.parentId } : {}),
      style: Object.keys(vars).length ? (vars as CSSProperties) : undefined,
    }
  })
  // 006 — resolve an edge endpoint's port id to its {side, t} so the edge component anchors at the dot
  // (the arrowhead seats inside) without depending on React Flow re-measuring a moved handle.
  const portIndex = new Map<string, Map<string, ConnectionPort>>()
  for (const n of doc.nodes) if (n.meta?.ports?.length) portIndex.set(n.id, new Map(n.meta.ports.map((p) => [p.id, p])))
  const portST = (nodeId: string, portId?: string): { side: Side; t: number } | undefined => {
    const p = portId ? portIndex.get(nodeId)?.get(portId) : undefined
    return p ? { side: p.side, t: p.t } : undefined
  }
  const edges = doc.edges.map<RFEdge>((e) => ({
    id: e.id, source: e.fromNode, target: e.toNode,
    // 006 — an edge anchors to its connection port (handle id == port id). A port-less legacy edge falls
    // back to the pinned side, else to the floating center-anchor in the component. Markers/stroke/path
    // all live in the component (it owns per-edge color + configurable end shapes), so no markerEnd here.
    sourceHandle: e.fromPort ?? e.fromSide, targetHandle: e.toPort ?? e.toSide,
    type: 'labeled', label: e.label,
    data: {
      origin: e.meta?.origin ?? 'user', rel: e.meta?.rel, edgeType: e.meta?.edgeType,   // 006 — edgeType drives typed styling
      routing: e.meta?.routing, line: e.meta?.line, labelT: e.meta?.labelT, // 005-edges — per-edge style
      points: e.meta?.points,                                             // 005-edges — manual line waypoints
      color: e.color, fromSide: e.fromSide, toSide: e.toSide, fromEnd: e.fromEnd, toEnd: e.toEnd,
      fromPort: e.fromPort, toPort: e.toPort,                             // 006 — port ids (geometry source of truth)
      fromPortST: portST(e.fromNode, e.fromPort), toPortST: portST(e.toNode, e.toPort), // 006 — resolved {side,t} for rendering
    },
    selectable: true,                                  // explicit (was relying on RF defaults) — Phase 2
    deletable: true,
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
  // Edge endpoint reconnection is not enabled, so the doc edge (`base`) is the source of truth for every
  // edge field — geometry, sides, color, marker ends, and the 005-edges meta (routing/line/labelT). RF
  // only carries origin/rel in `data`; refresh those and keep everything else (this is the fix for the
  // prior bug where the explicit `meta: { origin, rel }` dropped routing/line/labelT on every RF sync).
  const edges: CanvasEdge[] = rfEdges.map((re) => {
    const base = prevEdgeById.get(re.id)
    const data = re.data as { origin?: EdgeOrigin; rel?: RelationshipType } | undefined
    if (base) {
      return { ...base, meta: { ...base.meta, origin: data?.origin ?? base.meta?.origin, rel: data?.rel ?? base.meta?.rel } }
    }
    // Defensive fallback — edges are created through the store, so an RF edge always has a doc base.
    return { id: re.id, fromNode: re.source, toNode: re.target, toEnd: 'arrow', meta: { origin: data?.origin ?? 'user', rel: data?.rel } }
  })
  return { ...prev, nodes, edges }
}

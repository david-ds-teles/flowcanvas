// lib/canvas/migrate.ts — 004 + 005-edges + 006. Pure version ladder shared by store.load + importDoc.
import type { CanvasEdge, CanvasNode, ConnectionPort, FlowcanvasDoc, Side } from './jsoncanvas'
import { REL_TO_EDGE_TYPE } from './jsoncanvas'
import { deriveLinkEdges, reconcileEdges } from './edges'
import { autoPort } from './ports'
import { v4 as uuid } from 'uuid'

/** Reuse a port within this t-distance on the same side rather than stacking a near-duplicate dot. */
const PORT_T_TOL = 0.04

/** Reuse a port on a node matching {side, t} (within tol), else mint + append one. Returns the port id. */
function ensurePort(ports: ConnectionPort[], side: Side, t: number): string {
  const hit = ports.find((p) => p.side === side && Math.abs(p.t - t) <= PORT_T_TOL)
  if (hit) return hit.id
  const port: ConnectionPort = { id: 'p-' + uuid().slice(0, 8), side, t }
  ports.push(port)
  return port.id
}

/** Seed {side, t} for one endpoint: pinned-side midpoint, else geometric autoPort (faces the other node). */
function seedSideT(node: CanvasNode, otherNode: CanvasNode, pinnedSide?: Side): { side: Side; t: number } {
  if (pinnedSide) return { side: pinnedSide, t: 0.5 }
  return autoPort(node, otherNode)   // CanvasNode is Rect-shaped (x/y/width/height)
}

/** Ensure every edge endpoint resolves to a ConnectionPort on its node. Pure — returns fresh nodes/edges. */
function seedEdgePorts(
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  opts: { setEdgeType: boolean },
): { nodes: CanvasNode[]; edges: CanvasEdge[]; changed: boolean } {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const portsByNode = new Map<string, ConnectionPort[]>(nodes.map((n) => [n.id, [...(n.meta?.ports ?? [])]]))
  let changed = false

  const nextEdges = edges.map((e) => {
    const from = byId.get(e.fromNode)
    const to = byId.get(e.toNode)
    if (!from || !to) return e   // dangling edge — leave for validate/UI to surface
    let out = e
    const fromPorts = portsByNode.get(e.fromNode)!
    const toPorts = portsByNode.get(e.toNode)!

    if (!e.fromPort || !fromPorts.some((p) => p.id === e.fromPort)) {
      const { side, t } = seedSideT(from, to, e.fromSide)
      out = { ...out, fromPort: ensurePort(fromPorts, side, t) }
      changed = true
    }
    if (!e.toPort || !toPorts.some((p) => p.id === e.toPort)) {
      const { side, t } = seedSideT(to, from, e.toSide)
      out = { ...out, toPort: ensurePort(toPorts, side, t) }
      changed = true
    }
    if (opts.setEdgeType && !out.meta?.edgeType) {
      const edgeType = (e.meta?.rel && REL_TO_EDGE_TYPE[e.meta.rel]) || 'reference'
      out = { ...out, meta: { ...out.meta, edgeType } }
      changed = true
    }
    return out
  })

  const nextNodes = nodes.map((n) => {
    const ps = portsByNode.get(n.id)!
    return ps.length === (n.meta?.ports?.length ?? 0) ? n : { ...n, meta: { ...n.meta, ports: ps } }
  })

  return { nodes: nextNodes, edges: nextEdges, changed }
}

/** 0.1 → 0.2 (bake derived links: edges) → 0.3 (no-op bump) → 0.4 (float edges) → 0.5 (seed ports + map rel→edgeType). Returns whether anything changed. */
export function migrateDoc(doc: FlowcanvasDoc): { doc: FlowcanvasDoc; migrated: boolean } {
  let next = doc
  let migrated = false
  if (next.flowcanvas.schemaVersion === '0.1') {
    const edges = reconcileEdges(next.edges, deriveLinkEdges(next.nodes))
    next = { ...next, edges, flowcanvas: { ...next.flowcanvas, schemaVersion: '0.2' as const } }
    migrated = true
  }
  if (next.flowcanvas.schemaVersion === '0.2') {
    next = { ...next, flowcanvas: { ...next.flowcanvas, schemaVersion: '0.3' as const } }
    migrated = true
  }
  if (next.flowcanvas.schemaVersion === '0.3') {
    // 005-edges — endpoints now FLOAT from each node's center, auto-routing to the nearest perimeter
    // point. The handle sides auto-stamped on edges drawn before this version are exactly the reading
    // noise we are removing, so drop them: every existing edge adopts the clean floating look (re-pinnable
    // per edge anytime). Additive style fields (routing/line/labelT) default in the renderer — no write needed.
    const edges = next.edges.map((e) => {
      if (e.fromSide === undefined && e.toSide === undefined) return e
      const floated: CanvasEdge = { ...e }
      delete floated.fromSide
      delete floated.toSide
      return floated
    })
    next = { ...next, edges, flowcanvas: { ...next.flowcanvas, schemaVersion: '0.4' as const } }
    migrated = true
  }
  if (next.flowcanvas.schemaVersion === '0.4') {
    // 006 — ports become the geometric source of truth. Seed a ConnectionPort for every edge endpoint
    // (pinned fromSide/toSide midpoint, else geometric autoPort) and map legacy meta.rel → meta.edgeType
    // (default 'reference'). The renderer reads ports only afterwards (Decision 4).
    const seeded = seedEdgePorts(next.nodes, next.edges, { setEdgeType: true })
    next = {
      ...next, nodes: seeded.nodes, edges: seeded.edges,
      flowcanvas: { ...next.flowcanvas, schemaVersion: '0.5' as const },
    }
    migrated = true
  }
  return { doc: next, migrated }
}

/**
 * Idempotent guarantee that every edge endpoint resolves to a port — invoked from store.load (Phase 2)
 * for hand/agent edges created without a migration pass. Does NOT bump schemaVersion or set edgeType.
 */
export function normalizePorts(doc: FlowcanvasDoc): FlowcanvasDoc {
  const seeded = seedEdgePorts(doc.nodes, doc.edges, { setEdgeType: false })
  return seeded.changed ? { ...doc, nodes: seeded.nodes, edges: seeded.edges } : doc
}

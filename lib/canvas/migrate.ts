// lib/canvas/migrate.ts — 004 + 005-edges. Pure version ladder shared by store.load + importDoc.
import type { CanvasEdge, FlowcanvasDoc } from './jsoncanvas'
import { deriveLinkEdges, reconcileEdges } from './edges'

/** 0.1 → 0.2 (bake derived links: edges) → 0.3 (no-op bump) → 0.4 (float edges). Returns whether anything changed. */
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
  return { doc: next, migrated }
}

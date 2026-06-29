// lib/canvas/migrate.ts — 004. Pure version ladder shared by store.load + importDoc.
import type { FlowcanvasDoc } from './jsoncanvas'
import { deriveLinkEdges, reconcileEdges } from './edges'

/** 0.1 → 0.2 (bake derived links: edges) → 0.3 (no-op bump). Returns whether anything changed. */
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
  return { doc: next, migrated }
}

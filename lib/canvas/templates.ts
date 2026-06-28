// lib/canvas/templates.ts — Decision 8 (template library). Pure: no fs, no DOM.

import type { CanvasNode, CanvasEdge } from './jsoncanvas'
import type { GeneratedFile } from './brief'

export type TemplateKind = 'node' | 'diagram' | 'document'

export interface CanvasTemplate {
  id: string                 // 'tpl-<slug>'
  kind: TemplateKind
  name: string
  description?: string
  nodes: CanvasNode[]        // coords RELATIVE to the fragment top-left (0,0)
  edges: CanvasEdge[]
  files?: GeneratedFile[]    // kind:'document' — md scaffolds written on instantiate
}

/** Clone a template at (dropX, dropY): fresh ids, rebased coords, meta.template stamped. Pure. */
export function instantiateTemplate(
  t: CanvasTemplate, dropX: number, dropY: number, mint: (p: string) => string,
): { nodes: CanvasNode[]; edges: CanvasEdge[]; files: GeneratedFile[] } {
  const idMap = new Map<string, string>()
  for (const n of t.nodes) idMap.set(n.id, mint('n-'))
  const nodes: CanvasNode[] = t.nodes.map((n) => ({
    ...n,
    id: idMap.get(n.id)!,
    x: n.x + dropX,
    y: n.y + dropY,
    ...(n.parentId ? { parentId: idMap.get(n.parentId) ?? n.parentId } : {}),
    meta: { ...n.meta, origin: 'user' as const, template: t.id },
  }))
  const edges: CanvasEdge[] = t.edges.map((e) => ({
    ...e,
    id: mint('e-'),
    fromNode: idMap.get(e.fromNode) ?? e.fromNode,
    toNode: idMap.get(e.toNode) ?? e.toNode,
    meta: { ...e.meta, origin: 'user' as const },
  }))
  return { nodes, edges, files: t.files ?? [] }
}

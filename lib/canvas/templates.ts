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

/** Insert a uniqueness suffix before the extension: `dir/scaffold.md` → `dir/scaffold-<sfx>.md`. Pure. */
function suffixPath(p: string, sfx: string): string {
  const dot = p.lastIndexOf('.')
  const slash = p.lastIndexOf('/')
  return dot > slash ? `${p.slice(0, dot)}-${sfx}${p.slice(dot)}` : `${p}-${sfx}`
}

/** Clone a template at (dropX, dropY): fresh ids, rebased coords, meta.template stamped. Pure.
 * Document scaffolds (`files`) get uniquified paths so repeated drops never collide / overwrite —
 * and any file node pointing at a scaffold is rewritten to its new path (kept in lockstep). Path
 * suffixes are minted AFTER node + edge ids so the id sequence is stable for existing callers/tests. */
export function instantiateTemplate(
  t: CanvasTemplate, dropX: number, dropY: number, mint: (p: string) => string,
): { nodes: CanvasNode[]; edges: CanvasEdge[]; files: GeneratedFile[] } {
  const idMap = new Map<string, string>()
  for (const n of t.nodes) idMap.set(n.id, mint('n-'))
  const edges: CanvasEdge[] = t.edges.map((e) => ({
    ...e,
    id: mint('e-'),
    fromNode: idMap.get(e.fromNode) ?? e.fromNode,
    toNode: idMap.get(e.toNode) ?? e.toNode,
    meta: { ...e.meta, origin: 'user' as const },
  }))
  // Uniquify each scaffold path once (old → new), then propagate the rewrite to file nodes + files.
  const pathMap = new Map<string, string>()
  for (const f of t.files ?? []) {
    if (!pathMap.has(f.path)) pathMap.set(f.path, suffixPath(f.path, mint('')))
  }
  const nodes: CanvasNode[] = t.nodes.map((n) => {
    const base: CanvasNode = {
      ...n,
      id: idMap.get(n.id)!,
      x: n.x + dropX,
      y: n.y + dropY,
      ...(n.parentId ? { parentId: idMap.get(n.parentId) ?? n.parentId } : {}),
      meta: { ...n.meta, origin: 'user' as const, template: t.id },
    }
    return n.type === 'file' && pathMap.has(n.file) ? { ...base, file: pathMap.get(n.file)! } : base
  })
  const files: GeneratedFile[] = (t.files ?? []).map((f) => ({ ...f, path: pathMap.get(f.path) ?? f.path }))
  return { nodes, edges, files }
}

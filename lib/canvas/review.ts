// lib/canvas/review.ts — Decision 6 (snapshot diff for change-review). Pure: no fs, no DOM.
import type { FlowcanvasDoc, CanvasNode, CanvasEdge } from './jsoncanvas'

export interface ReviewState {
  baseRevision: number
  briefId: string
  capturedAt: string                 // ISO 8601
  snapshot: FlowcanvasDoc            // the board exactly as saved at Submit
  roundGeneratedFiles: string[]      // files the round wrote — deleted on discard
}

export interface ReviewDiff {
  nodes: { added: string[]; updated: string[]; removed: string[] }
  edges: { added: string[]; updated: string[]; removed: string[] }
  comments: { added: string[] }
  files: string[]                     // == roundGeneratedFiles
}

/** Order-insensitive canonical stringify so reordered keys do not read as a change. */
function canon(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null'
  if (Array.isArray(v)) return `[${v.map(canon).join(',')}]`
  const o = v as Record<string, unknown>
  return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${canon(o[k])}`).join(',')}}`
}

function diffById<T extends { id: string }>(before: T[], after: T[]) {
  const beforeById = new Map(before.map((x) => [x.id, x]))
  const afterById = new Map(after.map((x) => [x.id, x]))
  const added: string[] = [], updated: string[] = [], removed: string[] = []
  for (const a of after) {
    const b = beforeById.get(a.id)
    if (!b) added.push(a.id)
    else if (canon(a) !== canon(b)) updated.push(a.id)
  }
  for (const b of before) if (!afterById.has(b.id)) removed.push(b.id)
  return { added, updated, removed }
}

/** Pure structural diff(snapshot, current) keyed by id; agent attribution lives on meta.origin. */
export function diffDocs(
  snapshot: FlowcanvasDoc,
  current: FlowcanvasDoc,
  roundGeneratedFiles: string[] = [],
): ReviewDiff {
  const nodes = diffById<CanvasNode>(snapshot.nodes, current.nodes)
  const edges = diffById<CanvasEdge>(snapshot.edges, current.edges)
  const before = new Set(snapshot.flowcanvas.comments.map((c) => c.id))
  const comments = { added: current.flowcanvas.comments.filter((c) => !before.has(c.id)).map((c) => c.id) }
  return { nodes, edges, comments, files: roundGeneratedFiles }
}

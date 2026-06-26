import type { CanvasNode, CanvasEdge } from './jsoncanvas'
import { isFileNode } from './jsoncanvas'

/** Normalize a path for matching: drop a leading `./` or `/`, unify separators. */
const norm = (p: string) => p.replace(/^\.?\//, '').replace(/\\/g, '/')

/** Coerce a frontmatter `links` value (array | scalar | absent) into a clean string[]. */
function readLinks(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((l): l is string => typeof l === 'string')
  return typeof value === 'string' ? [value] : []
}

/**
 * Turn every file node's `links:` frontmatter into edges with deterministic ids
 * (`lk:<from>-><to>`). Recomputing on each load replaces the whole derived set, so a link
 * removed from frontmatter drops its edge and a link added creates one. Unresolved links
 * (target not on the board) and self-links are skipped; duplicate links collapse by id.
 */
export function deriveLinkEdges(nodes: CanvasNode[]): CanvasEdge[] {
  const byPath = new Map<string, string>()
  for (const n of nodes) if (isFileNode(n)) byPath.set(norm(n.file), n.id)

  const out: CanvasEdge[] = []
  const seen = new Set<string>()
  for (const n of nodes) {
    if (!isFileNode(n)) continue
    for (const link of readLinks(n.meta?.frontmatter?.links)) {
      const to = byPath.get(norm(link))
      if (!to || to === n.id) continue                 // unresolved (e.g. agent-tools/*) or self
      const id = `lk:${n.id}->${to}`
      if (seen.has(id)) continue                        // same file linking the same target twice
      seen.add(id)
      out.push({ id, fromNode: n.id, toNode: to, toEnd: 'arrow', label: 'links', color: '6', meta: { origin: 'links' } })
    }
  }
  return out
}

/**
 * Merge freshly-derived `links` edges with the existing edge set:
 * - user + agent edges (any non-`links` origin) are kept untouched;
 * - a derived edge that duplicates a kept directed pair is suppressed (the manual/agent edge wins);
 * - prior `links` edges are dropped wholesale and replaced by `derived` (self-healing).
 */
export function reconcileEdges(existing: CanvasEdge[], derived: CanvasEdge[]): CanvasEdge[] {
  const keep = existing.filter((e) => e.meta?.origin !== 'links')              // user + agent untouched
  const pairs = new Set(keep.map((e) => `${e.fromNode}>${e.toNode}`))
  const fresh = derived.filter((e) => !pairs.has(`${e.fromNode}>${e.toNode}`)) // drop dupes of a manual/agent pair
  return [...keep, ...fresh]                                                    // stale 'links' dropped
}

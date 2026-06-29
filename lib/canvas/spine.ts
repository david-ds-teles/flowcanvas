// lib/canvas/spine.ts — 004. Pure: no fs, no network, no DOM.
import GithubSlugger from 'github-slugger'
import type { CanvasNode } from './jsoncanvas'

export interface SpineHeading { anchor: string; text: string; depth: number }

/** Normalize a root-relative path for matching: drop a leading `./` or `/`, unify separators.
 *  Shared by the store, the spine, and the inspector (was duplicated in all three). */
export function normPath(p: string): string {
  return p.replace(/^\.?\//, '').replace(/\\/g, '/')
}

/** github-slugger-compatible slug — MUST match meta.source.anchor + rehype-slug ids.
 *  A fresh slugger per call keeps slugify pure/deterministic (no cross-call dedup state). */
export function slugify(heading: string): string {
  return new GithubSlugger().slug(heading)
}

/** ATX headings of the core markdown → outline rows. One slugger instance so duplicate
 *  heading text gets the same -1/-2 suffixes rehype-slug produces in a single document. */
export function outlineOf(markdown: string): SpineHeading[] {
  const slugger = new GithubSlugger()
  const out: SpineHeading[] = []
  let inFence = false
  for (const line of markdown.split('\n')) {
    if (/^\s{0,3}(```|~~~)/.test(line)) { inFence = !inFence; continue }   // toggle on a fence; skip its content
    if (inFence) continue                                                   // a "# heading" inside a code block is not a heading
    const m = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line)
    if (!m) continue
    const text = m[2].trim()
    out.push({ anchor: slugger.slug(text), text, depth: m[1].length })
  }
  return out
}

/** anchor → nodeIds, restricted to nodes whose meta.source.path === coreDocPath. */
export function buildSourceIndex(nodes: CanvasNode[], coreDocPath: string): Map<string, string[]> {
  const index = new Map<string, string[]>()
  for (const n of nodes) {
    const src = n.meta?.source
    if (!src || src.path !== coreDocPath || !src.anchor) continue
    const list = index.get(src.anchor) ?? []
    list.push(n.id)
    index.set(src.anchor, list)
  }
  return index
}

/** Distinct meta.source.path values across the board, in first-seen order — feeds the switcher (Q4). */
export function citedDocPaths(nodes: CanvasNode[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const n of nodes) {
    const p = n.meta?.source?.path
    if (p && !seen.has(p)) { seen.add(p); out.push(p) }
  }
  return out
}

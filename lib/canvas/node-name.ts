import type { CanvasNode } from './jsoncanvas'
import { nodeKind } from './jsoncanvas'

// Pure, DOM-free human-readable display name for any node — shared by the comment layer (thread
// header), the inspector (selection name + comments list), and any future surface (Decision 3).
//   group        → label || 'Group'
//   link         → url
//   text (note)  → first line, capped at 50 chars || 'Note'
//   file markdown → frontmatter.name || basename (matches the markdown card title)
//   file other    → basename
export function nodeDisplayName(n: CanvasNode): string {
  if (n.type === 'group') return n.label || 'Group'
  if (n.type === 'link') return n.url
  if (n.type === 'text') return n.text.split('\n')[0].slice(0, 50) || 'Note'
  const base = n.file.split('/').pop() ?? n.file
  if (nodeKind(n) === 'markdown') {
    const name = n.meta?.frontmatter?.name
    return name != null && String(name).trim() ? String(name) : base
  }
  return base
}

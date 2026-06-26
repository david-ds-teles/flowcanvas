import { describe, it, expect } from 'vitest'
import type { CanvasNode, CanvasEdge } from './jsoncanvas'
import { deriveLinkEdges, reconcileEdges } from './edges'

// Three file nodes wired by frontmatter `links`, plus a non-file node that can never be a target.
const fileNode = (id: string, file: string, links?: unknown): CanvasNode => ({
  id, type: 'file', file, x: 0, y: 0, width: 100, height: 100,
  meta: { origin: 'user', frontmatter: links === undefined ? {} : { links } },
})

const nodes: CanvasNode[] = [
  fileNode('n-design', 'examples/design.md', ['examples/plan.md', 'examples/missing.md']),
  fileNode('n-plan', 'examples/plan.md', ['./examples/design.md']),   // leading ./ must still resolve
  fileNode('n-img', 'examples/architecture.png'),                      // no links frontmatter
  { id: 'n-note', type: 'text', text: 'note', x: 0, y: 0, width: 100, height: 100 },
]

describe('deriveLinkEdges', () => {
  it('derives a deterministic lk: edge per resolvable frontmatter link', () => {
    const edges = deriveLinkEdges(nodes)
    const ids = edges.map((e) => e.id).sort()
    expect(ids).toEqual(['lk:n-design->n-plan', 'lk:n-plan->n-design'])
  })

  it('tags derived edges with origin links, a links label, and the lock color', () => {
    const e = deriveLinkEdges(nodes).find((x) => x.id === 'lk:n-design->n-plan')!
    expect(e).toMatchObject({ fromNode: 'n-design', toNode: 'n-plan', label: 'links', color: '6', toEnd: 'arrow', meta: { origin: 'links' } })
  })

  it('skips unresolved links (target not on the board)', () => {
    // n-design links to examples/missing.md which has no node → no edge for it
    expect(deriveLinkEdges(nodes).some((e) => e.toNode === 'examples/missing.md')).toBe(false)
    expect(deriveLinkEdges(nodes)).toHaveLength(2)
  })

  it('skips self-links', () => {
    const selfish = [fileNode('n-self', 'a.md', ['a.md'])]
    expect(deriveLinkEdges(selfish)).toHaveLength(0)
  })

  it('collapses a file that links the same target twice into one edge', () => {
    const dup = [fileNode('n-a', 'a.md', ['b.md', 'b.md']), fileNode('n-b', 'b.md')]
    expect(deriveLinkEdges(dup)).toHaveLength(1)
  })

  it('tolerates a scalar (non-array) links value', () => {
    const scalar = [fileNode('n-a', 'a.md', 'b.md'), fileNode('n-b', 'b.md')]
    expect(deriveLinkEdges(scalar).map((e) => e.id)).toEqual(['lk:n-a->n-b'])
  })

  it('ignores non-string entries in a links array without throwing', () => {
    const messy = [fileNode('n-a', 'a.md', ['b.md', 42, null]), fileNode('n-b', 'b.md')]
    expect(deriveLinkEdges(messy)).toHaveLength(1)
  })
})

describe('reconcileEdges', () => {
  const derived = deriveLinkEdges(nodes)

  it('keeps user and agent edges untouched', () => {
    const existing: CanvasEdge[] = [
      { id: 'e-user', fromNode: 'n-img', toNode: 'n-note', label: 'manual', meta: { origin: 'user' } },
      { id: 'e-agent', fromNode: 'n-note', toNode: 'n-img', label: 'suggested', meta: { origin: 'agent' } },
    ]
    const out = reconcileEdges(existing, derived)
    expect(out.filter((e) => e.meta?.origin === 'user' || e.meta?.origin === 'agent')).toHaveLength(2)
    expect(out).toHaveLength(4) // 2 kept + 2 derived
  })

  it('drops stale links edges and replaces them with the fresh derived set', () => {
    const existing: CanvasEdge[] = [
      { id: 'lk:old->gone', fromNode: 'old', toNode: 'gone', label: 'links', meta: { origin: 'links' } },
    ]
    const out = reconcileEdges(existing, derived)
    expect(out.some((e) => e.id === 'lk:old->gone')).toBe(false)
    expect(out.map((e) => e.id).sort()).toEqual(['lk:n-design->n-plan', 'lk:n-plan->n-design'])
  })

  it('suppresses a derived edge that duplicates a manual directed pair (manual wins)', () => {
    const existing: CanvasEdge[] = [
      { id: 'e-manual', fromNode: 'n-design', toNode: 'n-plan', label: 'realizes', meta: { origin: 'user' } },
    ]
    const out = reconcileEdges(existing, derived)
    expect(out.some((e) => e.id === 'lk:n-design->n-plan')).toBe(false)   // derived dupe suppressed
    expect(out.some((e) => e.id === 'lk:n-plan->n-design')).toBe(true)    // reverse direction still derived
    expect(out.find((e) => e.fromNode === 'n-design' && e.toNode === 'n-plan')!.id).toBe('e-manual')
  })

  it('treats an edge with no origin as non-derived and keeps it', () => {
    const existing: CanvasEdge[] = [{ id: 'e-bare', fromNode: 'n-img', toNode: 'n-note' }]
    const out = reconcileEdges(existing, derived)
    expect(out.some((e) => e.id === 'e-bare')).toBe(true)
  })
})

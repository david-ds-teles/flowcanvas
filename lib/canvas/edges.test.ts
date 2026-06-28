import { describe, it, expect } from 'vitest'
import type { CanvasNode, CanvasEdge, FlowcanvasDoc } from './jsoncanvas'
import { deriveLinkEdges, reconcileEdges, projectLinksForExport } from './edges'

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

// ─── projectLinksForExport ────────────────────────────────────────────────────

/** Minimal FlowcanvasDoc fixture — only nodes/edges matter for projectLinksForExport. */
const minFlowcanvas: FlowcanvasDoc['flowcanvas'] = {
  schemaVersion: '0.1',
  session: { createdAt: '', updatedAt: '', revision: 0 },
  comments: [],
}
const doc = (docNodes: CanvasNode[], docEdges: CanvasEdge[]): FlowcanvasDoc => ({
  nodes: docNodes,
  edges: docEdges,
  flowcanvas: minFlowcanvas,
})

const fn = (id: string, file: string): CanvasNode =>
  ({ id, type: 'file', file, x: 0, y: 0, width: 100, height: 100 })

const edge = (id: string, from: string, to: string): CanvasEdge =>
  ({ id, fromNode: from, toNode: to })

describe('projectLinksForExport', () => {
  it('maps a single file→file edge to the source path entry', () => {
    const result = projectLinksForExport(doc(
      [fn('n1', 'a.md'), fn('n2', 'b.md')],
      [edge('e1', 'n1', 'n2')],
    ))
    expect(result).toEqual({ 'a.md': ['b.md'] })
  })

  it('dedups multiple edges between the same pair into a single target entry', () => {
    const result = projectLinksForExport(doc(
      [fn('n1', 'a.md'), fn('n2', 'b.md')],
      [edge('e1', 'n1', 'n2'), edge('e2', 'n1', 'n2')],
    ))
    expect(result).toEqual({ 'a.md': ['b.md'] })
  })

  it('skips edges whose fromNode is a non-file node (text)', () => {
    const textNode: CanvasNode = { id: 'nt', type: 'text', text: 'note', x: 0, y: 0, width: 100, height: 100 }
    const result = projectLinksForExport(doc(
      [textNode, fn('n2', 'b.md')],
      [edge('e1', 'nt', 'n2')],
    ))
    expect(result).toEqual({})
  })

  it('skips edges whose toNode is a non-file node (link)', () => {
    const linkNode: CanvasNode = { id: 'nl', type: 'link', url: 'https://x.com', x: 0, y: 0, width: 100, height: 100 }
    const result = projectLinksForExport(doc(
      [fn('n1', 'a.md'), linkNode],
      [edge('e1', 'n1', 'nl')],
    ))
    expect(result).toEqual({})
  })

  it('skips edges involving group nodes', () => {
    const groupNode: CanvasNode = { id: 'ng', type: 'group', x: 0, y: 0, width: 300, height: 300 }
    const result = projectLinksForExport(doc(
      [fn('n1', 'a.md'), groupNode],
      [edge('e1', 'n1', 'ng'), edge('e2', 'ng', 'n1')],
    ))
    expect(result).toEqual({})
  })

  it('collects multiple distinct targets from one source', () => {
    const result = projectLinksForExport(doc(
      [fn('n1', 'a.md'), fn('n2', 'b.md'), fn('n3', 'c.md')],
      [edge('e1', 'n1', 'n2'), edge('e2', 'n1', 'n3')],
    ))
    expect(result).toEqual({ 'a.md': ['b.md', 'c.md'] })
  })

  it('returns an empty object when there are no edges', () => {
    const result = projectLinksForExport(doc(
      [fn('n1', 'a.md'), fn('n2', 'b.md')],
      [],
    ))
    expect(result).toEqual({})
  })
})

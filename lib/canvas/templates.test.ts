import { describe, it, expect } from 'vitest'
import { instantiateTemplate, type CanvasTemplate } from './templates'

// ─── Deterministic mint factory — each test gets its own counter ───────────────
function makeMint() {
  let i = 0
  return (p: string) => `${p}${(++i).toString(16).padStart(4, '0')}`
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

// 2-node (group parent + text child) + 1 typed edge — the canonical coverage fixture.
const FIXTURE: CanvasTemplate = {
  id: 'tpl-test',
  kind: 'diagram',
  name: 'Test Diagram',
  nodes: [
    { id: 'orig-parent', type: 'group', x: 0, y: 0, width: 400, height: 300 },
    {
      id: 'orig-child', type: 'text', text: 'Child Node',
      x: 50, y: 80, width: 200, height: 100,
      parentId: 'orig-parent',
    },
  ],
  edges: [
    {
      id: 'orig-e1',
      fromNode: 'orig-parent', toNode: 'orig-child',
      label: 'flows-to',
      meta: { origin: 'user', rel: 'calls' },
    },
  ],
}

// A document-kind template with generated file scaffolds.
const DOCUMENT_FIXTURE: CanvasTemplate = {
  id: 'tpl-doc',
  kind: 'document',
  name: 'Document Template',
  nodes: [
    { id: 'doc-n1', type: 'file', file: 'templates/scaffold.md', x: 0, y: 0, width: 220, height: 120 },
  ],
  edges: [],
  files: [
    { path: 'templates/scaffold.md', content: '---\ntitle: Scaffold\n---\n# Scaffold\n' },
  ],
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('instantiateTemplate', () => {
  it('mints fresh node ids — not the template originals', () => {
    const mint = makeMint()
    const { nodes } = instantiateTemplate(FIXTURE, 0, 0, mint)
    const originalIds = FIXTURE.nodes.map((n) => n.id)
    expect(nodes.map((n) => n.id)).not.toEqual(originalIds)
    expect(nodes[0].id).toBe('n-0001')
    expect(nodes[1].id).toBe('n-0002')
  })

  it('rebases node coordinates by the drop point', () => {
    const mint = makeMint()
    const { nodes } = instantiateTemplate(FIXTURE, 500, 300, mint)
    // parent: orig (0,0) + drop (500,300)
    expect(nodes[0]).toMatchObject({ x: 500, y: 300 })
    // child: orig (50,80) + drop (500,300)
    expect(nodes[1]).toMatchObject({ x: 550, y: 380 })
  })

  it('remaps parentId to the parent\'s NEW id (not the original)', () => {
    const mint = makeMint()
    const { nodes } = instantiateTemplate(FIXTURE, 0, 0, mint)
    const parent = nodes[0]
    const child = nodes[1]
    expect(child.parentId).toBe(parent.id)        // remapped to new id
    expect(child.parentId).not.toBe('orig-parent') // not the original
  })

  it('does not set parentId on top-level nodes', () => {
    const mint = makeMint()
    const { nodes } = instantiateTemplate(FIXTURE, 0, 0, mint)
    expect(nodes[0].parentId).toBeUndefined()
  })

  it('stamps meta.origin:user and meta.template on every cloned node', () => {
    const mint = makeMint()
    const { nodes } = instantiateTemplate(FIXTURE, 0, 0, mint)
    for (const n of nodes) {
      expect(n.meta?.origin).toBe('user')
      expect(n.meta?.template).toBe(FIXTURE.id)
    }
  })

  it('preserves pre-existing meta fields while stamping provenance', () => {
    const mint = makeMint()
    const tpl: CanvasTemplate = {
      id: 'tpl-meta',
      kind: 'node',
      name: 'Meta Test',
      nodes: [
        {
          id: 'orig-m', type: 'text', text: 'text', x: 0, y: 0, width: 100, height: 100,
          meta: { collapsed: true, shape: 'ellipse' },
        },
      ],
      edges: [],
    }
    const { nodes } = instantiateTemplate(tpl, 0, 0, mint)
    expect(nodes[0].meta).toMatchObject({ collapsed: true, shape: 'ellipse', origin: 'user', template: 'tpl-meta' })
  })

  it('remaps edge endpoints through the id map and mints a fresh edge id', () => {
    const mint = makeMint()
    const { nodes, edges } = instantiateTemplate(FIXTURE, 0, 0, mint)
    expect(edges).toHaveLength(1)
    const e = edges[0]
    expect(e.id).toBe('e-0003')           // third mint call (after two nodes)
    expect(e.id).not.toBe('orig-e1')
    expect(e.fromNode).toBe(nodes[0].id)  // remapped to parent's new id
    expect(e.toNode).toBe(nodes[1].id)    // remapped to child's new id
  })

  it('preserves edge label and rel from the template', () => {
    const mint = makeMint()
    const { edges } = instantiateTemplate(FIXTURE, 0, 0, mint)
    expect(edges[0].label).toBe('flows-to')
    expect(edges[0].meta?.rel).toBe('calls')
  })

  it('stamps meta.origin:user on every cloned edge', () => {
    const mint = makeMint()
    const { edges } = instantiateTemplate(FIXTURE, 0, 0, mint)
    expect(edges[0].meta?.origin).toBe('user')
  })

  it('returns t.files for a document kind template', () => {
    const mint = makeMint()
    const { files } = instantiateTemplate(DOCUMENT_FIXTURE, 0, 0, mint)
    expect(files).toEqual(DOCUMENT_FIXTURE.files)
    expect(files).toHaveLength(1)
    expect(files[0].path).toBe('templates/scaffold.md')
  })

  it('returns files:[] when the template has no files property', () => {
    const mint = makeMint()
    const { files } = instantiateTemplate(FIXTURE, 0, 0, mint)
    expect(files).toEqual([])
  })

  it('matches the plan worked example — tpl-x dropped at (500, 300)', () => {
    const mint = makeMint()
    const tplX: CanvasTemplate = {
      id: 'tpl-x',
      kind: 'diagram',
      name: 'X',
      nodes: [
        { id: 'a', type: 'text', text: 'A', x: 0, y: 0, width: 100, height: 100 },
        { id: 'b', type: 'text', text: 'B', x: 100, y: 0, width: 100, height: 100, parentId: 'a' },
      ],
      edges: [{ id: 't-e', fromNode: 'a', toNode: 'b' }],
    }
    const { nodes, edges, files } = instantiateTemplate(tplX, 500, 300, mint)
    expect(nodes[0]).toMatchObject({ id: 'n-0001', x: 500, y: 300, meta: { origin: 'user', template: 'tpl-x' } })
    expect(nodes[1]).toMatchObject({ id: 'n-0002', x: 600, y: 300, parentId: 'n-0001', meta: { origin: 'user', template: 'tpl-x' } })
    expect(edges[0]).toMatchObject({ id: 'e-0003', fromNode: 'n-0001', toNode: 'n-0002', meta: { origin: 'user' } })
    expect(files).toEqual([])
  })

  it('preserves an original parentId when the referenced parent is not in the template (fallback path)', () => {
    const mint = makeMint()
    const tpl: CanvasTemplate = {
      id: 'tpl-orphan',
      kind: 'node',
      name: 'Orphan',
      nodes: [{ id: 'a', type: 'text', text: 'A', x: 0, y: 0, width: 100, height: 100, parentId: 'external-group' }],
      edges: [],
    }
    const { nodes } = instantiateTemplate(tpl, 10, 20, mint)
    expect(nodes[0].parentId).toBe('external-group')   // not in the id map → original preserved, not undefined
    expect(nodes[0].id).toBe('n-0001')
  })
})

import { describe, it, expect } from 'vitest'
import type { FlowcanvasDoc } from './jsoncanvas'
import { buildBrief, applyResponse, AGENT_CONTRACT, type AgentResponse } from './brief'

// A small board mirroring the design's worked example: a markdown node (frontmatter + body), a note,
// an image, a links-derived edge, and a comment thread root.
function seed(): FlowcanvasDoc {
  return {
    nodes: [
      { id: 'n-design', type: 'file', file: 'examples/design.md', x: -480, y: -200, width: 380, height: 320, color: '5', meta: { origin: 'user', frontmatter: { name: 'design', status: 'approved', links: ['examples/plan.md'] } } },
      { id: 'n-plan', type: 'file', file: 'examples/plan.md', x: 40, y: -200, width: 380, height: 320, meta: { origin: 'user', frontmatter: { name: 'plan', links: [] } } },
      { id: 'n-img', type: 'file', file: 'examples/arch.png', x: 40, y: 200, width: 380, height: 240, meta: { origin: 'user' } },
      { id: 'n-note', type: 'text', text: '## Open question', x: -480, y: 200, width: 320, height: 160, color: '#5ef2ff', meta: { origin: 'user' } },
      { id: 'n-link', type: 'link', url: 'https://reactflow.dev', x: 480, y: 200, width: 260, height: 80, meta: { origin: 'user' } },
    ],
    edges: [
      { id: 'lk:n-design->n-plan', fromNode: 'n-design', toNode: 'n-plan', label: 'links', color: '6', toEnd: 'arrow', meta: { origin: 'links' } },
    ],
    flowcanvas: {
      schemaVersion: '0.1',
      session: { intent: 'Map the design↔plan↔assets.', createdAt: '2026-06-25T10:00:00Z', updatedAt: '2026-06-25T10:42:00Z', revision: 7, lastBriefId: 'brief-77a1' },
      comments: [
        { id: 'c-1', anchor: { kind: 'node', nodeId: 'n-plan', offsetX: 0.5, offsetY: 0.9 }, parentId: null, author: 'human:david', text: 'reuse the file API?', createdAt: '2026-06-25T10:20:00Z', resolvedAt: null, badge: 1 },
      ],
    },
  }
}

// A deterministic id factory for the pure merge (the store passes a uuid-based one).
function counter() {
  let i = 0
  return (prefix: string) => `${prefix}${(++i).toString(16).padStart(4, '0')}`
}

describe('buildBrief', () => {
  it('embeds frontmatter+body for markdown, url for link, text for note, edges with origin, comments by id', () => {
    const doc = seed()
    const resolved = new Map([
      ['examples/design.md', { frontmatter: { name: 'design', status: 'approved' }, body: '## Problem', truncated: false }],
      ['examples/plan.md', { frontmatter: { name: 'plan' }, body: '## Steps', truncated: false }],
    ])
    const brief = buildBrief(doc, 'board.canvas', resolved, 'brief-abcd', '2026-06-26T00:00:00Z')

    expect(brief).toMatchObject({ briefVersion: '0.1', briefId: 'brief-abcd', canvasRef: 'board.canvas', baseRevision: 7, intent: 'Map the design↔plan↔assets.' })
    expect(brief.responseContract).toBe(AGENT_CONTRACT)

    const design = brief.nodes.find((n) => n.id === 'n-design')!
    expect(design).toMatchObject({ kind: 'markdown', path: 'examples/design.md', body: '## Problem', truncated: false })
    expect(design.frontmatter).toMatchObject({ name: 'design', status: 'approved' })
    expect(design.position).toEqual({ x: -480, y: -200, width: 380, height: 320 })

    expect(brief.nodes.find((n) => n.id === 'n-link')).toMatchObject({ kind: 'link', url: 'https://reactflow.dev' })
    expect(brief.nodes.find((n) => n.id === 'n-note')).toMatchObject({ kind: 'note', text: '## Open question' })
    expect(brief.nodes.find((n) => n.id === 'n-img')).toMatchObject({ kind: 'image', path: 'examples/arch.png' })

    expect(brief.edges).toEqual([{ id: 'lk:n-design->n-plan', from: 'n-design', to: 'n-plan', label: 'links', rel: 'references', origin: 'links' }])
    expect(brief.comments).toEqual([{ id: 'c-1', threadId: 'c-1', anchorNodeId: 'n-plan', author: 'human:david', text: 'reuse the file API?', createdAt: '2026-06-25T10:20:00Z', resolved: false }])
  })

  it('falls back to an empty intent when the session has none', () => {
    const doc = seed()
    doc.flowcanvas.session.intent = undefined
    expect(buildBrief(doc, 'b.canvas', new Map(), 'brief-x', 'now').intent).toBe('')
  })
})

describe('applyResponse', () => {
  const RESPONSE: AgentResponse = {
    responseVersion: '0.1',
    briefId: 'brief-77a1',
    summary: 'Added a tests node + reply',
    upsertNodes: [{ id: 'ag-tests', type: 'file', file: 'examples/tests.md', x: 460, y: -200, width: 380, height: 320 }],
    upsertEdges: [{ id: 'ag-e1', fromNode: 'n-plan', toNode: 'ag-tests', label: 'verified by' }],
    generatedFiles: [{ path: 'examples/tests.md', content: '---\nname: tests\n---\n## Tests' }],
    comments: [{ parentId: 'c-1', anchor: { kind: 'node', nodeId: 'n-plan', offsetX: 0.5, offsetY: 0.9 }, author: 'agent:opus-4.8', text: 'Yes — reused verbatim.' }],
  }

  it('creates the node + edge, attaches the reply, stamps origin:agent, bumps revision, and reports', () => {
    const { next, report } = applyResponse(seed(), RESPONSE, counter(), '2026-06-26T01:00:00Z')

    const node = next.nodes.find((n) => n.id === 'ag-tests')!
    expect(node).toMatchObject({ type: 'file', file: 'examples/tests.md', x: 460, meta: { origin: 'agent' } })
    const edge = next.edges.find((e) => e.id === 'ag-e1')!
    expect(edge).toMatchObject({ fromNode: 'n-plan', toNode: 'ag-tests', label: 'verified by', meta: { origin: 'agent' } })
    const reply = next.flowcanvas.comments.find((c) => c.parentId === 'c-1')!
    expect(reply).toMatchObject({ author: 'agent:opus-4.8', text: 'Yes — reused verbatim.' })
    expect(reply.badge).toBeUndefined()

    expect(next.flowcanvas.session.revision).toBe(8)
    expect(next.flowcanvas.session.updatedAt).toBe('2026-06-26T01:00:00Z')
    expect(report).toMatchObject({ stale: false, generatedFiles: ['examples/tests.md'], created: { nodes: 1, edges: 1, comments: 1 } })
  })

  it('is idempotent — applying the same response twice yields the same nodes/edges/comments', () => {
    const once = applyResponse(seed(), RESPONSE, counter(), 'now').next
    const { next: twice, report } = applyResponse(once, RESPONSE, counter(), 'now')

    expect(twice.nodes.filter((n) => n.id === 'ag-tests')).toHaveLength(1)
    expect(twice.edges.filter((e) => e.id === 'ag-e1')).toHaveLength(1)
    expect(twice.flowcanvas.comments.filter((c) => c.parentId === 'c-1')).toHaveLength(1)
    // second apply updates the existing node/edge in place; creates nothing new
    expect(report.created).toEqual({ nodes: 0, edges: 0, comments: 0 })
    expect(report.updated.nodes).toBe(1)
  })

  it('dedups an id-less reply by content signature (idempotent without ids)', () => {
    const idless: AgentResponse = { responseVersion: '0.1', briefId: 'brief-77a1', summary: '', comments: [{ parentId: 'c-1', anchor: { kind: 'node', nodeId: 'n-plan', offsetX: 0.5, offsetY: 0.9 }, author: 'agent:opus', text: 'same text' }] }
    const once = applyResponse(seed(), idless, counter(), 'now').next
    const twice = applyResponse(once, idless, counter(), 'now').next
    expect(twice.flowcanvas.comments.filter((c) => c.text === 'same text')).toHaveLength(1)
  })

  it('skips an id-less agent edge that duplicates a directed pair already on the board', () => {
    const dup: AgentResponse = { responseVersion: '0.1', briefId: 'brief-77a1', summary: '', upsertEdges: [{ fromNode: 'n-design', toNode: 'n-plan', label: 'dup of links' }] }
    const { next, report } = applyResponse(seed(), dup, counter(), 'now')
    expect(next.edges).toHaveLength(1)          // the existing lk: edge is untouched, no dup added
    expect(report.created.edges).toBe(0)
  })

  it('flags stale when the response briefId does not match session.lastBriefId', () => {
    const stale: AgentResponse = { responseVersion: '0.1', briefId: 'brief-WRONG', summary: '' }
    expect(applyResponse(seed(), stale, counter(), 'now').report.stale).toBe(true)
  })

  it('applies explicit removals last and reports the counts', () => {
    const rm: AgentResponse = { responseVersion: '0.1', briefId: 'brief-77a1', summary: '', removeNodeIds: ['n-note'], removeEdgeIds: ['lk:n-design->n-plan'] }
    const { next, report } = applyResponse(seed(), rm, counter(), 'now')
    expect(next.nodes.find((n) => n.id === 'n-note')).toBeUndefined()
    expect(next.edges).toHaveLength(0)
    expect(report.removed).toEqual({ nodes: 1, edges: 1 })
  })

  it('updates an existing node by reused id (geometry + origin) without creating a duplicate', () => {
    const move: AgentResponse = { responseVersion: '0.1', briefId: 'brief-77a1', summary: '', upsertNodes: [{ id: 'n-plan', type: 'file', file: 'examples/plan.md', x: 999, y: 888, width: 400, height: 300 }] }
    const { next, report } = applyResponse(seed(), move, counter(), 'now')
    expect(next.nodes.filter((n) => n.id === 'n-plan')).toHaveLength(1)
    expect(next.nodes.find((n) => n.id === 'n-plan')).toMatchObject({ x: 999, y: 888, meta: { origin: 'agent' } })
    expect(report.updated.nodes).toBe(1)
  })
})

// ─────────────────────────── v2 — groups, typed edges, refs, provenance (Decisions 1/2/7/9) ───────────────────────────

describe('v2 extraction surfaces', () => {
  const counter = () => {
    let i = 0
    return (prefix: string) => `${prefix}${(++i).toString(16).padStart(4, '0')}`
  }

  it('applyResponse creates a group node (label, meta.shape, parentId on children) and stamps meta.source on all', () => {
    const v2: AgentResponse = {
      responseVersion: '0.1', briefId: 'brief-77a1', summary: 'extract commerce',
      upsertNodes: [
        { id: 'ag-grp', type: 'group', x: 0, y: 0, width: 520, height: 360, label: 'Checkout', shape: 'rectangle',
          source: { path: 'examples/commerce.md', anchor: 'checkout' } },
        { id: 'ag-cart', type: 'file', file: 'examples/commerce.nodes/cart.md', x: 40, y: 60, width: 220, height: 120,
          parentId: 'ag-grp', source: { path: 'examples/commerce.md', anchor: 'cart' } },
      ],
    }
    const { next, report } = applyResponse(seed(), v2, counter(), 'now')

    const grp = next.nodes.find((n) => n.id === 'ag-grp')!
    expect(grp).toMatchObject({
      type: 'group', label: 'Checkout',
      meta: { origin: 'agent', shape: 'rectangle', source: { path: 'examples/commerce.md', anchor: 'checkout' } },
    })
    const cart = next.nodes.find((n) => n.id === 'ag-cart')!
    expect(cart).toMatchObject({
      type: 'file', parentId: 'ag-grp',
      meta: { origin: 'agent', source: { path: 'examples/commerce.md', anchor: 'cart' } },
    })
    expect(report.created.nodes).toBe(2)
  })

  it('applyResponse carries meta.rel on edges and defaults label from REL_LABELS when the agent omits it', () => {
    const typed: AgentResponse = {
      responseVersion: '0.1', briefId: 'brief-77a1', summary: '',
      upsertEdges: [
        { id: 'ag-rel1', fromNode: 'n-design', toNode: 'n-note', rel: 'depends-on' },   // no label → default
        { id: 'ag-rel2', fromNode: 'n-design', toNode: 'n-img' },                        // no rel → 'related'
      ],
    }
    const { next } = applyResponse(seed(), typed, counter(), 'now')
    expect(next.edges.find((e) => e.id === 'ag-rel1')).toMatchObject({ label: 'depends on', meta: { origin: 'agent', rel: 'depends-on' } })
    expect(next.edges.find((e) => e.id === 'ag-rel2')).toMatchObject({ label: 'related', meta: { origin: 'agent', rel: 'related' } })
  })

  it('preserves an existing group label when the agent updates the group without a label', () => {
    const doc = seed()
    doc.nodes.push({ id: 'g1', type: 'group', label: 'Original', x: 0, y: 600, width: 400, height: 200, meta: { origin: 'user' } })
    const upd: AgentResponse = {
      responseVersion: '0.1', briefId: 'brief-77a1', summary: '',
      upsertNodes: [{ id: 'g1', type: 'group', x: 10, y: 610, width: 420, height: 220 }],   // no label sent
    }
    const { next } = applyResponse(doc, upd, counter(), 'now')
    expect(next.nodes.find((n) => n.id === 'g1')).toMatchObject({ type: 'group', label: 'Original', x: 10, meta: { origin: 'agent' } })
  })

  it('buildBrief emits refs for file nodes, rel for edges, and source/parentId/label for groups', () => {
    const doc = seed()
    doc.nodes.push({ id: 'g1', type: 'group', label: 'Sub', x: 0, y: 600, width: 400, height: 200,
      meta: { origin: 'agent', source: { path: 'examples/design.md', anchor: 'sub' } } })
    doc.nodes.push({ id: 'n-child', type: 'file', file: 'examples/child.md', x: 20, y: 640, width: 200, height: 120,
      parentId: 'g1', meta: { origin: 'agent' } })
    const resolved = new Map([
      ['examples/design.md', { frontmatter: { links: ['examples/plan.md#phase-1'] }, body: 'see [plan](./plan.md)', truncated: false }],
      ['examples/child.md', { frontmatter: {}, body: '', truncated: false }],
    ])
    const brief = buildBrief(doc, 'b.canvas', resolved, 'brief-z', 'now')

    const design = brief.nodes.find((n) => n.id === 'n-design')!
    expect(design.refs).toEqual([
      { kind: 'frontmatter', target: 'examples/plan.md', anchor: 'phase-1', isExternal: false },
      { kind: 'link', target: 'examples/plan.md', anchor: undefined, isExternal: false },
    ])
    expect(brief.nodes.find((n) => n.id === 'g1')).toMatchObject({ kind: 'group', label: 'Sub', source: { path: 'examples/design.md', anchor: 'sub' } })
    expect(brief.nodes.find((n) => n.id === 'n-child')).toMatchObject({ parentId: 'g1' })
    expect(brief.edges.find((e) => e.id === 'lk:n-design->n-plan')!.rel).toBe('references')
  })
})

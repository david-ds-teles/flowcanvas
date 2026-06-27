import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FlowcanvasDoc } from './jsoncanvas'
import { useCanvasStore } from './store'
import * as api from '../api'

// Stub the fs-backed `links:` write-back so onConnect / removeEdgeWriteback can be asserted without a
// server (the real patchLinks hits /api/canvas/links). Everything else in api stays real but unused here.
vi.mock('../api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api')>()
  return { ...actual, patchLinks: vi.fn().mockResolvedValue([]) }
})

// The manual-edge / promotion / drag-write-back store actions can't be drag-simulated in the
// node test env, so they're exercised directly against a seeded doc (zustand outside React).
function seed(): FlowcanvasDoc {
  return {
    nodes: [
      { id: 'a', type: 'file', file: 'a.md', x: 0, y: 0, width: 100, height: 100, meta: { origin: 'user', frontmatter: { links: ['b.md'] } } },
      { id: 'b', type: 'file', file: 'b.md', x: 200, y: 0, width: 100, height: 100, meta: { origin: 'user', frontmatter: {} } },
    ],
    edges: [
      { id: 'lk:a->b', fromNode: 'a', toNode: 'b', label: 'links', color: '6', toEnd: 'arrow', meta: { origin: 'links' } },
    ],
    flowcanvas: { schemaVersion: '0.1', session: { createdAt: '2026-06-26T00:00:00Z', updatedAt: '2026-06-26T00:00:00Z', revision: 0 }, comments: [] },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  useCanvasStore.setState({ path: 'x.canvas', doc: seed(), bodies: {}, dirty: false, mode: 'select', editingEdgeId: null, readerNodeId: null, readerSize: 'drawer', selectedIds: [] })
})

describe('store / onConnect', () => {
  it('file↔file: mints the deterministic links edge, patches the source file, no label editor (Fix 5)', () => {
    // a and b are both markdown files; b→a is not yet linked (seed has only a→b).
    useCanvasStore.getState().onConnect({ source: 'b', target: 'a', sourceHandle: 'right', targetHandle: 'left' })
    const { doc, dirty, editingEdgeId } = useCanvasStore.getState()
    const minted = doc!.edges.find((e) => e.id === 'lk:b->a')!
    expect(minted).toMatchObject({ fromNode: 'b', toNode: 'a', fromSide: 'right', toSide: 'left', label: 'links', color: '6', toEnd: 'arrow', meta: { origin: 'links' } })
    expect(api.patchLinks).toHaveBeenCalledWith('b.md', { add: ['a.md'] })
    expect(editingEdgeId).toBeNull()  // structural link — no inline label editor
    expect(dirty).toBe(true)
  })

  it('file↔file: an already-linked pair is a no-op (no duplicate edge, no re-patch)', () => {
    useCanvasStore.getState().onConnect({ source: 'a', target: 'b', sourceHandle: 'right', targetHandle: 'left' }) // lk:a->b exists in seed
    expect(useCanvasStore.getState().doc!.edges.filter((e) => e.id === 'lk:a->b')).toHaveLength(1)
    expect(api.patchLinks).not.toHaveBeenCalled()
  })

  it('non-file endpoint: mints an empty-label user edge, opens its inline editor, no file write-back', () => {
    useCanvasStore.setState({ doc: { ...seed(),
      nodes: [
        { id: 't', type: 'text', text: 'note', x: 0, y: 0, width: 100, height: 100, meta: { origin: 'user' } },
        { id: 'a', type: 'file', file: 'a.md', x: 200, y: 0, width: 100, height: 100, meta: { origin: 'user', frontmatter: {} } },
      ],
      edges: [],
    } })
    useCanvasStore.getState().onConnect({ source: 't', target: 'a', sourceHandle: 'right', targetHandle: 'left' })
    const { doc, editingEdgeId } = useCanvasStore.getState()
    const minted = doc!.edges.find((e) => e.fromNode === 't' && e.toNode === 'a')!
    expect(minted).toMatchObject({ fromNode: 't', toNode: 'a', label: '', toEnd: 'arrow', meta: { origin: 'user' } })
    expect(editingEdgeId).toBe(minted.id)  // editor opens on the freshly-minted edge — no native prompt
    expect(api.patchLinks).not.toHaveBeenCalled()
  })

  it('ignores a connection with a missing endpoint', () => {
    useCanvasStore.getState().onConnect({ source: '', target: 'a', sourceHandle: null, targetHandle: null })
    expect(useCanvasStore.getState().doc!.edges).toHaveLength(1) // unchanged
    expect(useCanvasStore.getState().editingEdgeId).toBeNull()
  })

  it('rejects a self-connection (node referencing itself)', () => {
    useCanvasStore.getState().onConnect({ source: 'a', target: 'a', sourceHandle: 'right', targetHandle: 'left' })
    expect(useCanvasStore.getState().doc!.edges).toHaveLength(1) // unchanged — no self-edge minted
    expect(useCanvasStore.getState().editingEdgeId).toBeNull()
    expect(api.patchLinks).not.toHaveBeenCalled()
  })
})

describe('store / removeEdgeWriteback (Fix 5)', () => {
  it('removes a file↔file edge from the doc and strips the link from the source file', () => {
    useCanvasStore.getState().removeEdgeWriteback('lk:a->b') // seed edge a.md -> b.md
    expect(useCanvasStore.getState().doc!.edges.find((e) => e.id === 'lk:a->b')).toBeUndefined()
    expect(api.patchLinks).toHaveBeenCalledWith('a.md', { remove: ['b.md'] })
    expect(useCanvasStore.getState().dirty).toBe(true)
  })

  it('removes a non-file edge from the doc without patching any file', () => {
    useCanvasStore.setState({ doc: { ...seed(),
      nodes: [
        { id: 't', type: 'text', text: 'note', x: 0, y: 0, width: 100, height: 100, meta: { origin: 'user' } },
        { id: 'a', type: 'file', file: 'a.md', x: 200, y: 0, width: 100, height: 100, meta: { origin: 'user', frontmatter: {} } },
      ],
      edges: [{ id: 'e1', fromNode: 't', toNode: 'a', label: 'x', meta: { origin: 'user' } }],
    } })
    useCanvasStore.getState().removeEdgeWriteback('e1')
    expect(useCanvasStore.getState().doc!.edges).toHaveLength(0)
    expect(api.patchLinks).not.toHaveBeenCalled()
  })

  it('is a no-op (stays clean) for an unknown edge id', () => {
    useCanvasStore.setState({ dirty: false })
    useCanvasStore.getState().removeEdgeWriteback('nope')
    expect(useCanvasStore.getState().doc!.edges).toHaveLength(1)
    expect(useCanvasStore.getState().dirty).toBe(false)
    expect(api.patchLinks).not.toHaveBeenCalled()
  })
})

describe('store / setEditingEdge', () => {
  it('opens and clears the inline edge-label editor', () => {
    useCanvasStore.getState().setEditingEdge('lk:a->b')
    expect(useCanvasStore.getState().editingEdgeId).toBe('lk:a->b')
    useCanvasStore.getState().setEditingEdge(null)
    expect(useCanvasStore.getState().editingEdgeId).toBeNull()
  })
})

describe('store / relabelEdge', () => {
  it('promotes a derived links edge to user when relabeled (so reconcile stops rewriting it)', () => {
    useCanvasStore.getState().relabelEdge('lk:a->b', 'realizes')
    const e = useCanvasStore.getState().doc!.edges.find((x) => x.id === 'lk:a->b')!
    expect(e.label).toBe('realizes')
    expect(e.meta?.origin).toBe('user')
    expect(useCanvasStore.getState().dirty).toBe(true)
  })

  it('leaves a user edge origin unchanged on relabel', () => {
    useCanvasStore.setState({ doc: { ...seed(), edges: [{ id: 'e1', fromNode: 'a', toNode: 'b', label: 'x', meta: { origin: 'user' } }] } })
    useCanvasStore.getState().relabelEdge('e1', 'y')
    expect(useCanvasStore.getState().doc!.edges[0].meta?.origin).toBe('user')
  })

  it('leaves an agent edge origin unchanged on relabel (only links is promoted)', () => {
    useCanvasStore.setState({ doc: { ...seed(), edges: [{ id: 'ag1', fromNode: 'a', toNode: 'b', label: 'x', meta: { origin: 'agent' } }] } })
    useCanvasStore.getState().relabelEdge('ag1', 'y')
    expect(useCanvasStore.getState().doc!.edges[0].meta?.origin).toBe('agent')
  })
})

describe('store / setMode', () => {
  it('switches the canvas interaction mode', () => {
    useCanvasStore.getState().setMode('connect')
    expect(useCanvasStore.getState().mode).toBe('connect')
    useCanvasStore.getState().setMode('comment')
    expect(useCanvasStore.getState().mode).toBe('comment')
  })
})

describe('store / addNode', () => {
  it('appends a fully-formed node and marks the doc dirty', () => {
    useCanvasStore.getState().addNode({ id: 'n-new', type: 'text', text: '## Note', x: 20, y: 40, width: 260, height: 140, meta: { origin: 'user' } })
    const nodes = useCanvasStore.getState().doc!.nodes
    expect(nodes).toHaveLength(3)
    expect(nodes.find((n) => n.id === 'n-new')).toMatchObject({ type: 'text', text: '## Note', meta: { origin: 'user' } })
    expect(useCanvasStore.getState().dirty).toBe(true)
  })

  it('is a no-op when no doc is loaded', () => {
    useCanvasStore.setState({ doc: null })
    useCanvasStore.getState().addNode({ id: 'x', type: 'group', x: 0, y: 0, width: 100, height: 100 })
    expect(useCanvasStore.getState().doc).toBeNull()
  })
})

describe('store / setNodePosition', () => {
  it('writes the dropped position back to the doc node and marks dirty', () => {
    useCanvasStore.getState().setNodePosition('a', 42, -17)
    const n = useCanvasStore.getState().doc!.nodes.find((x) => x.id === 'a')!
    expect({ x: n.x, y: n.y }).toEqual({ x: 42, y: -17 })
    expect(useCanvasStore.getState().dirty).toBe(true)
  })
})

describe('store / node editing (text · label · size)', () => {
  it('setNodeText edits a text node only, and marks dirty', () => {
    useCanvasStore.getState().addNode({ id: 'n-t', type: 'text', text: 'old', x: 0, y: 0, width: 200, height: 120, meta: { origin: 'user' } })
    useCanvasStore.setState({ dirty: false })
    useCanvasStore.getState().setNodeText('n-t', 'new body')
    expect(useCanvasStore.getState().doc!.nodes.find((n) => n.id === 'n-t')).toMatchObject({ type: 'text', text: 'new body' })
    expect(useCanvasStore.getState().dirty).toBe(true)
    // no-op on a non-text node (file node 'a' unchanged)
    useCanvasStore.getState().setNodeText('a', 'nope')
    expect(useCanvasStore.getState().doc!.nodes.find((n) => n.id === 'a')).not.toHaveProperty('text')
  })

  it('setNodeLabel edits a group node only', () => {
    useCanvasStore.getState().addNode({ id: 'n-g', type: 'group', label: 'old', x: 0, y: 0, width: 300, height: 200, meta: { origin: 'user', shape: 'ellipse' } })
    useCanvasStore.getState().setNodeLabel('n-g', 'Renamed')
    expect(useCanvasStore.getState().doc!.nodes.find((n) => n.id === 'n-g')).toMatchObject({ type: 'group', label: 'Renamed', meta: { shape: 'ellipse' } })
  })

  it('setNodeShape changes a group node shape, preserving other meta', () => {
    useCanvasStore.getState().addNode({ id: 'n-g2', type: 'group', label: 'x', x: 0, y: 0, width: 300, height: 200, meta: { origin: 'user', shape: 'rectangle' } })
    useCanvasStore.getState().setNodeShape('n-g2', 'diamond')
    expect(useCanvasStore.getState().doc!.nodes.find((n) => n.id === 'n-g2')).toMatchObject({ type: 'group', meta: { origin: 'user', shape: 'diamond' } })
  })

  it('setNodeSize persists a resize and marks dirty', () => {
    useCanvasStore.getState().setNodeSize('a', 500, 400)
    const n = useCanvasStore.getState().doc!.nodes.find((x) => x.id === 'a')!
    expect({ w: n.width, h: n.height }).toEqual({ w: 500, h: 400 })
    expect(useCanvasStore.getState().dirty).toBe(true)
  })
})

describe('store / reader', () => {
  it('openReader / closeReader toggle the reader node id', () => {
    useCanvasStore.getState().openReader('a')
    expect(useCanvasStore.getState().readerNodeId).toBe('a')
    useCanvasStore.getState().closeReader()
    expect(useCanvasStore.getState().readerNodeId).toBeNull()
  })
})

describe('store / comments', () => {
  it('adds a root comment with a sequential badge, null parent, and marks dirty', () => {
    const s = useCanvasStore.getState()
    const id1 = s.addComment({ kind: 'node', nodeId: 'a', offsetX: 0.5, offsetY: 0.9 }, 'reuse file API?', 'human:you')
    const id2 = s.addComment({ kind: 'canvas', x: 10, y: 20 }, 'standalone note', 'human:you')
    const comments = useCanvasStore.getState().doc!.flowcanvas.comments
    expect(comments).toHaveLength(2)
    expect(comments[0]).toMatchObject({ id: id1, parentId: null, badge: 1, resolvedAt: null, author: 'human:you' })
    expect(comments[1]).toMatchObject({ id: id2, parentId: null, badge: 2 })
    expect(useCanvasStore.getState().dirty).toBe(true)
  })

  it('returns "" and is a no-op when no doc is loaded', () => {
    useCanvasStore.setState({ doc: null })
    expect(useCanvasStore.getState().addComment({ kind: 'canvas', x: 0, y: 0 }, 'x', 'human:you')).toBe('')
  })

  it('replies copy the root anchor, set parentId, and carry no badge', () => {
    const rootId = useCanvasStore.getState().addComment({ kind: 'node', nodeId: 'a', offsetX: 0.2, offsetY: 0.2 }, 'root', 'human:you')
    useCanvasStore.getState().replyComment(rootId, 'agent answer', 'agent:opus')
    const reply = useCanvasStore.getState().doc!.flowcanvas.comments.find((c) => c.parentId === rootId)!
    expect(reply).toMatchObject({ parentId: rootId, author: 'agent:opus', text: 'agent answer' })
    expect(reply.anchor).toEqual({ kind: 'node', nodeId: 'a', offsetX: 0.2, offsetY: 0.2 })
    expect(reply.badge).toBeUndefined()
  })

  it('ignores a reply to an unknown root', () => {
    useCanvasStore.getState().replyComment('c-missing', 'x', 'human:you')
    expect(useCanvasStore.getState().doc!.flowcanvas.comments).toHaveLength(0)
  })

  it('resolve stamps resolvedAt on the root only', () => {
    const rootId = useCanvasStore.getState().addComment({ kind: 'canvas', x: 0, y: 0 }, 'root', 'human:you')
    useCanvasStore.getState().resolveComment(rootId)
    const root = useCanvasStore.getState().doc!.flowcanvas.comments.find((c) => c.id === rootId)!
    expect(root.resolvedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('resolve is a no-op (stays clean) for a reply id, unknown id, or an already-resolved root', () => {
    const rootId = useCanvasStore.getState().addComment({ kind: 'canvas', x: 0, y: 0 }, 'root', 'human:you')
    useCanvasStore.getState().replyComment(rootId, 'r', 'human:you')
    const replyId = useCanvasStore.getState().doc!.flowcanvas.comments.find((c) => c.parentId === rootId)!.id
    useCanvasStore.getState().resolveComment(rootId)                       // first resolve → stamps
    const stamped = useCanvasStore.getState().doc!.flowcanvas.comments.find((c) => c.id === rootId)!.resolvedAt
    useCanvasStore.setState({ dirty: false })                             // observe whether the no-ops re-dirty
    useCanvasStore.getState().resolveComment(replyId)                     // a reply id
    useCanvasStore.getState().resolveComment('c-missing')                 // unknown id
    useCanvasStore.getState().resolveComment(rootId)                      // already resolved
    expect(useCanvasStore.getState().dirty).toBe(false)
    expect(useCanvasStore.getState().doc!.flowcanvas.comments.find((c) => c.id === rootId)!.resolvedAt).toBe(stamped)
  })

  it('does not mutate the prior comments array (immutable update)', () => {
    const before = useCanvasStore.getState().doc!.flowcanvas.comments
    useCanvasStore.getState().addComment({ kind: 'canvas', x: 1, y: 1 }, 'x', 'human:you')
    expect(useCanvasStore.getState().doc!.flowcanvas.comments).not.toBe(before)
    expect(before).toHaveLength(0)
  })
})

describe('store / Phase 10 — selection, grouping, bulk layout', () => {
  it('setSelection sets the ids and is equality-guarded against a churning re-set', () => {
    useCanvasStore.getState().setSelection(['a', 'b'])
    expect(useCanvasStore.getState().selectedIds).toEqual(['a', 'b'])
    const ref = useCanvasStore.getState().selectedIds
    useCanvasStore.getState().setSelection(['a', 'b']) // identical → no state churn
    expect(useCanvasStore.getState().selectedIds).toBe(ref) // same reference (no set fired)
    useCanvasStore.getState().setSelection([])
    expect(useCanvasStore.getState().selectedIds).toEqual([])
  })

  it('groupSelection wraps ≥2 nodes: container sized to bounds+PAD, members parented, group selected', () => {
    useCanvasStore.getState().groupSelection(['a', 'b'])
    const { doc, selectedIds, dirty } = useCanvasStore.getState()
    const group = doc!.nodes.find((n) => n.type === 'group')!
    expect(group).toBeTruthy()
    expect(doc!.nodes[0].id).toBe(group.id) // prepended → parent precedes children in doc order
    expect({ x: group.x, y: group.y, width: group.width, height: group.height }).toEqual({ x: -28, y: -28, width: 356, height: 156 })
    expect(doc!.nodes.find((n) => n.id === 'a')!.parentId).toBe(group.id)
    expect(doc!.nodes.find((n) => n.id === 'b')!.parentId).toBe(group.id)
    expect(selectedIds).toEqual([group.id])
    expect(dirty).toBe(true)
  })

  it('groupSelection is a no-op for <2 eligible nodes and for already-grouped nodes', () => {
    useCanvasStore.getState().groupSelection(['a']) // only one
    expect(useCanvasStore.getState().doc!.nodes.some((n) => n.type === 'group')).toBe(false)
    expect(useCanvasStore.getState().dirty).toBe(false)
    // group a+b, then try to group them again — both now carry parentId, so they're ineligible
    useCanvasStore.getState().groupSelection(['a', 'b'])
    const firstCount = useCanvasStore.getState().doc!.nodes.filter((n) => n.type === 'group').length
    useCanvasStore.getState().groupSelection(['a', 'b'])
    expect(useCanvasStore.getState().doc!.nodes.filter((n) => n.type === 'group').length).toBe(firstCount)
  })

  it('ungroup removes the container and clears children parentId, leaving their absolute coords intact', () => {
    useCanvasStore.getState().groupSelection(['a', 'b'])
    const groupId = useCanvasStore.getState().doc!.nodes.find((n) => n.type === 'group')!.id
    useCanvasStore.setState({ dirty: false })
    useCanvasStore.getState().ungroup(groupId)
    const { doc, dirty } = useCanvasStore.getState()
    expect(doc!.nodes.some((n) => n.id === groupId)).toBe(false)
    const a = doc!.nodes.find((n) => n.id === 'a')!
    const b = doc!.nodes.find((n) => n.id === 'b')!
    expect(a.parentId).toBeUndefined()
    expect(b.parentId).toBeUndefined()
    expect({ x: a.x, y: a.y }).toEqual({ x: 0, y: 0 })   // children unmoved
    expect({ x: b.x, y: b.y }).toEqual({ x: 200, y: 0 })
    expect(dirty).toBe(true)
  })

  it('applyLayout writes absolute coords to the named nodes only', () => {
    useCanvasStore.getState().applyLayout({ a: { x: 500, y: 600 } })
    const { doc, dirty } = useCanvasStore.getState()
    expect({ x: doc!.nodes.find((n) => n.id === 'a')!.x, y: doc!.nodes.find((n) => n.id === 'a')!.y }).toEqual({ x: 500, y: 600 })
    expect({ x: doc!.nodes.find((n) => n.id === 'b')!.x, y: doc!.nodes.find((n) => n.id === 'b')!.y }).toEqual({ x: 200, y: 0 }) // untouched
    expect(dirty).toBe(true)
  })
})

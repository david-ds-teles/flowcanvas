import { describe, it, expect, beforeEach } from 'vitest'
import type { FlowcanvasDoc } from './jsoncanvas'
import { useCanvasStore } from './store'

// v2: onConnect / removeEdgeWriteback no longer touch the fs — the Phase-8 links: write-back is retired
// (Decision 4) — so these synchronous store actions are exercised directly with no api stub. Actions that
// hit the server (load/save/submit/accept/discard/addTemplate/navigateRef-add/resyncFile) are integration-
// level; this suite covers the api-free, synchronous store logic, as before.

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
  useCanvasStore.setState({ path: 'x.canvas', doc: seed(), bodies: {}, dirty: false, mode: 'select', editingEdgeId: null, readerNodeId: null, readerSize: 'drawer', selectedIds: [], reviewState: null, focusNodeId: null })
})

describe('store / onConnect (v2 — typed user edges)', () => {
  it('mints a typed user edge (rel:related, empty label) and opens its inline editor — no fs write-back', () => {
    useCanvasStore.getState().onConnect({ source: 'b', target: 'a', sourceHandle: 'right', targetHandle: 'left' })
    const { doc, dirty, editingEdgeId } = useCanvasStore.getState()
    const minted = doc!.edges.find((e) => e.fromNode === 'b' && e.toNode === 'a')!
    expect(minted).toMatchObject({ fromNode: 'b', toNode: 'a', fromSide: 'right', toSide: 'left', label: '', toEnd: 'arrow', meta: { origin: 'user', rel: 'related' } })
    expect(minted.id.startsWith('e-')).toBe(true)   // a minted user edge, not a deterministic lk: id
    expect(editingEdgeId).toBe(minted.id)           // inline label editor opens
    expect(dirty).toBe(true)
  })

  it('mints the same typed user edge for a non-file endpoint (uniform v2 behavior)', () => {
    useCanvasStore.setState({ doc: { ...seed(),
      nodes: [
        { id: 't', type: 'text', text: 'note', x: 0, y: 0, width: 100, height: 100, meta: { origin: 'user' } },
        { id: 'a', type: 'file', file: 'a.md', x: 200, y: 0, width: 100, height: 100, meta: { origin: 'user', frontmatter: {} } },
      ],
      edges: [],
    } })
    useCanvasStore.getState().onConnect({ source: 't', target: 'a', sourceHandle: 'right', targetHandle: 'left' })
    const minted = useCanvasStore.getState().doc!.edges.find((e) => e.fromNode === 't' && e.toNode === 'a')!
    expect(minted).toMatchObject({ label: '', toEnd: 'arrow', meta: { origin: 'user', rel: 'related' } })
    expect(useCanvasStore.getState().editingEdgeId).toBe(minted.id)
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
  })
})

describe('store / removeEdgeWriteback (v2 — no fs write-back)', () => {
  it('removes an edge from the doc and marks dirty', () => {
    useCanvasStore.getState().removeEdgeWriteback('lk:a->b') // seed edge
    expect(useCanvasStore.getState().doc!.edges.find((e) => e.id === 'lk:a->b')).toBeUndefined()
    expect(useCanvasStore.getState().dirty).toBe(true)
  })

  it('is a no-op (stays clean) for an unknown edge id', () => {
    useCanvasStore.setState({ dirty: false })
    useCanvasStore.getState().removeEdgeWriteback('nope')
    expect(useCanvasStore.getState().doc!.edges).toHaveLength(1)
    expect(useCanvasStore.getState().dirty).toBe(false)
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

describe('store / setNodeColor · setNodeFill · setNodeAlign', () => {
  it('setNodeColor sets node.color and marks dirty', () => {
    useCanvasStore.getState().setNodeColor('a', '#ff0000')
    const n = useCanvasStore.getState().doc!.nodes.find((x) => x.id === 'a')!
    expect(n.color).toBe('#ff0000')
    expect(useCanvasStore.getState().dirty).toBe(true)
  })

  it('setNodeColor clears node.color when called with undefined and marks dirty', () => {
    useCanvasStore.getState().setNodeColor('a', '#ff0000')
    useCanvasStore.setState({ dirty: false })
    useCanvasStore.getState().setNodeColor('a', undefined)
    const n = useCanvasStore.getState().doc!.nodes.find((x) => x.id === 'a')!
    expect(n.color).toBeUndefined()
    expect('color' in n).toBe(false)
    expect(useCanvasStore.getState().dirty).toBe(true)
  })

  it('setNodeFill sets meta.fill and marks dirty', () => {
    useCanvasStore.getState().setNodeFill('a', '#00ff00')
    const n = useCanvasStore.getState().doc!.nodes.find((x) => x.id === 'a')!
    expect(n.meta?.fill).toBe('#00ff00')
    expect(useCanvasStore.getState().dirty).toBe(true)
  })

  it('setNodeFill clears meta.fill when called with undefined, preserving other meta', () => {
    useCanvasStore.getState().setNodeFill('a', '#00ff00')
    useCanvasStore.setState({ dirty: false })
    useCanvasStore.getState().setNodeFill('a', undefined)
    const n = useCanvasStore.getState().doc!.nodes.find((x) => x.id === 'a')!
    expect(n.meta?.fill).toBeUndefined()
    expect('fill' in (n.meta ?? {})).toBe(false)
    expect(n.meta?.origin).toBe('user')   // other meta preserved
    expect(useCanvasStore.getState().dirty).toBe(true)
  })

  it('setNodeAlign sets both align and valign and marks dirty', () => {
    useCanvasStore.getState().setNodeAlign('a', 'center', 'middle')
    const n = useCanvasStore.getState().doc!.nodes.find((x) => x.id === 'a')!
    expect(n.meta?.align).toBe('center')
    expect(n.meta?.valign).toBe('middle')
    expect(useCanvasStore.getState().dirty).toBe(true)
  })

  it('setNodeAlign clears align when passed undefined, updates valign independently', () => {
    useCanvasStore.getState().setNodeAlign('a', 'left', 'top')
    useCanvasStore.setState({ dirty: false })
    useCanvasStore.getState().setNodeAlign('a', undefined, 'bottom')
    const n = useCanvasStore.getState().doc!.nodes.find((x) => x.id === 'a')!
    expect('align' in (n.meta ?? {})).toBe(false)
    expect(n.meta?.valign).toBe('bottom')
    expect(useCanvasStore.getState().dirty).toBe(true)
  })

  it('setNodeAlign clears valign when passed undefined, leaves align intact', () => {
    useCanvasStore.getState().setNodeAlign('a', 'right', 'bottom')
    useCanvasStore.setState({ dirty: false })
    useCanvasStore.getState().setNodeAlign('a', 'right', undefined)
    const n = useCanvasStore.getState().doc!.nodes.find((x) => x.id === 'a')!
    expect(n.meta?.align).toBe('right')
    expect('valign' in (n.meta ?? {})).toBe(false)
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

describe('store / v2 — reviewDiff + navigateRef (focus)', () => {
  it('reviewDiff returns null when no round is pending', () => {
    useCanvasStore.setState({ reviewState: null })
    expect(useCanvasStore.getState().reviewDiff()).toBeNull()
  })

  it('reviewDiff diffs the snapshot vs the current doc; added file nodes appear in files', () => {
    const snapshot = seed()                         // nodes a, b ; edge lk:a->b
    const current: FlowcanvasDoc = {
      ...seed(),
      nodes: [...seed().nodes, { id: 'c', type: 'file', file: 'c.md', x: 400, y: 0, width: 100, height: 100, meta: { origin: 'agent' } }],
      edges: [...seed().edges, { id: 'ag-e', fromNode: 'a', toNode: 'c', label: 'calls', toEnd: 'arrow', meta: { origin: 'agent', rel: 'calls' } }],
    }
    useCanvasStore.setState({ doc: current, reviewState: { baseRevision: 0, briefId: 'b', capturedAt: 'now', snapshot, roundGeneratedFiles: [] } })
    const diff = useCanvasStore.getState().reviewDiff()!
    expect(diff.nodes.added).toEqual(['c'])
    expect(diff.edges.added).toEqual(['ag-e'])
    expect(diff.files).toEqual(['c.md'])            // the round's added file-node path
  })

  it('navigateRef focuses an existing target node (select + focusNodeId) without adding a node', () => {
    // seed has a file node b = b.md; the focus branch runs synchronously (no await before set)
    void useCanvasStore.getState().navigateRef('a', { kind: 'link', target: 'b.md', isExternal: false })
    const { selectedIds, focusNodeId, doc } = useCanvasStore.getState()
    expect(selectedIds).toEqual(['b'])
    expect(focusNodeId).toBe('b')
    expect(doc!.nodes).toHaveLength(2)              // no new node added
  })
})

// Resizing a GROUP changes only the group's own box — members keep their absolute position and size
// (the fence must not reflow or rescale its contents). A non-group resize touches only that node.
describe('store / setNodeSize (group resize leaves members untouched)', () => {
  function groupDoc(): FlowcanvasDoc {
    return {
      nodes: [
        { id: 'g', type: 'group', label: 'G', x: 0, y: 0, width: 200, height: 200, meta: { origin: 'user', shape: 'rectangle' } },
        { id: 'c', type: 'file', file: 'c.md', x: 50, y: 50, width: 100, height: 100, parentId: 'g', meta: { origin: 'user', frontmatter: {} } },
        { id: 'loose', type: 'file', file: 'l.md', x: 400, y: 400, width: 100, height: 100, meta: { origin: 'user', frontmatter: {} } },
      ],
      edges: [],
      flowcanvas: { schemaVersion: '0.2', session: { createdAt: '2026-06-26T00:00:00Z', updatedAt: '2026-06-26T00:00:00Z', revision: 0 }, comments: [] },
    }
  }

  it('bottom-right resize (origin fixed) grows the fence and leaves members + non-members untouched', () => {
    useCanvasStore.setState({ doc: groupDoc() })
    useCanvasStore.getState().setNodeSize('g', 400, 400, 0, 0) // origin unchanged
    const n = (id: string) => useCanvasStore.getState().doc!.nodes.find((x) => x.id === id)!
    expect(n('g')).toMatchObject({ x: 0, y: 0, width: 400, height: 400 })
    expect(n('c')).toMatchObject({ x: 50, y: 50, width: 100, height: 100 }) // member unmoved + unscaled
    expect(n('loose')).toMatchObject({ x: 400, y: 400, width: 100, height: 100 }) // untouched
    expect(useCanvasStore.getState().dirty).toBe(true)
  })

  it('top-left resize moves the group origin but the member keeps its absolute coords + size', () => {
    useCanvasStore.setState({ doc: groupDoc() })
    useCanvasStore.getState().setNodeSize('g', 300, 300, -100, -100) // origin → (-100,-100)
    const g = useCanvasStore.getState().doc!.nodes.find((x) => x.id === 'g')!
    const c = useCanvasStore.getState().doc!.nodes.find((x) => x.id === 'c')!
    expect(g).toMatchObject({ x: -100, y: -100, width: 300, height: 300 })
    expect(c).toMatchObject({ x: 50, y: 50, width: 100, height: 100 }) // absolute position + size held
  })

  it('resizing a non-group widget changes only that node (no scaling, no x/y drift)', () => {
    useCanvasStore.setState({ doc: groupDoc() })
    useCanvasStore.getState().setNodeSize('loose', 250, 180) // no x/y passed → position holds
    const n = (id: string) => useCanvasStore.getState().doc!.nodes.find((x) => x.id === id)!
    expect(n('loose')).toMatchObject({ x: 400, y: 400, width: 250, height: 180 })
    expect(n('c')).toMatchObject({ x: 50, y: 50, width: 100, height: 100 }) // group child untouched
  })
})

describe('store / undo + redo (#1 — history middleware)', () => {
  beforeEach(() => {
    useCanvasStore.setState({ doc: seed(), past: [], future: [] }) // setState bypasses tracking → clean history
  })

  it('records a doc-mutating action and exactly restores the prior snapshot on undo', () => {
    const before = useCanvasStore.getState().doc!
    useCanvasStore.getState().removeEdgeWriteback('lk:a->b') // mutates doc → middleware pushes history
    expect(useCanvasStore.getState().past).toHaveLength(1)
    expect(useCanvasStore.getState().doc!.edges).toHaveLength(0)
    useCanvasStore.getState().undo()
    expect(useCanvasStore.getState().doc).toBe(before) // exact pre-edit snapshot
    expect(useCanvasStore.getState().doc!.edges).toHaveLength(1)
    expect(useCanvasStore.getState().past).toHaveLength(0)
    expect(useCanvasStore.getState().future).toHaveLength(1)
  })

  it('redo re-applies an undone change', () => {
    useCanvasStore.getState().removeEdgeWriteback('lk:a->b')
    const mutated = useCanvasStore.getState().doc!
    useCanvasStore.getState().undo()
    useCanvasStore.getState().redo()
    expect(useCanvasStore.getState().doc).toBe(mutated)
    expect(useCanvasStore.getState().doc!.edges).toHaveLength(0)
    expect(useCanvasStore.getState().future).toHaveLength(0)
  })

  it('a fresh edit after undo clears the redo stack', () => {
    useCanvasStore.getState().removeEdgeWriteback('lk:a->b')
    useCanvasStore.getState().undo()
    expect(useCanvasStore.getState().future).toHaveLength(1)
    useCanvasStore.getState().addNode({ id: 'z', type: 'text', text: '', x: 0, y: 0, width: 100, height: 100, meta: { origin: 'user' } })
    expect(useCanvasStore.getState().future).toHaveLength(0) // future invalidated by the new branch
    expect(useCanvasStore.getState().past).toHaveLength(1)
  })

  it('undo and redo are no-ops on empty stacks', () => {
    const d = useCanvasStore.getState().doc
    useCanvasStore.getState().undo()
    expect(useCanvasStore.getState().doc).toBe(d)
    useCanvasStore.getState().redo()
    expect(useCanvasStore.getState().doc).toBe(d)
  })
})

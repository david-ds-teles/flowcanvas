import { describe, it, expect } from 'vitest'
import type { CanvasNode, CanvasEdge, Comment, FlowcanvasDoc } from './jsoncanvas'
import { diffDocs } from './review'

// ─── Minimal fixture builders ───────────────────────────────────────────────

function makeDoc(
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  comments: Comment[] = [],
): FlowcanvasDoc {
  return {
    nodes,
    edges,
    flowcanvas: {
      schemaVersion: '0.2',
      session: { createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', revision: 1 },
      comments,
    },
  }
}

// Reusable node fixtures
const nodeA: CanvasNode = { id: 'n-a', type: 'text', text: 'Alpha', x: 0, y: 0, width: 100, height: 50 }
const nodeB: CanvasNode = { id: 'n-b', type: 'text', text: 'Beta',  x: 0, y: 0, width: 100, height: 50 }
const nodeAUpdated: CanvasNode = { id: 'n-a', type: 'text', text: 'Alpha-changed', x: 0, y: 0, width: 100, height: 50 }

// Reusable edge fixtures
const edgeE1: CanvasEdge = { id: 'e-1', fromNode: 'n-a', toNode: 'n-b' }
const edgeE1Updated: CanvasEdge = { id: 'e-1', fromNode: 'n-a', toNode: 'n-b', label: 'calls' }

// Reusable comment fixture
const comment1: Comment = {
  id: 'c-1',
  anchor: { kind: 'canvas', x: 10, y: 20 },
  parentId: null,
  author: 'human:tester',
  text: 'a review comment',
  createdAt: '2026-01-01T00:00:00Z',
}

// ─── Nodes ──────────────────────────────────────────────────────────────────

describe('diffDocs — nodes', () => {
  it('detects a node added in current but absent from snapshot', () => {
    const snap = makeDoc([nodeA], [])
    const curr = makeDoc([nodeA, nodeB], [])
    const diff = diffDocs(snap, curr)
    expect(diff.nodes.added).toEqual(['n-b'])
    expect(diff.nodes.updated).toEqual([])
    expect(diff.nodes.removed).toEqual([])
  })

  it('detects a node present in snapshot but absent from current', () => {
    const snap = makeDoc([nodeA, nodeB], [])
    const curr = makeDoc([nodeA], [])
    const diff = diffDocs(snap, curr)
    expect(diff.nodes.removed).toEqual(['n-b'])
    expect(diff.nodes.added).toEqual([])
    expect(diff.nodes.updated).toEqual([])
  })

  it('detects a node with changed content as updated', () => {
    const snap = makeDoc([nodeA], [])
    const curr = makeDoc([nodeAUpdated], [])
    const diff = diffDocs(snap, curr)
    expect(diff.nodes.updated).toEqual(['n-a'])
    expect(diff.nodes.added).toEqual([])
    expect(diff.nodes.removed).toEqual([])
  })

  it('does NOT report a node as updated when only meta key order changes (canonical compare)', () => {
    // meta keys in snapshot: origin first, then collapsed
    const nodeWithMeta: CanvasNode = {
      id: 'n-meta', type: 'text', text: 'same', x: 0, y: 0, width: 100, height: 50,
      meta: { origin: 'user', collapsed: false },
    }
    // same node, same values — but meta keys declared in reverse order
    const nodeReordered: CanvasNode = {
      id: 'n-meta', type: 'text', text: 'same', x: 0, y: 0, width: 100, height: 50,
      meta: { collapsed: false, origin: 'user' },
    }
    const snap = makeDoc([nodeWithMeta], [])
    const curr = makeDoc([nodeReordered], [])
    const diff = diffDocs(snap, curr)
    // canonical sort equalises the key order → not an update
    expect(diff.nodes.updated).toEqual([])
    expect(diff.nodes.added).toEqual([])
    expect(diff.nodes.removed).toEqual([])
  })

  it('reports nothing when snapshot and current are identical', () => {
    const snap = makeDoc([nodeA, nodeB], [edgeE1])
    const diff = diffDocs(snap, snap)
    expect(diff.nodes.added).toEqual([])
    expect(diff.nodes.updated).toEqual([])
    expect(diff.nodes.removed).toEqual([])
  })
})

// ─── Edges ──────────────────────────────────────────────────────────────────

describe('diffDocs — edges', () => {
  it('detects an edge added in current but absent from snapshot', () => {
    const snap = makeDoc([nodeA, nodeB], [])
    const curr = makeDoc([nodeA, nodeB], [edgeE1])
    const diff = diffDocs(snap, curr)
    expect(diff.edges.added).toEqual(['e-1'])
    expect(diff.edges.updated).toEqual([])
    expect(diff.edges.removed).toEqual([])
  })

  it('detects an edge with changed content as updated', () => {
    const snap = makeDoc([nodeA, nodeB], [edgeE1])
    const curr = makeDoc([nodeA, nodeB], [edgeE1Updated])
    const diff = diffDocs(snap, curr)
    expect(diff.edges.updated).toEqual(['e-1'])
    expect(diff.edges.added).toEqual([])
    expect(diff.edges.removed).toEqual([])
  })

  it('detects an edge present in snapshot but absent from current', () => {
    const snap = makeDoc([nodeA, nodeB], [edgeE1])
    const curr = makeDoc([nodeA, nodeB], [])
    const diff = diffDocs(snap, curr)
    expect(diff.edges.removed).toEqual(['e-1'])
    expect(diff.edges.added).toEqual([])
    expect(diff.edges.updated).toEqual([])
  })

  it('reports nothing for edges when snapshot and current are identical', () => {
    const snap = makeDoc([nodeA, nodeB], [edgeE1])
    const diff = diffDocs(snap, snap)
    expect(diff.edges.added).toEqual([])
    expect(diff.edges.updated).toEqual([])
    expect(diff.edges.removed).toEqual([])
  })
})

// ─── Comments ───────────────────────────────────────────────────────────────

describe('diffDocs — comments', () => {
  it('detects a comment present in current but not in snapshot as added', () => {
    const snap = makeDoc([nodeA], [], [])
    const curr = makeDoc([nodeA], [], [comment1])
    const diff = diffDocs(snap, curr)
    expect(diff.comments.added).toEqual(['c-1'])
  })

  it('does not report a pre-existing comment as added', () => {
    const snap = makeDoc([nodeA], [], [comment1])
    const curr = makeDoc([nodeA], [], [comment1])
    const diff = diffDocs(snap, curr)
    expect(diff.comments.added).toEqual([])
  })

  it('does not track a removed comment — the diff is added-only (invariant)', () => {
    const snap = makeDoc([nodeA], [], [comment1])
    const curr = makeDoc([nodeA], [], [])
    const diff = diffDocs(snap, curr)
    expect(diff.comments.added).toEqual([])
  })
})

// ─── Files ──────────────────────────────────────────────────────────────────

describe('diffDocs — files', () => {
  it('defaults files to [] when roundGeneratedFiles is omitted', () => {
    const snap = makeDoc([nodeA], [])
    const curr = makeDoc([nodeA], [])
    const diff = diffDocs(snap, curr)
    expect(diff.files).toEqual([])
  })

  it('sets files to the roundGeneratedFiles array when provided', () => {
    const snap = makeDoc([nodeA], [])
    const curr = makeDoc([nodeA], [])
    const files = ['examples/design.nodes/cart.md', 'examples/design.nodes/pay.md']
    const diff = diffDocs(snap, curr, files)
    expect(diff.files).toEqual(files)
  })

  it('files is the exact same array reference as roundGeneratedFiles', () => {
    const snap = makeDoc([nodeA], [])
    const curr = makeDoc([nodeA], [])
    const files: string[] = []
    const diff = diffDocs(snap, curr, files)
    expect(diff.files).toBe(files)
  })
})

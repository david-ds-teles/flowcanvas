import { create } from 'zustand'
import type { Connection } from '@xyflow/react'
import type { FlowcanvasDoc, CanvasNode, CanvasEdge, Comment, CommentAnchor } from './jsoncanvas'
import { isFileNode, nodeKind } from './jsoncanvas'
import { deriveLinkEdges, reconcileEdges } from './edges'
import { buildBrief as buildBriefPure, applyResponse as applyResponsePure } from './brief'
import type { AgentResponse, DesignBrief, MergeReport } from './brief'
import * as api from '../api'

/** Canvas interaction mode — drives the toolbar's mode group and the comment layer's click capture. */
export type CanvasMode = 'select' | 'connect' | 'comment'

interface CanvasState {
  path: string | null
  doc: FlowcanvasDoc | null
  bodies: Record<string, string>     // transient: nodeId → resolved markdown body (not persisted)
  dirty: boolean
  mode: CanvasMode                   // UI-only: select / connect / comment (transient, never persisted)
  editingEdgeId: string | null       // UI-only: edge whose label is being edited inline (transient)
  readerNodeId: string | null        // UI-only: markdown node open in the reader drawer (transient)
  load: (path: string) => Promise<void>
  save: () => Promise<void>
  bodyFor: (id: string) => string | undefined
  toggleCollapsed: (id: string) => void
  onConnect: (conn: Connection) => void
  setNodePosition: (id: string, x: number, y: number) => void
  setNodeSize: (id: string, width: number, height: number) => void
  setNodeText: (id: string, text: string) => void
  setNodeLabel: (id: string, label: string) => void
  relabelEdge: (id: string, label: string) => void
  setEditingEdge: (id: string | null) => void
  setMode: (mode: CanvasMode) => void
  openReader: (id: string) => void
  closeReader: () => void
  addNode: (node: CanvasNode) => void
  addFileNode: (path: string, x: number, y: number) => Promise<void>
  addComment: (anchor: CommentAnchor, text: string, author: string) => string
  replyComment: (rootId: string, text: string, author: string) => void
  resolveComment: (rootId: string) => void
  buildBrief: () => Promise<DesignBrief>
  applyResponse: (resp: AgentResponse) => Promise<MergeReport>
}

/** Short random suffix for a manually-drawn edge id. */
const edgeId = () => `e-${crypto.randomUUID().slice(0, 8)}`
/** Short random suffix for a comment id (mirrors `edgeId`; keeps `lib/canvas/*` dependency-light). */
const commentId = () => `c-${crypto.randomUUID().slice(0, 8)}`
/** Short random suffix for a user-created node id. */
const nodeId = () => `n-${crypto.randomUUID().slice(0, 8)}`

/** Hydrate file nodes' markdown frontmatter into `meta` + bodies map; returns the next nodes + bodies. */
async function hydrateFiles(nodes: CanvasNode[], bodies: Record<string, string>) {
  const files = nodes.filter(isFileNode)
  const resolved = await api.resolvePaths(files.map((n) => n.file))
  const byPath = new Map(resolved.map((r) => [r.path, r]))
  const next = { ...bodies }
  const out = nodes.map((n) => {
    if (!isFileNode(n)) return n
    const r = byPath.get(n.file)
    if (nodeKind(n) === 'markdown' && r) {
      if (r.body) next[n.id] = r.body
      return { ...n, meta: { ...n.meta, frontmatter: r.frontmatter } }
    }
    return n
  })
  return { nodes: out, bodies: next }
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  path: null, doc: null, bodies: {}, dirty: false, mode: 'select', editingEdgeId: null, readerNodeId: null,
  bodyFor: (id) => get().bodies[id],
  async load(path) {
    const doc = await api.getCanvas(path)
    const { nodes, bodies } = await hydrateFiles(doc.nodes, {})
    // Self-heal the links graph against the freshly-resolved frontmatter; user/agent edges survive.
    const edges = reconcileEdges(doc.edges, deriveLinkEdges(nodes))
    set({ path, doc: { ...doc, nodes, edges }, bodies, dirty: false })
  },
  async save() {
    const { path, doc } = get()
    if (!path || !doc) return
    doc.flowcanvas.session.revision = await api.saveCanvas(path, doc)
    set({ dirty: false })
  },
  toggleCollapsed(id: string) {
    const { doc } = get()
    if (!doc) return
    const nodes = doc.nodes.map((n) =>
      n.id === id ? { ...n, meta: { ...n.meta, collapsed: !n.meta?.collapsed } } : n
    )
    set({ doc: { ...doc, nodes }, dirty: true })
  },
  // Mint a user edge with an empty label and open the inline label editor on it (no native prompt —
  // the label is typed in-canvas via the edge's EdgeLabelRenderer input). Self-connections are
  // rejected (a node referencing itself is never meaningful here, and deriveLinkEdges drops them too).
  onConnect(conn: Connection) {
    const { doc } = get()
    if (!doc || !conn.source || !conn.target || conn.source === conn.target) return
    const id = edgeId()
    const edge: CanvasEdge = {
      id, fromNode: conn.source, toNode: conn.target,
      fromSide: conn.sourceHandle as CanvasEdge['fromSide'],
      toSide: conn.targetHandle as CanvasEdge['toSide'],
      label: '', toEnd: 'arrow', meta: { origin: 'user' },
    }
    set({ doc: { ...doc, edges: [...doc.edges, edge] }, dirty: true, editingEdgeId: id })
  },
  setNodePosition(id: string, x: number, y: number) {
    const { doc } = get()
    if (!doc) return
    const nodes = doc.nodes.map((n) => (n.id === id ? { ...n, x, y } : n))
    set({ doc: { ...doc, nodes }, dirty: true })
  },
  // Persist a resize (group nodes) committed by React Flow's NodeResizer on resize-end.
  setNodeSize(id: string, width: number, height: number) {
    const { doc } = get()
    if (!doc) return
    const nodes = doc.nodes.map((n) => (n.id === id ? { ...n, width, height } : n))
    set({ doc: { ...doc, nodes }, dirty: true })
  },
  // Edit a note's markdown body in place (double-click → inline textarea). No-op for non-text nodes.
  setNodeText(id: string, text: string) {
    const { doc } = get()
    if (!doc) return
    const nodes = doc.nodes.map((n) => (n.id === id && n.type === 'text' ? { ...n, text } : n))
    set({ doc: { ...doc, nodes }, dirty: true })
  },
  // Edit a group's label in place. No-op for non-group nodes.
  setNodeLabel(id: string, label: string) {
    const { doc } = get()
    if (!doc) return
    const nodes = doc.nodes.map((n) => (n.id === id && n.type === 'group' ? { ...n, label } : n))
    set({ doc: { ...doc, nodes }, dirty: true })
  },
  relabelEdge(id: string, label: string) {
    const { doc } = get()
    if (!doc) return
    // Relabeling a derived edge promotes it to `user` so reconcile no longer rewrites it.
    const edges = doc.edges.map((e) =>
      e.id === id
        ? { ...e, label, meta: { ...e.meta, origin: e.meta?.origin === 'links' ? 'user' : e.meta?.origin } }
        : e
    )
    set({ doc: { ...doc, edges }, dirty: true })
  },
  setEditingEdge(id: string | null) {
    set({ editingEdgeId: id })
  },
  setMode(mode: CanvasMode) {
    set({ mode })
  },
  openReader(id: string) {
    set({ readerNodeId: id })
  },
  closeReader() {
    set({ readerNodeId: null })
  },
  // Append a fully-formed text / link / group node (the caller mints the id + position). Markdown and
  // image nodes go through `addFileNode` instead, which also resolves their content + re-derives edges.
  addNode(node: CanvasNode) {
    const { doc } = get()
    if (!doc) return
    set({ doc: { ...doc, nodes: [...doc.nodes, node] }, dirty: true })
  },
  // Add a markdown/image file node (from the add-node picker, an upload, or a drop). Resolves the new
  // file's frontmatter/body and re-derives the links graph so a markdown file's `links:` edges appear.
  async addFileNode(path: string, x: number, y: number) {
    const { doc, bodies } = get()
    if (!doc) return
    const probe: CanvasNode = { id: nodeId(), type: 'file', file: path, x, y, width: 380, height: 320, meta: { origin: 'user' } }
    const isImage = nodeKind(probe) === 'image'
    const node: CanvasNode = isImage ? { ...probe, height: 260 } : probe
    const { nodes, bodies: nextBodies } = await hydrateFiles([...doc.nodes, node], bodies)
    const edges = reconcileEdges(doc.edges, deriveLinkEdges(nodes))
    set({ doc: { ...doc, nodes, edges }, bodies: nextBodies, dirty: true })
  },
  // Immutable append of a root comment. Badge is the next sequential number across existing roots
  // (replies — parentId set — never carry one). Returns the new id so the caller can open its thread.
  addComment(anchor: CommentAnchor, text: string, author: string) {
    const { doc } = get()
    if (!doc) return ''
    const badge = doc.flowcanvas.comments.filter((c) => c.parentId === null).length + 1
    const c: Comment = {
      id: commentId(), anchor, parentId: null, author, text,
      createdAt: new Date().toISOString(), resolvedAt: null, badge,
    }
    set({
      doc: { ...doc, flowcanvas: { ...doc.flowcanvas, comments: [...doc.flowcanvas.comments, c] } },
      dirty: true,
    })
    return c.id
  },
  // A reply copies the root's anchor (so the brief can address the whole thread by node) and carries no badge.
  replyComment(rootId: string, text: string, author: string) {
    const { doc } = get()
    if (!doc) return
    const root = doc.flowcanvas.comments.find((c) => c.id === rootId)
    if (!root) return
    const reply: Comment = {
      id: commentId(), anchor: root.anchor, parentId: rootId, author, text,
      createdAt: new Date().toISOString(),
    }
    set({
      doc: { ...doc, flowcanvas: { ...doc.flowcanvas, comments: [...doc.flowcanvas.comments, reply] } },
      dirty: true,
    })
  },
  // Stamp the root resolved. True no-op (stays clean) for an unknown id, a reply id, or an
  // already-resolved root — so a stray call never spuriously dirties the doc.
  resolveComment(rootId: string) {
    const { doc } = get()
    if (!doc) return
    const target = doc.flowcanvas.comments.find((c) => c.id === rootId && c.parentId === null)
    if (!target || target.resolvedAt) return
    const comments = doc.flowcanvas.comments.map((c) =>
      c === target ? { ...c, resolvedAt: new Date().toISOString() } : c
    )
    set({ doc: { ...doc, flowcanvas: { ...doc.flowcanvas, comments } }, dirty: true })
  },
  // Export: resolve every markdown node fresh, build the self-contained brief, and stamp its id into
  // `session.lastBriefId` (the concurrency token the next import checks). Persisting is the user's Save.
  async buildBrief() {
    const { doc, path } = get()
    if (!doc || !path) throw new Error('no board loaded')
    const files = doc.nodes.filter(isFileNode)
    const resolvedArr = await api.resolvePaths(files.map((n) => n.file))
    const resolved = new Map(resolvedArr.map((r) => [r.path, { frontmatter: r.frontmatter, body: r.body, truncated: r.truncated }]))
    const briefId = `brief-${crypto.randomUUID().slice(0, 8)}`
    const brief = buildBriefPure(doc, path, resolved, briefId, new Date().toISOString())
    set({
      doc: { ...doc, flowcanvas: { ...doc.flowcanvas, session: { ...doc.flowcanvas.session, lastBriefId: briefId } } },
      dirty: true,
    })
    return brief
  },
  // Import: run the pure 8-step merge, then the impure tail — (2) write generated files BEFORE render so
  // new file nodes resolve to real content, (4) re-resolve + re-derive the links graph, then persist.
  async applyResponse(resp: AgentResponse) {
    const { doc, bodies } = get()
    if (!doc) throw new Error('no board loaded')
    const { next, report } = applyResponsePure(doc, resp, (p) => p + crypto.randomUUID().slice(0, 8), new Date().toISOString())
    for (const g of resp.generatedFiles ?? []) await api.writeFileApi(g.path, g.content)   // (2)
    const { nodes, bodies: nextBodies } = await hydrateFiles(next.nodes, bodies)            // (4)
    const edges = reconcileEdges(next.edges, deriveLinkEdges(nodes))
    set({ doc: { ...next, nodes, edges }, bodies: nextBodies, dirty: true })
    await get().save()
    return report
  },
}))

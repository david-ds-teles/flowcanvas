import { create } from 'zustand'
import type { Connection } from '@xyflow/react'
import type { FlowcanvasDoc, CanvasNode, CanvasEdge, Comment, CommentAnchor, NodeShape } from './jsoncanvas'
import { isFileNode, nodeKind } from './jsoncanvas'
import { deriveLinkEdges, reconcileEdges } from './edges'
import { buildBrief as buildBriefPure, applyResponse as applyResponsePure } from './brief'
import type { AgentResponse, DesignBrief, MergeReport } from './brief'
import * as api from '../api'

/** Canvas interaction mode — drives the toolbar's mode group and the comment layer's click capture. */
export type CanvasMode = 'select' | 'connect' | 'comment'

/** Reader drawer width preset — drawer (440px) · half (50vw) · full (100vw). */
export type ReaderSize = 'drawer' | 'half' | 'full'

interface CanvasState {
  path: string | null
  doc: FlowcanvasDoc | null
  bodies: Record<string, string>     // transient: nodeId → resolved markdown body (not persisted)
  dirty: boolean
  mode: CanvasMode                   // UI-only: select / connect / comment (transient, never persisted)
  editingEdgeId: string | null       // UI-only: edge whose label is being edited inline (transient)
  readerNodeId: string | null        // UI-only: markdown node open in the reader drawer (transient)
  readerSize: ReaderSize             // UI-only: reader width preset (transient, never persisted)
  selectedIds: string[]              // UI-only: ids in the current multi-selection (transient, never persisted)
  load: (path: string) => Promise<void>
  save: () => Promise<void>
  bodyFor: (id: string) => string | undefined
  toggleCollapsed: (id: string) => void
  onConnect: (conn: Connection) => void
  removeEdgeWriteback: (id: string) => void
  setSelection: (ids: string[]) => void                                            // Phase 10: multi-select
  groupSelection: (ids: string[]) => void                                          // Phase 10: wrap ≥2 nodes in a container
  ungroup: (groupId: string) => void                                               // Phase 10: dissolve a container, keep children
  applyLayout: (positions: Record<string, { x: number; y: number }>) => void       // Phase 10: bulk absolute-coord write (ELK + group drag)
  saveAs: (path: string) => Promise<void>                                          // Phase 10: write to a new path + adopt it
  openBoard: (path: string) => Promise<void>                                       // Phase 10: switch the active board
  setNodePosition: (id: string, x: number, y: number) => void
  setNodeSize: (id: string, width: number, height: number) => void
  setNodeText: (id: string, text: string) => void
  setNodeLabel: (id: string, label: string) => void
  setNodeShape: (id: string, shape: NodeShape) => void
  relabelEdge: (id: string, label: string) => void
  setEditingEdge: (id: string | null) => void
  setMode: (mode: CanvasMode) => void
  openReader: (id: string) => void
  closeReader: () => void
  setReaderSize: (size: ReaderSize) => void
  maximizeReader: (id: string) => void
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

/** The backing file of a node id, or null when the node is absent / not file-backed. Used by the
 *  bidirectional `links:` write-back to decide whether an edge is a structural file↔file link. */
const fileOf = (doc: FlowcanvasDoc, id: string): string | null => {
  const n = doc.nodes.find((x) => x.id === id)
  return n && isFileNode(n) ? n.file : null
}

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
  path: null, doc: null, bodies: {}, dirty: false, mode: 'select', editingEdgeId: null, readerNodeId: null, readerSize: 'drawer', selectedIds: [],
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
  // Two cases (Phase 8, Fix 5 — bidirectional `links:`):
  //  • file↔file (or file↔image): a STRUCTURAL link → mint the deterministic `lk:` edge (origin
  //    'links', so deriveLinkEdges re-derives the identical edge on the next load — idempotent) AND
  //    patch the source `.md`'s `links:` frontmatter so the file and the canvas agree. No label editor.
  //  • otherwise: a canvas-only `user` edge with an empty label + the inline editor (no native prompt).
  // Self-connections are rejected (a node referencing itself is never meaningful; deriveLinkEdges
  // drops them too).
  onConnect(conn: Connection) {
    const { doc } = get()
    if (!doc || !conn.source || !conn.target || conn.source === conn.target) return
    const src = fileOf(doc, conn.source)
    const tgt = fileOf(doc, conn.target)
    if (src && tgt) {
      const id = `lk:${conn.source}->${conn.target}`
      if (doc.edges.some((e) => e.id === id)) return            // already linked — no duplicate, no re-patch
      const edge: CanvasEdge = {
        id, fromNode: conn.source, toNode: conn.target,
        fromSide: conn.sourceHandle as CanvasEdge['fromSide'],
        toSide: conn.targetHandle as CanvasEdge['toSide'],
        label: 'links', color: '6', toEnd: 'arrow', meta: { origin: 'links' },
      }
      set({ doc: { ...doc, edges: [...doc.edges, edge] }, dirty: true })
      // fire-and-forget; reload self-heals. Surface failures so a write-back desync isn't silent.
      void api.patchLinks(src, { add: [tgt] }).catch((e) => console.error('patchLinks(add) failed', e))
      return
    }
    const id = edgeId()
    const edge: CanvasEdge = {
      id, fromNode: conn.source, toNode: conn.target,
      fromSide: conn.sourceHandle as CanvasEdge['fromSide'],
      toSide: conn.targetHandle as CanvasEdge['toSide'],
      label: '', toEnd: 'arrow', meta: { origin: 'user' },
    }
    set({ doc: { ...doc, edges: [...doc.edges, edge] }, dirty: true, editingEdgeId: id })
  },
  // Remove an edge from the doc (so the deletion is durable — it neither resurrects on the next
  // controlled-state sync nor survives a save) and, when it joined two file nodes, strip the target
  // from the source `.md`'s `links:`. Called per 'remove' change from the shell's onEdgesChange.
  removeEdgeWriteback(id: string) {
    const { doc } = get()
    if (!doc) return
    const e = doc.edges.find((x) => x.id === id)
    if (!e) return
    const src = fileOf(doc, e.fromNode)
    const tgt = fileOf(doc, e.toNode)
    set({ doc: { ...doc, edges: doc.edges.filter((x) => x.id !== id) }, dirty: true })
    if (src && tgt) void api.patchLinks(src, { remove: [tgt] }).catch((e) => console.error('patchLinks(remove) failed', e))
  },
  // ─── Phase 10: multi-select, true group containers, bulk layout, board file I/O ───
  // Selection is UI-only (never persisted, never dirties). Equality-guarded so React Flow's
  // onSelectionChange (which fires on every render) doesn't churn subscribers.
  setSelection(ids: string[]) {
    const cur = get().selectedIds
    if (cur.length === ids.length && cur.every((id, i) => id === ids[i])) return
    set({ selectedIds: ids })
  },
  // Wrap ≥2 ungrouped, non-group nodes in a new container. The doc stays ABSOLUTE, so grouping is a pure
  // membership change (set parentId) — no coordinate math. The group is sized to the members' bounds + PAD
  // and prepended so it precedes its children in doc order (parent-before-child).
  groupSelection(ids: string[]) {
    const { doc } = get()
    if (!doc) return
    const idset = new Set(ids)
    const members = doc.nodes.filter((n) => idset.has(n.id) && n.type !== 'group' && !n.parentId)
    if (members.length < 2) return
    const PAD = 28
    const minX = Math.min(...members.map((n) => n.x))
    const minY = Math.min(...members.map((n) => n.y))
    const maxX = Math.max(...members.map((n) => n.x + n.width))
    const maxY = Math.max(...members.map((n) => n.y + n.height))
    const group: CanvasNode = {
      id: nodeId(), type: 'group', label: '',
      x: minX - PAD, y: minY - PAD, width: maxX - minX + 2 * PAD, height: maxY - minY + 2 * PAD,
      meta: { origin: 'user', shape: 'rectangle' },
    }
    const m = new Set(members.map((n) => n.id))
    const nodes = doc.nodes.map((n) => (m.has(n.id) ? { ...n, parentId: group.id } : n))
    set({ doc: { ...doc, nodes: [group, ...nodes] }, dirty: true, selectedIds: [group.id] })
  },
  // Dissolve a container: drop the group node and clear its children's parentId. Children already hold
  // absolute coords, so they stay exactly where they were.
  ungroup(groupId: string) {
    const { doc } = get()
    if (!doc) return
    const nodes = doc.nodes
      .filter((n) => n.id !== groupId)
      .map((n) => {
        if (n.parentId !== groupId) return n
        const next: CanvasNode = { ...n }
        delete (next as { parentId?: string }).parentId
        return next
      })
    set({ doc: { ...doc, nodes }, dirty: true })
  },
  // Bulk absolute-position write — shared by the ELK "Re-organize" result and group-aware drag write-back,
  // so a multi-node move is one re-render + one dirty flip.
  applyLayout(positions: Record<string, { x: number; y: number }>) {
    const { doc } = get()
    if (!doc) return
    const nodes = doc.nodes.map((n) => {
      const p = positions[n.id]
      return p ? { ...n, x: p.x, y: p.y } : n
    })
    set({ doc: { ...doc, nodes }, dirty: true })
  },
  // Save the current board to a NEW path and adopt it: write, sync the revision, clear dirty, and update
  // the URL `?path=` in place (no reload) so a refresh reopens the new board.
  async saveAs(path: string) {
    const { doc } = get()
    if (!doc) return
    doc.flowcanvas.session.revision = await api.saveCanvas(path, doc)
    set({ path, dirty: false })
    if (typeof window !== 'undefined') {
      const u = new URL(window.location.href)
      u.searchParams.set('path', path)
      window.history.replaceState(null, '', u.toString())
    }
  },
  // Switch the active board (the caller — BoardDialog — owns the unsaved-changes guard): load the doc,
  // clear selection, and update the URL `?path=` so a refresh stays on it.
  async openBoard(path: string) {
    await get().load(path)
    set({ selectedIds: [] })
    if (typeof window !== 'undefined') {
      const u = new URL(window.location.href)
      u.searchParams.set('path', path)
      window.history.replaceState(null, '', u.toString())
    }
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
  // Change a group node's drawn shape (rectangle/ellipse/diamond) in place.
  setNodeShape(id: string, shape: NodeShape) {
    const { doc } = get()
    if (!doc) return
    const nodes = doc.nodes.map((n) => (n.id === id && n.type === 'group' ? { ...n, meta: { ...n.meta, shape } } : n))
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
  // Set the reader width preset (drawer/half/full) — bound to the reader header's segmented control.
  setReaderSize(size: ReaderSize) {
    set({ readerSize: size })
  },
  // Open the reader for a node at FULL width (the markdown node's ⤢ "maximize" button — Fix 3).
  maximizeReader(id: string) {
    set({ readerNodeId: id, readerSize: 'full' })
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

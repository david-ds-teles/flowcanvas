import { create } from 'zustand'
import type { Connection } from '@xyflow/react'
import type { FlowcanvasDoc, CanvasNode, CanvasEdge, Comment, CommentAnchor, NodeShape, RelationshipType } from './jsoncanvas'
import { isFileNode, nodeKind, REL_LABELS } from './jsoncanvas'
import { deriveLinkEdges } from './edges'
import { buildBrief as buildBriefPure, applyResponse as applyResponsePure } from './brief'
import type { AgentResponse, DesignBrief, MergeReport } from './brief'
import { diffDocs } from './review'
import type { ReviewState, ReviewDiff } from './review'
import { buildSourceIndex, normPath } from './spine'
import { migrateDoc } from './migrate'
import { parseFlowcanvasDoc } from './validate'
import { instantiateTemplate } from './templates'
import type { CanvasTemplate } from './templates'
import type { DocRef } from './refs'
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
  reviewState: ReviewState | null    // v2: the submit-time snapshot loaded when a round is pending (transient)
  focusNodeId: string | null         // v2: navigateRef target the shell should setCenter on (transient, UI consumes + clears)
  // 004 Phase 4 — living core-markdown spine + bidirectional link highlight (all transient, never persisted)
  coreDocBody: string | null         // resolved markdown of session.coreDocPath (the spine render source)
  coreDocDraft: string | null        // in-progress edit buffer for the spine
  coreDocDirty: boolean              // coreDocDraft !== coreDocBody
  spineHighlightAnchor: string | null  // component-selected → spine scrolls/pulses this anchor
  linkedNodeIds: string[]            // spine-section-selected → canvas pulses these node ids
  load: (path: string) => Promise<void>
  save: () => Promise<void>
  bodyFor: (id: string) => string | undefined
  toggleCollapsed: (id: string) => void
  onConnect: (conn: Connection) => void
  removeEdgeWriteback: (id: string) => void
  removeNode: (id: string) => void                                                 // delete a node + its edges/comments (orphan group children)
  newBoard: () => Promise<void>                                                    // create + adopt a fresh empty board
  clearBoard: () => void                                                           // wipe the current board's nodes/edges/comments (UI confirms)
  setSelection: (ids: string[]) => void                                            // Phase 10: multi-select
  groupSelection: (ids: string[]) => void                                          // Phase 10: wrap ≥2 nodes in a container
  ungroup: (groupId: string) => void                                               // Phase 10: dissolve a container, keep children
  applyLayout: (positions: Record<string, { x: number; y: number }>) => void       // Phase 10: bulk absolute-coord write (ELK + group drag)
  saveAs: (path: string) => Promise<void>                                          // Phase 10: write to a new path + adopt it
  openBoard: (path: string) => Promise<void>                                       // Phase 10: switch the active board
  setNodePosition: (id: string, x: number, y: number) => void
  setNodeSize: (id: string, width: number, height: number, x?: number, y?: number) => void
  setNodeText: (id: string, text: string) => void
  setNodeLabel: (id: string, label: string) => void
  setNodeShape: (id: string, shape: NodeShape) => void
  relabelEdge: (id: string, label: string) => void
  setEdgeRel: (id: string, rel: RelationshipType) => void          // v2: typed-edge rel picker (Phase 6)
  setEditingEdge: (id: string | null) => void
  setMode: (mode: CanvasMode) => void
  openReader: (id: string) => void
  closeReader: () => void
  setReaderSize: (size: ReaderSize) => void
  maximizeReader: (id: string) => void
  addNode: (node: CanvasNode) => void
  addFileNode: (path: string, x: number, y: number) => Promise<string>   // returns the new node id (v2: navigateRef edges to it)
  addComment: (anchor: CommentAnchor, text: string, author: string) => string
  replyComment: (rootId: string, text: string, author: string) => void
  resolveComment: (rootId: string) => void
  buildBrief: () => Promise<DesignBrief>
  applyResponse: (resp: AgentResponse) => Promise<MergeReport>
  // ─── v2 — agent round-trip, change-review, references, templates, reconcile ───
  submitToAgent: (intent: string, scopeNodeIds?: string[]) => Promise<void> // save + snapshot + active pointer (Decision 5/6); scopeNodeIds ⇒ scope-aware brief
  reviewDiff: () => ReviewDiff | null                              // diffDocs(snapshot, doc) when a round is pending (Decision 6)
  acceptRound: () => Promise<void>                                 // keep the doc, clear the review window (Decision 6)
  discardRound: () => Promise<void>                                // restore the snapshot, delete the round's files (Decision 6)
  clearFocus: () => void                                           // shell calls this after centering on focusNodeId
  focusNode: (id: string) => void                                 // select + request a viewport center (structure rail)
  navigateRef: (sourceNodeId: string, ref: DocRef) => Promise<void> // focus-or-add + references edge (Decision 9)
  addTemplate: (t: CanvasTemplate, x: number, y: number) => Promise<void>  // instantiate a template fragment (Decision 8)
  resyncFile: (path: string) => Promise<void>                     // re-derive one file's links edges + refresh its frontmatter (Decision 10)
  // ─── 004 Phase 4 — living core spine + bidirectional linking (Decisions 3/4) ───
  setCoreDoc: (path: string) => Promise<void>                     // stamp session.coreDocPath + resolve body → coreDocBody/Draft (spine switcher, Q4)
  editCoreDoc: (markdown: string) => void                         // coreDocDraft = markdown; coreDocDirty = (markdown !== coreDocBody)
  submitCoreDocEdit: (summary: string) => Promise<void>           // GUARD pendingReview; writeFileApi(coreDocPath, draft) → submitToAgent(summary)
  highlightSpineSection: (anchor: string) => void                 // component → spine: set spineHighlightAnchor
  highlightComponents: (anchor: string) => void                   // spine → canvas: linkedNodeIds = buildSourceIndex(...).get(anchor)
  clearLinkHighlight: () => void                                  // clear both highlight channels
  // ─── 004 Phase 5 — frictionless import (Decision 5) ───
  importDoc: (doc: FlowcanvasDoc, path?: string) => Promise<void>  // migrateDoc → write → adopt (like openBoard)
  importCanvasFile: (file: File) => Promise<void>                 // file.text() → parseFlowcanvasDoc → importDoc
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

/** Primitive-returning selector (Decision 3): count of UNRESOLVED ROOT comments anchored to node `id`.
 *  Returns a `number` (not an object) so per-node `<CommentBadge>` subscriptions stay churn-free — a map
 *  selector would hand back a fresh object each render and thrash the memoized node components. */
export const selectNodeCommentCount =
  (id: string) =>
  (s: CanvasState): number =>
    s.doc?.flowcanvas.comments.reduce(
      (n, c) =>
        n + (c.parentId === null && !c.resolvedAt && c.anchor.kind === 'node' && c.anchor.nodeId === id ? 1 : 0),
      0,
    ) ?? 0

export const useCanvasStore = create<CanvasState>((set, get) => ({
  path: null, doc: null, bodies: {}, dirty: false, mode: 'select', editingEdgeId: null, readerNodeId: null, readerSize: 'drawer', selectedIds: [], reviewState: null, focusNodeId: null,
  coreDocBody: null, coreDocDraft: null, coreDocDirty: false, spineHighlightAnchor: null, linkedNodeIds: [],
  bodyFor: (id) => get().bodies[id],
  // Canvas-authoritative load (Decision 4): doc.edges from disk are truth — no per-load reconcile.
  // One-time 0.1→0.2 migration bakes previously-live-only links: edges into persisted edges, then bumps
  // the version. Writes the active-board pointer (Decision 5) and loads the review snapshot when a round
  // is pending (Decision 6).
  async load(path) {
    const doc = await api.getCanvas(path)
    const { nodes, bodies } = await hydrateFiles(doc.nodes, {})
    // 004 Phase 5 — one shared ladder for load + import: migrateDoc 0.1→0.2 (bake derived links: edges,
    // reading the now-hydrated frontmatter) → 0.3 (no-op version bump). Boards persist '0.3'.
    const { doc: next, migrated } = migrateDoc({ ...doc, nodes })
    let reviewState: ReviewState | null = null
    if (next.flowcanvas.session.pendingReview) reviewState = await api.getReview(path).catch(() => null)
    // 004 — resolve the living core-doc body so the spine renders immediately when coreDocPath is set.
    const coreDocPath = next.flowcanvas.session.coreDocPath
    const coreBody = coreDocPath ? await api.readFileApi(coreDocPath).catch(() => null) : null
    set({
      path, doc: next, bodies, dirty: false, reviewState, focusNodeId: null, selectedIds: [],
      coreDocBody: coreBody, coreDocDraft: coreBody, coreDocDirty: false, spineHighlightAnchor: null, linkedNodeIds: [],
    })
    if (migrated) await get().save()                              // persist the migrateDoc upgrade (0.1→0.2 bake and/or 0.2→0.3 bump) once
    const rev = get().doc?.flowcanvas.session.revision ?? next.flowcanvas.session.revision
    void api.putActive({ canvasRef: path, baseRevision: rev, intent: next.flowcanvas.session.intent ?? '' })
      .catch((e) => console.error('putActive failed', e))
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
  // v2 (Decisions 1/4): the canvas is the authoritative relation graph — every drawn connection becomes
  // a typed `user` edge (rel:'related', empty label, inline editor). The Phase-8 file↔file `links:`
  // write-back is retired; structural relationships are typed edges on the board, not frontmatter.
  // Self-connections are rejected.
  onConnect(conn: Connection) {
    const { doc } = get()
    if (!doc || !conn.source || !conn.target || conn.source === conn.target) return
    const id = edgeId()
    const edge: CanvasEdge = {
      id, fromNode: conn.source, toNode: conn.target,
      fromSide: conn.sourceHandle as CanvasEdge['fromSide'],
      toSide: conn.targetHandle as CanvasEdge['toSide'],
      label: '', toEnd: 'arrow', meta: { origin: 'user', rel: 'related' },
    }
    set({ doc: { ...doc, edges: [...doc.edges, edge] }, dirty: true, editingEdgeId: id })
  },
  // Remove an edge from the doc so the deletion is durable (it neither resurrects on the next
  // controlled-state sync nor survives a save). v2: no `links:` write-back (Decision 4).
  removeEdgeWriteback(id: string) {
    const { doc } = get()
    if (!doc || !doc.edges.some((x) => x.id === id)) return
    set({ doc: { ...doc, edges: doc.edges.filter((x) => x.id !== id) }, dirty: true })
  },
  // Delete a node from the board (Delete/Backspace, the toolbar trash, or the inspector). Drops the node,
  // every edge touching it, and any comment anchored to it; a deleted GROUP orphans its children (clears
  // their parentId, like ungroup) so they survive as top-level nodes. File nodes leave the .md on disk —
  // this only removes the board widget. Closes the reader if the open node is the one being removed.
  removeNode(id: string) {
    const { doc } = get()
    if (!doc) return
    const target = doc.nodes.find((n) => n.id === id)
    if (!target) return
    const nodes = doc.nodes
      .filter((n) => n.id !== id)
      .map((n) => {
        if (n.parentId !== id) return n
        const next: CanvasNode = { ...n }
        delete (next as { parentId?: string }).parentId
        return next
      })
    const edges = doc.edges.filter((e) => e.fromNode !== id && e.toNode !== id)
    const comments = doc.flowcanvas.comments.filter((c) => !(c.anchor.kind === 'node' && c.anchor.nodeId === id))
    set({
      doc: { ...doc, nodes, edges, flowcanvas: { ...doc.flowcanvas, comments } },
      dirty: true,
      selectedIds: get().selectedIds.filter((s) => s !== id),
      readerNodeId: get().readerNodeId === id ? null : get().readerNodeId,
    })
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
    void api.putActive({ canvasRef: path, baseRevision: doc.flowcanvas.session.revision, intent: doc.flowcanvas.session.intent ?? '' })
      .catch((e) => console.error('putActive failed', e))
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
  // Create + adopt a fresh empty board: mint an `untitled-*.canvas`, write it so a reload reopens it,
  // adopt its path + active-board pointer, and reset transient UI. The canvas renders the "No board open"
  // empty state (nodes.length === 0) until the operator adds content, opens another board, or submits.
  async newBoard() {
    const now = new Date().toISOString()
    const path = `untitled-${crypto.randomUUID().slice(0, 8)}.canvas`
    const doc: FlowcanvasDoc = {
      nodes: [], edges: [],
      flowcanvas: {
        schemaVersion: '0.3',
        session: { title: 'Untitled board', intent: '', createdAt: now, updatedAt: now, revision: 0 },
        comments: [],
      },
    }
    set({ path, doc, bodies: {}, dirty: false, reviewState: null, focusNodeId: null, selectedIds: [], readerNodeId: null,
      coreDocBody: null, coreDocDraft: null, coreDocDirty: false, spineHighlightAnchor: null, linkedNodeIds: [] })
    doc.flowcanvas.session.revision = await api.saveCanvas(path, doc)
    if (typeof window !== 'undefined') {
      const u = new URL(window.location.href)
      u.searchParams.set('path', path)
      window.history.replaceState(null, '', u.toString())
    }
    void api.putActive({ canvasRef: path, baseRevision: doc.flowcanvas.session.revision, intent: '' })
      .catch((e) => console.error('putActive failed', e))
  },
  // Wipe the CURRENT board to empty (the UI gates this behind a confirm modal — it is destructive once
  // saved). Keeps the board's path + session identity; drops all nodes/edges/comments and clears any
  // pending review window. Dirties so the operator can Save to persist (or reload to restore).
  clearBoard() {
    const { doc } = get()
    if (!doc) return
    set({
      doc: {
        ...doc, nodes: [], edges: [],
        flowcanvas: { ...doc.flowcanvas, comments: [], session: { ...doc.flowcanvas.session, pendingReview: false } },
      },
      bodies: {}, dirty: true, selectedIds: [], readerNodeId: null, reviewState: null,
      coreDocBody: null, coreDocDraft: null, coreDocDirty: false, spineHighlightAnchor: null, linkedNodeIds: [],
    })
  },
  setNodePosition(id: string, x: number, y: number) {
    const { doc } = get()
    if (!doc) return
    const nodes = doc.nodes.map((n) => (n.id === id ? { ...n, x, y } : n))
    set({ doc: { ...doc, nodes }, dirty: true })
  },
  // Persist a resize committed by React Flow's NodeResizer on resize-end. For a GROUP, scale every
  // child proportionally (position + size) so resizing the fence resizes its contents the same
  // proportions and the membership keeps its layout. Non-group widgets just take the new size. x/y are
  // the resize-end origin the NodeResizer reports — a bottom/right drag leaves them at the node's x/y;
  // a top/left drag moves them, so children scale relative to the new box corner either way.
  setNodeSize(id: string, width: number, height: number, x?: number, y?: number) {
    const { doc } = get()
    if (!doc) return
    const target = doc.nodes.find((n) => n.id === id)
    if (!target) return
    const nx = x ?? target.x
    const ny = y ?? target.y
    const sx = target.width ? width / target.width : 1
    const sy = target.height ? height / target.height : 1
    const scaled = new Map<string, { x: number; y: number; width: number; height: number }>()
    if (target.type === 'group') {
      for (const c of doc.nodes) {
        if (c.parentId !== id) continue
        scaled.set(c.id, {
          x: Math.round(nx + (c.x - target.x) * sx),
          y: Math.round(ny + (c.y - target.y) * sy),
          width: Math.max(1, Math.round(c.width * sx)),
          height: Math.max(1, Math.round(c.height * sy)),
        })
      }
    }
    const nodes = doc.nodes.map((n) => {
      if (n.id === id) return { ...n, x: nx, y: ny, width, height }
      const s = scaled.get(n.id)
      return s ? { ...n, ...s } : n
    })
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
  // Set an edge's typed relationship (rel picker, Phase 6). Defaults the display label from REL_LABELS
  // when the edge has no free-form label yet; a links-origin edge is promoted to user (now hand-typed).
  setEdgeRel(id: string, rel: RelationshipType) {
    const { doc } = get()
    if (!doc) return
    const edges = doc.edges.map((e) => {
      if (e.id !== id) return e
      const label = e.label && e.label.trim() ? e.label : REL_LABELS[rel]
      return { ...e, label, meta: { ...e.meta, rel, origin: e.meta?.origin === 'links' ? 'user' : (e.meta?.origin ?? 'user') } }
    })
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
  // file's frontmatter/body. v2 (Decision 4): canvas-authoritative — NO links: re-derive; relationships
  // are typed edges. Returns the new node id so navigateRef can draw a references edge to it.
  async addFileNode(path: string, x: number, y: number) {
    const { doc, bodies } = get()
    if (!doc) return ''
    const probe: CanvasNode = { id: nodeId(), type: 'file', file: path, x, y, width: 380, height: 320, meta: { origin: 'user' } }
    const isImage = nodeKind(probe) === 'image'
    const node: CanvasNode = isImage ? { ...probe, height: 260 } : probe
    const { nodes, bodies: nextBodies } = await hydrateFiles([...doc.nodes, node], bodies)
    // v2: canvas-authoritative — no links: re-derive (Decision 4); relationships are typed edges.
    set({ doc: { ...doc, nodes }, bodies: nextBodies, dirty: true })
    return node.id
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
    // v2: next.edges are authoritative — no links: re-derive (Decision 4).
    set({ doc: { ...next, nodes }, bodies: nextBodies, dirty: true })
    await get().save()
    return report
  },
  // ─── v2 — agent round-trip, change-review, references, templates, reconcile ───
  // Submit the board to the agent: persist it + the intent, open the review window at the saved revision,
  // and publish the active-board pointer the MCP sidecar reads. The round runs out-of-band (the harness
  // drives the MCP tools); the later revision bump + pendingReview drive change-review on reload.
  // Scope-aware submit (v2): a non-empty scopeNodeIds stamps session.briefScope, which buildBrief honours
  // on both the MCP and clipboard-export paths; omitted/empty clears any prior scope (whole-board brief).
  // Scope narrows only the brief the agent sees — the full board is still saved + snapshotted for review.
  async submitToAgent(intent: string, scopeNodeIds?: string[]) {
    const { doc, path } = get()
    if (!doc || !path) throw new Error('no board loaded')
    const withIntent: FlowcanvasDoc = {
      ...doc,
      flowcanvas: {
        ...doc.flowcanvas,
        session: {
          ...doc.flowcanvas.session,
          intent,
          pendingReview: true,
          ...(scopeNodeIds && scopeNodeIds.length ? { briefScope: scopeNodeIds } : { briefScope: undefined }),
        },
      },
    }
    set({ doc: withIntent, dirty: true })
    await get().save()                                   // persist intent + pendingReview (bumps revision)
    const saved = get().doc
    if (!saved) return
    const baseRevision = saved.flowcanvas.session.revision
    const review: ReviewState = {
      baseRevision,
      briefId: saved.flowcanvas.session.lastBriefId ?? '',
      capturedAt: new Date().toISOString(),
      snapshot: saved,
      roundGeneratedFiles: [],
    }
    await api.putReview(path, review)
    await api.putActive({ canvasRef: path, baseRevision, intent })
    set({ reviewState: review })
  },
  // The navigable diff of the current doc against the submit-time snapshot; `files` = the round's added
  // file-node paths (the generated files) so discard can roll them back.
  reviewDiff() {
    const { reviewState, doc } = get()
    if (!reviewState || !doc) return null
    const base = diffDocs(reviewState.snapshot, doc)
    const added = new Set(base.nodes.added)
    const files = doc.nodes
      .filter((n) => added.has(n.id) && isFileNode(n))
      .map((n) => (n as { file: string }).file)
    return { ...base, files }
  },
  // Accept the round: keep the merged doc, clear the review window + snapshot, persist.
  async acceptRound() {
    const { doc, path } = get()
    if (!doc || !path) return
    const cleared: FlowcanvasDoc = {
      ...doc,
      flowcanvas: { ...doc.flowcanvas, session: { ...doc.flowcanvas.session, pendingReview: false, briefScope: undefined } },
    }
    set({ doc: cleared, reviewState: null, dirty: true })
    await api.clearReview(path).catch((e) => console.error('clearReview failed', e))
    await get().save()
  },
  // Discard the round: restore the submit-time snapshot, delete exactly the files the round generated,
  // clear the review window, persist (a new revision over the snapshot).
  async discardRound() {
    const { reviewState, path, bodies } = get()
    if (!reviewState || !path) return
    const round = get().reviewDiff()
    const restored: FlowcanvasDoc = {
      ...reviewState.snapshot,
      flowcanvas: {
        ...reviewState.snapshot.flowcanvas,
        session: { ...reviewState.snapshot.flowcanvas.session, pendingReview: false, briefScope: undefined },
      },
    }
    const { nodes, bodies: nextBodies } = await hydrateFiles(restored.nodes, bodies)
    set({ doc: { ...restored, nodes }, bodies: nextBodies, reviewState: null, dirty: true })
    for (const f of round?.files ?? []) await api.deleteFileApi(f).catch((e) => console.error('deleteFile failed', f, e))
    await api.clearReview(path).catch((e) => console.error('clearReview failed', e))
    await get().save()
  },
  clearFocus() {
    set({ focusNodeId: null })
  },
  // Select a node and request the viewport center on it (the FocusBridge consumes focusNodeId).
  focusNode(id: string) {
    set({ selectedIds: [id], focusNodeId: id })
  },
  // Reference navigation (Decision 9): focus the target node if it is on the board, else add it near the
  // source and draw a rel:'references' edge from the source to it. Bounded by one click.
  async navigateRef(sourceNodeId: string, ref: DocRef) {
    const { doc } = get()
    if (!doc) return
    const existing = doc.nodes.find((n) =>
      ref.isExternal
        ? n.type === 'link' && n.url === ref.target
        : isFileNode(n) && normPath(n.file) === normPath(ref.target),
    )
    if (existing) {
      set({ selectedIds: [existing.id], focusNodeId: existing.id })
      return
    }
    const src = doc.nodes.find((n) => n.id === sourceNodeId)
    const x = src ? src.x + src.width + 80 : 0
    const y = src ? src.y : 0
    let targetId: string
    if (ref.isExternal) {
      targetId = nodeId()
      get().addNode({ id: targetId, type: 'link', url: ref.target, x, y, width: 260, height: 80, meta: { origin: 'user' } })
    } else {
      targetId = await get().addFileNode(ref.target, x, y)
    }
    const cur = get().doc
    if (!cur || !targetId) return
    const rel: RelationshipType = 'references'
    const edge: CanvasEdge = {
      id: edgeId(), fromNode: sourceNodeId, toNode: targetId,
      label: 'references', toEnd: 'arrow', meta: { origin: 'user', rel },
    }
    set({ doc: { ...cur, edges: [...cur.edges, edge] }, selectedIds: [targetId], focusNodeId: targetId, dirty: true })
  },
  // Instantiate a template fragment at a drop point (Decision 8): clone with fresh ids + rebased coords,
  // write any document scaffolds, hydrate, and append.
  async addTemplate(t: CanvasTemplate, x: number, y: number) {
    const { doc, bodies } = get()
    if (!doc) return
    const { nodes: cloned, edges: clonedEdges, files } = instantiateTemplate(t, x, y, (p) => p + crypto.randomUUID().slice(0, 8))
    for (const f of files) await api.writeFileApi(f.path, f.content)
    const { nodes, bodies: nextBodies } = await hydrateFiles([...doc.nodes, ...cloned], bodies)
    set({ doc: { ...doc, nodes, edges: [...doc.edges, ...clonedEdges] }, bodies: nextBodies, dirty: true })
  },
  // Per-file reconcile (Decision 10): re-read THIS file from disk, refresh its frontmatter cache + body,
  // and re-derive only its links: edges — leaving every other file's edges and all user/agent edges intact.
  async resyncFile(path: string) {
    const { doc } = get()
    if (!doc) return
    const target = doc.nodes.find((n) => isFileNode(n) && normPath(n.file) === normPath(path))
    if (!target || !isFileNode(target)) return
    const [resolved] = await api.resolvePaths([target.file])
    const nodes = doc.nodes.map((n) =>
      n.id === target.id ? { ...n, meta: { ...n.meta, frontmatter: resolved?.frontmatter } } : n,
    )
    const bodies = { ...get().bodies }
    if (resolved?.body) bodies[target.id] = resolved.body
    const prefix = `lk:${target.id}->`
    const kept = doc.edges.filter((e) => !e.id.startsWith(prefix))   // drop only this file's derived links edges
    const seen = new Set(kept.map((e) => `${e.fromNode}>${e.toNode}`))
    const fresh = deriveLinkEdges(nodes).filter((e) => e.fromNode === target.id && !seen.has(`${e.fromNode}>${e.toNode}`))
    set({ doc: { ...doc, nodes, edges: [...kept, ...fresh] }, bodies, dirty: true })
  },
  // ─── 004 Phase 4 — living core spine + bidirectional linking (Decisions 3/4) ───
  // Bind the spine to `path`: stamp session.coreDocPath (persisted, so the brief carries it + a reload
  // reopens it) and resolve its markdown into coreDocBody/Draft. Drives the spine switcher (Q4).
  async setCoreDoc(path: string) {
    const { doc } = get()
    if (!doc) return
    if (doc.flowcanvas.session.coreDocPath !== path) {
      set({
        doc: { ...doc, flowcanvas: { ...doc.flowcanvas, session: { ...doc.flowcanvas.session, coreDocPath: path } } },
        dirty: true,
      })
    }
    const body = await api.readFileApi(path).catch(() => null)
    set({ coreDocBody: body, coreDocDraft: body, coreDocDirty: false, spineHighlightAnchor: null, linkedNodeIds: [] })
  },
  // Edit buffer for the spine textarea — dirties only when the draft diverges from the resolved body.
  editCoreDoc(markdown: string) {
    set({ coreDocDraft: markdown, coreDocDirty: markdown !== get().coreDocBody })
  },
  // Submit the revised core doc to the agent. GUARD: blocked while a round is already pending (single open
  // round invariant — Decision 3). Persist the draft via /api/file, adopt it as the body, then submitToAgent
  // (snapshot + pendingReview + active pointer) so the agent re-reads the doc over MCP and returns a board.
  async submitCoreDocEdit(summary: string) {
    const { doc, coreDocDraft } = get()
    if (!doc || coreDocDraft == null) return
    if (doc.flowcanvas.session.pendingReview) {
      throw new Error('A review round is already open — accept or discard it before submitting core-doc edits.')
    }
    const coreDocPath = doc.flowcanvas.session.coreDocPath
    if (!coreDocPath) throw new Error('No core doc bound — pick one in the spine switcher first.')
    await api.writeFileApi(coreDocPath, coreDocDraft)
    set({ coreDocBody: coreDocDraft, coreDocDirty: false })
    await get().submitToAgent(summary)
  },
  // Component → spine: the spine scrolls to + pulses this anchor (its meta.source.anchor).
  highlightSpineSection(anchor: string) {
    set({ spineHighlightAnchor: anchor })
  },
  // Spine → canvas: pulse every component whose meta.source.anchor === anchor (under the current core doc).
  highlightComponents(anchor: string) {
    const { doc } = get()
    const coreDocPath = doc?.flowcanvas.session.coreDocPath
    if (!doc || !coreDocPath) { set({ linkedNodeIds: [] }); return }
    set({ linkedNodeIds: buildSourceIndex(doc.nodes, coreDocPath).get(anchor) ?? [] })
  },
  clearLinkHighlight() {
    set({ spineHighlightAnchor: null, linkedNodeIds: [] })
  },
  // ─── 004 Phase 5 — frictionless import (Decision 5) ───
  // Adopt an in-memory FlowcanvasDoc as the active board: migrate to 0.3, write it to a fresh
  // collision-safe path (keeping a recognizable stem), then load() it through the normal adoption path
  // (hydrate · active pointer · core-doc resolve · transient reset · ?path=). Like openBoard, but for a
  // doc that isn't on disk yet (pasted / uploaded / dropped).
  async importDoc(doc: FlowcanvasDoc, path?: string) {
    const stem = (path ? path.replace(/\.canvas$/i, '').split('/').pop() : '') || 'imported'
    const targetPath = `${stem}-${crypto.randomUUID().slice(0, 8)}.canvas`
    // Write the validated doc as-is, then adopt via load() — which hydrates frontmatter BEFORE migrateDoc
    // (the correct order so the 0.1→0.2 link-edge bake reads FRESH disk frontmatter) and persists '0.3'.
    await api.saveCanvas(targetPath, doc)
    await get().load(targetPath)
    if (typeof window !== 'undefined') {
      const u = new URL(window.location.href)
      u.searchParams.set('path', targetPath)
      window.history.replaceState(null, '', u.toString())
    }
  },
  // Read a dropped/uploaded .canvas file → parse + zod-validate (throws on bad JSON / invalid doc; the
  // caller surfaces the message) → importDoc. The board is only replaced AFTER validation succeeds.
  async importCanvasFile(file: File) {
    const parsed = JSON.parse(await file.text()) as unknown   // SyntaxError on bad JSON → caller catches
    const doc = parseFlowcanvasDoc(parsed)                    // ZodError on an invalid doc → caller catches
    await get().importDoc(doc, file.name)
  },
}))

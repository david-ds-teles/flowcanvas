import { create } from 'zustand'
import type { Connection } from '@xyflow/react'
import type { FlowcanvasDoc, CanvasEdge } from './jsoncanvas'
import { isFileNode, nodeKind } from './jsoncanvas'
import { deriveLinkEdges, reconcileEdges } from './edges'
import * as api from '../api'

interface CanvasState {
  path: string | null
  doc: FlowcanvasDoc | null
  bodies: Record<string, string>     // transient: nodeId → resolved markdown body (not persisted)
  dirty: boolean
  load: (path: string) => Promise<void>
  save: () => Promise<void>
  bodyFor: (id: string) => string | undefined
  toggleCollapsed: (id: string) => void
  onConnect: (conn: Connection, label: string) => void
  setNodePosition: (id: string, x: number, y: number) => void
  relabelEdge: (id: string, label: string) => void
}

/** Short random suffix for a manually-drawn edge id. */
const edgeId = () => `e-${crypto.randomUUID().slice(0, 8)}`

export const useCanvasStore = create<CanvasState>((set, get) => ({
  path: null, doc: null, bodies: {}, dirty: false,
  bodyFor: (id) => get().bodies[id],
  async load(path) {
    const doc = await api.getCanvas(path)
    const files = doc.nodes.filter(isFileNode)
    const resolved = await api.resolvePaths(files.map((n) => n.file))
    const byPath = new Map(resolved.map((r) => [r.path, r]))
    const bodies: Record<string, string> = {}
    const nodes = doc.nodes.map((n) => {
      if (!isFileNode(n)) return n
      const r = byPath.get(n.file)
      if (nodeKind(n) === 'markdown' && r) {
        if (r.body) bodies[n.id] = r.body
        return { ...n, meta: { ...n.meta, frontmatter: r.frontmatter } }
      }
      return n
    })
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
  onConnect(conn: Connection, label: string) {
    const { doc } = get()
    if (!doc || !conn.source || !conn.target) return
    const edge: CanvasEdge = {
      id: edgeId(), fromNode: conn.source, toNode: conn.target,
      fromSide: conn.sourceHandle as CanvasEdge['fromSide'],
      toSide: conn.targetHandle as CanvasEdge['toSide'],
      label, toEnd: 'arrow', meta: { origin: 'user' },
    }
    set({ doc: { ...doc, edges: [...doc.edges, edge] }, dirty: true })
  },
  setNodePosition(id: string, x: number, y: number) {
    const { doc } = get()
    if (!doc) return
    const nodes = doc.nodes.map((n) => (n.id === id ? { ...n, x, y } : n))
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
}))

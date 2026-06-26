import { create } from 'zustand'
import type { FlowcanvasDoc } from './jsoncanvas'
import { isFileNode, nodeKind } from './jsoncanvas'
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
}

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
    set({ path, doc: { ...doc, nodes }, bodies, dirty: false })
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
}))

'use client'
import { useCallback, useEffect, useMemo } from 'react'
import {
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Connection,
  type Node as RFNode,
  type Edge as RFEdge,
  type EdgeChange,
  type NodeChange,
} from '@xyflow/react'
import { toReactFlow } from '@/lib/canvas/adapter'
import { useCanvasStore } from '@/lib/canvas/store'
import { isFileNode, nodeKind } from '@/lib/canvas/jsoncanvas'

/**
 * All React Flow wiring for the canvas, extracted from `canvas-shell.tsx` (Phase 8, Fix 1) so the
 * shell is pure layout. Owns the controlled RF node/edge state (mirrored from the store doc) and the
 * interaction callbacks; returns exactly the props `<ReactFlow>` consumes. Behaviour is unchanged
 * from the prior inline handlers except the edge-deletion write-back (Fix 5).
 */
export function useCanvasHandlers() {
  const doc = useCanvasStore((s) => s.doc)
  const onConnect = useCanvasStore((s) => s.onConnect)
  const removeEdgeWriteback = useCanvasStore((s) => s.removeEdgeWriteback)
  const removeNode = useCanvasStore((s) => s.removeNode)
  const applyLayout = useCanvasStore((s) => s.applyLayout)
  const setSelection = useCanvasStore((s) => s.setSelection)
  const selectedIds = useCanvasStore((s) => s.selectedIds)
  const setEditingEdge = useCanvasStore((s) => s.setEditingEdge)
  const openReader = useCanvasStore((s) => s.openReader)
  const { getInternalNode } = useReactFlow()

  const { nodes: rfNodes, edges: rfEdges } = useMemo(
    () => (doc ? toReactFlow(doc) : { nodes: [], edges: [] }),
    [doc],
  )

  // group lookups for drag write-back — which ids are groups, and each group's child ids.
  const groupIds = useMemo(() => new Set((doc?.nodes ?? []).filter((n) => n.type === 'group').map((n) => n.id)), [doc])
  const childrenByParent = useMemo(() => {
    const m = new Map<string, string[]>()
    for (const n of doc?.nodes ?? []) if (n.parentId) m.set(n.parentId, [...(m.get(n.parentId) ?? []), n.id])
    return m
  }, [doc])

  const [nodes, setNodes, onNodesChangeBase] = useNodesState(rfNodes)
  const [edges, setEdges, onEdgesChangeBase] = useEdgesState(rfEdges)

  // A 'remove' node change (Delete/Backspace on a selected node, or the toolbar/inspector delete) writes
  // the deletion back to the doc — dropping the node, its edges, anchored comments, and orphaning group
  // children — so it is durable and never resurrects on the next controlled-state sync. RF skips the key
  // when an input/textarea is focused, so inline label/note editing is safe.
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      for (const c of changes) if (c.type === 'remove') removeNode(c.id)
      onNodesChangeBase(changes)
    },
    [removeNode, onNodesChangeBase],
  )

  // Rebuild controlled RF nodes when the store doc changes (toggleCollapsed, onConnect, setNodeShape,
  // load…). `selected` is seeded from the store's selectedIds — the single source of truth for
  // selection — so a store edit (e.g. switching a shape) keeps the node selected (its switcher/resize
  // handles don't vanish) and a programmatic selection survives the rebuild.
  useEffect(() => {
    const sel = new Set(useCanvasStore.getState().selectedIds)
    setNodes(rfNodes.map((n) => ({ ...n, selected: sel.has(n.id) })))
  }, [rfNodes, setNodes])
  useEffect(() => { setEdges(rfEdges) }, [rfEdges, setEdges])

  // Push the store's selectedIds onto RF node.selected so a PROGRAMMATIC selection — a structure-rail
  // click (focusNode) or a navigateRef focus-or-add — highlights the node on the canvas, not just in
  // the inspector. RF's own click selection already round-trips through onSelectionChange → setSelection
  // (equality-guarded), so re-applying the same set here is a no-op and never loops.
  useEffect(() => {
    const sel = new Set(selectedIds)
    setNodes((prev) => {
      let changed = false
      const next = prev.map((n) => {
        const want = sel.has(n.id)
        if (!!n.selected === want) return n
        changed = true
        return { ...n, selected: want }
      })
      return changed ? next : prev
    })
  }, [selectedIds, setNodes])

  // A 'remove' edge change (Delete/Backspace on a selected edge) writes the deletion back to the doc
  // and, for a file↔file edge, strips the link from the source `.md` (Fix 5) before the base handler
  // updates local RF state. Non-remove changes (selection, dimensions) pass straight through.
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      for (const c of changes) if (c.type === 'remove') removeEdgeWriteback(c.id)
      onEdgesChangeBase(changes)
    },
    [removeEdgeWriteback, onEdgesChangeBase],
  )

  // onNodesChange drives smooth local dragging; commit the final ABSOLUTE position(s) to the store on
  // drop (Phase 10). Handles a multi-node drag (the `dragged` array) and a group drag — a dragged group's
  // children follow, so their new absolute coords (internals.positionAbsolute) are written back too.
  const onNodeDragStop = useCallback(
    (_e: MouseEvent | TouchEvent, node: RFNode, dragged: RFNode[]) => {
      const moved = dragged?.length ? dragged : [node]
      const updates: Record<string, { x: number; y: number }> = {}
      for (const d of moved) {
        const abs = getInternalNode(d.id)?.internals.positionAbsolute ?? d.position
        updates[d.id] = { x: abs.x, y: abs.y }
        if (groupIds.has(d.id)) {
          for (const cid of childrenByParent.get(d.id) ?? []) {
            if (updates[cid]) continue
            const cabs = getInternalNode(cid)?.internals.positionAbsolute
            if (cabs) updates[cid] = { x: cabs.x, y: cabs.y }
          }
        }
      }
      applyLayout(updates)
    },
    [getInternalNode, groupIds, childrenByParent, applyLayout],
  )

  // Mirror React Flow's selection into the store so the toolbar can enable Group/Ungroup.
  const onSelectionChange = useCallback(
    ({ nodes: sel }: { nodes: RFNode[] }) => setSelection(sel.map((n) => n.id)),
    [setSelection],
  )

  // Double-clicking an existing edge re-opens its inline label editor.
  const onEdgeDoubleClick = useCallback(
    (_e: React.MouseEvent, edge: RFEdge) => setEditingEdge(edge.id),
    [setEditingEdge],
  )

  // Reject self-connections during the drag itself: without this, an imprecise drag snaps to the
  // SOURCE node's own handle (a self-loop). RF marks the connection invalid and never fires onConnect.
  const isValidConnection = useCallback(
    (c: RFEdge | Connection) => !!c.source && !!c.target && c.source !== c.target,
    [],
  )

  // Click a markdown node → open the reader drawer (at the current size). Other kinds have nothing
  // more to read, so a click just selects. Comment mode is handled by the overlay, not here.
  const onNodeClick = useCallback(
    (_e: React.MouseEvent, node: RFNode) => {
      const n = doc?.nodes.find((x) => x.id === node.id)
      if (n && isFileNode(n) && nodeKind(n) === 'markdown') openReader(node.id)
    },
    [doc, openReader],
  )

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeDragStop,
    onSelectionChange,
    onEdgeDoubleClick,
    isValidConnection,
    onNodeClick,
  }
}

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
import { sideAndT } from '@/lib/canvas/ports'

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
  const fitGroups = useCanvasStore((s) => s.fitGroups)
  const setSelection = useCanvasStore((s) => s.setSelection)
  const selectedIds = useCanvasStore((s) => s.selectedIds)
  const setEditingEdge = useCanvasStore((s) => s.setEditingEdge)
  const movePort = useCanvasStore((s) => s.movePort)
  const beginConnect = useCanvasStore((s) => s.beginConnect)
  const completeConnect = useCanvasStore((s) => s.completeConnect)
  const cancelConnect = useCanvasStore((s) => s.cancelConnect)
  const { getInternalNode, screenToFlowPosition } = useReactFlow()

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
  // Rebuild controlled RF edges when the doc changes — but PRESERVE which edge is selected (005-edges).
  // Without this, every edge edit (e.g. dragging a bend → setEdgeWaypoints → doc change) regenerated the
  // edges and wiped `selected`, collapsing the edge's style panel / handles mid-interaction.
  useEffect(() => {
    setEdges((prev) => {
      const sel = new Set(prev.filter((e) => e.selected).map((e) => e.id))
      return sel.size === 0 ? rfEdges : rfEdges.map((e) => (sel.has(e.id) ? { ...e, selected: true } : e))
    })
  }, [rfEdges, setEdges])

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

  // 007 — click-to-connect + drag-to-move on connection dots. A single window CAPTURE-phase pointerdown
  // listener runs before React Flow's handle logic, so we own the gesture entirely (stopPropagation
  // suppresses RF's drag-connect and node selection). It replaces 006's drag-to-connect + Alt-drag-to-move:
  //   • not armed — TAP a dot/side handle ⇒ beginConnect (arm); DRAG a real dot ⇒ movePort along the border.
  //   • armed (connecting != null) — the next pointerdown LANDS or CANCELS: on a target dot/side ⇒ land there;
  //     on a target node body ⇒ land via autoPort; on the source node or empty space ⇒ cancel.
  // Edges anchored to a dot follow it because the renderer resolves the endpoint from the port {side,t}.
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      const st = useCanvasStore.getState()
      const target = e.target as HTMLElement | null
      const portEl = target?.closest?.('.fc-port[data-fc-portid]') as HTMLElement | null
      const addEl = target?.closest?.('.fc-port-add') as HTMLElement | null

      // ── armed: this pointerdown decides the landing ──
      if (st.connecting) {
        e.preventDefault(); e.stopPropagation()
        if (portEl?.dataset.fcNodeid && portEl.dataset.fcPortid) { completeConnect(portEl.dataset.fcNodeid, portEl.dataset.fcPortid); return }
        if (addEl?.dataset.fcNodeid && addEl.dataset.fcSide) { completeConnect(addEl.dataset.fcNodeid, addEl.dataset.fcSide); return }
        const nodeId = (target?.closest?.('.react-flow__node') as HTMLElement | null)?.dataset.id
        if (nodeId) completeConnect(nodeId, null)   // node body → autoPort (self-connect guarded in store)
        else cancelConnect()                         // empty pane / chrome → give up
        return
      }

      // ── not armed: a dot or side "add" handle starts the gesture ──
      if (!portEl && !addEl) return
      const el = (portEl ?? addEl)!
      const nodeId = el.dataset.fcNodeid
      if (!nodeId) return
      e.preventDefault(); e.stopPropagation()
      const portId = portEl?.dataset.fcPortid
      const side = addEl?.dataset.fcSide
      const start = { x: e.clientX, y: e.clientY }
      let dragging = false
      const move = (ev: PointerEvent) => {
        if (!dragging && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 4) return
        dragging = true
        if (!portId) return   // side "add" handles aren't draggable — a tap connects from the side centre
        const internal = getInternalNode(nodeId)
        const w = internal?.measured?.width, h = internal?.measured?.height
        if (!internal || !w || !h) return
        const r = { x: internal.internals.positionAbsolute.x, y: internal.internals.positionAbsolute.y, width: w, height: h }
        const { side: s, t } = sideAndT(r, screenToFlowPosition({ x: ev.clientX, y: ev.clientY }))
        // Free along the border by default ("anywhere"); hold Shift to snap to magnet points — the side
        // centre (0.5) and its two corners (0 / 1), mirroring the Shift-snap on edge bends.
        const snapped = ev.shiftKey ? [0, 0.5, 1].reduce((a, b) => (Math.abs(b - t) < Math.abs(a - t) ? b : a), 0.5) : t
        movePort(nodeId, portId, s, snapped)
      }
      const up = () => {
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
        if (!dragging) beginConnect(nodeId, portId ?? side!)   // a clean tap arms the connection
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
    }
    window.addEventListener('pointerdown', onDown, true)
    return () => window.removeEventListener('pointerdown', onDown, true)
  }, [getInternalNode, screenToFlowPosition, movePort, beginConnect, completeConnect, cancelConnect])

  // 007 — Esc aborts the armed connection (and closes an open inline edge-label editor) so the
  // cursor-following line never gets stuck when the user changes their mind mid-connection.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      const st = useCanvasStore.getState()
      if (st.connecting) { e.preventDefault(); cancelConnect() }
      else if (st.editingEdgeId) setEditingEdge(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cancelConnect, setEditingEdge])

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
      // Grow each group whose CHILD moved so the boundary follows its components — but skip a group that
      // was itself dragged (it just translated with its children, so its bounds are unchanged).
      const movedIds = new Set(moved.map((d) => d.id))
      const parents = new Set<string>()
      for (const d of moved) {
        const p = doc?.nodes.find((x) => x.id === d.id)?.parentId
        if (p && !movedIds.has(p)) parents.add(p)
      }
      if (parents.size) fitGroups([...parents])
    },
    [getInternalNode, groupIds, childrenByParent, applyLayout, doc, fitGroups],
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

  // Node single/double-click behavior (read-in-place: click→spine, double-click→reader) is owned by
  // CanvasShell, which holds the right-dock tab state the spine needs. Comment mode is the overlay's.

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
  }
}

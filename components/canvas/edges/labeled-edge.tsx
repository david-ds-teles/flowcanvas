'use client'
import { memo, useMemo, useRef, useState } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  Position,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  useInternalNode,
  useReactFlow,
  type EdgeProps,
} from '@xyflow/react'
import { useCanvasStore } from '@/lib/canvas/store'
import type {
  EdgeOrigin, RelationshipType, EdgeType, EdgeRouting, EdgeLineStyle, EdgeEnd, Side, CanvasColor,
} from '@/lib/canvas/jsoncanvas'
import { EDGE_TYPES, EDGE_TYPE_STYLE, EDGE_ROUTINGS, EDGE_LINE_STYLES, EDGE_ENDS } from '@/lib/canvas/jsoncanvas'
import { colorVar } from '@/lib/canvas/adapter'
import { rectIntersectionToPoint, sideOf, nearestT, nearestSegmentIndex, snapAngle, type Rect, type Point } from '@/lib/canvas/edge-geometry'
import { portPoint } from '@/lib/canvas/ports'
import { ColorPicker } from '@/components/ui/color-picker'
import { edgeMarkerUrl, EdgeEndMarker } from './edge-markers'

// Provenance → default stroke (design § Design System): links muted + dashed, user solid indigo, agent
// neon cyan, import violet. 005-edges: an explicit edge.color (data.color) OVERRIDES this default.
const STROKE: Record<EdgeOrigin, string> = {
  links: 'var(--color-outline)',
  user: 'var(--color-primary)',
  agent: 'var(--color-neon-cyan)',
  import: 'var(--color-secondary)',
}

const SIDE_TO_POS: Record<Side, Position> = {
  top: Position.Top, right: Position.Right, bottom: Position.Bottom, left: Position.Left,
}

// 005-edges — the per-edge style the adapter packs into RF edge.data.
type EdgeData = {
  origin?: EdgeOrigin
  rel?: RelationshipType
  edgeType?: EdgeType    // 006 — semantic flow type; resolves default {color,line,head} via EDGE_TYPE_STYLE
  routing?: EdgeRouting
  line?: EdgeLineStyle
  labelT?: number
  color?: CanvasColor
  fromSide?: Side
  toSide?: Side
  fromEnd?: EdgeEnd
  toEnd?: EdgeEnd
  points?: Point[]
  fromPortST?: { side: Side; t: number }   // 006 — resolved port {side,t} (adapter); endpoint anchors here
  toPortST?: { side: Side; t: number }
}

// Human labels for the pickers (the enum values stay the wire/agent contract).
const ROUTING_LABEL: Record<EdgeRouting, string> = { bezier: 'Curve', smoothstep: 'Angle', straight: 'Straight' }
const LINE_LABEL: Record<EdgeLineStyle, string> = { solid: 'Solid', dashed: 'Dashed', dotted: 'Dotted' }
const END_LABEL: Record<EdgeEnd, string> = { none: 'None', arrow: 'Arrow', 'arrow-open': 'Open', circle: 'Circle', diamond: 'Diamond' }
const clamp01 = (t: number) => Math.max(0, Math.min(1, t))

// Detached-path helpers — measure a label point / sample the path WITHOUT inserting into the DOM
// (getTotalLength/getPointAtLength work on a detached <path> in Chromium, the app + smoke runtime).
function makePath(d: string): SVGPathElement | null {
  if (typeof document === 'undefined') return null
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  p.setAttribute('d', d)
  return p
}
function pointAtT(d: string, t: number): Point | null {
  const p = makePath(d)
  if (!p) return null
  try {
    const len = p.getTotalLength()
    const pt = p.getPointAtLength(len * t)
    return { x: pt.x, y: pt.y }
  } catch { return null }
}
function samplePath(d: string, n: number): Point[] {
  const p = makePath(d)
  if (!p) return []
  try {
    const len = p.getTotalLength()
    return Array.from({ length: n + 1 }, (_, i) => {
      const pt = p.getPointAtLength((len * i) / n)
      return { x: pt.x, y: pt.y }
    })
  } catch { return [] }
}

function buildPath(
  routing: EdgeRouting,
  sx: number, sy: number, sPos: Position,
  tx: number, ty: number, tPos: Position,
): [string, number, number] {
  if (routing === 'straight') {
    const [d, lx, ly] = getStraightPath({ sourceX: sx, sourceY: sy, targetX: tx, targetY: ty })
    return [d, lx, ly]
  }
  if (routing === 'bezier') {
    const [d, lx, ly] = getBezierPath({ sourceX: sx, sourceY: sy, sourcePosition: sPos, targetX: tx, targetY: ty, targetPosition: tPos })
    return [d, lx, ly]
  }
  // smoothstep — the default: orthogonal right-angle routing (the cleanest read for a system diagram)
  const [d, lx, ly] = getSmoothStepPath({ sourceX: sx, sourceY: sy, sourcePosition: sPos, targetX: tx, targetY: ty, targetPosition: tPos, borderRadius: 8 })
  return [d, lx, ly]
}

// Path through manual waypoints (005-edges): a straight polyline for angle/straight, a Catmull-Rom
// spline for curve. Endpoints already resolved (floating or pinned); `pts` = [source, ...waypoints, target].
function polylineThrough(pts: Point[]): string {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ')
}
function splineThrough(pts: Point[]): string {
  if (pts.length < 3) return polylineThrough(pts)
  let d = `M ${pts[0].x},${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`
  }
  return d
}

// In-canvas quick label editor — replaces the old window.prompt. Mounts only while this edge is being
// edited (double-click, the bar's ✎, or a freshly-drawn edge), seeds once from the current label.
function EdgeLabelEditor({ id, initial, x, y }: { id: string; initial: string; x: number; y: number }) {
  const relabelEdge = useCanvasStore((s) => s.relabelEdge)
  const setEditingEdge = useCanvasStore((s) => s.setEditingEdge)
  const [value, setValue] = useState(initial)
  const closed = useRef(false)
  const finish = (save: boolean) => {
    if (closed.current) return // guard the Enter→blur and Esc→blur double-fire
    closed.current = true
    if (save) relabelEdge(id, value.trim())
    if (useCanvasStore.getState().editingEdgeId === id) setEditingEdge(null)
  }
  return (
    <EdgeLabelRenderer>
      <input
        className="fc-edge-input nodrag nopan"
        autoFocus
        value={value}
        placeholder="label…"
        aria-label="Edge label"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation()
          if (e.key === 'Enter') { e.preventDefault(); finish(true) }
          else if (e.key === 'Escape') { e.preventDefault(); finish(false) }
        }}
        onBlur={() => finish(true)}
        onClick={(e) => e.stopPropagation()}
        style={{ transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`, pointerEvents: 'all' }}
      />
    </EdgeLabelRenderer>
  )
}

// 006 — flow-type picker (replaces the rel picker, Decision 2): the EdgeType set + a free-form label
// field. Setting a type applies its legend default (color/line/head) and clears superseded overrides.
function EdgeTypePicker({ id, edgeType, label, x, y, onClose }: { id: string; edgeType: EdgeType; label: string; x: number; y: number; onClose: () => void }) {
  const setEdgeType = useCanvasStore((s) => s.setEdgeType)
  const relabelEdge = useCanvasStore((s) => s.relabelEdge)
  const [text, setText] = useState(label)
  return (
    <div
      id={`fc-type-picker-${id}`}
      // `fc-relpick*` is a STABLE CSS HANDLE kept across the rel→type rename — its rules are reused
      // verbatim and renaming would churn the stylesheet for no functional gain (006 QA Finding 1).
      className="fc-relpick nodrag nopan"
      data-testid="edge-type-picker"
      style={{ transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`, pointerEvents: 'all' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="fc-relpick__grid">
        {EDGE_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            className="fc-relpick__opt"
            data-testid="edge-type-option"
            aria-pressed={t === edgeType}
            onClick={() => setEdgeType(id, t)}
          >
            {EDGE_TYPE_STYLE[t].label}
          </button>
        ))}
      </div>
      <div className="fc-relpick__row">
        <input
          className="fc-relpick__input"
          data-testid="edge-label-input"
          value={text}
          placeholder="label…"
          aria-label="Edge label"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation()
            if (e.key === 'Enter') { e.preventDefault(); relabelEdge(id, text.trim()); onClose() }
            else if (e.key === 'Escape') { e.preventDefault(); onClose() }
          }}
        />
        <button type="button" className="fc-relpick__apply" onClick={() => { relabelEdge(id, text.trim()); onClose() }}>Apply</button>
      </div>
    </div>
  )
}

// 005-edges — per-edge visual style: routing · line · color · end markers · pinned sides. Each control
// maps 1:1 to a store action; the agent reaches the same fields through the contract.
function EdgeStylePanel({ id, data, x, y }: { id: string; data: EdgeData; x: number; y: number }) {
  const setEdgeRouting = useCanvasStore((s) => s.setEdgeRouting)
  const setEdgeLine = useCanvasStore((s) => s.setEdgeLine)
  const setEdgeColor = useCanvasStore((s) => s.setEdgeColor)
  const setEdgeMarker = useCanvasStore((s) => s.setEdgeMarker)
  const setEdgeSide = useCanvasStore((s) => s.setEdgeSide)
  const setEdgeWaypoints = useCanvasStore((s) => s.setEdgeWaypoints)
  const routing = data.routing ?? 'smoothstep'
  const line = data.line ?? 'solid'
  const fromEnd = data.fromEnd ?? 'none'
  const toEnd = data.toEnd ?? 'arrow'
  const hasBends = (data.points?.length ?? 0) > 0
  return (
    <div
      id={`fc-edge-style-${id}`}
      className="fc-edgestyle nodrag nopan"
      data-testid="edge-style-panel"
      style={{ transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`, pointerEvents: 'all' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="fc-edgestyle__row">
        <span className="fc-edgestyle__lbl">Routing</span>
        <div className="fc-edgestyle__seg">
          {EDGE_ROUTINGS.map((r) => (
            <button key={r} type="button" data-testid={`edge-routing-${r}`} aria-pressed={r === routing} onClick={() => setEdgeRouting(id, r)}>{ROUTING_LABEL[r]}</button>
          ))}
        </div>
      </div>
      <div className="fc-edgestyle__row">
        <span className="fc-edgestyle__lbl">Line</span>
        <div className="fc-edgestyle__seg">
          {EDGE_LINE_STYLES.map((l) => (
            <button key={l} type="button" data-testid={`edge-line-${l}`} aria-pressed={l === line} onClick={() => setEdgeLine(id, l)}>{LINE_LABEL[l]}</button>
          ))}
        </div>
      </div>
      <div className="fc-edgestyle__row">
        <span className="fc-edgestyle__lbl">Color</span>
        {/* 006 — the shared reusable color picker; clear reverts to the flow-type default colour. */}
        <ColorPicker
          value={data.color}
          onChange={(c) => setEdgeColor(id, c)}
          onClear={() => setEdgeColor(id, undefined)}
          label="Edge colour"
        />
      </div>
      <div className="fc-edgestyle__row">
        <span className="fc-edgestyle__lbl">Ends</span>
        <label className="fc-edgestyle__field">
          <span>From</span>
          <select data-testid="edge-from-end" value={fromEnd} onChange={(e) => setEdgeMarker(id, 'from', e.target.value as EdgeEnd)}>
            {EDGE_ENDS.map((e) => <option key={e} value={e}>{END_LABEL[e]}</option>)}
          </select>
        </label>
        <label className="fc-edgestyle__field">
          <span>To</span>
          <select data-testid="edge-to-end" value={toEnd} onChange={(e) => setEdgeMarker(id, 'to', e.target.value as EdgeEnd)}>
            {EDGE_ENDS.map((e) => <option key={e} value={e}>{END_LABEL[e]}</option>)}
          </select>
        </label>
      </div>
      <div className="fc-edgestyle__row">
        <span className="fc-edgestyle__lbl">Sides</span>
        <label className="fc-edgestyle__field">
          <span>From</span>
          <select data-testid="edge-from-side" value={data.fromSide ?? ''} onChange={(e) => setEdgeSide(id, 'from', e.target.value === '' ? undefined : (e.target.value as Side))}>
            <option value="">Auto</option>
            <option value="top">Top</option>
            <option value="right">Right</option>
            <option value="bottom">Bottom</option>
            <option value="left">Left</option>
          </select>
        </label>
        <label className="fc-edgestyle__field">
          <span>To</span>
          <select data-testid="edge-to-side" value={data.toSide ?? ''} onChange={(e) => setEdgeSide(id, 'to', e.target.value === '' ? undefined : (e.target.value as Side))}>
            <option value="">Auto</option>
            <option value="top">Top</option>
            <option value="right">Right</option>
            <option value="bottom">Bottom</option>
            <option value="left">Left</option>
          </select>
        </label>
      </div>
      <div className="fc-edgestyle__row">
        <span className="fc-edgestyle__lbl">Line shape</span>
        <button type="button" className="fc-edgestyle__reset" data-testid="edge-clear-bends" disabled={!hasBends} onClick={() => setEdgeWaypoints(id, [])}>
          {hasBends ? 'Clear bends' : 'No manual bends'}
        </button>
      </div>
    </div>
  )
}

type Panel = 'none' | 'type' | 'style'

// Selected-edge action bar (Decision 2) — type ▾ · style ▾ · ✎ Label · ✕. Portaled just below the label
// pill; the only delete surface for an edge.
function EdgeActionBar({ id, x, y, panel, onType, onStyle, onLabel }: { id: string; x: number; y: number; panel: Panel; onType: () => void; onStyle: () => void; onLabel: () => void }) {
  const removeEdgeWriteback = useCanvasStore((s) => s.removeEdgeWriteback)
  return (
    <div
      className="fc-edge-actions nodrag nopan"
      data-testid="edge-action-bar"
      style={{ transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`, pointerEvents: 'all' }}
      onClick={(e) => e.stopPropagation()}
    >
      <button type="button" className="fc-edge-actions__btn" data-testid="edge-action-type" aria-expanded={panel === 'type'} aria-controls={`fc-type-picker-${id}`} title="Set flow type" onClick={onType}>type ▾</button>
      <button type="button" className="fc-edge-actions__btn" data-testid="edge-action-style" aria-expanded={panel === 'style'} aria-controls={`fc-edge-style-${id}`} title="Edge style — routing, color, line, ends, sides" onClick={onStyle}>style ▾</button>
      <button type="button" className="fc-edge-actions__btn" data-testid="edge-action-label" title="Edit label" aria-label="Edit label" onClick={onLabel}>✎ Label</button>
      <button type="button" className="fc-edge-actions__btn fc-edge-actions__btn--del" data-testid="edge-delete" title="Delete this connection" aria-label="Delete connection" onClick={() => removeEdgeWriteback(id)}>✕</button>
    </div>
  )
}

export const LabeledEdge = memo(function LabeledEdge({
  id, source, target, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, label, data, selected,
}: EdgeProps) {
  const d = (data ?? {}) as EdgeData
  const origin = (d.origin ?? 'user') as EdgeOrigin
  // 006 — the edge's semantic flow type drives its default {color,line,head} via EDGE_TYPE_STYLE.
  const edgeType = (d.edgeType ?? 'reference') as EdgeType
  const ts = EDGE_TYPE_STYLE[edgeType]
  const typeLabel = ts.label
  const routing = (d.routing ?? 'smoothstep') as EdgeRouting   // 005-edges — orthogonal is the clean default
  const derived = origin === 'links'
  const points = useMemo(() => d.points ?? [], [d.points])

  const setEditingEdge = useCanvasStore((s) => s.setEditingEdge)
  const setEdgeLabelT = useCanvasStore((s) => s.setEdgeLabelT)
  const setEdgeWaypoints = useCanvasStore((s) => s.setEdgeWaypoints)
  const editing = useCanvasStore((s) => s.editingEdgeId === id)
  const { screenToFlowPosition } = useReactFlow()

  // 005-edges — FLOATING endpoints. An unpinned end anchors at the node center and meets the perimeter
  // where the line crosses it, aimed at the next bend (first/last waypoint) or the other node's center.
  // A pinned side keeps RF's handle-anchored coords.
  const sourceNode = useInternalNode(source)
  const targetNode = useInternalNode(target)
  const rectOf = (n: typeof sourceNode): Rect | null =>
    n ? { x: n.internals.positionAbsolute.x, y: n.internals.positionAbsolute.y, width: n.measured?.width ?? 0, height: n.measured?.height ?? 0 } : null
  const srcRect = rectOf(sourceNode)
  const tgtRect = rectOf(targetNode)
  const fromPinned = d.fromSide != null
  const toPinned = d.toSide != null
  const centerOf = (r: Rect): Point => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 })

  let sx = sourceX, sy = sourceY, sPos = sourcePosition
  let tx = targetX, ty = targetY, tPos = targetPosition
  if (srcRect && tgtRect) {
    // 006 — anchor each endpoint at its connection PORT (dot) so the arrowhead seats inside it. A port-less
    // edge (ref-nav before normalize, or legacy) falls back to the 005 floating-perimeter math.
    if (d.fromPortST) { const p = portPoint(srcRect, { id: '', side: d.fromPortST.side, t: d.fromPortST.t }); sx = p.x; sy = p.y; sPos = SIDE_TO_POS[d.fromPortST.side] }
    else if (!fromPinned) { const aim: Point = points.length ? points[0] : centerOf(tgtRect); const p = rectIntersectionToPoint(srcRect, aim); sx = p.x; sy = p.y; sPos = SIDE_TO_POS[sideOf(srcRect, p)] }
    if (d.toPortST) { const p = portPoint(tgtRect, { id: '', side: d.toPortST.side, t: d.toPortST.t }); tx = p.x; ty = p.y; tPos = SIDE_TO_POS[d.toPortST.side] }
    else if (!toPinned) { const aim: Point = points.length ? points[points.length - 1] : centerOf(srcRect); const p = rectIntersectionToPoint(tgtRect, aim); tx = p.x; ty = p.y; tPos = SIDE_TO_POS[sideOf(tgtRect, p)] }
  }

  const [path, midX, midY] = useMemo(() => {
    if (points.length > 0) {
      const rp: Point[] = [{ x: sx, y: sy }, ...points, { x: tx, y: ty }]
      const d2 = routing === 'bezier' ? splineThrough(rp) : polylineThrough(rp)
      const m = rp[Math.floor(rp.length / 2)]
      return [d2, m.x, m.y] as [string, number, number]
    }
    return buildPath(routing, sx, sy, sPos, tx, ty, tPos)
  }, [routing, sx, sy, sPos, tx, ty, tPos, points])

  // Label position along the path (0..1), draggable. Memoized off [path, labelT].
  const labelT = clamp01(typeof d.labelT === 'number' ? d.labelT : 0.5)
  const labelPt = useMemo(() => pointAtT(path, labelT) ?? { x: midX, y: midY }, [path, labelT, midX, midY])
  const labelX = labelPt.x
  const labelY = labelPt.y

  // 006 — resolve style: explicit per-edge override → flow-type default (EDGE_TYPE_STYLE) → provenance.
  const stroke = colorVar(d.color) ?? colorVar(ts.color) ?? STROKE[origin] ?? STROKE.user
  const line = (d.line ?? ts.line ?? (derived ? 'dashed' : 'solid')) as EdgeLineStyle
  const dash = line === 'dashed' ? '7 5' : line === 'dotted' ? '1.5 5' : undefined
  const fromEndShape = d.fromEnd ?? ts.fromEnd
  const toEndShape = d.toEnd ?? ts.toEnd
  const markerStartUrl = edgeMarkerUrl(id, 'start', fromEndShape)
  const markerEndUrl = edgeMarkerUrl(id, 'end', toEndShape)

  const [panel, setPanel] = useState<Panel>('none')
  // Close the popovers when the edge is deselected (render-phase reset — the React-sanctioned alternative
  // to setState-in-effect; matches comment-layer.tsx).
  const [prevSelected, setPrevSelected] = useState(selected)
  if (prevSelected !== selected) {
    setPrevSelected(selected)
    if (!selected && panel !== 'none') setPanel('none')
  }
  const text = typeof label === 'string' ? label : ''

  // Live waypoints from the store (avoids stale-closure during a drag).
  const livePoints = (): Point[] => useCanvasStore.getState().doc?.edges.find((e) => e.id === id)?.meta?.points ?? []
  const startDrag = (e: React.PointerEvent, onMove: (fp: Point, shift: boolean) => void) => {
    if (e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()
    const move = (ev: PointerEvent) => onMove(screenToFlowPosition({ x: ev.clientX, y: ev.clientY }), ev.shiftKey)
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
  // Drag an existing waypoint; double-click removes it. Hold Shift → snap the incoming segment to 45° (006 snapAngle).
  const moveWaypoint = (j: number) => (e: React.PointerEvent) => startDrag(e, (fp, shift) => {
    const next = livePoints().slice()
    const prev: Point = j === 0 ? { x: sx, y: sy } : next[j - 1]
    const p = shift ? snapAngle(prev, fp) : fp
    next[j] = { x: Math.round(p.x), y: Math.round(p.y) }
    setEdgeWaypoints(id, next)
  })
  const removeWaypoint = (j: number) => (e: React.MouseEvent) => {
    e.stopPropagation()
    const next = livePoints().slice()
    next.splice(j, 1)
    setEdgeWaypoints(id, next)
  }
  // Grab the LINE itself and bend it (the design-tool gesture): on a real drag, insert a waypoint at the
  // segment nearest the grab point and drag it. Works with NO prior selection. A plain click (no drag)
  // falls through to React Flow, which selects the edge. This is the affordance the faint dots lacked.
  const onLinePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.stopPropagation()   // block the pane's marquee/pan during the bend; a click still selects via RF
    const startClient = { x: e.clientX, y: e.clientY }
    const startFlow = screenToFlowPosition(startClient)
    let dragging = false
    let seg = -1
    const move = (ev: PointerEvent) => {
      if (!dragging) {
        if (Math.hypot(ev.clientX - startClient.x, ev.clientY - startClient.y) < 5) return
        dragging = true
        const cur = livePoints()
        const rpNow: Point[] = [{ x: sx, y: sy }, ...cur, { x: tx, y: ty }]
        seg = nearestSegmentIndex(rpNow, startFlow)
        const next = cur.slice()
        next.splice(seg, 0, { x: Math.round(startFlow.x), y: Math.round(startFlow.y) })
        setEdgeWaypoints(id, next)
      }
      const fp = screenToFlowPosition({ x: ev.clientX, y: ev.clientY })
      const arr = livePoints().slice()
      if (seg >= 0 && seg < arr.length) {
        // Hold Shift while bending the line → snap the segment from its previous point to 45° (006 snapAngle).
        const prev: Point = seg === 0 ? { x: sx, y: sy } : arr[seg - 1]
        const p = ev.shiftKey ? snapAngle(prev, fp) : fp
        arr[seg] = { x: Math.round(p.x), y: Math.round(p.y) }
        setEdgeWaypoints(id, arr)
      }
    }
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  // Drag the label along the path. A real drag suppresses the click-toggle so a tap still opens the picker.
  const draggedRef = useRef(false)
  const onLabelPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    e.stopPropagation()
    draggedRef.current = false
    const samples = samplePath(path, 64)
    if (samples.length < 2) return
    const start = { x: e.clientX, y: e.clientY }
    const move = (ev: PointerEvent) => {
      if (!draggedRef.current && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 4) return
      draggedRef.current = true
      setEdgeLabelT(id, nearestT(samples, screenToFlowPosition({ x: ev.clientX, y: ev.clientY })))
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <>
      {/* Per-edge marker defs, colored to match the stroke (no shared context-stroke → no black heads). */}
      {(markerStartUrl || markerEndUrl) && (
        <defs>
          <EdgeEndMarker edgeId={id} which="start" end={fromEndShape} color={stroke} />
          <EdgeEndMarker edgeId={id} which="end" end={toEndShape} color={stroke} />
        </defs>
      )}
      <BaseEdge
        id={id}
        path={path}
        markerStart={markerStartUrl}
        markerEnd={markerEndUrl}
        style={{ stroke, strokeWidth: selected ? 2.5 : 1.5, strokeDasharray: dash }}
      />
      {/* 005-edges — fat transparent hit-path ON TOP of the stroke: grab the line ANYWHERE to bend it. */}
      <path className="fc-edge-grab" d={path} fill="none" stroke="transparent" strokeWidth={18} style={{ pointerEvents: 'stroke', cursor: 'grab' }} onPointerDown={onLinePointerDown} />
      {editing ? (
        <EdgeLabelEditor id={id} initial={text} x={labelX} y={labelY} />
      ) : (
        <EdgeLabelRenderer>
          {/* 006 — flow-type pill: type eyebrow + free-form label. Click → type picker · double-click →
              quick label edit · drag → slide the label along the line (move it where it reads). */}
          <div
            className={`fc-edge-label fc-edge-label--${origin} nodrag nopan`}
            data-testid="edge-type-pill"
            aria-expanded={panel === 'type'}
            aria-controls={`fc-type-picker-${id}`}
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`, pointerEvents: 'all', cursor: 'grab' }}
            title="Click: flow type · double-click: edit label · drag: move label along the line"
            onPointerDown={onLabelPointerDown}
            onClick={(e) => {
              e.stopPropagation()
              if (draggedRef.current) { draggedRef.current = false; return }
              setPanel((p) => (p === 'type' ? 'none' : 'type'))
            }}
            onDoubleClick={(e) => { e.stopPropagation(); setPanel('none'); setEditingEdge(id) }}
          >
            {derived && <span className="fc-edge-label__lock" aria-label="derived from links">🔒</span>}
            <span className="fc-edge-label__rel">{typeLabel}</span>
            {text !== '' && <span className="fc-edge-label__text">{text}</span>}
          </div>

          {/* 005-edges — a visible handle on each existing bend (always grabbable, not gated on selection):
              drag to move it · double-click to remove. Adding a bend is done by grabbing the line itself. */}
          {points.map((p, j) => (
            <div
              key={`wp-${j}`}
              className="fc-edge-waypoint nodrag nopan"
              data-testid="edge-waypoint"
              style={{ transform: `translate(-50%, -50%) translate(${p.x}px, ${p.y}px)`, pointerEvents: 'all' }}
              title="Drag to move this bend · double-click to remove"
              onPointerDown={moveWaypoint(j)}
              onDoubleClick={removeWaypoint(j)}
              onClick={(e) => e.stopPropagation()}
            />
          ))}

          {selected && (
            <EdgeActionBar
              id={id}
              x={labelX}
              y={labelY + 24}
              panel={panel}
              onType={() => setPanel((p) => (p === 'type' ? 'none' : 'type'))}
              onStyle={() => setPanel((p) => (p === 'style' ? 'none' : 'style'))}
              onLabel={() => { setPanel('none'); setEditingEdge(id) }}
            />
          )}
          {panel === 'type' && <EdgeTypePicker id={id} edgeType={edgeType} label={text} x={labelX} y={labelY + (selected ? 56 : 28)} onClose={() => setPanel('none')} />}
          {panel === 'style' && <EdgeStylePanel id={id} data={d} x={labelX} y={labelY + (selected ? 56 : 28)} />}
        </EdgeLabelRenderer>
      )}
    </>
  )
})

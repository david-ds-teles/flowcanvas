'use client'
import { useEffect, useState } from 'react'
import { Position, ViewportPortal, getBezierPath, useReactFlow } from '@xyflow/react'
import { useCanvasStore } from '@/lib/canvas/store'
import { portPoint } from '@/lib/canvas/ports'
import type { Side } from '@/lib/canvas/jsoncanvas'
import type { Point, Rect } from '@/lib/canvas/edge-geometry'

const SIDE_TO_POS: Record<Side, Position> = {
  top: Position.Top, right: Position.Right, bottom: Position.Bottom, left: Position.Left,
}

/**
 * 007 — the armed click-to-connect visual. While `connecting` is set (a source dot was clicked), this
 * draws a live, animated line from the source dot to the cursor inside the flow viewport (ViewportPortal
 * → flow coordinates) plus a screen-fixed hint. It is purely visual — all pointer/Esc logic lives in
 * `use-canvas-handlers`; the line is `pointer-events:none` so it never intercepts the landing click.
 */
export function ConnectionOverlay() {
  const connecting = useCanvasStore((s) => s.connecting)
  const docNode = useCanvasStore((s) =>
    connecting ? s.doc?.nodes.find((n) => n.id === connecting.fromNode) ?? null : null,
  )
  const { getInternalNode, screenToFlowPosition } = useReactFlow()
  // The cursor point is tagged with the arm it belongs to, so a stale point from a previous connection is
  // ignored (the tip falls back to the source until the next move) — and we never setState in the effect.
  const [moved, setMoved] = useState<{ key: string; p: Point } | null>(null)
  const armKey = connecting ? `${connecting.fromNode}::${connecting.fromHandle}` : ''

  // Track the cursor in flow space while armed; the only setState is in the event handler (lint-clean).
  useEffect(() => {
    if (!connecting) return
    const k = `${connecting.fromNode}::${connecting.fromHandle}`
    const move = (e: PointerEvent) => setMoved({ key: k, p: screenToFlowPosition({ x: e.clientX, y: e.clientY }) })
    window.addEventListener('pointermove', move)
    return () => window.removeEventListener('pointermove', move)
  }, [connecting, screenToFlowPosition])

  if (!connecting) return null

  // Resolve the source anchor: an existing port's {side,t}, else the side centre of a hover "add" handle.
  const internal = getInternalNode(connecting.fromNode)
  const w = internal?.measured?.width, h = internal?.measured?.height
  if (!internal || !w || !h) return null
  const rect: Rect = { x: internal.internals.positionAbsolute.x, y: internal.internals.positionAbsolute.y, width: w, height: h }
  const port = docNode?.meta?.ports?.find((p) => p.id === connecting.fromHandle)
  const srcSide: Side = port?.side ?? (connecting.fromHandle as Side)
  const src = portPoint(rect, port ?? { id: '', side: srcSide, t: 0.5 })

  // Natural curve: aim the cursor end along the dominant axis so the line bends like a real edge.
  const cursor = moved && moved.key === armKey ? moved.p : null
  const tip = cursor ?? src
  const dx = tip.x - src.x, dy = tip.y - src.y
  const tPos = Math.abs(dx) >= Math.abs(dy)
    ? (dx >= 0 ? Position.Left : Position.Right)
    : (dy >= 0 ? Position.Top : Position.Bottom)
  const [path] = getBezierPath({
    sourceX: src.x, sourceY: src.y, sourcePosition: SIDE_TO_POS[srcSide],
    targetX: tip.x, targetY: tip.y, targetPosition: tPos,
  })

  return (
    <>
      <ViewportPortal>
        <svg
          className="fc-connline"
          style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none', zIndex: 6 }}
        >
          <path className="fc-connline__halo" d={path} fill="none" />
          <path className="fc-connline__core" d={path} fill="none" />
          <circle className="fc-connline__src" cx={src.x} cy={src.y} r={4} />
          {cursor && <circle className="fc-connline__tip" cx={tip.x} cy={tip.y} r={5} />}
        </svg>
      </ViewportPortal>
      <div className="fc-connhint" data-testid="connection-hint" role="status">
        Click a dot to connect <kbd>·</kbd> <kbd>Esc</kbd> to cancel
      </div>
    </>
  )
}

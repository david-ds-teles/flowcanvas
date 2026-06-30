'use client'
import type { CSSProperties } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { CanvasNode, Side } from '@/lib/canvas/jsoncanvas'

const SIDE_POS: Record<Side, Position> = {
  top: Position.Top, right: Position.Right, bottom: Position.Bottom, left: Position.Left,
}
const SIDES: Side[] = ['top', 'right', 'bottom', 'left']

/** Offset a handle along its side by t (0..1): top/bottom move in x, left/right in y. */
function offset(side: Side, t: number): CSSProperties {
  const pct = `${Math.round(t * 100)}%`
  return side === 'top' || side === 'bottom' ? { left: pct } : { top: pct }
}

/**
 * 006/007 — connection ports. Renders one dot per node port (handle id = port id) so an edge anchors to a
 * real, reusable, movable dot and its arrowhead seats inside, PLUS four faint side "add" handles (handle
 * id = the Side) at each side centre so any node — even one with no ports yet — can start or receive a
 * connection. Every dot/handle carries `data-fc-nodeid` (+ `data-fc-portid` on real dots, `data-fc-side`
 * on add handles) so the canvas-level gesture listener (use-canvas-handlers) can drive 007 click-to-connect
 * (tap a dot/side ⇒ arm; tap a target ⇒ land) and drag-to-move (drag a dot ⇒ slide it along the border).
 * Every edge anchored to a dot follows it because the renderer reads the port {side,t} from the adapter.
 */
export function PortHandles({ node }: { node: CanvasNode }) {
  const ports = node.meta?.ports ?? []
  return (
    <>
      {SIDES.map((s) => (
        <Handle
          key={`add-${s}`}
          type="source"
          position={SIDE_POS[s]}
          id={s}
          className="fc-port-add"
          title="Click to start a connection from this side"
          {...({ 'data-fc-side': s, 'data-fc-nodeid': node.id } as Record<string, string>)}
        />
      ))}
      {ports.map((p) => (
        <Handle
          key={p.id}
          type="source"
          position={SIDE_POS[p.side]}
          id={p.id}
          className="fc-port"
          style={offset(p.side, p.t)}
          title="Click to connect · drag to move this dot"
          {...({ 'data-fc-portid': p.id, 'data-fc-nodeid': node.id } as Record<string, string>)}
        />
      ))}
    </>
  )
}

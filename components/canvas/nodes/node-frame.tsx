'use client'
import { Handle, Position, NodeResizer } from '@xyflow/react'
import type { ReactNode } from 'react'
import { useCanvasStore } from '@/lib/canvas/store'

const SIDES = [Position.Top, Position.Right, Position.Bottom, Position.Left]

export interface NodeResizeFrameProps {
  id: string
  selected: boolean
  minWidth: number
  minHeight: number
  children: ReactNode
}

// One shared resizer + handles wrapper for every non-group card. The <NodeResizer> and the four
// <Handle>s are SIBLINGS of the card (never nested inside its overflow:hidden box) — the exact
// constraint the node-component comments warn about. Resize persists through the existing setNodeSize
// action (no schema change). Handles are hidden in comment mode so they never swallow a pin-drop click.
export function NodeResizeFrame({ id, selected, minWidth, minHeight, children }: NodeResizeFrameProps) {
  const setNodeSize = useCanvasStore((s) => s.setNodeSize)
  const commentMode = useCanvasStore((s) => s.mode === 'comment')
  return (
    <>
      <NodeResizer
        isVisible={selected && !commentMode}
        minWidth={minWidth}
        minHeight={minHeight}
        onResizeEnd={(_e, d) => setNodeSize(id, Math.round(d.width), Math.round(d.height))}
        lineClassName="fc-rzline"
        handleClassName="fc-rzhandle"
      />
      {children}
      {SIDES.map((p) => (
        <Handle key={p} type="source" position={p} id={p} />
      ))}
    </>
  )
}

'use client'
import { NodeResizer } from '@xyflow/react'
import type { ReactNode } from 'react'
import type { CanvasNode } from '@/lib/canvas/jsoncanvas'
import { useCanvasStore } from '@/lib/canvas/store'
import { useShiftKey } from './use-shift-key'
import { PortHandles } from './port-handles'

export interface NodeResizeFrameProps {
  id: string
  node: CanvasNode
  selected: boolean
  minWidth: number
  minHeight: number
  children: ReactNode
}

// One shared resizer + connection-port wrapper for every non-group card. The <NodeResizer> and the
// <PortHandles> dots are SIBLINGS of the card (never nested inside its overflow:hidden box) — the exact
// constraint the node-component comments warn about. Resize persists through the existing setNodeSize
// action (no schema change). 006: the four fixed side handles are replaced by per-port connection dots
// (+ faint side "add" handles) so edges anchor to real, reusable, movable dots.
export function NodeResizeFrame({ id, node, selected, minWidth, minHeight, children }: NodeResizeFrameProps) {
  const setNodeSize = useCanvasStore((s) => s.setNodeSize)
  const commentMode = useCanvasStore((s) => s.mode === 'comment')
  const shift = useShiftKey()   // hold SHIFT → lock aspect ratio (equal resize), like any canvas tool
  return (
    <>
      <NodeResizer
        isVisible={selected && !commentMode}
        keepAspectRatio={shift}
        minWidth={minWidth}
        minHeight={minHeight}
        onResizeEnd={(_e, d) => setNodeSize(id, Math.round(d.width), Math.round(d.height))}
        lineClassName="fc-rzline"
        handleClassName="fc-rzhandle"
      />
      {children}
      {!commentMode && <PortHandles node={node} />}
    </>
  )
}

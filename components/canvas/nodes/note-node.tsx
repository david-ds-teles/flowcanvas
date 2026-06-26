'use client'
import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { TextNode } from '@/lib/canvas/jsoncanvas'
import { CanvasMarkdown } from '../canvas-markdown'

const SIDES = [Position.Top, Position.Right, Position.Bottom, Position.Left]

function Inner({ data }: NodeProps) {
  const node = (data as { node: TextNode }).node
  return (
    <div className="fc-node--note">
      <span className="fc-note__kicker">note</span>
      <div className="fc-note__body">
        <CanvasMarkdown>{node.text}</CanvasMarkdown>
      </div>
      {SIDES.map((p) => (
        <Handle key={p} type="source" position={p} id={p} />
      ))}
    </div>
  )
}

export const NoteNode = memo(Inner)

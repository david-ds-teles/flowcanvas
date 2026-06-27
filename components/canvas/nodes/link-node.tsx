'use client'
import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { LinkNode as CanvasLinkNode } from '@/lib/canvas/jsoncanvas'

const SIDES = [Position.Top, Position.Right, Position.Bottom, Position.Left]

function Inner({ data }: NodeProps) {
  const node = (data as { node: CanvasLinkNode }).node
  const display = node.url.replace(/^https?:\/\//, '').replace(/\/$/, '')
  return (
    <>
    <a className="fc-node--link" href={node.url} target="_blank" rel="noopener noreferrer" title={node.url}>
      <span className="fc-link__glyph">↗</span>
      <span className="fc-link__main">
        <span className="fc-link__kicker">link</span>
        <span className="fc-link__url">{display}</span>
      </span>
    </a>
    {/* handles outside the chip so all sides stay grabbable (see markdown-node) */}
    {SIDES.map((p) => (
      <Handle key={p} type="source" position={p} id={p} />
    ))}
    </>
  )
}

export const LinkChipNode = memo(Inner)

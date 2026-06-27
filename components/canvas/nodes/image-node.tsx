'use client'
import { memo, useState } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { FileNode } from '@/lib/canvas/jsoncanvas'
import { assetUrl } from '@/lib/api'

const SIDES = [Position.Top, Position.Right, Position.Bottom, Position.Left]

function Inner({ data }: NodeProps) {
  const node = (data as { node: FileNode }).node
  const name = node.file.split('/').pop() ?? node.file
  const [errored, setErrored] = useState(false)
  return (
    <>
    <div className="fc-node fc-node--img" style={{ height: '100%' }}>
      <div className="fc-node__imgwrap">
        {errored ? (
          <span className="fc-node__imgwrap--err">image not found</span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={assetUrl(node.file)} alt={name} loading="lazy" onError={() => setErrored(true)} />
        )}
      </div>
      <span className="fc-node__caption">{name}</span>
    </div>
    {/* handles outside the card so all sides stay grabbable (see markdown-node) */}
    {SIDES.map((p) => (
      <Handle key={p} type="source" position={p} id={p} />
    ))}
    </>
  )
}

export const ImageNode = memo(Inner)

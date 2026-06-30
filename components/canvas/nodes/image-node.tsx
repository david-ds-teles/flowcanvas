'use client'
import { memo, useState } from 'react'
import { type NodeProps } from '@xyflow/react'
import type { FileNode } from '@/lib/canvas/jsoncanvas'
import { assetUrl } from '@/lib/api'
import { NodeResizeFrame } from './node-frame'
import { CommentBadge } from './comment-badge'

function Inner({ id, selected, data }: NodeProps) {
  const node = (data as { node: FileNode }).node
  const name = node.file.split('/').pop() ?? node.file
  const [errored, setErrored] = useState(false)
  return (
    <NodeResizeFrame id={id} node={node} selected={!!selected} minWidth={160} minHeight={120}>
      <div className="fc-node fc-node--img">
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
      <CommentBadge nodeId={id} />
    </NodeResizeFrame>
  )
}

export const ImageNode = memo(Inner)

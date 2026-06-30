'use client'
import { memo } from 'react'
import { type NodeProps } from '@xyflow/react'
import type { CanvasNode } from '@/lib/canvas/jsoncanvas'
import { nodeKind } from '@/lib/canvas/jsoncanvas'
import { PortHandles } from './port-handles'

// Catch-all for nodeKinds without a dedicated component: `group` (JSONCanvas grouping) and
// `file` (a file node whose extension is neither markdown nor an allowed image, e.g. .pdf/.ts).
// Renders a minimal nyx glass card with a kind chip so React Flow never has to fall back to its
// bare "node type not found" box. A full GroupNode (resize/background) can replace this later.
function Inner({ data }: NodeProps) {
  const node = (data as { node: CanvasNode }).node
  const kind = nodeKind(node)
  const label =
    node.type === 'group'
      ? node.label ?? 'group'
      : node.type === 'file'
        ? node.file.split('/').pop() ?? node.file
        : node.id
  return (
    <>
    <div className="fc-node fc-node--fallback">
      <span className="fc-fallback__kind">{kind}</span>
      <span className="fc-fallback__label">{label}</span>
    </div>
    {/* connection ports outside the card so all sides stay grabbable (see markdown-node) */}
    <PortHandles node={node} />
    </>
  )
}

export const FallbackNode = memo(Inner)

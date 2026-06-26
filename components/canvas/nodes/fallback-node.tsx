'use client'
import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { CanvasNode } from '@/lib/canvas/jsoncanvas'
import { nodeKind } from '@/lib/canvas/jsoncanvas'

const SIDES = [Position.Top, Position.Right, Position.Bottom, Position.Left]

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
    <div className="fc-node fc-node--fallback" style={{ width: '100%', height: '100%', padding: '12px 14px' }}>
      <span className="fc-fallback__kind">{kind}</span>
      <span className="fc-fallback__label">{label}</span>
      {SIDES.map((p) => (
        <Handle key={p} type="source" position={p} id={p} />
      ))}
    </div>
  )
}

export const FallbackNode = memo(Inner)

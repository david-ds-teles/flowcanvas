'use client'
import { memo, useState, useRef, useEffect } from 'react'
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react'
import type { GroupNode as CanvasGroupNode, NodeShape } from '@/lib/canvas/jsoncanvas'
import { useCanvasStore } from '@/lib/canvas/store'

const SIDES = [Position.Top, Position.Right, Position.Bottom, Position.Left]

// The outline is an SVG that stretches to the node box (preserveAspectRatio:none) so the same component
// draws a rectangle, an ellipse, or a diamond with a clean, non-scaling stroke at any size.
function ShapeOutline({ shape }: { shape: NodeShape }) {
  const common = { fill: 'var(--fc-group-fill)', stroke: 'var(--fc-group-stroke)', strokeWidth: 1.5, vectorEffect: 'non-scaling-stroke' as const }
  return (
    <svg className="fc-group__svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {shape === 'ellipse' ? (
        <ellipse cx="50" cy="50" rx="49" ry="49" {...common} />
      ) : shape === 'diamond' ? (
        <polygon points="50,1 99,50 50,99 1,50" {...common} />
      ) : (
        <rect x="1" y="1" width="98" height="98" rx="6" {...common} />
      )}
    </svg>
  )
}

// A group/shape node: a resizable, labelable container drawn BEHIND content nodes (zIndex set in the
// adapter) so a rectangle/ellipse/diamond can frame other nodes. Double-click the label to rename;
// drag the node to move it; select it to reveal the resize handles.
function Inner({ id, selected, data }: NodeProps) {
  const node = (data as { node: CanvasGroupNode }).node
  const shape: NodeShape = node.meta?.shape ?? 'rectangle'
  const setNodeLabel = useCanvasStore((s) => s.setNodeLabel)
  const setNodeSize = useCanvasStore((s) => s.setNodeSize)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(node.label ?? '')
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => { if (editing) { ref.current?.focus(); ref.current?.select() } }, [editing])

  const commit = () => { setEditing(false); if (draft !== (node.label ?? '')) setNodeLabel(id, draft) }
  const cancel = () => { setEditing(false); setDraft(node.label ?? '') }

  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={120}
        minHeight={80}
        onResizeEnd={(_e, p) => setNodeSize(id, Math.round(p.width), Math.round(p.height))}
        lineClassName="fc-group__rzline"
        handleClassName="fc-group__rzhandle"
      />
      <div className={`fc-group fc-group--${shape}`} style={{ width: '100%', height: '100%' }}>
        <ShapeOutline shape={shape} />
        <div className="fc-group__label nodrag" onDoubleClick={() => { setDraft(node.label ?? ''); setEditing(true) }}>
          {editing ? (
            <input
              ref={ref}
              className="fc-group__input nopan"
              value={draft}
              aria-label="Edit group label"
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onPointerDownCapture={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                e.stopPropagation()
                if (e.key === 'Enter') { e.preventDefault(); commit() }
                if (e.key === 'Escape') { e.preventDefault(); cancel() }
              }}
            />
          ) : (
            <span>{node.label || 'group'}</span>
          )}
        </div>
      </div>
      {SIDES.map((p) => <Handle key={p} type="source" position={p} id={p} />)}
    </>
  )
}

export const GroupNode = memo(Inner)

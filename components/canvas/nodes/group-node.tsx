'use client'
import { memo, useState, useRef, useEffect, type CSSProperties } from 'react'
import { NodeResizer, type NodeProps } from '@xyflow/react'
import type { GroupNode as CanvasGroupNode, NodeShape } from '@/lib/canvas/jsoncanvas'
import { useCanvasStore } from '@/lib/canvas/store'
import { useShiftKey } from './use-shift-key'
import { NodeFormatBar } from './node-format-bar'
import { PortHandles } from './port-handles'

const SHAPES: { key: NodeShape; glyph: string; label: string }[] = [
  { key: 'rectangle', glyph: '▭', label: 'Rectangle' },
  { key: 'ellipse', glyph: '◯', label: 'Ellipse' },
  { key: 'diamond', glyph: '◇', label: 'Diamond' },
]

// The outline is a single real shape stretched to the node box (preserveAspectRatio:none). ONLY the
// painted shape captures pointer events — `.fc-group` itself is pointer-events:none — so the node's
// hit area is the ellipse/diamond, not the rectangular bounding box. Selection highlights the shape
// stroke (React Flow's rectangular .selected box is suppressed for groups in CSS).
function ShapeOutline({ shape, selected }: { shape: NodeShape; selected: boolean }) {
  // Rest: a clearly-indigo DASHED container (design system §8) so it reads as an intentional shape,
  // not a faint gray smudge. Selected: the dashes close up to a solid, glowing ring.
  const a = {
    fill: 'var(--fc-group-fill)',
    stroke: selected ? 'var(--color-primary)' : 'var(--fc-group-stroke)',
    strokeWidth: selected ? 2.25 : 1.75,
    strokeDasharray: selected ? undefined : '7 5',
    vectorEffect: 'non-scaling-stroke' as const,
    style: selected ? { filter: 'drop-shadow(0 0 6px rgba(192,193,255,.7))' } : undefined,
  }
  return (
    <svg className="fc-group__svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      {shape === 'ellipse' ? (
        <ellipse cx="50" cy="50" rx="50" ry="50" {...a} />
      ) : shape === 'diamond' ? (
        <polygon points="50,0 100,50 50,100 0,50" {...a} />
      ) : (
        <rect x="0" y="0" width="100" height="100" {...a} />
      )}
    </svg>
  )
}

function Inner({ id, selected, data }: NodeProps) {
  const node = (data as { node: CanvasGroupNode }).node
  const shape: NodeShape = node.meta?.shape ?? 'rectangle'
  const setNodeLabel = useCanvasStore((s) => s.setNodeLabel)
  const setNodeSize = useCanvasStore((s) => s.setNodeSize)
  const setNodeShape = useCanvasStore((s) => s.setNodeShape)
  const shift = useShiftKey()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(node.label ?? '')
  const ref = useRef<HTMLInputElement>(null)

  const align = node.meta?.align
  const valign = node.meta?.valign
  // meta.fill overrides the default group interior tint; node.color tints the outline via the adapter.
  const fillStyle: CSSProperties = node.meta?.fill ? ({ ['--fc-group-fill']: node.meta.fill } as CSSProperties) : {}
  const labelStyle: CSSProperties = {
    ...(align === 'center' ? { left: '50%', right: 'auto' } : align === 'right' ? { left: 'auto', right: 16 } : align === 'left' ? { left: 16, right: 'auto' } : null),
    ...(valign === 'middle' ? { top: '50%', bottom: 'auto' } : valign === 'bottom' ? { top: 'auto', bottom: 14 } : valign === 'top' ? { top: 14, bottom: 'auto' } : null),
    ...((align === 'center' || valign === 'middle') ? { transform: `${align === 'center' ? 'translateX(-50%)' : ''} ${valign === 'middle' ? 'translateY(-50%)' : ''}`.trim() } : null),
    ...(align ? { textAlign: align } : null),
  }

  useEffect(() => { if (editing) { ref.current?.focus(); ref.current?.select() } }, [editing])

  const commit = () => { setEditing(false); if (draft !== (node.label ?? '')) setNodeLabel(id, draft) }
  const cancel = () => { setEditing(false); setDraft(node.label ?? '') }

  return (
    <>
      <NodeResizer
        isVisible={!!selected}
        keepAspectRatio={shift}
        minWidth={120}
        minHeight={80}
        onResizeEnd={(_e, p) => setNodeSize(id, Math.round(p.width), Math.round(p.height), Math.round(p.x), Math.round(p.y))}
        lineClassName="fc-group__rzline"
        handleClassName="fc-group__rzhandle"
      />

      {/* shape switcher (leading) + alignment / colour / fill format bar — shown while selected */}
      {selected && (
        <NodeFormatBar
          id={id}
          node={node}
          leading={SHAPES.map((s) => (
            <button
              key={s.key}
              type="button"
              className={`fc-fmt-btn${shape === s.key ? ' is-on' : ''}`}
              title={s.label}
              aria-label={s.label}
              aria-pressed={shape === s.key}
              onClick={() => setNodeShape(id, s.key)}
            >
              {s.glyph}
            </button>
          ))}
        />
      )}

      <div className={`fc-group fc-group--${shape}`} style={fillStyle}>
        <ShapeOutline shape={shape} selected={!!selected} />
        <div className="fc-group__label nodrag" style={labelStyle} onDoubleClick={() => { setDraft(node.label ?? ''); setEditing(true) }}>
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
          ) : node.label ? (
            <span>{node.label}</span>
          ) : selected ? (
            <span className="fc-group__label--empty">label</span>
          ) : null}
        </div>
      </div>

      <PortHandles node={node} />
    </>
  )
}

export const GroupNode = memo(Inner)

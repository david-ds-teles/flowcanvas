'use client'
import { memo, useRef, useState } from 'react'
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react'
import { useCanvasStore } from '@/lib/canvas/store'
import type { EdgeOrigin } from '@/lib/canvas/jsoncanvas'

// Provenance → stroke (design § Design System): links muted + dashed + lock (auto-derived),
// user solid indigo, agent neon cyan glow.
const STROKE: Record<EdgeOrigin, string> = {
  links: 'var(--color-outline)',
  user: 'var(--color-primary)',
  agent: 'var(--color-neon-cyan)',
}

// In-canvas label editor — replaces the old window.prompt. Mounts only while this edge is being
// edited, so it seeds once from the current label and autofocuses. Enter / blur commit, Esc cancels.
function EdgeLabelEditor({ id, initial, x, y }: { id: string; initial: string; x: number; y: number }) {
  const relabelEdge = useCanvasStore((s) => s.relabelEdge)
  const setEditingEdge = useCanvasStore((s) => s.setEditingEdge)
  const [value, setValue] = useState(initial)
  const closed = useRef(false)
  const finish = (save: boolean) => {
    if (closed.current) return // guard the Enter→blur and Esc→blur double-fire
    closed.current = true
    if (save) relabelEdge(id, value.trim())
    // Only collapse the editor if it's still ours: a rapid second connect can advance editingEdgeId
    // to a new edge before this (now detached) input blurs — don't clobber the new editor with null.
    if (useCanvasStore.getState().editingEdgeId === id) setEditingEdge(null)
  }
  return (
    <EdgeLabelRenderer>
      <input
        className="fc-edge-input nodrag nopan"
        autoFocus
        value={value}
        placeholder="label…"
        aria-label="Edge label"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation() // keep React Flow from hijacking Backspace/arrows/etc. while typing
          if (e.key === 'Enter') { e.preventDefault(); finish(true) }
          else if (e.key === 'Escape') { e.preventDefault(); finish(false) }
        }}
        onBlur={() => finish(true)}
        onClick={(e) => e.stopPropagation()}
        style={{ transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`, pointerEvents: 'all' }}
      />
    </EdgeLabelRenderer>
  )
}

export const LabeledEdge = memo(function LabeledEdge({
  id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, label, data,
}: EdgeProps) {
  const [path, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })
  const origin = ((data as { origin?: EdgeOrigin } | undefined)?.origin ?? 'user') as EdgeOrigin
  const derived = origin === 'links'
  const editing = useCanvasStore((s) => s.editingEdgeId === id)
  const setEditingEdge = useCanvasStore((s) => s.setEditingEdge)
  const text = typeof label === 'string' ? label : ''

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{ stroke: STROKE[origin] ?? STROKE.user, strokeWidth: 1.5, strokeDasharray: derived ? '5 4' : undefined }}
      />
      {editing ? (
        <EdgeLabelEditor id={id} initial={text} x={labelX} y={labelY} />
      ) : (
        text !== '' && (
          <EdgeLabelRenderer>
            <div
              className={`fc-edge-label fc-edge-label--${origin} nodrag nopan`}
              style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`, pointerEvents: 'all' }}
              title="Double-click to edit"
              onDoubleClick={(e) => { e.stopPropagation(); setEditingEdge(id) }}
            >
              {derived && <span className="fc-edge-label__lock" aria-label="derived from links">🔒</span>}
              {text}
            </div>
          </EdgeLabelRenderer>
        )
      )}
    </>
  )
})

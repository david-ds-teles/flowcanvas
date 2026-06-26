'use client'
import { memo } from 'react'
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react'
import type { EdgeOrigin } from '@/lib/canvas/jsoncanvas'

// Provenance → stroke (design § Design System): links muted + dashed + lock (auto-derived),
// user solid indigo, agent neon cyan glow.
const STROKE: Record<EdgeOrigin, string> = {
  links: 'var(--color-outline)',
  user: 'var(--color-primary)',
  agent: 'var(--color-neon-cyan)',
}

export const LabeledEdge = memo(function LabeledEdge({
  id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, label, data,
}: EdgeProps) {
  const [path, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition })
  const origin = ((data as { origin?: EdgeOrigin } | undefined)?.origin ?? 'user') as EdgeOrigin
  const derived = origin === 'links'

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{ stroke: STROKE[origin] ?? STROKE.user, strokeWidth: 1.5, strokeDasharray: derived ? '5 4' : undefined }}
      />
      {label != null && label !== '' && (
        <EdgeLabelRenderer>
          <div
            className={`fc-edge-label fc-edge-label--${origin}`}
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          >
            {derived && <span className="fc-edge-label__lock" aria-label="derived from links">🔒</span>}
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
})

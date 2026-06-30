'use client'
import { useStore } from '@xyflow/react'
import type { EdgeEnd } from '@/lib/canvas/jsoncanvas'
import { EDGE_TYPES, EDGE_TYPE_STYLE } from '@/lib/canvas/jsoncanvas'
import { useCanvasStore } from '@/lib/canvas/store'
import { colorVar } from '@/lib/canvas/adapter'

/** Small head glyph drawn at the right end of a legend swatch line, matching the edge end-marker shapes. */
function HeadGlyph({ end, color }: { end: EdgeEnd; color: string }) {
  switch (end) {
    case 'arrow':      return <polygon points="32,6 25,2.5 25,9.5" fill={color} />
    case 'arrow-open': return <polyline points="25,2.5 32,6 25,9.5" fill="none" stroke={color} strokeWidth="1.4" />
    case 'diamond':    return <polygon points="32,6 27,2.5 22,6 27,9.5" fill={color} />
    case 'circle':     return <circle cx="28" cy="6" r="3.2" fill="none" stroke={color} strokeWidth="1.4" />
    default:           return null
  }
}

/**
 * 006 — on-canvas flow-type legend that DOUBLES AS the edge-type picker (design Decision 2). Always
 * readable as a colour/line/head key; when an edge is selected, clicking a row sets that edge's flow type
 * (and the row highlights the selected edge's current type). Pinned to a canvas corner by `studio-edge.css`.
 */
export function EdgeLegend() {
  const selectedEdgeId = useStore((s) => s.edges.find((e) => e.selected)?.id ?? null)
  const selectedEdgeType = useStore((s) => {
    const e = s.edges.find((x) => x.selected)
    return (e?.data as { edgeType?: string } | undefined)?.edgeType ?? null
  })
  const setEdgeType = useCanvasStore((s) => s.setEdgeType)
  return (
    <div
      className="fc-legend nodrag nopan"
      data-testid="edge-legend"
      aria-label="Edge flow types"
      // Keep the click inside the legend: without this, the pointerdown bubbles to React Flow, which
      // deselects the edge before the button's onClick fires (disabling it), so the type never applies.
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="fc-legend__title">Flow types{selectedEdgeId ? ' · click to set' : ''}</div>
      <div className="fc-legend__rows">
        {EDGE_TYPES.map((t) => {
          const s = EDGE_TYPE_STYLE[t]
          const stroke = colorVar(s.color) ?? '#8b93a7'
          const active = selectedEdgeType === t
          return (
            <button
              key={t}
              type="button"
              className={`fc-legend__row${active ? ' is-active' : ''}`}
              data-testid={`legend-${t}`}
              disabled={!selectedEdgeId}
              aria-pressed={active}
              title={selectedEdgeId ? `Set selected edge → ${s.label}` : s.label}
              onClick={() => { if (selectedEdgeId) setEdgeType(selectedEdgeId, t) }}
            >
              <svg className="fc-legend__swatch" width="36" height="12" viewBox="0 0 36 12" aria-hidden="true">
                <line
                  x1="2" y1="6" x2="32" y2="6" stroke={stroke} strokeWidth="2"
                  strokeDasharray={s.line === 'dashed' ? '5 3' : s.line === 'dotted' ? '1.5 3' : undefined}
                />
                <HeadGlyph end={s.toEnd} color={stroke} />
              </svg>
              <span className="fc-legend__label">{s.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

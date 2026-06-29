'use client'
import { memo, useRef, useState } from 'react'
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from '@xyflow/react'
import { useCanvasStore } from '@/lib/canvas/store'
import type { EdgeOrigin, RelationshipType } from '@/lib/canvas/jsoncanvas'
import { RELATIONSHIP_TYPES } from '@/lib/canvas/jsoncanvas'

// Provenance → stroke (design § Design System): links muted + dashed, user solid indigo, agent neon
// cyan glow, import violet (extraction-seeded). v2 edges also carry a typed `rel` (Decision 1/7).
const STROKE: Record<EdgeOrigin, string> = {
  links: 'var(--color-outline)',
  user: 'var(--color-primary)',
  agent: 'var(--color-neon-cyan)',
  import: 'var(--color-secondary)', // v2 — extraction-seeded edge (matches the mockup's violet .e-import)
}

// In-canvas quick label editor — replaces the old window.prompt. Mounts only while this edge is being
// edited (double-click, the bar's ✎, or a freshly-drawn edge), seeds once from the current label.
function EdgeLabelEditor({ id, initial, x, y }: { id: string; initial: string; x: number; y: number }) {
  const relabelEdge = useCanvasStore((s) => s.relabelEdge)
  const setEditingEdge = useCanvasStore((s) => s.setEditingEdge)
  const [value, setValue] = useState(initial)
  const closed = useRef(false)
  const finish = (save: boolean) => {
    if (closed.current) return // guard the Enter→blur and Esc→blur double-fire
    closed.current = true
    if (save) relabelEdge(id, value.trim())
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
          e.stopPropagation()
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

// Typed-relationship picker (Decision 1/7) — a curated rel grid + a free-form label field. Delete moved
// OUT to the EdgeActionBar (single delete surface, design Decision 2). Anchored below the action bar.
function RelPicker({ id, rel, label, x, y, onClose }: { id: string; rel: RelationshipType; label: string; x: number; y: number; onClose: () => void }) {
  const setEdgeRel = useCanvasStore((s) => s.setEdgeRel)
  const relabelEdge = useCanvasStore((s) => s.relabelEdge)
  const [text, setText] = useState(label)
  return (
    <div
      id={`fc-rel-picker-${id}`}
      className="fc-relpick nodrag nopan"
      data-testid="edge-rel-picker"
      style={{ transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`, pointerEvents: 'all' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="fc-relpick__grid">
        {RELATIONSHIP_TYPES.map((r) => (
          <button
            key={r}
            type="button"
            className="fc-relpick__opt"
            data-testid="edge-rel-option"
            aria-pressed={r === rel}
            onClick={() => setEdgeRel(id, r)}
          >
            {r}
          </button>
        ))}
      </div>
      <div className="fc-relpick__row">
        <input
          className="fc-relpick__input"
          data-testid="edge-label-input"
          value={text}
          placeholder="label…"
          aria-label="Edge label"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation()
            if (e.key === 'Enter') { e.preventDefault(); relabelEdge(id, text.trim()); onClose() }
            else if (e.key === 'Escape') { e.preventDefault(); onClose() }
          }}
        />
        <button type="button" className="fc-relpick__apply" onClick={() => { relabelEdge(id, text.trim()); onClose() }}>Apply</button>
      </div>
    </div>
  )
}

// Selected-edge action bar (Decision 2) — the visible affordance: rel ▾ · ✎ Label · ✕. Portaled just
// below the label pill; reuses setEdgeRel (via RelPicker) / relabelEdge (via EdgeLabelEditor) /
// removeEdgeWriteback verbatim. This is now the ONLY delete surface for an edge.
function EdgeActionBar({ id, x, y, picker, onRel, onLabel }: { id: string; x: number; y: number; picker: boolean; onRel: () => void; onLabel: () => void }) {
  const removeEdgeWriteback = useCanvasStore((s) => s.removeEdgeWriteback)
  return (
    <div
      className="fc-edge-actions nodrag nopan"
      data-testid="edge-action-bar"
      style={{ transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`, pointerEvents: 'all' }}
      onClick={(e) => e.stopPropagation()}
    >
      <button type="button" className="fc-edge-actions__btn" data-testid="edge-action-rel" aria-expanded={picker} aria-controls={`fc-rel-picker-${id}`} title="Set relationship type" onClick={onRel}>rel ▾</button>
      <button type="button" className="fc-edge-actions__btn" data-testid="edge-action-label" title="Edit label" aria-label="Edit label" onClick={onLabel}>✎ Label</button>
      <button type="button" className="fc-edge-actions__btn fc-edge-actions__btn--del" data-testid="edge-delete" title="Delete this connection" aria-label="Delete connection" onClick={() => removeEdgeWriteback(id)}>✕</button>
    </div>
  )
}

export const LabeledEdge = memo(function LabeledEdge({
  id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, label, data, selected,
}: EdgeProps) {
  // Orthogonal right-angle routing (fewer crossings than bezier).
  const [path, labelX, labelY] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: 8 })
  const d = data as { origin?: EdgeOrigin; rel?: RelationshipType } | undefined
  const origin = (d?.origin ?? 'user') as EdgeOrigin
  const rel = (d?.rel ?? 'related') as RelationshipType
  const derived = origin === 'links'
  const editing = useCanvasStore((s) => s.editingEdgeId === id)
  const setEditingEdge = useCanvasStore((s) => s.setEditingEdge)
  const [picker, setPicker] = useState(false)
  // Close the rel picker when the edge is deselected — the picker is an affordance of a selected edge,
  // so it should not linger (and this avoids the y-offset shift when the action bar unmounts). Render-
  // phase reset is the React-sanctioned alternative to a setState-in-effect (see comment-layer.tsx).
  const [prevSelected, setPrevSelected] = useState(selected)
  if (prevSelected !== selected) {
    setPrevSelected(selected)
    if (!selected && picker) setPicker(false)
  }
  const text = typeof label === 'string' ? label : ''

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{ stroke: STROKE[origin] ?? STROKE.user, strokeWidth: selected ? 2.5 : 1.5, strokeDasharray: derived ? '5 4' : undefined }}
      />
      {editing ? (
        <EdgeLabelEditor id={id} initial={text} x={labelX} y={labelY} />
      ) : (
        <EdgeLabelRenderer>
          {/* Typed-edge pill — rel eyebrow + free-form label. Click → rel picker; double-click → quick label edit. */}
          <div
            className={`fc-edge-label fc-edge-label--${origin} nodrag nopan`}
            data-testid="edge-rel-pill"
            aria-expanded={picker}
            aria-controls={`fc-rel-picker-${id}`}
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`, pointerEvents: 'all' }}
            title="Click to set relationship · double-click to edit label"
            onClick={(e) => { e.stopPropagation(); setPicker((v) => !v) }}
            onDoubleClick={(e) => { e.stopPropagation(); setPicker(false); setEditingEdge(id) }}
          >
            {derived && <span className="fc-edge-label__lock" aria-label="derived from links">🔒</span>}
            <span className="fc-edge-label__rel">{rel}</span>
            {text !== '' && <span className="fc-edge-label__text">{text}</span>}
          </div>
          {selected && (
            <EdgeActionBar
              id={id}
              x={labelX}
              y={labelY + 24}
              picker={picker}
              onRel={() => setPicker((v) => !v)}
              onLabel={() => { setPicker(false); setEditingEdge(id) }}
            />
          )}
          {picker && <RelPicker id={id} rel={rel} label={text} x={labelX} y={labelY + (selected ? 56 : 28)} onClose={() => setPicker(false)} />}
        </EdgeLabelRenderer>
      )}
    </>
  )
})

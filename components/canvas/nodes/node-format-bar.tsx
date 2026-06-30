'use client'
import type { ReactNode } from 'react'
import type { CanvasNode } from '@/lib/canvas/jsoncanvas'
import { useCanvasStore } from '@/lib/canvas/store'
import { ColorPicker } from '@/components/ui/color-picker'

// Shared floating format bar shown above a selected text/note or shape node. Writes alignment +
// foreground colour + fill through the store (setNodeAlign / setNodeColor / setNodeFill); the node
// component reads those fields back and paints them. `leading` lets a shape node prepend its own
// controls (the rectangle/ellipse/diamond switcher) so everything lives in one bar.
type Align = NonNullable<CanvasNode['meta']>['align']
type VAlign = NonNullable<CanvasNode['meta']>['valign']

const H_ALIGNS: { key: NonNullable<Align>; label: string }[] = [
  { key: 'left', label: 'Align left' },
  { key: 'center', label: 'Align centre' },
  { key: 'right', label: 'Align right' },
]
const V_ALIGNS: { key: NonNullable<VAlign>; label: string; cy: number }[] = [
  { key: 'top', label: 'Align top', cy: 6 },
  { key: 'middle', label: 'Align middle', cy: 12 },
  { key: 'bottom', label: 'Align bottom', cy: 18 },
]

// Three text-line rows, each row's horizontal offset keyed off the alignment so the icon reads.
function HIcon({ a }: { a: NonNullable<Align> }) {
  const rows = a === 'left' ? [2, 2, 2] : a === 'right' ? [10, 6, 12] : [5, 7, 6]
  const w = a === 'left' ? [16, 12, 14] : a === 'right' ? [12, 16, 10] : [14, 10, 12]
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <path d={`M${rows[0]} 7h${w[0]}`} /><path d={`M${rows[1]} 12h${w[1]}`} /><path d={`M${rows[2]} 17h${w[2]}`} />
    </svg>
  )
}
function VIcon({ cy }: { cy: number }) {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <rect x="6" y="4" width="12" height="16" rx="1.5" opacity="0.4" /><path d={`M9 ${cy}h6`} />
    </svg>
  )
}

export function NodeFormatBar({ id, node, leading }: { id: string; node: CanvasNode; leading?: ReactNode }) {
  const setNodeAlign = useCanvasStore((s) => s.setNodeAlign)
  const setNodeColor = useCanvasStore((s) => s.setNodeColor)
  const setNodeFill = useCanvasStore((s) => s.setNodeFill)
  const align = node.meta?.align
  const valign = node.meta?.valign
  const color = node.color
  const fill = node.meta?.fill

  return (
    <div className="fc-fmt-bar nodrag nopan" onPointerDownCapture={(e) => e.stopPropagation()} data-testid="node-format-bar">
      {leading && <><span className="fc-fmt-group">{leading}</span><span className="fc-fmt-div" aria-hidden="true" /></>}

      <span className="fc-fmt-group" role="group" aria-label="Horizontal align">
        {H_ALIGNS.map((h) => (
          <button
            key={h.key}
            type="button"
            className={`fc-fmt-btn${align === h.key ? ' is-on' : ''}`}
            data-testid={`fmt-align-${h.key}`}
            title={h.label}
            aria-label={h.label}
            aria-pressed={align === h.key}
            onClick={() => setNodeAlign(id, align === h.key ? undefined : h.key, valign)}
          >
            <HIcon a={h.key} />
          </button>
        ))}
      </span>

      <span className="fc-fmt-group" role="group" aria-label="Vertical align">
        {V_ALIGNS.map((v) => (
          <button
            key={v.key}
            type="button"
            className={`fc-fmt-btn${valign === v.key ? ' is-on' : ''}`}
            data-testid={`fmt-valign-${v.key}`}
            title={v.label}
            aria-label={v.label}
            aria-pressed={valign === v.key}
            onClick={() => setNodeAlign(id, align, valign === v.key ? undefined : v.key)}
          >
            <VIcon cy={v.cy} />
          </button>
        ))}
      </span>

      <span className="fc-fmt-div" aria-hidden="true" />

      {/* 006 — node text + fill colour use the shared <ColorPicker> (same component as the edge colour). */}
      <span className="fc-fmt-group fc-fmt-group--color" role="group" aria-label="Text colour" data-testid="fmt-color">
        <span className="fc-fmt-collabel" aria-hidden="true">A</span>
        <ColorPicker value={color} onChange={(c) => setNodeColor(id, c)} onClear={color ? () => setNodeColor(id, undefined) : undefined} label="Text colour" />
      </span>
      <span className="fc-fmt-div" aria-hidden="true" />
      <span className="fc-fmt-group fc-fmt-group--color" role="group" aria-label="Fill colour" data-testid="fmt-fill">
        <span className="fc-fmt-collabel fc-fmt-collabel--fill" aria-hidden="true" />
        <ColorPicker value={fill} onChange={(c) => setNodeFill(id, c)} onClear={fill ? () => setNodeFill(id, undefined) : undefined} label="Fill colour" />
      </span>
    </div>
  )
}

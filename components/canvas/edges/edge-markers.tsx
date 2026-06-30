'use client'
// 005-edges — per-edge SVG <marker> defs for configurable, COLORED arrowheads. Rendered inside each
// edge's OWN svg fragment (the same root as its <path>) and filled with that edge's resolved stroke
// color, so heads always match the line and the nyx palette. This replaces the earlier shared
// `context-stroke` markers, which rendered black: context-fill/stroke does not resolve when the marker
// def lives in a separate <svg> root from the referencing path (React Flow's layout).
import type { EdgeEnd } from '@/lib/canvas/jsoncanvas'

const markerDomId = (edgeId: string, which: 'start' | 'end') => `fc-mk-${edgeId}-${which}`

/** url(#…) reference for one end, or undefined for none/absent (BaseEdge then draws no marker there). */
export function edgeMarkerUrl(edgeId: string, which: 'start' | 'end', end: EdgeEnd | undefined): string | undefined {
  return !end || end === 'none' ? undefined : `url(#${markerDomId(edgeId, which)})`
}

function MarkerShape({ end, color }: { end: EdgeEnd; color: string }) {
  switch (end) {
    case 'arrow':      return <path d="M0,0 L10,5 L0,10 z" style={{ fill: color }} />
    case 'arrow-open': return <path d="M1,1 L9,5 L1,9" style={{ fill: 'none', stroke: color, strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }} />
    case 'circle':     return <circle cx="5" cy="5" r="4" style={{ fill: color }} />
    case 'diamond':    return <path d="M6,1 L11,6 L6,11 L1,6 z" style={{ fill: color }} />
    default:           return null
  }
}

/** A colored <marker> def for one edge end. Renders nothing for none/absent. Place inside an SVG <defs>. */
export function EdgeEndMarker({ edgeId, which, end, color }: { edgeId: string; which: 'start' | 'end'; end: EdgeEnd | undefined; color: string }) {
  if (!end || end === 'none') return null
  const viewBox = end === 'diamond' ? '0 0 12 12' : '0 0 10 10'
  const refX = end === 'diamond' ? 10.5 : end === 'circle' ? 5 : 8.5
  const refY = end === 'diamond' ? 6 : 5
  // A start marker reverses so it points back out of the source node; an end marker follows the path.
  const orient = which === 'start' ? 'auto-start-reverse' : 'auto'
  return (
    <marker id={markerDomId(edgeId, which)} viewBox={viewBox} refX={refX} refY={refY} markerWidth={7} markerHeight={7} orient={orient}>
      <MarkerShape end={end} color={color} />
    </marker>
  )
}

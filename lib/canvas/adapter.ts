import { MarkerType, type Node as RFNode, type Edge as RFEdge } from '@xyflow/react'
import type { CSSProperties } from 'react'
import type { FlowcanvasDoc, CanvasNode, CanvasEdge, CanvasColor, Side, EdgeOrigin } from './jsoncanvas'
import { nodeKind } from './jsoncanvas'

const PRESET: Record<string, string> = { '1': '#ff516a', '2': '#f59f00', '3': '#e3b341', '4': '#b6f36a', '5': '#5ef2ff', '6': '#a371f7' }   // nyx §2.4
export const colorVar = (c?: CanvasColor): string | undefined => (!c ? undefined : c.startsWith('#') ? c : PRESET[c])

export function toReactFlow(doc: FlowcanvasDoc): { nodes: RFNode[]; edges: RFEdge[] } {
  const nodes = doc.nodes.map<RFNode>((n) => {
    const kind = nodeKind(n)                              // 'markdown'|'image'|'link'|'note'|'file'|'group'
    const autoHeight = kind === 'markdown'                // content-sized so the collapse toggle visibly shrinks the card
    const vars: Record<string, string> = {}
    if (n.color) vars['--node-accent'] = colorVar(n.color) ?? ''
    if (autoHeight) vars['--fc-body-max'] = `${Math.max(72, n.height - 88)}px`   // clamp the rendered body to ~the authored box
    return {
      id: n.id,
      type: kind,
      position: { x: n.x, y: n.y },
      width: n.width,
      height: autoHeight ? undefined : n.height,         // markdown auto-measures; others keep the authored box
      data: { node: n },
      style: Object.keys(vars).length ? (vars as CSSProperties) : undefined,
    }
  })
  const edges = doc.edges.map<RFEdge>((e) => ({
    id: e.id, source: e.fromNode, target: e.toNode,
    sourceHandle: e.fromSide, targetHandle: e.toSide,
    type: 'labeled', label: e.label,
    data: { origin: e.meta?.origin ?? 'user' },
    markerEnd: (e.toEnd ?? 'arrow') !== 'none' ? { type: MarkerType.ArrowClosed } : undefined,
  }))
  return { nodes, edges }
}

/** Map React Flow geometry back onto the prior doc, preserving meta/type/comments/session. */
export function toJSONCanvas(rfNodes: RFNode[], rfEdges: RFEdge[], prev: FlowcanvasDoc): FlowcanvasDoc {
  const prevNodeById = new Map(prev.nodes.map((n) => [n.id, n]))
  const prevEdgeById = new Map(prev.edges.map((e) => [e.id, e]))
  const nodes: CanvasNode[] = rfNodes.map((rn) => {
    const base = prevNodeById.get(rn.id)
    if (!base) throw new Error(`unknown node in RF state: ${rn.id}`)
    return { ...base, x: rn.position.x, y: rn.position.y, width: rn.width ?? base.width, height: rn.height ?? base.height }
  })
  const edges: CanvasEdge[] = rfEdges.map((re) => {
    const base = prevEdgeById.get(re.id)                 // carry color / fromEnd / toEnd that RF state does not model
    const origin = (re.data as { origin?: EdgeOrigin } | undefined)?.origin
    return {
      ...base,
      id: re.id, fromNode: re.source, toNode: re.target,
      fromSide: re.sourceHandle as Side | undefined, toSide: re.targetHandle as Side | undefined,
      label: typeof re.label === 'string' ? re.label : undefined,
      toEnd: base?.toEnd ?? 'arrow',
      meta: { origin: origin ?? base?.meta?.origin },
    }
  })
  return { ...prev, nodes, edges }
}

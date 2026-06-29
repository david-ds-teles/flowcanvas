'use client'
import { memo, type ReactElement } from 'react'
import { type NodeProps } from '@xyflow/react'
import type { CanvasNode, ComponentKind } from '@/lib/canvas/jsoncanvas'
import { COMPONENT_KIND_META } from '@/lib/canvas/jsoncanvas'
import { useCanvasStore } from '@/lib/canvas/store'
import { cn } from '@/lib/utils'
import { basename } from '../frontmatter-view'
import { NodeResizeFrame } from './node-frame'
import { CommentBadge } from './comment-badge'

// 004 Phase 2 — the system-design component widget. A node with meta.kind (and type !== 'group') is
// routed here by adapter.toReactFlow (renderType 'component'). Glyph/label come from COMPONENT_KIND_META;
// the per-kind accent + silhouette are applied in nodes.css off data-kind / data-silhouette (the mockup's
// palette: service=cyan · datastore=lime · queue=amber · actor=violet · external=rose · decision=indigo).

const GLYPHS: Record<string, ReactElement> = {
  server:   <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M4 10h16M9 4v16" /></>,
  database: <><ellipse cx="12" cy="6" rx="7" ry="3" /><path d="M5 6v12c0 1.6 3.1 3 7 3s7-1.4 7-3V6" /></>,
  layers:   <path d="M5 5v14M9 5v14M13 7l6 5-6 5" />,
  person:   <><circle cx="12" cy="8" r="4" /><path d="M5 21c0-4 3-6 7-6s7 2 7 6" /></>,
  cloud:    <path d="M6 16a4 4 0 010-8 5 5 0 019.6-1.5A3.5 3.5 0 0118 16z" />,
  diamond:  <path d="M12 3l9 9-9 9-9-9z" />,
  gear:     <><circle cx="12" cy="12" r="3.2" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></>,
  frame:    <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M4 9h16M9 9v11" /></>,
}

function KindGlyph({ glyph }: { glyph: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {GLYPHS[glyph] ?? GLYPHS.frame}
    </svg>
  )
}

/** First meaningful line of markdown — strips frontmatter heading markup; clamped for the one-line role. */
function oneLine(s: string | undefined | null): string {
  if (!s) return ''
  for (const raw of s.split('\n')) {
    const line = raw.replace(/^#+\s*/, '').trim()
    if (line) return line.length > 90 ? line.slice(0, 88) + '…' : line
  }
  return ''
}

function Inner({ id, selected, data }: NodeProps) {
  const node = (data as { node: CanvasNode }).node
  const kind = node.meta?.kind as ComponentKind | undefined
  const meta = kind ? COMPONENT_KIND_META[kind] : undefined
  const body = useCanvasStore((s) => s.bodyFor(id))
  const highlightSpineSection = useCanvasStore((s) => s.highlightSpineSection)   // 004 Phase 4 — § chip → spine

  const fm = node.type === 'file' ? (node.meta?.frontmatter ?? {}) : {}
  const name =
    node.type === 'file' ? String(fm.name ?? basename(node.file))
    : node.type === 'link' ? node.url
    : node.type === 'text' ? (oneLine(node.text) || 'Component')
    : 'Component'
  const role =
    String(fm.description ?? fm.summary ?? '') ||
    (node.type === 'file' ? oneLine(body) : node.type === 'text' ? oneLine(node.text.split('\n').slice(1).join('\n')) : '')
  const anchor = node.meta?.source?.anchor

  return (
    <NodeResizeFrame id={id} selected={!!selected} minWidth={180} minHeight={96}>
      <div
        className={cn('fc-cmp', meta ? `fc-cmp--${kind}` : 'fc-cmp--unknown')}
        data-testid="component-node"
        data-kind={kind ?? 'unknown'}
        data-silhouette={meta?.silhouette ?? 'box'}
      >
        <div className="fc-cmp__h">
          <span className="fc-cmp__ic"><KindGlyph glyph={meta?.glyph ?? 'frame'} /></span>
          <div className="fc-cmp__head">
            <div className="fc-cmp__nm" title={name}>{name}</div>
            <div className="fc-cmp__kind">{meta?.label ?? kind ?? 'component'}</div>
          </div>
        </div>
        {role && <div className="fc-cmp__role">{role}</div>}
        {anchor && (
          <button
            type="button"
            className="fc-cmp__src nodrag nopan"
            data-testid="component-source-chip"
            title={`source · §${anchor} — highlight in the core-doc spine`}
            onClick={(e) => { e.stopPropagation(); highlightSpineSection(anchor) }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M5 4h14v16H5zM8 9h8M8 13h6" /></svg>
            <span className="fc-cmp__src-tx">§{anchor}</span>
          </button>
        )}
      </div>
      <CommentBadge nodeId={id} />
    </NodeResizeFrame>
  )
}

export const ComponentNode = memo(Inner)

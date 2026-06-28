'use client'
import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { FileNode } from '@/lib/canvas/jsoncanvas'
import { useCanvasStore } from '@/lib/canvas/store'
import { cn } from '@/lib/utils'
import { CanvasMarkdown } from '../canvas-markdown'
import { FrontmatterView, basename } from '../frontmatter-view'

const SIDES = [Position.Top, Position.Right, Position.Bottom, Position.Left]

function Inner({ id, data }: NodeProps) {
  const node = (data as { node: FileNode }).node
  const fm = node.meta?.frontmatter ?? {}
  const collapsed = node.meta?.collapsed ?? false
  const body = useCanvasStore((s) => s.bodyFor(id))
  const toggle = useCanvasStore((s) => s.toggleCollapsed)
  const maximizeReader = useCanvasStore((s) => s.maximizeReader)
  const title = String(fm.name ?? basename(node.file))

  return (
    <>
    <div className={cn('fc-node', 'fc-node--md', collapsed && 'is-collapsed')}>
      <header className="fc-node__head">
        <span className="fc-node__title" title={title}>
          {title}
        </span>
        <span className="fc-node__kind">md</span>
        <button
          className="fc-node__read nodrag"
          onClick={(e) => { e.stopPropagation(); maximizeReader(id) }}
          aria-label="Maximize — read full document"
          title="Maximize — read full document"
          data-testid="node-read"
        >
          ⤢
        </button>
        <button
          className="fc-node__collapse nodrag"
          onClick={(e) => { e.stopPropagation(); toggle(id) }}
          aria-label={collapsed ? 'Expand node' : 'Collapse node'}
          data-testid="node-collapse-toggle"
        >
          {collapsed ? '+' : '–'}
        </button>
      </header>

      <FrontmatterView frontmatter={fm} variant="card" sourceNodeId={node.id} />

      <div className="fc-node__body">
        <CanvasMarkdown basePath={node.file}>{body ?? '_resolving…_'}</CanvasMarkdown>
      </div>
    </div>
    {/* Handles are siblings of the card (not nested in it) so they paint above the whole card
        subtree and stay grabbable on every side — nesting them clipped the right/bottom hit areas. */}
    {SIDES.map((p) => (
      <Handle key={p} type="source" position={p} id={p} />
    ))}
    </>
  )
}

export const MarkdownNode = memo(Inner)

'use client'
import { memo } from 'react'
import { type NodeProps } from '@xyflow/react'
import type { FileNode } from '@/lib/canvas/jsoncanvas'
import { useCanvasStore } from '@/lib/canvas/store'
import { cn } from '@/lib/utils'
import { CanvasMarkdown } from '../canvas-markdown'
import { FrontmatterView, basename } from '../frontmatter-view'
import { NodeResizeFrame } from './node-frame'
import { CommentBadge } from './comment-badge'

function Inner({ id, selected, data }: NodeProps) {
  const node = (data as { node: FileNode }).node
  const fm = node.meta?.frontmatter ?? {}
  const collapsed = node.meta?.collapsed ?? false
  const body = useCanvasStore((s) => s.bodyFor(id))
  const toggle = useCanvasStore((s) => s.toggleCollapsed)
  const maximizeReader = useCanvasStore((s) => s.maximizeReader)
  const title = String(fm.name ?? basename(node.file))

  return (
    <NodeResizeFrame id={id} selected={!!selected} minWidth={240} minHeight={140}>
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
      <CommentBadge nodeId={id} />
    </NodeResizeFrame>
  )
}

export const MarkdownNode = memo(Inner)

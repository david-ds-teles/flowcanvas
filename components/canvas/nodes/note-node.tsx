'use client'
import { memo, useState, useRef, useEffect } from 'react'
import { type NodeProps } from '@xyflow/react'
import type { TextNode } from '@/lib/canvas/jsoncanvas'
import { useCanvasStore } from '@/lib/canvas/store'
import { CanvasMarkdown } from '../canvas-markdown'
import { NodeResizeFrame } from './node-frame'
import { CommentBadge } from './comment-badge'
import { NodeFormatBar } from './node-format-bar'

const V_JUSTIFY = { top: 'flex-start', middle: 'center', bottom: 'flex-end' } as const

// A text/note node. Double-click the body to edit it inline (textarea); Enter-less newlines allowed,
// ⌘/Ctrl+Enter or blur commits, Esc cancels. Stored markdown is rendered when not editing. Selected:
// a floating format bar drives alignment + text colour + fill (read back here as inline styles).
function Inner({ id, selected, data }: NodeProps) {
  const node = (data as { node: TextNode }).node
  const setNodeText = useCanvasStore((s) => s.setNodeText)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(node.text)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing) { ref.current?.focus(); ref.current?.select() }
  }, [editing])

  const commit = () => { setEditing(false); if (draft !== node.text) setNodeText(id, draft) }
  const cancel = () => { setEditing(false); setDraft(node.text) }

  const noteStyle = {
    ...(node.meta?.fill ? { background: node.meta.fill } : null),
    ...(node.meta?.valign ? { justifyContent: V_JUSTIFY[node.meta.valign] } : null),
  }
  const bodyStyle = {
    ...(node.color ? { color: node.color } : null),
    ...(node.meta?.align ? { textAlign: node.meta.align } : null),
  }

  return (
    <NodeResizeFrame id={id} selected={!!selected} minWidth={180} minHeight={120}>
      {selected && <NodeFormatBar id={id} node={node} />}
      <div className="fc-node--note" style={noteStyle} onDoubleClick={() => { setDraft(node.text); setEditing(true) }}>
        <span className="fc-note__kicker">note</span>
        {editing ? (
          <textarea
            ref={ref}
            className="fc-note__edit nodrag nopan"
            value={draft}
            aria-label="Edit note"
            style={bodyStyle}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onPointerDownCapture={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation()
              if (e.key === 'Escape') { e.preventDefault(); cancel() }
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); commit() }
            }}
          />
        ) : (
          <div className="fc-note__body" style={bodyStyle}>
            <CanvasMarkdown>{node.text || '_Double-click to edit_'}</CanvasMarkdown>
          </div>
        )}
      </div>
      <CommentBadge nodeId={id} />
    </NodeResizeFrame>
  )
}

export const NoteNode = memo(Inner)

'use client'
import { memo, useState, useRef, useEffect } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { TextNode } from '@/lib/canvas/jsoncanvas'
import { useCanvasStore } from '@/lib/canvas/store'
import { CanvasMarkdown } from '../canvas-markdown'

const SIDES = [Position.Top, Position.Right, Position.Bottom, Position.Left]

// A text/note node. Double-click the body to edit it inline (textarea); Enter-less newlines allowed,
// ⌘/Ctrl+Enter or blur commits, Esc cancels. Stored markdown is rendered when not editing.
function Inner({ id, data }: NodeProps) {
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

  return (
    <>
      <div className="fc-node--note" onDoubleClick={() => { setDraft(node.text); setEditing(true) }}>
        <span className="fc-note__kicker">note</span>
        {editing ? (
          <textarea
            ref={ref}
            className="fc-note__edit nodrag nopan"
            value={draft}
            aria-label="Edit note"
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
          <div className="fc-note__body">
            <CanvasMarkdown>{node.text || '_Double-click to edit_'}</CanvasMarkdown>
          </div>
        )}
      </div>
      {/* handles outside the card so all sides stay grabbable (see markdown-node) */}
      {SIDES.map((p) => (
        <Handle key={p} type="source" position={p} id={p} />
      ))}
    </>
  )
}

export const NoteNode = memo(Inner)

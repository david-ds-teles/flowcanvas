'use client'
import { useCanvasStore, selectNodeCommentCount } from '@/lib/canvas/store'

const COUNT_CAP = 9

export interface CommentBadgeProps {
  nodeId: string
}

// On-card unresolved-comment indicator (Decision 3). A sibling of the card inside NodeResizeFrame so it
// escapes the card's overflow:hidden and sits at the corner. Hidden at 0; shows "9+" above the cap (the
// aria-label always carries the exact count). Clicking selects the node — populating the inspector's
// "Comments on this node" list — without recentering the viewport (setSelection, not focusNode).
export function CommentBadge({ nodeId }: CommentBadgeProps) {
  const count = useCanvasStore(selectNodeCommentCount(nodeId))
  const select = useCanvasStore((s) => s.setSelection)
  if (count === 0) return null
  return (
    <button
      type="button"
      className="fc-node__badge nodrag nopan"
      data-testid="node-comment-badge"
      aria-label={`${count} unresolved comment${count === 1 ? '' : 's'} — show in inspector`}
      onClick={(e) => { e.stopPropagation(); select([nodeId]) }}
    >
      <span className="fc-node__badge-ic" aria-hidden="true">💬</span>
      {count > COUNT_CAP ? `${COUNT_CAP}+` : count}
    </button>
  )
}

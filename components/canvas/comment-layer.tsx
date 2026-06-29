'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useReactFlow, useViewport, useNodes } from '@xyflow/react'
import { useCanvasStore } from '@/lib/canvas/store'
import { anchorForPoint, anchorToFlowPoint, type NodeGeom } from '@/lib/canvas/comments'
import type { CommentAnchor } from '@/lib/canvas/jsoncanvas'
import { CommentThread } from './comment-thread'
import { nodeDisplayName } from '@/lib/canvas/node-name'

// Local-human authorship for Phase 6; Phase 7's agent round-trip mints "agent:<model>" replies.
const LOCAL_AUTHOR = 'human:you'

/**
 * Absolute overlay that renders comment pins and their threads above the React Flow pane.
 * Pins are projected from live (measured) node geometry, so they track drags, resizes, and
 * pan/zoom. In comment mode the overlay captures clicks to drop a new pin (node- or canvas-anchored).
 */
export function CommentLayer() {
  const { flowToScreenPosition, screenToFlowPosition, getInternalNode } = useReactFlow()
  useViewport()                                  // re-render on pan/zoom so projections recompute
  const rfNodes = useNodes()                     // re-render on drag/measure; carries live geometry

  const doc = useCanvasStore((s) => s.doc)
  const commentMode = useCanvasStore((s) => s.mode === 'comment')
  const setMode = useCanvasStore((s) => s.setMode)
  const addComment = useCanvasStore((s) => s.addComment)
  const replyComment = useCanvasStore((s) => s.replyComment)
  const resolveComment = useCanvasStore((s) => s.resolveComment)

  const [openId, setOpenId] = useState<string | null>(null)
  const [draft, setDraft] = useState<CommentAnchor | null>(null)

  // Abandon a half-composed draft pin when comment mode turns off (render-phase reset, the React-
  // sanctioned alternative to a setState-in-effect: https://react.dev/learn/you-might-not-need-an-effect).
  const [prevMode, setPrevMode] = useState(commentMode)
  if (prevMode !== commentMode) {
    setPrevMode(commentMode)
    if (!commentMode) setDraft(null)
  }

  // Flow-space geometry of every node, keyed by id (measured box wins over the authored one). Uses the
  // ABSOLUTE position (Phase 10): a grouped child's `position` from useNodes() is relative to its parent,
  // so a pin on a child would mis-place without internals.positionAbsolute.
  const geom = useMemo<NodeGeom[]>(
    () => rfNodes.map((n) => {
      const abs = getInternalNode(n.id)?.internals.positionAbsolute
      return {
        id: n.id,
        x: abs?.x ?? n.position.x,
        y: abs?.y ?? n.position.y,
        width: n.measured?.width ?? n.width ?? 0,
        height: n.measured?.height ?? n.height ?? 0,
      }
    }),
    [rfNodes, getInternalNode],
  )
  const geomById = useMemo(() => new Map(geom.map((g) => [g.id, g])), [geom])
  const nodeById = useMemo(() => new Map((doc?.nodes ?? []).map((n) => [n.id, n])), [doc])
  const anchorName = useCallback(
    (a: CommentAnchor) => (a.kind === 'node' ? (nodeById.get(a.nodeId) ? nodeDisplayName(nodeById.get(a.nodeId)!) : a.nodeId) : 'canvas'),
    [nodeById],
  )

  const project = useCallback(
    (anchor: CommentAnchor) => {
      const p = anchorToFlowPoint(anchor, geomById)
      return p ? flowToScreenPosition(p) : null
    },
    [geomById, flowToScreenPosition],
  )

  // Tether the popover to its pin: aim at the pin badge, sit it beside the pin with a connector
  // beak, flip to the other side near the right edge, and clamp vertically so it stays on-screen.
  const placePopover = useCallback(
    (anchor: CommentAnchor) => {
      const pt = project(anchor)
      if (!pt) return null
      const W = 320, GAP = 14
      const vw = window.innerWidth, vh = window.innerHeight
      const aimX = pt.x, aimY = pt.y - 13            // pin badge center (pin renders translate(-50%,-100%))
      const side: 'left' | 'right' = aimX + GAP + W > vw - 12 ? 'left' : 'right'
      const left = Math.max(8, Math.min(side === 'right' ? aimX + GAP : aimX - GAP - W, vw - W - 8))
      const top = Math.max(12, Math.min(aimY - 26, vh - 300))
      return { pos: { left, top }, side, beakTop: aimY - top }
    },
    [project],
  )

  // Comment mode: a click that reaches the overlay drops a draft pin at the hit node (or canvas).
  const onSurfaceClick = useCallback(
    (e: React.MouseEvent) => {
      if (!commentMode) return
      const flow = screenToFlowPosition({ x: e.clientX, y: e.clientY })
      setDraft(anchorForPoint(flow, geom))
      setOpenId(null)
    },
    [commentMode, screenToFlowPosition, geom],
  )

  // Esc closes an open thread/draft first, then exits comment mode.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (draft || openId) { setDraft(null); setOpenId(null) }
      else if (commentMode) setMode('select')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [draft, openId, commentMode, setMode])

  if (!doc) return null
  const comments = doc.flowcanvas.comments
  const roots = comments.filter((c) => c.parentId === null)
  const openRoot = openId ? roots.find((c) => c.id === openId) ?? null : null
  const draftPlace = draft ? placePopover(draft) : null
  const openPlace = openRoot ? placePopover(openRoot.anchor) : null

  return (
    <div className="fc-comment-layer" data-mode={commentMode || undefined} onClick={onSurfaceClick}>
      {commentMode && <div className="fc-comment-hint">Comment mode — click a node or the canvas to drop a pin · Esc to exit</div>}

      {roots.map((c) => {
        const p = project(c.anchor)
        if (!p) return null
        return (
          <button
            key={c.id}
            className="fc-pin"
            data-testid="comment-pin"
            data-resolved={!!c.resolvedAt || undefined}
            style={{ left: p.x, top: p.y }}
            aria-label={`Comment thread ${c.badge} (${anchorName(c.anchor)})`}
            onClick={(e) => { e.stopPropagation(); setDraft(null); setOpenId(c.id) }}
          >
            <i>{c.badge}</i>
          </button>
        )
      })}

      {draft && draftPlace && (
        <CommentThread
          pos={draftPlace.pos}
          side={draftPlace.side}
          beakTop={draftPlace.beakTop}
          root={null}
          replies={[]}
          anchorLabel={anchorName(draft)}
          onCreate={(text) => { const id = addComment(draft, text, LOCAL_AUTHOR); setDraft(null); setOpenId(id) }}
          onReply={() => {}}
          onResolve={() => {}}
          onClose={() => setDraft(null)}
        />
      )}

      {openRoot && openPlace && (
        <CommentThread
          pos={openPlace.pos}
          side={openPlace.side}
          beakTop={openPlace.beakTop}
          root={openRoot}
          replies={comments.filter((c) => c.parentId === openRoot.id)}
          anchorLabel={anchorName(openRoot.anchor)}
          onCreate={() => {}}
          onReply={(text) => replyComment(openRoot.id, text, LOCAL_AUTHOR)}
          onResolve={() => resolveComment(openRoot.id)}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  )
}

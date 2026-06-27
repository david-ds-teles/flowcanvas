'use client'
import { memo, useCallback, useState } from 'react'
import type { Comment } from '@/lib/canvas/jsoncanvas'

// One glass popover: either a draft composer (no root yet) or an open thread (root + flat replies,
// reply box, resolve). Positioned by the layer at the anchor's projected screen point.

interface CommentThreadProps {
  pos: { left: number; top: number }   // pre-computed (flipped + clamped) popover origin
  side: 'left' | 'right'               // which edge the connector beak sits on (toward the pin)
  beakTop: number                      // beak offset from the popover top, aligned to the pin
  root: Comment | null                 // null → draft composer for a freshly-placed pin
  replies: Comment[]
  anchorLabel: string                  // header context — node id or "canvas"
  onCreate: (text: string) => void     // submit a draft → mint the root
  onReply: (text: string) => void
  onResolve: () => void
  onClose: () => void
}

/** "human:david" → { initial: "D", kind: "h" }; "agent:opus-4.8" → { initial: "A", kind: "a" }. */
function avatarOf(author: string): { initial: string; kind: 'h' | 'a' } {
  const kind = author.startsWith('agent') ? 'a' : 'h'
  const name = author.includes(':') ? author.slice(author.indexOf(':') + 1) : author
  return { initial: (name.trim()[0] ?? '?').toUpperCase(), kind }
}

function CommentRow({ c }: { c: Comment }) {
  const { initial, kind } = avatarOf(c.author)
  return (
    <div className="fc-cmt">
      <span className={`fc-cmt__av fc-cmt__av--${kind}`}>{initial}</span>
      <div className="fc-cmt__body">
        <div className="fc-cmt__who">
          {c.author}
          {kind === 'a' && <span className="fc-cmt__badge">agent</span>}
        </div>
        <div className="fc-cmt__tx">{c.text}</div>
      </div>
    </div>
  )
}

function Composer({ placeholder, cta, onSubmit }: { placeholder: string; cta: string; onSubmit: (text: string) => void }) {
  const [value, setValue] = useState('')
  const submit = useCallback(() => {
    const text = value.trim()
    if (!text) return
    onSubmit(text)
    setValue('')
  }, [value, onSubmit])
  return (
    <div className="fc-reply">
      <input
        data-testid="comment-reply-input"
        value={value}
        autoFocus
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit() } }}
      />
      <button className="fc-reply__send" onClick={submit} aria-label={cta}>{cta}</button>
    </div>
  )
}

function Inner({ pos, side, beakTop, root, replies, anchorLabel, onCreate, onReply, onResolve, onClose }: CommentThreadProps) {
  const resolved = !!root?.resolvedAt
  return (
    <div
      className="fc-cpop"
      data-side={side}
      style={{ left: pos.left, top: pos.top }}
      role="dialog"
      aria-label={root ? `Comment thread ${root.badge}` : 'New comment'}
      onClick={(e) => e.stopPropagation()}   // never fall through to the layer's place-on-click
    >
      {/* connector beak tethering the popover to its pin (toward `side`) */}
      <span className={`fc-cpop__beak fc-cpop__beak--${side}`} style={{ top: beakTop }} aria-hidden="true" />
      <div className="fc-cpop__h">
        <span>💬 {root ? `Thread · ${root.badge}` : 'New comment'} · {anchorLabel}</span>
        <button className="fc-cpop__x" onClick={onClose} aria-label="Close thread">✕</button>
      </div>
      <div className="fc-cpop__b">
        {root && <CommentRow c={root} />}
        {replies.map((r) => <CommentRow key={r.id} c={r} />)}

        {root
          ? <Composer placeholder="Reply…" cta="Send" onSubmit={onReply} />
          : <Composer placeholder="Comment…" cta="Add" onSubmit={onCreate} />}

        {root && (
          <div className="fc-cpop__foot">
            {resolved
              ? <span className="fc-resolve fc-resolve--done">✓ Resolved</span>
              : <button className="fc-resolve" data-testid="comment-resolve" onClick={onResolve}>✓ Resolve</button>}
          </div>
        )}
      </div>
    </div>
  )
}

export const CommentThread = memo(Inner)

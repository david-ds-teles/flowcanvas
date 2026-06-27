'use client'
import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { LinkNode as CanvasLinkNode } from '@/lib/canvas/jsoncanvas'

const SIDES = [Position.Top, Position.Right, Position.Bottom, Position.Left]

// A bare "google.com" (no scheme) resolves relative to the app origin and 404s. Treat any url without
// an explicit scheme (and not mailto:/tel:) as an external https:// link so the chip always opens.
export function normalizeUrl(url: string): string {
  const u = url.trim()
  if (!u) return u
  if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return u // already has a scheme (http:, https:, mailto:, tel:, …)
  return `https://${u.replace(/^\/+/, '')}`
}

function Inner({ data }: NodeProps) {
  const node = (data as { node: CanvasLinkNode }).node
  const href = normalizeUrl(node.url)
  const display = href.replace(/^https?:\/\//, '').replace(/\/$/, '')
  return (
    <>
    <a className="fc-node--link" href={href} target="_blank" rel="noopener noreferrer" title={href}>
      <span className="fc-link__glyph">↗</span>
      <span className="fc-link__main">
        <span className="fc-link__kicker">link</span>
        <span className="fc-link__url">{display}</span>
      </span>
    </a>
    {/* handles outside the chip so all sides stay grabbable (see markdown-node) */}
    {SIDES.map((p) => (
      <Handle key={p} type="source" position={p} id={p} />
    ))}
    </>
  )
}

export const LinkChipNode = memo(Inner)

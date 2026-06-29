'use client'
import { Fragment, useState } from 'react'
import { cn } from '@/lib/utils'
import { useCanvasStore } from '@/lib/canvas/store'
import type { DocRef } from '@/lib/canvas/refs'

// Build a DocRef from a frontmatter links: entry (root-relative by convention) for navigateRef.
function frontmatterRef(link: string): DocRef {
  const isExternal = /^https?:\/\//i.test(link)
  const h = link.indexOf('#')
  const anchor = h !== -1 ? link.slice(h + 1) || undefined : undefined
  const target = h !== -1 ? link.slice(0, h) : link
  return { kind: 'frontmatter', target, anchor, isExternal }
}

// Shared frontmatter presentation (Phase 9, issue #5 + #4). Two variants over one composition:
//   variant="card"   — the in-node block (markdown-node), bordered, compact.
//   variant="reader" — the reader-drawer header bar, sticky + roomier.
// Houses the rendering primitives extracted from markdown-node so the node card and the reader
// bar stay pixel-identical: status pill (semantic color), violet tag chips, ↗ link chips, then a
// muted mono key/value grid for everything else. Returns null when nothing is displayable.

const PRIORITY = ['status', 'tags', 'links'] // surfaced first, in this order
const SKIP = new Set(['name']) // already the card / drawer title
const MAX_CHIPS = 8

export const basename = (p: string) => p.split(/[\\/]/).pop() ?? p

// Map a frontmatter status to a semantic pill color (lime = settled, cyan = in-flight, amber = caution).
export function statusClass(value: string): string {
  const s = value.toLowerCase()
  if (/(approv|done|complete|stable|living|merged|shipped|passed|ready|resolved)/.test(s)) return 'fc-pill--ok'
  if (/(active|in[-_ ]?progress|review|wip|draft|pending|quality|open)/.test(s)) return 'fc-pill--act'
  if (/(deprecat|blocked|paused|fail|stale|archiv|warn|reject)/.test(s)) return 'fc-pill--warn'
  return ''
}

const isEmpty = (v: unknown) => v === null || v === undefined || v === ''

// Generic value renderer for non-priority fields: arrays → chips, objects → {…}, scalars → text.
function FmValue({ value }: { value: unknown }) {
  if (Array.isArray(value)) {
    const shown = value.slice(0, MAX_CHIPS).map(String)
    return (
      <span className="fc-fm__v--chips">
        {shown.map((t, i) => (
          <span key={`${t}-${i}`} className="fc-tag">
            {t}
          </span>
        ))}
        {value.length > shown.length && <span className="fc-fm__more">+{value.length - shown.length}</span>}
      </span>
    )
  }
  if (value !== null && typeof value === 'object') return <span className="fc-fm__more">{'{…}'}</span>
  return <>{String(value)}</>
}

interface FrontmatterViewProps {
  frontmatter: Record<string, unknown>
  variant?: 'card' | 'reader'
  className?: string
  /** When set, the ↗ link chips become clickable buttons that call `navigateRef` (Decision 9). */
  sourceNodeId?: string
  /** Reader variant only — render the frontmatter collapsed by default with an expander (plan 003 Decision 4). */
  collapsible?: boolean
}

export function FrontmatterView({ frontmatter, variant = 'card', className, sourceNodeId, collapsible = false }: FrontmatterViewProps) {
  const fm = frontmatter ?? {}
  const navigateRef = useCanvasStore((s) => s.navigateRef)
  const [open, setOpen] = useState(false)

  // Every meaningful field — priority keys first, then the rest (skipping the title + empties).
  const keys = [
    ...PRIORITY.filter((k) => k in fm && !isEmpty(fm[k])),
    ...Object.keys(fm).filter((k) => !SKIP.has(k) && !PRIORITY.includes(k) && !isEmpty(fm[k])),
  ]
  if (!keys.length) return null

  const status = fm.status
  const hasStatus = !isEmpty(status) && (typeof status === 'string' || typeof status === 'number')
  const tags = Array.isArray(fm.tags) ? (fm.tags as unknown[]) : null
  const links = Array.isArray(fm.links) ? (fm.links as unknown[]) : null
  // status is consumed by the pill only when it's a string/number; an off-shape status (e.g. boolean)
  // falls through to the kv grid so it's never dropped into an empty wrapper.
  const restKeys = keys.filter((k) => k !== 'tags' && k !== 'links' && !(k === 'status' && hasStatus))

  // Reader collapsible variant (plan 003 Decision 4): collapsed by default to a dense status + first-tags
  // row with a "+N" count and an expander; the card variant is never collapsible.
  if (collapsible && !open) {
    const shownTags = tags ? tags.slice(0, 3) : []
    const hidden =
      (tags ? Math.max(0, tags.length - shownTags.length) : 0) + (links ? links.length : 0) + restKeys.length
    return (
      <div className={cn('fc-fm', 'fc-fm--reader', 'fc-fm--collapsed', className)}>
        <div className="fc-fm__bar">
          {hasStatus && (
            <span className={cn('fc-pill', statusClass(String(status)))}>
              <span className="fc-pill__dot" aria-hidden="true" />
              {String(status)}
            </span>
          )}
          {shownTags.map((t, i) => (
            <span key={`${String(t)}-${i}`} className="fc-tag">
              {String(t)}
            </span>
          ))}
          {hidden > 0 && <span className="fc-fm__more">+{hidden}</span>}
          <button
            type="button"
            className="fc-fm__toggle"
            data-testid="reader-fm-toggle"
            aria-expanded={false}
            onClick={() => setOpen(true)}
          >
            frontmatter <span className="fc-fm__chev" aria-hidden="true">▾</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('fc-fm', variant === 'reader' ? 'fc-fm--reader' : 'fc-fm--card', className)}>
      {collapsible && (
        <button
          type="button"
          className="fc-fm__toggle fc-fm__toggle--open"
          data-testid="reader-fm-toggle"
          aria-expanded={true}
          onClick={() => setOpen(false)}
        >
          frontmatter <span className="fc-fm__chev" aria-hidden="true">▴</span>
        </button>
      )}
      {hasStatus && (
        <div className="fc-fm__row">
          <span className={cn('fc-pill', statusClass(String(status)))}>
            <span className="fc-pill__dot" aria-hidden="true" />
            {String(status)}
          </span>
        </div>
      )}

      {tags && tags.length > 0 && (
        <div className="fc-fm__row">
          {tags.slice(0, MAX_CHIPS).map((t, i) => (
            <span key={`${String(t)}-${i}`} className="fc-tag">
              {String(t)}
            </span>
          ))}
          {tags.length > MAX_CHIPS && <span className="fc-fm__more">+{tags.length - MAX_CHIPS}</span>}
        </div>
      )}

      {links && links.length > 0 && (
        <div className="fc-fm__row">
          {links.slice(0, MAX_CHIPS).map((l, i) =>
            sourceNodeId ? (
              <button
                type="button"
                key={`${String(l)}-${i}`}
                className="fc-link-chip fc-link-chip--btn"
                data-testid="link-chip"
                title={`Go to ${String(l)}`}
                onClick={(e) => { e.stopPropagation(); void navigateRef(sourceNodeId, frontmatterRef(String(l))) }}
              >
                <span className="fc-link-chip__arrow" aria-hidden="true">↗</span>
                {basename(String(l))}
              </button>
            ) : (
              <span key={`${String(l)}-${i}`} className="fc-link-chip" data-testid="link-chip" title={String(l)}>
                <span className="fc-link-chip__arrow" aria-hidden="true">↗</span>
                {basename(String(l))}
              </span>
            ),
          )}
          {links.length > MAX_CHIPS && <span className="fc-fm__more">+{links.length - MAX_CHIPS}</span>}
        </div>
      )}

      {restKeys.length > 0 && (
        <dl className="fc-fm__kv">
          {restKeys.map((k) => (
            <Fragment key={k}>
              <dt className="fc-fm__k">{k}</dt>
              <dd className="fc-fm__v">
                <FmValue value={fm[k]} />
              </dd>
            </Fragment>
          ))}
        </dl>
      )}
    </div>
  )
}

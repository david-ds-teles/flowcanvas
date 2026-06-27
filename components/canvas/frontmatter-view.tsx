'use client'
import { Fragment } from 'react'
import { cn } from '@/lib/utils'

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
}

export function FrontmatterView({ frontmatter, variant = 'card', className }: FrontmatterViewProps) {
  const fm = frontmatter ?? {}

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

  return (
    <div className={cn('fc-fm', variant === 'reader' ? 'fc-fm--reader' : 'fc-fm--card', className)}>
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
          {links.slice(0, MAX_CHIPS).map((l, i) => (
            <span key={`${String(l)}-${i}`} className="fc-link-chip" title={String(l)}>
              <span className="fc-link-chip__arrow" aria-hidden="true">
                ↗
              </span>
              {basename(String(l))}
            </span>
          ))}
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

'use client'
import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { FileNode } from '@/lib/canvas/jsoncanvas'
import { useCanvasStore } from '@/lib/canvas/store'
import { cn } from '@/lib/utils'
import { CanvasMarkdown } from '../canvas-markdown'

const SIDES = [Position.Top, Position.Right, Position.Bottom, Position.Left]
const PRIORITY = ['status', 'tags', 'links'] // surfaced first, in this order
const SKIP = new Set(['name']) // already the card title
const MAX_CHIPS = 8

const basename = (p: string) => p.split(/[\\/]/).pop() ?? p

// Map a frontmatter status to a semantic chip color (lime = settled, cyan = in-flight, amber = caution).
function statusClass(value: string): string {
  const s = value.toLowerCase()
  if (/(approv|done|complete|stable|living|merged|shipped|passed|ready|resolved)/.test(s)) return 'fc-chip--ok'
  if (/(active|in[-_ ]?progress|review|wip|draft|pending|quality|open)/.test(s)) return 'fc-chip--act'
  if (/(deprecat|blocked|paused|fail|stale|archiv|warn|reject)/.test(s)) return 'fc-chip--warn'
  return ''
}

function FmValue({ field, value }: { field: string; value: unknown }) {
  if (field === 'status' && (typeof value === 'string' || typeof value === 'number')) {
    return <span className={cn('fc-chip', statusClass(String(value)))}>{String(value)}</span>
  }
  if (Array.isArray(value)) {
    const items = value.map((v) => (field === 'links' ? basename(String(v)) : String(v)))
    const shown = items.slice(0, MAX_CHIPS)
    return (
      <span className="fc-fm__v--chips">
        {shown.map((t, i) => (
          <span key={`${t}-${i}`} className="fc-tag">
            {t}
          </span>
        ))}
        {items.length > shown.length && <span className="fc-fm__more">+{items.length - shown.length}</span>}
      </span>
    )
  }
  if (value !== null && typeof value === 'object') return <span className="fc-fm__more">{'{…}'}</span>
  return <>{String(value)}</>
}

function Inner({ id, data }: NodeProps) {
  const node = (data as { node: FileNode }).node
  const fm = node.meta?.frontmatter ?? {}
  const collapsed = node.meta?.collapsed ?? false
  const body = useCanvasStore((s) => s.bodyFor(id))
  const toggle = useCanvasStore((s) => s.toggleCollapsed)
  const maximizeReader = useCanvasStore((s) => s.maximizeReader)
  const title = String(fm.name ?? basename(node.file))

  // Every meaningful frontmatter field — priority keys first, then the rest (skipping empties + the title).
  const keys = [
    ...PRIORITY.filter((k) => k in fm),
    ...Object.keys(fm).filter(
      (k) => !SKIP.has(k) && !PRIORITY.includes(k) && fm[k] !== null && fm[k] !== undefined && fm[k] !== '',
    ),
  ]

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

      {keys.length > 0 && (
        <table className="fc-fm">
          <tbody>
            {keys.map((k) => (
              <tr key={k}>
                <td className="fc-fm__k">{k}</td>
                <td className="fc-fm__v">
                  <FmValue field={k} value={fm[k]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

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

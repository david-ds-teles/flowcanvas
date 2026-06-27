'use client'
import { useEffect, useState } from 'react'
import { useCanvasStore } from '@/lib/canvas/store'
import { isFileNode } from '@/lib/canvas/jsoncanvas'
import { cn } from '@/lib/utils'

// Reader width presets surfaced as a segmented control in the header (Phase 8, Fix 3/4).
const SIZES = [
  { key: 'drawer', glyph: '◧', label: 'Drawer' },
  { key: 'half', glyph: '◑', label: 'Half screen' },
  { key: 'full', glyph: '⛶', label: 'Full screen' },
] as const

// Right-side glass drawer: full-fidelity, syntax-highlighted (shiki) read-only view of a markdown node,
// fetched from /api/render. The node's comment thread sits beneath the prose. Editing is deferred (v0.1).
interface ReaderDrawerProps {
  nodeId: string
  onClose: () => void
}

export function ReaderDrawer({ nodeId, onClose }: ReaderDrawerProps) {
  const doc = useCanvasStore((s) => s.doc)
  const size = useCanvasStore((s) => s.readerSize)
  const setSize = useCanvasStore((s) => s.setReaderSize)
  const node = doc?.nodes.find((n) => n.id === nodeId) ?? null
  const file = node && isFileNode(node) ? node.file : null
  const title = node && isFileNode(node) ? String(node.meta?.frontmatter?.name ?? file?.split('/').pop()) : 'Reader'

  // Result is keyed by the file it belongs to, so switching nodes shows "Rendering…" until the new
  // fetch lands (no synchronous reset in the effect → satisfies react-hooks/set-state-in-effect).
  const [result, setResult] = useState<{ forFile: string; html: string | null; error: string | null }>({ forFile: '', html: null, error: null })
  const ready = !!file && result.forFile === file

  // Esc closes the drawer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Fetch the rendered HTML for the node's markdown file (re-run if the opened node changes).
  useEffect(() => {
    if (!file) return
    let live = true
    fetch(`/api/render?path=${encodeURIComponent(file)}`)
      .then(async (res) => {
        const body = (await res.json()) as { html?: string; error?: string }
        if (!res.ok) throw new Error(body.error ?? `${res.status}`)
        if (live) setResult({ forFile: file, html: body.html ?? '', error: null })
      })
      .catch((e: unknown) => { if (live) setResult({ forFile: file, html: null, error: e instanceof Error ? e.message : String(e) }) })
    return () => { live = false }
  }, [file])

  const thread = doc?.flowcanvas.comments.filter((c) => c.anchor.kind === 'node' && c.anchor.nodeId === nodeId) ?? []

  return (
    <aside className="fc-reader" data-size={size} role="dialog" aria-label={`Reader · ${title}`} data-testid="reader-drawer">
      <header className="fc-reader__h">
        <span className="fc-reader__title">{title}</span>
        {file && <span className="fc-reader__path">{file}</span>}
        <div className="fc-reader__sizes" role="group" aria-label="Reader size">
          {SIZES.map((s) => (
            <button
              key={s.key}
              className={cn('fc-reader__size', size === s.key && 'is-active')}
              aria-pressed={size === s.key}
              aria-label={s.label}
              title={s.label}
              data-testid={`reader-size-${s.key}`}
              onClick={() => setSize(s.key)}
            >
              {s.glyph}
            </button>
          ))}
        </div>
        <button className="fc-reader__x" data-testid="reader-close" aria-label="Close reader" onClick={onClose}>✕</button>
      </header>

      <div className="fc-reader__scroll">
        {!file && <p className="fc-reader__msg">This node has no readable markdown.</p>}
        {file && !ready && <p className="fc-reader__msg">Rendering…</p>}
        {ready && result.error && <p className="fc-reader__msg fc-reader__msg--err">Could not render — {result.error}</p>}
        {ready && result.html !== null && <div className="fc-reader__prose" dangerouslySetInnerHTML={{ __html: result.html }} />}

        {thread.length > 0 && (
          <section className="fc-reader__thread">
            <h4 className="fc-reader__threadh">Comments</h4>
            {thread.map((c) => (
              <div key={c.id} className="fc-reader__cmt">
                <span className="fc-reader__cmtwho">{c.author}{c.resolvedAt ? ' · resolved' : ''}</span>
                <span className="fc-reader__cmttx">{c.text}</span>
              </div>
            ))}
          </section>
        )}
      </div>
    </aside>
  )
}

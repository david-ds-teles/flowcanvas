'use client'
import { useCallback, useMemo, useState } from 'react'
import { useCanvasStore } from '@/lib/canvas/store'
import { outlineOf, citedDocPaths, buildSourceIndex } from '@/lib/canvas/spine'
import { cn } from '@/lib/utils'
import { basename } from './frontmatter-view'

// 004 Phase 4 — the living core-markdown spine. A docked pane (not the overlay reader) bound to
// session.coreDocPath. It does NOT re-render the document body (the reader already shows that) —
// it surfaces the section outline (per-heading component-count badges + click-to-pulse the canvas),
// an edit affordance (textarea over the raw markdown) with a dirty flag, "Submit changes"
// (writeFile → submitToAgent, blocked while a round is pending), and a switcher over cited docs (Q4).

interface CoreSpineProps {
  onClose: () => void
}

export function CoreSpine({ onClose }: CoreSpineProps) {
  const doc = useCanvasStore((s) => s.doc)
  const coreDocBody = useCanvasStore((s) => s.coreDocBody)
  const coreDocDraft = useCanvasStore((s) => s.coreDocDraft)
  const coreDocDirty = useCanvasStore((s) => s.coreDocDirty)
  const spineHighlightAnchor = useCanvasStore((s) => s.spineHighlightAnchor)
  const setCoreDoc = useCanvasStore((s) => s.setCoreDoc)
  const editCoreDoc = useCanvasStore((s) => s.editCoreDoc)
  const submitCoreDocEdit = useCanvasStore((s) => s.submitCoreDocEdit)
  const highlightComponents = useCanvasStore((s) => s.highlightComponents)

  const coreDocPath = doc?.flowcanvas.session.coreDocPath
  const pendingReview = !!doc?.flowcanvas.session.pendingReview
  const cited = useMemo(() => (doc ? citedDocPaths(doc.nodes) : []), [doc])
  const outline = useMemo(() => outlineOf(coreDocBody ?? ''), [coreDocBody])
  const sourceIndex = useMemo(
    () => (doc && coreDocPath ? buildSourceIndex(doc.nodes, coreDocPath) : new Map<string, string[]>()),
    [doc, coreDocPath],
  )

  const [editing, setEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // Spine heading → canvas: pulse its components on the board.
  const onSection = useCallback((anchor: string) => {
    highlightComponents(anchor)
  }, [highlightComponents])

  const onSubmit = useCallback(async () => {
    if (submitting || pendingReview) return
    setErr(null); setSubmitting(true)
    try {
      await submitCoreDocEdit('Revised the core doc — re-extract the affected components.')
      setEditing(false)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }, [submitting, pendingReview, submitCoreDocEdit])

  if (!doc) return null
  const title = coreDocPath ? basename(coreDocPath) : 'Core doc'

  return (
    <aside className="fc-spine" data-testid="core-spine" aria-label="Core document spine">
      <header className="fc-spine__h">
        <svg className="fc-spine__ic" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 3h14v18H5zM8 8h8M8 12h8M8 16h5" />
        </svg>
        <div className="fc-spine__title">
          <span className="fc-spine__t">Core Doc</span>
          {coreDocPath && <span className="fc-spine__ext" title={coreDocPath}>{title}</span>}
        </div>
        {coreDocDirty && (
          <span className="fc-spine__dirty" data-testid="spine-dirty"><span className="fc-spine__dirtydot" aria-hidden="true" />edited</span>
        )}
        <div className="fc-spine__tools">
          <button type="button" className={cn('fc-spine__tool', editing && 'is-on')} data-testid="spine-edit-toggle" aria-pressed={editing} onClick={() => setEditing((v) => !v)}>
            {editing ? 'Done' : 'Edit'}
          </button>
          <button type="button" className="fc-spine__x" data-testid="spine-close" aria-label="Close core-doc spine" onClick={onClose}>✕</button>
        </div>
      </header>

      {/* Switcher — repoint the spine to any cited doc (Q4). Shown when >1 cited doc, or none is bound yet. */}
      {(cited.length > 1 || (!coreDocPath && cited.length >= 1)) && (
        <div className="fc-spine__switch" data-testid="spine-switcher">
          <label className="fc-spine__switch-lbl" htmlFor="fc-spine-switch">Spine doc</label>
          <select
            id="fc-spine-switch"
            className="fc-spine__switch-sel"
            value={coreDocPath ?? ''}
            onChange={(e) => { if (e.target.value) void setCoreDoc(e.target.value) }}
          >
            {!coreDocPath && <option value="">Pick a doc to bind…</option>}
            {cited.map((p) => <option key={p} value={p}>{basename(p)}</option>)}
          </select>
        </div>
      )}

      {/* Body — fills the dock height. Read mode shows the section outline (per-heading component-count
          badge; click pulses the components on canvas); edit mode shows the raw-markdown textarea. The
          body itself scrolls only when its content overflows, so a short outline leaves no empty gap or
          stray scrollbar (it expands to use the full pane the rendered doc preview used to occupy). */}
      <div className="fc-spine__body">
        {editing ? (
          <textarea
            className="fc-spine__editor"
            data-testid="spine-editor"
            value={coreDocDraft ?? ''}
            onChange={(e) => editCoreDoc(e.target.value)}
            aria-label="Core document markdown"
            spellCheck={false}
          />
        ) : outline.length > 0 ? (
          <div className="fc-spine__outline" aria-label="Sections">
            {outline.map((h) => {
              const n = sourceIndex.get(h.anchor)?.length ?? 0
              return (
                <button
                  key={h.anchor}
                  type="button"
                  className={cn('fc-spine__sec', spineHighlightAnchor === h.anchor && 'is-linked')}
                  data-testid="spine-section"
                  data-anchor={h.anchor}
                  style={{ paddingLeft: `${8 + (h.depth - 1) * 12}px` }}
                  onClick={() => onSection(h.anchor)}
                >
                  <span className="fc-spine__sec-tx">{h.text}</span>
                  {n > 0 && <span className="fc-spine__sec-ct" title={`${n} component${n === 1 ? '' : 's'} from this section`}>{n}</span>}
                </button>
              )
            })}
          </div>
        ) : (
          <p className="fc-spine__msg">
            {coreDocPath
              ? 'This document has no sections yet.'
              : 'No core doc bound. Pick a cited doc above to make it the living spine.'}
          </p>
        )}
      </div>

      {/* Submit changes — re-submit the revised markdown over MCP; blocked while a round is pending. */}
      <footer className="fc-spine__foot">
        {err && <p className="fc-spine__msg fc-spine__msg--err" data-testid="spine-submit-err">{err}</p>}
        {pendingReview && <p className="fc-spine__note">A review round is open — accept or discard it before submitting edits.</p>}
        <button
          type="button"
          className="fc-spine__submit"
          data-testid="spine-submit"
          disabled={!coreDocDirty || submitting || pendingReview}
          aria-disabled={!coreDocDirty || submitting || pendingReview}
          onClick={() => void onSubmit()}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12l16-7-7 16-2-7z" /></svg>
          {submitting ? 'Submitting…' : 'Submit changes'}
        </button>
      </footer>
    </aside>
  )
}

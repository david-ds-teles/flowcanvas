'use client'
import { useCallback, useEffect, useState } from 'react'
import { listDir, type DirEntry } from '@/lib/api'
import { useCanvasStore } from '@/lib/canvas/store'

// Open / Save-as modal (Phase 10, #7/#2b). Browses the guarded project tree (/api/files) like the
// add-node FilePicker, but as a centered modal: Open switches the active board (dirty-guarded inline,
// no native confirm); Save-as writes the current board to a chosen dir + filename and adopts the path.
const isCanvas = (e: DirEntry) => !!e.ext && /\.(canvas|json)$/i.test(e.ext)

interface BoardDialogProps {
  mode: 'open' | 'save'
  onClose: () => void
}

export function BoardDialog({ mode, onClose }: BoardDialogProps) {
  const openBoard = useCanvasStore((s) => s.openBoard)
  const saveAs = useCanvasStore((s) => s.saveAs)
  const dirty = useCanvasStore((s) => s.dirty)
  const curPath = useCanvasStore((s) => s.path)

  const [dir, setDir] = useState('.')
  const [listing, setListing] = useState<{ forDir: string; entries: DirEntry[]; error: string | null }>({ forDir: '', entries: [], error: null })
  const [filename, setFilename] = useState('')
  const [pendingOpen, setPendingOpen] = useState<string | null>(null) // a board awaiting the discard-unsaved confirm
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const error = listing.forDir === dir ? listing.error : null

  useEffect(() => {
    let live = true
    listDir(dir)
      .then((es) => { if (live) setListing({ forDir: dir, entries: es, error: null }) })
      .catch((e: unknown) => { if (live) setListing({ forDir: dir, entries: [], error: e instanceof Error ? e.message : String(e) }) })
    return () => { live = false }
  }, [dir])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const parent = useCallback(() => {
    if (dir === '.' || dir === '') return
    const up = dir.split('/').slice(0, -1).join('/')
    setDir(up || '.')
  }, [dir])

  const join = (name: string) => (dir === '.' || dir === '' ? name : `${dir}/${name}`)

  const doOpen = useCallback(async (path: string) => {
    setBusy(true); setErr(null)
    try { await openBoard(path); onClose() }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)) }
    finally { setBusy(false) }
  }, [openBoard, onClose])

  // Switching to a different board with unsaved edits → inline confirm bar (no native dialog).
  const requestOpen = useCallback((path: string) => {
    if (dirty && path !== curPath) setPendingOpen(path)
    else void doOpen(path)
  }, [dirty, curPath, doOpen])

  const doSave = useCallback(async () => {
    const raw = filename.trim()
    if (!raw) return
    const name = /\.(canvas|json)$/i.test(raw) ? raw : `${raw}.canvas`
    setBusy(true); setErr(null)
    try { await saveAs(join(name)); onClose() }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)) }
    finally { setBusy(false) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filename, dir, saveAs, onClose])

  const visible = (listing.forDir === dir ? listing.entries : [])
    .filter((e) => !e.name.startsWith('.'))
    .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'directory' ? -1 : 1))

  return (
    <div className="fc-dialog-backdrop" onMouseDown={onClose}>
      <div
        className="fc-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'open' ? 'Open board' : 'Save board as'}
        data-testid="board-dialog"
        data-mode={mode}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="fc-dialog__h">
          <span>{mode === 'open' ? 'Open board' : 'Save board as'}</span>
          <button className="fc-dialog__x" aria-label="Close" onClick={onClose}>✕</button>
        </div>
        <div className="fc-dialog__path">/{dir === '.' ? '' : dir}</div>

        <ul className="fc-dialog__list">
          {dir !== '.' && dir !== '' && (
            <li><button className="fc-dialog__row fc-dialog__row--dir" onClick={parent}>↑ ..</button></li>
          )}
          {error && <li className="fc-dialog__msg">{error}</li>}
          {!error && visible.length === 0 && <li className="fc-dialog__msg">empty</li>}
          {visible.map((e) =>
            e.type === 'directory' ? (
              <li key={e.path}><button className="fc-dialog__row fc-dialog__row--dir" onClick={() => setDir(e.path)}>📁 {e.name}</button></li>
            ) : (
              <li key={e.path}>
                <button
                  className="fc-dialog__row"
                  data-testid={mode === 'open' ? 'board-open-row' : 'board-pick-row'}
                  disabled={!isCanvas(e) || busy}
                  onClick={() => (mode === 'open' ? requestOpen(e.path) : setFilename(e.name))}
                >
                  📄 {e.name}
                </button>
              </li>
            ),
          )}
        </ul>

        {mode === 'save' && (
          <div className="fc-dialog__save">
            <input
              className="fc-dialog__name"
              data-testid="board-save-name"
              value={filename}
              placeholder="board-name.canvas"
              aria-label="Board file name"
              autoFocus
              onChange={(e) => setFilename(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void doSave() } }}
            />
            <button className="fc-btn fc-btn--primary" data-testid="board-save-confirm" disabled={!filename.trim() || busy} onClick={() => void doSave()}>Save</button>
          </div>
        )}

        {pendingOpen && (
          <div className="fc-dialog__confirm" role="alert" data-testid="board-discard-confirm">
            <span>Unsaved changes will be lost.</span>
            <button className="fc-btn fc-btn--primary" data-testid="board-discard-yes" onClick={() => { const p = pendingOpen; setPendingOpen(null); void doOpen(p) }}>Discard &amp; open</button>
            <button className="fc-btn" onClick={() => setPendingOpen(null)}>Cancel</button>
          </div>
        )}

        {err && <div className="fc-dialog__err" role="alert">{err}</div>}
      </div>
    </div>
  )
}

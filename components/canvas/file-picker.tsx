'use client'
import { useCallback, useEffect, useState } from 'react'
import { listDir, type DirEntry } from '@/lib/api'

// A small glass popover that browses the project tree (guarded /api/files) and picks one file.
// Used by the toolbar's add-node menu for markdown + image nodes. Directories navigate; `accept`
// filters which files are pickable (dimmed otherwise).
interface FilePickerProps {
  title: string
  accept: (entry: DirEntry) => boolean
  onPick: (path: string) => void
  onClose: () => void
}

export function FilePicker({ title, accept, onPick, onClose }: FilePickerProps) {
  const [dir, setDir] = useState('.')
  // Listing keyed by the dir it belongs to (no synchronous reset in the effect).
  const [listing, setListing] = useState<{ forDir: string; entries: DirEntry[]; error: string | null }>({ forDir: '', entries: [], error: null })
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

  // Parent of the current dir (POSIX), used by the ".." row. "." has no parent.
  const parent = useCallback(() => {
    if (dir === '.' || dir === '') return
    const up = dir.split('/').slice(0, -1).join('/')
    setDir(up || '.')
  }, [dir])

  // Directories first, then files; hide dotfiles to keep the list focused.
  const visible = (listing.forDir === dir ? listing.entries : [])
    .filter((e) => !e.name.startsWith('.'))
    .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'directory' ? -1 : 1))

  return (
    <div className="fc-picker" role="dialog" aria-label={title} data-testid="file-picker" onClick={(e) => e.stopPropagation()}>
      <div className="fc-picker__h">
        <span>{title}</span>
        <button className="fc-picker__x" aria-label="Close picker" onClick={onClose}>✕</button>
      </div>
      <div className="fc-picker__path">/{dir === '.' ? '' : dir}</div>
      <ul className="fc-picker__list">
        {dir !== '.' && dir !== '' && (
          <li><button className="fc-picker__row fc-picker__row--dir" onClick={parent}>↑ ..</button></li>
        )}
        {error && <li className="fc-picker__msg">{error}</li>}
        {!error && visible.length === 0 && <li className="fc-picker__msg">empty</li>}
        {visible.map((e) =>
          e.type === 'directory' ? (
            <li key={e.path}><button className="fc-picker__row fc-picker__row--dir" onClick={() => setDir(e.path)}>📁 {e.name}</button></li>
          ) : (
            <li key={e.path}>
              <button className="fc-picker__row" disabled={!accept(e)} onClick={() => onPick(e.path)}>📄 {e.name}</button>
            </li>
          ),
        )}
      </ul>
    </div>
  )
}

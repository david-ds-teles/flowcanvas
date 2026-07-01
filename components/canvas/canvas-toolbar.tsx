'use client'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useReactFlow } from '@xyflow/react'
import { useCanvasStore } from '@/lib/canvas/store'
import { uploadFile, bundleUrl, type DirEntry } from '@/lib/api'
import type { CanvasNode, NodeShape, ComponentKind } from '@/lib/canvas/jsoncanvas'
import { COMPONENT_KINDS, COMPONENT_KIND_META } from '@/lib/canvas/jsoncanvas'
import { FilePicker } from './file-picker'

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif'])
const MD_EXT = new Set(['.md', '.mdx'])
const isMd = (e: DirEntry) => !!e.ext && MD_EXT.has(e.ext.toLowerCase())
const isImage = (e: DirEntry) => !!e.ext && IMAGE_EXT.has(e.ext.toLowerCase())

// Which transient popover is open. Only one at a time — opening one closes the rest.
//   add      — the narrow-screen (<1024px) "+ Add ▾" fallback menu
//   markdown / image — the FilePicker (insert a file node)
//   link     — the inline link-URL input (no window.prompt)
//   shape    — rectangle / ellipse / diamond chooser
//   file     — the File menu (Upload / Import / Export)
type Flyout = 'add' | 'markdown' | 'image' | 'link' | 'shape' | 'component' | 'file' | null

/** ⌘S / Ctrl+S → save (clears the dirty dot). Mounted by the toolbar. */
export function useSaveShortcut() {
  const save = useCanvasStore((s) => s.save)
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); void save() }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [save])
}

/** #1 — ⌘Z / Ctrl+Z → undo, ⌘⇧Z / Ctrl+Y → redo. Ignored while typing in a field so it never hijacks a
 *  field's native undo. Mounted by the toolbar. */
export function useUndoRedoShortcut() {
  const undo = useCanvasStore((s) => s.undo)
  const redo = useCanvasStore((s) => s.redo)
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      const k = e.key.toLowerCase()
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      else if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); redo() }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [undo, redo])
}

interface CanvasToolbarProps {
  onOpenAgent: (tab: 'export' | 'import' | 'kit') => void
  onOpenBoard: (mode: 'open' | 'save') => void
  onClearBoard: () => void
  railLeft: 'open' | 'collapsed'
  railRight: 'open' | 'collapsed'
  onToggleRailLeft: () => void
  onToggleRailRight: () => void
  onOpenTemplates: () => void
  onOpenSubmit: () => void
}

export function CanvasToolbar({ onOpenAgent, onOpenBoard, onClearBoard, railLeft, railRight, onToggleRailLeft, onToggleRailRight, onOpenTemplates, onOpenSubmit }: CanvasToolbarProps) {
  useSaveShortcut()
  useUndoRedoShortcut()
  const { fitView, screenToFlowPosition } = useReactFlow()
  const path = useCanvasStore((s) => s.path)
  const mode = useCanvasStore((s) => s.mode)
  const setMode = useCanvasStore((s) => s.setMode)
  const dirty = useCanvasStore((s) => s.dirty)
  const save = useCanvasStore((s) => s.save)
  const addNode = useCanvasStore((s) => s.addNode)
  const addFileNode = useCanvasStore((s) => s.addFileNode)
  const newBoard = useCanvasStore((s) => s.newBoard)
  const removeNode = useCanvasStore((s) => s.removeNode)
  const doc = useCanvasStore((s) => s.doc)
  const selectedIds = useCanvasStore((s) => s.selectedIds)
  const groupSelection = useCanvasStore((s) => s.groupSelection)
  const ungroup = useCanvasStore((s) => s.ungroup)
  const organizeByType = useCanvasStore((s) => s.organizeByType)
  const undo = useCanvasStore((s) => s.undo)
  const redo = useCanvasStore((s) => s.redo)
  const canUndo = useCanvasStore((s) => s.past.length > 0)
  const canRedo = useCanvasStore((s) => s.future.length > 0)
  const [reorganizing, setReorganizing] = useState(false)

  // Group needs ≥2 ungrouped, non-group nodes; Ungroup needs ≥1 selected group.
  const selectedGroupIds = doc ? doc.nodes.filter((n) => n.type === 'group' && selectedIds.includes(n.id)).map((n) => n.id) : []
  const canGroup = doc ? selectedIds.filter((id) => { const n = doc.nodes.find((x) => x.id === id); return !!n && n.type !== 'group' && !n.parentId }).length >= 2 : false
  const canUngroup = selectedGroupIds.length > 0

  // #7/#8 — Organize by type: re-lay the board into component-kind bands (services/datastores/queues/…),
  // arranging each group's children into the same bands and resizing the group to enclose them, then fit.
  const reorganize = useCallback(() => {
    if (!doc || reorganizing) return
    setReorganizing(true)
    try {
      organizeByType()
      setTimeout(() => fitView({ duration: 320, padding: 0.2 }), 80) // let the store→RF sync land before fitting
    } finally {
      setReorganizing(false)
    }
  }, [doc, reorganizing, organizeByType, fitView])

  const [open, setOpen] = useState<Flyout>(null)         // the single open popover
  const [linkUrl, setLinkUrl] = useState('')             // inline link-URL input
  const [uploadError, setUploadError] = useState<string | null>(null)
  const uploadRef = useRef<HTMLInputElement>(null)
  const toolbarRef = useRef<HTMLElement>(null)

  const close = useCallback(() => { setOpen(null); setLinkUrl('') }, [])
  const toggle = useCallback((f: Flyout) => setOpen((cur) => (cur === f ? null : f)), [])

  // Snap a fresh node to the viewport centre, on a 20px grid (matches the agent contract's grid rule).
  const placeAt = useCallback(
    (dx = 0, dy = 0) => {
      const p = screenToFlowPosition({ x: window.innerWidth / 2 + dx, y: window.innerHeight / 2 + dy })
      return { x: Math.round(p.x / 20) * 20, y: Math.round(p.y / 20) * 20 }
    },
    [screenToFlowPosition],
  )

  const addText = useCallback(() => {
    const { x, y } = placeAt()
    addNode({ id: `n-${crypto.randomUUID().slice(0, 8)}`, type: 'text', text: '', x, y, width: 280, height: 160, color: '#5ef2ff', meta: { origin: 'user' } } as CanvasNode)
    close()
  }, [addNode, placeAt, close])

  const addShape = useCallback((shape: NodeShape) => {
    const { x, y } = placeAt()
    addNode({ id: `n-${crypto.randomUUID().slice(0, 8)}`, type: 'group', label: '', x, y, width: 320, height: 220, meta: { origin: 'user', shape } } as CanvasNode)
    close()
  }, [addNode, placeAt, close])

  const addComponent = useCallback((kind: ComponentKind) => {
    const { x, y } = placeAt()
    addNode({ id: `n-${crypto.randomUUID().slice(0, 8)}`, type: 'text', text: '', x, y, width: 200, height: 100, meta: { origin: 'user', kind } } as CanvasNode)
    close()
  }, [addNode, placeAt, close])

  const addLink = useCallback((url: string) => {
    const trimmed = url.trim()
    if (!trimmed) return
    const { x, y } = placeAt()
    addNode({ id: `n-${crypto.randomUUID().slice(0, 8)}`, type: 'link', url: trimmed, x, y, width: 280, height: 80, meta: { origin: 'user' } } as CanvasNode)
    close()
  }, [addNode, placeAt, close])

  const pickFile = useCallback((path: string) => {
    const { x, y } = placeAt()
    void addFileNode(path, x, y)
    close()
  }, [addFileNode, placeAt, close])

  // toolbar-upload: write the bytes via /api/upload, then add a node per uploaded file (offset so a
  // multi-file drop doesn't stack on one spot).
  const onUpload = useCallback(async (files: FileList | null) => {
    if (!files) return
    let i = 0
    for (const f of Array.from(files)) {
      try {
        const path = await uploadFile(f)
        const { x, y } = placeAt(i * 28, i * 28)
        await addFileNode(path, x, y)
        i++
      } catch (e) {
        // The route rejects disallowed extensions / oversize files — tell the user instead of a silent no-op.
        console.error('upload failed', f.name, e)
        setUploadError(`${f.name}: ${e instanceof Error ? e.message : 'upload failed'}`)
        setTimeout(() => setUploadError(null), 3500)
      }
    }
    if (uploadRef.current) uploadRef.current.value = ''
  }, [addFileNode, placeAt])

  // Esc closes any open popover; click outside the toolbar closes too (the FilePicker / link input own their own keys).
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    const onDown = (e: MouseEvent) => { if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) close() }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onDown)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('mousedown', onDown) }
  }, [open, close])

  const modeBtn = (m: typeof mode, testid: string, label: string, icon: ReactNode) => (
    <button
      type="button"
      className="fc-tbtn"
      data-testid={testid}
      aria-pressed={mode === m}
      aria-label={label}
      title={label}
      onClick={() => setMode(m)}
    >
      {icon}
    </button>
  )

  // One factory for the direct insert icon buttons (wide layout) — keeps the toolbar-add-{kind} testids.
  const insertBtn = (testid: string, label: string, icon: ReactNode, onClick: () => void, expanded?: boolean) => (
    <button
      type="button"
      className="fc-tbtn fc-tbtn--icon"
      data-testid={testid}
      aria-label={label}
      title={label}
      {...(expanded !== undefined ? { 'aria-haspopup': 'menu' as const, 'aria-expanded': expanded } : {})}
      onClick={onClick}
    >
      {icon}
    </button>
  )

  const sv = (paths: ReactNode) => (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{paths}</svg>
  )

  return (
    <header className="fc-toolbar" ref={toolbarRef} data-testid="toolbar">
      <button type="button" className="fc-tbtn fc-tbtn--icon" data-testid="toggle-rail-left" aria-pressed={railLeft === 'open'} aria-label="Toggle structure rail" title="Toggle structure rail" onClick={onToggleRailLeft}>
        {sv(<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /></>)}
      </button>

      <span className="fc-toolbar__mark">◐ flowcanvas</span>

      <span className="fc-toolbar__divider" aria-hidden="true" />

      <div className="fc-toolbar__seg" role="group" aria-label="Mode">
        {modeBtn('select', 'toolbar-select', 'Select', <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"><path d="M5 3l14 8-6 1.5L10 19z" /></svg>)}
        {modeBtn('connect', 'toolbar-connect', 'Connect (draw edges)', <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="M8 8l8 8" /></svg>)}
        {modeBtn('comment', 'toolbar-comment-mode', 'Comment', <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"><path d="M5 5h14v10H9l-4 4z" /></svg>)}
        {modeBtn('pan', 'toolbar-pan', 'Pan / Hand — drag to navigate the board (H · or hold Space)', <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V10m0-.5a1.5 1.5 0 0 1 3 0V12m0-1.5a1.5 1.5 0 0 1 3 0V15a5 5 0 0 1-5 5h-1a5 5 0 0 1-3.6-1.5L6 16c-.9-.9-.4-2.3.9-2.3.6 0 1.1.2 1.5.6l.6.7V7a1.5 1.5 0 0 1 3 0" /></svg>)}
      </div>

      <span className="fc-toolbar__divider" aria-hidden="true" />

      {/* Wide (≥1024px): insert tools as direct icon buttons on the rail. */}
      <div className="fc-toolbar__inserts">
        {insertBtn('toolbar-add-note', 'Add note', sv(<><rect x="5" y="4" width="14" height="16" rx="2" /><path d="M8 9h8M8 13h6" /></>), addText)}
        {insertBtn('toolbar-add-markdown', 'Add markdown file', sv(<><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M7 15V9l3 3 3-3v6" /></>), () => toggle('markdown'), open === 'markdown')}
        {insertBtn('toolbar-add-image', 'Add image', sv(<><rect x="4" y="5" width="16" height="14" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="M5 17l5-5 4 4 2-2 3 3" /></>), () => toggle('image'), open === 'image')}
        {insertBtn('toolbar-add-link', 'Add link', sv(<path d="M9 15l6-6M8 12l-2 2a3 3 0 104 4l2-2M16 12l2-2a3 3 0 10-4-4l-2 2" />), () => toggle('link'), open === 'link')}
        <button type="button" className="fc-tbtn fc-tbtn--flyout" data-testid="toolbar-add-shape" aria-label="Add shape" title="Add shape" aria-haspopup="menu" aria-expanded={open === 'shape'} onClick={() => toggle('shape')}>
          {sv(<rect x="5" y="6" width="14" height="12" rx="2" />)}
          <svg className="fc-tbtn__caret" viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
        </button>
        <button type="button" className="fc-tbtn fc-tbtn--flyout" data-testid="toolbar-add-component" aria-label="Add component" title="Add component" aria-haspopup="menu" aria-expanded={open === 'component'} onClick={() => toggle('component')}>
          {sv(<><rect x="5" y="7" width="14" height="10" rx="1" /><path d="M8 7V5M16 7V5M5 13h14" /></>)}
          <svg className="fc-tbtn__caret" viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
        </button>
      </div>

      {/* Narrow (<1024px): collapse the insert tools back into the legacy "+ Add ▾" menu. */}
      <div className="fc-toolbar__add">
        <button type="button" className="fc-tbtn fc-tbtn--wide" data-testid="toolbar-add-node" aria-haspopup="menu" aria-expanded={open === 'add'} onClick={() => toggle('add')}>
          + Add ▾
        </button>
      </div>

      {/* Shared popover host for the insert flyouts — anchored once so it works in both layouts. */}
      <div className="fc-toolbar__flyhost">
        {open === 'add' && (
          <div className="fc-menu" role="menu" data-testid="add-node-menu">
            <button className="fc-menu__item" data-testid="add-node-markdown" role="menuitem" onClick={() => setOpen('markdown')}>Markdown file…</button>
            <button className="fc-menu__item" data-testid="add-node-text" role="menuitem" onClick={addText}>Note (text)</button>
            <button className="fc-menu__item" data-testid="add-node-shape" role="menuitem" onClick={() => setOpen('shape')}>Shape ▸</button>
            <button className="fc-menu__item" data-testid="add-node-component" role="menuitem" onClick={() => setOpen('component')}>Component ▸</button>
            <button className="fc-menu__item" data-testid="add-node-image" role="menuitem" onClick={() => setOpen('image')}>Image…</button>
            <button className="fc-menu__item" data-testid="add-node-link" role="menuitem" onClick={() => setOpen('link')}>Link…</button>
          </div>
        )}

        {open === 'shape' && (
          <div className="fc-menu fc-menu--shapes" role="menu" aria-label="Shape" data-testid="shape-menu">
            <button className="fc-menu__item" data-testid="add-node-rectangle" role="menuitem" onClick={() => addShape('rectangle')}>▭ Rectangle</button>
            <button className="fc-menu__item" data-testid="add-node-ellipse" role="menuitem" onClick={() => addShape('ellipse')}>◯ Ellipse</button>
            <button className="fc-menu__item" data-testid="add-node-diamond" role="menuitem" onClick={() => addShape('diamond')}>◇ Diamond</button>
          </div>
        )}

        {open === 'component' && (
          <div className="fc-menu fc-menu--components" role="menu" aria-label="Component" data-testid="component-menu">
            {COMPONENT_KINDS.filter((k) => k !== 'boundary').map((kind) => (
              <button key={kind} className="fc-menu__item" data-testid={`add-component-${kind}`} role="menuitem" onClick={() => addComponent(kind)}>
                · {COMPONENT_KIND_META[kind].label}
              </button>
            ))}
          </div>
        )}

        {open === 'link' && (
          <div className="fc-menu fc-menu--link" onClick={(e) => e.stopPropagation()}>
            <input
              className="fc-menu__input"
              data-testid="add-node-link-input"
              autoFocus
              value={linkUrl}
              placeholder="https://…"
              aria-label="Link URL"
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLink(linkUrl) } if (e.key === 'Escape') { e.preventDefault(); close() } }}
            />
            <button className="fc-btn fc-btn--primary" onClick={() => addLink(linkUrl)}>Add</button>
          </div>
        )}

        {(open === 'markdown' || open === 'image') && (
          <FilePicker
            title={open === 'markdown' ? 'Pick a markdown file' : 'Pick an image'}
            accept={open === 'markdown' ? isMd : isImage}
            onPick={pickFile}
            onClose={close}
          />
        )}
      </div>

      <span className="fc-toolbar__divider" aria-hidden="true" />

      {/* File menu — Upload / Import / Export collapsed behind one trigger. */}
      <div className="fc-toolbar__file">
        <button type="button" className="fc-tbtn fc-tbtn--flyout" data-testid="toolbar-file-menu" aria-label="File" title="File" aria-haspopup="menu" aria-expanded={open === 'file'} onClick={() => toggle('file')}>
          {sv(<><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4" /></>)}
          <span>File</span>
          <svg className="fc-tbtn__caret" viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
        </button>
        {open === 'file' && (
          <div className="fc-menu fc-menu--file" role="menu" aria-label="File" data-testid="file-menu">
            <button className="fc-menu__item" data-testid="toolbar-new-board" role="menuitem" onClick={() => { void newBoard(); close() }}>✨ New board</button>
            <button className="fc-menu__item" data-testid="toolbar-clear-board" role="menuitem" onClick={() => { onClearBoard(); close() }}>🧹 Clear board…</button>
            <div className="fc-menu__sep" aria-hidden="true" />
            <button className="fc-menu__item" data-testid="toolbar-open-board" role="menuitem" onClick={() => { onOpenBoard('open'); close() }}>📂 Open board…</button>
            <button className="fc-menu__item" data-testid="toolbar-saveas-board" role="menuitem" onClick={() => { onOpenBoard('save'); close() }}>💾 Save as…</button>
            <div className="fc-menu__sep" aria-hidden="true" />
            <button className="fc-menu__item" data-testid="toolbar-upload" role="menuitem" onClick={() => { uploadRef.current?.click(); close() }}>↑ Upload…</button>
            <button className="fc-menu__item" data-testid="toolbar-import" role="menuitem" onClick={() => { onOpenAgent('import'); close() }}>↧ Import response…</button>
            <button className="fc-menu__item" data-testid="toolbar-export" role="menuitem" onClick={() => { onOpenAgent('export'); close() }}>↥ Export brief…</button>
          </div>
        )}
      </div>
      <input ref={uploadRef} type="file" accept="image/*,.md,.mdx" multiple hidden onChange={(e) => void onUpload(e.target.files)} />
      {uploadError && <span className="fc-toolbar__err" data-testid="upload-error" role="alert">{uploadError}</span>}

      <span className="fc-toolbar__divider fc-toolbar__divider--arrange" aria-hidden="true" />

      {/* #1 undo/redo · multi-select grouping · type-band auto-layout. */}
      <div className="fc-toolbar__arrange">
        <button type="button" className="fc-tbtn fc-tbtn--icon" data-testid="toolbar-undo" disabled={!canUndo} aria-disabled={!canUndo} aria-label="Undo (⌘Z)" title="Undo (⌘Z)" onClick={undo}>
          {sv(<path d="M9 7l-5 5 5 5M4 12h10a5 5 0 0 1 0 10h-1" />)}
        </button>
        <button type="button" className="fc-tbtn fc-tbtn--icon" data-testid="toolbar-redo" disabled={!canRedo} aria-disabled={!canRedo} aria-label="Redo (⌘⇧Z)" title="Redo (⌘⇧Z)" onClick={redo}>
          {sv(<path d="M15 7l5 5-5 5M20 12H10a5 5 0 0 0 0 10h1" />)}
        </button>
        <button type="button" className="fc-tbtn fc-tbtn--icon" data-testid="toolbar-group" disabled={!canGroup} aria-disabled={!canGroup} aria-label="Group selection" title="Group selection (select ≥2 nodes)" onClick={() => groupSelection(selectedIds)}>
          {sv(<><path d="M4 8V5h3M17 5h3v3M20 16v3h-3M7 19H4v-3" /><rect x="9" y="9" width="6" height="6" rx="1" /></>)}
        </button>
        <button type="button" className="fc-tbtn fc-tbtn--icon" data-testid="toolbar-ungroup" disabled={!canUngroup} aria-disabled={!canUngroup} aria-label="Ungroup" title="Ungroup selected container" onClick={() => selectedGroupIds.forEach((id) => ungroup(id))}>
          {sv(<><path d="M4 8V5h3M20 16v3h-3M7 19H4v-3" /><path d="M14 5h6v6" /><path d="M10 14l8-8" /></>)}
        </button>
        <button type="button" className={`fc-tbtn fc-tbtn--icon${reorganizing ? ' is-busy' : ''}`} data-testid="toolbar-reorganize" disabled={!doc || reorganizing} aria-busy={reorganizing} aria-label="Organize by type" title="Organize by type — band components into readable layers" onClick={reorganize}>
          {sv(<><path d="M4 6h7M4 12h7M4 18h7" /><path d="M16 8l3-3 3 3M19 5v14" /></>)}
        </button>
        <button type="button" className="fc-tbtn fc-tbtn--icon fc-tbtn--danger" data-testid="toolbar-delete" disabled={selectedIds.length === 0} aria-disabled={selectedIds.length === 0} aria-label="Delete selection" title={selectedIds.length ? `Delete selection (${selectedIds.length}) · Del` : 'Delete selection (select a node · Del)'} onClick={() => selectedIds.forEach((id) => removeNode(id))}>
          {sv(<><path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13" /><path d="M10 11v6M14 11v6" /></>)}
        </button>
      </div>

      <div className="fc-toolbar__spacer" />

      {/* v2 — agent round-trip + studio surfaces */}
      {/* 004 — discoverable Agent Generation Kit: opens the kit bundle (copy-paste for any LLM). */}
      <button type="button" className="fc-tbtn fc-tbtn--kit" data-testid="generation-kit-button" aria-label="Agent Generation Kit" title="Agent Generation Kit — copy the full kit for any LLM" onClick={() => onOpenAgent('kit')}>
        {sv(<><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 3v18M4 7.5l8 4.5 8-4.5" /></>)}<span>Kit</span>
      </button>
      <button type="button" className="fc-tbtn fc-tbtn--primary" data-testid="toolbar-submit" aria-label="Submit to agent" title="Submit to agent" onClick={onOpenSubmit}>
        {sv(<path d="M4 12l16-8-6 16-3-6z" />)}<span>Submit</span>
      </button>
      <button type="button" className="fc-tbtn fc-tbtn--icon" data-testid="toolbar-templates" aria-label="Template library" title="Template library" onClick={onOpenTemplates}>
        {sv(<><rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" /><rect x="4" y="13" width="7" height="7" rx="1" /></>)}
      </button>
      {path && (
        <a className="fc-tbtn fc-tbtn--icon" data-testid="toolbar-bundle" aria-label="Export bundle (zip)" title="Export bundle (zip)" href={bundleUrl(path)} download>
          {sv(<><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /><path d="M3.3 7L12 12l8.7-5M12 22V12" /></>)}
        </a>
      )}

      <span className="fc-toolbar__divider" aria-hidden="true" />

      <button type="button" className="fc-tbtn fc-tbtn--icon" data-testid="toolbar-fit-view" aria-label="Fit view" title="Fit view" onClick={() => fitView({ duration: 240, padding: 0.2 })}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9V5a1 1 0 011-1h4M20 9V5a1 1 0 00-1-1h-4M4 15v4a1 1 0 001 1h4M20 15v4a1 1 0 01-1 1h-4" /></svg>
      </button>

      <button type="button" className="fc-tbtn fc-tbtn--save" data-testid="toolbar-save" aria-label="Save (⌘S)" title="Save (⌘S)" onClick={() => void save()}>
        Save{dirty && <span className="fc-toolbar__dot" data-testid="dirty-dot" aria-hidden="true" />}
      </button>

      <button type="button" className="fc-tbtn fc-tbtn--icon" data-testid="toggle-rail-right" aria-pressed={railRight === 'open'} aria-label="Toggle inspector" title="Toggle inspector" onClick={onToggleRailRight}>
        {sv(<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M15 4v16" /></>)}
      </button>
    </header>
  )
}

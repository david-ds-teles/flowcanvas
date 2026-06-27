'use client'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useReactFlow } from '@xyflow/react'
import { useCanvasStore } from '@/lib/canvas/store'
import { uploadFile, type DirEntry } from '@/lib/api'
import type { CanvasNode, NodeShape } from '@/lib/canvas/jsoncanvas'
import { FilePicker } from './file-picker'

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif'])
const MD_EXT = new Set(['.md', '.mdx'])
const isMd = (e: DirEntry) => !!e.ext && MD_EXT.has(e.ext.toLowerCase())
const isImage = (e: DirEntry) => !!e.ext && IMAGE_EXT.has(e.ext.toLowerCase())

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

interface CanvasToolbarProps {
  onOpenAgent: (tab: 'export' | 'import') => void
}

export function CanvasToolbar({ onOpenAgent }: CanvasToolbarProps) {
  useSaveShortcut()
  const { fitView, screenToFlowPosition } = useReactFlow()
  const mode = useCanvasStore((s) => s.mode)
  const setMode = useCanvasStore((s) => s.setMode)
  const dirty = useCanvasStore((s) => s.dirty)
  const save = useCanvasStore((s) => s.save)
  const addNode = useCanvasStore((s) => s.addNode)
  const addFileNode = useCanvasStore((s) => s.addFileNode)

  const [menu, setMenu] = useState(false)                       // add-node dropdown open
  const [picker, setPicker] = useState<'markdown' | 'image' | null>(null)
  const [linkUrl, setLinkUrl] = useState<string | null>(null)   // inline link-URL input (no window.prompt)
  const [shapeOpen, setShapeOpen] = useState(false)             // shape sub-row (rectangle/ellipse/diamond)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const uploadRef = useRef<HTMLInputElement>(null)

  // Snap a fresh node to the viewport centre, on a 20px grid (matches the agent contract's grid rule).
  const placeAt = useCallback(
    (dx = 0, dy = 0) => {
      const p = screenToFlowPosition({ x: window.innerWidth / 2 + dx, y: window.innerHeight / 2 + dy })
      return { x: Math.round(p.x / 20) * 20, y: Math.round(p.y / 20) * 20 }
    },
    [screenToFlowPosition],
  )

  const closeMenu = useCallback(() => { setMenu(false); setPicker(null); setLinkUrl(null); setShapeOpen(false) }, [])

  const addText = useCallback(() => {
    const { x, y } = placeAt()
    addNode({ id: `n-${crypto.randomUUID().slice(0, 8)}`, type: 'text', text: '', x, y, width: 280, height: 160, color: '#5ef2ff', meta: { origin: 'user' } } as CanvasNode)
    closeMenu()
  }, [addNode, placeAt, closeMenu])

  const addShape = useCallback((shape: NodeShape) => {
    const { x, y } = placeAt()
    addNode({ id: `n-${crypto.randomUUID().slice(0, 8)}`, type: 'group', label: '', x, y, width: 320, height: 220, meta: { origin: 'user', shape } } as CanvasNode)
    closeMenu()
  }, [addNode, placeAt, closeMenu])

  const addLink = useCallback((url: string) => {
    const trimmed = url.trim()
    if (!trimmed) return
    const { x, y } = placeAt()
    addNode({ id: `n-${crypto.randomUUID().slice(0, 8)}`, type: 'link', url: trimmed, x, y, width: 280, height: 80, meta: { origin: 'user' } } as CanvasNode)
    closeMenu()
  }, [addNode, placeAt, closeMenu])

  const pickFile = useCallback((path: string) => {
    const { x, y } = placeAt()
    void addFileNode(path, x, y)
    closeMenu()
  }, [addFileNode, placeAt, closeMenu])

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

  // Esc closes the menu when no picker/input is open (those handle their own Esc).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && menu && !picker && linkUrl === null && !shapeOpen) setMenu(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menu, picker, linkUrl, shapeOpen])

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

  return (
    <header className="fc-toolbar" data-testid="toolbar">
      <span className="fc-toolbar__mark">◐ flowcanvas</span>

      <div className="fc-toolbar__group" role="group" aria-label="Mode">
        {modeBtn('select', 'toolbar-select', 'Select', <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"><path d="M5 3l14 8-6 1.5L10 19z" /></svg>)}
        {modeBtn('connect', 'toolbar-connect', 'Connect (draw edges)', <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="6" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="M8 8l8 8" /></svg>)}
        {modeBtn('comment', 'toolbar-comment-mode', 'Comment', <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"><path d="M5 5h14v10H9l-4 4z" /></svg>)}
      </div>

      <div className="fc-toolbar__group" style={{ position: 'relative' }}>
        <button type="button" className="fc-tbtn fc-tbtn--wide" data-testid="toolbar-add-node" aria-haspopup="menu" aria-expanded={menu} onClick={() => (menu ? closeMenu() : setMenu(true))}>
          + Add ▾
        </button>
        {menu && (
          <div className="fc-menu" role="menu" data-testid="add-node-menu" onMouseLeave={() => { if (!picker && linkUrl === null && !shapeOpen) setMenu(false) }}>
            <button className="fc-menu__item" data-testid="add-node-markdown" role="menuitem" onClick={() => setPicker('markdown')}>Markdown file…</button>
            <button className="fc-menu__item" data-testid="add-node-text" role="menuitem" onClick={addText}>Note (text)</button>
            <button className="fc-menu__item" data-testid="add-node-shape" role="menuitem" aria-expanded={shapeOpen} onClick={() => setShapeOpen((v) => !v)}>Shape ▸</button>
            {shapeOpen && (
              <div className="fc-menu__shapes" onClick={(e) => e.stopPropagation()}>
                <button className="fc-menu__shape" data-testid="add-node-rectangle" onClick={() => addShape('rectangle')}>▭ Rectangle</button>
                <button className="fc-menu__shape" data-testid="add-node-ellipse" onClick={() => addShape('ellipse')}>◯ Ellipse</button>
                <button className="fc-menu__shape" data-testid="add-node-diamond" onClick={() => addShape('diamond')}>◇ Diamond</button>
              </div>
            )}
            <button className="fc-menu__item" data-testid="add-node-image" role="menuitem" onClick={() => setPicker('image')}>Image…</button>
            <button className="fc-menu__item" data-testid="add-node-link" role="menuitem" onClick={() => setLinkUrl('')}>Link…</button>

            {linkUrl !== null && (
              <div className="fc-menu__link" onClick={(e) => e.stopPropagation()}>
                <input
                  className="fc-menu__input"
                  data-testid="add-node-link-input"
                  autoFocus
                  value={linkUrl}
                  placeholder="https://…"
                  aria-label="Link URL"
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLink(linkUrl) } if (e.key === 'Escape') { e.preventDefault(); setLinkUrl(null) } }}
                />
                <button className="fc-btn fc-btn--primary" onClick={() => addLink(linkUrl)}>Add</button>
              </div>
            )}

            {picker && (
              <FilePicker
                title={picker === 'markdown' ? 'Pick a markdown file' : 'Pick an image'}
                accept={picker === 'markdown' ? isMd : isImage}
                onPick={pickFile}
                onClose={() => setPicker(null)}
              />
            )}
          </div>
        )}
      </div>

      <button type="button" className="fc-tbtn fc-tbtn--wide" data-testid="toolbar-upload" onClick={() => uploadRef.current?.click()}>↑ Upload</button>
      <input ref={uploadRef} type="file" accept="image/*,.md,.mdx" multiple hidden onChange={(e) => void onUpload(e.target.files)} />
      {uploadError && <span className="fc-toolbar__err" data-testid="upload-error" role="alert">{uploadError}</span>}

      <div className="fc-toolbar__spacer" />

      <div className="fc-toolbar__group">
        <button type="button" className="fc-tbtn fc-tbtn--wide" data-testid="toolbar-import" onClick={() => onOpenAgent('import')}>Import</button>
        <button type="button" className="fc-tbtn fc-tbtn--wide" data-testid="toolbar-export" onClick={() => onOpenAgent('export')}>Export</button>
      </div>

      <button type="button" className="fc-tbtn" data-testid="toolbar-fit-view" aria-label="Fit view" title="Fit view" onClick={() => fitView({ duration: 240, padding: 0.2 })}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9V5a1 1 0 011-1h4M20 9V5a1 1 0 00-1-1h-4M4 15v4a1 1 0 001 1h4M20 15v4a1 1 0 01-1 1h-4" /></svg>
      </button>

      <button type="button" className="fc-tbtn fc-tbtn--save" data-testid="toolbar-save" aria-label="Save (⌘S)" title="Save (⌘S)" onClick={() => void save()}>
        Save{dirty && <span className="fc-toolbar__dot" data-testid="dirty-dot" aria-hidden="true" />}
      </button>
    </header>
  )
}

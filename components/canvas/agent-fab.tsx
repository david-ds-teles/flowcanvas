'use client'
import { useEffect, useRef, useState } from 'react'
// agent-fab.css is loaded via app/globals.css (matches the project's CSS-centralization convention).

// Issue #8 — the floating agent widget. A fixed bottom-right control that sits near-invisible at rest
// (≈0.3 opacity) and snaps to full opacity on hover / focus-within / while its menu is open. Clicking
// it raises a small upward popover with three actions that REUSE the shell's existing handlers — the
// same ones the toolbar/export-panel and the inspector submit flow already drive.
export interface AgentFabProps {
  onOpenAgent: (tab: 'export' | 'import' | 'kit') => void
  onSubmit: () => void
}

export function AgentFab({ onOpenAgent, onSubmit }: AgentFabProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // Dismiss on outside-click / Escape (mirrors the toolbar popovers).
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const run = (fn: () => void) => { fn(); setOpen(false) }

  return (
    <div className="fc-fab" data-testid="agent-fab" data-open={open ? 'true' : 'false'} ref={rootRef}>
      {open && (
        <div className="fc-fab__menu" data-testid="agent-fab-menu" role="menu" aria-label="Agent actions">
          <button type="button" className="fc-fab__item" data-testid="agent-fab-kit" role="menuitem" onClick={() => run(() => onOpenAgent('kit'))}>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8" />
            </svg>
            Generation Kit
          </button>
          <button type="button" className="fc-fab__item" data-testid="agent-fab-export" role="menuitem" onClick={() => run(() => onOpenAgent('export'))}>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M8 7H5v12h14V7h-3" />
              <path d="M12 3v11M8 7l4-4 4 4" />
            </svg>
            Import / Export
          </button>
          <button type="button" className="fc-fab__item" data-testid="agent-fab-submit" role="menuitem" onClick={() => run(onSubmit)}>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 12l16-7-7 16-2-7z" />
            </svg>
            Submit to agent
          </button>
        </div>
      )}
      <button
        type="button"
        className="fc-fab__btn"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Agent actions"
        title="Agent"
        onClick={() => setOpen((v) => !v)}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <circle cx="8" cy="10" r="1" fill="currentColor" stroke="none" />
          <circle cx="12" cy="10" r="1" fill="currentColor" stroke="none" />
          <circle cx="16" cy="10" r="1" fill="currentColor" stroke="none" />
        </svg>
      </button>
    </div>
  )
}

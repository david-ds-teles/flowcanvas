'use client'
import { useEffect, useState } from 'react'
import { listTemplates } from '@/lib/api'
import { useCanvasStore } from '@/lib/canvas/store'
import type { CanvasTemplate, TemplateKind } from '@/lib/canvas/templates'
import { TEMPLATE_MIME } from './template-drop'

// TemplateTray — docked inside the left rail's "Templates" pane (Phase 6, system-design-studio).
// Fetches all CanvasTemplate fragments from /api/templates on mount, provides kind filtering
// (all / node / diagram / document), and instantiates at a fixed near-origin drop point (320, 220).
// Accepts an optional onClose prop wired to the × affordance; safe to render without one.

type KindFilter = 'all' | TemplateKind
const KIND_FILTERS: KindFilter[] = ['all', 'node', 'diagram', 'document']

export function TemplateTray({ onClose }: { onClose?: () => void } = {}) {
  const addTemplate = useCanvasStore((s) => s.addTemplate)
  const [templates, setTemplates] = useState<CanvasTemplate[]>([])
  const [activeKind, setActiveKind] = useState<KindFilter>('all')
  // Track which template is currently being instantiated (by id) so we can show "Adding…"
  // and block concurrent clicks without disabling the whole tray.
  const [instantiating, setInstantiating] = useState<string | null>(null)

  // Load template list once on mount. Errors collapse to an empty list (tray shows empty state).
  useEffect(() => {
    let live = true
    listTemplates()
      .then((ts) => { if (live) setTemplates(ts) })
      .catch(() => { if (live) setTemplates([]) })
    return () => { live = false }
  }, [])

  const visible =
    activeKind === 'all'
      ? templates
      : templates.filter((t) => t.kind === activeKind)

  async function handleInstantiate(t: CanvasTemplate) {
    if (instantiating) return           // guard: no concurrent instantiations
    setInstantiating(t.id)
    try {
      await addTemplate(t, 320, 220)   // default drop point near canvas origin
    } finally {
      setInstantiating(null)
    }
  }

  return (
    <div className="fc-tpl" data-testid="template-tray">

      {/* header */}
      <div className="fc-tpl__head">
        <b className="fc-tpl__title">Templates</b>
        <button
          className="fc-tpl__close"
          data-testid="template-close"
          aria-label="Close templates"
          onClick={() => onClose?.()}
        >
          ✕
        </button>
      </div>

      {/* kind filter strip */}
      <div className="fc-tpl__filter" role="group" aria-label="Template kind">
        {KIND_FILTERS.map((k) => (
          <button
            key={k}
            className="fc-tpl__filter-btn"
            data-testid="template-kind-filter"
            aria-pressed={activeKind === k}
            onClick={() => setActiveKind(k)}
          >
            {k}
          </button>
        ))}
      </div>

      {/* empty state */}
      {visible.length === 0 && (
        <p className="fc-tpl__empty">No templates yet.</p>
      )}

      {/* template cards — draggable onto the canvas (drops where released), or click + Instantiate */}
      {visible.map((t) => (
        <div
          key={t.id}
          className="fc-tpl__card"
          data-testid="template-card"
          tabIndex={0}
          draggable
          title="Drag onto the canvas to place it, or click + Instantiate"
          onDragStart={(e) => {
            e.dataTransfer.setData(TEMPLATE_MIME, JSON.stringify(t))
            e.dataTransfer.effectAllowed = 'copy'
          }}
        >
          <span className="fc-tpl__kind">{t.kind}</span>
          <h4 className="fc-tpl__name">{t.name}</h4>
          {t.description && <p className="fc-tpl__desc">{t.description}</p>}
          {/* schematic preview — a simple dot-grid placeholder; the real preview could be SVG-based later */}
          <div className="fc-tpl__preview" aria-hidden="true" />
          <span className="fc-tpl__draghint" aria-hidden="true">⠿ drag onto canvas</span>
          <button
            className="fc-tpl__add"
            data-testid="template-instantiate"
            disabled={instantiating !== null}
            onClick={() => void handleInstantiate(t)}
          >
            {instantiating === t.id ? 'Adding…' : '+ Instantiate'}
          </button>
        </div>
      ))}
    </div>
  )
}

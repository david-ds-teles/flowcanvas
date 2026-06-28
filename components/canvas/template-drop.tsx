'use client'
import { useCallback, useEffect, useState } from 'react'
import { useReactFlow } from '@xyflow/react'
import { useCanvasStore } from '@/lib/canvas/store'
import type { CanvasTemplate } from '@/lib/canvas/templates'

// Custom drag payload type for a template fragment dragged out of the left-rail Template tray.
// Distinct from the OS file drag the Dropzone handles (which keys off the 'Files' type), so the two
// drop surfaces never both activate for the same drag.
export const TEMPLATE_MIME = 'application/x-flowcanvas-template'

// Full-canvas drop surface for template fragments (Decision 8 — drag-to-canvas). A template card sets
// the serialized CanvasTemplate on dragstart; dropping anywhere over the canvas projects the drop point
// to flow space and instantiates the fragment there (store.addTemplate). Window-level listeners drive
// the overlay; the card's `+ Instantiate` button stays as the keyboard / a11y fallback.
export function TemplateDropLayer() {
  const { screenToFlowPosition } = useReactFlow()
  const addTemplate = useCanvasStore((s) => s.addTemplate)
  const doc = useCanvasStore((s) => s.doc)
  const [active, setActive] = useState(false)

  const onDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault()
      setActive(false)
      const raw = e.dataTransfer?.getData(TEMPLATE_MIME)
      if (!raw) return
      let tpl: CanvasTemplate
      try { tpl = JSON.parse(raw) as CanvasTemplate } catch { return }
      const p = screenToFlowPosition({ x: e.clientX, y: e.clientY })
      // Snap to the 20px grid (matches the file-drop behaviour) so dropped fragments align.
      await addTemplate(tpl, Math.round(p.x / 20) * 20, Math.round(p.y / 20) * 20)
    },
    [screenToFlowPosition, addTemplate],
  )

  useEffect(() => {
    // Only react to template drags (carry the custom MIME) — ignore OS file drags + in-canvas node drags.
    const hasTemplate = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes(TEMPLATE_MIME)
    const onOver = (e: DragEvent) => {
      if (!hasTemplate(e)) return
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
      setActive(true)
    }
    const onLeave = (e: DragEvent) => { if (e.relatedTarget === null) setActive(false) }
    const drop = (e: DragEvent) => { if (hasTemplate(e)) void onDrop(e); else setActive(false) }
    window.addEventListener('dragover', onOver)
    window.addEventListener('dragleave', onLeave)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragover', onOver)
      window.removeEventListener('dragleave', onLeave)
      window.removeEventListener('drop', drop)
    }
  }, [onDrop])

  if (!doc || !active) return null
  return (
    <div className="fc-tpldrop" data-testid="template-dropzone" aria-hidden="true">
      <div className="fc-tpldrop__inner">
        <span className="fc-tpldrop__icon" aria-hidden="true">＋</span>
        Drop to place the template here
      </div>
    </div>
  )
}

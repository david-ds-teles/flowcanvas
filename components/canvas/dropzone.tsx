'use client'
import { useCallback, useEffect, useState } from 'react'
import { useReactFlow } from '@xyflow/react'
import { useCanvasStore } from '@/lib/canvas/store'
import { uploadFile } from '@/lib/api'

// Full-canvas drag-drop overlay. Dropping image / markdown files uploads their bytes (guarded
// /api/upload) and creates an image / markdown node at the drop point. Window-level drag listeners
// drive the overlay; the drop position is projected to flow space so the node lands where it was dropped.
export function Dropzone() {
  const { screenToFlowPosition } = useReactFlow()
  const addFileNode = useCanvasStore((s) => s.addFileNode)
  const importCanvasFile = useCanvasStore((s) => s.importCanvasFile)
  const dirty = useCanvasStore((s) => s.dirty)
  const doc = useCanvasStore((s) => s.doc)
  const [active, setActive] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const onDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault()
      setActive(false)
      const files = e.dataTransfer?.files
      if (!files || files.length === 0) return
      const arr = Array.from(files)
      // 004 Phase 5 (Decision 5) — extension dispatch: a `.canvas` drop loads a board (handled
      // EXCLUSIVELY, behind a dirty-guard confirm); md / image / other still add nodes via the
      // UNCHANGED uploadFile + addFileNode path, so the existing add-node drop never breaks.
      const canvasFile = arr.find((f) => f.name.toLowerCase().endsWith('.canvas'))
      if (canvasFile) {
        if (dirty && !window.confirm('Replace the current board with the dropped .canvas? Unsaved changes will be lost.')) return
        try {
          await importCanvasFile(canvasFile)
        } catch (e2) {
          console.error('import .canvas failed', e2)
          setErr(e2 instanceof Error ? e2.message : 'Invalid .canvas file')
          setTimeout(() => setErr(null), 4500)
        }
        return // .canvas handled exclusively — never falls through to the add-node path
      }
      const base = screenToFlowPosition({ x: e.clientX, y: e.clientY })
      let i = 0
      for (const f of arr) {
        try {
          const path = await uploadFile(f)
          await addFileNode(path, Math.round(base.x / 20) * 20 + i * 24, Math.round(base.y / 20) * 20 + i * 24)
          i++
        } catch (err2) { console.error('drop upload failed', f.name, err2) } // disallowed/oversize rejected by the route
      }
    },
    [screenToFlowPosition, addFileNode, importCanvasFile, dirty],
  )

  useEffect(() => {
    // Only treat drags that carry files as uploads (ignore node drags inside the canvas).
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files')
    const onOver = (e: DragEvent) => { if (hasFiles(e)) { e.preventDefault(); setActive(true) } }
    const onLeave = (e: DragEvent) => { if (e.relatedTarget === null) setActive(false) }
    const drop = (e: DragEvent) => { if (hasFiles(e)) void onDrop(e); else setActive(false) }
    window.addEventListener('dragover', onOver)
    window.addEventListener('dragleave', onLeave)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragover', onOver)
      window.removeEventListener('dragleave', onLeave)
      window.removeEventListener('drop', drop)
    }
  }, [onDrop])

  if (!doc) return null
  return (
    <>
      {active && (
        <div className="fc-dropzone" data-testid="dropzone" aria-hidden="true">
          <div className="fc-dropzone__inner">Drop images / markdown to add nodes · a <code>.canvas</code> to load a board</div>
        </div>
      )}
      {err && (
        <div className="fc-dropzone__err" data-testid="import-drop-error" role="alert">{err}</div>
      )}
    </>
  )
}

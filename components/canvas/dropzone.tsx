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
  const doc = useCanvasStore((s) => s.doc)
  const [active, setActive] = useState(false)

  const onDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault()
      setActive(false)
      const files = e.dataTransfer?.files
      if (!files || files.length === 0) return
      const base = screenToFlowPosition({ x: e.clientX, y: e.clientY })
      let i = 0
      for (const f of Array.from(files)) {
        try {
          const path = await uploadFile(f)
          await addFileNode(path, Math.round(base.x / 20) * 20 + i * 24, Math.round(base.y / 20) * 20 + i * 24)
          i++
        } catch (err) { console.error('drop upload failed', f.name, err) } // disallowed/oversize rejected by the route
      }
    },
    [screenToFlowPosition, addFileNode],
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

  if (!doc || !active) return null
  return (
    <div className="fc-dropzone" data-testid="dropzone" aria-hidden="true">
      <div className="fc-dropzone__inner">Drop images or markdown to add nodes</div>
    </div>
  )
}

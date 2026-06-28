'use client'
import { useEffect, useState } from 'react'
import { useCanvasStore } from '@/lib/canvas/store'
import { getCanvas } from '@/lib/api'

/**
 * Decision 5/6 — "App detects revision bump → reload". After a Submit the board is in
 * `pendingReview`; the agent round runs out-of-band over MCP and bumps the on-disk revision via
 * `apply_response`. Nothing in-app observes that, so without this the merged board + change-review
 * never surface until a manual reload. This hook polls the persisted revision while a round is
 * pending and, when disk runs ahead of the in-memory doc, exposes a NON-BLOCKING "round ready"
 * signal — the shell shows a dismissible banner with a one-click reload (never auto-yanks an edit).
 *
 * Loop-safe: the poll only runs while `pendingReview` is true; after a reload the in-memory revision
 * catches up to disk so the signal clears on its own. A second round (disk advances again) re-arms it.
 */
const POLL_MS = 3000

export function useRoundReady() {
  const path = useCanvasStore((s) => s.path)
  const pending = useCanvasStore((s) => s.doc?.flowcanvas.session.pendingReview ?? false)
  const load = useCanvasStore((s) => s.load)
  const [readyRev, setReadyRev] = useState<number | null>(null)     // disk revision waiting to be loaded
  const [dismissedRev, setDismissedRev] = useState<number | null>(null)

  useEffect(() => {
    if (!pending || !path) return   // poll only while a round is pending; `show` is gated on `pending`
    let live = true
    const tick = async () => {
      try {
        const disk = await getCanvas(path)
        const diskRev = disk.flowcanvas.session.revision
        const memRev = useCanvasStore.getState().doc?.flowcanvas.session.revision ?? 0
        if (live && diskRev > memRev) setReadyRev(diskRev)
      } catch {
        // transient poll error (server restart, etc.) — ignore; the next tick retries
      }
    }
    const h = setInterval(() => void tick(), POLL_MS)
    void tick()
    return () => { live = false; clearInterval(h) }
  }, [pending, path])

  return {
    show: pending && readyRev !== null && readyRev !== dismissedRev,
    reload: () => {
      if (path) void load(path)
      setReadyRev(null)
      setDismissedRev(null)
    },
    dismiss: () => setDismissedRev(readyRev),
  }
}

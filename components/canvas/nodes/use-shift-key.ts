'use client'
import { useEffect, useState } from 'react'

/** True while the Shift key is held — drives aspect-ratio-locked resize. */
export function useShiftKey(): boolean {
  const [held, setHeld] = useState(false)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.shiftKey || e.key === 'Shift') setHeld(true) }
    const onKeyUp   = (e: KeyboardEvent) => { if (!e.shiftKey || e.key === 'Shift') setHeld(false) }
    const onBlur    = () => setHeld(false)

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup',   onKeyUp)
    window.addEventListener('blur',    onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup',   onKeyUp)
      window.removeEventListener('blur',    onBlur)
    }
  }, [])

  return held
}

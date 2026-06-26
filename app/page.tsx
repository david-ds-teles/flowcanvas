'use client'
import dynamic from 'next/dynamic'

// React Flow touches window → must not SSR. dynamic(ssr:false) is only valid inside a Client Component.
const CanvasShell = dynamic(
  () => import('@/components/canvas/canvas-shell').then((m) => m.CanvasShell),
  { ssr: false },
)

export default function Page() {
  return <CanvasShell />
}

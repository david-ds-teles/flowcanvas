'use client'
import { Component, type ReactNode } from 'react'
import dynamic from 'next/dynamic'

// React Flow touches window → must not SSR. dynamic(ssr:false) is only valid inside a Client Component.
const CanvasShell = dynamic(
  () => import('@/components/canvas/canvas-shell').then((m) => m.CanvasShell),
  { ssr: false },
)

// A render-time error in the canvas tree must never leave a blank void — the boundary catches it and
// shows the same nyx glass card the shell uses for fs-load errors, so the app degrades gracefully.
class CanvasErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div className="fc-empty">
          <div className="fc-empty__card">
            <span className="fc-empty__mark">◐ flowcanvas</span>
            <p className="fc-empty__msg fc-empty__msg--err">Something went wrong rendering the canvas.<br />{this.state.error.message}</p>
            <p className="fc-empty__hint">Reload the page, or open a different board with <code>?path=your-board.canvas</code>.</p>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default function Page() {
  return (
    <CanvasErrorBoundary>
      <CanvasShell />
    </CanvasErrorBoundary>
  )
}

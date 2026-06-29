'use client'
import { useEffect, useState } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ConnectionMode,
  ConnectionLineType,
  SelectionMode,
  useReactFlow,
  type NodeTypes,
  type EdgeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCanvasStore } from '@/lib/canvas/store'
import type { NodeKind } from '@/lib/canvas/jsoncanvas'
import { useCanvasHandlers } from './use-canvas-handlers'
import { MarkdownNode } from './nodes/markdown-node'
import { ImageNode } from './nodes/image-node'
import { LinkChipNode } from './nodes/link-node'
import { NoteNode } from './nodes/note-node'
import { GroupNode } from './nodes/group-node'
import { FallbackNode } from './nodes/fallback-node'
import { LabeledEdge } from './edges/labeled-edge'
import { CommentLayer } from './comment-layer'
import { CanvasToolbar } from './canvas-toolbar'
import { Dropzone } from './dropzone'
import { TemplateDropLayer } from './template-drop'
import { ReaderDrawer } from './reader-drawer'
import { ExportPanel } from './export-panel'
import { BoardDialog } from './board-dialog'
import { StructureRail } from './structure-rail'
import { TemplateTray } from './template-tray'
import { InspectorRail } from './inspector-rail'
import { ReviewPanel } from './review-panel'
import { useRoundReady } from './use-round-ready'

// Board loaded when the URL carries no ?path. A real .canvas at the project root, so the app
// shows content out of the box instead of an empty grid.
const DEFAULT_PATH = 'flowcanvas.canvas'

function readPath(): string {
  if (typeof window === 'undefined') return DEFAULT_PATH
  return new URLSearchParams(window.location.search).get('path') ?? DEFAULT_PATH
}

// Keyed by NodeKind so the renderer registry stays exhaustive: add a variant to NodeKind in
// lib/canvas/jsoncanvas.ts and this object fails to compile until it gets a matching renderer here.
const nodeTypes = {
  markdown: MarkdownNode,
  image: ImageNode,
  link: LinkChipNode,
  note: NoteNode,
  group: GroupNode,
  file: FallbackNode,
} satisfies Record<NodeKind, NodeTypes[string]>
const edgeTypes: EdgeTypes = { labeled: LabeledEdge }
const defaultEdgeOptions = { type: 'labeled' }

type Rail = 'open' | 'collapsed'
type LeftTab = 'structure' | 'templates'
type InspectorMode = 'inspector' | 'submit' | 'review'

// Effect bridge: when navigateRef sets focusNodeId, center the viewport on it, then clear it.
function FocusBridge() {
  const focusNodeId = useCanvasStore((s) => s.focusNodeId)
  const clearFocus = useCanvasStore((s) => s.clearFocus)
  const doc = useCanvasStore((s) => s.doc)
  const { setCenter } = useReactFlow()
  useEffect(() => {
    if (!focusNodeId || !doc) return
    const n = doc.nodes.find((x) => x.id === focusNodeId)
    if (n) setCenter(n.x + n.width / 2, n.y + n.height / 2, { zoom: 1, duration: 360 })
    clearFocus()
  }, [focusNodeId, doc, setCenter, clearFocus])
  return null
}

function CanvasFlow() {
  const doc = useCanvasStore((s) => s.doc)
  const load = useCanvasStore((s) => s.load)
  const mode = useCanvasStore((s) => s.mode)
  const readerNodeId = useCanvasStore((s) => s.readerNodeId)
  const closeReader = useCanvasStore((s) => s.closeReader)
  const clearBoard = useCanvasStore((s) => s.clearBoard)
  const handlers = useCanvasHandlers()
  const [path] = useState(readPath)
  const [error, setError] = useState<string | null>(null)
  const [agent, setAgent] = useState<{ open: boolean; tab: 'export' | 'import' }>({ open: false, tab: 'export' })
  const [board, setBoard] = useState<{ open: boolean; mode: 'open' | 'save' }>({ open: false, mode: 'open' })
  const [confirmClear, setConfirmClear] = useState(false)
  const isEmpty = !!doc && doc.nodes.length === 0

  // ─── Phase 6 — tri-pane shell state ───
  const [railLeft, setRailLeft] = useState<Rail>('open')
  const [railRight, setRailRight] = useState<Rail>('open')
  const [leftTab, setLeftTab] = useState<LeftTab>('structure')
  const [inspectorMode, setInspectorMode] = useState<InspectorMode>('inspector')

  useEffect(() => {
    void load(path).catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [load, path])

  // Phase 7 (Decision 5/6) — detect the out-of-band agent round (MCP apply_response bumps the on-disk
  // revision) while the board is pending review, and surface a non-blocking "round ready" banner.
  // Reloading both refreshes the merged board and opens change-review.
  const round = useRoundReady()
  const onReloadRound = () => { round.reload(); setInspectorMode('review'); setRailRight('open') }

  return (
    <div
      className="fc-studio"
      data-railleft={railLeft}
      data-railright={railRight}
      data-rail={leftTab}
      data-panel={inspectorMode}
    >
      <FocusBridge />

      {round.show && (
        <div className="fc-roundready" data-testid="round-ready" role="status" aria-live="polite">
          <span className="fc-roundready__dot" aria-hidden="true" />
          <span className="fc-roundready__txt">Agent round ready</span>
          <button type="button" className="fc-roundready__go" data-testid="round-reload" onClick={onReloadRound}>
            Reload to review
          </button>
          <button type="button" className="fc-roundready__x" data-testid="round-dismiss" aria-label="Dismiss" onClick={round.dismiss}>
            ✕
          </button>
        </div>
      )}

      {doc && (
        <CanvasToolbar
          railLeft={railLeft}
          railRight={railRight}
          onToggleRailLeft={() => setRailLeft((r) => (r === 'open' ? 'collapsed' : 'open'))}
          onToggleRailRight={() => setRailRight((r) => (r === 'open' ? 'collapsed' : 'open'))}
          onOpenTemplates={() => { setLeftTab('templates'); setRailLeft('open') }}
          onOpenSubmit={() => { setInspectorMode('submit'); setRailRight('open') }}
          onOpenAgent={(tab) => setAgent({ open: true, tab })}
          onOpenBoard={(boardMode) => setBoard({ open: true, mode: boardMode })}
          onClearBoard={() => setConfirmClear(true)}
        />
      )}

      <div className="fc-studio__body">
        {/* Collapsed LEFT-rail reopen strip — a slim icon column that restores the rail (to a chosen
            tab) without the toolbar toggle. Rendered only while the rail is collapsed. */}
        {railLeft === 'collapsed' && (
          <div className="fc-railstrip fc-railstrip--left" data-testid="rail-strip-left">
            <button
              type="button"
              className="fc-railstrip__btn"
              data-testid="rail-reopen-structure"
              title="Open Structure"
              aria-label="Open Structure rail"
              onClick={() => { setLeftTab('structure'); setRailLeft('open') }}
            >
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 6h16M4 12h10M4 18h7" />
              </svg>
            </button>
            <button
              type="button"
              className="fc-railstrip__btn"
              data-testid="rail-reopen-templates"
              title="Open Templates"
              aria-label="Open Templates tray"
              onClick={() => { setLeftTab('templates'); setRailLeft('open') }}
            >
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 5h7v6H4zM13 5h7v6h-7zM4 13h7v6H4zM13 13h7v6h-7z" />
              </svg>
            </button>
          </div>
        )}

        {/* LEFT structure / templates rail */}
        <aside className="fc-studio__rail" aria-label="Structure" data-testid="structure-rail">
          <div className="fc-studio__rail-tabs" role="tablist">
            <button type="button" role="tab" title="Structure — outline of every group and node on the board" aria-selected={leftTab === 'structure'} data-testid="rail-tab-structure" onClick={() => setLeftTab('structure')}>Structure</button>
            <button type="button" role="tab" title="Templates — drop in reusable node / diagram / document fragments" aria-selected={leftTab === 'templates'} data-testid="rail-tab-templates" onClick={() => setLeftTab('templates')}>Templates</button>
          </div>
          <div className="fc-studio__rail-body">
            {leftTab === 'structure' ? <StructureRail /> : <TemplateTray onClose={() => setLeftTab('structure')} />}
          </div>
        </aside>

        {/* CENTER canvas */}
        <div className="fc-studio__center">
          <ReactFlow
            className={mode === 'connect' ? 'fc-rf--connect' : undefined}
            nodes={handlers.nodes}
            edges={handlers.edges}
            onNodesChange={handlers.onNodesChange}
            onEdgesChange={handlers.onEdgesChange}
            onConnect={handlers.onConnect}
            onNodeDragStop={handlers.onNodeDragStop}
            onNodeClick={handlers.onNodeClick}
            onSelectionChange={handlers.onSelectionChange}
            onEdgeDoubleClick={handlers.onEdgeDoubleClick}
            isValidConnection={handlers.isValidConnection}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            connectionMode={ConnectionMode.Loose}
            connectionLineType={ConnectionLineType.SmoothStep}
            connectionRadius={34}
            deleteKeyCode={['Delete', 'Backspace']}
            elementsSelectable
            edgesFocusable
            selectionOnDrag={mode === 'select'}
            selectionMode={SelectionMode.Partial}
            panOnDrag={mode === 'select' ? [1, 2] : true}
            multiSelectionKeyCode={['Meta', 'Control']}
            fitView
            minZoom={0.2}
            maxZoom={2}
          >
            <Background variant={BackgroundVariant.Dots} gap={22} size={1.5} color="var(--color-grid)" />
            <Controls />
            <MiniMap nodeColor="#8083ff" nodeStrokeColor="#5ef2ff" maskColor="rgba(11,19,38,0.72)" pannable zoomable />
          </ReactFlow>

          <Dropzone />
          <TemplateDropLayer />
          <CommentLayer />
          {readerNodeId && <ReaderDrawer nodeId={readerNodeId} onClose={closeReader} />}

          {/* Empty-board state (mockup 05 "No board open") — shown over the grid when the board has no
              nodes. Drag-drop still lands here (the dropzone overlay sits above this), and the canvas
              tools stay live so you can add nodes directly. */}
          {isEmpty && (
            <div className="fc-emptyboard" data-testid="empty-board">
              <div className="fc-emptyboard__card">
                <div className="fc-emptyboard__orb" aria-hidden="true" />
                <h2 className="fc-emptyboard__h">No board open</h2>
                <p className="fc-emptyboard__p">
                  Submit a flowcode design doc to the agent to extract an initial architecture, open an
                  existing <code>.canvas</code>, or drop a markdown / image file anywhere to start.
                </p>
                <div className="fc-emptyboard__actions">
                  <button type="button" className="fc-emptyboard__btn fc-emptyboard__btn--primary" data-testid="empty-open" onClick={() => setBoard({ open: true, mode: 'open' })}>
                    Open .canvas…
                  </button>
                  <button type="button" className="fc-emptyboard__btn" data-testid="empty-extract" onClick={() => { setInspectorMode('submit'); setRailRight('open') }}>
                    Extract via agent
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT inspector — default / submit / review (collapsible) */}
        <aside className="fc-studio__inspector" aria-label="Inspector">
          {inspectorMode === 'review'
            ? <ReviewPanel onClose={() => setInspectorMode('inspector')} />
            : <InspectorRail mode={inspectorMode} setMode={setInspectorMode} />}
        </aside>

        {/* Collapsed RIGHT-rail reopen strip — slim icon column that restores the inspector. */}
        {railRight === 'collapsed' && (
          <div className="fc-railstrip fc-railstrip--right" data-testid="rail-strip-right">
            <button
              type="button"
              className="fc-railstrip__btn"
              data-testid="rail-reopen-inspector"
              title="Open Inspector"
              aria-label="Open Inspector"
              onClick={() => setRailRight('open')}
            >
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 5h16v14H4z" />
                <path d="M7 15V9l3 3 3-3v6" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Agent round-trip panel (export/import + submit fallback) */}
      {agent.open && (
        <ExportPanel
          tab={agent.tab}
          onTab={(tab) => setAgent((a) => ({ ...a, tab }))}
          onClose={() => setAgent((a) => ({ ...a, open: false }))}
        />
      )}

      {board.open && <BoardDialog mode={board.mode} onClose={() => setBoard((b) => ({ ...b, open: false }))} />}

      {/* Clear-board confirm (destructive — gated per operator request) */}
      {confirmClear && doc && (
        <div className="fc-confirm" role="dialog" aria-modal="true" aria-labelledby="fc-confirm-title" data-testid="confirm-clear" onClick={() => setConfirmClear(false)}>
          <div className="fc-confirm__card" onClick={(e) => e.stopPropagation()}>
            <h3 id="fc-confirm-title" className="fc-confirm__h">Clear this board?</h3>
            <p className="fc-confirm__p">
              Removes all <strong>{doc.nodes.length}</strong> node{doc.nodes.length === 1 ? '' : 's'},{' '}
              <strong>{doc.edges.length}</strong> connection{doc.edges.length === 1 ? '' : 's'}, and every comment
              from <code>{path}</code>. The board empties to the “No board open” state — Save to persist, or reload to restore.
            </p>
            <div className="fc-confirm__actions">
              <button type="button" className="fc-confirm__btn" data-testid="confirm-clear-cancel" onClick={() => setConfirmClear(false)}>Cancel</button>
              <button type="button" className="fc-confirm__btn fc-confirm__btn--danger" data-testid="confirm-clear-go" onClick={() => { clearBoard(); setConfirmClear(false) }}>Clear board</button>
            </div>
          </div>
        </div>
      )}

      {!doc && (
        <div className="fc-empty">
          <div className="fc-empty__card">
            <span className="fc-empty__mark">◐ flowcanvas</span>
            {error ? (
              <p className="fc-empty__msg fc-empty__msg--err">
                Could not load <code>{path}</code>
                <br />
                {error}
              </p>
            ) : (
              <p className="fc-empty__msg">Loading <code>{path}</code>…</p>
            )}
            <p className="fc-empty__hint">
              Open a board with <code>?path=your-board.canvas</code> — paths are relative to the project root.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export function CanvasShell() {
  return (
    <ReactFlowProvider>
      <CanvasFlow />
    </ReactFlowProvider>
  )
}

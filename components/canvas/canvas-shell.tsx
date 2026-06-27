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
  type NodeTypes,
  type EdgeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useCanvasStore } from '@/lib/canvas/store'
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
import { ReaderDrawer } from './reader-drawer'
import { ExportPanel } from './export-panel'

// Board loaded when the URL carries no ?path. A real .canvas at the project root, so the app
// shows content out of the box instead of an empty grid.
const DEFAULT_PATH = 'flowcanvas.canvas'

// Client-only (shell is always ssr:false): the board path from ?path, else the default board.
function readPath(): string {
  if (typeof window === 'undefined') return DEFAULT_PATH
  return new URLSearchParams(window.location.search).get('path') ?? DEFAULT_PATH
}

// `group` → the resizable/labelable shape container; `file` (non-md/non-image, e.g. .pdf/.ts) →
// FallbackNode keeps React Flow from rendering its bare "node type not found" box.
const nodeTypes: NodeTypes = {
  markdown: MarkdownNode,
  image: ImageNode,
  link: LinkChipNode,
  note: NoteNode,
  group: GroupNode,
  file: FallbackNode,
}
// All edges flow through the single provenance-styled labeled edge (the adapter sets type:'labeled').
const edgeTypes: EdgeTypes = { labeled: LabeledEdge }

// defaultEdgeOptions makes the live drag-preview adopt the labeled edge so it also turns at right
// angles (Fix 2); connectionLineType=SmoothStep matches the preview to the committed routing.
const defaultEdgeOptions = { type: 'labeled' }

function CanvasFlow() {
  const doc = useCanvasStore((s) => s.doc)
  const load = useCanvasStore((s) => s.load)
  const mode = useCanvasStore((s) => s.mode)
  const readerNodeId = useCanvasStore((s) => s.readerNodeId)
  const closeReader = useCanvasStore((s) => s.closeReader)
  const handlers = useCanvasHandlers()
  const [path] = useState(readPath)
  const [error, setError] = useState<string | null>(null)
  const [agent, setAgent] = useState<{ open: boolean; tab: 'export' | 'import' }>({ open: false, tab: 'export' })

  // Kick off the load once on mount; the catch (async) surfaces failures in the empty-state card.
  useEffect(() => {
    void load(path).catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [load, path])

  return (
    <div className="fc-canvas-root">
      <ReactFlow
        className={mode === 'connect' ? 'fc-rf--connect' : undefined}
        nodes={handlers.nodes}
        edges={handlers.edges}
        onNodesChange={handlers.onNodesChange}
        onEdgesChange={handlers.onEdgesChange}
        onConnect={handlers.onConnect}
        onNodeDragStop={handlers.onNodeDragStop}
        onNodeClick={handlers.onNodeClick}
        onEdgeDoubleClick={handlers.onEdgeDoubleClick}
        isValidConnection={handlers.isValidConnection}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionMode={ConnectionMode.Loose}
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionRadius={34}
        deleteKeyCode={['Delete', 'Backspace']}
        fitView
        minZoom={0.2}
        maxZoom={2}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.5} color="var(--color-grid)" />
        <Controls />
        {/* SVG fills need concrete hex (not CSS vars); the chrome (glass/border) is in controls.css. */}
        <MiniMap nodeColor="#8083ff" nodeStrokeColor="#5ef2ff" maskColor="rgba(11,19,38,0.72)" pannable zoomable />
        {/* React Flow attribution is kept (MIT terms); subscribers may hide it via proOptions */}
      </ReactFlow>

      {/* Top glass toolbar — modes, add-node, upload, agent I/O, fit-view, save (⌘S + dirty dot). */}
      {doc && <CanvasToolbar onOpenAgent={(tab) => setAgent({ open: true, tab })} />}

      {/* Drag-drop overlay — drop images / markdown to upload + add nodes. */}
      <Dropzone />

      {/* Pin overlay above the pane — projects anchors to screen, places pins in comment mode. */}
      <CommentLayer />

      {/* Reader drawer — opens on a markdown node click or its header read button; shiki + node thread. */}
      {readerNodeId && <ReaderDrawer nodeId={readerNodeId} onClose={closeReader} />}

      {/* Agent round-trip panel — export DesignBrief / import AgentResponse. */}
      {agent.open && (
        <ExportPanel
          tab={agent.tab}
          onTab={(tab) => setAgent((a) => ({ ...a, tab }))}
          onClose={() => setAgent((a) => ({ ...a, open: false }))}
        />
      )}

      {/* Minimal empty/error state so a board that fails to load is never a silent blank grid. */}
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

'use client'
import { useEffect, useMemo, useState } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ConnectionMode,
  useNodesState,
  useEdgesState,
  type NodeTypes,
  type EdgeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { toReactFlow } from '@/lib/canvas/adapter'
import { useCanvasStore } from '@/lib/canvas/store'
import { MarkdownNode } from './nodes/markdown-node'
import { ImageNode } from './nodes/image-node'
import { LinkChipNode } from './nodes/link-node'
import { NoteNode } from './nodes/note-node'
import { FallbackNode } from './nodes/fallback-node'

// Board loaded when the URL carries no ?path. A real .canvas at the project root, so the app
// shows content out of the box instead of an empty grid.
const DEFAULT_PATH = 'flowcanvas.canvas'

// Client-only (shell is always ssr:false): the board path from ?path, else the default board.
function readPath(): string {
  if (typeof window === 'undefined') return DEFAULT_PATH
  return new URLSearchParams(window.location.search).get('path') ?? DEFAULT_PATH
}

// Phase 5 registers the labeled edge type here.
// `group` + `file` (non-md/non-image) have no dedicated component yet → FallbackNode keeps
// React Flow from rendering its bare "node type not found" box for those kinds.
const nodeTypes: NodeTypes = {
  markdown: MarkdownNode,
  image: ImageNode,
  link: LinkChipNode,
  note: NoteNode,
  group: FallbackNode,
  file: FallbackNode,
}
const edgeTypes: EdgeTypes = {}

function CanvasFlow() {
  const doc = useCanvasStore((s) => s.doc)
  const load = useCanvasStore((s) => s.load)
  const [path] = useState(readPath)
  const [error, setError] = useState<string | null>(null)

  // Kick off the load once on mount; the catch (async) surfaces failures in the empty-state card.
  useEffect(() => {
    void load(path).catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [load, path])

  const { nodes: rfNodes, edges: rfEdges } = useMemo(
    () => (doc ? toReactFlow(doc) : { nodes: [], edges: [] }),
    [doc],
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(rfNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(rfEdges)

  // Sync controlled state when store doc changes (e.g. toggleCollapsed, load)
  useEffect(() => { setNodes(rfNodes) }, [rfNodes, setNodes])
  useEffect(() => { setEdges(rfEdges) }, [rfEdges, setEdges])

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        minZoom={0.2}
        maxZoom={2}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.5} color="var(--color-grid)" />
        <Controls />
        <MiniMap nodeColor="#222a3d" maskColor="rgba(6,14,32,0.7)" pannable zoomable />
        {/* React Flow attribution is kept (MIT terms); subscribers may hide it via proOptions */}
      </ReactFlow>

      {/* Minimal empty/error state so a board that fails to load is never a silent blank grid.
          Full empty-state polish is Phase 7. */}
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

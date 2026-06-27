'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
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
  type Connection,
  type Node as RFNode,
  type Edge as RFEdge,
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
import { GroupNode } from './nodes/group-node'
import { FallbackNode } from './nodes/fallback-node'
import { LabeledEdge } from './edges/labeled-edge'
import { CommentLayer } from './comment-layer'
import { CanvasToolbar } from './canvas-toolbar'
import { Dropzone } from './dropzone'
import { ReaderDrawer } from './reader-drawer'
import { ExportPanel } from './export-panel'
import { isFileNode, nodeKind } from '@/lib/canvas/jsoncanvas'

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

function CanvasFlow() {
  const doc = useCanvasStore((s) => s.doc)
  const load = useCanvasStore((s) => s.load)
  const onConnect = useCanvasStore((s) => s.onConnect)
  const setNodePosition = useCanvasStore((s) => s.setNodePosition)
  const setEditingEdge = useCanvasStore((s) => s.setEditingEdge)
  const mode = useCanvasStore((s) => s.mode)
  const readerNodeId = useCanvasStore((s) => s.readerNodeId)
  const openReader = useCanvasStore((s) => s.openReader)
  const closeReader = useCanvasStore((s) => s.closeReader)
  const [path] = useState(readPath)
  const [error, setError] = useState<string | null>(null)
  const [agent, setAgent] = useState<{ open: boolean; tab: 'export' | 'import' }>({ open: false, tab: 'export' })

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

  // Sync controlled state when store doc changes (e.g. toggleCollapsed, onConnect, load)
  useEffect(() => { setNodes(rfNodes) }, [rfNodes, setNodes])
  useEffect(() => { setEdges(rfEdges) }, [rfEdges, setEdges])

  // onNodesChange drives smooth local dragging; commit the final position to the store on drop
  // (resolves the Phase-4 deferred write-back so node moves survive a save).
  const onNodeDragStop = useCallback(
    (_e: MouseEvent | TouchEvent, node: RFNode) => setNodePosition(node.id, node.position.x, node.position.y),
    [setNodePosition],
  )

  // Connecting two nodes mints the edge and opens its inline label editor (no native prompt);
  // double-clicking an existing edge re-opens that editor. Relabeling a derived `links` edge
  // promotes it to `user` (in `relabelEdge`). The label is typed in-canvas via the edge component.
  const onEdgeDoubleClick = useCallback(
    (_e: React.MouseEvent, edge: RFEdge) => setEditingEdge(edge.id),
    [setEditingEdge],
  )

  // Reject self-connections during the drag itself: without this, an imprecise drag snaps to the
  // SOURCE node's own handle (a self-loop) instead of reaching the target — the "sometimes works,
  // sometimes doesn't" + "reference itself" bug. RF marks the connection invalid and never fires onConnect.
  const isValidConnection = useCallback(
    (c: RFEdge | Connection) => !!c.source && !!c.target && c.source !== c.target,
    [],
  )

  // Click a markdown node → open the full-fidelity reader drawer. Other kinds (image/link/note/group)
  // have nothing more to read, so a click just selects. Comment mode is handled by the overlay, not here.
  const onNodeClick = useCallback(
    (_e: React.MouseEvent, node: RFNode) => {
      const n = doc?.nodes.find((x) => x.id === node.id)
      if (n && isFileNode(n) && nodeKind(n) === 'markdown') openReader(node.id)
    },
    [doc, openReader],
  )

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow
        className={mode === 'connect' ? 'fc-rf--connect' : undefined}
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick}
        onEdgeDoubleClick={onEdgeDoubleClick}
        isValidConnection={isValidConnection}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Loose}
        connectionRadius={34}
        deleteKeyCode={null}
        fitView
        minZoom={0.2}
        maxZoom={2}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.5} color="var(--color-grid)" />
        <Controls />
        <MiniMap nodeColor="#222a3d" maskColor="rgba(6,14,32,0.7)" pannable zoomable />
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

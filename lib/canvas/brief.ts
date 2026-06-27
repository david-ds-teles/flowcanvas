// ─────────────────────────── Agent round-trip schema (design § Data Models) ───────────────────────────
//
// The bidirectional, versioned JSON contract that is the point of the tool: the human exports a
// self-contained `DesignBrief` (every markdown file's frontmatter + body embedded, edges with their
// relationship labels, comment threads addressed by id, the high-level `intent`); the agent replies
// with an `AgentResponse` in a sibling schema; `applyResponse` runs an idempotent, id-keyed merge.
//
// `buildBrief` and `applyResponse` are PURE (no fs, no network, no clock) — the store wraps them with
// the file writes, re-resolve, re-derive, and persist (design § Sequence / Agent round-trip).

import type {
  FlowcanvasDoc,
  CanvasNode,
  CanvasEdge,
  Comment,
  CommentAnchor,
  NodeKind,
  EdgeOrigin,
  CanvasColor,
  Side,
  FileNode,
  LinkNode,
  TextNode,
} from './jsoncanvas'
import { nodeKind } from './jsoncanvas'

// ─────────────────────────── Direction A: DesignBrief (human → agent) ───────────────────────────

export interface BriefNode {
  id: string
  kind: NodeKind
  position: { x: number; y: number; width: number; height: number }
  path?: string                          // markdown/image/file — root-relative
  url?: string                           // link
  text?: string                          // note
  frontmatter?: Record<string, unknown>  // markdown — parsed
  body?: string                          // markdown — body WITHOUT frontmatter, embedded
  truncated?: boolean                    // body capped (> BODY_CAP) — agent may request full
}
export interface BriefEdge {
  id: string
  from: string
  to: string
  label?: string
  origin: EdgeOrigin
}
export interface BriefComment {
  id: string
  threadId: string                       // root comment id; reply by setting parentId = threadId
  anchorNodeId?: string                  // present for node-anchored comments
  author: string
  text: string
  createdAt: string
  resolved: boolean
}
export interface DesignBrief {
  briefVersion: '0.1'
  briefId: string                        // uuid; also written to session.lastBriefId on export
  canvasRef: string                      // path of the .canvas file, root-relative
  baseRevision: number                   // session.revision at export time (concurrency token)
  generatedAt: string
  intent: string                         // session.intent — the framing the agent reads first
  nodes: BriefNode[]
  edges: BriefEdge[]
  comments: BriefComment[]
  responseContract: string               // inline copy of the Agent Contract (below)
}

// ─────────────────────────── Direction B: AgentResponse (agent → tool) ───────────────────────────

export interface GeneratedFile {
  path: string
  content: string                        // includes YAML frontmatter
}
export interface AgentNode {
  id?: string                            // present + known → update; absent or new → create
  type: 'file' | 'link' | 'text'
  x: number
  y: number
  width: number
  height: number
  file?: string
  url?: string
  text?: string
  color?: CanvasColor
}
export interface AgentEdge {
  id?: string
  fromNode: string
  toNode: string
  fromSide?: Side
  toSide?: Side
  label?: string
}
export interface AgentComment {
  id?: string
  parentId: string | null                // set → reply; null → new annotation
  anchor: CommentAnchor
  author: string
  text: string
  createdAt?: string
}
export interface AgentResponse {
  responseVersion: '0.1'
  briefId: string                        // echoes DesignBrief.briefId (concurrency check)
  summary: string                        // human-readable changelog of what the agent did
  upsertNodes?: AgentNode[]
  removeNodeIds?: string[]
  upsertEdges?: AgentEdge[]
  removeEdgeIds?: string[]
  comments?: AgentComment[]
  generatedFiles?: GeneratedFile[]       // new/updated md → tool writes to disk before render
}

export interface MergeReport {
  stale: boolean                  // resp.briefId !== prev.flowcanvas.session.lastBriefId
  generatedFiles: string[]        // paths the caller must POST to /api/file
  created: { nodes: number; edges: number; comments: number }
  updated: { nodes: number; edges: number }
  removed: { nodes: number; edges: number }
  conflicts: string[]             // node ids edited locally since baseRevision (last-writer-wins)
}

// ─────────────────────────── The Agent Contract ───────────────────────────
//
// Shipped inline as `DesignBrief.responseContract` AND as `docs/flowcanvas-agent-contract.md`
// (keep the two in sync). The agent reads this verbatim.

export const AGENT_CONTRACT = `Return exactly one JSON object matching AgentResponse — no prose, no code fence, nothing outside it.
Echo briefId from the brief (it is the concurrency token).
Mint new ids with the "ag-" prefix; reuse an existing brief id to update that item.
To add a markdown file: include it in generatedFiles (full content INCLUDING YAML frontmatter) AND a matching upsertNodes entry { type:"file", file:"<same path>" }.
Reply to a comment by setting parentId to that comment's id from the brief and copying its anchor.
Prefer frontmatter links: over manual edges for structural relationships; never reference a links: target that is neither an existing node nor a file you also generate.
Keep coordinates on a 20px grid and place new nodes in empty regions (the brief's positions reveal the occupied layout).`

// ─────────────────────────── buildBrief (human → agent) ───────────────────────────

/** Build the self-contained brief from the live doc + resolved markdown content. Pure. */
export function buildBrief(
  doc: FlowcanvasDoc,
  canvasRef: string,
  resolved: Map<string, { frontmatter?: Record<string, unknown>; body?: string; truncated?: boolean }>,
  briefId: string,
  generatedAt: string,
): DesignBrief {
  const nodes: BriefNode[] = doc.nodes.map((n) => {
    const kind: NodeKind = nodeKind(n)
    const position = { x: n.x, y: n.y, width: n.width, height: n.height }
    if (n.type === 'file') {
      const r = resolved.get(n.file)
      return { id: n.id, kind, position, path: n.file, frontmatter: r?.frontmatter, body: r?.body, truncated: r?.truncated }
    }
    if (n.type === 'link') return { id: n.id, kind, position, url: n.url }
    if (n.type === 'text') return { id: n.id, kind, position, text: n.text }
    return { id: n.id, kind, position }
  })
  const edges: BriefEdge[] = doc.edges.map((e) => ({
    id: e.id, from: e.fromNode, to: e.toNode, label: e.label, origin: e.meta?.origin ?? 'user',
  }))
  const comments: BriefComment[] = doc.flowcanvas.comments.map((c) => ({
    id: c.id,
    threadId: c.parentId ?? c.id,
    anchorNodeId: c.anchor.kind === 'node' ? c.anchor.nodeId : undefined,
    author: c.author,
    text: c.text,
    createdAt: c.createdAt,
    resolved: !!c.resolvedAt,
  }))
  return {
    briefVersion: '0.1',
    briefId,
    canvasRef,
    baseRevision: doc.flowcanvas.session.revision,
    generatedAt,
    intent: doc.flowcanvas.session.intent ?? '',
    nodes,
    edges,
    comments,
    responseContract: AGENT_CONTRACT,
  }
}

// ─────────────────────────── applyResponse (agent → tool) — the 8-step idempotent merge ───────────────────────────

/** Build a `CanvasNode` from an agent node, carrying any prior meta and stamping origin:'agent'. */
function nodeFromAgent(an: AgentNode, id: string, existing?: CanvasNode): CanvasNode {
  const base = {
    id,
    x: an.x, y: an.y, width: an.width, height: an.height,
    ...(an.color ? { color: an.color } : existing?.color ? { color: existing.color } : {}),
    meta: { ...existing?.meta, origin: 'agent' as const },
  }
  if (an.type === 'file') return { ...base, type: 'file', file: an.file ?? (existing as FileNode | undefined)?.file ?? '' }
  if (an.type === 'link') return { ...base, type: 'link', url: an.url ?? (existing as LinkNode | undefined)?.url ?? '' }
  return { ...base, type: 'text', text: an.text ?? (existing as TextNode | undefined)?.text ?? '' }
}

const sigOf = (parentId: string | null, author: string, text: string) => `${parentId}|${author}|${text}`

/**
 * Pure merge: apply an `AgentResponse` onto a doc, returning the next doc + a report.
 * Idempotent — applying the same response twice yields the same doc:
 *   • nodes/edges key by id (agent mints stable `ag-*` ids; reuse → update)
 *   • id-less agent edges are skipped when the directed pair is already covered (design step 5)
 *   • comments dedup by id when present, else by (parentId, author, text) signature
 * Steps (2) generated-file writes and (4) re-resolve + re-derive happen in the store wrapper.
 */
export function applyResponse(
  prev: FlowcanvasDoc,
  resp: AgentResponse,
  mintId: (prefix: string) => string,
  now: string,
): { next: FlowcanvasDoc; report: MergeReport } {
  // (1) Concurrency guard — last-writer-wins; we lack per-node revision tracking, so `conflicts` is [].
  const report: MergeReport = {
    stale: resp.briefId !== prev.flowcanvas.session.lastBriefId,
    generatedFiles: (resp.generatedFiles ?? []).map((g) => g.path),
    created: { nodes: 0, edges: 0, comments: 0 },
    updated: { nodes: 0, edges: 0 },
    removed: { nodes: 0, edges: 0 },
    conflicts: [],
  }

  // (3) Upsert nodes — key by id; existing → shallow-merge geometry/content + origin:'agent'.
  const nodes: CanvasNode[] = prev.nodes.map((n) => ({ ...n }))
  const nById = new Map(nodes.map((n) => [n.id, n]))
  for (const an of resp.upsertNodes ?? []) {
    const id = an.id && nById.has(an.id) ? an.id : an.id ?? mintId('ag-')
    const existing = nById.get(id)
    const merged = nodeFromAgent(an, id, existing)
    if (existing) {
      const i = nodes.indexOf(existing)
      nodes[i] = merged
      nById.set(id, merged)
      report.updated.nodes++
    } else {
      nodes.push(merged)
      nById.set(id, merged)
      report.created.nodes++
    }
  }

  // (5) Upsert edges — key by id; agent edges get origin:'agent'. Skip an id-less edge that
  // duplicates a directed pair already covered (idempotency + the design's "prefer one edge" rule).
  const edges: CanvasEdge[] = prev.edges.map((e) => ({ ...e }))
  const eById = new Map(edges.map((e) => [e.id, e]))
  const pairOf = (from: string, to: string) => `${from}>${to}`
  const pairs = new Set(edges.map((e) => pairOf(e.fromNode, e.toNode)))
  for (const ae of resp.upsertEdges ?? []) {
    if (ae.id && eById.has(ae.id)) {
      const existing = eById.get(ae.id)!
      const updated: CanvasEdge = {
        ...existing,
        fromNode: ae.fromNode, toNode: ae.toNode,
        fromSide: ae.fromSide, toSide: ae.toSide, label: ae.label,
        toEnd: existing.toEnd ?? 'arrow', meta: { ...existing.meta, origin: 'agent' },
      }
      edges[edges.indexOf(existing)] = updated
      eById.set(ae.id, updated)
      report.updated.edges++
      continue
    }
    if (pairs.has(pairOf(ae.fromNode, ae.toNode))) continue   // already covered — skip (idempotent)
    const id = ae.id ?? mintId('ag-')
    const edge: CanvasEdge = {
      id, fromNode: ae.fromNode, toNode: ae.toNode,
      fromSide: ae.fromSide, toSide: ae.toSide, label: ae.label,
      toEnd: 'arrow', meta: { origin: 'agent' },
    }
    edges.push(edge)
    eById.set(id, edge)
    pairs.add(pairOf(ae.fromNode, ae.toNode))
    report.created.edges++
  }

  // (6) Comments — replies attach to their thread, new annotations get a fresh root badge. Dedup by
  // id when present, else by content signature so a re-applied response never duplicates a reply.
  const comments: Comment[] = prev.flowcanvas.comments.map((c) => ({ ...c }))
  const seenSigs = new Set(comments.map((c) => sigOf(c.parentId, c.author, c.text)))
  for (const ac of resp.comments ?? []) {
    if (ac.id && comments.some((c) => c.id === ac.id)) continue
    const sig = sigOf(ac.parentId, ac.author, ac.text)
    if (seenSigs.has(sig)) continue
    const badge = ac.parentId === null ? comments.filter((c) => c.parentId === null).length + 1 : undefined
    comments.push({
      id: ac.id ?? mintId('ag-'),
      anchor: ac.anchor,
      parentId: ac.parentId,
      author: ac.author,
      text: ac.text,
      createdAt: ac.createdAt ?? now,
      resolvedAt: ac.parentId === null ? null : undefined,
      badge,
    })
    seenSigs.add(sig)
    report.created.comments++
  }

  // (7) Removals last — explicit lists only (never auto-remove anything not named here).
  const rmN = new Set(resp.removeNodeIds ?? [])
  const rmE = new Set(resp.removeEdgeIds ?? [])
  const nextNodes = nodes.filter((n) => !rmN.has(n.id))
  const nextEdges = edges.filter((e) => !rmE.has(e.id))
  report.removed.nodes = nodes.length - nextNodes.length
  report.removed.edges = edges.length - nextEdges.length

  // (8) Bump & hand back — the store persists via POST /api/canvas.
  const next: FlowcanvasDoc = {
    nodes: nextNodes,
    edges: nextEdges,
    flowcanvas: {
      ...prev.flowcanvas,
      comments,
      session: { ...prev.flowcanvas.session, revision: prev.flowcanvas.session.revision + 1, updatedAt: now },
    },
  }
  return { next, report }
}

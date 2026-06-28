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
  RelationshipType,
  NodeSource,
  NodeShape,
} from './jsoncanvas'
import { nodeKind, REL_LABELS } from './jsoncanvas'
import { extractRefs, type DocRef } from './refs'

// ─────────────────────────── Direction A: DesignBrief (human → agent) ───────────────────────────

export interface BriefNode {
  id: string
  kind: NodeKind
  position: { x: number; y: number; width: number; height: number }
  path?: string                          // markdown/image/file — root-relative
  url?: string                           // link
  text?: string                          // note
  label?: string                         // group — display label (v2)
  parentId?: string                      // group membership (v2)
  source?: NodeSource                    // provenance back to the source doc (v2, Decision 2)
  refs?: DocRef[]                         // parsed frontmatter + body refs (v2, Decision 9)
  frontmatter?: Record<string, unknown>  // markdown — parsed
  body?: string                          // markdown — body WITHOUT frontmatter, embedded
  truncated?: boolean                    // body capped (> BODY_CAP) — agent may request full
}
export interface BriefEdge {
  id: string
  from: string
  to: string
  label?: string
  rel?: RelationshipType                 // typed relationship (v2, Decision 1)
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
  type: 'file' | 'link' | 'text' | 'group'
  x: number
  y: number
  width: number
  height: number
  file?: string
  url?: string
  text?: string
  label?: string                         // group — display label (v2)
  shape?: NodeShape                      // group — outline shape (v2)
  parentId?: string                      // group membership for the node (v2)
  source?: NodeSource                    // provenance — extraction source doc (v2, Decision 2)
  color?: CanvasColor
}
export interface AgentEdge {
  id?: string
  fromNode: string
  toNode: string
  fromSide?: Side
  toSide?: Side
  label?: string
  rel?: RelationshipType                 // typed relationship (v2, Decision 1)
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
Keep coordinates on a 20px grid and place new nodes in empty regions (the brief's positions reveal the occupied layout).

EXTRACTION (design doc -> initial board):
- Map each major concept / Module-Boundaries row / component to one node; each subsystem
  cluster to a group node (type:"group", give it a label + optional shape, set members'
  parentId to it). Map each documented relationship/arrow to a typed edge.
- Decompose node content into small generated .md files (one per node) under
  "<board-stem>.nodes/<slug>.md", each with frontmatter source: { path, anchor } pointing
  back at the design doc + heading slug. For a pure view of one section, instead emit a
  type:"file" node with subpath:"<anchor>" (no new file). Use type:"text" only for scratch.
- Never inline document prose into the .canvas; never delete or rewrite the source doc.
TYPED EDGES:
- Set meta via the edge: choose rel from [references, depends-on, implements, derives-from,
  calls, produces, informs, related]. Set label to a short human display (defaults to rel).
  Do NOT invent rel values. Use containment (parentId) for "contains", not an edge.
GROUPS:
- type:"group" carries label, optional shape (rectangle|ellipse|diamond); children set parentId.`

// ─────────────────────────── buildBrief (human → agent) ───────────────────────────

/** Build the self-contained brief from the live doc + resolved markdown content. Pure. */
/**
 * Scope-aware submit (v2): narrow a node list to a selection set plus its structural closure —
 * each selected node's ancestor groups (so `parentId` refs resolve) and every descendant of a
 * selected group (selecting a subsystem pulls in its members). Original doc order is preserved.
 */
function scopeNodes(nodes: CanvasNode[], scopeIds: string[]): CanvasNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const sel = new Set(scopeIds)
  const keep = new Set<string>()
  // ancestors of each selected node (parentId chain)
  for (const id of scopeIds) {
    let cur = byId.get(id)
    while (cur && !keep.has(cur.id)) {
      keep.add(cur.id)
      cur = cur.parentId ? byId.get(cur.parentId) : undefined
    }
  }
  // descendants of any selected node (members of a selected group)
  for (const n of nodes) {
    let cur: CanvasNode | undefined = n
    while (cur) {
      if (sel.has(cur.id)) { keep.add(n.id); break }
      cur = cur.parentId ? byId.get(cur.parentId) : undefined
    }
  }
  return nodes.filter((n) => keep.has(n.id))
}

export function buildBrief(
  doc: FlowcanvasDoc,
  canvasRef: string,
  resolved: Map<string, { frontmatter?: Record<string, unknown>; body?: string; truncated?: boolean }>,
  briefId: string,
  generatedAt: string,
): DesignBrief {
  // Scope-aware submit (v2): when the session carries a non-empty briefScope, the brief is narrowed
  // to that selection's structural closure — nodes, the edges fully inside it, and comments anchored
  // to kept nodes. Absent/empty ⇒ the whole board (unchanged behaviour).
  const scope = doc.flowcanvas.session.briefScope
  const isScoped = scope !== undefined && scope.length > 0
  const scopedNodes = isScoped ? scopeNodes(doc.nodes, scope) : doc.nodes
  const inScope = new Set(scopedNodes.map((n) => n.id))

  const nodes: BriefNode[] = scopedNodes.map((n) => {
    const kind: NodeKind = nodeKind(n)
    const position = { x: n.x, y: n.y, width: n.width, height: n.height }
    const common = {
      ...(n.parentId ? { parentId: n.parentId } : {}),
      ...(n.meta?.source ? { source: n.meta.source } : {}),
    }
    if (n.type === 'file') {
      const r = resolved.get(n.file)
      const refs: DocRef[] = extractRefs(n.file, r?.frontmatter, r?.body)
      return { id: n.id, kind, position, path: n.file, frontmatter: r?.frontmatter, body: r?.body,
        truncated: r?.truncated, ...(refs.length ? { refs } : {}), ...common }
    }
    if (n.type === 'link') return { id: n.id, kind, position, url: n.url, ...common }
    if (n.type === 'text') return { id: n.id, kind, position, text: n.text, ...common }
    return { id: n.id, kind, position, ...(n.label !== undefined ? { label: n.label } : {}), ...common } // group
  })
  const edges: BriefEdge[] = (isScoped
    ? doc.edges.filter((e) => inScope.has(e.fromNode) && inScope.has(e.toNode))
    : doc.edges
  ).map((e) => {
    const origin = e.meta?.origin ?? 'user'
    const rel: RelationshipType = e.meta?.rel ?? (origin === 'links' ? 'references' : 'related')
    return { id: e.id, from: e.fromNode, to: e.toNode, label: e.label, rel, origin }
  })
  const comments: BriefComment[] = doc.flowcanvas.comments
    .filter((c) => !isScoped || (c.anchor.kind === 'node' && inScope.has(c.anchor.nodeId)))
    .map((c) => ({
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
  const parentId = an.parentId ?? existing?.parentId   // agent may now set parentId (v2 groups); else keep existing membership
  const base = {
    id,
    x: an.x, y: an.y, width: an.width, height: an.height,
    ...(an.color ? { color: an.color } : existing?.color ? { color: existing.color } : {}),
    ...(parentId ? { parentId } : {}),
    meta: { ...existing?.meta, origin: 'agent' as const, ...(an.source ? { source: an.source } : {}) },
  }
  if (an.type === 'group') {
    return {
      ...base,
      type: 'group',
      ...(an.label !== undefined ? { label: an.label }
        : existing?.type === 'group' && existing.label !== undefined ? { label: existing.label } : {}),
      meta: { ...base.meta, ...(an.shape ? { shape: an.shape } : {}) },
    }
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
      const rel: RelationshipType = ae.rel ?? existing.meta?.rel ?? 'related'
      const updated: CanvasEdge = {
        ...existing,
        fromNode: ae.fromNode, toNode: ae.toNode,
        fromSide: ae.fromSide, toSide: ae.toSide,
        label: ae.label ?? existing.label ?? REL_LABELS[rel],
        toEnd: existing.toEnd ?? 'arrow',
        meta: { ...existing.meta, origin: 'agent', rel },
      }
      edges[edges.indexOf(existing)] = updated
      eById.set(ae.id, updated)
      report.updated.edges++
      continue
    }
    if (pairs.has(pairOf(ae.fromNode, ae.toNode))) continue   // already covered — skip (idempotent)
    const id = ae.id ?? mintId('ag-')
    const relNew: RelationshipType = ae.rel ?? 'related'
    const edge: CanvasEdge = {
      id, fromNode: ae.fromNode, toNode: ae.toNode,
      fromSide: ae.fromSide, toSide: ae.toSide,
      label: ae.label ?? REL_LABELS[relNew],
      toEnd: 'arrow', meta: { origin: 'agent', rel: relNew },
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

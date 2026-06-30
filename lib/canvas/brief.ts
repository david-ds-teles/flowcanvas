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
  EdgeType,
  NodeSource,
  NodeShape,
  ComponentKind,
  EdgeRouting,
  EdgeLineStyle,
  EdgeEnd,
  GroupNode,
} from './jsoncanvas'
import { nodeKind, REL_LABELS } from './jsoncanvas'
import { extractRefs, type DocRef } from './refs'
import { kitSections } from './generation-kit'

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
  componentKind?: ComponentKind          // 004 — surfaces meta.kind so the agent preserves it
}
export interface BriefEdge {
  id: string
  from: string
  to: string
  label?: string
  rel?: RelationshipType                 // typed relationship (v2, Decision 1) — legacy, kept one version
  edgeType?: EdgeType                     // 006 — semantic flow type; drives the legend {color,line,head}
  origin: EdgeOrigin
  // 005-edges — echo the current visual style so the agent can preserve or restyle it (parity)
  routing?: EdgeRouting
  line?: EdgeLineStyle
  color?: CanvasColor
  fromSide?: Side
  toSide?: Side
  fromEnd?: EdgeEnd
  toEnd?: EdgeEnd
  labelT?: number
  points?: { x: number; y: number }[]
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
  responseContract: string               // inline copy of the Agent Contract (kitSections().schemaContract)
  coreDocPath?: string                   // 004 — tells the agent which doc is the spine (read it on a round)
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
  kind?: ComponentKind                   // 004 — agent emits the semantic kind; nodeFromAgent → meta.kind
}
export interface AgentEdge {
  id?: string
  fromNode: string
  toNode: string
  fromSide?: Side                        // 005-edges: omit ⇒ the endpoint floats from node center
  toSide?: Side
  label?: string
  rel?: RelationshipType                 // typed relationship (v2, Decision 1) — legacy, optional
  edgeType?: EdgeType                     // 006 — semantic flow type (data-flow|request|response|event|dependency|reference); drives the legend style
  // 005-edges — full parity with the human edge Style panel (see [[agent-feature-parity]])
  routing?: EdgeRouting                  // 'bezier' (default) | 'smoothstep' | 'straight'
  line?: EdgeLineStyle                   // 'solid' (default) | 'dashed' | 'dotted'
  color?: CanvasColor                    // hex "#RRGGBB" or preset "1".."6"; omit ⇒ provenance default
  fromEnd?: EdgeEnd                      // start marker shape; omit ⇒ 'none'
  toEnd?: EdgeEnd                        // end marker shape; omit ⇒ the edgeType legend default
  labelT?: number                        // 0..1 label position along the path; omit ⇒ 0.5
  points?: { x: number; y: number }[]    // manual line waypoints (absolute canvas coords); omit ⇒ auto-route
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
  coreDocPath?: string                   // the core spec doc → applyResponse binds the spine + mints its canvas card
}

export interface MergeReport {
  stale: boolean                  // resp.briefId !== prev.flowcanvas.session.lastBriefId
  generatedFiles: string[]        // paths the caller must POST to /api/file
  created: { nodes: number; edges: number; comments: number }
  updated: { nodes: number; edges: number }
  removed: { nodes: number; edges: number }
  conflicts: string[]             // node ids edited locally since baseRevision (last-writer-wins)
  warnings: string[]              // 006-sync — load-bearing visual rules the round skipped (empty groups, legend-overriding edge ends, no notes); surfaced to the agent so it self-corrects
}

// ─────────────────────────── The Agent Contract ───────────────────────────
//
// 004 — single source of truth: the contract text now lives in `generation-kit.ts`
// (`kitSections().schemaContract`). This re-export keeps existing importers working;
// `DesignBrief.responseContract` and `docs/flowcanvas-agent-contract.md` render from the same source.

export const AGENT_CONTRACT = kitSections().schemaContract

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
      ...(n.meta?.kind ? { componentKind: n.meta.kind } : {}),
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
    return {
      id: e.id, from: e.fromNode, to: e.toNode, label: e.label, rel, origin,
      // 006 — echo the flow type so the agent reads + round-trips it (the primary edge meaning)
      ...(e.meta?.edgeType ? { edgeType: e.meta.edgeType } : {}),
      // 005-edges — echo any non-default visual style so the agent round-trips it (parity)
      ...(e.meta?.routing ? { routing: e.meta.routing } : {}),
      ...(e.meta?.line ? { line: e.meta.line } : {}),
      ...(e.color ? { color: e.color } : {}),
      ...(e.fromSide ? { fromSide: e.fromSide } : {}),
      ...(e.toSide ? { toSide: e.toSide } : {}),
      ...(e.fromEnd ? { fromEnd: e.fromEnd } : {}),
      ...(e.toEnd ? { toEnd: e.toEnd } : {}),
      ...(e.meta?.labelT != null ? { labelT: e.meta.labelT } : {}),
      ...(e.meta?.points?.length ? { points: e.meta.points } : {}),
    }
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
    responseContract: kitSections().schemaContract,
    ...(doc.flowcanvas.session.coreDocPath ? { coreDocPath: doc.flowcanvas.session.coreDocPath } : {}),
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
    meta: { ...existing?.meta, origin: 'agent' as const,
      ...(an.source ? { source: an.source } : {}),
      ...(an.kind ? { kind: an.kind } : {}) },
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

// 006-sync — px slack when inferring group membership from geometry (a child placed roughly inside a
// boundary box but with no parentId is the "forgot parentId" case the brasilog board exhibited).
const CONTAINMENT_SLACK = 8

/**
 * Server-side safety net (the spec is served live, but spec-served ≠ spec-followed). Repairs + audits the
 * merged board against the load-bearing VISUAL rules an agent commonly skips:
 *   • repair — infer a missing parentId from geometric containment (smallest enclosing group wins), so a
 *     child dropped inside a boundary still belongs to it even when the agent forgot parentId.
 *   • audit  — collect human-readable warnings for empty boundary groups, edges whose explicit end marker
 *     overrides the semantic edgeType legend, and a component board with no design-note callouts.
 * Pure. The warnings ride back in the MergeReport so the agent self-corrects on the next round.
 */
function enforceBoardQuality(nodes: CanvasNode[], edges: CanvasEdge[]): { nodes: CanvasNode[]; warnings: string[] } {
  const warnings: string[] = []
  const groups = nodes.filter((n): n is GroupNode => n.type === 'group')
  const encloses = (g: GroupNode, n: CanvasNode): boolean =>
    n.x >= g.x - CONTAINMENT_SLACK &&
    n.y >= g.y - CONTAINMENT_SLACK &&
    n.x + n.width <= g.x + g.width + CONTAINMENT_SLACK &&
    n.y + n.height <= g.y + g.height + CONTAINMENT_SLACK

  // Repair: a parentless leaf fully inside exactly the smallest enclosing group adopts that group.
  const repaired = nodes.map((n) => {
    if (n.type === 'group' || n.parentId) return n
    const host = groups
      .filter((g) => g.id !== n.id && encloses(g, n))
      .sort((a, b) => a.width * a.height - b.width * b.height)[0]
    return host ? { ...n, parentId: host.id } : n
  })

  // Audit 1: empty boundary groups (after repair) render as empty floating boxes.
  const members = new Map<string, number>()
  for (const n of repaired) if (n.parentId) members.set(n.parentId, (members.get(n.parentId) ?? 0) + 1)
  for (const g of groups) {
    if (!members.get(g.id)) {
      warnings.push(`Boundary group ${g.label ? `"${g.label}"` : g.id} has no member nodes — set parentId on its children, or drop the group (it renders as an empty box).`)
    }
  }

  // Audit 2: edges that pin an explicit end marker while carrying an edgeType — the marker overrides the legend.
  const overriders = edges.filter((e) => e.meta?.edgeType && (e.fromEnd || e.toEnd)).length
  if (overriders > 0) {
    warnings.push(`${overriders} edge(s) set fromEnd/toEnd while also carrying edgeType — the explicit marker overrides the semantic legend head (e.g. an "event" loses its diamond). Omit fromEnd/toEnd unless an edge genuinely needs a non-standard marker.`)
  }

  // Audit 3: a component board with no notes — the key decisions/constraints are unstated.
  if (repaired.some((n) => n.type !== 'group' && n.meta?.kind) && !repaired.some((n) => n.type === 'text')) {
    warnings.push('Board has typed components but no notes — add type:"text" callouts for key decisions, constraints, or a legend.')
  }

  return { nodes: repaired, warnings }
}

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
    warnings: [],
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
        fromSide: ae.fromSide ?? existing.fromSide, toSide: ae.toSide ?? existing.toSide,
        label: ae.label ?? existing.label ?? REL_LABELS[rel],
        // 005-edges — agent restyle (parity); each field falls back to the existing value when omitted.
        // toEnd: no default — omit lets the renderer use the edgeType legend head (006 fix).
        ...(ae.color !== undefined ? { color: ae.color } : {}),
        ...(ae.fromEnd !== undefined ? { fromEnd: ae.fromEnd } : {}),
        ...(ae.toEnd !== undefined ? { toEnd: ae.toEnd } : {}),
        meta: {
          ...existing.meta, origin: 'agent', rel,
          ...(ae.edgeType !== undefined ? { edgeType: ae.edgeType } : {}),   // 006 — flow type (agent parity)
          ...(ae.routing !== undefined ? { routing: ae.routing } : {}),
          ...(ae.line !== undefined ? { line: ae.line } : {}),
          ...(ae.labelT !== undefined ? { labelT: ae.labelT } : {}),
          ...(ae.points !== undefined ? { points: ae.points } : {}),
        },
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
      // 005-edges — omit sides ⇒ float from center; carry any agent-supplied visual style (parity)
      ...(ae.fromSide ? { fromSide: ae.fromSide } : {}),
      ...(ae.toSide ? { toSide: ae.toSide } : {}),
      label: ae.label ?? REL_LABELS[relNew],
      ...(ae.color !== undefined ? { color: ae.color } : {}),
      ...(ae.fromEnd !== undefined ? { fromEnd: ae.fromEnd } : {}),
      // toEnd: no default — omit lets the renderer use the edgeType legend head (006 fix).
      ...(ae.toEnd !== undefined ? { toEnd: ae.toEnd } : {}),
      meta: {
        origin: 'agent', rel: relNew,
        edgeType: ae.edgeType ?? 'reference',   // 006 — flow type (agent parity); default neutral like human onConnect
        ...(ae.routing !== undefined ? { routing: ae.routing } : {}),
        ...(ae.line !== undefined ? { line: ae.line } : {}),
        ...(ae.labelT !== undefined ? { labelT: ae.labelT } : {}),
        ...(ae.points !== undefined ? { points: ae.points } : {}),
      },
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
  const survivingNodes = nodes.filter((n) => !rmN.has(n.id))
  const nextEdges = edges.filter((e) => !rmE.has(e.id))
  report.removed.nodes = nodes.length - survivingNodes.length
  report.removed.edges = edges.length - nextEdges.length

  // (7c) Quality net — repair missing parentId by containment + audit the load-bearing visual rules.
  const { nodes: nextNodes, warnings } = enforceBoardQuality(survivingNodes, nextEdges)
  report.warnings = warnings

  // (7b) Core spec doc — bind the spine to it ONLY (operator 2026-06-30 reversed: the core doc is the
  // living spine, NEVER a duplicate canvas card). The agent declares coreDocPath; we persist it on the
  // session so the spine renders, but no card node is ever minted for it.
  const coreDocPath = resp.coreDocPath ?? prev.flowcanvas.session.coreDocPath

  // (8) Bump & hand back — the store persists via POST /api/canvas.
  const next: FlowcanvasDoc = {
    nodes: nextNodes,
    edges: nextEdges,
    flowcanvas: {
      ...prev.flowcanvas,
      comments,
      session: {
        ...prev.flowcanvas.session,
        revision: prev.flowcanvas.session.revision + 1,
        updatedAt: now,
        ...(coreDocPath ? { coreDocPath } : {}),
      },
    },
  }
  return { next, report }
}

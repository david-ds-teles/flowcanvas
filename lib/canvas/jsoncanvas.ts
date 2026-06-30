// ─────────────────────────── Extended JSONCanvas core ───────────────────────────

export type Side = 'top' | 'right' | 'bottom' | 'left'
/** Marker shape drawn at an edge end. `none` = no marker. 005-edges widened this from `'none'|'arrow'`. */
export type EdgeEnd = 'none' | 'arrow' | 'arrow-open' | 'circle' | 'diamond'
/** Ordered allowed set — drives the edge end-marker picker UI + the agent contract. */
export const EDGE_ENDS: readonly EdgeEnd[] = ['none', 'arrow', 'arrow-open', 'circle', 'diamond']
/** Hex "#RRGGBB" or JSONCanvas preset "1".."6". */
export type CanvasColor = string

export type NodeOrigin = 'user' | 'agent' | 'import'
/** Drawn outline of a `group` node. Absent → rectangle (the JSONCanvas default). */
export type NodeShape = 'rectangle' | 'ellipse' | 'diamond'

// ── 004 — semantic system-design kind. DISTINCT from the derived render NodeKind
//    ('markdown'|'image'|'file'|'link'|'note'|'group'). Do NOT reuse that name — it
//    is the content render-kind consumed by nodeKind(), adapter, brief.BriefNode.kind. ──
export type ComponentKind =
  | 'service' | 'datastore' | 'queue' | 'actor'
  | 'external' | 'decision' | 'process' | 'boundary'

/** Ordered allowed set — drives the kind picker UI and the agent contract. */
export const COMPONENT_KINDS: readonly ComponentKind[] = [
  'service', 'datastore', 'queue', 'actor',
  'external', 'decision', 'process', 'boundary',
]

/** Per-kind render hints consumed by component-node.tsx + the kind picker (Phase 2/4). */
export interface ComponentKindMeta {
  label: string
  glyph: string
  silhouette:
    | 'box' | 'cylinder' | 'lane' | 'circle'
    | 'cloud' | 'diamond' | 'gear' | 'frame'
  accent: CanvasColor   // nyx preset id '1'..'6' (mapped by adapter colorVar) → --node-accent
}

// NOTE (004): `accent` drives ONLY the group/boundary outline tint (adapter sets it as --node-accent
// when a meta.kind:'boundary'/colored group renders). The leaf COMPONENT WIDGET color is keyed off
// `data-kind` in app/styles/nodes.css (the ui-design palette: service=cyan · datastore=lime · queue=amber
// · actor=violet · external=rose · decision=indigo) — a separate consumer. Editing `.accent` will NOT
// change the widget color; edit the `.fc-cmp[data-kind=…]` rules for that.
export const COMPONENT_KIND_META: Record<ComponentKind, ComponentKindMeta> = {
  service:   { label: 'Service',   glyph: 'server',   silhouette: 'box',      accent: '6' },
  datastore: { label: 'Datastore', glyph: 'database', silhouette: 'cylinder', accent: '5' },
  queue:     { label: 'Queue',     glyph: 'layers',   silhouette: 'lane',     accent: '2' },
  actor:     { label: 'Actor',     glyph: 'person',   silhouette: 'circle',   accent: '4' },
  external:  { label: 'External',  glyph: 'cloud',    silhouette: 'cloud',    accent: '3' },
  decision:  { label: 'Decision',  glyph: 'diamond',  silhouette: 'diamond',  accent: '1' },
  process:   { label: 'Process',   glyph: 'gear',     silhouette: 'gear',     accent: '6' },
  boundary:  { label: 'Boundary',  glyph: 'frame',    silhouette: 'frame',    accent: '5' },
}

// ── Decision 7 — curated relationship catalog ──────────────────────────────
// `contains` is NOT here: containment is group membership (parentId).
// Free-form display still lives in CanvasEdge.label.
export type RelationshipType =
  | 'references' | 'depends-on' | 'implements' | 'derives-from'
  | 'calls' | 'produces' | 'informs' | 'related'

/** Ordered allowed set — drives the rel picker UI and the agent contract. */
export const RELATIONSHIP_TYPES: readonly RelationshipType[] = [
  'references', 'depends-on', 'implements', 'derives-from',
  'calls', 'produces', 'informs', 'related',
]

/** Default human display label for a type (Decision 7 — label defaults from rel). */
export const REL_LABELS: Record<RelationshipType, string> = {
  references: 'references',
  'depends-on': 'depends on',
  implements: 'implements',
  'derives-from': 'derives from',
  calls: 'calls',
  produces: 'produces',
  informs: 'informs',
  related: 'related',
}

// Decision 4 — 'import' marks extraction-seeded edges; 'links' stays for legacy/migrated.
export type EdgeOrigin = 'links' | 'user' | 'agent' | 'import'
export const EDGE_ORIGINS: readonly EdgeOrigin[] = ['links', 'user', 'agent', 'import']
export const SCHEMA_VERSIONS = ['0.1', '0.2', '0.3', '0.4', '0.5'] as const

// ── 005-edges — per-edge visual style (human + agent authorable; see [[agent-feature-parity]]) ──
/** Path geometry between endpoints: 'smoothstep' (right-angle, default) · 'bezier' (curve) · 'straight'. */
export type EdgeRouting = 'bezier' | 'smoothstep' | 'straight'
/** Ordered allowed set (default first) — drives the routing picker UI + the agent contract. */
export const EDGE_ROUTINGS: readonly EdgeRouting[] = ['smoothstep', 'bezier', 'straight']
/** Stroke dash pattern: 'solid' (default) · 'dashed' · 'dotted'. */
export type EdgeLineStyle = 'solid' | 'dashed' | 'dotted'
/** Ordered allowed set — drives the line-style picker UI + the agent contract. */
export const EDGE_LINE_STYLES: readonly EdgeLineStyle[] = ['solid', 'dashed', 'dotted']

// ── 006-semantic-edges — connection ports (Decision 1) ──────────────────────
/** A connection dot on a node perimeter. Stable id so edges can share/reuse/drag it. */
export interface ConnectionPort {
  id: string        // 'p-<short>' minted via uuid
  side: Side        // which edge of the node box
  t: number         // 0..1 offset along that side (0 = start corner, 1 = end corner)
}

// ── 006-semantic-edges — flow taxonomy (Decision 2) ─────────────────────────
/** Semantic flow type of an edge — drives the legend visual via EDGE_TYPE_STYLE. */
export type EdgeType =
  | 'data-flow' | 'request' | 'response'
  | 'event' | 'dependency' | 'reference'

/** Ordered allowed set — drives the legend, the type picker, and the agent contract. */
export const EDGE_TYPES: readonly EdgeType[] = [
  'data-flow', 'request', 'response', 'event', 'dependency', 'reference',
]

/** Default {color, line, head} a flow type paints. Single source for legend + picker + renderer. */
export interface EdgeTypeStyle {
  label: string
  color: CanvasColor    // preset id '1'..'6' or hex; resolved by adapter.colorVar
  line: EdgeLineStyle   // 'solid' | 'dashed' | 'dotted'
  fromEnd: EdgeEnd      // marker at the source end
  toEnd: EdgeEnd        // marker at the target end
}

// Presets: '1' rose '2' amber '3' gold '4' lime '5' cyan '6' violet.
// dependency/reference use muted hex (no muted preset). Exact hex tunable (design Open Q — palette).
export const EDGE_TYPE_STYLE: Record<EdgeType, EdgeTypeStyle> = {
  'data-flow':  { label: 'data flow',  color: '5',       line: 'solid',  fromEnd: 'none', toEnd: 'arrow' },
  request:      { label: 'request',    color: '2',       line: 'solid',  fromEnd: 'none', toEnd: 'arrow-open' },
  response:     { label: 'response',   color: '2',       line: 'dotted', fromEnd: 'none', toEnd: 'arrow-open' },
  event:        { label: 'event',      color: '6',       line: 'solid',  fromEnd: 'none', toEnd: 'diamond' },
  dependency:   { label: 'dependency', color: '#8b93a7', line: 'dashed', fromEnd: 'none', toEnd: 'arrow' },
  reference:    { label: 'reference',  color: '#6b7280', line: 'dotted', fromEnd: 'none', toEnd: 'circle' },
}

/** Migration map — old RelationshipType → new EdgeType (Decision 2). */
export const REL_TO_EDGE_TYPE: Record<RelationshipType, EdgeType> = {
  calls: 'request', produces: 'data-flow', 'depends-on': 'dependency',
  references: 'reference', informs: 'event', implements: 'dependency',
  'derives-from': 'reference', related: 'reference',
}

// Decision 2 — provenance back to the source design/plan doc a node was extracted from.
export interface NodeSource {
  path: string            // root-relative source doc
  anchor?: string         // heading slug within the source, e.g. 'module-boundaries'
}

/** Flowcanvas extension — always safe to drop; re-derivable or UI-only. */
export interface NodeMeta {
  origin?: NodeOrigin
  /** Body hidden (frontmatter-only card). UI state, persisted for convenience. */
  collapsed?: boolean
  /** Shape of a `group` node's outline (rectangle default). */
  shape?: NodeShape
  /**
   * Parsed YAML frontmatter of a markdown node. CACHE ONLY — the file on disk is
   * the source of truth; repopulated on every load via /api/canvas/resolve.
   */
  frontmatter?: Record<string, unknown>
  source?: NodeSource                      // v2 (Decision 2)
  template?: string                        // v2 — template id this node came from (Decision 8)
  kind?: ComponentKind                     // 004 — optional, additive; absent ⇒ legacy card render
  ports?: ConnectionPort[]                 // 006 — connection dots on this node's perimeter; absent ⇒ no ports yet (legacy/never-connected node)
  /** Horizontal alignment of a node's text/label. */
  align?: 'left' | 'center' | 'right'
  /** Vertical alignment of a node's text/label. */
  valign?: 'top' | 'middle' | 'bottom'
  /** Custom background/fill color (applies to text/note/shape nodes). Distinct from `color` (foreground/stroke). */
  fill?: CanvasColor
}

interface NodeBase {
  id: string
  x: number; y: number        // ABSOLUTE canvas coords — even for a grouped child (adapter converts to/from React Flow's parent-relative space)
  width: number; height: number
  color?: CanvasColor
  parentId?: string           // Flowcanvas extension (Phase 10): id of the containing `group` node. Single nesting level. Absent → top-level.
  meta?: NodeMeta             // Flowcanvas extension
}
/** type:"file" → markdown | image | other, discriminated by file extension at render. */
export interface FileNode  extends NodeBase { type: 'file';  file: string; subpath?: string }
export interface LinkNode  extends NodeBase { type: 'link';  url: string }
export interface TextNode  extends NodeBase { type: 'text';  text: string }
export interface GroupNode extends NodeBase { type: 'group'; label?: string; background?: string; backgroundStyle?: 'cover' | 'ratio' | 'repeat' }
export type CanvasNode = FileNode | LinkNode | TextNode | GroupNode

export interface CanvasEdge {
  id: string
  fromNode: string; toNode: string
  fromSide?: Side; toSide?: Side              // 005-edges: authoring sugar — normalized into a port at load (006). PRESENT = seed a pinned-side port · ABSENT = geometric autoPort
  fromPort?: string; toPort?: string          // 006 — ConnectionPort id geometry source of truth; the rendered endpoint anchors here
  fromEnd?: EdgeEnd; toEnd?: EdgeEnd          // marker shape per end; default toEnd:"arrow", fromEnd:"none"
  color?: CanvasColor                         // 005-edges: now drives the rendered stroke (overrides the provenance default)
  label?: string                              // free-form display (unchanged)
  meta?: {
    origin?: EdgeOrigin
    rel?: RelationshipType                    // v2 — typed relationship (Decision 1); 006: readable one more version, superseded by edgeType
    edgeType?: EdgeType                        // 006 — semantic flow type; resolves default {color,line,head} via EDGE_TYPE_STYLE
    routing?: EdgeRouting                     // 005-edges — path style; absent ⇒ renderer default 'smoothstep'
    line?: EdgeLineStyle                      // 005-edges — stroke dash; absent ⇒ 'solid' (or 'dashed' for a derived links edge)
    labelT?: number                           // 005-edges — 0..1 label position along the path; absent ⇒ 0.5 (midpoint)
    points?: { x: number; y: number }[]       // 005-edges — manual waypoints (absolute canvas coords) the line bends through; drag to reshape
  }
}

// ─────────────────────────── Comments (Flowcanvas extension) ───────────────────────────

export type CommentAnchor =
  | { kind: 'node';   nodeId: string; offsetX: number; offsetY: number }  // 0..1 fractions of node box
  | { kind: 'canvas'; x: number; y: number }                             // canvas coordinates

export interface Comment {
  id: string
  anchor: CommentAnchor
  parentId: string | null      // null = root thread; else id of the root it replies to
  author: string               // "human:<name>" | "agent:<model>"
  text: string                 // markdown
  createdAt: string            // ISO 8601
  resolvedAt?: string | null   // root-only
  badge?: number               // root-only display number, assigned in creation order
}

// ─────────────────────────── Session & document ───────────────────────────

export interface SessionMeta {
  title?: string
  intent?: string              // the human's high-level goal for the whole board
  createdAt: string
  updatedAt: string
  revision: number             // bumps on every save; optimistic-concurrency token
  lastBriefId?: string         // id of the most recently exported brief
  baseRevision?: number        // v2 — session.revision captured at Submit (review window start)
  pendingReview?: boolean      // v2 — an agent round landed; open change-review on next load
  briefScope?: string[]        // v2 — node ids the next brief is narrowed to (scope-aware submit); absent ⇒ whole board
  coreDocPath?: string         // 004 — root-relative path of the living core-markdown spine
}

export interface FlowcanvasExt {
  schemaVersion: '0.1' | '0.2' | '0.3' | '0.4' | '0.5'   // 006 boards persist '0.5'
  session: SessionMeta
  comments: Comment[]
}

export interface FlowcanvasDoc {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
  flowcanvas: FlowcanvasExt
}

// ─────────────────────────── Derived kind ───────────────────────────

export type NodeKind = 'markdown' | 'image' | 'file' | 'link' | 'note' | 'group'
const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif'])

export function nodeKind(n: CanvasNode): NodeKind {
  if (n.type === 'link')  return 'link'
  if (n.type === 'text')  return 'note'
  if (n.type === 'group') return 'group'
  const ext = n.file.slice(n.file.lastIndexOf('.')).toLowerCase()
  if (ext === '.md' || ext === '.mdx') return 'markdown'
  if (IMAGE_EXT.has(ext)) return 'image'
  return 'file'
}

export const isFileNode = (n: CanvasNode): n is FileNode => n.type === 'file'

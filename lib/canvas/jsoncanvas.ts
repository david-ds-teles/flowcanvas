// ─────────────────────────── Extended JSONCanvas core ───────────────────────────

export type Side = 'top' | 'right' | 'bottom' | 'left'
export type EdgeEnd = 'none' | 'arrow'
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
export const SCHEMA_VERSIONS = ['0.1', '0.2', '0.3'] as const

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
  fromSide?: Side; toSide?: Side
  fromEnd?: EdgeEnd; toEnd?: EdgeEnd          // default toEnd:"arrow"
  color?: CanvasColor
  label?: string                                          // free-form display (unchanged)
  meta?: { origin?: EdgeOrigin; rel?: RelationshipType }  // v2 — + rel (Decision 1)
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
  schemaVersion: '0.1' | '0.2' | '0.3'   // 004 boards persist '0.3'
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

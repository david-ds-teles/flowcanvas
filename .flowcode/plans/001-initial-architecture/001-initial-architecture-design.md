---
name: 001-initial-architecture-design
description: Design artifact for Flowcanvas — a node-based canvas that renders, connects, and round-trips flowcode markdown files with an AI agent via an extended-JSONCanvas schema.
status: approved
tags: [design, architecture, canvas, jsoncanvas, agent-protocol]
links: [001-initial-architecture-plan.md]
---

# 001-initial-architecture — Flowcanvas Design

- Flowcanvas renders flowcode `.md` files as canvas cards (frontmatter + body), connects them with labeled edges, embeds images/links as a live diagram, and round-trips the whole board to/from an AI agent as one JSON.
- Schema is **extended JSONCanvas 1.0** (Obsidian-compatible) + a single `flowcanvas` namespace block (session + comments) + a per-node `meta` cache — the `.canvas` file is the durable, machine-readable, cross-session memory.
- Canvas engine is **React Flow** (`@xyflow/react`, MIT); markdown via `react-markdown` + `remark-gfm`; frontmatter via `gray-matter`; standalone **Next.js 15** app.
- Edges are derived automatically from each file's `links:` frontmatter (the flowcode graph) and merged with manual + agent edges by provenance.
- The agent loop is bidirectional: the human exports a self-contained **DesignBrief**; the agent replies with an **AgentResponse** in the same schema; an idempotent id-keyed merge re-renders the board and writes any agent-authored files.
- Scope — in: render, connect, images, comments, agent round-trip, persistence; out: inline canvas editing, multiplayer, 3-way merge, direct agent API wiring, mobile.
- Status draft; author agent; dated 2026-06-25.
- Sibling plan: `001-initial-architecture-plan.md`.

---

## Problem Statement

Designing a system out of markdown today is linear and lossy. Files relate to each other (a design references its plan; a module references its tests) but those relationships live as paths buried in frontmatter, never seen as a shape. When a human hands that design to an AI agent, it goes as an unstructured prompt — the agent can't see the board the human sees, can't tell which file a comment refers to, and can't answer in a form the human can render back. And nothing persists: the comments, the spatial layout, the back-and-forth reasoning evaporate when the session ends.

Flowcanvas makes the **design board itself the medium**: a spatial, relational, durable, machine-readable artifact that both a human and an agent read and write through one well-defined JSON schema. The human arranges files, draws relationships, drops reference images, and pins comments; the agent consumes that exact structure and responds in it; the board — and its full history of comments and connections — is a file in the repo.

## Scope

**In scope (v0.1):**
- Render flowcode markdown files as canvas nodes showing parsed YAML frontmatter **and** rendered body.
- Inline image nodes and external-file/link nodes, rendered on the canvas so the board reads as a diagram.
- Drag-and-drop **upload** of local images (and `.md` files) onto the canvas — written under `FLOWCANVAS_ROOT` via `/api/upload` and added as image/markdown nodes. *(UI-design scope addition, 2026-06-25.)*
- Labeled edges between nodes: manually drawn **and** auto-derived from each file's `links:` frontmatter.
- Human comments pinned to a node or to canvas coordinates, as flat threads (reply + resolve).
- A bidirectional, versioned JSON schema: export a **DesignBrief** for an agent; import an **AgentResponse** and merge it onto the board.
- Persistence of the `.canvas` file (nodes, edges, comments, session) as durable cross-session memory.
- A premium dark visual language (dot-grid canvas, Geist typography, minimap/controls).

**Out of scope (v0.1):**
- Inline markdown **editing** on the canvas — nodes open in a read-only reader drawer; editing is deferred.
- Real-time multiplayer / collaborative cursors.
- Durable undo/redo beyond the browser session.
- 3-way merge / conflict-resolution UI (v0.1 is optimistic, last-writer-wins with a warning).
- Direct agent API wiring — the brief/response move by file download + clipboard paste in v0.1.
- Nested group authoring, a multi-canvas browser, Obsidian write-back fidelity, mobile/responsive.

## Solution Overview

Flowcanvas is a **standalone Next.js 15 (App Router, TypeScript)** application. The frontend is a single canvas screen built on **React Flow**, where every node is a React component — so a markdown card renders real GFM via `react-markdown`, an image card renders a real `<img>`, and edges carry real labels. The backend is a thin set of **Route Handlers** wrapping Node `fs`, every one guarded against path traversal: read/write the `.canvas` document, batch-resolve the frontmatter+body of referenced markdown files, and stream local images.

The on-disk format is **JSONCanvas 1.0** at the `nodes`/`edges` level (so the file opens in Obsidian) plus one extension key, `flowcanvas`, holding the session metadata and the comment threads, and an optional `meta` object on each node holding a re-derivable frontmatter cache and provenance. Everything outside core JSONCanvas is either re-derivable or non-fatal to lose, so the file degrades gracefully if a JSONCanvas-only tool rewrites it.

The agent loop is the point of the tool. **Export** packages the board into a `DesignBrief` — a fat, self-contained JSON that embeds each markdown file's parsed frontmatter and body, the edges with their relationship labels, the comment threads addressed by id, and the human's high-level `intent`. The agent reads it with no filesystem access required, and answers with an `AgentResponse` in a sibling schema: nodes to upsert, edges to add, comments to reply to (by id), and whole markdown files it authored. **Import** runs an idempotent, id-keyed merge that writes the generated files, upserts the nodes and edges, attaches the replies, re-derives the `links:` edges, and persists — so re-importing the same response is a no-op.

Why this beats the alternatives: a bespoke schema would reinvent JSONCanvas and lose Obsidian interop; a drawing-first canvas (tldraw/Excalidraw) can't host a markdown card as a real DOM component and (tldraw) isn't license-free; embedding only file paths in the brief would force the agent to have filesystem access. The chosen design keeps the open standard, renders rich DOM in nodes, and makes the brief self-sufficient.

## Alternatives Considered

High-level approach alternatives evaluated before this design was locked in. Per-component decisions live under Architecture Decisions.

| Approach | Why considered | Why rejected |
|----------|---------------|--------------|
| Bespoke JSON schema | Full control over node/edge/comment shapes | Reinvents a solved problem; loses Obsidian `.canvas` interop; no ecosystem |
| Drawing-first canvas (tldraw / Excalidraw) | Beautiful infinite canvas out of the box | Canvas-rendered (HTML5 `<canvas>`) — cannot host a `react-markdown` card or `<img>` as a real node; tldraw is proprietary/source-available (paid production license + watermark) |
| Embed only file **paths** in the agent brief | Smaller payload | Forces the agent to have fs/MCP access to read content; breaks the "paste one JSON" workflow |
| Extend mdview as a new mode | Reuse an existing app | User chose a standalone product; mdview itself isn't built yet, so there's nothing to extend |

**Chosen:** extended-JSONCanvas + React Flow + a self-contained brief, as a standalone Next.js app (see Solution Overview).
**Key rationale:** keep the open standard and Obsidian interop, render rich DOM inside nodes, and make the agent brief filesystem-independent so the loop is a clipboard round-trip.

## Architecture Decisions

### Decision 1: On-disk schema

**Options considered:**

| Option | Pros | Cons |
|--------|------|------|
| A — Extended JSONCanvas 1.0 | Open standard, Obsidian-compatible, minimal, `file`/`text`/`link`/`group` nodes + labeled edges built in | No image-metadata, comment, or arbitrary-`meta` fields — must extend |
| B — React Flow's native `{nodes,edges,viewport}` | Zero adapter | Proprietary shape, no interop, `data:any` is unconstrained |
| C — Fully bespoke | Exactly our needs | Reinvents the wheel, no ecosystem, no external renderer |

**Decision:** Option A — Extended JSONCanvas 1.0.
**Rationale:** The gaps are small and close cleanly with **one** top-level `flowcanvas` key (session + comments) and an optional per-node `meta` (frontmatter cache + provenance). Image nodes need no new type — an image is a `file` node whose extension is an image, sniffed at render time. The core `nodes`/`edges` stay spec-valid so the board opens in Obsidian; the extensions are namespaced and re-derivable, so a foreign rewrite degrades gracefully.

### Decision 2: Canvas rendering engine

**Options considered:**

| Option | Pros | Cons |
|--------|------|------|
| A — React Flow (`@xyflow/react`) | MIT; custom nodes are React components (markdown/img render natively); labeled edges; built-in Background/MiniMap/Controls; serializes to `{nodes,edges,viewport}` | DOM-based — very large boards need virtualization (not a v0.1 concern) |
| B — tldraw | Gorgeous infinite canvas | Proprietary license (paid production + watermark on free tier); SVG shapes can't host DOM markdown |
| C — Excalidraw / Konva | MIT | HTML5-canvas-rendered — cannot render a `react-markdown` card or real `<img>` as a node |
| D — JointJS | Mature diagramming | JointJS+ (React shapes) is paid ($2,990/dev); not React-first |

**Decision:** Option A — React Flow.
**Rationale:** It is the only option that is both license-free and architecturally correct: nodes are arbitrary React components, so the markdown card, image card, and comment pins are just JSX, and labeled edges are first-class. Its JSON maps onto extended-JSONCanvas with a ~30-line adapter.

### Decision 3: Application shape

**Options considered:**

| Option | Pros | Cons |
|--------|------|------|
| A — Standalone Next.js 15 app | Independent product; owns its stack; ships without dependencies | Re-specifies the fs API + tokens (small, proven from mdview/001) |
| B — A mode inside mdview | Reuse mdview's code | mdview isn't built; couples two products; user chose standalone |

**Decision:** Option A — standalone Next.js 15 app in `flowcanvas/`.
**Rationale:** User direction. The app re-adopts mdview/001's **proven choices** (Next.js 15, `react-markdown` + `rehype-shiki` + `remark-gfm`, Zustand, Tailwind v4, Geist, a guarded fs API) as its own codebase, adding React Flow + `gray-matter`.

### Decision 4: Markdown rendering split (perf)

**Options considered:**

| Option | Pros | Cons |
|--------|------|------|
| A — Lightweight client renderer for node bodies, full shiki only in the reader | Fast on boards with many nodes; one heavy renderer instantiated at a time | Node-body code blocks aren't syntax-highlighted |
| B — Full `rehype-shiki` in every node | Perfect fidelity everywhere | Async shiki per node × N nodes = jank and long first paint |

**Decision:** Option A.
**Rationale:** Running an async shiki highlighter inside every card does not scale. Node bodies use `canvas-markdown.tsx` (client `react-markdown` + `remark-gfm`, code blocks styled but not tokenized); the full-fidelity server `markdown-renderer.tsx` (with `rehype-shiki`) renders only inside the reader drawer when a node is opened.

### Decision 5: Comment model

**Options considered:**

| Option | Pros | Cons |
|--------|------|------|
| A — `flowcanvas.comments[]`, Figma-style dual anchor, flat threads | Matches a proven model; node-anchored pins track the node; simple data | Not nested threads (acceptable) |
| B — Comments as JSONCanvas `text` nodes | No schema extension | Pollutes the graph; can't anchor to a node; no resolve/thread state |

**Decision:** Option A.
**Rationale:** A comment anchors either to a node (`{nodeId, offsetX, offsetY}` as 0..1 fractions, so it follows the node and scales with resize) or to canvas coordinates. Threads are flat: `parentId === null` is a root (gets a sequential `badge`), otherwise it's a reply. This mirrors Figma/Miro and serializes trivially.

### Decision 6: Edge derivation & provenance

**Options considered:**

| Option | Pros | Cons |
|--------|------|------|
| A — Derive from `links:` frontmatter + manual + agent, tagged by `meta.origin`, reconciled on load | The flowcode graph becomes the diagram for free; self-healing | Must reconcile derived vs manual to avoid duplicates |
| B — Only manual edges | Simplest | Throws away the `links:` graph that already encodes structure |

**Decision:** Option A.
**Rationale:** flowcode files already declare their neighbours in `links:`. `deriveLinkEdges` turns those into edges with **deterministic ids** (`lk:<from>-><to>`), so recomputing on every load replaces the whole derived set — links removed from frontmatter drop their edges, links added create them — while user/agent edges (other origins) are never touched. A derived edge that duplicates a manual pair is suppressed (manual wins its label/style).

---

## Technical Design

### Data Models

The complete schema. `lib/canvas/jsoncanvas.ts`:

```typescript
// ─────────────────────────── Extended JSONCanvas core ───────────────────────────

export type Side = 'top' | 'right' | 'bottom' | 'left'
export type EdgeEnd = 'none' | 'arrow'
/** Hex "#RRGGBB" or JSONCanvas preset "1".."6". */
export type CanvasColor = string

export type NodeOrigin = 'user' | 'agent' | 'import'
export type EdgeOrigin = 'links' | 'user' | 'agent'

/** Flowcanvas extension — always safe to drop; re-derivable or UI-only. */
export interface NodeMeta {
  origin?: NodeOrigin
  /** Body hidden (frontmatter-only card). UI state, persisted for convenience. */
  collapsed?: boolean
  /**
   * Parsed YAML frontmatter of a markdown node. CACHE ONLY — the file on disk is
   * the source of truth; repopulated on every load via /api/canvas/resolve.
   */
  frontmatter?: Record<string, unknown>
}

interface NodeBase {
  id: string
  x: number; y: number
  width: number; height: number
  color?: CanvasColor
  meta?: NodeMeta              // Flowcanvas extension
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
  label?: string
  meta?: { origin?: EdgeOrigin }              // Flowcanvas extension
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
}

export interface FlowcanvasExt {
  schemaVersion: '0.1'
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
```

The agent round-trip shapes. `lib/canvas/brief.ts` (types):

```typescript
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
export interface BriefEdge { id: string; from: string; to: string; label?: string; origin: EdgeOrigin }
export interface BriefComment {
  id: string; threadId: string           // threadId = root comment id; reply by setting parentId = threadId
  anchorNodeId?: string                  // present for node-anchored comments
  author: string; text: string; createdAt: string; resolved: boolean
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
  responseContract: string               // inline copy of the Agent Contract (see below)
}

// ─────────────────────────── Direction B: AgentResponse (agent → tool) ───────────────────────────

export interface GeneratedFile { path: string; content: string }   // content includes YAML frontmatter
export interface AgentNode {
  id?: string                            // present → update; absent or "ag-*" → create
  type: 'file' | 'link' | 'text'
  x: number; y: number; width: number; height: number
  file?: string; url?: string; text?: string; color?: CanvasColor
}
export interface AgentEdge {
  id?: string; fromNode: string; toNode: string
  fromSide?: Side; toSide?: Side; label?: string
}
export interface AgentComment {
  id?: string; parentId: string | null   // parentId set → reply; null → new annotation
  anchor: CommentAnchor; author: string; text: string; createdAt?: string
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
  generatedFiles?: GeneratedFile[]       // new/updated md the agent authored → tool writes to disk
}
```

**Worked example** — a small board mapping mdview's own 001 artifacts (design ↔ plan auto-linked via frontmatter, a manual edge to an image, and a comment thread with an agent reply). This is valid JSONCanvas at the `nodes`/`edges` level:

```json
{
  "nodes": [
    {
      "id": "n-design", "type": "file",
      "file": "mdview/001-initial-architecture-design.md",
      "x": -480, "y": -200, "width": 380, "height": 320, "color": "5",
      "meta": {
        "origin": "user", "collapsed": false,
        "frontmatter": {
          "name": "001-initial-architecture-design",
          "status": "approved",
          "tags": ["design", "architecture"],
          "links": ["mdview/001-initial-architecture-plan.md"]
        }
      }
    },
    {
      "id": "n-plan", "type": "file",
      "file": "mdview/001-initial-architecture-plan.md",
      "x": 40, "y": -200, "width": 380, "height": 320,
      "meta": { "origin": "user", "frontmatter": { "name": "001-initial-architecture-plan", "status": "active", "links": [] } }
    },
    {
      "id": "n-arch-img", "type": "file", "file": "docs/architecture.png",
      "x": 40, "y": 200, "width": 380, "height": 240, "meta": { "origin": "user" }
    },
    {
      "id": "n-note", "type": "text",
      "text": "## Open question\nShould the canvas store get its own slice?",
      "x": -480, "y": 200, "width": 320, "height": 160, "color": "#5ef2ff",
      "meta": { "origin": "user" }
    }
  ],
  "edges": [
    { "id": "lk:n-design->n-plan", "fromNode": "n-design", "toNode": "n-plan", "fromSide": "right", "toSide": "left", "toEnd": "arrow", "label": "links", "color": "6", "meta": { "origin": "links" } },
    { "id": "e-user-1", "fromNode": "n-plan", "toNode": "n-arch-img", "fromSide": "bottom", "toSide": "top", "toEnd": "arrow", "label": "realizes", "meta": { "origin": "user" } },
    { "id": "e-user-2", "fromNode": "n-note", "toNode": "n-design", "fromSide": "top", "toSide": "bottom", "label": "questions", "meta": { "origin": "user" } }
  ],
  "flowcanvas": {
    "schemaVersion": "0.1",
    "session": {
      "title": "mdview 001 architecture map",
      "intent": "Map the 001 design↔plan↔assets so the agent can propose the canvas extension.",
      "createdAt": "2026-06-25T10:00:00Z", "updatedAt": "2026-06-25T10:42:00Z",
      "revision": 7, "lastBriefId": "brief-3f9c"
    },
    "comments": [
      { "id": "c-1", "anchor": { "kind": "node", "nodeId": "n-plan", "offsetX": 0.5, "offsetY": 0.9 }, "parentId": null, "author": "human:david", "text": "Can the file API be reused verbatim for canvas persistence?", "createdAt": "2026-06-25T10:20:00Z", "resolvedAt": null, "badge": 1 },
      { "id": "c-1-r1", "anchor": { "kind": "node", "nodeId": "n-plan", "offsetX": 0.5, "offsetY": 0.9 }, "parentId": "c-1", "author": "agent:opus-4.8", "text": "Yes — guardPath + the POST handler are reused; canvas adds /api/canvas + /api/asset only.", "createdAt": "2026-06-25T10:41:00Z" }
    ]
  }
}
```

### Enums & Constants

```text
NodeKind (derived)   : markdown | image | file | link | note | group
NodeMeta.origin      : user | agent | import
CanvasEdge.meta.origin : links | user | agent
EdgeEnd              : none | arrow            (edge default toEnd = "arrow")
Side                 : top | right | bottom | left
Comment.author scheme: "human:<name>"  e.g. "human:david"
                       "agent:<model>" e.g. "agent:opus-4.8"
CanvasColor          : "#RRGGBB"  |  preset "1".."6"
                       presets (Flowcanvas rendering): 1=red 2=orange 3=yellow 4=green 5=cyan 6=purple
IMAGE_EXT (allowlist): .png .jpg .jpeg .gif .webp .svg .avif
MARKDOWN_EXT         : .md .mdx
BODY_CAP             : 40_000 chars  (resolve truncates longer bodies, sets truncated=true)
schemaVersion        : "0.1"   briefVersion: "0.1"   responseVersion: "0.1"
Derived edge id      : `lk:${fromNode}->${toNode}`  (deterministic → idempotent reconcile)
Agent-minted id prefix: "ag-"  (nodes/edges/comments the agent creates)
```

### API / Interface Contracts

All routes resolve the requested path against `FLOWCANVAS_ROOT` (defaults to `process.cwd()`) and reject anything outside it (`guardPath`).

```text
GET  /api/canvas?path={canvasPath}
  → 200 { doc: FlowcanvasDoc }
  → 400  path outside root, or not *.canvas / *.json
  → 404  file not found

POST /api/canvas
  body: { path: string, doc: FlowcanvasDoc }
  → 200 { ok: true, revision: number }      // revision echoed after bump
  → 400  validation failure / outside root / shape invalid

POST /api/canvas/resolve
  body: { paths: string[] }
  → 200 { resolved: Array<{
            path: string; exists: boolean;
            frontmatter?: Record<string, unknown>;   // markdown only
            body?: string; truncated?: boolean;       // markdown only, body capped at BODY_CAP
            error?: string }> }
  // batch route — per-item errors (outside root, not found) surface as
  // { exists:false, error } inside the 200 body; one bad path never aborts the batch

GET  /api/asset?path={imagePath}
  → 200  <image bytes>  Content-Type per extension
  → 400  outside root, or extension not in IMAGE_EXT
  → 404  not found

POST /api/file
  body: { path: string, content: string }   // used to write agent-generated markdown
  → 200 { ok: true }
  → 400  outside root, or not *.md

GET  /api/files?path={dirPath}
  → 200 { entries: Array<{ name: string; path: string; type: 'file' | 'directory'; ext?: string }> }
  → 400  outside root

POST /api/upload                              // drag-drop upload (UI design scope addition)
  body: multipart/form-data { file: <bytes>, dir?: string }   // dir defaults to "assets/"
  → 200 { path: string }                      // relative path of the written file (→ image/markdown node)
  → 400  outside root, or extension not in IMAGE_EXT ∪ MARKDOWN_EXT
  → 413  file exceeds UPLOAD_MAX (e.g. 10 MB)
```

Library entry points. `lib/canvas/brief.ts`:

```typescript
/** Build the self-contained brief from the live doc + resolved markdown content. */
export function buildBrief(
  doc: FlowcanvasDoc,
  canvasRef: string,
  resolved: Map<string, { frontmatter?: Record<string, unknown>; body?: string; truncated?: boolean }>,
  briefId: string,                 // caller mints (uuid)
  generatedAt: string,             // caller stamps (ISO)
): DesignBrief

/** Pure merge: apply an AgentResponse onto a doc, returning the next doc + a report. */
export function applyResponse(
  prev: FlowcanvasDoc,
  resp: AgentResponse,
  mintId: (prefix: string) => string,   // caller supplies id factory (uuid-based)
  now: string,                          // caller stamps
): { next: FlowcanvasDoc; report: MergeReport }

export interface MergeReport {
  stale: boolean                  // resp.briefId !== prev.flowcanvas.session.lastBriefId
  generatedFiles: string[]        // paths the caller must POST to /api/file
  created: { nodes: number; edges: number; comments: number }
  updated: { nodes: number; edges: number }
  removed: { nodes: number; edges: number }
  conflicts: string[]             // node ids edited locally since baseRevision (last-writer-wins)
}
```

The **8-step idempotent merge** performed by `applyResponse` (+ the caller's file writes):

1. **Concurrency guard.** If `resp.briefId !== session.lastBriefId`, set `report.stale = true` (warn; still apply). Record any node the response upserts that was locally changed since `baseRevision` into `report.conflicts` — v0.1 is last-writer-wins.
2. **Generated files first.** Return `generatedFiles[].path` in the report; the caller `POST`s each to `/api/file` **before** rendering, so any new `file` node's path resolves to real content.
3. **Upsert nodes.** Key by `id`. Existing id → shallow-merge `x,y,width,height,color,file/url/text` and set `meta.origin='agent'`. Missing/`ag-*` id → create (mint `ag-<short>` if absent).
4. **Re-resolve + re-derive.** Caller re-resolves new/changed markdown nodes into `meta.frontmatter`; then `deriveLinkEdges` + `reconcileEdges` run.
5. **Upsert edges.** Key by `id`; agent edges get `meta.origin='agent'`. Skip an agent edge that duplicates a directed pair already covered by a derived/user edge.
6. **Apply comments.** Replies (`parentId` set) attach to the named thread; new annotations (`parentId:null`) get a fresh root `badge`. Dedup by `id`.
7. **Removals.** Apply `removeNodeIds`/`removeEdgeIds` last; never auto-remove `origin:'user'` items unless explicitly listed.
8. **Bump & persist.** `session.revision++`, `session.updatedAt = now`; caller persists via `POST /api/canvas`.

Idempotency holds because every op is keyed by id (upsert), file writes are overwrites, and agent-minted ids are stable within a response — applying the same `AgentResponse` twice yields the same doc.

### The Agent Contract

Shipped inline as `DesignBrief.responseContract` and as `docs/flowcanvas-agent-contract.md`. The agent MUST:

- Return **exactly one** JSON object matching `AgentResponse` — no prose, no code fence, outside it.
- Echo `briefId` from the brief.
- Mint new ids with the `ag-` prefix; reuse a brief id to **update** that item.
- To add a markdown file: emit it in `generatedFiles` (full content **including** YAML frontmatter) **and** a matching `upsertNodes` entry with `type:"file"`, `file:"<same path>"`.
- Reply to a comment by setting `parentId` to that comment's `id` from the brief and copying its `anchor`.
- Express structural relationships as frontmatter `links:` (which auto-derive edges) rather than manual edges where possible; never reference a `links:` target that is neither an existing node nor a file you also generate.
- Keep coordinates on a 20px grid and place new nodes in empty regions (the brief's positions reveal the occupied layout).

### Sequence / Flow Diagrams

Load → resolve → derive → render:

```mermaid
sequenceDiagram
  participant U as User
  participant St as useCanvasStore
  participant API as /api/canvas (+resolve)
  participant FS as fs (FLOWCANVAS_ROOT)

  U->>St: open ?path=board.canvas
  St->>API: GET /api/canvas?path
  API->>FS: read board.canvas
  FS-->>St: FlowcanvasDoc
  St->>API: POST /api/canvas/resolve { md/image paths }
  API->>FS: read + gray-matter parse each
  FS-->>St: [{ path, frontmatter, body, truncated }]
  St->>St: hydrate meta.frontmatter; deriveLinkEdges + reconcile; toReactFlow()
  St-->>U: board renders (cards, images, edges, pins)
```

Agent round-trip:

```mermaid
sequenceDiagram
  participant U as User
  participant St as useCanvasStore
  participant Ag as Agent (external)
  participant API as /api/file + /api/canvas

  U->>St: Submit
  St->>St: buildBrief(doc, resolved) → DesignBrief
  St-->>U: brief JSON (copy / download)
  U->>Ag: paste brief
  Ag-->>U: AgentResponse JSON
  U->>St: Import (paste / upload)
  St->>St: applyResponse(doc, resp) → { next, report }
  St->>API: POST /api/file (each generatedFiles)  [before render]
  St->>St: re-resolve + re-derive edges; merge nodes/edges/comments
  St->>API: POST /api/canvas (persist, revision++)
  St-->>U: merged board re-renders
```

### Module Boundaries

| Module | Responsibility | Path |
|--------|---------------|------|
| Schema | Extended-JSONCanvas types + `nodeKind` | `lib/canvas/jsoncanvas.ts` |
| Adapter | `FlowcanvasDoc` ↔ React Flow `{nodes,edges}` | `lib/canvas/adapter.ts` |
| Brief/Merge | `buildBrief`, `applyResponse` (8-step) | `lib/canvas/brief.ts` |
| Edges | `deriveLinkEdges`, `reconcileEdges` | `lib/canvas/edges.ts` |
| Frontmatter | `gray-matter` parse/stringify wrapper | `lib/canvas/frontmatter.ts` |
| Store | Zustand: nodes, edges, comments, session, selection, dirty | `lib/canvas/store.ts` |
| Canvas shell | React Flow provider, background, controls, minimap | `components/canvas/canvas-shell.tsx` |
| Node components | markdown / image / link / note cards | `components/canvas/nodes/*` |
| Edge component | labeled edge styled by origin | `components/canvas/edges/labeled-edge.tsx` |
| Comments | pin overlay + flat thread | `components/canvas/comment-{layer,thread}.tsx` |
| Export/Import | brief build + response apply UI | `components/canvas/export-panel.tsx` |
| Reader | full-shiki read-only drawer | `components/canvas/reader-drawer.tsx` + `components/markdown-renderer.tsx` |
| API | guarded fs routes | `app/api/{canvas,canvas/resolve,asset,file,files}/route.ts` |
| FS guard | path-traversal guard | `lib/fs-guard.ts` |

---

## Design System

A glassmorphic, futuristic-neon canvas — the **nyx** language (`references/DESIGN.md`, approved via `001-initial-architecture-ui-design.md`). Translucent obsidian/indigo glass panels over a deep void; depth from `backdrop-filter` blur (not drop shadows); a 1px white→indigo gradient edge defines surfaces; hover raises a border glow. Electric-indigo/violet accents with a sparing cyan/lime/rose neon spectrum. Fonts are **Geist** (UI) + **JetBrains Mono** (frontmatter keys, edge labels, code, metadata) — both local, zero remote fetch. The complete token system + component specs are the ground truth in `.flowcode/ui/ui-design-system.md`; the approved board is `mockups/04-nyx-neon.html`.

`app/globals.css` (Tailwind v4 `@theme`) — the nyx tokens:

```css
@import "tailwindcss";

@theme {
  --color-bg:               #0b1326;   /* canvas void (radial indigo/violet wash) */
  --color-grid:             rgba(146,143,160,.16);
  --color-surface-lowest:   #060e20;
  --color-surface-low:      #131b2e;
  --color-surface:          #171f33;   /* card fill base (used ~55% with blur) */
  --color-surface-high:     #222a3d;
  --color-surface-highest:  #2d3449;
  --color-primary:          #c0c1ff;   /* electric indigo — selection/focus/agent/primary */
  --color-primary-cont:     #8083ff;
  --color-secondary:        #ddb7ff;   /* vivid violet — tags/metadata */
  --color-secondary-cont:   #6f00be;
  --color-tertiary-cont:    #ff516a;   /* rose — comments/destructive */
  --color-text-primary:     #dae2fd;
  --color-text-secondary:   #c7c4d7;
  --color-outline:          #908fa0;   /* default edge / muted lines */
  --color-outline-variant:  #464554;   /* hairline glass border */
  --color-neon-cyan:        #5ef2ff;
  --color-neon-lime:        #b6f36a;
  --color-neon-rose:        #ff8fb0;
  --color-status-amber:     #f59f00;   /* dirty / warning */
  --font-jetbrains-mono:    'JetBrains Mono', ui-monospace, monospace;
  --radius-card: 16px;
  --radius-control: 8px;
}

/* glass recipe + React Flow var mapping */
.glass { background-image: linear-gradient(rgba(23,31,51,.55), rgba(23,31,51,.55)),
  linear-gradient(135deg, rgba(192,193,255,.45), rgba(255,255,255,.04) 45%, rgba(128,131,255,.30));
  background-origin: border-box; background-clip: padding-box, border-box; border: 1px solid transparent;
  backdrop-filter: blur(16px); }
.react-flow { --xy-background-color: var(--color-bg); }
.react-flow__edge-path { stroke: var(--color-outline); stroke-width: 1.5; }
.react-flow__node.selected { box-shadow: 0 0 0 2px var(--color-primary), 0 0 26px -4px rgba(192,193,255,.6); }
```

Principles (nyx — `references/DESIGN.md`):
- **Glass, not solid** — translucent panels (`blur 16–40px`) + 1px gradient edge; depth from blur. Dot grid over the void (`gap 22px`, `--color-grid`).
- **Glow, not shadow** — hover/selection raise an indigo border glow; drop shadows only on elevated drawers/menus.
- **Type discipline** — Geist (UI) + JetBrains Mono (keys/code/metadata); reader body 16/1.66; mono `label-caps` 11px uppercase 0.1em.
- **Edges** — 1.5–2px bezier; `links` muted+dashed with a lock glyph, `user` solid indigo, `agent` neon (cyan→violet) glow.
- **Markdown renders** — node bodies and the reader render GFM (headings/lists/blockquote/inline-code) in nyx; never show raw `##`/`*`. The reader experience must be flawless.
- **Neon with intent** — cyan/lime/rose for syntax + active states; never flat decoration (accent discipline: `ui-design-system §0 rule 10`).
- **Transitions** — specific properties only (`box-shadow`/`border-color`/`transform`/`opacity`); never `all`. Drawers 200–220ms; honor reduced-motion.

---

## Constraints & Risks

| Constraint / Risk | Impact | Mitigation |
|-------------------|--------|-----------|
| React Flow has no SSR | Canvas can't server-render | `dynamic(() => import('./canvas-shell'), { ssr:false })` |
| Per-node shiki is heavy | Jank on large boards | Node bodies use lightweight client renderer; shiki only in reader drawer (Decision 4) |
| Obsidian/foreign tools drop unknown keys | `flowcanvas` block + `meta` lost on a foreign rewrite | Everything there is re-derivable or non-fatal; Flowcanvas is the source of truth (Obsidian = view) |
| Frontmatter cache staleness | `meta.frontmatter` diverges from disk | Re-resolve on every load + after writes; disk is source of truth |
| `/api/asset` = arbitrary fs read | Security hole | `guardPath` + `IMAGE_EXT` allowlist; reject everything else with 400 |
| `links:` resolution assumes root = project root | `.flowcode/...` / repo-relative links won't resolve from a sub-dir | `FLOWCANVAS_ROOT` defaults to `process.cwd()`; normalize both sides to root-relative POSIX |
| Human + agent edit the same node | Lost edit | Optimistic concurrency via `briefId`/`revision`; last-writer-wins + a named-node toast |
| Large boards (100s of nodes) | Render perf | React Flow defaults + collapsed bodies in v0.1; virtualization deferred |

## Research References

| Topic | Source | Key Finding |
|-------|--------|-------------|
| JSONCanvas 1.0 schema | https://jsoncanvas.org/spec/1.0/ | `{nodes,edges}`; node types text/file/link/group; edge `label`/`fromSide`/`toSide`; color = hex or "1".."6" |
| React Flow | https://reactflow.dev/ | MIT; custom nodes are React components; `<Background>`/`<MiniMap>`/`<Controls>`; `{nodes,edges,viewport}` JSON |
| tldraw license | https://tldraw.dev/community/license | Proprietary; paid production license / watermark on free tier — rejected |
| Excalidraw / Konva | https://github.com/excalidraw/excalidraw · https://konvajs.org/ | HTML5-canvas-rendered — cannot host DOM markdown — rejected |
| react-markdown | https://github.com/remarkjs/react-markdown | Outputs React elements (no `dangerouslySetInnerHTML`); pair with `remark-gfm` |
| gray-matter | https://github.com/jonschlinkert/gray-matter | `matter(raw) → { data, content }`; works in Vite/Next bundlers |
| Comment model | https://developers.figma.com/docs/rest-api/comments-types/ | Dual anchor (vector vs frame-offset); flat threads via `parent_id`; numbered badges on roots |
| Design language | https://vercel.com/design.md · https://linear.app/now/how-we-redesigned-the-linear-ui | Geist scale; muted text; borders over shadows on dark; one accent |

## Open Questions

- [ ] **Canvas file location convention** — `.canvas` files at `<root>/`, a dedicated `<root>/canvas/`, or beside each plan? (Recommend `<root>/canvas/`.)
- [ ] **Persist derived edges?** Write `origin:'links'` edges into the file (self-contained, Obsidian shows them) or compute in-memory each load? (Recommend persist — deterministic ids make reconcile cheap.)
- [ ] **Single file vs sidecar** — keep comments/session in the `.canvas` `flowcanvas` block (simpler) or split a `*.flow.json` sidecar for perfect Obsidian compatibility? (Recommend single file.)
- [ ] **Who writes generated files** — tool applies `generatedFiles` on import (human-in-loop, recommended) or the agent writes via its own fs/MCP and the tool only re-reads?
- [ ] **Brief/response transport** — manual download + paste/upload for v0.1 (recommended), or a wired `POST /api/agent` endpoint later?

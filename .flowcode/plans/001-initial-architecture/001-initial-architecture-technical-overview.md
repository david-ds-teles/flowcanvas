---
name: 001-initial-architecture-technical-overview
description: Authoritative post-execution overview of 001-initial-architecture (Flowcanvas v0.1) — 10 delivered phases — what was built, deviations, and integration points, verified against the code.
status: complete
tags: [technical-overview, post-execution, authoritative]
links: [.flowcode/plans/001-initial-architecture/001-initial-architecture-plan.md, .flowcode/plans/001-initial-architecture/001-initial-architecture-changelog.md, .flowcode/plans/001-initial-architecture/001-initial-architecture-test-notes.md]
---

# Technical Overview — 001-initial-architecture Flowcanvas v0.1

- A standalone Next.js 16 canvas that renders flowcode markdown files as spatial nodes, connects them with `links:`-derived + manual edges, pins comment threads, and round-trips the whole board to/from an AI agent as one JSON — persisted to a `.canvas` file.
- Status complete; v0.1 dated 2026-06-26; Phases 8–10 folded 2026-06-27; Phase 10 (canvas mechanics & file I/O) executed after an operator-directed reopen. The linking / source-of-truth + agent-collaboration evolution continues in plan `002-system-design-studio`.
- Role: authoritative source for `001-initial-architecture-changelog.md` and `001-initial-architecture-test-notes.md`.
- Source plan: `001-initial-architecture-plan.md` (10 phases delivered).

> **Audit note:** the Post-Execution `flowcode:code-explorer-agent` (and the plan-completion `flowcode:code-reviewer-agent`) were dispatched in parallel but both **stalled on the background-agent stream watchdog** (600 s no-progress — infrastructure, not a task failure). Per `plan-instructions.md § Post-Execution Pipeline`, the main agent performed the code audit + final review inline. Every `path:line`-level claim below was read from the committed source.

---

## Summary

**What:** Flowcanvas v0.1 — an extended-JSONCanvas board (React Flow) over flowcode markdown. Markdown files render as frontmatter-table + collapsible-body cards; images, links, and notes render inline; edges derive from `links:` frontmatter or are drawn by hand; comments pin to a node or a canvas point; and a bidirectional `DesignBrief` ⇄ `AgentResponse` JSON loop lets an AI agent read and rewrite the board, with an idempotent merge.

**Why:** Design systems are authored as many related markdown files, but a flat file tree hides their relationships and gives an AI agent no spatial, relational context. Flowcanvas turns the files into a navigable board and a single self-contained JSON an agent can reason over and edit.

**Risks:** (1) `/api/asset` + the fs routes expose arbitrary in-root reads/writes — mitigated by the lexical `guardPath` (root-confinement) + extension allowlists, but `guardPath` does **not** dereference symlinks. (2) Optimistic concurrency is last-writer-wins (`MergeReport.conflicts` is always `[]` in v0.1 — no per-node revision tracking). (3) Large boards (100s of nodes) rely on React Flow defaults + collapsed bodies; virtualization is deferred. (4) Persistence of in-session edits (collapse, manual edges, comments, agent merges) rides the Save trigger — there is no autosave.

**Tech-Debt:** `revision` double-bumps per import (pure merge +1, then the server POST +1) — harmless but inconsistent; the `AGENT_CONTRACT` string and `docs/flowcanvas-agent-contract.md` must be kept in sync by hand; reader-embedded relative images are not rewritten to `/api/asset` (reader is text/code-focused). Phase 8: `matter.stringify` re-emits frontmatter via js-yaml on `links:` write-back — scalars may be re-quoted; body bytes preserved (accepted for v0.1). Phase-9 test gap: no vitest coverage for the toolbar flyout state machine (`canvas-toolbar.tsx`) or `<FrontmatterView>` (`frontmatter-view.tsx`) — verified by CDP visual-parity only (7/7 captures, `mockups/captures/phase-9/`); a known gap for follow-up.

**Next:** autosave / explicit dirty-flush UX; per-node revision tracking to populate `conflicts`; symlink-aware path guard; reader image-src rewriting; de-duplicate `revision` double-bump; keep `AGENT_CONTRACT` + `docs/flowcanvas-agent-contract.md` in sync; add vitest coverage for the toolbar flyout state machine + `<FrontmatterView>` + the BoardDialog; replace the `reorganize` `setTimeout(80)` fitView heuristic with a render-synced trigger; remove the now-dead `store.setNodePosition`.

---

## What Was Built

A greenfield Next.js 16 / React 19 / Tailwind v4 app, dark-only, on the **nyx** glassmorphic design language. The canvas is a client-only React Flow surface (`dynamic(ssr:false)`) wrapped in an error boundary. A typed extended-JSONCanvas schema (`lib/canvas/jsoncanvas.ts`) is the data spine — extended in Phase 9 with `NodeShape = 'rectangle' | 'ellipse' | 'diamond'` (`jsoncanvas.ts:11`) and a `shape?: NodeShape` fourth field on `NodeMeta` (`jsoncanvas.ts:19`) for the group-node shape system. A bidirectional adapter (`lib/canvas/adapter.ts`) maps `FlowcanvasDoc` ⇄ React Flow `{nodes, edges}`. A zustand store (`lib/canvas/store.ts`) holds the doc, a transient resolved-body cache, the interaction `mode`, and every mutation, and orchestrates load / save / edge-derivation / comment ops / the agent round-trip. Eight guarded Node-runtime route handlers (`app/api/*`) wrap `fs` behind a single lexical path guard (`lib/fs-guard.ts`): read/write the `.canvas` doc, batch-resolve markdown frontmatter+body, stream images, write agent-generated markdown, list directories, multipart-upload, server-render markdown to shiki HTML, and patch `links:` frontmatter write-back (Phase 8).

On top sit the visual layers: five `memo`'d node components (markdown / image / link / note / group-as-shape), an origin-styled labeled edge with an in-canvas label editor, a comment pin overlay + flat-thread popover projected from live node geometry, and — added in Phase 7 — the full chrome: a top glass toolbar, a drag-drop dropzone, a full-fidelity shiki reader drawer, and the agent export/import panel. Phase 8 extracted RF controlled state and all interaction callbacks into `useCanvasHandlers` (`components/canvas/use-canvas-handlers.ts`), moved the CSS to six partials under `app/styles/`, switched edges to smoothstep (`getSmoothStepPath(borderRadius:8)`) + `connectionLineType=SmoothStep`, extended the reader to three sizes (drawer 440 px / half 50 vw / full 100 vw), and added bidirectional `links:` write-back via the eighth route (`/api/canvas/links`) with durable keyboard-delete via `removeEdgeWriteback`.

Phase 9 (UX/UI redesign) + a post-Phase-9 bugfix pass delivered: (a) a shared `<FrontmatterView variant="card"|"reader">` component (`components/canvas/frontmatter-view.tsx`) extracted from `markdown-node.tsx` and consumed by both the card and the reader bar; (b) a toolbar single-rail redesign — direct icon insert buttons, Shape flyout, `[File ▾]` menu collapsing Upload/Import/Export, three disabled Phase-10 scaffold buttons, and `+ Add ▾` as a narrow-screen (<1024 px) fallback only; (c) a reader readability overhaul (opaque scroll, 17 px/1.72 line-height/≤66ch centered, sans headings, inline-code scoped off `<pre>`); (d) `Load .json…` file-input on the Import tab + DesignBrief-vs-AgentResponse detection; (e) `GroupNode` promoted from `FallbackNode` delegation to a real shape node (SVG `ShapeOutline`, `NodeResizer`, shape-switcher bar, in-place label editor); (f) `NoteNode` double-click → inline `<textarea>` edit via `setNodeText`; (g) a seventh CSS partial `app/styles/frontmatter.css`; and the post-Phase-9 bugfix: selection ring conformed to rounded cards (`globals.css:69-74`), shape/group nodes opt out (`nodes.css:343`), and the group outline promoted to dashed-bright-indigo (`strokeDasharray:'7 5'`, `stroke:var(--color-primary)`, 8% fill).

The defining capability is the **agent round-trip** (`lib/canvas/brief.ts`): `buildBrief` packages the live board into a fat, self-contained `DesignBrief` (each markdown node's parsed frontmatter+body embedded, edges with provenance, comment threads by id, the human's `intent`); the agent replies with an `AgentResponse`; `applyResponse` runs an 8-step, **idempotent**, id-keyed merge that writes generated files, upserts nodes/edges, attaches replies, re-derives `links:` edges, and persists — so re-importing the same response is a no-op.

---

## Implementation Details

### Schema + adapter (data spine)

**File(s):** `lib/canvas/jsoncanvas.ts`, `lib/canvas/adapter.ts`
**What it does:** `jsoncanvas.ts` defines the discriminated `CanvasNode` union (`file`/`link`/`text`/`group`), `CanvasEdge`, `Comment`/`CommentAnchor`, `SessionMeta`, `FlowcanvasDoc`, plus the `nodeKind` discriminator (extension → `markdown`/`image`/`file`) and `isFileNode` guard. Phase 9 added `NodeShape = 'rectangle' | 'ellipse' | 'diamond'` (`jsoncanvas.ts:11`) and a fourth field `shape?: NodeShape` on `NodeMeta` (`jsoncanvas.ts:19`) for the group-node shape system. `adapter.ts` `toReactFlow`/`toJSONCanvas` convert both ways, preserving `meta`/`color`/`fromEnd`/`toEnd` that RF state doesn't model; `group` nodes get `zIndex:0` (painted behind content nodes) so a shape can frame others.
**Key decisions:** markdown nodes are content-sized (`height: undefined` + a `--fc-body-max` clamp) so the collapse toggle visibly shrinks the card; preset colors `"1".."6"` map to nyx hexes via `colorVar`.

### Persistence + resolve (guarded fs)

**File(s):** `lib/fs-guard.ts`, `lib/canvas/frontmatter.ts`, `app/api/{canvas,canvas/resolve,asset,file,files,upload,render,canvas/links}/route.ts`, `lib/api.ts`
**What it does:** `guardPath` resolves a path against `FLOWCANVAS_ROOT` (default `cwd`) and throws `GuardError` on escape. Each route maps `GuardError`→400, `ENOENT`→404, else→500; the batch `resolve` route surfaces per-item errors inside its 200 body. `lib/api.ts` is the typed client (`getCanvas`/`saveCanvas`/`resolvePaths`/`writeFileApi`/`listDir`/`uploadFile`/`assetUrl`/`patchLinks`). Phase 8 added `frontmatter.stringifyFile(path, newFrontmatter)` (gray-matter read + `matter.stringify` body-preserving rewrite — `lib/canvas/frontmatter.ts`) and `POST /api/canvas/links` (guarded `{path, op:'add'|'remove', link}` → patches `links:` field — `app/api/canvas/links/route.ts`).
**Key decisions:** lexical guard only (no symlink dereference — documented risk); markdown bodies capped at `BODY_CAP` (40 000) with a `truncated` flag; the `canvas` POST bumps `session.revision` server-side and echoes it.

### Store (zustand orchestrator)

**File(s):** `lib/canvas/store.ts`
**What it does:** holds `doc`, transient `bodies`, `dirty`, `mode: CanvasMode`, `editingEdgeId`, `readerNodeId`, `readerSize: ReaderSize` (default `'drawer'`). Actions: `load` (fetch → `hydrateFiles` → reconcile edges), `save`, `toggleCollapsed`, `onConnect`/`relabelEdge`/`setNodePosition`/`setEditingEdge`, `setMode`, `addNode`/`addFileNode`, `addComment`/`replyComment`/`resolveComment`, `setReaderSize`/`maximizeReader`/`openReader`/`closeReader`, `removeEdgeWriteback` (removes edge from `doc.edges` + calls `patchLinks(remove)` for file↔file pairs). Phase 9 added four mutation actions (`lib/canvas/store.ts:32-35`): `setNodeSize(id, width, height)` (persist a group resize from `NodeResizer`), `setNodeText(id, text)` (in-place `TextNode.text` edit — `NoteNode` double-click path), `setNodeLabel(id, label)` (in-place `GroupNode.label` edit), `setNodeShape(id, shape)` (toggle `NodeShape` via the shape-switcher bar). A shared `hydrateFiles(nodes, bodies)` helper resolves markdown frontmatter into `meta` + the bodies cache and is reused by `load`, `addFileNode`, and `applyResponse`.
**Key decisions:** Phase 6's `commentMode: boolean` was unified into a single `mode` primitive (`select`/`connect`/`comment`) — one field, not parallel surfaces. Every update is immutable (no in-place mutation). `lib/canvas/*` stays DOM-free (the UI passes labels/URLs in).

### Agent round-trip (the point of the tool)

**File(s):** `lib/canvas/brief.ts`, `lib/canvas/store.ts` (orchestration wrapper), `docs/flowcanvas-agent-contract.md`
**What it does:** pure `buildBrief(doc, canvasRef, resolved, briefId, generatedAt)` → `DesignBrief`; pure `applyResponse(prev, resp, mintId, now)` → `{ next, report }` implementing the 8-step merge. The store wraps the pure merge with the impure tail: write `generatedFiles` to `/api/file` **before** render, re-`hydrateFiles`, re-`reconcileEdges(deriveLinkEdges)`, persist via `save()`.
**Key decisions (idempotency, hardened beyond the design snippet):** nodes/edges key by id; **comments dedup by `id` else by a `(parentId,author,text)` content signature**; **id-less agent edges that duplicate a directed pair already on the board are skipped** (design step 5). Result: a re-imported response — even with id-less replies/edges — is a true no-op. `conflicts` is `[]` (no per-node revision tracking in v0.1).

```typescript
// applyResponse step 6 — content-signature dedup makes id-less agent replies idempotent
const seenSigs = new Set(comments.map((c) => sigOf(c.parentId, c.author, c.text)))
for (const ac of resp.comments ?? []) {
  if (ac.id && comments.some((c) => c.id === ac.id)) continue
  const sig = sigOf(ac.parentId, ac.author, ac.text)
  if (seenSigs.has(sig)) continue
  // …push, seenSigs.add(sig)
}
```

### Edges + comments

**File(s):** `lib/canvas/edges.ts`, `lib/canvas/comments.ts`, `components/canvas/edges/labeled-edge.tsx`, `components/canvas/comment-{layer,thread}.tsx`
**What it does:** `deriveLinkEdges` mints deterministic `lk:` edges from `links:` frontmatter; `reconcileEdges` keeps user/agent edges, drops stale derived ones, and suppresses derived dupes of a manual pair. `comments.ts` is pure anchor math (hit-test → node/canvas anchor; project back to a flow point). `labeled-edge.tsx` renders via `getSmoothStepPath(borderRadius:8)` (Phase 8 — was `getBezierPath`); styles by origin (`links` dashed+🔒, `user` indigo, `agent` cyan) and hosts the in-canvas label editor (replaced `window.prompt`). The comment layer projects pins from live measured RF geometry so they track drag/pan/zoom.

### Frontmatter view (Phase 9)

**File(s):** `components/canvas/frontmatter-view.tsx`, `app/styles/frontmatter.css`
**What it does:** shared `<FrontmatterView frontmatter variant="card"|"reader">` component; extracted from `markdown-node.tsx` so the card and reader bar stay pixel-identical. Renders: semantic status pill (`fc-pill--ok`/`fc-pill--act`/`fc-pill--warn`) via exported `statusClass` (`frontmatter-view.tsx:19`); violet `fc-tag` chips for `tags:`; `↗ fc-link-chip` chips for `links:` (filename via exported `basename`, `frontmatter-view.tsx:16`); muted mono `fc-fm__kv` grid for all other fields. Returns `null` when all fields are empty (`frontmatter-view.tsx:62`). Boolean-status values fall through to the kv grid (never silently dropped — `frontmatter-view.tsx:65,70`). `FmValue`/`PRIORITY`/`SKIP`/`MAX_CHIPS` are **module-private** (not exported — internal rendering helpers only). `app/styles/frontmatter.css` provides CSS for both variants: `fc-fm--card` (bordered, compact) and `fc-fm--reader` (sticky bar). Consumed by: `markdown-node.tsx:48` (card variant) and `reader-drawer.tsx:84` (reader variant, renders as a sticky bar above the prose).
**Key decisions:** extracting to a shared component prevents the card and reader bar from diverging across future phases; module-private helpers avoid polluting the public import surface.

### Group / shape node (Phase 9)

**File(s):** `components/canvas/nodes/group-node.tsx`, `app/styles/nodes.css` (group rules `nodes.css:329-426`)
**What it does:** `GroupNode` is a real shape node — not a catch-all `FallbackNode` delegation. `ShapeOutline` (`group-node.tsx:18-40`) renders an SVG stretched to the node box (`preserveAspectRatio:none`) with the selected shape: `<ellipse>`, `<polygon>` (diamond `points="50,1 99,50 50,99 1,50"`), or `<rect rx="6">` (rectangle). Only the painted SVG geometry captures pointer events (`nodes.css:336,340`); `.fc-group` itself is `pointer-events:none` so corner clicks pass through to nodes behind the shape. When selected: `NodeResizer` handles appear (calls `setNodeSize` on `onResizeEnd`), a three-button shape-switcher bar renders (calls `setNodeShape`), and the outline strokes to a solid glowing ring (`strokeDasharray:undefined`, `filter:drop-shadow`). At rest: the outline is **dashed bright-indigo** (`strokeDasharray:'7 5'`, `stroke:var(--color-primary)`, 8% fill, `strokeWidth:1.75` — `group-node.tsx:25-26`). Double-click on the label opens an `<input>` inline editor (calls `setNodeLabel` on blur/Enter, cancels on Esc). RF's rectangular `.selected` glow is suppressed for group nodes (`nodes.css:343`: `.react-flow__node.selected:has(.fc-group) { box-shadow:none !important }`).
**Key decisions:** post-Phase-9 bugfix promoted the rest-state stroke to `--color-primary` (was `--color-primary-cont`, which was too dim against the canvas void); the `7 5` dash rhythm is the same as the `links` edge, making dashed lines a consistent "structural reference" visual vocabulary.

### Note node — inline editing (Phase 9)

**File(s):** `components/canvas/nodes/note-node.tsx`
**What it does:** double-clicking the note body flips the node into edit mode — the `CanvasMarkdown` renderer is replaced by a `<textarea class="fc-note__edit">` with the raw markdown text. `⌘/Ctrl+Enter` or blur commits via `setNodeText(id, draft)` (immutable store action); `Esc` cancels and restores the prior text (`note-node.tsx:23-24`). The textarea is `nodrag nopan` and stops pointer propagation so RF drag events don't fire during editing.
**Key decisions:** the commit calls `setNodeText` → store sets `doc.nodes` immutably → React re-renders with the new `text`; no server round-trip (in-memory until the next `save()`).

### Toolbar — single-rail redesign (Phase 9)

**File(s):** `components/canvas/canvas-toolbar.tsx`, `app/styles/toolbar.css`
**What it does:** rebuilt as a single glass rail. Primary UX: direct icon insert buttons (`toolbar-add-{note,markdown,image,link,shape}`) split by `.fc-toolbar__divider`; Shape → 3-item flyout (rectangle/ellipse/diamond); Upload/Import/Export collapsed under a `[File ▾]` button (`toolbar-file-menu`); three **disabled** Phase-10 scaffold buttons (group/ungroup/reorganize, `aria-disabled=true`). All insert popovers share one `open` flyout state machine (`useState<string|null>`) anchored on the `.fc-toolbar__flyhost` container — Esc + outside-mousedown close. Below 1024 px the old `+ Add ▾` fallback popover (`toolbar-add-node`) reappears for narrow screens.
**Key decisions:** collapsing Upload/Import/Export under `[File ▾]` reduces primary-rail density; the Group/Ungroup/Re-organize buttons (shipped disabled in Phase 9) were wired live in Phase 10, and `[File ▾]` gained Open board… / Save as….

### Export / Import panel (Phase 9)

**File(s):** `components/canvas/export-panel.tsx`
**What it does:** Import tab gained `Load .json…` button (`export-panel.tsx:137`): a hidden `<input type="file" accept="application/json,.json">` reads the chosen file via `f.text()` and calls `setPaste(text)` — the paste/Apply/validate/stale flow is unchanged (`export-panel.tsx:32-34`). The Apply guard also detects a pasted `DesignBrief` (has `briefVersion` and lacks `responseVersion`, `export-panel.tsx:87`) and surfaces an explanatory message instead of a false-positive validation error, preventing the most common user mistake (pasting the brief you just exported instead of the agent's reply).
**Key decisions:** file-input approach keeps the import flow a single button click; brief-detection avoids a confusing silent error on the most predictable mistake.

### Reader pipeline + chrome (Phases 7–9)

**File(s):** `lib/render-md.ts`, `app/api/render/route.ts`, `components/canvas/{reader-drawer,canvas-toolbar,export-panel,file-picker,dropzone}.tsx`, `components/canvas/use-canvas-handlers.ts` (Phase 8), `app/page.tsx`, `app/globals.css`, `app/styles/{nodes,frontmatter,edges,controls,reader,comments,toolbar}.css`
**What it does:** `render-md.ts` is a server `unified` pipeline (`remark-parse → remark-gfm → remark-rehype → rehype-sanitize → @shikijs/rehype → rehype-stringify`) behind `GET /api/render`. Phase 9 overhauled the reader: `<FrontmatterView variant="reader">` renders as a sticky bar above the prose (`reader-drawer.tsx:84`); the scroll area uses an opaque `--color-surface-lowest` background (`app/styles/reader.css`); prose is 17 px / 1.72 line-height / `≤66ch` centered / `--color-text-primary`; headings use calmer sans weight (h1 26 px / h2 21 px / h3 violet accent); inline-code is scoped off `<pre>` (`:not(pre) > code`) so shiki token spans inside fenced code blocks are unaffected.
**Key decisions:** shiki runs **after** sanitize on an already-clean hast tree, so its inline-styled spans (trusted highlighter output) survive; `@shikijs/rehype` (WASM) replaced the design's native `rehype-shiki` (oniguruma fails to build on Node 26 — decided Phase 1).

### CSS architecture (Phases 8–9)

**File(s):** `app/globals.css`, `app/styles/{nodes,frontmatter,edges,controls,reader,comments,toolbar}.css`
**What it does:** `app/globals.css` now contains only base/theme (`@theme` nyx token block) / glass recipe / RF CSS-var overrides / selection-ring rules / `.fc-empty` and `.fc-void` utilities, and seven `@import` statements (`globals.css:7-13`). Phase 8 extracted six partials from `globals.css` (move-only, zero selector changes). Phase 9 added `app/styles/frontmatter.css` as the seventh partial (`globals.css:8`, inserted after `nodes.css`) — carries `fc-fm`, `fc-fm--card`, `fc-fm--reader`, `fc-pill`, `fc-tag`, `fc-link-chip`, `fc-fm__kv` rules. Import order: nodes → frontmatter → edges → controls → reader → comments → toolbar; `@import` statements are placed before `@theme` for CSS spec validity.
**Key decisions:** split is move-only for the six Phase-8 partials (gate-verified); `frontmatter.css` is additive (new selectors only, no removals from `nodes.css`); `controls.css` selectors are prefixed `.react-flow ` to outrank `@xyflow/react/dist/style.css`'s bundled rules.

### Selection ring (post-Phase-9 bugfix)

**File(s):** `app/globals.css:69-74`, `app/styles/nodes.css:343`
**What it does:** the selection ring was reworked to conform to the 16 px card corners instead of fencing a gap around the square RF node wrapper. `.react-flow__node.selected { box-shadow: none }` (`globals.css:69`) suppresses RF's default rectangular glow; `.react-flow__node.selected .fc-node, .fc-node--link, .fc-node--note` (`globals.css:70-73`) applies a 2 px primary ring + tight indigo halo on the card element directly. Shape/group nodes opt out (`nodes.css:343`: `.react-flow__node.selected:has(.fc-group) { box-shadow: none !important }`) — the `ShapeOutline` SVG handles visual selection state internally.
**Key decisions:** placing the ring on the inner card `<div>` means it follows the 16 px `border-radius` of `.fc-node` exactly; `has(.fc-group)` targets group nodes without adding a separate class; link/note cards use their own class names (`fc-node--link`, `fc-node--note`) so they're listed explicitly.

### Canvas handlers hook (Phase 8)

**File(s):** `components/canvas/use-canvas-handlers.ts`
**What it does:** `useCanvasHandlers` returns RF controlled state (`useNodesState`/`useEdgesState`) plus the full interaction-callback set: `onConnect` → `store.onConnect`; `onEdgesChange` → `store.removeEdgeWriteback` for `remove`-type changes; `onNodeDragStop` → `store.setNodePosition`; `onEdgeDoubleClick` → `store.setEditingEdge`; `isValidConnection` (rejects self-loops at drag time); `onNodeClick` (opens reader for markdown nodes). Extracted from `canvas-shell.tsx` to keep the shell declarative.
**Key decisions:** placed in `components/canvas/` not `lib/canvas/` — the hook calls `useNodesState`/`useEdgesState` (React hooks); `lib/canvas/*` is a pure-TS, DOM-free zone. Documented as deviation #3 below.

### Bidirectional `links:` write-back (Phase 8)

**File(s):** `app/api/canvas/links/route.ts`, `lib/canvas/frontmatter.ts` (`stringifyFile`), `lib/api.ts` (`patchLinks`), `lib/canvas/store.ts` (`onConnect` + `removeEdgeWriteback`)
**What it does:** `POST /api/canvas/links {path, op:'add'|'remove', link}` — the eighth guarded route — reads the target file, applies a body-preserving `links:` patch via `frontmatter.stringifyFile`, and writes back. `store.onConnect` for a file↔file pair mints a deterministic `lk:` links edge AND calls `patchLinks(add)` so the connection survives the next board reload without a duplicate (same id formula as `deriveLinkEdges` → idempotent). `store.removeEdgeWriteback` is the keyboard-delete path — removes from `doc.edges` and calls `patchLinks(remove)` for durable deletion. Per-node `deletable:false` in `adapter.toReactFlow` + `deleteKeyCode=['Delete','Backspace']` in the shell restrict keyboard delete to edges only.
**Key decisions:** `frontmatter.stringifyFile` uses gray-matter read + `matter.stringify` — body bytes are preserved; scalars may be re-quoted by js-yaml (accepted caveat, in Tech-Debt). Returns 400 on `GuardError`, 404 on `ENOENT`, 500 else.

---

### Multi-select + true group containers (Phase 10)

**File(s):** `lib/canvas/jsoncanvas.ts` (`parentId`), `lib/canvas/adapter.ts` (abs↔rel), `lib/canvas/store.ts` (`selectedIds`/`setSelection`/`groupSelection`/`ungroup`/`applyLayout`), `lib/canvas/brief.ts`, `components/canvas/use-canvas-handlers.ts`, `components/canvas/comment-layer.tsx`, `components/canvas/canvas-toolbar.tsx`, `components/canvas/canvas-shell.tsx`
**What it does:** A node may carry an optional `parentId` naming its container `group` node (single nesting level). **The doc invariant is that `x/y` are always ABSOLUTE** — grouping/ungrouping is therefore a pure membership change with no coordinate math. The absolute↔relative conversion React Flow needs for nested nodes is confined to the adapter: `toReactFlow` stable-sorts parentless-first (so a parent precedes its children), subtracts the parent's position to make child positions relative, and sets `extent:'parent'`; a dangling `parentId` degrades to a top-level node. `toJSONCanvas` reverses it. `groupSelection` wraps ≥2 ungrouped non-group nodes in a new container sized to their bounds + 28px pad; `ungroup` drops the container and clears children's `parentId` (they stay put, already absolute). Selection is mirrored from RF via `onSelectionChange → setSelection` (equality-guarded against churn). Drag write-back (`onNodeDragStop`) is now bulk + group-aware: it reads each moved node's `internals.positionAbsolute` and, for a dragged group, its children's, writing them all through `applyLayout`. Comment pins read `internals.positionAbsolute` too, so a pin on a grouped child (whose `useNodes()` position is parent-relative) places correctly. `brief.nodeFromAgent` preserves `parentId` so an agent update can't silently un-parent a node.
**Key decisions:** Membership is set by the explicit Group action, not drag-into-reparenting (simpler, deterministic). Single nesting level only (matches the design's "no nested grouping" non-goal). Coordinate math independently verified by the phase-close review + adapter round-trip tests.

### ELK "Re-organize" auto-layout (Phase 10)

**File(s):** `lib/canvas/layout.ts`, `components/canvas/canvas-toolbar.tsx` (`reorganize`)
**What it does:** `computeLayout(nodes, edges, measured)` builds an ELK graph of the **top-level** nodes only (layered, `elk.direction:RIGHT`, `elk.edgeRouting:ORTHOGONAL`, `separateConnectedComponents`), using a measured-height fallback ladder (live measured → authored → 160px) so tall auto-height markdown cards don't collide. Edges into a grouped child resolve to its group; intra-group, dangling, and duplicate edges are filtered before layout. The toolbar `reorganize` handler feeds in the live measured sizes, then writes back absolute positions — shifting each group's children by their group's delta so groups move as a unit — via one `applyLayout`, then `fitView`. The button shows a spinning `is-busy` state during the async run and logs (doesn't swallow) an ELK failure.
**Key decisions:** ELK lays out only top-level nodes (grouped children follow their group) — keeps the graph small and the group intact. `elkjs` bundled JS (no native deps) runs in both the browser and node (vitest).

### Board file I/O — Open / Save-as (Phase 10)

**File(s):** `components/canvas/board-dialog.tsx`, `lib/canvas/store.ts` (`saveAs`/`openBoard`), `components/canvas/canvas-toolbar.tsx` (`[File ▾]`), `components/canvas/canvas-shell.tsx`
**What it does:** `<BoardDialog mode="open"|"save">` is a glass modal that browses the guarded project tree (`/api/files`, `.canvas` filter). **Save-as** takes a directory + filename, calls `store.saveAs` (writes via the existing `/api/canvas` POST, adopts the path, clears dirty, updates the URL `?path=` via `history.replaceState` — no reload). **Open** dirty-guards inline (a confirm bar, not a native `window.confirm`) then calls `store.openBoard` (loads the new doc, clears selection, updates the URL). The toolbar mounts the trigger in `[File ▾]` (Open board… / Save as…) via a new `onOpenBoard` prop; the shell owns the dialog mount (mirroring `<ExportPanel>`). `⌘S` still quick-saves the current path.
**Key decisions:** Inline dirty-guard over native dialog (Phase-6 ruling). Dialog mounted in the shell, not the toolbar, for consistency with the other overlays.

---

## Deviations from Plan

| Plan Spec | Actual Implementation | Reason |
|-----------|-----------------------|--------|
| Agent types in a dedicated module | All agent-round-trip types live in `lib/canvas/brief.ts` | The design located them there; co-located with the pure functions that use them |
| `applyResponse` snippet (id-keyed only) | Hardened: comment content-signature dedup + directed-pair edge skip | Makes re-import a true no-op even for id-less replies/edges (the idempotency acceptance criterion) |
| `commentMode: boolean` (Phase 6) | Unified `mode: CanvasMode` (`select`/`connect`/`comment`) | Single primitive for the toolbar's three modes; avoids parallel state surfaces |
| Reader via `components/markdown-renderer.tsx` + native `rehype-shiki` | `lib/render-md.ts` server pipeline + `@shikijs/rehype` (WASM) | `rehype-shiki`'s native oniguruma fails to build on Node 26 (Phase-1 decision); a lib module is simpler than a component for a server pipeline |
| Empty/error state "in `page.tsx`" | Empty (default board) + fs-error card stay in the shell; `page.tsx` adds a render **error boundary** | The shell already owned the load + overlay (Phase 4); the boundary is the page-level addition |
| Link/add-node via prompt | Inline glass `<input>` + `FilePicker` (no `window.prompt`) | Honors the Phase-6 operator ruling against native prompts |
| `MergeReport.conflicts` populated | Always `[]` | v0.1 has no per-node revision tracking; last-writer-wins |
| One revision bump per import | Two (pure step-8 +1, server POST +1) | Inherent to the Phase-3 server always-increment design; no correctness impact; deferred |
| (not in file table) | Added `components/canvas/file-picker.tsx` | The add-node menu needs a dir browser for markdown/image |
| (Phase 8) `controls.css` selectors unprefixed (plan snippet) | Prefixed `.react-flow ` on every selector | Needed to outrank `@xyflow/react/dist/style.css`; functionally correct |
| (Phase 8) CSS `@import` placed after `@theme` (plan) | `@import` placed before `@theme` | CSS spec requires `@import` before all other rules; `var()` still resolves at runtime |
| (Phase 8) `use-canvas-handlers.ts` in `lib/canvas/` (pure-TS zone) | Placed in `components/canvas/` | Contains React hooks (`useNodesState`/`useEdgesState`) — `lib/canvas/*` is DOM-free by convention |
| (Phase 8) `nodesDeletable` RF prop for node deletion | Per-node `deletable:false` in `adapter.toReactFlow` | RF v12 removed `nodesDeletable`; per-node flag achieves the same edges-only delete behavior |
| (Phase 9) `GroupNode` as a simple `FallbackNode` delegation | Promoted to a full shape node (`ShapeOutline` SVG, `NodeResizer`, shape-switcher bar, inline label editor) | Design evolution: `FallbackNode` is now only the catch-all for non-md/non-image `file` types; `group` is a first-class component |
| (Phase 9) Toolbar `+ Add ▾` as the primary insert menu | `+ Add ▾` is the narrow-screen (<1024 px) fallback only; the primary UI is a direct icon insert rail | Operator selected the `09-direct-rail.html` mockup which uses per-type icon buttons for the primary desktop UX |
| (Phase 9) `FmValue`/`PRIORITY`/`SKIP`/`MAX_CHIPS` exported from `frontmatter-view.tsx` | Module-private (unexported constants/component) — only `basename` and `statusClass` are exported | Internal rendering helpers don't need to be on the public import surface; the changelog Phase-9 table entry contained a stale claim, corrected here |
| BoardDialog mounted in the toolbar (plan table) | Mounted in the shell, triggered by an `onOpenBoard` toolbar prop | Mirrors the `<ExportPanel>` overlay pattern; cleaner separation |
| Open dirty-guard via native `window.confirm` | Inline confirm bar in the dialog | Honors the Phase-6 no-native-dialog ruling |

> **Known caveat (Phase 8):** `matter.stringify` re-emits frontmatter via js-yaml — scalars may be re-quoted (e.g., unquoted `foo` → `'foo'`); file body bytes are preserved. Accepted for v0.1.

---

## Integration Points

| This module / component | Integrates with | Via | Notes |
|-------------------------|----------------|-----|-------|
| `store.applyResponse` | `brief.applyResponse` (pure) + `/api/file` + `hydrateFiles` + `edges.*` | function call → fetch → resolve → reconcile → `save()` | Generated files written **before** re-resolve so new file nodes resolve to real content |
| `store.load` / `addFileNode` / `applyResponse` | `lib/api.resolvePaths` + `edges.deriveLinkEdges`/`reconcileEdges` | shared `hydrateFiles` helper | One code path hydrates frontmatter + re-derives the links graph for all three |
| `canvas-shell` | `store`, all node/edge components, `CommentLayer`, `CanvasToolbar`, `Dropzone`, `ReaderDrawer`, `ExportPanel` | React Flow `nodeTypes`/`edgeTypes` + mounted overlays; `onNodeClick`→reader | Single client-only shell under `ReactFlowProvider` |
| `CanvasToolbar` / `Dropzone` | `store.addNode`/`addFileNode`/`buildBrief`/`applyResponse`, `useReactFlow` | store actions + `screenToFlowPosition` placement | Toolbar opens the agent panel; both place nodes on a 20px grid |
| all eight `app/api/*` routes | `lib/fs-guard.guardPath` | `guardPath(rel)` before any fs op | Single root-confinement guard across all routes |
| `store.onConnect` (file↔file) / `store.removeEdgeWriteback` | `api.patchLinks` → `POST /api/canvas/links` | typed fetch wrapper → guarded route → `frontmatter.stringifyFile` | Bidirectional `links:` write-back: connect adds, keyboard-delete removes; idempotent on reload |
| `canvas-shell` | `useCanvasHandlers` hook | hook call — RF state + all callbacks destructured | Shell stays declarative; hook lives in `components/canvas/` (not `lib/`) due to React hooks dependency |
| `ReaderDrawer` | `lib/render-md` via `GET /api/render` | fetch `{ html }` | Shiki runs server-side only (per-node bodies use the lightweight client renderer) |
| `ReaderDrawer` | `FrontmatterView` (`variant="reader"`) | direct component import (`reader-drawer.tsx:84`) | Sticky frontmatter bar above prose; returns null when the node has no displayable fields |
| `MarkdownNode` | `FrontmatterView` (`variant="card"`) | direct component import (`markdown-node.tsx:48`) | Replaces the old inline frontmatter table; pixel-identical to the reader bar |
| `GroupNode` | `store.setNodeSize`/`setNodeShape`/`setNodeLabel` | store actions via `useCanvasStore` | Three separate mutation paths: resize-end → `setNodeSize`, switcher click → `setNodeShape`, label blur/Enter → `setNodeLabel` |
| `NoteNode` | `store.setNodeText` | store action via `useCanvasStore` | Double-click → textarea; commit on blur/⌘Enter → `setNodeText`; immutable until `save()` |

---

## Quality Checks

| Check | Command | Result |
|-------|---------|--------|
| Typecheck | `npx tsc --noEmit` | exit 0 |
| Lint | `npm run lint` | exit 0 (zero error/warning) |
| Build | `npm run build` | compiled; 11/11 static pages; all 8 `/api/*` routes registered |
| Unit | `npx vitest run` | 79/79 — adapter 14 · edges 11 · comments 9 · store 33 · brief 9 · layout 3 |
| Render route | `curl /api/render?path=examples/welcome.md` | real `<pre class="shiki github-dark-default">` + per-token color spans; `../` + non-md → 400 |
| Links route | `curl POST /api/canvas/links` | add/remove verified; body-preservation confirmed; `GuardError`→400, bad-op→400, `ENOENT`→404 |
| Visual parity (Phase 7) | pure-Node CDP driver | 18/18 checks; `mockups/captures/phase-7/07-{loaded,add-menu,reader,export,import}.png` |
| Visual parity (Phase 8) | pure-Node CDP driver | 9/9 checks; controls overrides, reader size control (440 px/50 vw/100 vw), smoothstep edges; `mockups/captures/phase-8/` |
| Visual parity (Phase 9) | pure-Node CDP driver | 7/7 checks; `mockups/captures/phase-9/09-{loaded,shape-menu,file-menu,reader-drawer,reader-half,reader-full,agent-import}.png`; frontmatter reader bar, toolbar rail, reader readability + 17 px/66ch prose verified |

Per-phase gate history is in `001-initial-architecture-qa-report.md` (Checks for Phases 1–9 + Plan completion).

---

## Follow-up Items

- [ ] Autosave / explicit dirty-flush so collapse, manual edges, comments, and agent merges persist without a manual ⌘S.
- [ ] Per-node revision tracking to populate `MergeReport.conflicts` (replace last-writer-wins).
- [ ] Symlink-aware path guard (`guardPath` is lexical-only today).
- [ ] Rewrite reader-embedded relative image `src` → `/api/asset` for full reader image fidelity.
- [ ] De-duplicate the `revision` double-bump on import (treat the server as the single revision authority).
- [ ] Keep `AGENT_CONTRACT` (`brief.ts`) and `docs/flowcanvas-agent-contract.md` in sync (no enforced contract today).
- [x] Phase 10 — Canvas mechanics (multi-select + true group containers, ELK re-organize, save-as/open-board): delivered and live-verified.
- [ ] Add vitest coverage for the toolbar flyout state machine (`canvas-toolbar.tsx`) and `<FrontmatterView>` — currently verified by CDP only (known Phase-9 test gap).

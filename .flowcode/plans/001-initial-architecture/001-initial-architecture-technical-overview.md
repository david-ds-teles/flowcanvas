---
name: 001-initial-architecture-technical-overview
description: Authoritative post-execution overview of 001-initial-architecture (Flowcanvas v0.1 + Phase 8 polish) — what was built, deviations, and integration points, verified against the code.
status: complete
tags: [technical-overview, post-execution, authoritative]
links: [.flowcode/plans/001-initial-architecture/001-initial-architecture-plan.md, .flowcode/plans/001-initial-architecture/001-initial-architecture-changelog.md, .flowcode/plans/001-initial-architecture/001-initial-architecture-test-notes.md]
---

# Technical Overview — 001-initial-architecture Flowcanvas v0.1

- A standalone Next.js 16 canvas that renders flowcode markdown files as spatial nodes, connects them with `links:`-derived + manual edges, pins comment threads, and round-trips the whole board to/from an AI agent as one JSON — persisted to a `.canvas` file.
- Status complete; v0.1 dated 2026-06-26; Phase 8 polish folded in 2026-06-27.
- Role: authoritative source for `001-initial-architecture-changelog.md` and `001-initial-architecture-test-notes.md`.
- Source plan: `001-initial-architecture-plan.md` (8 phases, all `done`; Phase 8 = post-execution polish).

> **Audit note:** the Post-Execution `flowcode:code-explorer-agent` (and the plan-completion `flowcode:code-reviewer-agent`) were dispatched in parallel but both **stalled on the background-agent stream watchdog** (600 s no-progress — infrastructure, not a task failure). Per `plan-instructions.md § Post-Execution Pipeline`, the main agent performed the code audit + final review inline. Every `path:line`-level claim below was read from the committed source.

---

## Summary

**What:** Flowcanvas v0.1 — an extended-JSONCanvas board (React Flow) over flowcode markdown. Markdown files render as frontmatter-table + collapsible-body cards; images, links, and notes render inline; edges derive from `links:` frontmatter or are drawn by hand; comments pin to a node or a canvas point; and a bidirectional `DesignBrief` ⇄ `AgentResponse` JSON loop lets an AI agent read and rewrite the board, with an idempotent merge.

**Why:** Design systems are authored as many related markdown files, but a flat file tree hides their relationships and gives an AI agent no spatial, relational context. Flowcanvas turns the files into a navigable board and a single self-contained JSON an agent can reason over and edit.

**Risks:** (1) `/api/asset` + the fs routes expose arbitrary in-root reads/writes — mitigated by the lexical `guardPath` (root-confinement) + extension allowlists, but `guardPath` does **not** dereference symlinks. (2) Optimistic concurrency is last-writer-wins (`MergeReport.conflicts` is always `[]` in v0.1 — no per-node revision tracking). (3) Large boards (100s of nodes) rely on React Flow defaults + collapsed bodies; virtualization is deferred. (4) Persistence of in-session edits (collapse, manual edges, comments, agent merges) rides the Save trigger — there is no autosave.

**Tech-Debt:** `revision` double-bumps per import (pure merge +1, then the server POST +1) — harmless but inconsistent; the `AGENT_CONTRACT` string and `docs/flowcanvas-agent-contract.md` must be kept in sync by hand; reader-embedded relative images are not rewritten to `/api/asset` (reader is text/code-focused). Phase 8: `matter.stringify` re-emits frontmatter via js-yaml on `links:` write-back — scalars may be re-quoted; body bytes preserved (accepted for v0.1).

**Next:** autosave / explicit dirty-flush UX; per-node revision tracking to populate `conflicts`; symlink-aware path guard; reader image-src rewriting; node-body inline editing (deferred from v0.1).

---

## What Was Built

A greenfield Next.js 16 / React 19 / Tailwind v4 app, dark-only, on the **nyx** glassmorphic design language. The canvas is a client-only React Flow surface (`dynamic(ssr:false)`) wrapped in an error boundary. A typed extended-JSONCanvas schema (`lib/canvas/jsoncanvas.ts`) is the data spine; a bidirectional adapter (`lib/canvas/adapter.ts`) maps `FlowcanvasDoc` ⇄ React Flow `{nodes, edges}`. A zustand store (`lib/canvas/store.ts`) holds the doc, a transient resolved-body cache, the interaction `mode`, and every mutation, and orchestrates load / save / edge-derivation / comment ops / the agent round-trip. Eight guarded Node-runtime route handlers (`app/api/*`) wrap `fs` behind a single lexical path guard (`lib/fs-guard.ts`): read/write the `.canvas` doc, batch-resolve markdown frontmatter+body, stream images, write agent-generated markdown, list directories, multipart-upload, server-render markdown to shiki HTML, and patch `links:` frontmatter write-back (Phase 8).

On top sit the visual layers: five `memo`'d node components (markdown / image / link / note / fallback), an origin-styled labeled edge with an in-canvas label editor, a comment pin overlay + flat-thread popover projected from live node geometry, and — added in Phase 7 — the full chrome: a top glass toolbar (modes, add-node menu + file picker, upload, agent I/O, fit-view, ⌘S save), a drag-drop dropzone, a full-fidelity shiki reader drawer, and the agent export/import panel. Phase 8 extracted RF controlled state and all interaction callbacks into `useCanvasHandlers` (`components/canvas/use-canvas-handlers.ts`), moved the CSS to six partials under `app/styles/`, switched edges to smoothstep (`getSmoothStepPath(borderRadius:8)`) + `connectionLineType=SmoothStep`, extended the reader to three sizes (drawer 440 px / half 50 vw / full 100 vw), and added bidirectional `links:` write-back via the eighth route (`/api/canvas/links`) with durable keyboard-delete via `removeEdgeWriteback`.

The defining capability is the **agent round-trip** (`lib/canvas/brief.ts`): `buildBrief` packages the live board into a fat, self-contained `DesignBrief` (each markdown node's parsed frontmatter+body embedded, edges with provenance, comment threads by id, the human's `intent`); the agent replies with an `AgentResponse`; `applyResponse` runs an 8-step, **idempotent**, id-keyed merge that writes generated files, upserts nodes/edges, attaches replies, re-derives `links:` edges, and persists — so re-importing the same response is a no-op.

---

## Implementation Details

### Schema + adapter (data spine)

**File(s):** `lib/canvas/jsoncanvas.ts`, `lib/canvas/adapter.ts`
**What it does:** `jsoncanvas.ts` defines the discriminated `CanvasNode` union (`file`/`link`/`text`/`group`), `CanvasEdge`, `Comment`/`CommentAnchor`, `SessionMeta`, `FlowcanvasDoc`, plus the `nodeKind` discriminator (extension → `markdown`/`image`/`file`) and `isFileNode` guard. `adapter.ts` `toReactFlow`/`toJSONCanvas` convert both ways, preserving `meta`/`color`/`fromEnd`/`toEnd` that RF state doesn't model.
**Key decisions:** markdown nodes are content-sized (`height: undefined` + a `--fc-body-max` clamp) so the collapse toggle visibly shrinks the card; preset colors `"1".."6"` map to nyx hexes via `colorVar`.

### Persistence + resolve (guarded fs)

**File(s):** `lib/fs-guard.ts`, `lib/canvas/frontmatter.ts`, `app/api/{canvas,canvas/resolve,asset,file,files,upload,render,canvas/links}/route.ts`, `lib/api.ts`
**What it does:** `guardPath` resolves a path against `FLOWCANVAS_ROOT` (default `cwd`) and throws `GuardError` on escape. Each route maps `GuardError`→400, `ENOENT`→404, else→500; the batch `resolve` route surfaces per-item errors inside its 200 body. `lib/api.ts` is the typed client (`getCanvas`/`saveCanvas`/`resolvePaths`/`writeFileApi`/`listDir`/`uploadFile`/`assetUrl`/`patchLinks`). Phase 8 added `frontmatter.stringifyFile(path, newFrontmatter)` (gray-matter read + `matter.stringify` body-preserving rewrite — `lib/canvas/frontmatter.ts`) and `POST /api/canvas/links` (guarded `{path, op:'add'|'remove', link}` → patches `links:` field — `app/api/canvas/links/route.ts`).
**Key decisions:** lexical guard only (no symlink dereference — documented risk); markdown bodies capped at `BODY_CAP` (40 000) with a `truncated` flag; the `canvas` POST bumps `session.revision` server-side and echoes it.

### Store (zustand orchestrator)

**File(s):** `lib/canvas/store.ts`
**What it does:** holds `doc`, transient `bodies`, `dirty`, `mode: CanvasMode`, `editingEdgeId`, `readerSize: ReaderSize` (default `'drawer'`). Actions: `load` (fetch → `hydrateFiles` → reconcile edges), `save`, `toggleCollapsed`, `onConnect`/`relabelEdge`/`setNodePosition`/`setEditingEdge`, `setMode`, `addNode`/`addFileNode`, `addComment`/`replyComment`/`resolveComment`, `setReaderSize`/`maximizeReader`, `removeEdgeWriteback` (removes edge from `doc.edges` + calls `patchLinks(remove)` for file↔file pairs), and the agent `buildBrief`/`applyResponse`. A shared `hydrateFiles(nodes, bodies)` helper resolves markdown frontmatter into `meta` + the bodies cache and is reused by `load`, `addFileNode`, and `applyResponse`.
**Key decisions:** Phase 6's `commentMode: boolean` was unified into a single `mode` primitive (`select`/`connect`/`comment`) — one field, not parallel surfaces. Every update is immutable (no in-place mutation). `lib/canvas/*` stays DOM-free (the UI passes labels/URLs in). Phase 8: `onConnect` branches — file↔file mints a deterministic `lk:` links edge + calls `patchLinks(add)` (idempotent: `deriveLinkEdges` re-produces the same id on reload); non-file pairs mint an empty-label `user` edge. `removeEdgeWriteback` is the keyboard-delete path — removes from `doc.edges` and calls `patchLinks(remove)` for durable write-back.

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

### Reader pipeline + chrome (Phase 7 polish)

**File(s):** `lib/render-md.ts`, `app/api/render/route.ts`, `components/canvas/{reader-drawer,canvas-toolbar,export-panel,file-picker,dropzone}.tsx`, `components/canvas/use-canvas-handlers.ts` (Phase 8), `app/page.tsx`, `app/globals.css`, `app/styles/{nodes,edges,controls,reader,comments,toolbar}.css` (Phase 8)
**What it does:** `render-md.ts` is a server `unified` pipeline (`remark-parse → remark-gfm → remark-rehype → rehype-sanitize → @shikijs/rehype → rehype-stringify`) behind `GET /api/render`; the reader drawer fetches it and shows shiki-highlighted prose + the node's thread. The toolbar drives modes/add-node/upload/agent-I/O/fit-view/save (+ `useSaveShortcut` for ⌘S); the dropzone uploads dropped files; `page.tsx` wraps the shell in a React error boundary. Phase 8: `use-canvas-handlers.ts` exports `useCanvasHandlers` — RF controlled state (`useNodesState`/`useEdgesState`) + all interaction callbacks extracted from `canvas-shell.tsx`; `reader-drawer.tsx` gained a 3-size segmented control (`'drawer'`/`'half'`/`'full'`) with `data-size` driving CSS widths (440 px / 50 vw / 100 vw in `app/styles/reader.css`); `app/globals.css` split into six `@import`-ed partials under `app/styles/` (move-only, zero selector changes).
**Key decisions:** shiki runs **after** sanitize on an already-clean hast tree, so its inline-styled spans (trusted highlighter output) survive; `@shikijs/rehype` (WASM) replaced the design's native `rehype-shiki` (oniguruma fails to build on Node 26 — decided Phase 1).

### CSS architecture (Phase 8)

**File(s):** `app/globals.css`, `app/styles/{nodes,edges,controls,reader,comments,toolbar}.css`
**What it does:** `app/globals.css` now contains only base/theme (`@theme` nyx token block) / glass recipe / RF CSS-var overrides / `.fc-empty` and `.fc-void` utilities, and six `@import` statements. All node, edge, controls, reader, comments, and toolbar rules live in the six partials. The `@import` lines are placed before `@theme` for CSS spec validity; `var()` references resolve at runtime so token references inside the partials are unaffected.
**Key decisions:** split is move-only (zero selector changes, gate-verified). `controls.css` selectors are prefixed with `.react-flow ` (one specificity level) to outrank `@xyflow/react/dist/style.css`'s bundled `.react-flow__controls` rules — without the prefix, RF's bundled stylesheet wins at equal specificity.

### Canvas handlers hook (Phase 8)

**File(s):** `components/canvas/use-canvas-handlers.ts`
**What it does:** `useCanvasHandlers` returns RF controlled state (`useNodesState`/`useEdgesState`) plus the full interaction-callback set: `onConnect` → `store.onConnect`; `onEdgesChange` → `store.removeEdgeWriteback` for `remove`-type changes; `onNodeDragStop` → `store.setNodePosition`; `onEdgeDoubleClick` → `store.setEditingEdge`; `isValidConnection` (rejects self-loops at drag time); `onNodeClick` (opens reader for markdown nodes). Extracted from `canvas-shell.tsx` to keep the shell declarative.
**Key decisions:** placed in `components/canvas/` not `lib/canvas/` — the hook calls `useNodesState`/`useEdgesState` (React hooks); `lib/canvas/*` is a pure-TS, DOM-free zone. Documented as deviation #3 below.

### Bidirectional `links:` write-back (Phase 8)

**File(s):** `app/api/canvas/links/route.ts`, `lib/canvas/frontmatter.ts` (`stringifyFile`), `lib/api.ts` (`patchLinks`), `lib/canvas/store.ts` (`onConnect` + `removeEdgeWriteback`)
**What it does:** `POST /api/canvas/links {path, op:'add'|'remove', link}` — the eighth guarded route — reads the target file, applies a body-preserving `links:` patch via `frontmatter.stringifyFile`, and writes back. `store.onConnect` for a file↔file pair mints a deterministic `lk:` links edge AND calls `patchLinks(add)` so the connection survives the next board reload without a duplicate (same id formula as `deriveLinkEdges` → idempotent). `store.removeEdgeWriteback` is the keyboard-delete path — removes from `doc.edges` and calls `patchLinks(remove)` for durable deletion. Per-node `deletable:false` in `adapter.toReactFlow` + `deleteKeyCode=['Delete','Backspace']` in the shell restrict keyboard delete to edges only (RF v12 lacks a `nodesDeletable` prop).
**Key decisions:** `frontmatter.stringifyFile` uses gray-matter read + `matter.stringify` — body bytes are preserved; scalars may be re-quoted by js-yaml (accepted caveat, in Tech-Debt). Returns 400 on `GuardError`, 404 on `ENOENT`, 500 else — same tri-branch pattern as all other routes.

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

---

## Quality Checks

| Check | Command | Result |
|-------|---------|--------|
| Typecheck | `npx tsc --noEmit` | exit 0 |
| Lint | `npm run lint` | exit 0 (zero error/warning) |
| Build | `npm run build` | compiled; 11/11 static pages; all 8 `/api/*` routes registered |
| Unit | `npx vitest run` | 66/66 — adapter 9 · edges 11 · comments 9 · store 28 · brief 9 (Phase 8 +10 to store) |
| Render route | `curl /api/render?path=examples/welcome.md` | real `<pre class="shiki github-dark-default">` + per-token color spans; `../` + non-md → 400 |
| Links route | `curl POST /api/canvas/links` | add/remove verified; body-preservation confirmed; `GuardError`→400, bad-op→400, `ENOENT`→404 |
| Visual parity (Phase 7) | pure-Node CDP driver | 18/18 checks; `mockups/captures/phase-7/07-{loaded,add-menu,reader,export,import}.png` |
| Visual parity (Phase 8) | pure-Node CDP driver | 9/9 checks; controls overrides, reader size control (440 px/50 vw/100 vw), smoothstep edges verified; `mockups/captures/phase-8/` |

Per-phase gate history is in `001-initial-architecture-qa-report.md` (Checks for Phases 1–7 + Plan completion).

---

## Follow-up Items

- [ ] Autosave / explicit dirty-flush so collapse, manual edges, comments, and agent merges persist without a manual ⌘S.
- [ ] Per-node revision tracking to populate `MergeReport.conflicts` (replace last-writer-wins).
- [ ] Symlink-aware path guard (`guardPath` is lexical-only today).
- [ ] Rewrite reader-embedded relative image `src` → `/api/asset` for full reader image fidelity.
- [ ] Node-body inline editing on the canvas (deferred from v0.1; reader is read-only).
- [ ] De-duplicate the `revision` double-bump on import (treat the server as the single revision authority).
- [ ] Keep `AGENT_CONTRACT` (`brief.ts`) and `docs/flowcanvas-agent-contract.md` in sync (no enforced contract today).

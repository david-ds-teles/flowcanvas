---
name: 001-initial-architecture-qa-report
description: QA gate report for 001-initial-architecture — per-phase and plan-completion review findings and stack-gate outcomes.
status: active
tags: [qa-report, quality-gate, review, findings]
links: [.flowcode/plans/001-initial-architecture/001-initial-architecture-plan.md, .flowcode/quality-checks/markdown-quality.md]
---

# QA Report — 001-initial-architecture Flowcanvas Initial Architecture

- Phase 1 passes all three required stack gates (tsc 0 · lint 0 · build ok) with no `≥ medium` findings; the phase is clear to close and flip to `done`.
- Scope: per-phase close + plan completion.
- Reverse-chronological, prepend-only: newest `## Check YYYY-MM-DD HH:MM` directly below this header; never rewrite prior sections.
- Each check: Stack Gate as a ≤3-column table; Review Findings as finding-as-section entries.
- Baseline conformance (project-overview, module contracts, declared gates, code conventions) is checked every run and recorded on the `**Baseline conformance:**` line; divergence is a first-class finding.
- Severity values: `critical` · `high` · `medium` · `low` · `info`.
- A finding with no `**Resolution:**` line is unresolved; `qa-probe-gate.js` blocks commits/PRs when any unresolved finding is ≥ medium.
- Follow `markdown-quality.md § Finding-as-Section Format` and `§ Tables`.

---

## Check 2026-06-26 — Phase 5 (Edges: manual + links-derived)

**Reviewer:** flowcode:code-reviewer-agent
**Scope:** Phase 5 — `lib/canvas/edges.ts`, `lib/canvas/edges.test.ts`, `lib/canvas/store.test.ts`, `components/canvas/edges/labeled-edge.tsx`, `lib/canvas/store.ts` (onConnect, relabelEdge, setNodePosition, load reconcile), `components/canvas/canvas-shell.tsx` (edgeTypes, onConnect, onNodeDragStop, onEdgeDoubleClick), `app/globals.css` (fc-edge-label + origin variants)
**Plan:** 001-initial-architecture
**Baseline conformance:** flagged (1) — `window.prompt` DOM access in `lib/canvas/store.ts:64` violates `project-overview.md § Code Style & Conventions` "no DOM" rule for `lib/canvas/*` modules
**Gate outcome:** PASS
**Summary:** All four Phase 5 gates pass (tsc 0 · lint 0 · build ok · vitest 25/25; dev 200 CDP-verified). Derivation is deterministic — `lk:<from>-><to>` ids are stable, `readLinks` handles scalar/absent/non-string entries, per-source dedup is correct. Reconcile correctly keeps user/agent, drops stale links edges, and suppresses a derived edge that duplicates a kept directed pair (including the reverse-direction case). The controlled-state sync loop (`rfNodes/rfEdges → setNodes/setEdges` effects) has no double-add — RF does not auto-add edges on `onConnect`; the store adds to doc and the effect syncs RF state. No drag/position race: `onNodeDragStop` writes the final position to the store once per drop, and `rfNodes` recomputes with the correct coordinates. One medium finding: React Flow's default `deleteKeyCode='Backspace'` is active and `useEdgesState`/`useNodesState` apply `type:'remove'` changes locally, but neither `onEdgesChange` nor `onNodesChange` propagates removals to the store — so keyboard-deleted edges/nodes reappear on the next store update, producing misleading visual reverts. Four low findings (DOM access in lib, missing `memo` on `LabeledEdge`, user-edge color deviates from design spec, `relabelEdge` agent-origin case untested) and four info findings.

### Stack Gate

| Gate | Outcome | Notes |
|------|---------|-------|
| Typecheck | pass | `npx tsc --noEmit` — exit 0 (reported) |
| Lint | pass | `npm run lint` — exit 0 (reported) |
| Build | pass | `npm run build` — exit 0 (reported) |
| Unit | pass | `npx vitest run` — 25/25 (reported; 11 derive/reconcile + 5 store-action + pre-existing adapter suite) |
| Dev boot | pass | `npm run dev` — GET / 200, derived edge CDP-verified dashed indigo + lock label (reported) |
| Integration | n/a | Phase 5 scope |
| Coverage | n/a | Phase 5 scope |
| E2E | n/a | Phase 5 scope |

### Review Findings

#### Finding 1 — [medium] Keyboard deletion applies to RF local state only and reverts on next store update

**Files:** `components/canvas/canvas-shell.tsx:96-115`

React Flow's default `deleteKeyCode` is `'Backspace'`. Both `useNodesState` and `useEdgesState` return `onNodesChange`/`onEdgesChange` handlers that process all change types from React Flow, including `{type:'remove'}`. When the user selects a node or edge and presses Backspace, React Flow dispatches a `type:'remove'` change; the `useNodesState`/`useEdgesState` hooks apply it to local React Flow state — the element disappears. However, neither handler writes the removal back to the Zustand store. On the next store mutation (any `toggleCollapsed`, `onConnect`, `setNodePosition`, or `relabelEdge` call), `doc` changes, `rfNodes`/`rfEdges` recompute from the store, and the `useEffect` sync calls `setNodes(rfNodes)` / `setEdges(rfEdges)`, restoring the deleted element. The element visually disappears, then silently reappears — a misleading state.

The `<ReactFlow>` component at `canvas-shell.tsx:96` does not set `deleteKeyCode={false}` or `deleteKeyCode={null}` to opt out of this behavior.

**Suggested fix:** Add `deleteKeyCode={false}` (or `deleteKeyCode={null}`) to the `<ReactFlow>` props in `canvas-shell.tsx` until deletion is properly implemented in the store (Phase 7 polish scope). This is a one-line addition that prevents the misleading visual revert without blocking any Phase 5 functionality.

**Resolution:** fixed — `deleteKeyCode={null}` added to `<ReactFlow>` in `canvas-shell.tsx` (`false` is not a valid `KeyCode`; `null` is the type-correct opt-out). Store-level deletion stays Phase 7.

---

#### Finding 2 — [low] `window.prompt` DOM access in `lib/canvas/store.ts` violates the lib/canvas "no DOM" project convention

**Files:** `lib/canvas/store.ts:64`

`project-overview.md § Code Style & Conventions` (Pure vs. impure split) states: "`lib/canvas/*` modules are pure TypeScript (no DOM, no React) — they accept typed inputs and return typed outputs. All React + DOM work lives in `components/`." The only explicit exception is `adapter.ts`. `store.ts:64` calls `window.prompt('Edge label?')`, which is a blocking synchronous DOM API, directly in the Zustand store. This forces the store test to stub `globalThis.window` to run in the vitest `node` environment, and couples a lib module to the browser global.

The canonical pattern is to keep the store action pure — accept `label: string` as a parameter — and move the `window.prompt` call to the component layer (`canvas-shell.tsx`'s `onConnect` handler). The shell already has a parallel in `onEdgeDoubleClick`, which calls `window.prompt` and passes the result to `relabelEdge`.

**Suggested fix:** Rename store `onConnect` to `addEdge(fromNode, toNode, fromSide, toSide, label)` (or keep the name but accept `label` as a parameter). Move `window.prompt` to `canvas-shell.tsx`'s `onConnect` handler: call `window.prompt`, then call `store.onConnect(conn, label)`. This restores the lib/canvas purity invariant and removes the `globalThis.window` stub from the store test.

**Resolution:** fixed — `store.onConnect(conn, label)` now takes the label as a parameter; the `window.prompt` lives in the shell's `onConnect` handler (mirrors `onEdgeDoubleClick`). `store.ts` is DOM-free again and `store.test.ts` dropped the `globalThis.window` stub.

---

#### Finding 3 — [low] `LabeledEdge` is not wrapped in `memo`

**Files:** `components/canvas/edges/labeled-edge.tsx:13`

Every node component in Phase 4 (`MarkdownNode`, `ImageNode`, `LinkChipNode`, `NoteNode`, `FallbackNode`) is explicitly wrapped with `React.memo` per the project convention and to prevent unnecessary re-renders. `LabeledEdge` is exported as a plain function with no `memo`. Because the `useEffect([rfEdges, setEdges])` sync fires on every doc change (any store update), `setEdges(rfEdges)` is called frequently. Without `memo`, every `LabeledEdge` instance re-renders on every doc update even if that edge's props haven't changed. On boards with many derived edges this is measurable.

**Suggested fix:** Wrap the export: `export const LabeledEdge = memo(function LabeledEdge({ id, ... }: EdgeProps) { ... })`. Add `import { memo } from 'react'`.

**Resolution:** fixed — `LabeledEdge` is now `memo(function LabeledEdge(...))` with `import { memo } from 'react'`, matching the Phase-4 node-component convention.

---

#### Finding 4 — [low] `user` edge stroke uses neutral gray; design spec says "user solid indigo"

**Files:** `components/canvas/edges/labeled-edge.tsx:10`, `.flowcode/plans/001-initial-architecture/001-initial-architecture-design.md § Design System`

The design system principles (design § Design System) state: "Edges — `links` muted+dashed with a lock glyph, **`user` solid indigo**, `agent` neon (cyan→violet) glow." The `STROKE` record in `labeled-edge.tsx:10` sets `user: 'var(--color-outline)'` — which resolves to `#908fa0`, a neutral gray — instead of an indigo token (`--color-primary` #c0c1ff or `--color-primary-cont` #8083ff).

The design intent is that user-drawn edges visually contrast with muted auto-derived `links` edges while staying below the neon `agent` glow. Gray (`--color-outline`) is the same token used for the global `.react-flow__edge-path` fallback, making user edges visually indistinguishable from the base RF edge style.

**Suggested fix:** Change `user: 'var(--color-outline)'` to `user: 'var(--color-primary)'` (or `--color-primary-cont`) to match "solid indigo" per the design spec. Update `.fc-edge-label--user` in `globals.css` with a matching border if one is later added.

**Resolution:** fixed — corrected the full origin→stroke mapping to the design (line 619): `links`→`--color-outline` (muted, dashed+lock), `user`→`--color-primary` (solid indigo), `agent`→`--color-neon-cyan`. Added a `.fc-edge-label--user` label variant. CDP re-verified: the derived edge now strokes `rgb(144,143,160)` (muted), not indigo. My first draft had links/user colors inverted — this finding caught it.

---

#### Finding 5 — [low] `relabelEdge` agent-origin case is untested

**Files:** `lib/canvas/store.test.ts`

`store.test.ts` has two tests for `relabelEdge`: one asserts that a `links`-origin edge is promoted to `user` on relabel, and one asserts that a `user`-origin edge stays `user`. The design contract says user/agent edges are never auto-rewritten by reconcile. The `relabelEdge` logic (`store.ts:84-86`) is: if origin is `'links'` → `'user'`; else keep origin unchanged. For an `agent` edge, the conditional correctly keeps `'agent'`, but this path is not exercised by any test. A regression in the conditional (e.g., changing `=== 'links'` to `!== 'user'`) would silently demote agent edges to undefined origin and pass all existing tests.

**Suggested fix:** Add a third test: seed a doc with an `agent`-origin edge, call `relabelEdge` on it, assert `meta.origin` is still `'agent'`.

**Resolution:** fixed — added `store.test.ts` test "leaves an agent edge origin unchanged on relabel (only links is promoted)". Full suite 26/26.

---

#### Finding 6 — [info] Any store mutation silently clears React Flow selection state

**Files:** `components/canvas/canvas-shell.tsx:73-75`

`useMemo([doc])` always returns new array references for `rfNodes` and `rfEdges` whenever `doc` changes (including nodes-only changes like `toggleCollapsed`). The two sync effects fire on any such reference change and call `setNodes(rfNodes)` / `setEdges(rfEdges)`, which overwrites React Flow's internal state with the store's version. React Flow's local selection state (`selected: true` on nodes/edges) is not stored in the Zustand doc, so it is discarded on every `setNodes`/`setEdges` call. Selecting an edge then dragging a node will clear the edge selection because `onNodeDragStop` → `setNodePosition` → store update → effect fires → `setEdges(rfEdges)` (edges haven't changed in content but the array reference is new).

This is an inherent trade-off of the controlled-state sync pattern (pre-existing from Phase 4 for nodes) now extended to edges. No correctness impact in Phase 5 — edge selection is not used for any workflow — but it will matter when Phase 7 adds a toolbar that acts on the selected edge.

**Suggested fix (deferred):** Separate `rfNodes` and `rfEdges` memos and add a stable-reference guard (e.g., only call `setEdges` if the edge set actually changed by id/origin comparison). Alternatively, move selection state into the store so it survives the sync.

**Resolution:** accepted — deferred to Phase 7 when toolbar actions on selected edges are added.

---

#### Finding 7 — [info] `relabelEdge` marks `dirty: true` unconditionally even when no edge matches the id

**Files:** `lib/canvas/store.ts:88`

`relabelEdge` calls `set({ doc: { ...doc, edges }, dirty: true })` after the map regardless of whether any edge was updated. If `edge.id` is not in the store (impossible via `onEdgeDoubleClick` which uses an RF-rendered edge id, but possible via future direct calls), `edges` is a new array reference with identical content, a new `doc` object is created, both sync effects fire, and `dirty` is set to `true` with no actual change. This is an `info`-level concern since the triggering path does not exist in Phase 5 practice.

**Suggested fix:** Guard: `const changed = edges.some((e, i) => e !== doc.edges[i]); if (changed || edges.length !== doc.edges.length) set({ doc: { ...doc, edges }, dirty: true })`. Or simply: check if the found edge's label actually changed before calling `set`.

**Resolution:** accepted as-is for Phase 5 — the triggering condition does not arise from the wired `onEdgeDoubleClick` path.

---

#### Finding 8 — [info] Project-overview Store module row does not list Phase 5 additions

**Files:** `.flowcode/project/project-overview.md:65`

The Store module row in `project-overview.md` lists store actions as: `load, save, onConnect, toggleCollapsed, addComment, replyComment, resolveComment, buildBrief, applyResponse orchestration`. Phase 5 added `setNodePosition` and `relabelEdge` to the store interface (`store.ts:18-19`). The project-overview row has not been updated to reflect these two actions.

**Suggested fix:** Update the Store module row description to include `setNodePosition` and `relabelEdge`.

**Resolution:** fixed — the project-overview Store row now lists `onConnect`/`relabelEdge`/`setNodePosition` (with the `load` reconcile note); the Edge-component row updated to the implemented provenance styling.

---

## Check 2026-06-26 18:10 — Phase 4 (content-node design pass)

**Reviewer:** main agent (user design feedback → rework → headless-Chrome + CDP verification)
**Scope:** Content-node visual quality + 3 functional bugs the user caught: collapse not working, inline images only rendering for SVG, markdown + frontmatter not following the mockup direction (`components/canvas/canvas-markdown.tsx`, `components/canvas/nodes/markdown-node.tsx`, `image-node.tsx`, `note-node.tsx`, `link-node.tsx`, `lib/canvas/adapter.ts`, `lib/canvas/adapter.test.ts`, `app/globals.css`)
**Plan:** 001-initial-architecture
**Baseline conformance:** pass
**Gate outcome:** PASS
**Summary:** Reworked the content nodes to the mockup-04 direction and fixed three real defects. (1) **Collapse** now shrinks the card: markdown nodes are content-sized in the adapter (`height: undefined` + `--fc-body-max` clamp) instead of a fixed React-Flow box, and the collapse button carries `nodrag` so the click is never swallowed by the node drag handler. CDP-verified interactive toggle on the welcome card: height **388px (body shown) → 171px (body hidden) → 388px**. (2) **Inline images** work for all allowed types, not just SVG — the image node streams through `/api/asset` (PNG verified `content-type: image/png`, renders), and `CanvasMarkdown` now resolves embedded `![](relative.png)` against the file's directory through the asset API (previously they resolved against the page URL and 404'd). (3) **Markdown + frontmatter** follow the design system: muted mono keys with the color carried by a **semantic status chip** (lime=settled / cyan=in-flight / amber=caution) and **tag chips**; all frontmatter fields render (not just status/tags/description); mono-cyan headings, glowing square list bullets, cyan code chips, blockquotes, a type badge, and a fade-to-card body edge. Gates green: tsc 0 · lint 0 · build ok · vitest 9/9 (adapter test updated for the content-sized contract).

### Stack Gate

| Gate | Outcome | Notes |
|------|---------|-------|
| Typecheck | pass | `npx tsc --noEmit` — exit 0 |
| Lint | pass | `npm run lint` — exit 0 |
| Build | pass | `npm run build` — exit 0 |
| Unit | pass | `npx vitest run` — 9/9 (added a non-markdown-keeps-box assertion) |
| Visual | pass | headless-Chrome screenshots (default + redesign board) + CDP collapse toggle measured |

### Review Findings

#### Finding 6 — [high] Collapse toggle had no visible effect

**Files:** `lib/canvas/adapter.ts`, `components/canvas/nodes/markdown-node.tsx`

The adapter gave every node a fixed React-Flow `height`. Toggling `meta.collapsed` hid the body, but the node box kept its authored height, leaving empty space — so collapse looked broken. Clicks could also be intercepted by React Flow's drag handler.

**Resolution:** fixed — markdown nodes are content-sized (`height: undefined`, body clamped via `--fc-body-max`), so hiding the body shrinks the card; the toggle button has `nodrag`. CDP-measured 388→171→388 px.

#### Finding 7 — [high] Embedded markdown images only worked when externally hosted

**Files:** `components/canvas/canvas-markdown.tsx`

`react-markdown` rendered `![](diagram.png)` as `<img src="diagram.png">`, resolved against the page URL → 404. Only `http(s)`/SVG-by-coincidence cases worked.

**Resolution:** fixed — a custom `img` renderer rewrites relative srcs to `/api/asset?path=<dir>/<src>` (the guarded route), so any allowed image type renders inline. Verified with an embedded PNG.

#### Finding 8 — [medium] Frontmatter + markdown styling diverged from the approved mockup

**Files:** `components/canvas/nodes/markdown-node.tsx`, `app/globals.css`

Only `status`/`tags`/`description` were shown, keys were colored purple, and there were no status/tag chips or mockup-style body typography — flat and off-direction.

**Resolution:** fixed — render all frontmatter fields with muted keys + semantic status chip + tag chips; mono-cyan headings, glowing bullets, code chips, type badge, fade-to-card body per mockup 04. Screenshot-verified.

---

## Check 2026-06-26 17:40 — Phase 4 (visual re-verification)

**Reviewer:** main agent (headless-Chrome visual verification)
**Scope:** Phase 4 entry-point gap caught by the user ("nothing from Phase 4 is visible or working on the canvas") + fix (`components/canvas/canvas-shell.tsx`, `flowcanvas.canvas`, `examples/welcome.md`, `examples/schema.md`, `examples/architecture.svg`, `app/globals.css`)
**Plan:** 001-initial-architecture
**Baseline conformance:** pass
**Gate outcome:** PASS
**Summary:** The first Phase-4 close verified the API data path but never confirmed nodes render on the canvas — the deferred visual-parity check hid a real gap: a bare `localhost:3000` showed an **empty grid** because the shell only loaded a board when `?path` was present and no sample board shipped. Found the actual visual-capture tool **is** available (headless Google Chrome) and used it: confirmed the content nodes render correctly when a board loads, then fixed the entry point — load a default `flowcanvas.canvas` when no `?path`, ship the board + `examples/` content, and add a minimal empty/error overlay so a failed load is never a silent blank. Re-verified by screenshot: default board renders all node kinds (markdown table + body, inline image, link, note, fallback); bad `?path` renders the error card; no client console errors. All gates re-run green (tsc 0 · lint 0 · vitest 8/8 · build ok).

### Stack Gate

| Gate | Outcome | Notes |
|------|---------|-------|
| Typecheck | pass | `npx tsc --noEmit` — exit 0 |
| Lint | pass | `npm run lint` — exit 0 (fixed a `react-hooks/set-state-in-effect` error introduced by the first draft of the load effect) |
| Build | pass | `npm run build` — exit 0 |
| Unit | pass | `npx vitest run` — 8/8 |
| Visual | pass | headless Chrome screenshots: default board (all kinds render) + error state + no console errors |

### Review Findings

#### Finding 5 — [high] Phase 4 shipped no entry point — canvas empty out of the box

**Files:** `components/canvas/canvas-shell.tsx`

The shell loaded a board only when the URL carried `?path`, and no sample board shipped, so a fresh `npm run dev` + `localhost:3000` rendered an empty dot grid — "real content on the canvas" (the phase goal) was not reachable without hand-authoring a `.canvas` and knowing the internal `?path` contract. The first close missed this because visual verification was deferred (only the API data path was checked).

**Suggested fix:** Default to a shipped board when no `?path`; ship that board + its referenced content; show an empty/error state instead of a blank grid.

**Resolution:** fixed — `canvas-shell.tsx` resolves the path as `?path ?? 'flowcanvas.canvas'`; added the default board `flowcanvas.canvas` (2 md + 1 link + 1 note + 1 image) with `examples/welcome.md`/`schema.md`/`architecture.svg`; added the `.fc-empty` overlay (loading + "could not load" states). Screenshot-verified: default board renders out of the box; `?path=does-not-exist.canvas` → error card. Full empty-state/file-picker polish remains Phase 7.

---

## Check 2026-06-26 15:45 — Phase 4

**Reviewer:** flowcode:code-reviewer-agent
**Scope:** Phase 4 — Content Nodes (`components/canvas/canvas-markdown.tsx`, `components/canvas/nodes/markdown-node.tsx`, `components/canvas/nodes/image-node.tsx`, `components/canvas/nodes/link-node.tsx`, `components/canvas/nodes/note-node.tsx`, `lib/canvas/store.ts`, `components/canvas/canvas-shell.tsx`, `app/globals.css`)
**Plan:** 001-initial-architecture
**Baseline conformance:** pass (Finding-1 flag resolved — `project-overview.md § Node components` now lists `FallbackNode`)
**Gate outcome:** PASS
**Summary:** All four required Phase 4 gates pass (tsc exit 0 · vitest 8/8 · lint exit 0 · build exit 0). React correctness is sound: all four node components are wrapped in `memo`, handle setup is correct (4 sides, `type="source"`, `ConnectionMode.Loose`), `toggleCollapsed` is immutable and marks dirty, `store.load()` immutable refactor correctly maps to new node objects (resolving Phase-3 Finding 8), type casts are consistent, and all Phase-4 CSS anatomy classes are present and styled. The one medium finding (`group` and `file` nodeKinds left unregistered after `PlaceholderNode` removal) is **fixed in-phase** via a registered `FallbackNode` catch-all (see Finding 1 Resolution) — re-verified against a 6-node fixture board (group + non-md file) with all gates re-run green. Finding 3 (low, duplicate inline layout style in `link-node.tsx`) and Finding 4 (info, `bodyFor(id)` clarity) are also fixed. Finding 2 (low) is a planned Phase-5 `onNodesChange` gap, deferred. No unresolved `≥ medium` findings remain — phase is clear to flip to `done`.

### Stack Gate

| Gate | Outcome | Notes |
|------|---------|-------|
| Typecheck | pass | `npx tsc --noEmit` — exit 0 |
| Unit | pass | `npx vitest run` — 8/8 pass (Phase 2 adapter suite; no new Phase 4 test targets per plan) |
| Lint | pass | `npm run lint` — exit 0, 0 errors / 0 warnings |
| Build | pass | `npm run build` — exit 0; `/` static, all API routes dynamic |
| Dev boot | n/a | Browser environment not available in this session |
| Integration | n/a | Phase 4 scope |
| Coverage | n/a | Phase 4 scope |
| E2E | n/a | Phase 4 scope |

### Review Findings

#### Finding 1 — [medium] `group` and `file` nodeKinds unregistered after `PlaceholderNode` removal

**Files:** `components/canvas/canvas-shell.tsx:25-30`

Phase 2 registered `PlaceholderNode` for all five nodeKinds: `markdown`, `image`, `link`, `note`, `group`. Phase 4 replaces that with four real components but omits `group`. Additionally, `nodeKind()` (`lib/canvas/jsoncanvas.ts:253`) returns `'file'` for `type:'file'` nodes whose extension is neither `.md`/`.mdx` nor in `IMAGE_EXT` (e.g. `.pdf`, `.ts`). Neither `'group'` nor `'file'` is in the `nodeTypes` registry. React Flow v12 emits a "node type not found" console warning and renders a minimal empty fallback node for any such entry. `group` is a first-class JSONCanvas 1.0 node type; any board opened from Obsidian that uses grouping will render broken. This also diverges from `project-overview.md § Node components` module row, which lists five registered kinds against `components/canvas/nodes/*`.

**Suggested fix:** Register a lightweight fallback component for unhandled kinds. Retain a stripped-down `FallbackNode` (nyx glass card with the node's label or path, 4 handles, no extra chrome) and register it for both unhandled kinds: `group: FallbackNode, file: FallbackNode`. This prevents the React Flow warning and keeps the canvas usable. A full `GroupNode` with resize/background-style support can land in a later phase.

**Resolution:** fixed — added `components/canvas/nodes/fallback-node.tsx` (`memo`, nyx glass card, mono kind chip via `nodeKind` + `group.label`/filename, 4 `type="source"` handles) and registered it for both `group` and `file` in `canvas-shell.tsx` `nodeTypes`; `.fc-node--fallback`/`.fc-fallback__kind`/`.fc-fallback__label` styles added to `globals.css`. `project-overview.md § Node components` updated to list `FallbackNode` (closes the baseline-conformance flag). Verified live: a 6-node fixture board including a `group` and a non-md `.ts` `file` node loads (`GET / 200`, `GET /api/canvas 200`) with the catch-all kinds registered — no React Flow "node type not found" path. Gates re-run green (tsc 0 · lint 0 · vitest 8/8 · build ok).

---

#### Finding 2 — [low] Drag positions overwritten on any store update before Phase 5 `onNodesChange` wiring

**Files:** `components/canvas/canvas-shell.tsx:51-53`

The sync effects `useEffect(() => { setNodes(rfNodes) }, [rfNodes, setNodes])` (and the equivalent for edges) reset the React Flow controlled state to the store doc's values whenever `doc` changes reference. Phase 4 has no `onNodesChange` → store write-back, so any node drag the user performs lives only in local React Flow state. The next store update — including `toggleCollapsed` — changes the `doc` reference, which recomputes `rfNodes` from the un-updated positions in `doc`, and `setNodes(rfNodes)` resets all positions, discarding the drag. This is a planned Phase 5 gap: the plan explicitly lists `onNodesChange` wiring as a Phase 5 shell modification.

**Suggested fix:** No action required for Phase 4. When Phase 5 adds `onNodesChange`, write position updates back to the store doc before any `setNodes` sync fires — or only sync when the update comes from `load()`, not from local mutations like `toggleCollapsed`. Tracked as a known Phase-4 gap.

**Resolution:** deferred — Phase 5. Planned `onNodesChange` wiring will close this gap. Drag-position loss until then is an expected in-phase limitation.

---

#### Finding 3 — [low] Inline layout style in `link-node.tsx` duplicates `fc-node--link` CSS declarations

**Files:** `components/canvas/nodes/link-node.tsx:12`, `app/globals.css:179-184`

The `<div>` at line 12 sets `display: 'flex'` and `flexDirection: 'column'` via inline `style`. The CSS rule `.fc-node--link` (globals.css:179) already declares `display: flex; flex-direction: column;`. The inline values win over the class by specificity but are identical, so there is no visual difference. The redundancy scatters the layout contract across CSS and component code.

**Suggested fix:** Remove `display: 'flex'` and `flexDirection: 'column'` from the inline `style` on `link-node.tsx:12`. The CSS class already covers them; only `justifyContent: 'center'` and `padding: '12px 14px'` (absent from the CSS class) need to remain inline.

**Resolution:** fixed — removed `display: 'flex'` and `flexDirection: 'column'` from the `link-node.tsx` inline style; `.fc-node--link` already declares both. `justifyContent: 'center'` + `padding` (not in the class) remain inline.

---

#### Finding 4 — [info] `MarkdownNode` reads `node.id` via data cast for `bodyFor` when `id` from `NodeProps` is already in scope

**Files:** `components/canvas/nodes/markdown-node.tsx:11,15`

`id` is destructured from `NodeProps` at line 11 and used correctly for `toggle(id)` at line 22. The selector at line 15 uses `s.bodyFor(node.id)` where `node` comes from the `data as { node: FileNode }` cast. Since the adapter sets `id: n.id` (`adapter.ts:212`), `id === node.id` always holds — there is no bug. Using `node.id` requires reading through the data cast to verify equivalence; using the already-destructured `id` is clearer.

**Suggested fix:** Change line 15 to `const body = useCanvasStore((s) => s.bodyFor(id))` for consistency with how `toggle(id)` is called on line 22.

**Resolution:** fixed — `markdown-node.tsx` now reads `s.bodyFor(id)` using the destructured `NodeProps` `id`, consistent with `toggle(id)`.


## Check 2026-06-26 13:22 — Phase 3

**Reviewer:** flowcode:code-reviewer-agent
**Scope:** Phase 3 — Persistence & Resolve API (`lib/fs-guard.ts`, `lib/canvas/frontmatter.ts`, `app/api/canvas/route.ts`, `app/api/canvas/resolve/route.ts`, `app/api/asset/route.ts`, `app/api/file/route.ts`, `app/api/files/route.ts`, `app/api/upload/route.ts`, `lib/api.ts`, `lib/canvas/store.ts`)
**Plan:** 001-initial-architecture
**Baseline conformance:** flagged (2)
**Gate outcome:** PASS
**Summary:** All six provided gates pass (tsc · vitest 8/8 · lint · build · dev-boot · curl acceptance). The traversal guard correctly blocks `../`, absolute paths, and prefix-collision attacks. The one medium finding — `GET /api/files` missing the ENOENT→404 branch required by `error-handling.md` — has been **fixed in-phase** (ENOENT→404 added; curl-verified 404/400/200) so the phase is clear to flip to `done`. Of the five low findings: F2 (canvas-POST `mkdir`) and F4 (symlink docstring) fixed in code, F3 (resolve per-item contract) and F6 (project-overview `/api/upload` row) fixed in the design/overview docs, and F5 (`updatedAt` echo) deferred to Phase 7 with no Phase-3 impact. The two info findings (intentional deviations sound; Zustand in-place mutation) are accepted/deferred-to-Phase-4. No unresolved `≥ medium` findings remain.

### Stack Gate

| Gate | Outcome | Notes |
|------|---------|-------|
| Typecheck | pass | `npx tsc --noEmit` — exit 0 |
| Unit | pass | `npx vitest run` — 8/8 pass (adapter suite; no new Phase 3 tests) |
| Lint | pass | `npm run lint` — exit 0, 0 errors / 0 warnings |
| Build | pass | `npm run build` — exit 0; all routes registered as dynamic functions |
| Dev boot | pass | `GET / 200`, all routes compiled and served |
| Acceptance | pass | curl-verified: canvas GET→POST (revision 1→2); resolve; asset `image/png`; files listing; upload; `/api/file` |
| Integration | n/a | curl acceptance covers the API boundary |
| Coverage | n/a | Phase 3 scope |
| E2E | n/a | Phase 3 scope |

### Review Findings

#### Finding 1 — [medium] `GET /api/files` missing ENOENT→404 branch

**Files:** `app/api/files/route.ts:16-19`

`readdir` throws `ENOENT` when the requested directory does not exist. The catch block handles only `GuardError`→400 and falls through to `String(e)`→500 for all other errors. A client requesting a non-existent directory path receives a 500 that it cannot distinguish from a server fault. `error-handling.md` mandates the tri-branch `GuardError`→400 / `ENOENT`→404 / else→500 pattern on every route handler — "Do not vary from this mapping per route." This is the only GET route missing the ENOENT branch.

**Suggested fix:** Insert `if ((e as NodeJS.ErrnoException).code === 'ENOENT') return NextResponse.json({ error: 'not found' }, { status: 404 })` between the `GuardError` catch and the fallback at `route.ts:17-18`.

**Resolution:** fixed — added the `ENOENT`→404 branch to `app/api/files/route.ts`, so the route now follows the full `error-handling.md` tri-branch mapping (400/404/500) like every other route. Curl-verified: non-existent dir → 404, `..` traversal → 400, valid dir → 200. Gates re-run green (tsc 0 · lint 0 · build ok · vitest 8/8).

---

#### Finding 2 — [low] `POST /api/canvas` has no `mkdir` call and no ENOENT catch on write

**Files:** `app/api/canvas/route.ts:27`, `app/api/canvas/route.ts:29-31`

`writeFile(guardPath(rel), …)` is called without a prior `mkdir({ recursive: true })`. If the parent directory of the target `.canvas` path does not exist, `writeFile` throws `ENOENT`, which falls through to the 500 branch (no ENOENT catch on the POST handler). Both `app/api/file/route.ts:12` and `app/api/upload/route.ts:22` call `mkdir(path.dirname(abs), { recursive: true })` before writing; the canvas route does not. The design contract for `POST /api/canvas` does not list a 404, but returning 500 for a missing parent directory misleads callers into treating a client-path error as a server fault.

**Suggested fix:** Add `await mkdir(path.dirname(abs), { recursive: true })` before `writeFile`, mirroring `/api/file`. Requires adding `mkdir` to the `node:fs/promises` import on line 2.

**Resolution:** fixed — `POST /api/canvas` now resolves `abs = guardPath(rel)`, calls `mkdir(path.dirname(abs), { recursive: true })`, then writes; `mkdir` + `node:path` added to the imports. All three write routes (`canvas`, `file`, `upload`) are now uniform. Curl-verified: POST into a fresh nested dir (`.tmp/sub/board.canvas`) → 200 and the path is created. *(Plan snippet left as the illustrative copy-adaptable source; this is a one-line hardening recorded as a Phase-3 deviation.)*

---

#### Finding 3 — [low] `POST /api/canvas/resolve` always returns 200 for traversal attempts

**Files:** `app/api/canvas/resolve/route.ts:13-15`

The design contract (`001-initial-architecture-design.md § API / Interface Contracts`) specifies "→ 400 any path outside root" for this route. The implementation catches `GuardError` per-item and returns `{ exists: false, error: '…' }` inside the 200 body — the HTTP status is always 200. Per-item error handling is better practice for a batch API (one bad path does not abort the batch), but it deviates from the documented contract. Callers relying on HTTP status to detect traversal will not receive a 400.

**Suggested fix:** Update the design contract to reflect per-item error handling as the canonical behavior for this batch route, removing the "→ 400" status line. Option B (a pre-pass guard returning 400) is stricter but over-complicates a batch route and is unnecessary here since the traversal is blocked per-item.

**Resolution:** fixed (design) — replaced the `→ 400 any path outside root` line in `001-initial-architecture-design.md § API / Interface Contracts` with a note that this batch route surfaces per-item errors (outside root, not found) as `{ exists:false, error }` inside the 200 body, so one bad path never aborts the batch. The implementation's per-item resilience is the canonical contract; the code/design contradiction is removed.

---

#### Finding 4 — [low] `guardPath` docstring overclaims: symlinks are not dereferenced

**Files:** `lib/fs-guard.ts:9`

The JSDoc says the guard rejects "symlink-style climbs." `path.resolve()` is purely lexical — it normalises `..` tokens in the string path but does not call `realpath` or follow filesystem symlinks. A symlink created inside `FLOWCANVAS_ROOT` that points outside ROOT passes the string check, allowing `readFile`/`writeFile` to access the symlink target. Low severity for a local-only tool with trusted users only, but the docstring overclaims.

**Suggested fix:** Change the last sentence of the JSDoc to: "Lexical normalization only — `../` and absolute paths are blocked; filesystem symlinks are not dereferenced."

**Resolution:** fixed — `guardPath` JSDoc reworded to "Lexical normalization only — `../` and absolute paths are blocked; filesystem symlinks are not dereferenced." The docstring no longer overclaims. (Symlink dereferencing is out of scope for a local-only, trusted-user tool; left as a known limitation, not a Phase-3 gap.)

---

#### Finding 5 — [low] `store.save()` does not echo server-assigned `updatedAt` back to the in-memory doc

**Files:** `lib/canvas/store.ts:34`, `app/api/canvas/route.ts:26`

The POST route sets `doc.flowcanvas.session.updatedAt = new Date().toISOString()` before writing the file, but the response body only carries `{ ok, revision }`. `store.save()` assigns the returned `revision` to the local doc at line 34 but leaves `updatedAt` at its pre-save value. The in-memory doc and the on-disk file diverge on `updatedAt` until the next `load()`. No component currently displays `updatedAt`, so there is no functional impact in Phase 3; Phase 7's session display (title, updatedAt) will surface this.

**Suggested fix:** Extend the POST response to `{ ok: true, revision: number, updatedAt: string }` and update `saveCanvas` + `store.save()` to assign both fields. Alternatively, compute `updatedAt = new Date().toISOString()` on the client before calling `saveCanvas`, set it locally, and pass the same value in the body so the server uses it unchanged.

**Resolution:** deferred — Phase 7. No Phase-3 functional impact (nothing renders `updatedAt`, and the in-memory value re-syncs on the next `load()`). Phase 7 ("Agent Round-Trip & Polish") adds the session/save UI that surfaces `updatedAt`; the POST response will echo the server `updatedAt` there. Tracked in the Phase 3 log Deviations.

---

#### Finding 6 — [low] Project-overview API module row omits `/api/upload` and miscounts routes

**Files:** `.flowcode/project/project-overview.md:72`

The API module row lists the handlers as `{canvas,canvas/resolve,asset,file,files,render}` and describes "Six guarded Node-runtime Route Handlers." Phase 3 created `app/api/upload/route.ts` as a seventh route (the drag-drop upload, declared as a UI-design scope addition in `001-initial-architecture-design.md § Scope`). The module description is out of sync with the shipped code.

**Suggested fix:** Update the API module row path list to `{canvas,canvas/resolve,asset,file,files,upload,render}` and change "Six" to "Seven" in the description.

**Resolution:** fixed — `project-overview.md` API row updated to `{canvas,canvas/resolve,asset,file,files,upload,render}` / "Seven guarded … Route Handlers", with notes that `canvas/resolve` surfaces per-item errors in its 200 body and `render` is still pending (Phase 7); status flipped to "partial (six live — Phase 3; render pending)". The FS-guard row was also flipped from "pending" to "live — Phase 3".

---

#### Finding 7 — [info] Three intentional deviations are all sound

**Files:** `app/api/file/route.ts:6`, `app/api/upload/route.ts:7-8`, `app/api/canvas/resolve/route.ts:6`

The three declared deviations from the plan/design text:

1. `.mdx` accepted in `/api/file` and `/api/upload` — consistent with `nodeKind()` at `lib/canvas/jsoncanvas.ts:253` treating `.mdx` as markdown, the resolve route's `/\.mdx?$/` at line 6, and the design's explicit `MARKDOWN_EXT : .md .mdx` enum constant. Not a real deviation.
2. `mkdir({ recursive: true })` before writes in `/api/file` and `/api/upload` — safe (called after `guardPath`), prevents ENOENT for nested agent-generated paths. Improvement over the plan.
3. `lib/api.ts` and `lib/canvas/store.ts` verbatim from plan snippets — both implementations are correct; all typed fetch wrappers match design § API / Interface Contracts.

No action required.

**Resolution:** accepted — all three are spec-consistent or improvements.

---

#### Finding 8 — [info] `store.load()` mutates node objects in-place before calling `set()`

**Files:** `lib/canvas/store.ts:27`

`n.meta = { ...n.meta, frontmatter: r.frontmatter }` mutates the node objects inside the freshly-API-fetched `doc` before `set({ path, doc, bodies, dirty: false })`. No subscriber holds a reference to the new `doc` yet (it was just constructed from the network response), so there is no stale-render risk in Phase 3. In Phase 4+, when components use `useCanvasStore(s => s.doc)` and depend on object-reference change detection, mutations to `doc.nodes[i]` without changing the `doc` reference will not be detected by shallow selectors. The preferred Zustand idiom is to produce a new array before calling `set()`.

**Suggested fix:** No action required for Phase 3. When Phase 4 adds reactive `doc.nodes` subscriptions, refactor `load()` to produce a new nodes array: `const nodes = doc.nodes.map(n => { const r = byPath.get(isFileNode(n) ? n.file : ''); return (isFileNode(n) && nodeKind(n) === 'markdown' && r) ? { ...n, meta: { ...n.meta, frontmatter: r.frontmatter } } : n })` and pass `{ ...doc, nodes }` to `set()`.

**Resolution:** deferred — note for Phase 4.


## Check 2026-06-26 14:00 — Phase 2

**Reviewer:** flowcode:code-reviewer-agent
**Scope:** Phase 2 — Schema, Adapter & Empty Canvas (`lib/canvas/jsoncanvas.ts`, `lib/canvas/adapter.ts`, `lib/canvas/adapter.test.ts`, `components/canvas/canvas-shell.tsx`)
**Plan:** 001-initial-architecture
**Baseline conformance:** pass
**Gate outcome:** PASS
**Summary:** All four required Phase 2 gates pass (tsc · vitest 7/7 · lint · build). Schema is verbatim from design § Data Models; three deliberate adapter/shell divergences from the plan snippet are each improvements over the source text. One medium finding — edge property loss in `toJSONCanvas` — must carry a resolution before Phase 3 (persistence) ships; the phase is not clear to flip to `done` until that resolution field is filled.

### Stack Gate

| Gate | Outcome | Notes |
|------|---------|-------|
| Typecheck | pass | `npx tsc --noEmit` — exit 0 |
| Unit | pass | `npx vitest run` — 7/7 pass |
| Lint | pass | `npm run lint` — exit 0 |
| Build | pass | `npm run build` — exit 0 |
| Dev boot | pass | `GET / 200`, no server errors, two seeded nodes rendered |
| Integration | n/a | Phase 2 — no API routes yet |
| Coverage | n/a | Phase 2 scope |
| E2E | n/a | Phase 2 scope |

### Review Findings

#### Finding 1 — [medium] `toJSONCanvas` silently drops edge `color`, `fromEnd`, and truthful `toEnd` on every round-trip

**Files:** `lib/canvas/adapter.ts:36-41`

`toJSONCanvas` rebuilds edges entirely from RF state without consulting `prev.edges`. `CanvasEdge.color`, `CanvasEdge.fromEnd`, and the original `toEnd` (hardcoded to `'arrow'` at line 40) are never restored. The `prevById` pattern used for nodes — which spreads `{ ...base, ... }` so all node properties survive a drag — has no equivalent for edges. When Phase 3 persistence goes live, every save cycle will silently erase edge colors and `fromEnd` from the `.canvas` file. The test fixture contains one colored edge (`color: '6'` on `lk:n-design->n-plan`), but the round-trip assertions only check `origin`; the color loss passes silently.

**Suggested fix:** Mirror the node pattern — add `const prevEdgeById = new Map(prev.edges.map((e) => [e.id, e]))` before the edge map, then spread: `...( prevEdgeById.get(re.id) ?? {} ), fromNode: re.source, toNode: re.target, fromSide: ..., toSide: ..., label: ..., meta: { origin: ... }`. This restores `color`, `fromEnd`, and the source `toEnd` from the stored doc. Extend the round-trip test with a `color` assertion on the edge.

**Resolution:** fixed — `toJSONCanvas` now builds `prevEdgeById` and spreads the prior edge (`{ ...base, … }`) so `color`/`fromEnd` survive, `toEnd` is `base?.toEnd ?? 'arrow'` (no longer hardcoded), and `meta.origin` falls back to the stored origin. Added a `preserves edge color/toEnd …` round-trip test asserting `color: '6'`, `toEnd: 'arrow'`, and handle sides on `lk:n-design->n-plan`. Gates re-run green (tsc 0 · vitest 8/8 · lint 0 · build ok).

---

#### Finding 2 — [low] Seed `SessionMeta` uses empty strings for required ISO 8601 date fields

**Files:** `components/canvas/canvas-shell.tsx:81`

`SEED_DOC.flowcanvas.session` sets `createdAt: ''` and `updatedAt: ''`. `SessionMeta` documents these as ISO 8601 strings; the design's worked-example JSON and the Phase 3 route handler both assign real ISO values. Phase 3 or later code that parses these dates or evaluates concurrency tokens on them will encounter empty strings. Phase 4 removes this seed entirely, so blast radius is limited, but the sentinel is semantically wrong.

**Suggested fix:** Replace with `'1970-01-01T00:00:00.000Z'` (epoch) or add an inline comment `// Phase 2 seed — placeholder; removed in Phase 4`.

**Resolution:** fixed — seed `session.createdAt`/`updatedAt` now carry real ISO values (`'2026-06-26T00:00:00Z'`); the surrounding comment already states the seed is removed in Phase 4.

---

#### Finding 3 — [low] `colorVar` test verifies only presets `'5'` and `'6'`; four presets untested

**Files:** `lib/canvas/adapter.test.ts:37-38`

The test block asserts `colorVar('5') === '#5ef2ff'` and `colorVar('6') === '#a371f7'` but leaves presets `'1'`–`'4'` unexercised. The `PRESET` hex values (`#ff516a`, `#f59f00`, `#e3b341`, `#b6f36a`) are the nyx accent palette; preset `'6'` is specifically used on `links` edges (`deriveLinkEdges` in Phase 5) and preset `'5'` on the seed node. A transposition in any untested entry would go undetected until visual inspection.

**Suggested fix:** Extend the existing `'resolves JSONCanvas presets'` test with four additional `expect` lines covering presets `'1'` through `'4'`, matching the `PRESET` map in `adapter.ts`.

**Resolution:** fixed — the `colorVar` test now asserts all six presets (`'1'`→`#ff516a` … `'6'`→`#a371f7`) plus hex passthrough and `undefined`.

---

#### Finding 4 — [info] `adapter.ts` imports a runtime value from `@xyflow/react`; project-overview "pure lib" rule needs a one-line clarification

**Files:** `lib/canvas/adapter.ts:1`, `.flowcode/project/project-overview.md`

`project-overview.md § Code Style & Conventions` states: "`lib/canvas/*` modules are pure TypeScript (no DOM, no React)." `adapter.ts` imports `MarkerType` from `@xyflow/react` as a runtime enum value (used at line 23: `{ type: MarkerType.ArrowClosed }`). The adapter's RF dependency is correct and declared in the module-boundaries table; the project-overview rule was intended for the data-only modules (`jsoncanvas.ts`, `edges.ts`, `brief.ts`). Future authors might interpret the rule as prohibiting any `@xyflow/react` usage in `lib/canvas/`.

**Suggested fix:** Append a parenthetical to the rule: "…pure TypeScript (no DOM, no React) — except `adapter.ts`, whose sole responsibility is React Flow translation."

**Resolution:** fixed — `project-overview.md § Code Style & Conventions` "Pure vs. impure split" rule now carries an explicit `adapter.ts` exception (type-only imports + `MarkerType` enum, DOM-free, still under the vitest gate).

---

#### Finding 5 — [info] Three deliberate plan-snippet divergences — all assessed as improvements

**Files:** `lib/canvas/adapter.ts:2,16,40`, `components/canvas/canvas-shell.tsx:60-66`

Three intentional departures from the plan's code snippets; the plan has been updated to match in the same edit:

1. `import type { CSSProperties } from 'react'` + `as CSSProperties` (`adapter.ts:2,16`) — the plan wrote `as React.CSSProperties` with no React import, which does not compile in a `.ts` module. The implementation's fix is correct.

2. `(re.data as { origin?: EdgeOrigin } | undefined)?.origin` (`adapter.ts:40`) — the plan had `(re.data as { origin?: CanvasEdge['meta'] })?.origin as never`, which mistypes `origin` as the entire `meta` object and uses `as never` to suppress the resulting error. The implementation's explicit `EdgeOrigin` cast is type-honest.

3. `nodeTypes` registers `PlaceholderNode` for all five node kinds (`canvas-shell.tsx:60-66`) — the plan showed `nodeTypes = {}`, but an empty registry causes React Flow v12 to log "node type not found" for every seeded node and render empty fallback boxes, failing acceptance criterion 2. The placeholder is clearly documented with Phase 4 removal scope.

All three are improvements. No action required beyond the plan updates already applied.

**Resolution:** accepted — plan updated to match.

## Check 2026-06-26 00:00 — Phase 1

**Reviewer:** flowcode:code-reviewer-agent
**Scope:** Phase 1 — Project Bootstrap & nyx Visual Foundation (`package.json`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `components/canvas/canvas-shell.tsx`, `lib/utils.ts`, `vitest.config.ts`, `eslint.config.mjs`)
**Plan:** 001-initial-architecture
**Baseline conformance:** pass
**Gate outcome:** PASS
**Summary:** All three required Phase 1 gates pass clean. The nyx token set is reproduced verbatim from the design spec, fonts load locally, SSR is guarded, and the placeholder shell renders without issue. Five advisory findings (0 critical, 0 high, 0 medium, 2 low, 3 info) require no blocking action before Phase 2.

### Stack Gate

| Gate | Outcome | Notes |
|------|---------|-------|
| Typecheck | pass | `npx tsc --noEmit` — exit 0, 0 errors |
| Lint | pass | `npm run lint` (eslint) — exit 0, 0 errors / 0 warnings |
| Build | pass | `npm run build` (next build, Turbopack) — exit 0, static route `/` generated |
| Unit tests | n/a | Phase 1 — no pure modules; first unit target is Phase 2 (`adapter.test.ts`) |
| Integration | n/a | Phase 1 scope |
| Coverage | n/a | Phase 1 scope |
| E2E | n/a | Phase 1 scope |

### Review Findings

#### Finding 1 — [low] `aria-label` on swatch `<span>` elements has no ARIA effect without a role

**Files:** `components/canvas/canvas-shell.tsx:72`

`<span>` is a generic, non-interactive element with no implicit ARIA role. An `aria-label` attribute on a roleless `<span>` is not surfaced to assistive technology — the annotation is silently ignored. The `title` attribute on line 73 provides a tooltip but no screen-reader label.

**Suggested fix:** Add `role="img"` to each swatch span so the `aria-label` is exposed: `<span role="img" aria-label={s.label} title={s.label} ...>`. This is consistent with how decorative color swatches are typically annotated.

**Resolution:**

---

#### Finding 2 — [low] `vitest` version deviates from plan spec without a plan annotation

**Files:** `package.json:44`

The plan's `devDependencies` block (Phase 1 code example) declares `"vitest": "^2"`, but the installed version is `^4.1.9`. The plan already carries a `<!-- Phase-1 reality: … -->` comment annotating other spec deviations (`@types/uuid` dropped, `rehype-shiki` → `@shikijs/rehype`, Next 16 not 15). The vitest `^4` bump is not yet annotated there.

**Suggested fix:** Append a note to the `<!-- Phase-1 reality: … -->` comment in Phase 1 of `001-initial-architecture-plan.md`: `vitest ^2 → ^4.1.9 (latest stable at install time; API is backward-compatible for the Phase 2–7 test patterns used here)`.

**Resolution:**

---

#### Finding 3 — [info] `body` inline `fontFamily` references `--font-geist-sans` directly instead of the canonical `--font-sans` token

**Files:** `app/layout.tsx:21`

The body style uses `fontFamily: 'var(--font-geist-sans)'` — the Next.js local-font variable emitted by `GeistSans.variable`. The design system's `@theme` in `globals.css:27` establishes `--font-sans` as the canonical alias (`--font-sans: var(--font-geist-sans)`). Both resolve identically at runtime, but using the raw internal variable couples the layout to the font-loading mechanism rather than the design token surface.

**Suggested fix:** Change to `fontFamily: 'var(--font-sans)'` to consume the design token. If the `@theme` alias ever changes (e.g. swapping from geist to another local font), only `globals.css` needs updating.

**Resolution:** deferred — acceptable for Phase 1; both paths are runtime-equivalent and the token alias is defined. Revisit if the font strategy changes.

---

#### Finding 4 — [info] Swatch labeled "rose" showcases `--color-tertiary-cont` (#ff516a) rather than `--color-neon-rose` (#ff8fb0)

**Files:** `components/canvas/canvas-shell.tsx:13`

The `SWATCHES` array labels the fifth swatch "rose" but binds it to `--color-tertiary-cont` (destructive/comment red, #ff516a). The token `--color-neon-rose: #ff8fb0` (soft neon pink, defined in `globals.css:24`) is never showcased. This is a Phase 1 placeholder; Phase 2 replaces the entire shell. No functional impact.

**Suggested fix:** No action needed before Phase 2. If the placeholder is kept longer, rename the swatch label to `'destructive'` for semantic accuracy, or swap the var to `'--color-neon-rose'` to showcase the neon palette entry.

**Resolution:** deferred — Phase 2 replaces this component.

---

#### Finding 5 — [info] Visual parity — capture deferred to Phase 2

**Files:** `mockups/04-nyx-neon.html` (reference, not changed)

Phase 1 ships only the void, token, and font foundation — there are no nodes, edges, comments, or canvas chrome to compare against the approved mockup. The Phase 1 visual-parity table in `001-initial-architecture-ui-design.md` is intentionally blank. A browser-capture MCP is not available in this environment.

**Suggested fix:** No action. Visual parity comparison against `mockups/04-nyx-neon.html` is scheduled at Phase 2 close (canvas surface, dot grid, glass nodes visible).

**Resolution:** deferred — Phase 2 visual-parity.

---

<!-- Older QA runs continue below. New runs are prepended above this line, directly under the file header. Never rewrite prior sections. -->

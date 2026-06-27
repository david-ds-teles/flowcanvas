---
name: 001-initial-architecture-test-notes
description: Test notes for 001-initial-architecture (Flowcanvas v0.1) — coverage summary, new tests, manual/CDP scenarios, and known gaps generated at plan close.
status: complete
tags: [test-notes, testing, coverage]
links: [.flowcode/plans/001-initial-architecture/001-initial-architecture-plan.md, .flowcode/plans/001-initial-architecture/001-initial-architecture-technical-overview.md]
---

# Test Notes — 001-initial-architecture Flowcanvas v0.1

- Posture: the **pure logic modules** (schema adapter incl. group abs↔rel, edge derivation/reconciliation, comment anchor math, the store's mutations incl. grouping/layout, the agent brief/merge, the ELK layout) are unit-tested with `vitest` — 79/79 green (Phase 8 hardened from 56/56; Phase 10 +13: adapter group conversion, store selection/grouping/bulk-layout, ELK `computeLayout`); the **interactive UI + fs routes** are verified out-of-process (headless-Chrome CDP driver + `curl`), since React Flow drag/handle/measure/selection and Next route handlers don't run in the jsdom-free node test env. Phase 9–10 UI (toolbar rail, `<FrontmatterView>`, reader, group/ungroup/re-organize, BoardDialog) is verified by CDP — no unit tests for the toolbar flyout/state, `<FrontmatterView>`, or `<BoardDialog>` (known test gaps).
- Status complete; plan closed 2026-06-27; 10 phases delivered.
- Source plan: `001-initial-architecture-plan.md`; derived from `001-initial-architecture-technical-overview.md`.

---

## Test Coverage Summary

| Layer | Framework | Files Added | Coverage | Notes |
|-------|-----------|-------------|----------|-------|
| Unit | vitest | 6 (`adapter`, `edges`, `comments`, `store`, `brief`, `layout`) | 79 tests, 100% pass (Phase 8 +10 store; Phase 10 +5 adapter, +5 store, +3 layout) | All pure `lib/canvas/*` logic; no jsdom — store exercised directly against zustand outside React |
| Integration | curl + headless Chrome (CDP) | 0 test files (out-of-process) | route + flow verified | 8 fs routes (200/400/404 guard cases) + the interactive canvas flows (Phase 9 CDP 7/7; Phase 10 CDP: multi-select→group→ungroup, re-organize, save-as round-trip, open/save dialogs) |
| E2E | — | — | n/a | No e2e harness declared; the CDP driver is the interactive substitute |

**No coverage % tooling** is configured (`vitest run` without `--coverage`); counts are test-case counts, not line coverage.

---

## New Tests Added

| Test File | What It Tests | Type | Key Scenarios |
|-----------|--------------|------|--------------|
| `lib/canvas/adapter.test.ts` | `toReactFlow` / `toJSONCanvas` / `colorVar` | unit (9) | kind discrimination, geometry, `meta`/`color`/`origin` round-trip, all 6 presets, session pass-through |
| `lib/canvas/edges.test.ts` | `deriveLinkEdges` / `reconcileEdges` | unit (11) | derive from `links:`, dedup vs manual, stale removal, self-link/unresolved/scalar/non-string-entry guards |
| `lib/canvas/comments.test.ts` | `anchorForPoint` / `anchorToFlowPoint` | unit (9) | hit-test, top-most, clamping 0..1, projection round-trip, missing-node |
| `lib/canvas/store.test.ts` | store mutations (zustand, no React) | unit (18) | `onConnect` mint + self-reject + missing-endpoint, `setEditingEdge`, `relabelEdge` (links→user promotion; user/agent unchanged), `setNodePosition`, `setMode`, `addNode` (+ no-doc no-op), comments (badge sequence, reply anchor copy, resolve no-op cases, immutability) |
| `lib/canvas/brief.test.ts` | `buildBrief` / `applyResponse` (8-step merge) | unit (9) | build shape (frontmatter/body/url/text/edges/comments/intent + empty-intent fallback), create node+edge+reply, **idempotent double-apply**, id-less reply content-signature dedup, id-less edge directed-pair skip, stale-flag, removals, update-by-id |
| `lib/canvas/store.test.ts` (Phase 8 additions) | `onConnect` rework + `removeEdgeWriteback` | unit (+10 → store total 28) | `onConnect` file↔file: mints `lk:` links edge + asserts `patchLinks('b.md',{add:['a.md']})`; already-linked no-op; non-file pair mints `user` edge; missing-endpoint guard; self-connect guard. `removeEdgeWriteback`: file↔file removes edge + calls `patchLinks(remove)`; non-file removes without patch; unknown-id no-op. `beforeEach` resets `readerSize` + `editingEdgeId`. `../api` mocked via `vi.mock` (patchLinks stub). |
| (Phase 9 — no new vitest files) | toolbar flyout state machine + `<FrontmatterView>` | — | Phase 9 added no unit tests for the toolbar flyout state machine (`canvas-toolbar.tsx`) or `<FrontmatterView>` (`frontmatter-view.tsx`); these are interactive/visual concerns verified by CDP visual-parity (7/7 captures, `mockups/captures/phase-9/`) — see Known Gaps. |
| `lib/canvas/adapter.test.ts` (Phase 10) | group-container abs↔rel conversion | unit (+5 → adapter 14) | parent-before-child ordering, child position relative-to-parent + `extent:'parent'`, top-level stays absolute, dangling `parentId` degrades to top-level, abs↔rel round-trip preserves a parented child's absolute coords + `parentId` |
| `lib/canvas/store.test.ts` (Phase 10) | selection + grouping + bulk layout | unit (+5 → store 33) | `setSelection` set + equality-guard (same reference on identical re-set) + clear; `groupSelection` container bounds(+PAD)/membership/group-selected/no-op for <2 or already-grouped; `ungroup` removes container + clears children parentId + children unmoved; `applyLayout` writes named nodes only |
| `lib/canvas/layout.test.ts` (Phase 10, new) | ELK `computeLayout` | unit (3) | top-level-only output (grouped children excluded), finite coordinates, non-overlapping arrangement using measured heights |

---

## Manual Test Scenarios

Interactive flows verified via the pure-Node CDP driver (`mockups/captures/phase-7/`) and `curl`; React Flow handle-drag and multipart upload are impractical to unit-test.

| # | Scenario | Steps | Expected Result | Tested |
|---|----------|-------|----------------|--------|
| 1 | Board loads with full chrome | open `?path=<board>.canvas` | toolbar + 9 controls, nodes, edges, comment pins, minimap | [x] CDP 18/18 |
| 2 | Mode switching | click connect / comment | `aria-pressed` + `.fc-rf--connect` / comment-layer `data-mode` | [x] CDP |
| 3 | Add a node + save | `+ Add ▾` → Note; ⌘S/Save | node count +1, dirty dot appears then clears | [x] CDP |
| 4 | Reader drawer | click a markdown node | drawer opens, shiki prose renders, `reader-close` works | [x] CDP + curl shiki |
| 5 | Agent export | Export tab | DesignBrief JSON with embedded frontmatter/body/responseContract; Copy/Download | [x] CDP |
| 6 | Agent import (idempotent + stale) | paste AgentResponse → Apply | merge report; mismatched briefId → stale banner; node created + `.md` written | [x] CDP |
| 7 | fs route guards | `curl` `../` traversal + non-md | 400 (traversal/disallowed), 404 (ENOENT) | [x] curl (Phases 3 + 7) |
| 8 | Drag-drop upload | drop image/`.md` onto canvas | bytes written, image/markdown node added at drop point | [ ] not driven by CDP (DataTransfer file injection); route + `addFileNode` path tested via the toolbar-upload + import equivalents |
| 9 | `links:` write-back (add) | connect two markdown file nodes | `patchLinks(add)` fires; source file's `links:` updated; board reload produces no duplicate edge | [x] curl `POST /api/canvas/links` (add) + body-preservation verified |
| 10 | `links:` write-back (remove) | Delete/Backspace on a file↔file edge | `removeEdgeWriteback` fires; edge removed; `patchLinks(remove)` fires; source file's `links:` updated | [x] curl `POST /api/canvas/links` (remove) + 400/400/404 guard cases |
| 11 | Reader 3-size control | click Drawer/Half/Full in reader segmented control; click `⤢` on a markdown node | reader width changes to 440 px / 50 vw / 100 vw; `⤢` triggers Full directly via `maximizeReader` | [x] CDP Phase 8 (9/9) |
| 12 | Smoothstep edges + nyx controls | load board | edges render with rounded corners (borderRadius 8); minimap hex colors correct; controls panel styled via `.react-flow ` cascade override | [x] CDP Phase 8 (9/9) |
| 13 | Toolbar single-rail | load board | direct icon buttons visible; Shape flyout opens with 3 shape options; `[File ▾]` reveals Upload/Import/Export; group/ungroup/reorganize buttons are visually disabled; below 1024 px `+ Add ▾` fallback appears | [x] CDP Phase 9 (09-loaded, 09-shape-menu, 09-file-menu) |
| 14 | FrontmatterView — card variant | open board with markdown nodes | node cards show status pill + tag chips + link chips + kv grid; empty frontmatter shows no `fc-fm` wrapper | [x] CDP Phase 9 (09-loaded) |
| 15 | FrontmatterView — reader variant | click a markdown node to open reader | sticky frontmatter bar renders above shiki prose; empty-frontmatter node shows no bar; bar is opaque (`--color-surface-lowest`) | [x] CDP Phase 9 (09-reader-drawer, 09-reader-half, 09-reader-full) |
| 16 | Reader readability overhaul | open reader on a markdown node | prose is 17 px / 1.72 / ≤66ch centered; headings sans-weight; inline code styled without disturbing shiki fenced blocks | [x] CDP Phase 9 (09-reader-drawer) |
| 17 | Load .json… import + brief detection | Import tab → Load .json…; select a saved AgentResponse file; also test pasting DesignBrief | file text flows into paste box; Apply proceeds normally; if a DesignBrief is pasted, an explanatory message appears before Apply | [x] CDP Phase 9 (09-agent-import) |
| 18 | GroupNode shape + resize + label | add Shape node; resize it; click shape switcher; double-click label; select / deselect | SVG outline renders as rectangle/ellipse/diamond; NodeResizer handles appear on select; shape switcher changes outline; label edits inline; dashed-indigo outline at rest, solid-glow when selected; selection ring absent (shape manages own highlight) | [x] CDP Phase 9 (09-shape-menu) |
| 19 | NoteNode inline editing | double-click a note body | textarea replaces CanvasMarkdown; commit on blur/⌘Enter updates text; Esc restores prior text | [x] CDP Phase 9 |
| 20 | Multi-select + Group (Phase 10) | click a node, ⌘-click a second, click Group | selection 1→2; Group button enables; a new group container appears around both (group count +1) | [x] CDP Phase 10 (10-multiselect, 10-grouped) |
| 21 | Ungroup (Phase 10) | select the container by its padding corner, click Ungroup | Ungroup button enables; container dissolves (group count back to baseline); children stay in place | [x] CDP Phase 10 (10-ungrouped) |
| 22 | Re-organize (Phase 10) | click Re-organize | button spins (`is-busy`); all nodes reposition to a layered non-overlapping layout; view fits | [x] CDP Phase 10 (10-reorganized — all 8 nodes moved) |
| 23 | Save-as round-trip (Phase 10) | `[File ▾]` → Save as…; type a name; Save | dialog browses tree + filename input; file written under root; URL adopts `?path=` (no reload); dialog closes | [x] CDP Phase 10 (wrote file + URL `?path=_phase10_smoke.canvas`) |
| 24 | Open board (Phase 10) | `[File ▾]` → Open board… | `.canvas`-filtered browse modal opens (`data-mode="open"`); selecting a board with unsaved edits shows an inline discard-guard | [x] CDP Phase 10 (10-board-open-dialog) |

---

## Known Gaps

| What's Missing | Why Deferred | Follow-up |
|---------------|-------------|-----------|
| Line-coverage % | No `--coverage` tooling configured; case-count posture chosen for v0.1 | Add `vitest --coverage` if a threshold gate is wanted |
| React Flow handle-drag connect, in-canvas edge-label typing | Can't be simulated in the node test env; the store action (`onConnect`) is unit-tested and the wiring is CDP-verified | An e2e harness (Playwright) would cover the real drag |
| Drag-drop file injection (scenario 8) | CDP `DataTransfer` file synthesis is brittle; the underlying `uploadFile`→`addFileNode` path is exercised by toolbar-upload + import | Cover under a future Playwright e2e |
| `store.buildBrief`/`applyResponse` orchestration (the impure tail) | Thin glue over the unit-tested pure `brief.*` + the curl-verified `api.*` wrappers; verified end-to-end via the CDP import run | Optional: mock `../api` and assert the orchestration sequence |
| Reader-embedded relative-image rendering | Reader is text/code-focused in v0.1; relative `src` isn't rewritten to `/api/asset` | Tracked in the technical-overview follow-ups |
| Toolbar flyout state machine (`canvas-toolbar.tsx`) | Phase 9 added a unified `open` state machine governing all insert popovers (Shape flyout, File ▾ menu, narrow-screen Add ▾); no vitest coverage because the component requires a browser DOM (keyboard events, outside-click listeners, popover anchoring); verified by CDP visual-parity (Phase 9, 7/7 captures) | Add Playwright e2e or a jsdom-based component test in a follow-up |
| `<FrontmatterView>` component (`frontmatter-view.tsx`) | Phase 9 extracted the shared frontmatter renderer; no unit tests exist for the component's rendering logic (status-pill classifier, tag/link chip limits, boolean-status fall-through, null-when-empty guard); verified by CDP visual-parity (Phase 9) | `statusClass` is a pure function — easy to unit-test; `FrontmatterView` itself needs jsdom or Playwright |
| Comment pins on grouped children (Phase 10) | The absolute-geometry fix (`getInternalNode().internals.positionAbsolute`) is verified by the phase-close code review + the adapter abs↔rel tests, but a pin placed on a child *inside* a group was not separately CDP-scripted | Add a CDP step that drops a pin on a grouped child and asserts it tracks a group drag |
| Box-select marquee gesture (Phase 10) | `selectionOnDrag` is wired (gated on select mode) and shares the exact selection→`onSelectionChange`→`setSelection` path proven via ⌘-click (CDP 1→2); the marquee drag itself wasn't CDP-scripted (empty-start-point coordinate fragility) | Cover under a future Playwright e2e |

---
name: 001-initial-architecture-test-notes
description: Test notes for 001-initial-architecture (Flowcanvas v0.1) — coverage summary, new tests, manual/CDP scenarios, and known gaps generated at plan close.
status: complete
tags: [test-notes, testing, coverage]
links: [.flowcode/plans/001-initial-architecture/001-initial-architecture-plan.md, .flowcode/plans/001-initial-architecture/001-initial-architecture-technical-overview.md]
---

# Test Notes — 001-initial-architecture Flowcanvas v0.1

- Posture: the **pure logic modules** (schema adapter, edge derivation/reconciliation, comment anchor math, the store's mutations, the agent brief/merge) are unit-tested with `vitest` — 66/66 green (Phase 8 +10); the **interactive UI + fs routes** are verified out-of-process (headless-Chrome CDP driver + `curl`), since React Flow drag/handle/measure and Next route handlers don't run in the jsdom-free node test env.
- Status complete; v0.1 dated 2026-06-26; Phase 8 folded 2026-06-27.
- Source plan: `001-initial-architecture-plan.md`; derived from `001-initial-architecture-technical-overview.md`.

---

## Test Coverage Summary

| Layer | Framework | Files Added | Coverage | Notes |
|-------|-----------|-------------|----------|-------|
| Unit | vitest | 5 (`adapter`, `edges`, `comments`, `store`, `brief`) | 66 tests, 100% pass (Phase 8 +10 to store) | All pure `lib/canvas/*` logic; no jsdom — store exercised directly against zustand outside React |
| Integration | curl + headless Chrome (CDP) | 0 test files (out-of-process) | route + flow verified | 8 fs routes (200/400/404 guard cases) + the interactive canvas flows |
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

---

## Known Gaps

| What's Missing | Why Deferred | Follow-up |
|---------------|-------------|-----------|
| Line-coverage % | No `--coverage` tooling configured; case-count posture chosen for v0.1 | Add `vitest --coverage` if a threshold gate is wanted |
| React Flow handle-drag connect, in-canvas edge-label typing | Can't be simulated in the node test env; the store action (`onConnect`) is unit-tested and the wiring is CDP-verified | An e2e harness (Playwright) would cover the real drag |
| Drag-drop file injection (scenario 8) | CDP `DataTransfer` file synthesis is brittle; the underlying `uploadFile`→`addFileNode` path is exercised by toolbar-upload + import | Cover under a future Playwright e2e |
| `store.buildBrief`/`applyResponse` orchestration (the impure tail) | Thin glue over the unit-tested pure `brief.*` + the curl-verified `api.*` wrappers; verified end-to-end via the CDP import run | Optional: mock `../api` and assert the orchestration sequence |
| Reader-embedded relative-image rendering | Reader is text/code-focused in v0.1; relative `src` isn't rewritten to `/api/asset` | Tracked in the technical-overview follow-ups |

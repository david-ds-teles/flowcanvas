---
name: 006-semantic-edges-qa-report
description: QA gate report for 006-semantic-edges — per-phase and plan-completion review findings and stack-gate outcomes.
status: active
tags: [qa-report, quality-gate, review, findings]
links: [.flowcode/plans/006-semantic-edges/006-semantic-edges-plan.md, .flowcode/quality-checks/markdown-quality.md]
---

# QA Report — 006-semantic-edges Semantic Edges & Connection Ports

- Phase 1 gates all pass; the one medium finding (untested `seedSideT` pinned-side path) is **resolved** (pinned-side test added) — phase clear to close.
- Scope: per-phase close + plan completion.
- Reverse-chronological, prepend-only: newest `## Check YYYY-MM-DD HH:MM` directly below this header; never rewrite prior sections.
- Each check: Stack Gate as a ≤3-column table; Review Findings as finding-as-section entries.
- Baseline conformance (project-overview, module contracts, declared gates, code conventions) is checked every run and recorded on the `**Baseline conformance:**` line; divergence is a first-class finding.
- Severity values: `critical` · `high` · `medium` · `low` · `info`.
- A finding with no `**Resolution:**` line is unresolved; `qa-probe-gate.js` blocks commits/PRs when any unresolved finding is ≥ medium.
- Follow `markdown-quality.md § Finding-as-Section Format` and `§ Tables`.

---


## Check 2026-06-30 20:00 — Plan completion

**Reviewer:** flowcode:code-reviewer-agent
**Scope:** Plan completion — all 4 phases; Phase 4 primary coverage (no prior phase review) + cross-phase coherence
**Plan:** 006-semantic-edges
**Baseline conformance:** flagged (3) — `project-overview.md` status line stale; `brief.md` narrative omits 006 `edgeType`; `color-picker.md` + `legend.md` module docs not yet created
**Gate outcome:** PASS
**Summary:** All 6 gates pass. The schema→migrate→adapter→renderer→agent-contract round-trip is coherent across all 4 phases: `normalizePorts` guarantees every edge endpoint resolves to a port at load; `edgeType` flows from schema through adapter `data.edgeType` into `LabeledEdge`'s style-resolution chain (`d.color ?? ts.color`, `d.line ?? ts.line`, etc.); `buildBrief` emits `edgeType` when present; `applyResponse` threads it on create (default `'reference'`) and update branches; `generation-kit` contract and `docs/flowcanvas-agent-contract.md` are an exact mirror; `setEdgeType` correctly clears the four superseded overrides (color/line/fromEnd/toEnd); `navigateRef` Phase 3 regression fixed; `newBoard`/`emptyBoard` born at `'0.5'`. No critical, high, or medium findings — plan close is not blocked. Three low findings are documentation-hygiene items.

### Stack Gate

| Gate | Outcome | Notes |
|------|---------|-------|
| Typecheck | pass | `npx tsc --noEmit` — exit 0 (main session) |
| Lint | pass | `npm run lint` — exit 0 (main session) |
| Unit | pass | `npx vitest run` — 239/239; +2 brief edgeType round-trip tests (main session) |
| Build | pass | `npm run build` — compiled successfully (main session) |
| Integration | pass | `npm run smoke:mcp` — PASS, 8 tools (main session) |
| E2E | pass | `npm run smoke:render` + CDP — PASS; ports 5/5 · typed+legend+ColorPicker 6/6 · Shift-snap 45.0° (main session) |

### Review Findings

#### Finding 1 — [low] `project-overview.md` status line and description stale at plan completion

**Files:** `.flowcode/project/project-overview.md:16`, `.flowcode/project/project-overview.md:22`

The frontmatter-style status line at line 16 reads "006-semantic-edges in progress (Phases 1–2 done: connection ports + flow-typed-edge schema)" — all 4 phases are complete. The Project Description paragraph at line 22 still says "extended JSONCanvas 0.4 — is the authoritative typed-relation graph" though the schema is now `0.5`. The same paragraph also says "After each round the human reviews... The `.canvas` file on disk — extended JSONCanvas 0.4" which is stale.

**Suggested fix:** Update line 16 to "006-semantic-edges complete (4/4 phases)" and change the description's "0.4" reference to "0.5". Add a plan-006 entry to the Evolution Log (§ line ~264) documenting the semantic-edge taxonomy + ports + ColorPicker + schema upgrade.

**Resolution:** fixed — `project-overview.md` status line now reads "001 + 002 + 004 + 006-semantic-edges complete"; all five `0.4` schema mentions (Project Description §, Architecture §, Datastore bullet) changed to `0.5`; an Evolution Log entry for plan 006 added (ports · flow-typed edges + legend/picker · ColorPicker · Shift-snap · agent parity · 0.4→0.5 · gates).

---

#### Finding 2 — [low] `brief.md` narrative omits the Phase 4 `edgeType` addition to `BriefEdge`/`AgentEdge`

**Files:** `.flowcode/project/modules/brief.md:390`, `.flowcode/project/modules/brief.md:15`

`brief.md` was last updated 2026-06-29 (before plan 006). The narrative "Key Insights" section at line 390 describes "Edge style parity (005-edges)" and lists "the same nine style fields (routing/line/color/fromSide/toSide/fromEnd/toEnd/labelT/points)" — `edgeType` (the 006 addition, the PRIMARY edge meaning per the contract) is absent from that list. The `BriefEdge` and `AgentEdge` type code blocks may include the field through code-snapshot inclusion, but the explanatory prose does not acknowledge it. The 006 `edgeType` field is categorically different from the 005-edges style fields (it is the semantic meaning, not a visual override), so it warrants its own narrative entry.

**Suggested fix:** Add a "006-semantic-edges" bullet to `brief.md`'s Key Insights section documenting `BriefEdge.edgeType?: EdgeType` and `AgentEdge.edgeType?: EdgeType`, the create-branch default (`'reference'`), and the update-branch `undefined`-preserves-existing semantics (`brief.ts:382`, `brief.ts:408`). Update the `last updated` date to 2026-06-30.

**Resolution:** fixed — `flowcode:module-explorer-agent` (merge-mode) updated `brief.md` with a 006 annotation: `BriefEdge.edgeType`/`AgentEdge.edgeType` (`rel` demoted to legacy), `buildBrief` conditional emit, `applyResponse` update-spread + create default `'reference'` — all with `path:line` provenance. (Ran as part of the plan-close module-doc sync, concurrent with this review.)

---

#### Finding 3 — [low] `color-picker.md` and `legend.md` module docs not yet created

**Files:** `components/ui/color-picker.tsx` (no module doc), `components/canvas/legend.tsx` (no module doc)

Phase 3 Finding 3 deferred creation of these two module docs to plan close. They remain unresolved: no `.flowcode/project/modules/color-picker.md` or `legend.md` exists. Both are public, actively-consumed components — `ColorPicker` is the shared colour picker re-used by the edge style panel and `NodeFormatBar`; `EdgeLegend` is the on-canvas flow-type picker that doubles as the visual legend. Without module docs, the module-boundary baseline is incomplete for new contributors and future plan agents.

**Suggested fix:** Run `flowcode:module-explorer-agent` (create-mode) on `components/ui/color-picker.tsx` and `components/canvas/legend.tsx` to produce `color-picker.md` and `legend.md` with public-API, dependency, and usage-example sections. This is the same action prescribed by Phase 3 Finding 3.

**Resolution:** fixed — `.flowcode/project/modules/color-picker.md` and `.flowcode/project/modules/legend.md` created at plan close (public API, dependencies, usage, key insights incl. the legend's `stopPropagation`/top-left invariants); both registered as rows in `project-overview.md § Modules`.

---

#### Finding 4 — [info] Phase 3 Finding 4 carry-forward: `EdgeLegend` double `useStore` scan (no Resolution added)

**Files:** `components/canvas/legend.tsx:25-29`

Phase 3 Finding 4 remains open (no `**Resolution:**` line). Two independent RF `useStore` selectors each call `s.edges.find` for the selected edge. Not a correctness issue; no regression introduced. No action required for plan close.

**Resolution:** no action required — advisory only; Performance cost is negligible (Zustand suppresses re-renders on primitive equality); fix deferred to a future housekeeping pass if `EdgeLegend` re-render sensitivity becomes an issue.

---

#### Finding 5 — [info] Phase 3 Finding 5 carry-forward: `EdgeTypePicker` stays open after type selection (no Resolution added)

**Files:** `components/canvas/edges/labeled-edge.tsx:181-191`

Phase 3 Finding 5 remains open (no `**Resolution:**` line). Clicking a type in `EdgeTypePicker` does not call `onClose()`. Consistent with `EdgeStylePanel` behavior (both stay open for multi-adjustment). Not a regression.

**Resolution:** no action required — advisory only; The behavior is intentional (allows comparing types before closing); auto-close can be added as a UX polish item in a future pass.

---

#### Finding 6 — [info] MCP sidecar `coreDocPath` describe text references reversed behavior

**Files:** `mcp/flowcanvas-mcp.ts:219-222`

The `apply_response` tool's `coreDocPath` Zod describe text reads: "The tool binds it as the living spine AND places a readable markdown card for it on the canvas — do NOT add your own node for it." The "places a readable markdown card" clause is factually wrong since 2026-06-30 — `applyResponse` (`brief.ts:451-454`) explicitly does NOT create a canvas card for `coreDocPath` (operator-reversed). The instruction "do NOT add your own node" is still correct and prevents the harmful behavior; only the description of what the tool does is stale. This is pre-existing from plan 004 and was not introduced by plan 006 (the plan 006 change to `mcp/flowcanvas-mcp.ts` was only the `emptyBoard` `'0.5'` bump).

**Suggested fix:** Update the describe to: "Root-relative path of the core spec doc. The tool binds it as the living spine (a docked readable pane) — it is NOT a canvas card. Do NOT add an upsertNodes entry for it."

**Resolution:** no action required for plan close — pre-existing; the "do NOT add your own node" guard prevents agent confusion; fix should accompany a future mcp-sidecar doc pass.

---

## Check 2026-06-30 18:00 — Phase 3

**Reviewer:** flowcode:code-reviewer-agent
**Scope:** Phase 3 — Semantic Typing, Legend UI & Reusable ColorPicker
**Plan:** 006-semantic-edges
**Baseline conformance:** flagged (1) — `color-picker.md` and `legend.md` module docs not yet created; `store.md`, `canvas-nodes.md`, and `labeled-edge` docs not yet updated for Phase 3 additions; expected phase-close action (plan explicitly notes this)
**Gate outcome:** PASS
**Summary:** All six gates pass and all three Phase 3 acceptance criteria are satisfied: `setEdgeType` correctly applies the legend defaults and clears the four superseded overrides; the shared `<ColorPicker>` is used by both `EdgeStylePanel` and `NodeFormatBar`; the on-canvas `<EdgeLegend>` doubles as the type picker and is mounted in `canvas-shell.tsx`. CDP-verified: legend renders 6 rows, clicking a row changes the edge stroke to the correct type color, `<ColorPicker>` renders with 6 chips. No critical, high, or medium findings — Phase 3 is clear to close.

### Stack Gate

| Gate | Outcome | Notes |
|------|---------|-------|
| Typecheck | pass | `npx tsc --noEmit` — exit 0 |
| Lint | pass | `npm run lint` — exit 0 |
| Unit | pass | `npx vitest run` — 237/237; `setEdgeType` clears-overrides test added and passes |
| Build | pass | `npm run build` — compiled successfully |
| Integration | pass | `npm run smoke:mcp` — PASS |
| E2E | pass | `npm run smoke:render` — PASS; CDP: legend 6 rows visible, type click sets stroke to event colour `rgb(163,113,247)`, ColorPicker 6 chips render |

### Review Findings

#### Finding 1 — [low] `EdgeTypePicker` inherits the `fc-relpick` CSS class family — name no longer matches the component's role

**Files:** `components/canvas/edges/labeled-edge.tsx:175,180,185,196,208`

`EdgeTypePicker` renders with `className="fc-relpick nodrag nopan"` and its sub-elements (`fc-relpick__grid`, `fc-relpick__opt`, `fc-relpick__row`, `fc-relpick__input`, `fc-relpick__apply`) all carry the `fc-relpick__*` prefix — the legacy name from the removed `RelPicker`. The CSS rules still match and the component styles correctly, but the class names are misleading: a reader of the CSS sees "relpick" while the component is now "EdgeTypePicker". Similarly `fc-edge-label__rel` on the label pill (`labeled-edge.tsx:532`) continues to name the span "rel" even though it now shows `typeLabel`. The plan notes the `fc-edge-label__rel` class is kept for the render smoke, which is a legitimate reason; the `fc-relpick` class is also kept, presumably for the same CSS inheritance reason.

**Suggested fix:** Rename the `fc-relpick` class block in `app/styles/studio-shell.css` to `fc-typepick` (or an equivalent) and update the JSX class names in `EdgeTypePicker` to match; rename `fc-edge-label__rel` to `fc-edge-label__type` and update the smoke assertions. Alternatively, note in a comment that the class is a stable CSS handle kept across the rel→type rename to avoid CSS churn.

**Resolution:** accepted — the `fc-relpick*` + `fc-edge-label__rel` classes are kept as **stable CSS/test handles** across the rel→type rename (the `smoke:render` gate asserts `.fc-edge-label__rel`, and the rel-picker CSS rules are reused verbatim); renaming churns CSS + the smoke for no functional gain. A code comment on `EdgeTypePicker` marks them as intentional stable handles.

---

#### Finding 2 — [low] `navigateRef`-created edges gain a visual regression in Phase 3 — no `meta.edgeType` causes fallthrough to `'reference'` defaults

**Files:** `lib/canvas/store.ts:948-951`

`navigateRef` appends a new edge with `meta: { origin: 'user', rel }` and an explicit `toEnd: 'arrow'` but no `meta.edgeType`. Phase 2 QA Finding 4 noted these edges are port-less until `load`; in Phase 3 the absence of `meta.edgeType` has an additional consequence: the style resolver in `labeled-edge.tsx:391-395` falls back to `edgeType = 'reference'` (line 337) whose `EDGE_TYPE_STYLE` maps `line: 'dotted'` and `color: '#6b7280'`. Before Phase 3, the same edge rendered with the provenance stroke (`var(--color-primary)`, solid indigo). After Phase 3 it renders dotted grey in-session — the explicit `toEnd: 'arrow'` still wins over the type's `circle` default, so the arrowhead is correct, but the line and color are a within-session regression. Persisted boards reload from disk with `meta.edgeType` already seeded by the `0.4→0.5` migration and are unaffected; only in-session `navigateRef` edges (created after load) show the changed style. Phase 4 agent-parity work will add `meta.edgeType` to the `navigateRef` edge.

**Suggested fix:** In `navigateRef` (`store.ts:948`), add `edgeType: REL_TO_EDGE_TYPE[rel]` to the edge's `meta` object when `rel` is a key in `REL_TO_EDGE_TYPE`, else default to `'reference'`. This is a one-line change consistent with how `onConnect` already sets `meta.edgeType: 'reference'`.

**Resolution:** fixed (Phase 4) — `navigateRef` now sets `meta.edgeType: 'reference'` (its `rel` is always `'references'` → `'reference'`), so the ref-nav edge styles consistently with `onConnect`; no more within-session dotted-grey regression.

---

#### Finding 3 — [low] Module contracts for new `color-picker` and `legend` modules not yet created; Phase 3 additions to `store`, `canvas-nodes`, and `labeled-edge` contracts not yet reflected

**Files:** `.flowcode/project/modules/store.md`, `.flowcode/project/modules/canvas-nodes.md`

`store.md` does not document `setEdgeType` in its Public API — Edge Editing section. `canvas-nodes.md` does not mention `EdgeTypePicker` (replaces `RelPicker`), the shared `<ColorPicker>` usage in `EdgeStylePanel`, or the legend-triggered `setEdgeType` flow. No module docs exist for `components/ui/color-picker.tsx` or `components/canvas/legend.tsx` (new files). The plan explicitly notes "a new `color-picker`/`legend` doc will be synced at phase close" and that `labeled-edge`/`store`/`canvas-nodes` will be updated — this is a planned phase-close action, not an oversight.

**Suggested fix:** At phase close, run `flowcode:module-explorer-agent` (merge-mode) on `store.md` and `canvas-nodes.md`; create `color-picker.md` and `legend.md` as new module docs in `.flowcode/project/modules/`.

**Resolution:** deferred to plan close — the module-doc sync for Phases 3–4 (`store`/`canvas-nodes`/`brief`/`generation-kit` updates + new `color-picker`/`legend` docs) is consolidated into the Post-Execution Pipeline's code-explorer + artifact pass, rather than a separate per-phase dispatch, to keep momentum across the remaining phases.

---

#### Finding 4 — [info] `EdgeLegend` uses two separate RF `useStore` calls that each scan `s.edges` — can be merged

**Files:** `components/canvas/legend.tsx:25-29`

`EdgeLegend` subscribes to RF's internal edge store twice:
```
const selectedEdgeId   = useStore((s) => s.edges.find((e) => e.selected)?.id ?? null)
const selectedEdgeType = useStore((s) => { const e = s.edges.find((x) => x.selected); return ... })
```
Both selectors call `edges.find` independently on every render where edges change. Since both return primitives, Zustand's equality check suppresses redundant re-renders, so this is not a correctness issue. Merging into a single selector that returns `{ id, edgeType }` would halve the traversal cost and make the logical coupling explicit.

**Suggested fix:** Replace the two selectors with one: `const sel = useStore((s) => { const e = s.edges.find((x) => x.selected); return { id: e?.id ?? null, edgeType: (e?.data as {...} | undefined)?.edgeType ?? null } })`, using a stable ref or shallow-compare wrapper if re-render sensitivity becomes an issue.

**Resolution:**

---

#### Finding 5 — [info] `EdgeTypePicker` stays open after a type row is clicked — requires manual dismiss

**Files:** `components/canvas/edges/labeled-edge.tsx:181-191`

Clicking a type button in `EdgeTypePicker` calls `setEdgeType(id, t)` but does not call `onClose()`. The picker remains visible until the user clicks elsewhere (which deselects the edge and triggers the render-phase `setPanel('none')` guard). This is consistent with `EdgeStylePanel`'s behavior (it also stays open after adjustments) and is not a regression. The `EdgeLegend` on the canvas does not have this issue — it applies the type directly with no popover. The behavior may be intentional (allows the user to compare multiple types before closing).

**Suggested fix:** After `setEdgeType(id, t)` in the `onClick` handler, add `onClose()` to auto-close the picker once a type is applied. Pass `onClose` into `EdgeTypePicker` (it already has the prop) or close via the panel state.

**Resolution:**

---


## Check 2026-06-30 10:00 — Phase 2

**Reviewer:** flowcode:code-reviewer-agent
**Scope:** Phase 2 — Ports Rendering & Interaction
**Plan:** 006-semantic-edges
**Baseline conformance:** flagged (1) — `store.md`, `adapter.md`, `canvas-nodes.md` contracts stale; see Finding 3
**Gate outcome:** PASS
**Summary:** All six gates pass and both Phase 2 acceptance criteria are CDP-verified: 14 always-visible port dots render, an edge endpoint seats 0.4 px from the nearest dot center, Alt-drag moves a dot (769→824 px) with no spurious edge, and a real drag creates one edge plus two new port dots. No critical, high, or medium findings; three low findings are non-blocking. Phase 2 is clear to close; module-contract refresh via `module-explorer-agent` is the mandatory follow-up action.

### Stack Gate

| Gate | Outcome | Notes |
|------|---------|-------|
| Typecheck | pass | `npx tsc --noEmit` — exit 0; port helpers and EdgeData type-clean |
| Lint | pass | `npm run lint` — exit 0 |
| Unit | pass | `npx vitest run` — 236/236; port reuse/create, addPort/movePort, spread-second-dot, routes-contract version all pass |
| Build | pass | `npm run build` — compiled successfully |
| Integration | pass | `npm run smoke:mcp` — PASS (8 tools) |
| E2E | pass | `npm run smoke:render` — PASS; CDP: dots visible, arrowhead seated in dot, Alt-drag no spurious edge, connect 8→9 edges + 14→16 dots |

### Review Findings

#### Finding 1 — [low] `portForConnect` null-handle path mints ports without deduplication

**Files:** `lib/canvas/store.ts:158-164`

When `sourceHandle`/`targetHandle` is `null` (user drags to or from node body, not a named handle), `portForConnect` calls `autoPort` for the geometric default and unconditionally mints a new `ConnectionPort`. It does not call `portAt` to check whether an existing port is already near that `{side, t}`. A second auto-connect between the same node pair stacks two dots at the same position. The side-handle path (`onSide = true`) does call `firstFreeT` and spreads correctly; only the null/body case is affected. Stacked dots heal on the next `load` when `normalizePorts` runs, and the `PortHandles` component's 4 side "add" handles mean the null path is rarely reached in practice.

**Suggested fix:** Before minting, add a call to `portAt` (from `lib/canvas/ports.ts`) against the computed `{side, t}` using a pixel-radius equivalent of `PORT_T_TOL * nodeWidth`; reuse the returned port id if found, matching the deduplication logic in `migrate.ts`'s `ensurePort`.

**Resolution:** fixed — `portForConnect` now, on the auto/body-drop path, reuses an existing dot on the computed side within `PORT_SLOT_TOL` of `t` (`ports.find(... Math.abs(p.t - t) <= PORT_SLOT_TOL)`) before minting, so repeated auto-connects no longer stack duplicate dots. tsc 0 · lint 0 · store tests pass.

---

#### Finding 2 — [low] `PORT_T_TOL` defined with different values in two files

**Files:** `lib/canvas/store.ts:137`, `lib/canvas/migrate.ts` (private constant, value 0.04)

`store.ts` defines `PORT_T_TOL = 0.06` (used by `firstFreeT` to detect occupied slots) while `migrate.ts` defines `PORT_T_TOL = 0.04` (used by `ensurePort` to decide reuse-vs-create). The two constants serve different purposes and the behavioral difference is intentional, but the shared name with divergent values in closely-related files creates a maintenance hazard: a future tightening in one file will not propagate to the other, potentially making connect behavior inconsistent with seeding behavior.

**Suggested fix:** Export a canonical `PORT_T_TOL` from `lib/canvas/ports.ts` (the geometric authority module) and import it in both `store.ts` and `migrate.ts`; add inline comments if the two call sites truly need different magnitudes.

**Resolution:** fixed — the store constant is renamed `PORT_SLOT_TOL` (with a comment on its distinct purpose: slot-freedom + auto-drop dedup) so it no longer collides with `migrate.ts`'s reuse-tolerance `PORT_T_TOL`. Distinct names with distinct purposes removes the "same name, divergent value" hazard.

---

#### Finding 3 — [low] Module contracts stale for `store`, `adapter`, and `canvas-nodes` post Phase 2

**Files:** `.flowcode/project/modules/store.md`, `.flowcode/project/modules/adapter.md`, `.flowcode/project/modules/canvas-nodes.md`

`store.md` does not document `addPort`, `movePort`, the rewritten `onConnect` (port reuse-or-create, `edgeType:'reference'` default), `load` → `normalizePorts`, or `newBoard` born at `'0.5'`. `adapter.md` does not describe the `portIndex` build, `fromPortST`/`toPortST` data fields, or `edgeType` passthrough. `canvas-nodes.md` does not describe the new `PortHandles` component, the updated `NodeResizeFrame` `node` prop, or the `PortHandles`-in-fragment pattern on `GroupNode`/`FallbackNode`. `project-overview.md`'s status line still names `schemaVersion:'0.4'` as the persisted version. Resolution follows the same path as Phase 1 Finding 2.

**Suggested fix:** Run `flowcode:module-explorer-agent` (merge-mode) on `store.md`, `adapter.md`, and `canvas-nodes.md` at phase close; update `project-overview.md` status and the Schema module entry to reflect `'0.5'`.

**Resolution:** fixed — dispatched `flowcode:module-explorer-agent` (merge-mode) on `store.md`, `adapter.md`, `canvas-nodes.md`; `project-overview.md` status line updated to `schemaVersion:'0.5'` (ports seeded, `rel → edgeType`) and 006 Phases 1–2 noted. (Schema/ports module rows + folder structure were already added at Phase 1 close.)

---

#### Finding 4 — [info] `navigateRef`-created edges are port-less until the next `load`

**Files:** `lib/canvas/store.ts:919-923`

`navigateRef` appends an edge without `fromPort`/`toPort`. Within the same session the edge renders with the 005-edges floating-perimeter fallback (arrowhead does not seat in a dot); `normalizePorts` seeds the ports on the next `load`. This is the intended behaviour per Design Decision 4 ("ports materialize at load, render reads only") and is consistent with how Phase 4 agent-authored edges will work. The floating fallback is visually correct; no regression.

**Suggested fix:** No change required for Phase 2. Phase 4 agent-parity work will confirm and document this as the intended model for programmatically-created edges.

**Resolution:** deferred — correct per D4; Phase 4 CDP verification will confirm no user-visible anomaly

---

#### Finding 5 — [info] All `<Handle>` elements in `PortHandles` use `type="source"`

**Files:** `components/canvas/nodes/port-handles.tsx:30,33`

All 4 side "add" handles and all N port-dot handles use `type="source"`. React Flow's default loose connection mode permits source-to-source connections, which is confirmed by the CDP test (connections succeed in both directions). The canonical RF model uses `type="target"` on receiving handles; relying on implicit loose-mode means a future RF upgrade tightening the default could break connections silently.

**Suggested fix:** Either add an explicit `connectionMode={ConnectionMode.Loose}` to `<ReactFlow>` in `canvas-shell.tsx`, or render receiving handles with `type="target"`. No change required for Phase 2 close.

**Resolution:** not-a-defect — `canvas-shell.tsx:271` already sets `connectionMode={ConnectionMode.Loose}` explicitly, so the reviewer's suggested fix is in place; source→source connections are an intentional, explicit choice (one handle id == port id serves both ends). Will revisit only if a React Flow major upgrade changes the meaning of Loose mode.

---

## Check 2026-06-30 00:00 — Phase 1

**Reviewer:** flowcode:code-reviewer-agent
**Scope:** Phase 1 — Schema, Legend & Pure-Lib Foundation
**Plan:** 006-semantic-edges
**Baseline conformance:** flagged (2) — four module contracts stale; see Findings 2 and 3
**Gate outcome:** PASS
**Summary:** All hard gates pass and the full acceptance criteria checklist is satisfied. One medium finding (the `seedSideT` pinned-side branch has no test coverage) blocks phase close per `qa-probe-gate.js`; a single test case in `migrate.test.ts` resolves it. Two low findings document expected module-contract drift that the module-explorer-agent should close at phase end.

### Stack Gate

| Gate | Outcome | Notes |
|------|---------|-------|
| Typecheck | pass | `npx tsc --noEmit` — exit 0; `'0.5'` literal widens cleanly across all changed files |
| Lint | pass | `npm run lint` — exit 0 |
| Unit | pass | `npx vitest run` — 232/232 across 19 files |
| Build | pass | `npm run build` — compiled successfully |
| Integration | skipped | `npm run smoke:mcp` — Phase 1 ships no app/MCP surface; gate scoped to Phase 4 |
| E2E | skipped | `npm run smoke:render` — Phase 1 ships no app surface; gate scoped to Phase 4 |

### Review Findings

#### Finding 1 — [medium] `seedSideT` pinned-side branch carries no test coverage

**Files:** `lib/canvas/migrate.ts:22-23`, `lib/canvas/migrate.test.ts`

`seedSideT` has two branches: `if (pinnedSide) return { side: pinnedSide, t: 0.5 }` and the `autoPort` fallback. Every test in `migrate.test.ts` exercises only the `autoPort` path because the `0.3 → 0.4` migration strips `fromSide`/`toSide` before `0.4 → 0.5` runs, and the `normalizePorts` idempotency test uses an edge with no `fromSide`. The pinned-side branch is the primary code path when `normalizePorts` is called in Phase 2 `store.load` on an agent- or hand-authored edge that carries `fromSide`/`toSide` as authoring sugar. An incorrect implementation (wrong `t`, wrong `side`) would silently misplace ports with no test to catch the regression. The logic itself is trivially correct, but uncovered new logic is a baseline quality gate requirement.

**Suggested fix:** Add one case to the `normalizePorts` describe block in `migrate.test.ts`: an edge carrying `fromSide: 'bottom'` on a node whose `autoPort` would give a different side. Assert that `normalizePorts` seeds the port on the `'bottom'` side at `t: 0.5`, not on the `autoPort`-computed side.

**Resolution:** fixed — added `normalizePorts` test "seeds a pinned-side port from edge.fromSide (authoring sugar), not the autoPort side" (`migrate.test.ts`): edge `fromSide: 'bottom'` on a node pair whose `autoPort` gives `'right'`; asserts the seeded `fromPort` resolves to `{ side: 'bottom', t: 0.5 }` and the unpinned target falls back to `autoPort` `'left'`. `migrate.test.ts` 7/7, full suite 233/233.

---

#### Finding 2 — [low] `schema.md`, `migrate.md`, `edge-geometry.md`, and `validate.md` contracts stale after Phase 1

**Files:** `.flowcode/project/modules/schema.md:118`, `.flowcode/project/modules/migrate.md:13`, `.flowcode/project/modules/edge-geometry.md:13`, `.flowcode/project/modules/validate.md:13`

All four existing module contracts document the pre-Phase-1 surface. `schema.md:118` still shows `SCHEMA_VERSIONS = ['0.1','0.2','0.3','0.4']` and `FlowcanvasExt.schemaVersion: '0.1'|'0.2'|'0.3'|'0.4'`; it does not list `ConnectionPort`, `EdgeType`/`EDGE_TYPES`, `EdgeTypeStyle`/`EDGE_TYPE_STYLE`, `REL_TO_EDGE_TYPE`, `NodeMeta.ports?`, `CanvasEdge.fromPort?`/`toPort?`, or `CanvasEdge.meta.edgeType?`. `migrate.md:13` lists only `migrateDoc` in the public API, omitting `normalizePorts`. `edge-geometry.md:13` omits `SNAP_STEP_DEG` and `snapAngle`. `validate.md` still shows the `'0.1'|'0.2'|'0.3'|'0.4'` enum. The plan flags only `ports.md` (new) for creation at phase close; the four existing contracts also require updating.

**Suggested fix:** Run `flowcode:module-explorer-agent` in merge-mode on `schema`, `migrate`, `edge-geometry`, and `validate` at phase close alongside the `ports.md` creation pass, or manually update each module doc's Public API section to reflect the Phase 1 additions.

**Resolution:** fixed — dispatched `flowcode:module-explorer-agent` (merge-mode) on `schema.md`, `migrate.md`, `edge-geometry.md`, `validate.md` and created `ports.md`; each verified against source with `path:line` provenance. `project-overview.md` § Modules + folder structure also gained the new `ports` row/line.

---

#### Finding 3 — [low] `0.1 → 0.5` migration test does not assert port seeding

**Files:** `lib/canvas/migrate.test.ts:25-35`

The `0.1 → 0.5` ladder test verifies that a derived edge is baked, `schemaVersion` lands at `'0.5'`, and `migrated: true`. It does not assert that ports are seeded on the two nodes whose frontmatter drives the derived edge. The `0.4 → 0.5` worked-example test (lines 58–78) covers port seeding directly, so correctness is tested — but the full-ladder path through `0.4 → 0.5` on a node pair with real geometry is not pinned. A regression in the ladder ordering (e.g., port seeding running before the `0.3 → 0.4` float step) would still pass the existing assertion.

**Suggested fix:** Add `expect(doc.nodes[0].meta?.ports).toHaveLength(1)` and `expect(doc.nodes[1].meta?.ports).toHaveLength(1)` to the `'0.1 → 0.5'` test case. Optionally assert `fromPort` on `doc.edges[0]`.

**Resolution:** fixed — the `'0.1 → 0.5'` test now asserts `doc.nodes[0].meta?.ports`/`doc.nodes[1].meta?.ports` each `toHaveLength(1)` and `doc.edges[0].fromPort === doc.nodes[0].meta?.ports?.[0].id`, pinning that the full ladder runs the `0.4 → 0.5` port-seeding step last. Full suite 233/233.

---

#### Finding 4 — [info] `sideAndT` and `portPoint` produce `NaN` for zero-dimension nodes

**Files:** `lib/canvas/ports.ts:27-31`

`sideAndT` computes `t` via `(p.y - node.y) / node.height` and `(p.x - node.x) / node.width`. When `node.height === 0` or `node.width === 0`, the result is `Infinity` or `NaN`; `clamp01` does not guard `NaN` (it passes through). The consequence is a port with `t: NaN`, which produces `{ x: NaN, y: NaN }` from `portPoint` and a silent rendering defect. Zero-dimension nodes are invalid in practice (the store enforces positive size), so this is not a runtime risk for production boards, but it is a latent defect in the pure geometry layer.

**Suggested fix:** Add `if (node.width === 0 || node.height === 0) return { side: 'left', t: 0 }` as an early guard in `sideAndT`, or clamp via `node.width || 1` before division. No code change is required to close the phase.

**Resolution:** deferred — no production boards have zero-dimension nodes; revisit if a node-size invariant is relaxed

---

#### Finding 5 — [info] Port IDs use 8 hex characters (32 bits of entropy) from a 128-bit UUID

**Files:** `lib/canvas/migrate.ts:15`

`'p-' + uuid().slice(0, 8)` truncates a v4 UUID to its first 8 hex characters (32 entropy bits). The v4 UUID source has 122 random bits in positions that include these 8 chars, so the actual entropy is close to but not exactly 32 bits. Within a single board — even one with hundreds of ports — the birthday-collision probability is negligible (< 1 in 10^7 for 100 ports). This is noted for completeness; the established pattern in the codebase (`uuid().slice(...)` for short ids) makes this acceptable.

**Suggested fix:** No action required. If port IDs ever need global uniqueness (e.g., cross-board merge), consider the full UUID.

**Resolution:** deferred — within-board uniqueness is sufficient for the 006 model; flagged for awareness

---

<!-- Older QA runs continue below. New runs are prepended above this line, directly under the file header. Never rewrite prior sections. -->

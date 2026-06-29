---
name: 004-generation-loop-qa-report
description: QA gate report for 004-generation-loop — per-phase and plan-completion review findings and stack-gate outcomes.
status: active
tags: [qa-report, quality-gate, review, findings]
links: [.flowcode/plans/004-generation-loop/004-generation-loop-plan.md, .flowcode/quality-checks/markdown-quality.md]
---

# QA Report — 004-generation-loop Markdown-Core Generation Loop

- All five per-phase reviews complete and **all findings resolved** (Phase 1: 4 med + 2 low; Phase 2+3: 2 med + 3 low; Phase 4: 3 med + 4 low + 3 info; Phase 5: 1 high + 2 med + 3 low + 2 info). The Phase 5 high (a stale `routes-contract.test.ts` assertion exposed by the demo board's intended `0.2→0.3` migration) is fixed. Gates green: tsc 0 · lint 0 · build ok · vitest 178/178 · smoke:mcp PASS (8 tools) · smoke:render PASS · live CDP spine + import + full-sweep verifies PASS (0 console errors); the QA probe gate clears for commits/PRs.
- Scope: per-phase close + plan completion.
- Reverse-chronological, prepend-only: newest `## Check YYYY-MM-DD HH:MM` directly below this header; never rewrite prior sections.
- Each check: Stack Gate as a ≤3-column table; Review Findings as finding-as-section entries.
- Baseline conformance (project-overview, module contracts, declared gates, code conventions) is checked every run and recorded on the `**Baseline conformance:**` line; divergence is a first-class finding.
- Severity values: `critical` · `high` · `medium` · `low` · `info`.
- A finding with no `**Resolution:**` line is unresolved; `qa-probe-gate.js` blocks commits/PRs when any unresolved finding is ≥ medium.
- Follow `markdown-quality.md § Finding-as-Section Format` and `§ Tables`.

---

## Check 2026-06-29 22:00 — Plan completion

**Reviewer:** executor inline (the roster code-reviewer + code-explorer agents stalled twice in this environment after completing their analysis but before writing; the code-explorer audit DID complete and is the authoritative source for this check; the plan-completion review is handled inline per `plan-instructions.md` — inline review when the roster agent is unavailable)
**Scope:** Plan completion — the whole 004 change set (the closed generation loop), cross-cutting integration
**Plan:** 004-generation-loop
**Baseline conformance:** clean (project-overview + module docs reconciled across phases; technical-overview + project-overview propagation in the plan-close step)
**Gate outcome:** PASS
**Summary:** All 5 phases `done`; all per-phase findings resolved (Phase 1: 4 med + 2 low; Phase 2+3: 2 med + 3 low; Phase 4: 3 med + 4 low + 3 info; Phase 5: 1 high + 2 med + 3 low + 2 info). The code-explorer audit found **30/30 planned files present** and the spec-vs-code table is near-uniformly **match**, with 8 divergences all pre-documented (in plan deviation notes / phase logs) and **zero undocumented gaps**. Cross-cutting integration verified (below). No critical/high open. The QA probe gate clears.

### Stack Gate

| Gate | Outcome | Notes |
|------|---------|-------|
| Typecheck | pass | `npx tsc --noEmit` exit 0 |
| Lint | pass | `npm run lint` exit 0 |
| Build | pass | `npm run build` exit 0 (run with dev stopped) |
| Unit tests | pass | `npx vitest run` **178/178** (16 suites) — +20 over the 003 baseline (157) |
| Integration (MCP smoke) | pass | `npm run smoke:mcp` — 8 tools incl. `get_generation_kit` + the `flowcanvas://generation-kit` resource |
| E2E (render smoke) | pass | `npm run smoke:render` — tri-pane renders, non-zero canvas |
| Browser automation (CDP) | pass | Component widgets · kit modal · spine bidirectional · import · consolidated full-sweep · showcase board — **0 console errors** |

### Review Findings

#### Finding 1 — [info] Cross-cutting integration verified

**Files:** (whole feature)

Confirmed across the feature, grounded in the audit's spec-vs-code table + the executor's CDP verification: (a) **single-source kit** — `kitSections().schemaContract` is the only source for `brief.AGENT_CONTRACT`, `DesignBrief.responseContract`, the MCP tool + resource, the UI copy, and `docs/flowcanvas-agent-contract.md` (no drift). (b) **Three-way slug parity** — `spine.slugify` ↔ `render-md` `rehype-slug` ids ↔ the kit's `meta.source.anchor` rule align; the mandatory `spine.test.ts` parity test passes and the spine's bidirectional linking was CDP-verified live (`#auth-service` heading id matched). (c) **schemaVersion 0.3 story end-to-end** — `SCHEMA_VERSIONS`/`FlowcanvasExt` widened · `migrateDoc` ladder · `validate` enum · `load`/`newBoard`/`importDoc` all persist/accept `0.3`; the demo board migrated `0.2→0.3` on open (the intended one-time upgrade). (d) **`ComponentKind` stays distinct from the derived `NodeKind`** everywhere. (e) **`meta.kind` is additive/optional** — kindless boards render unchanged; `boundary` is group-only (validate rejects on a leaf; renderer degrades). (f) **Import safety** — untrusted `.canvas` JSON passes `JSON.parse` + `parseFlowcanvasDoc` (zod) before any board replacement; the destructive replace is dirty-guarded on all three paths; `importDoc` mints a collision-safe path. (g) **MCP `get_generation_kit({ markdownPath })`** reads the attached doc through the guarded `/api/file` route (`guardPath`), not the raw filesystem.

**Resolution:** verified — no action required.

#### Finding 2 — [info] Documented deviations carried into the technical-overview

**Files:** (whole feature)

The audit enumerated 8 divergences from the literal plan, all pre-documented in plan deviation notes / phase logs (none a breach): component widget color via `data-kind` CSS (not `COMPONENT_KIND_META.accent`); kit UI as an agent-panel tab (not a standalone modal); spine docked as a flex pane coexisting with the inspector; `importDoc` write-then-load + minted path; `normPath` extracted to `spine.ts`; `outlineOf` fenced-block skip; spine mounts when any doc is cited (not only when `coreDocPath` is set); `clearBoard` resets spine state. Each is a quality improvement or an approved UI adaptation.

**Resolution:** verified — folded into `{PREFIX}-technical-overview.md` (Divergences section).

#### Finding 3 — [low] Store spine/import actions + adapter routing are CDP/smoke-covered, not unit-tested

**Files:** `lib/canvas/store.ts` (spine/import actions), `lib/canvas/adapter.ts` (`renderType`)

Per the audit's coverage notes, the new store actions (`setCoreDoc`, `editCoreDoc`, `submitCoreDocEdit`, `highlightComponents`, `clearLinkHighlight`, `importDoc`, `importCanvasFile`) and the adapter `renderType` routing are exercised only by the live CDP sweeps + smokes, not by vitest (the store is React/`api`-coupled; the project's convention puts React/integration coverage in the headless-Chrome smokes, not vitest — see `project-overview.md § Testing`). The pure libs they build on (`spine`/`validate`/`migrate`/`generation-kit`) are unit-tested (16 new tests).

**Resolution:** deferred — consistent with the established project testing convention (pure libs → vitest; React/store/integration → smoke/CDP). Candidate backlog item: a store-level test harness with a mocked `api` layer.

---

## Check 2026-06-29 21:00 — Phase 5

**Reviewer:** flowcode:code-reviewer-agent
**Scope:** Phase 5 — Frictionless Import
**Plan:** 004-generation-loop
**Baseline conformance:** flagged (3)
**Gate outcome:** PASS (after fixes)
**Summary:** All Phase 5 acceptance criteria met — extension dispatch, validation-before-adopt guard, minted-path collision-safety, and paste-doc detection all correct. The one high finding (the demo board's on-disk `0.2→0.3` migration broke a stale `routes-contract.test.ts` assertion → vitest 177/178) is **fixed** (test asserts `'0.3'`; vitest 178/178). All medium + low findings resolved (docs refreshed; `importDoc` hydrate-before-migrate; dirty-guard on all import paths; stale comment); 2 info deferred. Gates green: tsc 0 · lint 0 · build ok · vitest 178/178 · smoke:mcp · smoke:render · import + full-sweep CDP (0 console errors).

### Stack Gate

| Gate | Outcome | Notes |
|------|---------|-------|
| Typecheck | pass | `npx tsc --noEmit` exit 0 — executor-reported |
| Lint | pass | `npm run lint` exit 0 — executor-reported |
| Build | pass | `npm run build` exit 0 — not re-run (dev server running; executor confirmed ok) |
| Unit tests | pass | `npx vitest run` **178/178** — `routes-contract.test.ts:63` updated to assert `'0.3'` (the post-004 demo-board version); re-verified green after the fix |
| Integration (MCP smoke) | pass | `npm run smoke:mcp` PASS — executor-reported (8 tools) |
| E2E (render smoke) | pass | `npm run smoke:render` PASS — executor-reported |
| Import CDP | pass | Live import CDP PASS — executor-reported; paste 0.2 board → adopted at minted `imported-*.canvas`; 0 console errors |
| Full-sweep CDP | pass | Consolidated full-sweep CDP PASS — executor-reported; all surfaces, 0 console errors |

### Review Findings

#### Finding 1 — [high] routes-contract.test.ts schemaVersion assertion stale — vitest gate failing 177/178

**Files:** `app/api/routes-contract.test.ts:63`

`routes-contract.test.ts:63` asserts `expect(doc.flowcanvas.schemaVersion).toBe('0.2')` when reading `examples/commerce-platform.canvas` via `GET /api/canvas`. Phase 5 changed the `store.load` path to call `migrateDoc` (which now handles `0.2→0.3`) and persist the upgraded board; when the demo board was opened in the browser during dev testing the file on disk was migrated from `'0.2'` to `'0.3'`. The route handler returns the on-disk value verbatim, so the test now fails with `expected '0.3' to be '0.2'`. Reviewer-verified: `npx vitest run` returns 177/178 (1 failed). The executor's "178/178" report predates the on-disk migration.

**Suggested fix:** Update `routes-contract.test.ts:63`: change `.toBe('0.2')` to `.toBe('0.3')` — the demo board is legitimately `'0.3'` now that Phase 5 persists that version for all opened boards. Also update `miniDoc()` at line 33 (`schemaVersion: '0.2'`) to `'0.3'` if any write-round-trip tests assert the returned version, to prevent a recurrence on the next write gate.

**Resolution:** fixed — `routes-contract.test.ts:63` now asserts `'0.3'` (the demo board is legitimately `0.3` post-004; the migration is the intended behavior) and `miniDoc()` at line 33 bumped to `'0.3'` for consistency. Re-verified `npx vitest run` → **178/178** green. The demo board `examples/commerce-platform.canvas` ships at `0.3` (its only change: the version bump + the one-time link-edge reconcile).

#### Finding 2 — [medium] store.md and canvas-toolbar.md stale — Phase 5 import actions and Dropzone dispatch undocumented

**Files:** `.flowcode/project/modules/store.md`, `.flowcode/project/modules/canvas-toolbar.md`

`store.md` does not document the two Phase 5 additions to `lib/canvas/store.ts` — `importDoc` (interface lines 94–96, implementation lines 749–760) and `importCanvasFile` (lines 763–767). The Functions/Methods section ends at the Phase 4 actions. `canvas-toolbar.md` describes `Dropzone` as "uploads dropped files and creates nodes at the projected drop point" with no mention of the Phase 5 `.canvas` extension dispatch, dirty-guard confirm, `importCanvasFile` call, or import-error toast. The architecture diagram shows `DZ → addFileNode` only. The `ExportPanel` entry covers only the `AgentResponse` path — the FlowcanvasDoc paste path and "Upload .canvas…" control (`import-upload`, `import-upload-input`) are absent.

**Suggested fix:** Refresh `store.md` — add `importDoc` and `importCanvasFile` signatures with the minted collision-safe path deviation and validate-before-adopt guard sequence. Refresh `canvas-toolbar.md` — update the Dropzone entry (extension dispatch, dirty-guard, error toast; testid `import-drop-error`) and ExportPanel entry (FlowcanvasDoc paste + Upload .canvas; testids `import-paste`, `import-upload`, `import-upload-input`); add `importCanvasFile` to the architecture diagram.

**Resolution:** fixed — `store.md` (`importDoc`/`importCanvasFile` signatures + minted-path deviation + validate-before-adopt + `load`/`newBoard` 0.3 + `migrateDoc`/`parseFlowcanvasDoc` deps, dropped `reconcileEdges`) and `canvas-toolbar.md` (Dropzone `.canvas` extension dispatch + dirty-guard + `import-drop-error` toast; ExportPanel FlowcanvasDoc paste + Upload .canvas; testids `import-modal`/`import-paste`/`import-upload`/`import-upload-input`) refreshed by `flowcode:artifact-updater`.

#### Finding 3 — [low] importDoc calls migrateDoc before hydration — 0.1 link-edge baking uses stale stored frontmatter

**Files:** `lib/canvas/store.ts:749`

`importDoc` calls `migrateDoc(doc)` on the raw imported `FlowcanvasDoc` before any `hydrateFiles` call. The `0.1→0.2` step inside `migrateDoc` invokes `deriveLinkEdges(next.nodes)` (`edges.ts:27`), which reads `n.meta?.frontmatter?.links`. When the imported `.canvas` was saved by this Flowcanvas app, `meta.frontmatter` is serialised in the file and baking has data to work with — but that frontmatter may be stale relative to the current disk state. For a third-party or handcrafted 0.1 `.canvas` without serialised `meta.frontmatter`, `deriveLinkEdges` returns `[]` and no link edges are baked. The `load` path correctly runs `hydrateFiles` first (fetching fresh disk frontmatter) then `migrateDoc` — `importDoc` inverts that order. The live CDP test used a 0.2/0.3 agent-generated doc so this path was not exercised.

**Suggested fix:** Mirror the `load` path order in `importDoc` — call `hydrateFiles` on the doc's nodes before `migrateDoc`, matching the established `hydrateFiles → migrateDoc` contract.

**Resolution:** fixed — `importDoc` no longer pre-migrates; it writes the validated doc as-is then calls `load()`, which hydrates frontmatter BEFORE `migrateDoc` (the correct order for the 0.1 link-edge bake) and persists `'0.3'`. Removes the inverted order entirely (one ladder, in `load`).

#### Finding 4 — [low] Dirty-guard absent from export-panel upload and paste import paths

**Files:** `components/canvas/export-panel.tsx:73-86` (upload), `components/canvas/export-panel.tsx:134-147` (pasted full-doc branch)

The dropzone path guards board replacement behind `window.confirm` when `dirty` is true (`dropzone.tsx:31`). The two equivalent paths in `ExportPanel` — "Upload .canvas…" (`onCanvasUpload`) and JSON paste (full-doc branch of `apply()`) — call `importCanvasFile`/`importDoc` immediately with no dirty-guard. A user with unsaved edits who pastes or uploads a `.canvas` will silently lose those changes. Decision 5 states "the destructive 'replace the whole board' action is gated behind the dirty-guard confirm where the dirty state actually lives"; the `ExportPanel` steps in the plan omit it for these two surfaces, creating a behavioral inconsistency across the three import paths.

**Suggested fix:** Subscribe `dirty = useCanvasStore((s) => s.dirty)` in `ExportPanel` and add a `window.confirm` guard in `onCanvasUpload` and the pasted-full-doc branch of `apply()` before calling `importCanvasFile`/`importDoc`, using the same wording as the dropzone.

**Resolution:** fixed — `ExportPanel` subscribes `dirty` and gates both destructive paths (pasted-full-doc branch of `apply()` + `onCanvasUpload`) behind a shared `confirmReplace()` (`window.confirm` when dirty). All three import surfaces now dirty-guard consistently.

#### Finding 5 — [low] store.ts load comment "persist the 0.2 bake" is stale after Phase 5 migrateDoc adoption

**Files:** `lib/canvas/store.ts:159`

The comment `// persist the 0.2 bake (one-time)` was written before Phase 5 replaced the inline `0.1→0.2` migration with the shared `migrateDoc` ladder. `migrateDoc` now handles both `0.1→0.2` (link-edge bake) and `0.2→0.3` (no-op bump). Any `0.2` board opened for the first time since Phase 5 will be bumped to `0.3` and re-saved. The comment implies only `0.1` boards trigger the re-save, which misleads a reader about the actual `0.2→0.3` path — which is the one that silently caused Finding 1.

**Suggested fix:** Update the comment to: `// persist the migration to 0.3 (one-time per level: 0.1 bakes link edges + bumps, 0.2 bumps only)`.

**Resolution:** fixed — the `store.ts` `load` comment now reads "persist the migrateDoc upgrade (0.1→0.2 bake and/or 0.2→0.3 bump) once".

#### Finding 6 — [info] Mixed drop (.canvas + md/image) silently discards non-canvas files

**Files:** `components/canvas/dropzone.tsx:29-39`

`arr.find((f) => f.name.toLowerCase().endsWith('.canvas'))` selects the first `.canvas` in the drop. If the `FileList` contains a `.canvas` alongside markdown or image files, the early `return` on line 39 discards the other files with no feedback. The design spec calls `.canvas` "handled exclusively" — the behaviour is intentional per Decision 5. However, users who accidentally include a `.canvas` in a mixed batch receive no indication that their md/image files were not added.

**Resolution:** deferred — intentional per Decision 5 / plan spec.

#### Finding 7 — [info] Raw ZodError.message surfaced in dropzone import-error toast may overflow

**Files:** `components/canvas/dropzone.tsx:36`

`setErr(e2 instanceof Error ? e2.message : 'Invalid .canvas file')` passes the raw `ZodError.message` to the 4500 ms toast (`.fc-dropzone__err`). Zod formats discriminated-union failures as multi-line strings; the toast has `max-width:70%` and no `overflow:hidden`, so a long Zod message will reflow beyond the intended footprint. No functional regression — the raw message aids debugging.

**Resolution:** deferred — advisory; raw ZodError is informative; CSS reflow is cosmetic.

---

## Check 2026-06-29 18:00 — Phase 4

**Reviewer:** flowcode:code-reviewer-agent
**Scope:** Phase 4 — Living Core Spine & Bidirectional Linking
**Plan:** 004-generation-loop
**Baseline conformance:** flagged (3)
**Gate outcome:** WARN
**Summary:** All Phase 4 acceptance criteria are met — spine renders, edits, dirties, submits, and single-open-round blocks correctly; bidirectional highlight works both directions; switcher, inspector §chip, and one-shot CSS pulse are wired. Three medium findings (core-spine.md absent, store.md + canvas-shell.md stale) block commits/PRs via qa-probe-gate.js. Static gates all green (tsc 0 · lint 0 · build ok · vitest 177/177 · live CDP spine verify PASS); no critical or high findings.

### Stack Gate

| Gate | Outcome | Notes |
|------|---------|-------|
| Typecheck | pass | `npx tsc --noEmit` exit 0 — re-verified by reviewer |
| Lint | pass | `npm run lint` exit 0 — re-verified by reviewer |
| Build | pass | `npm run build` exit 0 — re-verified by reviewer |
| Unit tests | pass | `npx vitest run` 177/177 — re-verified by reviewer (no new pure-lib tests; spine + bidirectional logic covered by live CDP smoke) |
| Integration (MCP smoke) | pass | Live CDP spine verify PASS — executor-reported; `scripts/smoke-mcp.mjs` 8 tools still green |
| E2E (render smoke) | pass | Live CDP spine verify PASS — executor-reported; full spine render + edit + dirty + submit + close flow exercised |

### Review Findings

#### Finding 1 — [medium] core-spine.md module doc not created at Phase 4 close

**Files:** `.flowcode/project/modules/` (absent: `core-spine.md`)

The plan spec states "NEW module doc (`core-spine.md`) created at Phase 4 close." The modules directory contains no `core-spine.md`. Any Phase 5 planning agent that looks up the spine pane public API — `CoreSpineProps`, `onClose`, testids `core-spine`/`spine-edit-toggle`/`spine-dirty`/`spine-editor`/`spine-submit`/`spine-switcher`/`spine-section` — has no contract to read. The `store.md` dependents list will also be missing this consumer.

**Suggested fix:** Create `.flowcode/project/modules/core-spine.md` via `flowcode:module-explorer-agent` covering: purpose (docked living-core-doc pane), public API (`CoreSpineProps`, component exports, testid table), store subscriptions (`coreDocBody`, `coreDocDraft`, `coreDocDirty`, `spineHighlightAnchor` + six actions), key insights (single-open-round invariant, one-shot CSS pulse, `CSS.escape` DOM lookup, `live = false` fetch guard, `dangerouslySetInnerHTML` safety source), dependencies, and known gaps (fenced-code-block false entries in `outlineOf` TOC — carryforward from Phase 1 Finding 7).

**Resolution:** fixed — `.flowcode/project/modules/core-spine.md` created (module-explorer) at full depth: `CoreSpineProps`, the render/edit/dirty/submit loop + single-open-round invariant, the `citedDocPaths` switcher, the section↔component pulse, the testid table, store subscriptions, dependencies, and key insights. (The `outlineOf` fenced-block gap is now closed in code — Finding 10.)

#### Finding 2 — [medium] store.md stale — Phase 4 CanvasState fields and six new actions absent

**Files:** `.flowcode/project/modules/store.md:60-75`

The `CanvasState` interface block at `store.md:60-75` ends at `focusNodeId` and does not list the five Phase 4 transient fields added at `lib/canvas/store.ts:35-39`: `coreDocBody`, `coreDocDraft`, `coreDocDirty`, `spineHighlightAnchor`, `linkedNodeIds`. None of the six new actions (`setCoreDoc`, `editCoreDoc`, `submitCoreDocEdit`, `highlightSpineSection`, `highlightComponents`, `clearLinkHighlight`) appear anywhere in `store.md`. Any Phase 5 agent reading `store.md` to understand the phase boundary will miss the full bidirectional-linking contract and the single-open-round invariant.

**Suggested fix:** Add the five Phase 4 transient fields under the `// --- Transient ---` comment in the `CanvasState` block; add a `#### Core Doc / Bidirectional Linking (Phase 4)` subsection inside `### Functions / Methods` documenting all six new actions including the `submitCoreDocEdit` `pendingReview` guard.

**Resolution:** fixed — `store.md` refreshed (artifact-updater): the five transient fields added to the State Shape, a "Core Doc / Bidirectional Linking (Phase 4)" section documenting all six actions (incl. the `submitCoreDocEdit` `pendingReview` guard), the `load`/`newBoard`/`clearBoard` Phase 4 resets, and the `buildSourceIndex`+`normPath` spine dependency.

#### Finding 3 — [medium] canvas-shell.md stale — Phase 4 CoreSpine integration undocumented

**Files:** `.flowcode/project/modules/canvas-shell.md:26,47-48`

The module description at `canvas-shell.md:26` lists all chrome components mounted by `CanvasFlow` — `ReaderDrawer`, `ExportPanel`, `BoardDialog`, etc. — but omits `CoreSpine`. The mermaid diagram at lines 47–48 has no node for the spine pane. The three Phase 4 shell additions — `spineOpen` state, `spineAvailable` computed value, and the `linkedNodeIds` → `fc-rf--linked` class tagging inside the `rfNodes` useMemo — are not documented. Phase 5 design agents reading `canvas-shell.md` to understand tri-pane layout will not know the spine is a fourth docked panel managed by `canvas-shell.tsx`.

**Suggested fix:** Update the description to include `CoreSpine` alongside other chrome components; add a `CoreSpine` node to the mermaid diagram; document `spineOpen`, `spineAvailable`, and the `linkedNodeIds` RF-node tagging in the Public API section.

**Resolution:** fixed — `canvas-shell.md` refreshed (artifact-updater): `CoreSpine` added to the chrome list + mermaid diagram; `spineOpen`, `spineAvailable`, and the `rfNodes`/`fc-rf--linked` tagging documented in the Public API; `linkedNodeIds` + `citedDocPaths` dependencies noted.

#### Finding 4 — [low] canvas-nodes.md and studio-rails.md stale — Phase 4 interactions undocumented

**Files:** `.flowcode/project/modules/canvas-nodes.md:144`, `.flowcode/project/modules/studio-rails.md` (no match)

`canvas-nodes.md:144` documents the `§source` chip as `data-testid="component-source-chip"` with no interaction — the Phase 2 state. Phase 4 changed this to `<button className="fc-cmp__src nodrag nopan" onClick={() => highlightSpineSection(anchor)}>` at `component-node.tsx:83-86`. The `highlightSpineSection` store subscription at `component-node.tsx:51` is also absent from the module doc.

`studio-rails.md` has no mention of the three Phase 4 additions to `inspector-rail.tsx`: the `highlightSpineSection` store subscription (`inspector-rail.tsx:25`), the `inspector-kind` component-kind eyebrow (`inspector-rail.tsx:247`), and the `inspector-spine-section` button (`inspector-rail.tsx:297`).

**Suggested fix:** Update `canvas-nodes.md` ComponentNode entry: note `§source` chip is now a `button.nodrag.nopan → highlightSpineSection` and add the `highlightSpineSection` store subscription. Update `studio-rails.md` InspectorRail section: document the `highlightSpineSection` subscription and the two new testids.

**Resolution:** fixed — `canvas-nodes.md` (ComponentNode `§source` chip → `button.nodrag.nopan` → `highlightSpineSection` + the store subscription) and `studio-rails.md` (InspectorRail `highlightSpineSection` subscription + `inspector-kind` eyebrow + `inspector-spine-section` button) refreshed (artifact-updater).

#### Finding 5 — [low] newBoard and clearBoard do not reset Phase 4 transient state

**Files:** `lib/canvas/store.ts:329`, `lib/canvas/store.ts:350`

`newBoard` at `store.ts:318` resets the board via `set({...})` at line 329, omitting `coreDocBody`, `coreDocDraft`, `coreDocDirty`, `spineHighlightAnchor`, and `linkedNodeIds`. `clearBoard` at line 342 makes the same omission at line 350. A user creating or clearing a board while the spine is open will see stale previous-board content in the spine until the next `setCoreDoc` or `load` call. The new board's `coreDocPath` is `undefined`, so the spine renders "No core doc bound" — but stale `coreDocBody`/`coreDocDraft` remain in memory.

**Suggested fix:** Add `coreDocBody: null, coreDocDraft: null, coreDocDirty: false, spineHighlightAnchor: null, linkedNodeIds: []` to both `set` calls.

**Resolution:** fixed — both `newBoard` and `clearBoard` now reset the five Phase 4 transient fields in their `set` calls (no stale spine content survives a new/cleared board).

#### Finding 6 — [low] is-pulse class may linger on a heading after rapid spineHighlightAnchor change

**Files:** `components/canvas/core-spine.tsx:65-74`

The effect at lines 65–74 adds `is-pulse` to the heading element, then schedules `classList.remove('is-pulse')` via a 1500ms timeout. The cleanup at line 73 (`return () => clearTimeout(t)`) cancels the pending timeout on a new `spineHighlightAnchor` change but does not call `classList.remove('is-pulse')` on the now-stale element. If two component chips are clicked within 1500ms the first heading retains the class indefinitely. `studio-spine.css:108-110` confirms the animation fades fully to transparent, so there is no visible style leak — the DOM state is the only artifact.

**Suggested fix:** In the cleanup closure, capture `const captured = el` before returning, then call `captured.classList.remove('is-pulse')` in the cleanup alongside `clearTimeout(t)`.

**Resolution:** fixed — the effect captures `const captured = el` and the cleanup now calls `captured.classList.remove('is-pulse')` alongside `clearTimeout(t)`, so a rapid anchor change can't leave the class on a stale heading.

#### Finding 7 — [low] normPath duplicated in three files — exceeds clean-code extract threshold

**Files:** `lib/canvas/store.ts:102`, `components/canvas/core-spine.tsx:11`, `components/canvas/inspector-rail.tsx:11`

The one-liner `const normPath = (p: string) => p.replace(/^\.?\//, '').replace(/\\/g, '/')` is copied verbatim in three files. `core-spine.tsx:10` and `inspector-rail.tsx:10` both carry the comment "mirrors store.ts normPath" — an explicit acknowledgment of the duplication. `clean-code.md` designates three-way duplication as a hard extract threshold. All three files already import from `@/lib/canvas/spine` or `@/lib/canvas/jsoncanvas`.

**Suggested fix:** Export `normPath` from `lib/canvas/spine.ts` (it is conceptually a path-normalization utility adjacent to `citedDocPaths`) and import it in the three consumers.

**Resolution:** fixed — `normPath` is now exported from `lib/canvas/spine.ts` and imported by `store.ts`, `core-spine.tsx`, and `inspector-rail.tsx`; the three local copies are removed.

#### Finding 8 — [info] highlightComponents rebuilds sourceIndex on every call — memoization opportunity

**Files:** `lib/canvas/store.ts:738-742`

`highlightComponents` at lines 738–742 calls `buildSourceIndex(doc.nodes, coreDocPath)` on every invocation, constructing a fresh `Map<anchor, nodeId[]>` each time. For boards with hundreds of component nodes this is O(n) per click. `core-spine.tsx:38-41` already memoizes `sourceIndex` for the render path — the store action redundantly recomputes it for the selection path.

**Resolution:** deferred — advisory; no regression risk at current board sizes.

#### Finding 9 — [info] submitCoreDocEdit has a TOCTOU window — UI-layer submitting guard is the actual gate

**Files:** `lib/canvas/store.ts:724-731`

`submitCoreDocEdit` at line 724 checks `if (doc.flowcanvas.session.pendingReview)` and throws, then calls `writeFileApi` + `submitToAgent`. Two concurrent calls before `submitToAgent` sets `pendingReview: true` would both pass the guard. JavaScript's single-threaded event loop makes this a hypothetical. `core-spine.tsx:97` (`if (submitting || pendingReview) return`) is the correct practical gate.

**Resolution:** deferred — the UI-layer guard is sufficient; the store guard is defense-in-depth.

#### Finding 10 — [info] outlineOf code-block false TOC entries — Phase 1 Finding 7 now live in Phase 4 interactive TOC

**Files:** `lib/canvas/spine.ts:19`

Phase 1 Finding 7 noted that `outlineOf`'s line-scan regex does not track fenced code block state and will emit false TOC entries for `# heading` lines inside code blocks. Phase 4 now renders `outline` as an interactive TOC (`core-spine.tsx:151-170`) with `highlightComponents` wired to each entry. A false entry produces a dead outline button (no canvas components match the spurious anchor) and a failed `CSS.escape` scroll target. The live CDP verify used real markdown content with no code-block heading collisions, so no regression was observed.

**Suggested fix:** Replace the line-scan in `lib/canvas/spine.ts:outlineOf` with a remark/mdast heading walk (skips code-block nodes by structure), or add fenced-code-block state tracking to the existing regex loop, before general release with untrusted core docs.

**Resolution:** fixed — `outlineOf` now tracks fenced-code state (` ``` `/`~~~`) and skips heading-looking lines inside code blocks; covered by a new `spine.test.ts` case (vitest 178/178). The interactive TOC no longer emits dead entries for code-block `# heading` lines.

---


## Check 2026-06-29 12:00 — Phase 2+3

**Reviewer:** flowcode:code-reviewer-agent
**Scope:** Wave 2 — Phase 2 (System-Design Component Rendering) + Phase 3 (Agent Generation Kit Surfaces)
**Plan:** 004-generation-loop
**Baseline conformance:** flagged (5)
**Gate outcome:** WARN
**Summary:** All Phase 2 and Phase 3 acceptance criteria are satisfied — adapter routing, component widget, MCP tool/resource, and kit UI surface are correct. Two medium baseline-conformance findings (module contract staleness) block commits/PRs via qa-probe-gate.js; no critical or high findings. Static gates green (tsc/lint/build/vitest 177/177 per executor); smokes pending.

### Stack Gate

| Gate | Outcome | Notes |
|------|---------|-------|
| Typecheck | pass | `npx tsc --noEmit` exit 0 — executor-reported |
| Lint | pass | `npm run lint` exit 0 — executor-reported |
| Build | pass | `npm run build` exit 0 — executor-reported |
| Unit tests | pass | `npx vitest run` 177/177 — no new pure-lib test targets in Phase 2+3 (React components + MCP covered by smokes) |
| Integration (MCP smoke) | pending | `npm run smoke:mcp` — `scripts/smoke-mcp.mjs` already updated: asserts 8 tools, `get_generation_kit` base + doc-attached, resource listing + content; runs separately |
| E2E (render smoke) | pending | `npm run smoke:render` — runs separately; component-node visual parity via `data-testid="component-node"` |

### Review Findings

#### Finding 1 — [medium] Four module contracts stale after Phase 2+3 changes

**Files:** `.flowcode/project/modules/canvas-shell.md:97-109`, `.flowcode/project/modules/canvas-toolbar.md:126-133,149-152,326-336`, `.flowcode/project/modules/mcp-sidecar.md:12,42,74`, `.flowcode/project/modules/adapter.md:22,168`

Phase 2 and Phase 3 each modified public API surfaces documented in four module contracts, none of which reflect the changes.

`canvas-shell.md` documents `nodeTypes` with 6 entries (no `component`); the agent-panel state type is stale (`'export' | 'import'`, missing `'kit'`).

`canvas-toolbar.md` documents `CanvasToolbarProps.onOpenAgent: (tab: 'export' | 'import') => void` (missing `'kit'`); the testid table has no `agent-tab-kit`, `generation-kit-button`, or `kit-copy` entries.

`mcp-sidecar.md` states "7 tools" throughout; `get_generation_kit` and `flowcanvas://generation-kit` are completely absent.

`adapter.md` Key Insights describes `nodeKind()` as driving the RF `type` field directly; the Phase 2 `renderType` override (`n.meta?.kind && n.type !== 'group' ? 'component' : nodeKind(n)`) and the `COMPONENT_KIND_META` dependency are undocumented.

Any Phase 4 planning agent reads canvas-shell.md and canvas-toolbar.md (both declared Touched Modules for Phase 4); an MCP-related agent reads mcp-sidecar.md. All four stale contracts will mislead planning.

**Suggested fix:** Update all four module docs — add `component: ComponentNode` to the canvas-shell nodeTypes listing; widen tab types to include `'kit'`; add `agent-tab-kit`, `generation-kit-button`, and `kit-copy` to the canvas-toolbar testid table; update mcp-sidecar to 8 tools and document both Phase 3 additions; update adapter Key Insights to describe the `renderType` routing rule and `COMPONENT_KIND_META` boundary-group accent injection.

**Resolution:** fixed — all four module docs refreshed (artifact-updater): `adapter.md` (renderType routing + `COMPONENT_KIND_META` accent injection + boundary-leaf note), `canvas-shell.md` (7 nodeTypes incl. `component`, widened agent-tab type), `canvas-toolbar.md` (`onOpenAgent` `'kit'`, kit testids, kit tab), `mcp-sidecar.md` (8 tools + the `flowcanvas://generation-kit` resource + `buildKit` dep). (`canvas-nodes.md` for the NEW `component-node.tsx` also refreshed — see Finding 4.)

#### Finding 2 — [medium] project-overview.md MCP Sidecar module table row is stale

**Files:** `.flowcode/project/project-overview.md` (Modules table — MCP Sidecar row)

The Modules table row for `MCP Sidecar` reads "7 tools" and does not mention `get_generation_kit` or `flowcanvas://generation-kit`. `project-overview.md` is loaded at Tier 1 of every agent session across all plans; a wrong tool count could mislead any agent building on the MCP surface.

**Suggested fix:** Update the MCP Sidecar row to "8 tools" and list `get_generation_kit` + `flowcanvas://generation-kit` resource.

**Resolution:** fixed — `project-overview.md` MCP Sidecar row now reads "8 tools", documents `get_generation_kit({ markdownPath? })` and the `flowcanvas://generation-kit` resource, and notes `registerResource`.

#### Finding 3 — [low] COMPONENT_KIND_META.accent diverges from data-kind CSS widget palette with no explanatory comment

**Files:** `lib/canvas/jsoncanvas.ts` (COMPONENT_KIND_META constant), `lib/canvas/adapter.ts:22`, `app/styles/nodes.css:511-519`

`COMPONENT_KIND_META` assigns nyx preset IDs ('1'–'6') for accent. The `data-kind` CSS palette assigns different semantic tokens (service=cyan, datastore=lime, queue=amber, etc.). The two palettes serve separate consumers: `COMPONENT_KIND_META.accent` feeds only the boundary-group `--node-accent` tint in adapter.ts; `data-kind` drives the component widget `--kc` color in nodes.css. No comment explains this split. A developer modifying `COMPONENT_KIND_META.accent` will expect the widget color to change — it will not.

**Suggested fix:** Add an inline comment on `COMPONENT_KIND_META` in `lib/canvas/jsoncanvas.ts` noting that `accent` drives group/boundary outline tinting via `--node-accent` only; component widget color is keyed off `data-kind` in `nodes.css` independently.

**Resolution:** fixed — added a NOTE above `COMPONENT_KIND_META` in `lib/canvas/jsoncanvas.ts` explaining `accent` tints only the group/boundary outline (`--node-accent`), while the leaf widget color is keyed off `data-kind` in `nodes.css`.

#### Finding 4 — [low] canvas-nodes.md Known Gaps "NodeResizeFrame is not yet used by any owned file" is now resolved

**Files:** `.flowcode/project/modules/canvas-nodes.md:293`

The Known Gaps entry states "NodeResizeFrame is not yet used by any owned file. If adopted, each node's individual SIDES.map() blocks … should migrate to it." Phase 2's `component-node.tsx` is now the first consumer.

**Suggested fix:** Update the Known Gaps entry to note that `component-node.tsx` adopted `NodeResizeFrame` in Phase 2 and remove the "not yet used" language.

**Resolution:** fixed — `canvas-nodes.md` updated: `ComponentNode` documented as a full node renderer (7 total) and the first `NodeResizeFrame` adopter; the "not yet used" Known Gap rewritten to list the remaining nodes as migration candidates.

#### Finding 5 — [low] smoke-mcp.mjs header comments are stale — say "all 7 tools" and "Phase 7 coverage"

**Files:** `scripts/smoke-mcp.mjs:2,7`

Line 2 reads "MCP round-trip smoke (Phase 7 coverage)" — a remnant of plan 002. Line 7 reads "all 7 tools register" — the body now asserts 8 tools at line 52-54. Test logic is correct; only the explanatory comments are stale.

**Suggested fix:** Update line 2 to reference 004 Phase 3, and line 7 to read "all 8 tools register".

**Resolution:** fixed — `scripts/smoke-mcp.mjs` header updated to "002 Phase 7 + 004 Phase 3 coverage" and "all 8 tools register (incl. 004 get_generation_kit + the generation-kit resource)".

#### Finding 6 — [info] §source chip has no interaction handler in Phase 2 (by plan design)

**Files:** `components/canvas/nodes/component-node.tsx:79-84`

`component-source-chip` renders the §anchor text with no `onClick` handler. Phase 4 adds `highlightSpineSection`. By plan spec — Phase 2 ships the visual affordance; the interaction lands in Phase 4. When Phase 4 wires the handler it will also need `nodrag nopan` classes on the chip button to prevent RF drag/pan interception.

**Resolution:** deferred — by plan design; Phase 4 adds handler + `nodrag nopan`.

#### Finding 7 — [info] meta.kind:'boundary' on a non-group node routes to 'component' rather than nodeKind fallback

**Files:** `lib/canvas/adapter.ts:18`

The design doc states the renderer falls back to `nodeKind` for the stray case (boundary kind on a non-group). The adapter routes any non-group with `meta.kind` set — including `'boundary'` — to `renderType = 'component'`. component-node.tsx handles it gracefully via `.fc-cmp[data-kind="boundary"]`. Phase 5 validate.ts rejects this shape at import time. No user-visible regression.

**Resolution:** acceptable — validate.ts provides the import-time guard; component-node degrades gracefully.

#### Finding 8 — [info] readFileApi core-doc fetch failure is silently swallowed in kit tab

**Files:** `components/canvas/export-panel.tsx:49-52`

If `readFileApi(coreDocPath)` throws (ENOENT, guard violation), `coreMd` stays null and the kit copies the base form with no user-visible error indicator. Acceptable for Phase 3 where `coreDocPath` is not yet populated by default. When Phase 4 makes the core doc path central, an error hint in the "your markdown" slot would improve clarity.

**Resolution:** deferred — acceptable Phase 3 behavior; Phase 4 may add an error indicator.

---

## Check 2026-06-29 00:00 — Phase 1

**Reviewer:** flowcode:code-reviewer-agent
**Scope:** Phase 1 — Schema & Pure-Lib Foundation
**Plan:** 004-generation-loop
**Baseline conformance:** flagged (6)
**Gate outcome:** WARN
**Summary:** All acceptance criteria are satisfied and every executor-reported gate is green (tsc, lint, build, vitest 173/173). Four medium and two low findings are present; none rise to critical or high, so phase close is not blocked, but the medium findings must be resolved before the qa-probe gate clears for commits/PRs.

### Stack Gate

| Gate | Outcome | Notes |
|------|---------|-------|
| Typecheck | pass | `npx tsc --noEmit` exit 0 — reported by executor |
| Lint | pass | `npm run lint` exit 0 — reported by executor |
| Build | pass | `npm run build` exit 0 — reported by executor |
| Unit tests | pass | `npx vitest run` 177/177 (157 prior + 16 new pure-lib + 4 new brief round-trip) — re-verified after review fixes |
| Integration (MCP smoke) | n/a | Phase 1 adds no MCP surface; exercised at Phase 3 |
| E2E / smoke render | n/a | Phase 1 is pure-lib + renderer plugin; no UI shipped; parity verified by `spine.test.ts` slug-parity test |

### Review Findings

#### Finding 1 — [medium] validate.ts node schemas strip GroupNode background/backgroundStyle fields

**Files:** `lib/canvas/validate.ts:11-16`

The four `z.object()` schemas in the discriminated-union node validator do not call `.passthrough()`. Zod's default mode silently strips any property not declared in the schema. `GroupNode` carries `background?: string` and `backgroundStyle?: 'cover' | 'ratio' | 'repeat'` (declared at `lib/canvas/jsoncanvas.ts:111`) that are absent from the zod group schema. Any `.canvas` board that uses group background styling would have those fields silently dropped by `parseFlowcanvasDoc`, causing data loss on the Phase 5 import path. The same risk applies to any future node-level extension property.

**Suggested fix:** Add `.passthrough()` to all four `z.object()` node schemas inside the discriminated union so unknown node-level fields survive validation unchanged, consistent with the `.passthrough()` already present on the edge, flowcanvas-ext, and session zod schemas in the same file.

**Resolution:** fixed — `.passthrough()` added to all four discriminated-union node member schemas (file/link/text/group) in `lib/canvas/validate.ts`, so unmodeled fields (`GroupNode.background`/`backgroundStyle`, edge sides, future extensions) survive `parseFlowcanvasDoc` unchanged. Boundary + kind enum tests in `validate.test.ts` still pass (177/177).

#### Finding 2 — [medium] schema.md module contract stale — does not reflect Phase 1 exports

**Files:** `.flowcode/project/modules/schema.md:92, 168`

The module doc still declares `SCHEMA_VERSIONS = ['0.1', '0.2'] as const` and `schemaVersion: '0.1' | '0.2'`, and does not document the eight new exports added in Phase 1: `ComponentKind`, `COMPONENT_KINDS`, `ComponentKindMeta`, `COMPONENT_KIND_META`, `NodeMeta.kind`, `SessionMeta.coreDocPath`, the widened `SCHEMA_VERSIONS` (`['0.1','0.2','0.3']`), or the widened `FlowcanvasExt.schemaVersion` (`'0.1'|'0.2'|'0.3'`). A developer or agent reading the module doc gets an incorrect picture of the public API and the constraint that `ComponentKind` must remain DISTINCT from `NodeKind` (Decision 1). The Key Insights and Known Gaps sections also need updating to note `NodeKind` / `ComponentKind` naming discipline.

**Suggested fix:** Update `schema.md` Public API section to add the new types/constants, update the SCHEMA_VERSIONS and FlowcanvasExt.schemaVersion signatures, and add the ComponentKind naming-constraint note to Key Insights.

**Resolution:** fixed — `.flowcode/project/modules/schema.md` refreshed (artifact-updater) with the 8 Phase 1 exports (`ComponentKind`, `COMPONENT_KINDS`, `ComponentKindMeta`, `COMPONENT_KIND_META`, `NodeMeta.kind`, `SessionMeta.coreDocPath`), widened `SCHEMA_VERSIONS`/`FlowcanvasExt.schemaVersion`, and a Key Insight that `ComponentKind` is DISTINCT from `NodeKind` (Decision 1). Citations re-synced to post-insertion line numbers.

#### Finding 3 — [medium] New module docs not created at phase close (generation-kit, spine, validate, migrate)

**Files:** `.flowcode/project/modules/` (missing: `generation-kit.md`, `spine.md`, `validate.md`, `migrate.md`)

The plan states "NEW module docs (generation-kit, spine, validate, migrate) are created at this phase close." The directory currently contains no files for these four new modules. Without module docs, downstream agents planning Phases 2–5 cannot read the public API contracts for `kitSections()`, `buildKit()`, `slugify()`, `outlineOf()`, `buildSourceIndex()`, `citedDocPaths()`, `parseFlowcanvasDoc()`, `flowcanvasDocSchema`, or `migrateDoc()` — which are all called across multiple later phases.

**Suggested fix:** Create `generation-kit.md`, `spine.md`, `validate.md`, and `migrate.md` in `.flowcode/project/modules/` using the module doc template. Each file must minimally cover: purpose, public API signatures, dependencies, key insights (especially the purity guarantee and the `ComponentKind` / zod-boundary constraints), and known gaps.

**Resolution:** fixed — all four deep module docs created by parallel `flowcode:module-explorer-agent` dispatches: `.flowcode/project/modules/{generation-kit,spine,validate,migrate}.md`, each with real signatures, dependencies, examples, key insights, and known gaps grounded in source.

#### Finding 4 — [medium] brief.test.ts has no direct coverage for Phase 1 new fields

**Files:** `lib/canvas/brief.test.ts` (no line — by absence)

The brief.test.ts suite does not contain any test that (a) sets `meta.kind` on a node and asserts `buildBrief` emits `componentKind` on the `BriefNode`, (b) passes `AgentNode.kind` to `applyResponse` and asserts `nodeFromAgent` writes `meta.kind` on the resulting `CanvasNode`, or (c) sets `session.coreDocPath` and asserts `buildBrief` emits `coreDocPath` on the `DesignBrief`. Line 45 (`brief.responseContract === AGENT_CONTRACT`) verifies the single-source contract re-export, which is good, but the three new round-trip fields are untested. A regression in the `componentKind` or `kind` threading would not be caught by the existing suite.

**Suggested fix:** Add a single test block to `brief.test.ts` that builds a doc with two nodes carrying `meta.kind:'service'` and `meta.kind:'boundary'` and `session.coreDocPath`, calls `buildBrief`, asserts `componentKind` on the brief nodes and `coreDocPath` on the brief, then applies an `AgentResponse` with `kind:'datastore'` and asserts the resulting node has `meta.kind:'datastore'`.

**Resolution:** fixed — added `describe('004 generation-loop round-trip')` to `lib/canvas/brief.test.ts` (4 tests): `buildBrief` emits `componentKind` when `meta.kind` is set and `coreDocPath` when the session carries one; omits `coreDocPath` when absent; `applyResponse` threads `AgentNode.kind → meta.kind` (new + existing nodes); `responseContract === AGENT_CONTRACT` and contains the kit's `COMPONENT KINDS` text. vitest 177/177.

#### Finding 5 — [low] validate.ts double-cast lacks explanatory comment

**Files:** `lib/canvas/validate.ts:34`

The line `}) as unknown as z.ZodType<FlowcanvasDoc>` uses a double-cast to bridge the gap between zod's inferred type after `superRefine` and the declared `FlowcanvasDoc`. `clean-code.md` requires an inline reason for any type suppression cast. Without a comment, a future reader cannot tell whether the cast hides a genuine type error or a known zod/TypeScript friction point.

**Suggested fix:** Add an inline comment such as `// zod's superRefine narrows the inferred output away from FlowcanvasDoc; cast back to the known shape` immediately before or on the same line as the cast.

**Resolution:** fixed — added a 3-line comment above the cast in `lib/canvas/validate.ts` explaining that `superRefine` widens the inferred type and `.passthrough()` loosens it, so the runtime-validated schema is asserted back to the `FlowcanvasDoc` contract type.

#### Finding 6 — [low] brief.md and render-md.md module contracts are stale

**Files:** `.flowcode/project/modules/brief.md:210, 369`, `.flowcode/project/modules/render-md.md` (pipeline diagram)

`brief.md` line 210 still shows `export const AGENT_CONTRACT: string  // verbatim contract shipped...` without noting it is now a re-export of `kitSections().schemaContract`, and the Known Gaps entry at line 369 ("No automated sync check between AGENT_CONTRACT and docs/flowcanvas-agent-contract.md — drift is possible") describes a problem that Phase 1 resolves. `brief.md` also does not document the three new interface fields (`BriefNode.componentKind`, `AgentNode.kind`, `DesignBrief.coreDocPath`) or the new dependency on `generation-kit.ts`. The `render-md.md` pipeline diagram is missing the `rehype-slug` step inserted in Phase 1 (between `rehypeSanitize` and `@shikijs/rehype`).

**Suggested fix:** Update `brief.md` to reflect the re-export nature of `AGENT_CONTRACT`, add the three new fields to the interface listings, update the Known Gaps section, and add `generation-kit.ts` to dependencies. Update the `render-md.md` pipeline diagram to include the `rehype-slug` node.

**Resolution:** fixed — `brief.md` updated (AGENT_CONTRACT now a re-export of `kitSections().schemaContract`; `BriefNode.componentKind`/`AgentNode.kind`/`DesignBrief.coreDocPath` added; `generation-kit.ts` dependency; "no automated sync" Known Gap struck as resolved) and `render-md.md` pipeline diagram + dependency table updated with the `rehype-slug` step (three-way slug parity). Both via artifact-updater.

#### Finding 7 — [info] outlineOf regex scans fenced code block content as headings

**Files:** `lib/canvas/spine.ts:19`

The regex `/^(#{1,6})\s+(.+?)\s*#*\s*$/` applied line-by-line does not track whether the current line is inside a fenced code block. A markdown body containing a code example with ATX-heading-style lines (e.g., `# some-heading` inside a ` ``` ` block) would produce false spine entries. The plan explicitly specified a "regex/line-scan" approach for Phase 1, so this is by design and acceptable. However, Phase 4's `core-spine.tsx` will render the spine as interactive TOC — false entries there would create broken bidirectional links.

**Suggested fix:** No action required for Phase 1. When Phase 4 lands, consider replacing the line-scan with a proper remark/mdast heading walk (which skips code blocks by construction) to eliminate false entries before the spine becomes interactive.

**Resolution:** deferred — acceptable for Phase 1 by plan spec; revisit at Phase 4.

#### Finding 8 — [info] store.ts one-time migration still writes schemaVersion 0.2

**Files:** `lib/canvas/store.ts:138`

The store's `load` action still performs its own inline `0.1 → 0.2` migration and writes `schemaVersion: '0.2' as const`, independent of the new `migrateDoc` ladder. This means boards opened via the existing flow are persisted as `0.2`, while `migrateDoc` takes them to `0.3`. The divergence is expected: the plan defers the store update to Phase 5 ("store.load/newBoard go through migrateDoc and persist '0.3'"). There is no user-visible impact until Phase 5 lands.

**Suggested fix:** No action required for Phase 1. Resolved in Phase 5 when `store.load` and `newBoard` adopt `migrateDoc`.

**Resolution:** deferred — Phase 5 work by plan spec.

---

<!-- Older QA runs continue below. New runs are prepended above this line, directly under the file header. Never rewrite prior sections. -->

---
name: 002-system-design-studio-log
description: Per-plan execution log for Flowcanvas System Design Studio (v2) — plan-created, per-phase, and plan-complete entries.
status: active
tags: [plan-log, execution-log, canvas, agent, mcp]
links: [.flowcode/plans/002-system-design-studio/002-system-design-studio-plan.md, .flowcode/plans/002-system-design-studio/002-system-design-studio-design.md]
---

# 002-system-design-studio — Flowcanvas System Design Studio (v2) Log

- Per-plan execution record: exactly one per plan at `.flowcode/plans/002-system-design-studio/002-system-design-studio-log.md`, created with the plan folder.
- Reverse chronological — newest entry at top, directly below the header; updated at every phase end and at plan end; never deleted.
- Holds three entry formats (see `plan-log-template.md`): `[PLAN CREATED]` (once), `[PHASE]` (each phase end), `[PLAN COMPLETE]` (once at plan end).
- Every entry opens with `**Dev:**` — the developer who did this work, from the session banner's `Acting as Dev:` line; never invented.

---

## [FOLLOW-UP] Studio UX follow-ups — done — 2026-06-28 (post-close)

**Dev:** david-ds-teles <davidarius2@gmail.com>
**Started:** 2026-06-28
**Completed:** 2026-06-28
**Trigger:** Operator picked the three highest-visibility deferred follow-up items from the technical-overview (drag-to-canvas templates · scope-aware submit · collapsed-rail thin icon strip) and approved folding in the directly-related document-template path-collision fix that drag-to-canvas makes easy to trip. Worked on an isolated `flowcanvas/studio-ux-followups` worktree.
**Built:** (1) **Drag-to-canvas templates** — template cards are now `draggable` and serialise the `CanvasTemplate` onto `dataTransfer` under a private MIME; a new `TemplateDropLayer` (window listeners mirroring `Dropzone`) projects the drop point to flow space (`screenToFlowPosition`) and calls `store.addTemplate(t, x, y)`, so a fragment lands where it is dropped. A cyan drop overlay shows during the drag; the `+ Instantiate` button stays as the a11y fallback. The two drop surfaces never both activate — they key off different `dataTransfer` types (`Files` vs the template MIME). (2) **Scope-aware submit** — the inspector's existing Whole-board/Selection toggle is now wired end-to-end via a single primitive: `submitToAgent` stamps `session.briefScope` and the pure `buildBrief` self-narrows to that selection's structural closure (selected + ancestor groups + group descendants + internal edges + anchored comments). One chokepoint covers both the MCP `get_board` and clipboard Export paths, so no MCP/route/`ActiveBoard` change was needed; scope narrows only the brief (full board still saved + snapshotted, so change-review is unaffected). `accept`/`discardRound` clear the scope; a dynamic submit-panel note reflects the selection. (3) **Collapsed-rail strips** — a collapsed rail renders a slim 44px in-flow icon column (so it never overlaps the canvas Controls/minimap): left = Structure + Templates reopen icons (restore-to-tab), right = Inspector icon, wired to the existing toggles. (4) **Doc-template path collision** — `instantiateTemplate` uniquifies each `files[].path` (suffix minted after node/edge ids to preserve the id sequence) and rewrites the matching file node, so repeat drops of a document template never collide.
**Files:** `components/canvas/template-drop.tsx` (new), `components/canvas/template-tray.tsx`, `components/canvas/inspector-rail.tsx`, `components/canvas/canvas-shell.tsx`, `lib/canvas/jsoncanvas.ts` (`SessionMeta.briefScope`), `lib/canvas/brief.ts` (`scopeNodes` + scoped `buildBrief`), `lib/canvas/store.ts` (`submitToAgent`/`acceptRound`/`discardRound`), `lib/canvas/templates.ts` (path uniquify), `app/styles/studio-shell.css` (rail strips + template drop overlay), `app/styles/studio-template.css` (grab cursor + drag hint), `lib/canvas/brief.test.ts` (+3), `lib/canvas/templates.test.ts` (net +1)
**Gates:** `tsc 0 · lint 0 (0 warnings) · build ok (full v2 route table) · vitest 147/147 (143 + 4) · smoke:mcp PASS · smoke:render PASS · runtime CDP verify 13/13 (clean console)` — rail collapse→strip→reopen both sides · template dragstart payload + dragover overlay + drop instantiates one node + overlay clears · structure-rail selection · submit panel + Selection scope + dynamic note + `session.briefScope` persisted with `pendingReview`.
**Deviations:** Scope-aware submit landed via `session.briefScope` (carried in the persisted board) rather than threading a `scopeNodeIds` through `ActiveBoard` → MCP `get_board` — collapsing to the single primitive `buildBrief` already chokes on, so both round-trip paths inherit it for free. Document-template paths are uniquified on every instantiation (not just repeats) — predictable and never clobbers a real on-disk doc. The dropped-template overlay shows generic copy (the template name isn't readable from `dataTransfer` during `dragover` — only its type — by browser security).

---

## [PHASE 8] Studio UX & Deletion Remediation — done — 2026-06-29 (round 2)

**Dev:** david-ds-teles <davidarius2@gmail.com>
**Started:** 2026-06-29
**Completed:** 2026-06-29
**Trigger:** Operator runtime testing (round 2) surfaced 8 UX/interaction defects on the closed plan. Runtime triage (headless-Chrome CDP over the live app, both boards, real interaction + console capture) reconciled each: 3 were already functional in shipped code (Submit/Templates/Bundle work; drag-drop overlay + `/api/upload` work; loading a board renders all nodes/edges) and reduced to discoverability; the rest were real.
**Built:** (1) **Node/edge deletion** — the prime real defect: `adapter` set `deletable:false` on every node and there was no `removeNode` action, so widgets were undeletable. Added `store.removeNode` (drops the node + its edges + anchored comments; orphans group children), flipped `deletable:true`, wired a node-`remove` write-back in `use-canvas-handlers` (mirrors the edge path; RF skips the key while an input is focused), and added three discoverable affordances — a toolbar **Delete** (trash, enabled on selection · Del), an inspector **Delete node**, and a **Delete connection** in the edge rel picker. (2) **Empty board + New/Clear** — reset `flowcanvas.canvas` to 0 nodes (operator choice) and rendered the mockup-`05` **"No board open"** empty state (Open .canvas… / Extract via agent) over any 0-node board; added `store.newBoard` (mint + adopt a fresh `untitled-*.canvas`) and `store.clearBoard` (wipe current board) wired to **File ▸ New board** and **File ▸ Clear board…** behind a confirm modal. (3) **Reader z-index** — raised `.fc-toolbar` to `z-index:30` (above the `.fc-reader`/`.fc-agent` drawers at 12) so the toolbar bar + its downward flyout menus are never hidden behind an open reader. (4) **Tooltips** — added `title` to the structure/templates rail tabs; audited the toolbar (already titled).
**Files:** `lib/canvas/store.ts` (`removeNode`/`newBoard`/`clearBoard`), `lib/canvas/adapter.ts` (`deletable:true`), `components/canvas/use-canvas-handlers.ts` (node-remove write-back), `components/canvas/canvas-toolbar.tsx` (New/Clear menu items + Delete button), `components/canvas/inspector-rail.tsx` (Delete node), `components/canvas/edges/labeled-edge.tsx` (Delete connection), `components/canvas/canvas-shell.tsx` (empty-state overlay + clear-confirm modal + rail-tab tooltips), `app/styles/toolbar.css` (toolbar z-index 30 + `--danger` variant), `app/styles/studio-shell.css` (empty-board · confirm modal · edge-delete), `app/styles/studio-inspector.css` (delete-node), `flowcanvas.canvas` + `.flowcanvas/active-board.json` (reset to empty)
**Gates:** `tsc 0 · lint 0 (0 warnings) · build ok (full v2 route table) · vitest 143/143 · smoke:mcp PASS (9/9) · smoke:render PASS (5/5) · runtime verification 18/18` (CDP harness: empty-state default · New/Clear+confirm · node delete via key/inspector/toolbar · edge delete via picker · toolbar-above-reader stacking · dropzone activation · `/api/upload` 200).
**Deviations:** `newBoard` writes the untitled board to disk immediately (survives reload, keeps the active-board pointer valid) rather than holding an unsaved in-memory board. The default board ships empty (operator choice over the prior welcome demo). The lone CDP "uncaught exception" is a harness artifact (`d3-drag.mousedowned` chokes on a synthetic `mousedown` with no `view`) — not reproducible with real mouse input.

---

## [PLAN COMPLETE] — 2026-06-29 (re-close)

**Dev:** david-ds-teles <davidarius2@gmail.com>
**Delivered:** Phase 7 (Runtime Defect Remediation) closed the reopen. Runtime triage (app + MCP sidecar + headless-Chrome CDP + a scripted MCP round-trip and submit→reload→review cycle) found the prime suspect (0-height tri-pane canvas) was a PASS and most v2 surfaces functional; the real gap was that the studio was unexercisable on launch (stale v0.1 default board + no templates). Fixed four defects — D1 canvas selection sync, D2 importable v2 demo board + sample templates, D3 MCP `lastBriefId` stamp (no longer falsely stale), D4 non-blocking round-ready banner — all runtime-verified. Added route-contract + MCP + render coverage so green static gates can't recertify a non-working UI.
**Phases:** 7/7 — Phases 1–6 `complete`, Phase 7 `done`.
**Artifacts:** updated `002-system-design-studio-{qa-report,technical-overview,changelog,test-notes,plan,log}.md`; `project-overview.md` (gates + Evolution Log); `quality-gates.md` (smoke gates).
**Gates:** tsc 0 · lint 0 (0 warnings) · build ok (full v2 route table) · vitest 143/143 (129 + 14 route-contract) · `npm run smoke:mcp` PASS · `npm run smoke:render` PASS · plan-completion review PASS (0 ≥medium; 2 low + 3 info all resolved/accepted).
**Follow-ups:** Decision-10 disk-divergence reconcile banner; 1280-px visual pixel-diff; collapsed-rail thin icon strip; drag-to-canvas templates; scope-aware submit; `instantiateTemplate` should uniquify document-template file paths.

---

## [PHASE 7] Runtime Defect Remediation — done — 2026-06-29

**Dev:** david-ds-teles <davidarius2@gmail.com>
**Started:** 2026-06-29
**Completed:** 2026-06-29
**Built:** Triaged every v2 surface + Decisions 1–10 at runtime (PASS/FAIL matrix in the qa-report) and fixed the four real defects. **D1** — `use-canvas-handlers` now syncs store `selectedIds` → React Flow `node.selected` (structure-rail clicks + `navigateRef` focus highlight the canvas node, not just the inspector). **D2** — shipped `examples/commerce-platform.canvas` (3 subsystem groups · 8 typed-`rel` edges · 4 provenance nodes · off-board ref · image+note+link) + 8 content docs + `templates/{tpl-note,tpl-flow,tpl-service}.canvas` (node/diagram/document) — an importable file that validates every studio surface (default board left unchanged per operator). **D3** — MCP `get_board` stamps `session.lastBriefId` via a new `bump:false` POST `/api/canvas`, so `apply_response` is no longer falsely `stale`. **D4** — `use-round-ready` polls the persisted revision while `pendingReview` and shows a non-blocking "Agent round ready — Reload to review" banner. Coverage: 14 route-contract vitest tests (now in-gate) + `smoke:mcp` + `smoke:render`.
**Files:** `components/canvas/use-canvas-handlers.ts`, `components/canvas/use-round-ready.ts` (new), `components/canvas/canvas-shell.tsx`, `app/styles/studio-shell.css`, `app/api/canvas/route.ts`, `mcp/flowcanvas-mcp.ts`, `app/api/routes-contract.test.ts` (new), `scripts/smoke-{mcp,render}.mjs` (new), `package.json`, `vitest.config.ts`, `.flowcode/quality-checks/quality-gates.md`, `examples/commerce-platform.canvas` + `examples/commerce-platform/*` (new), `templates/*.canvas` (new)
**Gates:** `tsc 0 · lint 0 (0 warnings) · build ok (full v2 route table) · vitest 143/143 · smoke:mcp PASS (9/9) · smoke:render PASS (5/5) · review PASS (0 ≥medium; 2 low + 3 info resolved/accepted) · runtime checklist green`
**Deviations:** D2 shipped as an importable demo file rather than a default-board swap (operator choice). `onReloadRound` also opens the review pane inline (additive UX). Demo board carries provenance on 4 of 9 file nodes (sufficient to demonstrate Decision 2). Low/info review findings folded in: project-overview gate-table refresh, smoke-render Chrome-detection fix, smoke-mcp dead-code cleanup, route-test `beforeAll` mkdir, template file-path-collision logged as a follow-up.

---

## [PLAN REOPENED] — 2026-06-28

**Dev:** david-ds-teles <davidarius2@gmail.com>
**Trigger:** Operator runtime testing after plan close — **~half the designed v2 features do not work end-to-end.**
**Root-cause (process):** Phases 1–6 were certified on static gates (tsc 0 · lint 0 · build ok · vitest 129/129) + code review only. None of that exercises the wired runtime — the tri-pane shell render, store↔API↔UI flows, the MCP round-trip, and the submit/change-review cycle were never run; visual-parity + MCP-handshake verification were explicitly deferred. Green static gates certified a non-working UI.
**Action:** Plan status `complete` → `active`; added **Phase 7 — Runtime Defect Remediation** (triage-first, runtime-verified). The Phase 1–6 `[PHASE]` entries below stand (code was written + statically gated); Phase 7 makes the features actually work and adds the missing integration/runtime coverage.
**Next:** the operator drives a fix session from the triage prompt (run app + sidecar, exercise every surface/Decision, build the defect list, fix + runtime-verify each). Highest-risk un-verified change: the `canvas-shell` tri-pane / ReactFlow sizing + the toolbar reflow. Code committed at `bd91947` on branch `002-system-design-studio/implementation`.

---

## [PLAN COMPLETE] — 2026-06-28

**Dev:** david-ds-teles <davidarius2@gmail.com>
**Delivered:** Flowcanvas System Design Studio v2 — canvas-authoritative typed-relation graph (`schemaVersion:'0.2'`); pure library layer (`refs.ts`, `review.ts`, `templates.ts`, `edges.projectLinksForExport`); four new HTTP routes (`canvas/review`, `canvas/active`, `canvas/bundle`, `templates`) + `file` GET/DELETE; store v2 rewrite (one-time `0.1→0.2` migration, 7 new actions, no `links:` write-back); 7-tool stdio MCP sidecar; tri-pane studio shell with 4 new UI components and 5 CSS partials.
**Phases:** 6/6 — Phase 1 `complete`, Phase 2 `complete`, Phase 3 `complete`, Phase 4 `complete`, Phase 5 `complete`, Phase 6 `complete-with-warnings`
**Artifacts:** `002-system-design-studio-technical-overview.md`, `002-system-design-studio-changelog.md`, `002-system-design-studio-test-notes.md`, `002-system-design-studio-qa-report.md`
**Follow-ups:** (1) disk-divergence banner + trigger for Decision-10 reconcile (`resyncFile` exists; banner unbuilt); (2) visual-parity CDP pixel capture at 1280/1440; (3) collapsed-rail thin icon strip; (4) `get_board` stamps `session.lastBriefId` to clear `stale:true` in `apply_response`; (5) drag-to-canvas template drop surface; (6) scope-aware submit; (7) live MCP-status probe in the inspector

---

## [PHASE 6] Studio UI Surfaces & Tri-Pane Shell — complete-with-warnings — 2026-06-28

**Dev:** david-ds-teles <davidarius2@gmail.com>
**Started:** 2026-06-28
**Completed:** 2026-06-28
**Built:** The five v2 surfaces inside the `05-studio-canvas` tri-pane shell — Submit (inspector mode → `submitToAgent`), change-review stepper (`review-panel` → accept/discard), typed-edge rel pill + picker (`labeled-edge` → `setEdgeRel`), reference-navigation ↗ chips (frontmatter + reader prose → `navigateRef`), and the template library (`template-tray` → `addTemplate`). Collapsible structure rail · canvas · inspector via `canvas-shell` data-attributes; toolbar `toggle-rail-*`/`toolbar-submit`/`toolbar-templates`/`toolbar-bundle`; `FocusBridge` centers on `focusNodeId`. Built by 4 parallel implementer workers + main-session integration.
**Files:** `components/canvas/review-panel.tsx`, `template-tray.tsx`, `structure-rail.tsx`, `inspector-rail.tsx`, `canvas-shell.tsx`, `canvas-toolbar.tsx`, `edges/labeled-edge.tsx`, `frontmatter-view.tsx`, `reader-drawer.tsx`, `nodes/markdown-node.tsx`, `lib/canvas/store.ts`, `app/globals.css`, `app/styles/studio-{shell,review,template,structure,inspector}.css`
**Gates:** `tsc 0 · lint 0 · build ok (full route table) · vitest 129/129 · dev boots HTTP 200 clean · review PASS (0 ≥medium; 3 low fixed, 2 low accepted/deferred, 4 info noted) · visual-parity: DEFERRED (pixel capture at 1280/1440 needs a browser-automation/CDP pass — none available unattended)`
**Deviations:** Submit consolidated into the inspector's Submit mode (mockup `inspector-submit`), not a duplicate export-panel tab; `export-panel` stays the clipboard fallback. Phase-6 store touches: `setEdgeRel`, `focusNode`. **Deferred (follow-ups):** (1) visual-parity pixel capture at the two breakpoints; (2) the Decision-10 reconcile banner + disk-divergence detection (the `resyncFile` action exists; the banner/trigger are unbuilt); (3) collapsed-rail thin icon strip (currently `width:0`, re-open via toolbar); (4) drag-to-canvas for templates, live MCP-status probe, scope-aware submit (all info-level, button/affordance fallbacks in place). Status `complete-with-warnings` reflects the deferred visual-parity capture.

---

## [PHASE 5] MCP Sidecar & Native Round-Trip — complete — 2026-06-28

**Dev:** david-ds-teles <davidarius2@gmail.com>
**Started:** 2026-06-28
**Completed:** 2026-06-28
**Built:** `mcp/flowcanvas-mcp.ts` — a 7-tool stdio MCP sidecar (`@modelcontextprotocol/sdk` v1.29.0, `registerTool` + zod) wrapping pure `buildBrief`/`applyResponse` + the guarded HTTP routes over `FLOWCANVAS_BASE_URL`: `get_board`, `apply_response`, `read_file`, `write_file`, `list_dir`, `resolve_paths`, `get_active_board`. stderr-only diagnostics. `mcp/README.md` + `package.json` deps/script.
**Files:** `mcp/flowcanvas-mcp.ts`, `mcp/README.md`, `package.json`
**Gates:** `tsc 0 · lint 0 · build ok · vitest 129/129 (unaffected) · review PASS (0 ≥medium) · e2e N/A (MCP handshake is integration-level — needs a running server + MCP client)`
**Deviations:** Ran wave-concurrent with Phase 4 (file-disjoint `mcp/` vs `lib/canvas/*`) via a parallel `flowcode:implementer-agent`. Noted-not-fixed (info): `get_board` mints a `briefId` it does not stamp into `session.lastBriefId`, so `apply_response` reports `stale:true` (last-writer-wins; merge correct) — a Phase-6 Submit stamp clears it. README compiled-path + phase-note fixed at review.

---

## [PHASE 4] Store Integration & Canvas-Authoritative Load — complete — 2026-06-28

**Dev:** david-ds-teles <davidarius2@gmail.com>
**Started:** 2026-06-28
**Completed:** 2026-06-28
**Built:** Canvas-authoritative store — `load` drops the per-load reconcile, runs a one-time immutable `0.1→0.2` migration, writes the active-board pointer, and loads the review snapshot on a pending round; `onConnect`/`removeEdgeWriteback` retire the `links:` write-back (typed `user` edges, `rel:'related'`); 7 v2 actions (`submitToAgent`/`reviewDiff`/`acceptRound`/`discardRound`/`navigateRef`/`addTemplate`/`resyncFile`) + `clearFocus`; adapter threads `meta.rel` to `RFEdge.data` and back. The `/api/canvas/links` route + `patchLinks` are fully removed.
**Files:** `lib/canvas/store.ts`, `lib/canvas/adapter.ts`, `lib/canvas/store.test.ts`, `lib/canvas/adapter.test.ts`, `app/api/file/route.ts`, `lib/api.ts`, `app/api/canvas/links/route.ts` (deleted)
**Gates:** `tsc 0 · lint 0 · build ok (links route gone; active/bundle/review/templates present) · vitest 129/129 · review PASS (0 ≥medium; 1 low + fixes shared with the wave) · e2e N/A (no route e2e harness)`
**Deviations:** Ran as the main-session half of the Phase 4+5 wave. Absorbed Phase 3's links-route deletion + `patchLinks` removal (sequencing fix — atomic with removing the `store.ts` consumer). `addFileNode`→`Promise<string>` (returns the id for `navigateRef`); `resyncFile`→`Promise<void>` (re-reads the file from disk; design showed `void`); `reviewDiff().files` derived from added file-node paths (the MCP sidecar writes generated files out-of-band, so `roundGeneratedFiles` stays `[]`). Added `GET`/`DELETE` to `/api/file` (raw read for MCP `read_file`; markdown delete for `discardRound`). Migration immutability fix applied at review.

---

## [PHASE 3] HTTP API & Fetch Wrappers — complete — 2026-06-28

**Dev:** david-ds-teles <davidarius2@gmail.com>
**Started:** 2026-06-28
**Completed:** 2026-06-28
**Built:** Four new guarded Node-runtime routes — `canvas/review` (GET/POST/DELETE snapshot), `canvas/active` (GET/POST pointer), `templates` (GET list/`?id=`), `canvas/bundle` (GET fflate zip with projected `links:` + manifest) — plus the matching typed `lib/api.ts` wrappers (`getReview`/`putReview`/`clearReview`, `bundleUrl`, `listTemplates`, `getActive`/`putActive`, `ActiveBoard`). `fflate` added.
**Files:** `app/api/canvas/review/route.ts`, `app/api/canvas/active/route.ts`, `app/api/templates/route.ts`, `app/api/canvas/bundle/route.ts`, `lib/api.ts`, `package.json`
**Gates:** `tsc 0 · lint 0 · build ok (4 new routes in table) · vitest 127/127 · review PASS (0 ≥medium; 1 info fixed) · e2e N/A (no route e2e harness)`
**Deviations:** (1) **Sequencing fix** — the planned "delete `/api/canvas/links` route + remove `patchLinks` from `lib/api.ts`" was moved to Phase 4: `store.ts:138,161` + `store.test.ts` still consume `patchLinks`, so removing it here would break the build/leave a runtime 404. Phase 3 is purely additive; the removals land atomically in Phase 4 with the `onConnect`/`removeEdgeWriteback` change. (2) Bundle exposed via `bundleUrl(path)` URL helper (like `assetUrl`) rather than a `getBundle` fetch wrapper — a binary download is consumed as an `<a download href>`. (3) Bundle route adds a `if (files[rel]) continue` dedup so a file referenced by two nodes is bundled once.

---

## [PHASE 2] Pure Library Layer — complete — 2026-06-28

**Dev:** david-ds-teles <davidarius2@gmail.com>
**Started:** 2026-06-28
**Completed:** 2026-06-28
**Built:** Three pure modules consumed by later phases — `review.diffDocs` (snapshot↔current structural diff for change-review, order-insensitive compare), `templates.instantiateTemplate` (fragment clone: fresh ids, coord rebase, parentId/edge remap, provenance stamp), and `edges.projectLinksForExport` (canvas file→file edges → per-file `links:` for bundle export). All fs/DOM-free.
**Files:** `lib/canvas/review.ts`, `lib/canvas/review.test.ts`, `lib/canvas/templates.ts`, `lib/canvas/templates.test.ts`, `lib/canvas/edges.ts`, `lib/canvas/edges.test.ts`
**Gates:** `tsc 0 · lint 0 · build ok · vitest 127/127 · review PASS (0 ≥medium; 2 info fixed) · e2e N/A (pure modules)`
**Deviations:** `diffDocs` takes a 3rd optional `roundGeneratedFiles` param (design showed 2 args) to stay pure while honoring `ReviewDiff.files == roundGeneratedFiles` — documented in the plan; the store (Phase 4) passes `ReviewState.roundGeneratedFiles`. Two info-level coverage gaps from review fixed same day (comment-removal invariant; external-parentId fallback).

---

## [PHASE 1] Schema v2 & Agent Contract Foundation — complete — 2026-06-28

**Dev:** david-ds-teles <davidarius2@gmail.com>
**Started:** 2026-06-28
**Completed:** 2026-06-28
**Built:** Schema-v2 type root (`RelationshipType`/`RELATIONSHIP_TYPES`/`REL_LABELS`, `NodeSource`, `EDGE_ORIGINS`/`SCHEMA_VERSIONS`; `EdgeOrigin`+`'import'`, `NodeMeta.source/template`, `CanvasEdge.meta.rel`, `SessionMeta.baseRevision/pendingReview`, `schemaVersion '0.1'|'0.2'`), the pure `refs.extractRefs` module, and the extended brief/merge contract (groups + typed edges + provenance + refs) with the rewritten `AGENT_CONTRACT` + its docs mirror. All additions optional — `0.1` boards parse unchanged.
**Files:** `lib/canvas/jsoncanvas.ts`, `lib/canvas/refs.ts`, `lib/canvas/refs.test.ts`, `lib/canvas/brief.ts`, `lib/canvas/brief.test.ts`, `docs/flowcanvas-agent-contract.md`, `components/canvas/edges/labeled-edge.tsx`
**Gates:** `tsc 0 · lint 0 · build ok · vitest 92/92 · review: 1 medium + 1 low fixed, 1 info noted · e2e N/A (pure types/lib)`
**Deviations:** (1) `extractRefs` treats frontmatter `links:` as root-relative (not resolved against `basePath`) per flowcode convention — the plan snippet resolved both, which mangled root-relative links and contradicted its own worked example; only body `./`/`../` links resolve against `basePath`. (2) One existing `brief.test.ts` `toEqual` assertion gained `rel:'references'` (buildBrief now always emits `rel`; seed data untouched). (3) Widening `EdgeOrigin` required a one-line `import` stroke entry in `labeled-edge.tsx` (Phase-6 module) to keep typecheck/build green. (4) Review fix: removed the stale "prefer frontmatter links:" line from `AGENT_CONTRACT`; added a group-label-preservation test. All deviations reflected in the plan spec.

---

## [PLAN CREATED] — 2026-06-27

**Dev:** david-ds-teles <davidarius2@gmail.com>
**Scope:** Promote `.canvas` to the authoritative typed relation graph (content stays in live md) — schema v2, agent-driven extraction import over MCP, typed linking, reference navigation, template library, snapshot-diff change-review, bundle export, and the studio UI shell
**Phases planned:** 6 — Schema v2 & Agent Contract Foundation, Pure Library Layer, HTTP API & Fetch Wrappers, Store Integration & Canvas-Authoritative Load, MCP Sidecar & Native Round-Trip, Studio UI Surfaces & Tri-Pane Shell
**Design ref:** `002-system-design-studio-design.md`

---

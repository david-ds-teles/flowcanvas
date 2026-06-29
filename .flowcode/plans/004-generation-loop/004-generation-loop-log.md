# 004-generation-loop — Markdown-Core Generation Loop Log

- Per-plan execution record: exactly one per plan at `.flowcode/plans/004-generation-loop/004-generation-loop-log.md`.
- Reverse chronological — newest entry at top, directly below this header; updated at every phase end and at plan end; never deleted.
- Entry formats: `[PLAN CREATED]` (once), `[PHASE]` (each phase end), `[PLAN COMPLETE]` (once at plan end) — see `plan-log-template.md`.
- Every entry opens with `**Dev:**` taken verbatim from the session banner's `Acting as Dev:` line.

---

## [PLAN COMPLETE] — 2026-06-29

**Dev:** david-ds-teles <david.ds.teles@gmail.com>
**Delivered:** The closed Markdown-Core Generation Loop — a markdown design doc → a discoverable **Agent Generation Kit** (single-source `generation-kit.ts`, served as MCP tool `get_generation_kit` + static resource `flowcanvas://generation-kit` + a UI "Copy full kit") → a **system-design `.canvas`** of kind-typed component widgets (`ComponentKind` on `meta.kind` → `component-node.tsx`) → a **living, editable, bidirectionally-linked core spine** (`core-spine.tsx`: render/edit/dirty/submit-over-MCP + switcher + section↔component pulse) → **frictionless 3-way import** (paste · `.canvas` upload · drag-drop → `parseFlowcanvasDoc` → `migrateDoc` → adopt). Schema bumped `0.2 → 0.3` (additive; boards upgrade on open). Built entirely over Plan 003.
**Phases:** 5/5 — all `complete` (Phase 1 Schema & Pure-Lib Foundation · Phase 2 System-Design Component Rendering ∥ Phase 3 Agent Generation Kit Surfaces · Phase 4 Living Core Spine & Bidirectional Linking · Phase 5 Frictionless Import).
**Artifacts:** `004-generation-loop-{technical-overview,changelog,test-notes,qa-report}.md`; 6 new module docs (`generation-kit`, `spine`, `validate`, `migrate`, `core-spine`, `component-node`) + refreshed (`schema`, `brief`, `render-md`, `adapter`, `store`, `canvas-shell`, `canvas-toolbar`, `studio-rails`, `mcp-sidecar`); `project-overview.md` propagated; showcase `examples/commerce-system.{canvas,md}`.
**Gates:** tsc 0 · lint 0 · build ok · vitest 178/178 (+20) · smoke:mcp PASS (8 tools) · smoke:render PASS · CDP browser automation across all surfaces (component widgets · kit modal · spine bidirectional · import · consolidated full-sweep · showcase) **0 console errors** · all reviews PASS (per-phase + plan-completion; every finding resolved).
**Follow-ups:** store/adapter/MCP have smoke/CDP coverage but no vitest (candidate: a mocked-`api` store harness); the 2 deferred info findings (mixed-drop discards non-canvas files — intentional per Decision 5; raw ZodError toast reflow — cosmetic); committing is held pending operator review (currently on branch `003-canvas-foundation/canvas-foundation` — 004 wants its own branch).

---

## [PHASE 5] Frictionless Import — complete — 2026-06-29

**Dev:** david-ds-teles <david.ds.teles@gmail.com>
**Started:** 2026-06-29
**Completed:** 2026-06-29
**Built:** A generated `.canvas` now enters three ways — JSON paste, `.canvas` upload, `.canvas` drag-drop — all routed through `parseFlowcanvasDoc` (zod) → `importDoc` (write a minted collision-safe board → `load()` adopts: hydrate → `migrateDoc` → persist `'0.3'` → active pointer → `?path=`). The dropzone extension-dispatches (only a `.canvas` diverts, behind a dirty-guard; md/image keep the unchanged add-node path); the import panel detects a pasted full board vs an AgentResponse and adds an "Upload .canvas…" control; all three destructive paths dirty-guard. `load`/`newBoard` route through the shared `migrateDoc` ladder so every opened board upgrades to `0.3`. Shipped a 004 showcase board (`examples/commerce-system.{canvas,md}`).
**Files:** `lib/canvas/store.ts`, `components/canvas/dropzone.tsx`, `components/canvas/export-panel.tsx`, `app/styles/toolbar.css`, `app/api/routes-contract.test.ts`, `examples/commerce-platform.canvas` (0.2→0.3), `examples/commerce-system.canvas` + `examples/commerce-system.md` (NEW showcase); module docs `store.md`/`canvas-toolbar.md` (refreshed)
**Gates:** tsc 0 · lint 0 · build ok · vitest 178/178 · smoke:mcp PASS (8 tools) · smoke:render PASS · **live import CDP PASS** (paste a 0.x board → validate → migrate → adopt at a minted path; board replaced; kind node → component widget) · **consolidated full-sweep CDP PASS** (all 5 phases' surfaces, 0 console errors) · showcase board CDP PASS (8 widgets · 3 boundary groups · spine bound · typed edges) · code review PASS after fixes (1 high + 2 med + 3 low resolved; 2 info deferred).
**Deviations:** `importDoc` writes the validated doc as-is then `load()`s it (so `load`'s hydrate→migrate order governs the 0.1 link-bake) and always mints a collision-safe `<stem>-<rid>.canvas` (never clobbers). The Phase 5 `load`→`migrateDoc` change is a one-time on-open upgrade to `0.3` that re-saves the board — it migrated the committed demo board `examples/commerce-platform.canvas` (0.2→0.3), which surfaced + fixed a stale `routes-contract.test.ts` assertion (review Finding 1). Info findings 6 (mixed-drop discards non-canvas — intentional per Decision 5) and 7 (raw ZodError toast reflow — cosmetic) deferred.

---

## [PHASE 4] Living Core Spine & Bidirectional Linking — complete — 2026-06-29

**Dev:** david-ds-teles <david.ds.teles@gmail.com>
**Started:** 2026-06-29
**Completed:** 2026-06-29
**Built:** The headline of the loop — a docked, editable **living core-markdown spine** (`core-spine.tsx`) bound to `session.coreDocPath`: full-fidelity `/api/render` prose · edit textarea + dirty flag · "Submit changes" that writes the doc and re-submits over MCP (blocked while a review round is open — the single-open-round invariant) · a switcher over every cited doc (Q4). **Bidirectional component↔section linking** built on `buildSourceIndex`: selecting a component (its §chip / the inspector §) scrolls + pulses its spine section; clicking a spine section (or its per-heading component-count badge) pulses its component(s) on the canvas. Six new store actions + five transient fields; the spine mounts as a flex pane between canvas and inspector.
**Files:** `lib/canvas/store.ts`, `components/canvas/core-spine.tsx` (NEW), `components/canvas/canvas-shell.tsx`, `components/canvas/nodes/component-node.tsx`, `components/canvas/inspector-rail.tsx`, `lib/canvas/spine.ts` (+`normPath` export, `outlineOf` fenced-block skip), `app/styles/studio-spine.css` (NEW), `app/styles/nodes.css`, `app/globals.css`, `lib/canvas/spine.test.ts` (+1); module docs `core-spine.md` (NEW) + `{store,canvas-shell,canvas-nodes,studio-rails}.md` (refreshed)
**Gates:** tsc 0 · lint 0 · build ok · vitest 178/178 (+1) · **live CDP spine verify PASS** (spine docked · prose `#auth-service` rehype-slug id [three-way slug parity] · 6 outline rows · 4 component-count badges · component→section highlight · section→component canvas pulse · edit toggle reveals editor · clean console) · code review PASS (3 med + 4 low + 3 info — all resolved: docs created/refreshed; `newBoard`/`clearBoard` spine reset; `is-pulse` cleanup; `normPath` extracted; `outlineOf` fenced-block fix).
**Deviations:** The spine docks as a flex pane between canvas and inspector (the body is `display:flex`, so its width lives in the new `studio-spine.css` — no `studio-shell.css` grid change) rather than the mockup's single right column; the inspector coexists, per ui-design Q (spine + inspector on the right). It mounts when a core doc is bound OR any doc is cited (auto-availability without dirtying — `setCoreDoc` only stamps on an explicit switch). Prose relative-links focus-if-on-board (no phantom-source edge) instead of the reader's `navigateRef` (the core doc is not itself a board node).

---

## [PHASE 3] Agent Generation Kit Surfaces — complete — 2026-06-29

**Dev:** david-ds-teles <david.ds.teles@gmail.com>
**Started:** 2026-06-29
**Completed:** 2026-06-29
**Built:** Exposed the single-source `buildKit` everywhere a consumer needs it — MCP tool `get_generation_kit({ markdownPath? })` (reads the attached doc via `/api/file`) + the static resource `flowcanvas://generation-kit` (`registerResource`, verified vs SDK 1.29.0), and a discoverable UI "Generation Kit" — a toolbar button + a `'kit'` tab in the agent panel with a 5-section nav and a "Copy full kit" that copies `buildKit(coreDocMarkdown)` (raw, Q5). 7→8 MCP tools.
**Files:** `mcp/flowcanvas-mcp.ts`, `components/canvas/export-panel.tsx`, `components/canvas/canvas-toolbar.tsx`, `app/styles/toolbar.css`, `scripts/smoke-mcp.mjs`; module docs `mcp-sidecar.md`/`canvas-toolbar.md` + `project-overview.md` MCP row
**Gates:** tsc 0 · lint 0 · build ok · vitest 177/177 · **smoke:mcp PASS (8 tools — get_generation_kit base + doc-attached + the resource)** · kit-modal CDP verify PASS (modal + 5-section nav + Copy full kit, clean console) · code review PASS (combined Wave 2 check; 2 med + 3 low resolved, 3 info deferred by plan spec).
**Deviations:** The kit UI is a `'kit'` tab in the existing right-drawer agent panel (toolbar button opens it) rather than the mockup's centered modal — acceptable drift, keeps the change within the canvas-toolbar module (export-panel + toolbar). Closed combined with Phase 2 as Wave 2 (file-disjoint, one shared close per `plan-instructions.md § Phase Dependencies & Waves`).

---

## [PHASE 2] System-Design Component Rendering — complete — 2026-06-29

**Dev:** david-ds-teles <david.ds.teles@gmail.com>
**Started:** 2026-06-29
**Completed:** 2026-06-29
**Built:** The canvas now reads as a system-design diagram. `adapter.toReactFlow` routes a non-group node carrying `meta.kind` to a new kind-aware `component-node.tsx` widget (glyph + per-kind accent + one-line role + `§source` chip, 4 handles, resize, comment badge); a `meta.kind:'boundary'`/colored group keeps `type:'group'` and tints via `--node-accent`; kindless nodes render unchanged. Registered the `component` React Flow nodeType (kept `NodeKind`-exhaustive via an intersection type).
**Files:** `lib/canvas/adapter.ts`, `components/canvas/nodes/component-node.tsx` (NEW), `components/canvas/canvas-shell.tsx`, `app/styles/nodes.css`; module docs `adapter.md`/`canvas-nodes.md`/`canvas-shell.md`
**Gates:** tsc 0 · lint 0 · build ok · vitest 177/177 · **smoke:render PASS** (tri-pane, non-zero canvas — no regression) · kinded-fixture CDP verify PASS (6 widgets · all 6 leaf kinds · glyphs · §source chips · boundary group · typed edges — clean console) · code review PASS (combined Wave 2 check).
**Deviations:** The per-kind widget COLOR follows the ui-design "Design Tokens Introduced" palette / mockup via `data-kind` CSS — `COMPONENT_KIND_META.accent` (nyx preset ids `1`–`6`, no indigo) drives only the boundary-group `--node-accent` tint, not the leaf widget color (documented inline in `jsoncanvas.ts` + the plan deviation note). A user-`color`ed group now tints its outline (was always indigo) — minor consistent enhancement.

---

## [PHASE 1] Schema & Pure-Lib Foundation — complete — 2026-06-29

**Dev:** david-ds-teles <david.ds.teles@gmail.com>
**Started:** 2026-06-29
**Completed:** 2026-06-29
**Built:** The additive foundation the rest of the loop imports — `ComponentKind` (8-value system-design enum, distinct from `NodeKind`) + `COMPONENT_KIND_META` on `meta.kind`, `SessionMeta.coreDocPath`, `schemaVersion 0.2→0.3` bump; four new pure libs (`generation-kit` single-source kit, `spine` slug/outline/source-index, `validate` zod gatekeeper, `migrate` version ladder); `brief.ts` round-trip edits + single-source `AGENT_CONTRACT`; `rehype-slug` in the render pipeline for three-way slug parity; `github-slugger`/`rehype-slug` promoted to direct deps; regenerated agent-contract doc. Purely additive — no existing board changes behavior.
**Files:** `lib/canvas/jsoncanvas.ts`, `lib/canvas/generation-kit.ts`, `lib/canvas/spine.ts`, `lib/canvas/validate.ts`, `lib/canvas/migrate.ts`, `lib/canvas/brief.ts`, `lib/render-md.ts`, `docs/flowcanvas-agent-contract.md`, `package.json`, `package-lock.json`, `lib/canvas/{spine,validate,migrate,generation-kit}.test.ts`, `lib/canvas/brief.test.ts`; module docs `.flowcode/project/modules/{schema,brief,render-md}.md` (refreshed) + `{generation-kit,spine,validate,migrate}.md` (new)
**Gates:** tsc 0 · lint 0 · build ok · vitest 177/177 (157 prior + 16 new pure-lib + 4 new brief round-trip) · code review PASS after fixes (0 critical/high; 4 medium + 2 low resolved; 2 info deferred to Phases 4/5 by plan spec). MCP/render smokes N/A this phase (pure-lib; no UI/app surface shipped).
**Deviations:** `github-slugger`/`rehype-slug` were absent from the install (the design assumed transitive-present) — installed fresh as direct deps (`@2.0.0`/`@6.0.0`); no spec change. Review Finding 1 (latent data-loss bug) fixed by adding `.passthrough()` to all four `validate.ts` node-union members so import preserves unmodeled fields — improves on the plan's bare `z.object` snippet; plan snippet is illustrative, behavior matches the acceptance criteria. Info findings 7 (outlineOf fenced-block) and 8 (store still writes 0.2) are by plan spec, deferred to Phases 4 and 5.

---

## [PLAN CREATED] — 2026-06-29

**Dev:** david-ds-teles <david.ds.teles@gmail.com>
**Scope:** Turn a markdown doc into a typed system-design `.canvas` via a discoverable Agent Generation Kit, keep that markdown as a living editable bidirectionally-linked core spine, and import a generated `.canvas` frictionlessly — additively over Plan 003.
**Phases planned:** 5 — Schema & Pure-Lib Foundation, System-Design Component Rendering, Agent Generation Kit Surfaces, Living Core Spine & Bidirectional Linking, Frictionless Import
**Design ref:** `004-generation-loop-design.md`

---

---
name: project-log
description: Project-level chronological log of plan completions, bootstraps, and fixes — the brief cross-plan history record.
status: active
tags: [project-log, history, logging, knowledge-base]
links: [.flowcode/templates/project-log-template.md, .flowcode/plans/plan-instructions.md]
---

# Project Log

- Project-level log: reverse chronological, most recent entry on top, new entries always added directly below this header.
- Scope is project-wide only — `[PLAN COMPLETE]`, `[BOOTSTRAP]`, `[BUGFIX]`, `[QUICKFIX]`; per-phase entries belong in the plan's own `{PREFIX}-log.md`.
- Use the entry templates in `.flowcode/templates/project-log-template.md`.

---

## [FEEDBACK] 003 + 004 board-generation redesign (design + mockups) — 2026-06-28

**Dev:** david-ds-teles <davidarius2@gmail.com>
**Captured:** 2 rules, 2 conventions, 4 decisions/definitions, 1 UC.
**Applied:** `ui/ui-design-system.md` — §11 content-readability rule (body/description uses `--color-text-primary`, never muted grey) + legible-metadata-chip rule + the `--color-secondary` `#ddb7ff → #e4c6ff` role-reduction note; §8 group spec now requires a container to fully enclose all its child nodes (no ~80%-width clip).
**Logged (not applied):** (1) **Two-plan split** — `003` Canvas Foundation → `004` Generation Loop, foundation first to avoid v2's plumbing-heavy / experience-light repeat. (2) **System-design-centric reframe** — the canvas is a system-design diagram generated FROM a core markdown doc (the living, linked core), not an arrangement of md-file cards (`004-generation-loop-design.md`). (3) Semantic component enum is **`ComponentKind` on `meta.kind`**, NOT `NodeKind` (already the render-kind discriminator) (`004` design Decision 1). (4) Selected design language for the redesign: **nyx-refined** (`003-canvas-foundation-ui-design.md`).
**Routed upstream:** **UC-004** — mockup low-fidelity recurrence (4th); the framework-level fix (the "Fidelity — snapshot the real system" discipline = rows 1–2) routes here because `ui/ui-mockup-discipline.md` + `ui/ui-workflow.md` are framework-owned symlinks the host cannot bind.
**Rejected/deferred:** none.

---

## [PLAN COMPLETE] 002-system-design-studio — Flowcanvas System Design Studio v2 (re-close after Phase 7) — 2026-06-29

**Dev:** david-ds-teles <davidarius2@gmail.com>
**Delivered:** Re-closed `complete` at **7/7 phases** after **Phase 7 — Runtime Defect Remediation** (operator-directed reopen). Runtime triage (app + MCP sidecar + headless-Chrome CDP + a scripted MCP round-trip and submit→reload→review cycle) found the prime suspect (0-height tri-pane canvas) was a PASS and most v2 surfaces functional; the real gap was that the studio was **unexercisable on launch** — the default board was the stale v0.1 Welcome board and no templates shipped. Fixed four defects, all runtime-verified: **D1** canvas selection sync (`use-canvas-handlers`); **D2** an importable v2 demo board `examples/commerce-platform.canvas` + content + `templates/*.canvas` exercising every studio surface; **D3** MCP `get_board` stamps `session.lastBriefId` (round-trip no longer falsely `stale`); **D4** non-blocking change-review round-ready banner (`use-round-ready`). Closed the coverage gap that let static gates certify a non-working UI: 14 route-contract vitest tests (in-gate) + `npm run smoke:mcp` + `npm run smoke:render`.
**Phases:** 7/7 — Phases 1–6 `complete`, Phase 7 `done`.
**Artifacts:** `002-system-design-studio-{qa-report,technical-overview,changelog,test-notes,plan,log}.md` updated; `project-overview.md` (gates 143/143 + smoke gates + Evolution Log); `quality-gates.md` (smoke gates registered).
**Gates:** tsc 0 · lint 0 (0 warnings) · build ok (full v2 route table) · vitest 143/143 · smoke:mcp PASS · smoke:render PASS · plan-completion review PASS (0 ≥medium; 2 low + 3 info resolved/accepted).
**Follow-ups:** Decision-10 disk-divergence reconcile banner; 1280-px visual pixel-diff; collapsed-rail thin icon strip; drag-to-canvas templates; scope-aware submit; `instantiateTemplate` uniquify document-template file paths.

---

## [PLAN COMPLETE] 002-system-design-studio — Flowcanvas System Design Studio v2 — 2026-06-28

> **⚠️ AMENDED (2026-06-29): plan REOPENED.** Operator runtime testing found ~half the v2 features non-functional end-to-end — the static gates + code review below never exercised the wired runtime. Plan status is now `active` with **Phase 7 — Runtime Defect Remediation** pending. This entry stands as the historical close record; current state lives in `plan-index.md` (active 6/7), the plan log's `[PLAN REOPENED]` entry, and the qa-report `Operator runtime testing` FAIL check.

**Dev:** david-ds-teles <davidarius2@gmail.com>
**Delivered:** Canvas-authoritative typed-relation graph (schema v2, `RelationshipType` catalog, `NodeSource` provenance, one-time `0.1→0.2` migration), 7-tool stdio MCP sidecar (`@modelcontextprotocol/sdk` v1.29.0), snapshot-diff change-review (accept/discard), template library, bundle export, and the tri-pane studio shell — 6/6 phases, tsc 0 · lint 0 · build ok · vitest 129/129.
**Artifacts:** `002-system-design-studio-technical-overview.md`, `002-system-design-studio-changelog.md`, `002-system-design-studio-test-notes.md`, `002-system-design-studio-qa-report.md`
**Follow-ups:** disk-divergence banner (Decision 10); visual-parity CDP capture at 1280/1440; collapsed-rail thin strip; `lastBriefId` MCP stamp; drag-to-canvas templates; scope-aware submit; live MCP probe

---

## [PLAN COMPLETE] 001-initial-architecture — Phase 10 canvas mechanics & file I/O — 2026-06-27

**Dev:** david-ds-teles
**Delivered:** Re-closed `001-initial-architecture` `complete` at **10/10 phases** after executing the previously-deferred **Phase 10** (operator-directed reopen). Shipped: **multi-select** (marquee gated on select mode + ⌘/Ctrl-click), **true group containers** (`parentId`/`extent:'parent'`, drag-as-a-unit, group/ungroup) keeping the doc's coords absolute (all abs↔rel confined to the adapter), an **ELK "Re-organize"** auto-layout (`elkjs`), and **Save-as / Open-board** (`<BoardDialog>` modal + `?path=` adoption + inline dirty-guard). The operator-added transitive-hydration / ≤1-action referenced-file-access and the wider **linking / source-of-truth + agent-collaboration** vision were split to the new plan **`002-system-design-studio`**.
**Phases:** 10/10 — all `done`.
**Artifacts:** technical-overview (Phase 10 sections; 9→10 phases, 66→79 tests), changelog (Phase 10 + Summary 10/10), test-notes (Phase 10 unit + CDP + gaps), qa-report (Phase 10 + plan-completion, both PASS) under `.flowcode/plans/001-initial-architecture/`; `project-overview.md` propagated (Schema/Adapter/Layout/Store, folder structure, `elkjs`).
**Follow-ups:** `002-system-design-studio` (linking semantics, source-of-truth, reference nav/hydration, templates, richer agent loop). Tech-debt: component tests for toolbar flyout / `<FrontmatterView>` / `<BoardDialog>`; `reorganize` fitView heuristic; dead `setNodePosition`.
**Gates:** tsc 0 · lint 0 · build ok · vitest 79/79 · CDP live-verified (group/ungroup/re-organize/save-as/open). Review: 0 ≥medium (2 low fixed, 3 info accepted); plan-completion PASS.

---

## [PLAN COMPLETE] 001-initial-architecture — Phase 9 UX/UI redesign + bugfixes; Phase 10 deferred — 2026-06-27

**Dev:** david-ds-teles
**Delivered:** Closed `001-initial-architecture` `complete` at **9/10 phases**. Phase 9 shipped the single-rail toolbar (direct insert buttons + Shape/File flyouts + disabled Phase-10 scaffolds + `+ Add ▾` narrow fallback), the shared `<FrontmatterView>` (card + sticky reader-bar), a readability-overhauled reader (opaque surface, 17px/≤66ch, frontmatter header bar), and `.json` agent import (`Load .json…` + brief-vs-response detection). A post-Phase-9 bugfix pass fixed the selection ring (conforms to the rounded cards), the shape outline (dashed bright-indigo), and the import message. **Phase 10 deferred** — multi-select + true group containers, ELK "Re-organize", save-as/open-board, plus operator-added transitive board hydration + ≤1-action access to referenced files (needs a UI pass) → carried into the next exploration/design cycle.
**Phases:** 9/10 — Phases 1–9 `done`; Phase 10 `deferred`.
**Artifacts:** technical-overview (regenerated from a code-explorer audit), changelog (reconciled), test-notes, qa-report (plan-completion PASS) under `.flowcode/plans/001-initial-architecture/`; `project-overview.md` propagated.
**Follow-ups:** Phase 10 → next plan; add Phase-9 component tests (toolbar flyout state machine / `<FrontmatterView>` — CDP-only today); standing v0.1 tech-debt (revision double-bump, `AGENT_CONTRACT` ⇄ contract-doc sync, reader relative-image rewriting, symlink-aware path guard).
**Gates:** tsc 0 · lint 0 · build ok · vitest 66/66 · CDP visual-parity green. Review: 0 ≥medium across all checks; plan-completion PASS.

---

## [BUGFIX] Post-Phase-9 UX: selection ring / shape contrast / import message — 2026-06-27

**Dev:** david-ds-teles
**Cause:** (1) the `.selected` box-shadow sat on the **square** `.react-flow__node` wrapper while the cards are 16px-rounded, so the ring fenced a gap around the corners and its wide soft glow read fuzzy/low-contrast; (2) shape/group nodes used a 5%-indigo fill + thin solid `--color-primary-cont` stroke, reading as a faint gray box; (3) pasting the exported **DesignBrief** into Import gave a cryptic "Missing responseVersion/briefId" error (the brief carries `briefVersion`, not `responseVersion`).
**Fix:** (1) moved the ring onto the rounded cards (`.fc-node`/`.fc-node--link`/`.fc-node--note`) with a crisp 2px `--color-primary` ring + tight indigo halo, wrapper shadow `none` — conforms to the corners; (2) shape outline is now a **dashed** (`7 5`) bright-indigo (`--color-primary`) container with 8% fill (design system §8); (3) Import detects a pasted brief and explains the round-trip ("hand the brief to your agent — Import expects its AgentResponse").
**Affected:** `app/globals.css`, `components/canvas/nodes/group-node.tsx`, `app/styles/nodes.css`, `components/canvas/export-panel.tsx`. Gates: tsc 0 · lint 0 · build ok · vitest 66/66 · CDP — selection ring conforms to 16px card (wrapper shadow none), shape rect `stroke-dasharray=7 5` stroke `rgb(192,193,255)`, Import shows the brief-guidance message. Captures `mockups/captures/phase-9/09-fix-{selection,shape,import}.png`.

---

## [PLAN COMPLETE] 001-initial-architecture — Phase 8 polish & cleanup — 2026-06-27

**Dev:** david-ds-teles
**Delivered:** Re-closed `001-initial-architecture` after **Phase 8** (8/8 phases) — seven post-v0.1 polish fixes: behavior-preserving refactor (globals.css → 6 `app/styles/*` partials + `useCanvasHandlers` hook + inline-styles→classes), orthogonal smoothstep edges, a 3-size reader (drawer/half/full) with working maximize, bidirectional `links:` write-back via a new guarded `/api/canvas/links` route (file↔file edge ⇄ source `.md` frontmatter), nyx minimap/controls, and removal of the Next dev badge. The three earlier 2026-06-27 `[BUGFIX]` entries below were the operator reports this plan reopening formalized and finished.
**Gates:** tsc 0 · lint 0 · build ok · vitest 66/66 · CDP visual-parity 9/9 · curl `/api/canvas/links` guards 400/400/404.
**Artifacts:** technical-overview, changelog, test-notes, qa-report (all updated for Phase 8) under `.flowcode/plans/001-initial-architecture/`.

---

## [BUGFIX] Shapes weren't real / couldn't resize or change — 2026-06-27

**Dev:** david-ds-teles
**Cause:** Groups rendered an SVG inside a still-rectangular node — the hit area + selection box were rectangular ("fake"), and the node was forced to `zIndex:0` (behind content), so new shapes spawned under existing nodes and couldn't be selected/resized; changing the shape also deselected the node (the controlled-state re-sync wiped RF selection).
**Fix:** True shapes — only the painted SVG outline is hit-testable (`.fc-group` + RF node wrapper `pointer-events:none !important`, shapes `visiblePainted`); React Flow's rectangular `.selected` glow suppressed (shape stroke glows instead); dropped the forced `zIndex`; added a shape switcher (`setNodeShape` rectangle/ellipse/diamond) + enlarged `NodeResizer` handles on select; the shell now preserves RF `selected` across store re-syncs so editing doesn't deselect.
**Affected:** `components/canvas/nodes/group-node.tsx`, `lib/canvas/{store,adapter}.ts`, `components/canvas/canvas-shell.tsx`, `app/globals.css`, `lib/canvas/store.test.ts`. Gates: tsc 0 · lint 0 · build ok · vitest 61/61 · CDP shape-probe 8/8 (corner-click passes through, switcher changes shape, resize-drag 347×255→406×314, body-drag moves).

---

## [BUGFIX] Link/note handles misaligned (bottom-edge gap) — 2026-06-27

**Dev:** david-ds-teles
**Cause:** `.fc-node--note` and `.fc-node--link` (and latently `.fc-node--img`) sized to their content, shorter than the authored RF node box; React Flow anchors handles to the wrapper edges, so the bottom/side handles floated in the gap below the visible card.
**Fix:** `height: 100%` on the note/link/image cards so the card fills the wrapper (note body `flex: 1` to absorb slack). CDP-measured `gapBelowCard=0px` and `handleVsCardBottom=0px` for all three.
**Affected:** `app/globals.css` (`.fc-node--note`/`.fc-node--link`/`.fc-note__body`), `components/canvas/nodes/image-node.tsx`

---

## [BUGFIX] Flowcanvas node usability — text/group editing, link 404, shapes, full-read — 2026-06-27

**Dev:** david-ds-teles
**Cause:** Post-v0.1 operator report — added node types weren't usable: notes/groups had no edit path (editing was deferred), link chips with a scheme-less url (`google.com`) resolved relative → 404, the shape tool only made rectangles, and the markdown card's clamped body had no discoverable "read full" path.
**Fix:** Note nodes double-click → inline textarea (`setNodeText`); group nodes are now a real `GroupNode` — resizable (`NodeResizer`/`setNodeSize`), double-click label edit (`setNodeLabel`), SVG outline rectangle/ellipse/diamond via `meta.shape` (`NodeShape`), painted behind content nodes (adapter `zIndex:0`); `normalizeUrl` prepends `https://` to scheme-less links; add-node menu gained a Shape ▸ rectangle/ellipse/diamond sub-row; markdown header gained a `node-read` button → reader drawer (reader state moved into the store: `readerNodeId`/`openReader`/`closeReader`).
**Affected:** `lib/canvas/{jsoncanvas,store,adapter}.ts`, `components/canvas/nodes/{note,link,group,markdown}-node.tsx` (+ new `group-node.tsx`), `components/canvas/{canvas-shell,canvas-toolbar}.tsx`, `app/globals.css`, `lib/canvas/store.test.ts`. Gates: tsc 0 · lint 0 · build ok · vitest 60/60 · CDP fix-probe 7/7.

---

## [PLAN COMPLETE] 001-initial-architecture — Flowcanvas v0.1 — 2026-06-26

**Dev:** david-ds-teles
**Delivered:** A standalone Next.js 16 / React Flow canvas that maps flowcode markdown into spatial nodes with `links:`-derived + manual edges, pinned comment threads, and a bidirectional, idempotent human↔agent JSON round-trip — persisted to a `.canvas` file behind seven guarded fs routes.
**Artifacts:** `001-initial-architecture-technical-overview.md`, `001-initial-architecture-changelog.md`, `001-initial-architecture-test-notes.md`, `001-initial-architecture-qa-report.md`
**Follow-ups:** autosave; per-node revision tracking (conflicts); symlink-aware path guard; reader image-src rewriting; node-body inline editing

---

## [FEEDBACK] UI design gate + nyx pivot — 2026-06-26

**Dev:** david-ds-teles
**Captured:** 1 decision, 1 convention, 1 workflow-friction (→ 3 UC), 1 KB update, 1 backlog
**Applied:** `project/project-overview.md` (UI = nyx glassmorphic-neon; fonts Geist + JetBrains Mono)
**Logged (not applied):** BL-002 (add `loading`/`error` mockup frames); nyx direction (mockup 04) approved — supersedes dark-minimal, drag-drop upload added to scope — recorded in `001-initial-architecture-ui-design.md` and synced into the design + plan + `ui-design-system.md`
**Routed upstream:** UC-001 (greenfield design-system lock-in starves mockup exploration), UC-002 (mockup content-fidelity: render markdown + use real data), UC-003 (`ui-mockups` large-HTML reliability)
**Rejected/deferred:** none

---

## [BOOTSTRAP] success — 2026-06-25

**Dev:** david-ds-teles
**Detected:** standalone monolith / TypeScript 5 + React 19 / Next.js 15 (App Router) / React Flow `@xyflow/react` ^12 / Zustand ^5 / Tailwind v4 / Geist fonts / vitest (unit) + tsc + ESLint + next build — from `001-initial-architecture-design.md` and `001-initial-architecture-plan.md` (greenfield-from-spec; no source code on disk)
**Files:** `.flowcode/project/project-overview.md`, `.flowcode/quality-checks/quality-gates.md`, `.flowcode/workflow/flowcode-tools.md`, `.flowcode/quality-checks/naming-conventions.md`, `.flowcode/quality-checks/typed-models.md`, `.flowcode/quality-checks/enums-and-constants.md`, `.flowcode/quality-checks/error-handling.md`, `.flowcode/quality-checks/idiomatic-code.md`, `.flowcode/quality-checks/clean-code.md`, `.flowcode/ui/ui-design-system.md`, `.flowcode/project/project-log.md`
**Needs manual input:** Module detail files deferred — `.flowcode/project/modules/{module}.md` files are not generated because no source code exists yet; each will be produced by `flowcode:module-explorer-agent` at the close of the phase that builds it. CI/CD not configured — update `project-overview.md § CI/CD` and `quality-gates.md` when a pipeline is added. `§14` source paths in `ui-design-system.md` reference `app/globals.css` (Phase 1 target) — update to concrete line references once Phase 1 is complete.
**Next steps:** Execute Phase 1 of `001-initial-architecture-plan.md` (project scaffold + dark shell); run `npx tsc --noEmit`, `npm run lint`, `npm run build` at phase close to verify the first three gates green.

---

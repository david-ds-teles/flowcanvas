---
name: 003-canvas-foundation-log
description: Per-plan execution log for Canvas Foundation & Visual Integrity (plan 003) — reverse-chronological record of plan creation, each phase end, and plan end.
status: active
tags: [plan-log, execution-log, canvas, entries]
links: [.flowcode/plans/003-canvas-foundation/003-canvas-foundation-plan.md, .flowcode/plans/003-canvas-foundation/003-canvas-foundation-design.md]
---

# 003-canvas-foundation — Canvas Foundation & Visual Integrity Log

- Per-plan execution record: exactly one per plan; reverse-chronological (newest entry directly below this header).
- Updated at every phase end (`[PHASE]`) and at plan end (`[PLAN COMPLETE]`); entries are never deleted.
- Every entry opens with `**Dev:**` — the developer who did the work, taken verbatim from the session banner's `Acting as Dev:` line; never invented.
- Created at plan-folder creation with the `[PLAN CREATED]` entry below.

---

## [PLAN COMPLETE] — 2026-06-29

**Dev:** david-ds-teles <david.ds.teles@gmail.com>
**Delivered:** A correct, complete direct-manipulation canvas — every widget (markdown/note/image/link) resizes via a shared `NodeResizeFrame`; a selected edge exposes a visible `EdgeActionBar` (rel ▾ · ✎ Label · ✕) with explicit React Flow selection semantics; comments are connected to their widgets (on-card `CommentBadge`, human-name thread header, inspector "Comments on this node" list) — plus a visual-integrity pass that killed the always-on faded rings (focus-only states), recalibrated `--color-secondary` `#ddb7ff → #e4c6ff`, role-reduced the prose violet, and made the reader frontmatter compact/collapsible. All on existing primitives — **no schema, MCP, or agent-contract change**.
**Phases:** 4/4 — all `complete` (Universal Resize · Edge Action Bar & Explicit Selection · Comment ↔ Widget Connection · Visual Integrity & Reader Redesign). Waves: 1∥2 → 3 → 4.
**Artifacts:** `003-canvas-foundation-{technical-overview,changelog,test-notes,qa-report,plan,log,design,ui-design}.md`; visual captures under `mockups/captures/phase-{1,2,3,4}/`.
**Gates:** tsc 0 · lint 0 · build ok · vitest **154/154** (+7 new) · live Playwright interaction harness **35/35** (Wave 1 14/14 · Phase 3 11/11 · Phase 4 10/10), console clean · code reviews PASS (per-phase + consolidated Phase 4 + Plan completion; 0 critical/high/medium/low open, info deferred).
**Follow-ups:** align `rgba(221,183,255,*)` chip/pill alpha-fill literals to `#e4c6ff` (or `color-mix`) in a cleanup; regenerate the 3 race-affected module docs (`adapter`, `canvas-nodes`, `canvas-shell`) flagged by the concurrent `[BOOTSTRAP]` module-doc backfill; add a ticket ref to the pre-existing `image-node.tsx` eslint-disable; plan **004 (generation loop)** builds the system-design widget + core-doc spine + agent generation kit on this foundation.

---

## [PHASE 4] Visual Integrity & Reader Redesign — complete — 2026-06-29

**Dev:** david-ds-teles <david.ds.teles@gmail.com>
**Started:** 2026-06-29
**Completed:** 2026-06-29
**Built:** The cross-cutting visual closer (Decision 4): killed the always-on faded rings (focus-only states on `.fc-edge-input` / `.fc-note__edit` / `.fc-insp__src` / `.fc-agent__ta`); recalibrated `--color-secondary` `#ddb7ff → #e4c6ff` globally; role-reduced the prose violet (reader `em → --color-text-primary`, inline links `→ --color-primary` indigo; `h3` keeps its violet accent); tuned the reader type ramp (Geist + `font-feature-settings`/`text-rendering`, 17px/1.7, +paragraph spacing); made the reader frontmatter compact + collapsible (collapsed by default → `frontmatter ▾` expander). Also removed the dead `.fc-relpick__del` CSS orphaned by Phase 2.
**Files:** `app/globals.css`, `app/styles/edges.css`, `app/styles/nodes.css`, `app/styles/studio-inspector.css`, `app/styles/toolbar.css`, `app/styles/reader.css`, `app/styles/frontmatter.css`, `app/styles/studio-shell.css`, `components/canvas/frontmatter-view.tsx`, `components/canvas/reader-drawer.tsx`
**Gates:** tsc 0 · lint 0 · build ok · vitest 154/154 · browser 10/10 (live Playwright — `--color-secondary`=`#e4c6ff` global, `.fc-edge-input` no rest ring via CSSOM, reader frontmatter collapsed-by-default + expander, rendered prose link computes `rgb(192,193,255)`; console clean) · review PASS (consolidated **Phase 4 + Plan completion**; 0 critical/high/medium/low, 4 info deferred)
**Deviations:** Reader `em` recolor verified by the CSS rule + a rendered link (the test doc had no `<em>`). Removed dead `.fc-relpick__del` rules from `studio-shell.css` (Phase 2 cleanup follow-through; file outside Phase 4's table — clean-code). `rgba(221,183,255,*)` chip/pill alpha-fill literals left at the old base (info finding, deferred — same category as the design-accepted void-wash literal). Phase 4 ran as a single-author main-session pass (cross-cutting CSS closer, per design).

---

## [PHASE 3] Comment ↔ Widget Connection — complete — 2026-06-29

**Dev:** david-ds-teles <david.ds.teles@gmail.com>
**Started:** 2026-06-29
**Completed:** 2026-06-29
**Built:** Comments connected to their widgets, read-side only (Decision 3): on-card `CommentBadge` (rose corner pill counting unresolved root comments) driven by a primitive `selectNodeCommentCount` selector; thread header + inspector now resolve the node's human name via a shared pure `nodeDisplayName` (was a raw UUID); inspector "Comments on this node" list with click-to-focus. No change to comment creation/anchoring.
**Files:** `lib/canvas/node-name.ts` (new), `lib/canvas/store.ts`, `components/canvas/nodes/comment-badge.tsx` (new), `components/canvas/nodes/markdown-node.tsx`, `components/canvas/nodes/note-node.tsx`, `components/canvas/nodes/image-node.tsx`, `components/canvas/nodes/link-node.tsx`, `components/canvas/comment-layer.tsx`, `components/canvas/inspector-rail.tsx`, `app/styles/nodes.css`, `app/styles/studio-inspector.css`, `lib/canvas/node-name.test.ts` (new), `lib/canvas/comment-count.test.ts` (new)
**Gates:** tsc 0 · lint 0 · build ok · vitest 154/154 (+7 new) · browser 11/11 (live Playwright — badge + exact-count aria-label, badge→select→inspector list, thread human name; console clean) · review PASS (0 critical/high/medium; 1 low fixed, 2 info deferred)
**Deviations:** `nodeDisplayName` text-node branch tightened to `split('\n')[0].slice(0,50)` to honor the design "first line" spec (review Finding 1 — fixed). Within-phase fan-out: foundation (node-name.ts, selector, comment-badge, tests, CSS) + the four node-card badge wires done in the main session; comment-layer + inspector-rail by a parallel `flowcode:implementer-agent` worker.

---

## [PHASE 2] Edge Action Bar & Explicit Selection — complete — 2026-06-29

**Dev:** david-ds-teles <david.ds.teles@gmail.com>
**Started:** 2026-06-29
**Completed:** 2026-06-29
**Built:** Selected-edge `EdgeActionBar` (`rel ▾ · ✎ Label · ✕`) portaled below the label pill, reusing `setEdgeRel`/`relabelEdge`/`removeEdgeWriteback`/`setEditingEdge` verbatim; delete moved out of `RelPicker` to a single surface (`data-testid="edge-delete"`); explicit `selectable`/`deletable` on adapter edges + `elementsSelectable`/`edgesFocusable` on `<ReactFlow>`; selected-edge stroke thickened for feedback.
**Files:** `components/canvas/edges/labeled-edge.tsx`, `lib/canvas/adapter.ts`, `components/canvas/canvas-shell.tsx`, `app/styles/edges.css`, `lib/canvas/adapter.test.ts`
**Gates:** tsc 0 · lint 0 · build ok · vitest 147/147 (new adapter `selectable`/`deletable` assertions) · browser 14/14 (live Playwright interaction harness — edge bar + 8-option rel picker verified, console clean) · review clean (0 critical/high; 2 low fixed)
**Deviations:** Picker close-on-deselect implemented as a render-phase reset (not the reviewer-suggested `useEffect`) to satisfy the `react-hooks/set-state-in-effect` lint rule — mirrors `comment-layer.tsx`. Implemented by a parallel `flowcode:implementer-agent` worker (Wave 1, file-disjoint from Phase 1); orchestrator applied the two low-finding fixes.

---

## [PHASE 1] Universal Resize — complete — 2026-06-29

**Dev:** david-ds-teles <david.ds.teles@gmail.com>
**Started:** 2026-06-29
**Completed:** 2026-06-29
**Built:** Shared `NodeResizeFrame` (resizer + 4 handle siblings) applied to the markdown/note/image/link cards — every widget now selects and resizes with the 8-handle `NodeResizer`; markdown stays content-driven (vertical drag re-derives `--fc-body-max`), others fix the box; persists via the existing `setNodeSize`; handles hidden in comment mode.
**Files:** `components/canvas/nodes/node-frame.tsx` (new), `components/canvas/nodes/markdown-node.tsx`, `components/canvas/nodes/note-node.tsx`, `components/canvas/nodes/image-node.tsx`, `components/canvas/nodes/link-node.tsx`, `app/styles/nodes.css`
**Gates:** tsc 0 · lint 0 · build ok · vitest 147/147 · browser 14/14 (live Playwright interaction harness — 8 resize controls on markdown + note select, 0 at rest, console clean) · review clean (0 critical/high; 1 medium resolved by the browser run, lows folded)
**Deviations:** none on behavior. Within-phase fan-out: `node-frame.tsx` + the `nodes.css` chrome written in the main session, the four node-card wraps by a parallel `flowcode:implementer-agent` worker. Note: clicking a markdown node also opens the reader (`use-canvas-handlers onNodeClick`) — confirmed **pre-existing/intended**, not introduced here.

---

## [PLAN CREATED] — 2026-06-29

**Dev:** david-ds-teles <david.ds.teles@gmail.com>
**Scope:** Make flowcanvas a correct, complete direct-manipulation canvas (universal resize, discoverable on-edge edit/delete, comments connected to widgets) and repair the visual integrity (kill always-on rings, recalibrate the violet, redesign the reader) before the 004 generation-loop redesign — all on existing primitives, no schema/MCP/contract change.
**Phases planned:** 4 — Universal Resize, Edge Action Bar & Explicit Selection, Comment ↔ Widget Connection, Visual Integrity & Reader Redesign
**Design ref:** `003-canvas-foundation-design.md`

---

---
name: 003-canvas-foundation-qa-report
description: QA gate report for 003-canvas-foundation — per-phase and plan-completion review findings and stack-gate outcomes.
status: active
tags: [qa-report, quality-gate, review, findings]
links: [.flowcode/plans/003-canvas-foundation/003-canvas-foundation-plan.md, .flowcode/quality-checks/markdown-quality.md]
---

# QA Report — 003-canvas-foundation Canvas Foundation & Visual Integrity

- Wave 1 (Phase 1 Universal Resize + Phase 2 Edge Action Bar & Explicit Selection) code is correct and clean: all four code quality gates pass, no critical or high findings, and the implementation faithfully follows the design's approved decisions. All findings resolved — the medium (browser visual-parity/app-smoke) was satisfied by a live Playwright interaction harness (14/14), and both lows are fixed; three info notes remain deferred (pre-existing gaps / Phase 4 scope).
- Scope: per-phase close + plan completion.
- Reverse-chronological, prepend-only: newest `## Check YYYY-MM-DD HH:MM` directly below this header; never rewrite prior sections.
- Each check: Stack Gate as a narrow table; Review Findings as finding-as-section entries.
- Baseline conformance (project-overview, module contracts, declared gates, code conventions) is checked every run and recorded on the `**Baseline conformance:**` line; divergence is a first-class finding.
- Severity values: `critical` · `high` · `medium` · `low` · `info`.
- A finding with no `**Resolution:**` line is unresolved; `qa-probe-gate.js` blocks commits/PRs when any unresolved finding is >= medium.
- Follow `markdown-quality.md § Finding-as-Section Format` and `§ Tables`.

---

## Check 2026-06-29 18:30 — Phase 4 + Plan completion

**Reviewer:** flowcode:code-reviewer-agent
**Scope:** Phase 4 — Visual Integrity & Reader Redesign + Plan 003 completion (consolidated: Phase 4 is the final phase)
**Plan:** 003-canvas-foundation
**Baseline conformance:** pass (module detail files pre-existing gap acknowledged in plan; rgba alpha-literal drift explicitly accepted per design constraints pattern)
**Gate outcome:** PASS
**Summary:** Phase 4 + Plan 003 completion: all nine edited files faithfully implement Decision 4 — focus-only rings on all four surfaces, `--color-secondary #ddb7ff → #e4c6ff` globally, prose `em`/link violet role-reduced (h3 keeps its accent), Geist retained, and a genuinely collapsible reader frontmatter (`useState(false)` default, dense bar, `data-testid="reader-fm-toggle"`, correct `aria-expanded`). All five gates pass (tsc 0 · lint 0 · build ok · vitest 154/154 · browser 10/10). All four phases compose cleanly with no cross-phase file conflicts and no schema/MCP/agent-contract changes. No critical, high, medium, or low findings; four info items carried to the post-execution pipeline. Plan 003 is safe to close.

### Stack Gate

| Gate | Outcome | Notes |
|------|---------|-------|
| Typecheck | pass | `npx tsc --noEmit` exit 0 — orchestrator verified |
| Lint | pass | `npm run lint` exit 0 — orchestrator verified |
| Build | pass | `npm run build` exit 0 — orchestrator verified |
| Unit | pass | `npx vitest run` 154/154 — no regression; Phase 4 touches no vitest-covered pure module (`frontmatter-view.tsx` collapsible is React, covered by browser harness per plan acceptance criteria) |
| Integration | n/a | `npm run smoke:mcp` not in Phase 4 scope; MCP contract unchanged across all of plan 003 |
| E2E | n/a | `npm run smoke:render` not in Phase 4 scope |
| Browser / Visual Parity | pass | Playwright harness @1512px — 10/10 live assertions, console clean; `--color-secondary` computes `#e4c6ff` globally; `.fc-edge-input` carries no rest ring (CSSOM verified); reader frontmatter collapsed by default (`aria-expanded=false`, dense bar, no kv grid); expander reveals full grid; rendered prose link computes `rgb(192,193,255)` (primary). Captures under `mockups/captures/phase-4/`. Expected drift: reader `em`/heading recolor + recalibrated violet (recorded in ui-design Visual Parity table). Acceptable drift: global `--color-secondary` ripple to import-edge stroke + switcher/reader-size gradients (resolved Open Question). |

### Review Findings

#### Finding 1 — [info] `rgba(221, 183, 255, *)` alpha literals in edited files not updated to match recalibrated `--color-secondary` base

**Files:** `app/styles/studio-inspector.css:152`, `app/styles/frontmatter.css:57-58,67-68`

`.fc-insp__src-foc` (`studio-inspector.css:152`) carries `border: 1px solid rgba(221, 183, 255, .35)` and the shared pill/tag fills in `frontmatter.css` (lines 57-58, 67-68) use `rgba(221, 183, 255, 0.13/0.24/0.22)` — the RGB decomposition of the old `#ddb7ff` secondary. After the token recalibration to `#e4c6ff` (RGB 228, 198, 255), these hardcoded literals are off by 7 units per channel. Both files were edited by Phase 4 (`studio-inspector.css` for `.fc-insp__src`, `frontmatter.css` for the collapsible toggle styles), but the chip/pill rgba literals predate Phase 4 and were not in its change surface. The design constraint explicitly accepted the equivalent void-wash literal (`app/globals.css:141` `rgba(221,183,255,.12)`) as "stays unless explicitly aligned"; the same logic applies here — the alpha-composited chip fills are perceptually negligible at a 7-unit delta, and the browser harness confirms correct visual rendering.

**Suggested fix:** In a follow-up cleanup, update the base to `rgba(228, 198, 255, *)` to match `#e4c6ff`, or switch to `color-mix(in srgb, var(--color-secondary) 13%, transparent)` to stay token-bound and prevent drift on future recalibrations.

**Resolution:** deferred — pre-existing literals; accepted per design constraint pattern (same category as void-wash literal); cosmetically negligible; no action required before plan close

#### Finding 2 — [info] Frontmatter toggle buttons have `aria-expanded` but no `aria-label` (ui-design spec lists both)

**Files:** `components/canvas/frontmatter-view.tsx:110-118`, `components/canvas/frontmatter-view.tsx:126-134`

The ui-design accessibility contract (`003-canvas-foundation-ui-design.md § Keyboard / accessibility`) specifies the frontmatter toggle carries `aria-label`/`aria-expanded`. `aria-expanded` is correctly present on both the collapsed toggle (`aria-expanded={false}`, line 114) and the expanded toggle (`aria-expanded={true}`, line 131). `aria-label` is absent; the button's accessible name is derived from its visible text ("frontmatter ▾" / "frontmatter ▴"), which is the WAI-ARIA-preferred mechanism when descriptive visible text is present — an `aria-label` would override visible text and can confuse screen readers if the two diverge. The browser harness `aria-expanded=false` assertion passes. This is a spec-wording precision gap, not a functional accessibility defect.

**Suggested fix:** Optionally add `aria-label="Expand frontmatter details"` / `aria-label="Collapse frontmatter details"` if the visible button text is ever shortened; or leave as-is and address in a dedicated a11y hardening pass.

**Resolution:** deferred — no functional a11y defect; visible text provides the accessible name per WAI-ARIA; `aria-expanded` correctly signals the toggle state

#### Finding 3 — [info] Module detail files missing for all plan 003 touched modules (pre-existing gap, carried to plan close)

**Files:** `.flowcode/plans/003-canvas-foundation/003-canvas-foundation-plan.md:56,264-266,307-312,350-353`

All touched modules across the four phases — `node-components`, `edge-component`, `adapter`, `canvas-shell`, `node-name`, `store`, `comments-ui`, `inspector-rail`, `frontmatter-view`, `reader`, `design-tokens-and-styles` — lack per-module detail files under `.flowcode/project/modules/`. Every Touched Modules entry in the plan explicitly flags this as "MISSING (pre-existing gap)". Carried forward from Phase 1+2 Finding 4 and Phase 3 Finding 2. Not introduced by any phase of this plan.

**Suggested fix:** Create `modules/*.md` detail files for the 003 touched modules as part of the post-execution pipeline before `plan-index.md` status is set to `complete`.

**Resolution:** deferred — pre-existing gap acknowledged in plan; post-execution pipeline artifact

#### Finding 4 — [info] `eslint-disable-next-line` in `image-node.tsx` still lacks ticket/issue reference (carried to plan close)

**Files:** `components/canvas/nodes/image-node.tsx:20`

`// eslint-disable-next-line @next/next/no-img-element` carries no reason comment or ticket/issue reference, as required by `clean-code.md § eslint-disable blocks`. Pre-existing; not introduced by any phase of plan 003. Carried forward from Phase 1+2 Finding 6 and Phase 3 Finding 3.

**Suggested fix:** Append `-- image served via guarded /api/asset route, not an external URL (BL-TODO)`.

**Resolution:** deferred — pre-existing; low priority cleanup

---

## Check 2026-06-29 15:20 — Phase 3

**Reviewer:** flowcode:code-reviewer-agent
**Scope:** Phase 3 — Comment ↔ Widget Connection (Wave 2, single phase, depends on Phase 1)
**Plan:** 003-canvas-foundation
**Baseline conformance:** pass (module detail files missing is a pre-existing gap acknowledged in the plan)
**Gate outcome:** PASS
**Summary:** All five quality gates pass (tsc 0 · lint 0 · build ok · vitest 154/154 +7 new · browser 11/11); the implementation is correct and faithful to Decision 3 — read-side only, no schema or state change, primitive selector, badge is a card-sibling with stopPropagation and correct aria-label, `nodeDisplayName` is shared and DOM-free, all hooks precede early returns in both modified components. One low finding (text-node spec/comment mismatch) and two carried-forward info items; no blockers.

### Stack Gate

| Gate | Outcome | Notes |
|------|---------|-------|
| Typecheck | pass | `npx tsc --noEmit` exit 0 — orchestrator verified |
| Lint | pass | `npm run lint` exit 0 — orchestrator verified |
| Build | pass | `npm run build` exit 0 — orchestrator verified |
| Unit | pass | `npx vitest run` 154/154 (+7 new: `node-name.test.ts` 5 cases + `comment-count.test.ts` 2 cases) — orchestrator verified |
| Integration | n/a | `npm run smoke:mcp` not in Phase 3 scope |
| E2E | n/a | `npm run smoke:render` not in Phase 3 scope |
| Browser / Visual Parity | pass | Playwright harness @1512px — 11/11 live assertions, console clean; badge renders with exact-count aria-label, click selects node, inspector "Comments on this node" shows 1 row, click-to-focus works, thread header shows "Order Service" (not UUID); capture `mockups/captures/phase-3/desktop-comments.png` |

### Review Findings

#### Finding 1 — [low] `nodeDisplayName` for text nodes deviates from "first line" spec

**Files:** `lib/canvas/node-name.ts:14`, `lib/canvas/node-name.test.ts:18`

The inline comment at `node-name.ts:8` says "first line, capped at 50 chars" and Design Decision 3 pseudocode says `text → first line slice(0,50) || 'Note'`. The strict reading is `text.split('\n')[0].slice(0, 50)`. The implementation does `n.text.slice(0, 50).replace(/\n/g, ' ')` — taking the first 50 chars of the full text and collapsing all newlines to spaces. For `'hello\nworld'` this yields `'hello world'` rather than `'hello'`. The test at `node-name.test.ts:18` was written to match the implementation, not the spec comment. The behavior is defensible (more informative in practice), but the inline comment and design pseudocode both describe "first line" semantics and the test does not verify strict first-line truncation.

**Suggested fix:** Either (a) update the inline comment in `node-name.ts` and the test description to say "first 50 chars, newlines collapsed" to match the actual implementation, or (b) change the implementation to `n.text.split('\n')[0].slice(0, 50) || 'Note'` and update the test expectation. Option (a) is lower risk since the browser tests already pass with the current output.

**Resolution:** fixed — took option (b) to honor the design pseudocode + the inline comment ("first line"): implementation is now `n.text.split('\n')[0].slice(0, 50) || 'Note'`; `node-name.test.ts` updated (`'hello\nworld'` → `'hello'`, plus an explicit 50-char-cap case). tsc 0 · lint 0 · vitest green.

#### Finding 2 — [info] Module detail files missing for all Phase 3 touched modules (pre-existing gap)

**Files:** `.flowcode/plans/003-canvas-foundation/003-canvas-foundation-plan.md:307-312`

`node-components`, `node-name`, `store`, `comments`, and `inspector-rail` all lack per-module detail files under `.flowcode/project/modules/`. The plan explicitly flags each as "MISSING (pre-existing gap)". Carried forward from Finding 4 in the Phase 1+2 check. No code action required in Phase 3.

**Suggested fix:** Create module detail files in the post-execution pipeline after all four phases complete.

**Resolution:** deferred — pre-existing gap acknowledged in plan; not in Phase 3 scope

#### Finding 3 — [info] `eslint-disable-next-line` in `image-node.tsx` still lacks ticket reference

**Files:** `components/canvas/nodes/image-node.tsx:20`

`// eslint-disable-next-line @next/next/no-img-element` is present without a ticket/issue reference, as required by `clean-code.md § eslint-disable blocks`. Not introduced by Phase 3; carried forward from Finding 6 in the Phase 1+2 check.

**Suggested fix:** Append a reason and reference: `// eslint-disable-next-line @next/next/no-img-element -- image served via guarded /api/asset route, not an external URL (BL-TODO)`.

**Resolution:** deferred — pre-existing; low priority cleanup

---

## Check 2026-06-29 10:30 — Phase 1+2

**Reviewer:** flowcode:code-reviewer-agent
**Scope:** Wave 1 — Phase 1 (Universal Resize) + Phase 2 (Edge Action Bar & Explicit Selection) as one file-disjoint wave
**Plan:** 003-canvas-foundation
**Baseline conformance:** pass (module detail files missing is a pre-existing gap acknowledged in the plan)
**Gate outcome:** PASS
**Summary:** All four code gates (tsc, lint, build, vitest 147/147) pass and the implementation is correct — `NodeResizeFrame` faithfully generalises the group-node pattern, handles are card-siblings, markdown stays auto-height, the action bar reuses store actions verbatim, and the delete surface is single-surfaced. **All findings resolved:** the medium (browser visual-parity/app-smoke) was satisfied by a direct Playwright interaction harness run concurrently (14/14 live assertions, console clean, captures written, parity table filled); both lows fixed (picker closes on deselect via render-phase reset; `aria-controls` wired). Info findings deferred (pre-existing gaps / Phase 4 scope).

### Stack Gate

| Gate | Outcome | Notes |
|------|---------|-------|
| Typecheck | pass | `npx tsc --noEmit` exit 0 — reported by orchestrator |
| Lint | pass | `npm run lint` exit 0 — reported by orchestrator |
| Build | pass | `npm run build` exit 0 — reported by orchestrator |
| Unit | pass | `npx vitest run` 147/147 — reported by orchestrator; adapter `selectable`/`deletable` assertions at `adapter.test.ts:80-82` pass |
| Integration | n/a | `npm run smoke:mcp` not in Wave 1 scope |
| E2E | n/a | `npm run smoke:render` not in Wave 1 scope |
| Browser / Visual Parity | pass | Direct Playwright interaction harness @1512px — 14/14 live assertions, console clean; `② Resize` + `② Edge tools` interaction-state captures under `mockups/captures/phase-{1,2}/`; drift = Expected (new affordances), no regressions |

### Review Findings

#### Finding 1 — [medium] `flowcode:browser` Visual Parity and App Smoke not run — phases cannot close

**Files:** `.flowcode/plans/003-canvas-foundation/003-canvas-foundation-plan.md:238-244`, `.flowcode/plans/003-canvas-foundation/003-canvas-foundation-plan.md:287-288`

Phase 1 declares `flowcode:browser` as a required quality check at phase close: "Visual Parity capture of the `② Resize` state at the 1512px desktop breakpoint + App Smoke (resize chrome renders, console clean); classify drift Expected/Acceptable/Regression; no `>= medium` regression may remain before `Phase Status -> done`." Phase 2 declares the same for `② Edge tools`. Neither gate was executed as part of this wave. Without the captures, it is unknown whether the resize chrome, the action bar, or the `isVisible` comment-mode gate render correctly in the real browser, and no drift classification exists for the ui-design Visual Parity table.

**Suggested fix:** Run `flowcode:browser` for Phase 1 (capture `② Resize` state, verify 8-handle chrome, drag-persist, comment-mode hide; console clean) and Phase 2 (capture `② Edge tools`, verify bar renders on edge select, rel/label/delete work, keyboard delete intact; console clean). Classify any drift as Expected/Acceptable/Regression in the ui-design Visual Parity table. Write phase-end `[PHASE]` entries to `003-canvas-foundation-log.md` after both passes. Only then may Phase Status be set to `done`.

**Resolution:** fixed — browser verification was run concurrently with this review (the reviewer could not see it). A direct Playwright interaction harness (ephemeral driver, `1512×982`) loaded the commerce board and exercised both phases live: **14/14 assertions passed, console clean** — 13 nodes/8 edges; 0 resize controls at rest; selecting a markdown node and a note node each reveals the 8-handle `NodeResizer` (`.fc-rzline` chrome); selecting an edge reveals the `EdgeActionBar` with delete/rel/label; `rel ▾` opens the 8-option `RelPicker`. Interaction-state captures written to `mockups/captures/phase-{1,2}/`; drift classified in the ui-design Visual Parity table (new affordances = Expected drift, no regressions). The markdown-click-opens-reader behavior was investigated and confirmed **pre-existing/intended** (`use-canvas-handlers.ts onNodeClick`), not a regression.

#### Finding 2 — [low] RelPicker anchor jumps 28 px if edge is deselected while picker is open

**Files:** `components/canvas/edges/labeled-edge.tsx:168`

`y={labelY + (selected ? 56 : 28)}` — when the user opens the `RelPicker` via the action bar (`selected=true`, offset=56) and then clicks outside the picker area on the canvas (deselecting the edge without closing the picker), `selected` flips to `false` and the RelPicker jumps from `labelY+56` to `labelY+28` in the same render cycle. The picker remains open (there is no close-on-deselect logic). The picker still functions correctly after the jump; this is a cosmetic glitch rather than a data hazard, but it is a new inconsistency introduced by Phase 2 (before Phase 2 the y-offset was a constant).

**Suggested fix:** Add a `useEffect(() => { if (!selected) setPicker(false) }, [selected])` inside `LabeledEdge` so that deselecting an edge implicitly closes the picker and resets to a clean rest state. This also matches the intent of Decision 2: the action bar and picker are affordances of a selected edge.

**Resolution:** fixed — the picker now closes on deselect. Implemented as a **render-phase reset** (`prevSelected` tracking) rather than the suggested `useEffect`, because the project enforces `react-hooks/set-state-in-effect` (the effect form fails lint); this mirrors the existing pattern in `comment-layer.tsx`. tsc + lint clean; re-verified live (edge flow 14/14).

#### Finding 3 — [low] `rel ▾` button and label pill lack `aria-controls` pointing to the RelPicker

**Files:** `components/canvas/edges/labeled-edge.tsx:111`, `components/canvas/edges/labeled-edge.tsx:148`

Both the action bar's `rel ▾` button (line 111) and the label pill div (line 148) have `aria-expanded={picker}` but no `aria-controls` attribute. The `RelPicker` container div (line 59) has `data-testid="edge-rel-picker"` but no `id`. For screen-reader users, `aria-controls` must point to the controlled element's `id` for the expand/collapse relationship to be machine-readable. The `aria-expanded` alone is the correct intent but is incomplete. The same gap exists on the pre-existing label pill (not introduced by Phase 2).

**Suggested fix:** Add `id={`edge-rel-picker-${id}`}` to the `RelPicker` container div, and add `aria-controls={`edge-rel-picker-${id}`}` to both the `rel ▾` button and the label pill div. Scope by edge `id` to avoid collisions on boards with multiple edges.

**Resolution:** fixed — `RelPicker` container now carries `id={`fc-rel-picker-${id}`}`, and both the `rel ▾` action-bar button and the label pill carry `aria-controls={`fc-rel-picker-${id}`}` (scoped by edge id). tsc + lint clean.

#### Finding 4 — [info] Module detail files missing for all Wave 1 touched modules (pre-existing gap)

**Files:** `.flowcode/plans/003-canvas-foundation/003-canvas-foundation-plan.md:56`, `.flowcode/plans/003-canvas-foundation/003-canvas-foundation-plan.md:264-266`

`node-components`, `edge-component`, `adapter`, and `canvas-shell` all lack per-module detail files under `.flowcode/project/modules/`. The plan explicitly acknowledges this at every Touched Modules entry as "MISSING (pre-existing gap) — Flag at the gate; do not fabricate." This is not a defect introduced by Wave 1. No code action required in this wave.

**Suggested fix:** Create `modules/{node-components,edge-component,adapter,canvas-shell}.md` detail files in a dedicated documentation task after plan 003 completes, as part of the post-execution pipeline.

**Resolution:** deferred — pre-existing gap acknowledged in plan; not in Wave 1 scope

#### Finding 5 — [info] `fc-note__edit` always-on border and `fc-edge-input` always-on ring are deferred Phase 4 items

**Files:** `app/styles/nodes.css:315`, `app/styles/edges.css:44`

`.fc-note__edit { border: 1px solid var(--color-primary) }` at rest (nodes.css:315) and `.fc-edge-input { box-shadow: 0 0 0 3px rgba(192,193,255,0.18) }` at rest (edges.css:44) are the "always-on faded indigo/violet rings" described in the design's Problem Statement. Both are in scope for Phase 4 (Visual Integrity & Reader Redesign) and are intentionally deferred. They are not regressions introduced by Wave 1.

**Suggested fix:** Address in Phase 4 per design Decision 4: move `.fc-edge-input` ring to `:focus` only; change `.fc-note__edit` rest border to `--color-outline-variant` with a crisp `--color-primary` `:focus` ring.

**Resolution:** deferred — Phase 4 scope

#### Finding 6 — [info] `eslint-disable-next-line` in `image-node.tsx` lacks ticket/issue reference

**Files:** `components/canvas/nodes/image-node.tsx:19`

`// eslint-disable-next-line @next/next/no-img-element` names the suppressed rule but provides no ticket/issue reference, as required by `clean-code.md`: "added with a one-line reason and a ticket/issue reference." This is pre-existing — the `<img>` element and the suppress comment were present before Wave 1; Phase 1 only added the `NodeResizeFrame` wrapper around the existing img markup. Not introduced by this wave.

**Suggested fix:** Append a brief reason and a reference, e.g., `// eslint-disable-next-line @next/next/no-img-element -- image served via guarded /api/asset route, not an external URL (BL-TODO)`.

**Resolution:** deferred — pre-existing; low priority cleanup

---

<!-- Older QA runs continue below. New runs are prepended above this line, directly under the file header. Never rewrite prior sections. -->

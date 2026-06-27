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

## Check 2026-06-27 20:15 — Plan completion (re-close after Phase 10)

**Scope:** plan-completion review for the `001-initial-architecture` re-close (plan reopened to execute the deferred Phase 10; only Phase 10 code changed since the prior plan close).
**Baseline conformance:** OK — `project-overview.md` propagated for Phase 10 (Schema/Adapter/Layout/Store rows, folder structure, `elkjs` dependency, phase count → 10); technical-overview + changelog + test-notes reconciled to 10/10.

| Gate | Command | Result |
|------|---------|--------|
| Typecheck | `npx tsc --noEmit` | PASS (0) |
| Lint | `npm run lint` | PASS (0) |
| Unit | `npx vitest run` | PASS (79/79) |
| Build | `npm run build` | PASS (exit 0) |
| Interactive | pure-Node CDP | PASS (multi-select→group→ungroup, re-organize, save-as round-trip, open/save dialogs) |

**Outcome:** PASS. No `≥ medium` findings outstanding across the plan.

### Resolution of Phase 10 review findings

- **[low] Finding 1 (stale project-overview / plan metadata)** — **Resolution:** fixed. Plan Phase Status → `done` + AC checkboxes checked; `project-overview.md` updated (store/adapter/layout rows, folder structure, `elkjs`, 10-phase count); technical-overview/changelog/test-notes reconciled.
- **[low] Finding 2 (`reorganize()` swallowed ELK errors)** — **Resolution:** fixed. Added a `catch (e) { console.error('Re-organize (ELK) failed', e) }` (Phase 8 `patchLinks` precedent); re-ran tsc/lint/vitest green.
- **[info] Findings 3–5** (setTimeout fitView heuristic; dead `setNodePosition`; positional `setSelection` guard) — accepted/deferred; recorded in the `[PHASE 10]` log Deviations + technical-overview follow-ups.

---

## Check 2026-06-27 20:00 — Phase 10 (Canvas Mechanics & File I/O)

**Reviewer:** flowcode:code-reviewer-agent
**Scope:** Phase 10 — `lib/canvas/jsoncanvas.ts` (parentId), `lib/canvas/adapter.ts` (abs↔rel group ordering), `lib/canvas/store.ts` (setSelection/groupSelection/ungroup/applyLayout/saveAs/openBoard), `lib/canvas/brief.ts` (parentId preservation), `lib/canvas/layout.ts` (NEW — ELK computeLayout), `lib/canvas/layout.test.ts` + `lib/canvas/adapter.test.ts` + `lib/canvas/store.test.ts` (Phase 10 tests), `components/canvas/board-dialog.tsx` (NEW — Open/Save-as modal), `components/canvas/use-canvas-handlers.ts` (onSelectionChange + group-aware drag write-back), `components/canvas/comment-layer.tsx` (absolute pin geometry via internals.positionAbsolute), `components/canvas/canvas-toolbar.tsx` (Group/Ungroup/Re-organize/File wired), `components/canvas/canvas-shell.tsx` (selection props + BoardDialog mount), `app/styles/toolbar.css` (dialog + busy-state CSS), `package.json` (+elkjs)
**Plan:** 001-initial-architecture
**Baseline conformance:** flagged (1) — `project-overview.md` and `001-initial-architecture-plan.md` do not reflect Phase 10 completion: summary bullet still reads "Phase 10 deferred", Phase 10 status still `in-progress`, AC checkboxes unchecked, Store/Adapter/Folder-Structure/Dependencies/Toolbar/Evolution-Log rows stale
**Gate outcome:** PASS
**Summary:** All five stack gates green (tsc 0 · lint 0 · build ok · vitest 79/79 · CDP 7/7 live-verified scenarios: multi-select→group→ungroup, re-organize repositions all nodes, save-as writes+adopts path, open/save dialogs). The coordinate math is correct: `toReactFlow` stable-partitions parent-before-child (sort by `!!parentId`), emits `x − parent.x / y − parent.y` relative positions; `toJSONCanvas` reconstructs absolute via `parent.position + child.position`; round-trip test verifies the child at absolute (50,60) survives. `groupSelection` bounds math (minX−PAD, minX−PAD, (maxX−minX)+2·PAD, (maxY−minY)+2·PAD) is correct and verified by the store unit test. ELK group-delta shift in `reorganize` (`c.x + (np.x − g.x)`) is correct; children are not fed to ELK and shift atomically with their group. `setSelection` equality guard is order-sensitive but per-spec and harmless. `brief.ts` correctly preserves `parentId` so agent updates do not silently un-parent grouped nodes. `saveAs`/`openBoard` URL-adopt via `replaceState` is SSR-guarded. No `≥ medium` findings; phase is clear to close and flip to `done`.

### Stack Gate

| Gate | Outcome | Notes |
|------|---------|-------|
| Typecheck | pass | `npx tsc --noEmit` — exit 0 |
| Lint | pass | `npm run lint` — exit 0 |
| Build | pass | `npm run build` — exit 0 |
| Unit | pass | `npx vitest run` — 79/79 (66 prior + 5 adapter Phase-10 group tests + 3 layout tests + 5 store Phase-10 tests) |
| Visual parity (CDP) | pass | Live-verified 7 scenarios: multi-select box-select / ⌘-click, Group button creates container, drag group moves children, Ungroup dissolves container, Re-organize runs ELK + fitView, Save-as writes + adopts URL, Open board dialog navigates dir tree |
| Integration | n/a | Phase 10 scope — no new route handlers |
| E2E | n/a | Phase 10 scope |

### Review Findings

#### Finding 1 — [low] `project-overview.md` and plan Phase 10 metadata do not reflect Phase 10 completion

**Files:** `.flowcode/project/project-overview.md:15`, `.flowcode/project/project-overview.md:56`, `.flowcode/project/project-overview.md:66`, `.flowcode/project/project-overview.md:61`, `.flowcode/project/project-overview.md:145-160`, `.flowcode/plans/001-initial-architecture/001-initial-architecture-plan.md:1585`, `.flowcode/plans/001-initial-architecture/001-initial-architecture-plan.md:1741-1744`

Seven documentation areas are stale after Phase 10:

1. **`project-overview.md` summary bullet (line 15)** reads "Phases 1–9 + post-Phase-9 bugfix pass complete; Phase 10 (`group-operations`) deferred." Phase 10 has shipped.

2. **`project-overview.md` Modules summary (line 56)** reads "Plan `001` closed 2026-06-27 (9 phases; Phase 10 deferred)." Needs "10 phases; plan complete."

3. **`project-overview.md` Store module row (line 66)** does not list the Phase 10 actions: `selectedIds`, `setSelection`, `groupSelection`, `ungroup`, `applyLayout` (bulk absolute-coord write), `saveAs` (write + adopt path), `openBoard` (switch board).

4. **`project-overview.md` Adapter module row (line 61)** does not mention parent-before-child ordering or the absolute↔relative group conversion added in Phase 10.

5. **`project-overview.md` Folder Structure `lib/canvas/` (lines 128–136)** does not list `lib/canvas/layout.ts` (NEW — ELK `computeLayout`). `components/canvas/` listing (lines 107–119) does not list `components/canvas/board-dialog.tsx` (NEW — Open/Save-as modal).

6. **`project-overview.md` Dependencies table (lines 145–160)** does not include `elkjs ^0.11.1` (bundled JS build, no native deps; added in Phase 10 for ELK auto-layout). The Technology Stack table also omits it.

7. **`001-initial-architecture-plan.md` Phase 10 metadata (lines 1585, 1741–1744)** — `**Phase Status:** in-progress` needs to flip to `done`; the four AC checkboxes (`[ ]`) need to be marked `[x]` now that CDP has verified all scenarios.

**Suggested fix:** Update `project-overview.md`: flip summary bullet to "Phase 10 (`group-operations`) shipped 2026-06-27; plan complete"; update Store row with Phase 10 actions; update Adapter row with group-ordering note; add `layout.ts` and `board-dialog.tsx` to Folder Structure; add `elkjs` to Dependencies + Technology Stack table; add an Evolution Log entry for Phase 10. Update the plan: flip `Phase Status: in-progress → done`; mark all four ACs `[x]`.

**Resolution:**

---

#### Finding 2 — [low] `reorganize()` in `canvas-toolbar.tsx` swallows ELK layout errors with no user feedback

**Files:** `components/canvas/canvas-toolbar.tsx:63-82`

The `reorganize` async callback catches nothing — only a `finally` block resets `reorganizing`:

```typescript
try {
  ...
  const top = await computeLayout(doc.nodes, doc.edges, measured)
  ...
  applyLayout(updates)
} finally {
  setReorganizing(false)
}
```

If `computeLayout` throws (ELK internal error, invalid graph, or a timeout), the exception propagates to the `void reorganize()` call site and becomes an unhandled promise rejection. The button stops spinning, `applyLayout` is never called, and the user receives zero feedback — identical to the Phase 7 upload-error silent-discard pattern that was fixed in Phase 7 Finding 2. The Phase 8 precedent (`patchLinks` errors) extended the same fix.

**Suggested fix:** Add a `catch` block that at minimum emits `console.error('computeLayout failed', e)` and sets a transient toolbar error (`.fc-toolbar__err`) per the established pattern. Example:

```typescript
} catch (e) {
  console.error('Re-organize (ELK) failed', e)
  setReorganizeError(e instanceof Error ? e.message : 'layout failed')
  setTimeout(() => setReorganizeError(null), 3500)
} finally {
  setReorganizing(false)
}
```

**Resolution:**

---

#### Finding 3 — [info] `reorganize()` uses a fixed 80 ms `setTimeout` before `fitView`

**Files:** `components/canvas/canvas-toolbar.tsx:78`

```typescript
setTimeout(() => fitView({ duration: 320, padding: 0.2 }), 80)
```

The 80 ms delay is a heuristic to let the store→RF reconcile cycle complete before fitting. On a large board with many tall auto-height markdown nodes (which trigger multiple React-Flow measure cycles), 80 ms may be insufficient. The result is `fitView` animating to a viewport that does not yet include all re-measured node heights, then jerking as nodes expand. Observed only on boards with ≥ ~30 markdown nodes; default board is unaffected.

**Suggested fix (deferred):** React Flow v12 exposes `requestAnimationFrame`-based node measurement events. An alternative is to use `onNodesChange` once to detect a `dimensions` change after `applyLayout`, then call `fitView`. For v0.1 the timing heuristic is acceptable; the deferred fix improves UX on large boards.

**Resolution:** accepted — deferred; the 80 ms heuristic is sufficient for v0.1 board sizes.

---

#### Finding 4 — [info] `setNodePosition` store action is superseded by `applyLayout` in Phase 10

**Files:** `lib/canvas/store.ts:244-249`, `components/canvas/use-canvas-handlers.ts:73-91`

`setNodePosition` was the Phase 3 single-node drag write-back mechanism. Phase 10 replaced `onNodeDragStop` with a group-aware multi-node write-back that calls `applyLayout` exclusively. No component in the codebase calls `setNodePosition` after Phase 10 — it is reachable only via the unit test `store.test.ts:167-173`. The action remains valid (it works) and the test covers it, but it is no longer part of any production interaction path.

This is not a bug; the action could be re-used by future features (e.g., keyboard nudge). No behavioral impact.

**Suggested fix (deferred):** Add a JSDoc comment to `setNodePosition` noting it is no longer the drag write-back path (now `applyLayout`); or remove it if no planned feature needs it. No urgency — the unit test keeps it verified.

**Resolution:** accepted — no action for Phase 10; document or remove in a future pass.

---

#### Finding 5 — [info] `setSelection` equality guard is order-sensitive

**Files:** `lib/canvas/store.ts:166-170`

```typescript
if (cur.length === ids.length && cur.every((id, i) => id === ids[i])) return
```

React Flow's `onSelectionChange` fires on every render. The guard prevents spurious Zustand `set` calls, but the comparison is positional: if RF returns the same set of node ids in a different order on consecutive renders (which can happen when a new node is added to the board mid-selection), the guard fails and `set({ selectedIds: ids })` fires unnecessarily. This causes one extra Zustand subscriber notification per render cycle with no observable UX impact.

The plan's own code snippet uses the same implementation; per-spec, no behavioral problem.

**Suggested fix (deferred):** Replace the positional equality with a set-equality check: `new Set(ids).size === new Set(cur).size && ids.every((id) => cur.includes(id))`. For the typical selection sizes (< 20 nodes) the O(n²) cost is negligible.

**Resolution:** accepted — per-spec; deferred to a future cleanup.

## Check 2026-06-27 17:00 — Plan completion (9/10 phases; Phase 10 deferred)

**Reviewer:** flowcode:code-reviewer-agent
**Scope:** Plan completion — Phase 9 AC spot-check, artifact consistency audit, unresolved-finding sweep, Phase 10 deferral hygiene
**Plan:** 001-initial-architecture
**Baseline conformance:** pass — `project-overview.md` and `001-initial-architecture-technical-overview.md` reflect all Phase 9 deliverables (single-rail toolbar, `<FrontmatterView>`, redesigned reader, `Load .json…`, `group-node.tsx` shape system, selection-ring + dashed-indigo bugfix pass); Phase 10 spec preserved unexecuted; no stale contract at ≥ medium severity
**Gate outcome:** PASS
**Summary:** All four stack gates green (tsc 0 · lint 0 · build ok (8 routes) · vitest 66/66) plus Phase-9 CDP 7/7 + 3 post-Phase-9 bugfix checks carried from the Phase-9 check. Phase 9's six acceptance criteria are all `[x]` in the plan and confirmed in the delivered code and technical-overview. No unresolved ≥ medium finding exists in any prior check; qa-probe-gate will not block. Phase 10 deferred cleanly: three toolbar scaffolds are `disabled aria-disabled="true"` with no `onClick`, no Phase-10 store actions (`groupSelection`/`ungroup`/`applyLayout`/`saveAs`/`openBoard`) exist in `lib/canvas/store.ts`, `NodeBase` has no `parentId` field, and `elkjs` is not in `package.json`. Two low-level documentation gaps remain (blank `**Resolution:**` lines in the Phase-9 check for a resolved low finding and an addressed info finding); neither blocks. Plan is clear to close.

### Stack Gate

| Gate | Outcome | Notes |
|------|---------|-------|
| Typecheck | pass | `npx tsc --noEmit` — exit 0 |
| Lint | pass | `npm run lint` — exit 0 |
| Build | pass | `npm run build` — exit 0; 8 routes registered |
| Unit | pass | `npx vitest run` — 66/66 (adapter 9 · edges 11 · comments 9 · store 28 · brief 9) |
| Visual parity (CDP) | pass | Phase-9 check: 7/7 surfaces + 3 post-Phase-9 bugfix checks (selection ring / dashed-indigo group / import message) |
| Integration | n/a | plan-completion scope; per-route integration verified at each phase close |
| E2E | n/a | plan-completion scope |

### Review Findings

#### Finding 1 — [low] Phase-9 QA Finding 1 (low) and Finding 2 (info) have blank `**Resolution:**` lines

**Files:** `.flowcode/plans/001-initial-architecture/001-initial-architecture-qa-report.md:64`, `.flowcode/plans/001-initial-architecture/001-initial-architecture-qa-report.md:88`

Two `**Resolution:**` lines in the Phase-9 check (14:00) remain blank despite the underlying work being done:

- **Finding 1 [low]** (`project-overview.md` Phase-9 staleness, six entries): all six stale entries are resolved in the live `project-overview.md` — Toolbar row (line 76), `FrontmatterView` module row (line 69), updated `markdown-node.tsx` description (line 70), `Load .json…` in Export/Import (line 74), sticky frontmatter bar in Reader (line 75), and `frontmatter.css` in the `app/styles/` listing (line 94). The fix was done; the `**Resolution:**` line was not filled in.
- **Finding 2 [info]** (boolean `status` edge case in `FrontmatterView`): the technical-overview confirms boolean-status values "fall through to the kv grid (never silently dropped — `frontmatter-view.tsx:65,70`)" — the edge case no longer produces an empty wrapper; behavior was addressed (differently from the suggested type-narrowing approach) but `**Resolution:**` was not filled in.

Neither gap triggers `qa-probe-gate.js` (both ≤ low / info).

**Suggested fix:** Fill the two blank `**Resolution:**` lines in the Phase-9 check: Finding 1 — "fixed — `project-overview.md` updated at Phase-9 close; all six stale entries corrected"; Finding 2 — "accepted (alternative) — boolean-status values fall through to the kv grid (`frontmatter-view.tsx:70`); empty-wrapper case no longer arises".

**Resolution:** fixed — the two Phase-9-check `**Resolution:**` lines are now filled in (Finding 1 = fixed via project-overview propagation; Finding 2 = accepted-alternative, boolean-status falls through to the kv grid).

---

#### Finding 2 — [low] Plan frontmatter `status: active` not flipped to `complete`; summary bullet stale

**Files:** `.flowcode/plans/001-initial-architecture/001-initial-architecture-plan.md:4`, `.flowcode/plans/001-initial-architecture/001-initial-architecture-plan.md:13`

The plan's frontmatter (line 4) still reads `status: active`. The summary bullet at line 13 reads "Status active; phases 1–8 done (1–7 2026-06-25, 8 2026-06-27)" — Phase 9 completion and Phase 10 deferral are absent. The plan's § Post-Execution Artifacts section (line 1764) instructs: "flip this plan's frontmatter `status: active → complete`."

**Suggested fix:** Set `status: complete` in the plan frontmatter; update the summary bullet to read "Status complete — Phases 1–9 done (2026-06-27); Phase 10 (`group-operations`) deferred."

**Resolution:** fixed — plan frontmatter flipped to `status: complete` and the summary bullet updated to "Phases 1–9 done; Phase 10 deferred" at plan close.

---

## Check 2026-06-27 14:00 — Phase 9 (UX/UI Redesign & File Import)

**Reviewer:** flowcode:code-reviewer-agent
**Scope:** Phase 9 — `components/canvas/frontmatter-view.tsx` (NEW), `components/canvas/nodes/markdown-node.tsx`, `components/canvas/canvas-toolbar.tsx`, `components/canvas/export-panel.tsx`, `components/canvas/reader-drawer.tsx`, `app/styles/frontmatter.css` (NEW), `app/styles/nodes.css` (frontmatter rules removed), `app/styles/toolbar.css`, `app/styles/reader.css`, `app/globals.css` (frontmatter.css import added)
**Plan:** 001-initial-architecture
**Baseline conformance:** flagged (1) — `project-overview.md` Toolbar row (line 74), Node Components folder-structure entry (line 117), Reader module row (line 73), Export/Import module row (line 72), and Folder Structure `app/styles/` list (lines 90–96) do not reflect Phase 9 additions (`frontmatter-view.tsx`, `frontmatter.css`, direct-rail toolbar redesign, frontmatter bar in reader, `Load .json…` import)
**Gate outcome:** PASS
**Summary:** All six applicable gates green (tsc 0 · lint 0 · build ok · vitest 66/66 · CDP 14/14 toolbar testids + visual parity · integration n/a). The `<FrontmatterView>` extraction is clean: `PRIORITY`/`SKIP`/`MAX_CHIPS` correctly scoped; `FmValue` handles arrays (sliced + overflow count), objects (`{…}`), and scalars (`String(value)`) without crashing; card and reader variants share one composition; the null-return guard fires correctly for empty frontmatter; `markdown-node.tsx` consumes `variant="card"` with no node-render regression. Toolbar state machine is sound: single `open` flyout state, Esc + outside-mousedown both wired, disabled scaffolds are genuinely inert (`disabled aria-disabled="true"` + CSS resets hover/active transforms). The `Load .json…` handler wraps the async callback with `void onLoadFile(e)` (satisfies `no-misused-promises`), resets `e.target.value` after the await, and feeds the existing paste/Apply/stale flow unchanged. Reader CSS is clean: opaque surface via `var(--color-surface-lowest)`, 17px/1.72/`max-width:66ch`, shiki token scoping via `:not(pre) > code`, no `transition: all`. One low finding (project-overview.md baseline staleness); one info finding (boolean status edge case in FrontmatterView). No `≥ medium` findings; phase is clear to close.

### Stack Gate

| Gate | Outcome | Notes |
|------|---------|-------|
| Typecheck | pass | `npx tsc --noEmit` — exit 0 |
| Lint | pass | `npm run lint` — exit 0 |
| Build | pass | `npm run build` — exit 0; pre-existing Turbopack `process.cwd()` warning in `lib/fs-guard.ts` (not Phase 9) |
| Unit | pass | `npx vitest run` — 66/66 (no new pure-module tests required for Phase 9 UI slices) |
| Visual parity | pass | CDP 1280×832 — 14/14 toolbar testids; direct insert buttons visible; `+ Add ▾` hidden at 1280px; 3 scaffolds disabled; card pill "living"=lime + 3 tags; shape flyout 3 items, file flyout 3 items; reader opaque `#060e20` + sticky frontmatter bar + prose 17px/1.72/`#dae2fd`/66ch (744px); `response-load-file` + `response-apply` testids present |
| Integration | n/a | Phase 9 scope — UI-only; no new routes or API contracts |
| E2E | n/a | Phase 9 scope |

### Review Findings

#### Finding 1 — [low] `project-overview.md` does not reflect Phase 9 additions (six stale entries)

**Files:** `.flowcode/project/project-overview.md:72`, `.flowcode/project/project-overview.md:73`, `.flowcode/project/project-overview.md:74`, `.flowcode/project/project-overview.md:90-96`, `.flowcode/project/project-overview.md:107-121`

Six entries in the project overview are stale after Phase 9:

1. **Toolbar module row (line 74)** still reads "`+ Add ▾` menu (markdown/image via `FilePicker`, note, Shape ▸ rectangle/ellipse/diamond, link via inline input…)". Phase 9 replaced this nested menu with direct icon buttons (`toolbar-add-{note,markdown,image,link,shape}`) on the rail at ≥1024px; the `+ Add ▾` is now the narrow-screen (`<1024px`) fallback only. Upload/Import/Export are collapsed under a single `[File ▾]` trigger. Three disabled Phase-10 scaffolds (Group/Ungroup/Re-organize) are present but inert.

2. **Export/Import module row (line 72)** does not mention the `Load .json…` file-input button (`response-load-file` testid) added to the Import tab, which reads a picked `.json` file into the paste textarea and feeds the existing Apply/validate/stale flow unchanged.

3. **Reader module row (line 73)** does not mention `<FrontmatterView variant="reader">`, which renders a sticky frontmatter header bar (status pill + tag chips + link chips + key/value grid) above the prose when the node has non-empty frontmatter.

4. **Node Components folder-structure entry (line 117)** still reads "Frontmatter table + collapsible body + 4 handles" for `markdown-node.tsx`; the inline frontmatter table was replaced by `<FrontmatterView variant="card">`.

5. **Folder Structure `components/canvas/` (lines 107–121)** does not list `frontmatter-view.tsx` (NEW — exports `FrontmatterView`, `basename`, `statusClass`; shared by `markdown-node.tsx` and `reader-drawer.tsx`).

6. **Folder Structure `app/styles/` (lines 90–96)** does not list `frontmatter.css` (NEW — status pill, tag/link chips, key/value grid, card and reader-bar variants; extracted from `nodes.css`).

**Suggested fix:** Update the Toolbar module row to describe the Phase 9 direct-rail layout (insert icons, File flyout, disabled Phase-10 scaffolds, narrow-screen fallback). Add a `FrontmatterView` component row. Append `frontmatter.css` to the `app/styles/` listing. Update the `markdown-node.tsx` folder-structure description. Append the frontmatter header bar to the Reader module row. Append `Load .json…` to the Export/Import module row.

**Resolution:** fixed — `project-overview.md` was propagated at plan close; all six stale entries corrected (Toolbar single-rail row, new `FrontmatterView` module row, `frontmatter.css` in the styles listing, `markdown-node.tsx` description, Reader frontmatter bar, Export/Import `Load .json…`).

---

#### Finding 2 — [info] `FrontmatterView` renders an empty wrapper `<div>` instead of `null` when `status` is a non-string/non-number value

**Files:** `components/canvas/frontmatter-view.tsx:58-62`, `components/canvas/frontmatter-view.tsx:64-65`

The `keys` array (lines 58–61) includes any PRIORITY key that is present and not `isEmpty`. The `isEmpty` sentinel checks only `null | undefined | ''` — a boolean `status: true` passes this check and therefore enters `keys`, incrementing `keys.length` past zero and preventing the `null` return on line 62. However, `hasStatus` (line 65) additionally requires `typeof status === 'string' || typeof status === 'number'`, so a boolean status is excluded from rendering. `status` is also excluded from `restKeys` (line 68) because it is a PRIORITY key. Result: when `status: true` is the only non-empty, non-name field in the frontmatter, the component renders a `.fc-fm` wrapper `<div>` with no children rather than returning `null`.

Flowcode frontmatter `status` values are conventionally strings (`draft`, `active`, `approved`…), so this does not arise on the default board or any standard flowcode file. It could arise on user-authored files with non-standard YAML.

**Suggested fix:** Align the PRIORITY filter's predicate with `hasStatus` so that a boolean status is excluded from `keys` at collection time:

```ts
...PRIORITY.filter((k) => {
  const v = fm[k]
  if (isEmpty(v)) return false
  if (k === 'status') return typeof v === 'string' || typeof v === 'number'
  return true
}),
```

**Resolution:** accepted (alternative) — addressed at Phase-9 close by letting an off-shape `status` fall through to the kv grid instead of being dropped: `restKeys` excludes `status` only when `hasStatus` is true (`frontmatter-view.tsx:70`), so a boolean status renders as a `key/value` row and the empty-wrapper case no longer arises. Equivalent outcome to the suggested PRIORITY-filter narrowing.

---

## Check 2026-06-27 11:30 — Plan completion

**Reviewer:** flowcode:code-reviewer-agent
**Scope:** Plan-completion sign-off on the Phase 8 delta — CSS partials split (`app/styles/*.css`), `useCanvasHandlers` hook extraction (`components/canvas/use-canvas-handlers.ts`), smoothstep edges + `connectionLineType`, reader 3-size control (`readerSize`/`setReaderSize`/`maximizeReader`), bidirectional `links:` write-back (`/api/canvas/links` + `patchLinks` + `onConnect`/`removeEdgeWriteback`), nyx minimap/controls hex props, `devIndicators:false`. Per-phase and prior plan-completion findings (2026-06-26 23:00) are resolved and not re-litigated.
**Plan:** 001-initial-architecture
**Baseline conformance:** flagged (1) — `project-overview.md` Folder Structure (line 122) lists `components/markdown-renderer.tsx`; file was never created; reader uses `/api/render` + `lib/render-md.ts`; stale entry predates Phase 8 but first flagged here
**Gate outcome:** PASS
**Summary:** All six applicable gates green (tsc 0 · lint 0 · build ok · vitest 66/66 · CDP 9/9 · curl `/api/canvas/links` 400/400/404). Phase 8 integrates cleanly: handler extraction is behavior-identical; `deletable:false` in the adapter gates node deletion while edge keyboard-delete writes through to the doc and the source file; the `lk:` write-back loop is idempotent on reconnect, self-heals under transient failure on reload, and produces no duplicate edges on the next reconcile. No regression to load/save/applyResponse/comments/agent round-trip. One low finding (stale folder-structure entry); no `≥ medium` findings.

### Stack Gate

| Gate | Outcome | Notes |
|------|---------|-------|
| Typecheck | pass | `npx tsc --noEmit` — exit 0 |
| Lint | pass | `npm run lint` — exit 0 |
| Build | pass | `npm run build` — 12 routes incl. `/api/canvas/links`; pre-existing Turbopack `process.cwd()` warn (not Phase 8) |
| Unit | pass | `npx vitest run` — 66/66 (56 prior + 10 Phase 8: 5 `onConnect` + 3 `removeEdgeWriteback` + 2 no-op guards) |
| Visual parity | pass | CDP 9/9 — smoothstep routing, nyx minimap/controls, reader drawer/half/full widths, dev badge hidden |
| Integration | pass | curl `/api/canvas/links` — add + body preserved, remove + body preserved; `../`→400, non-md→400, ENOENT→404 |
| E2E | n/a | plan-completion scope |

### Review Findings

#### Finding 1 — [low] `project-overview.md` Folder Structure lists non-existent `components/markdown-renderer.tsx`

**Files:** `.flowcode/project/project-overview.md:122`

The Folder Structure section at line 122 carries:

```
  markdown-renderer.tsx         — Full-fidelity unified pipeline (@shikijs/rehype); used in reader
```

This file was never created. Phase 7 ran the full shiki pipeline server-side via `lib/render-md.ts` + `GET /api/render` instead of building a client component. `ls components/` returns only the `canvas/` subdirectory — `markdown-renderer.tsx` does not exist on disk. The prior plan-completion check (2026-06-26 23:00) confirmed no code references the file; this check is the first to flag the stale folder-structure line itself. The entry was not introduced by Phase 8.

**Suggested fix:** Remove the `markdown-renderer.tsx` line from the Folder Structure section of `.flowcode/project/project-overview.md`.

**Resolution:** fixed — removed the stale `markdown-renderer.tsx` line; also corrected the sibling `labeled-edge.tsx` description (`Bezier` → `Smoothstep (orthogonal)`) which Phase 8 made stale.

---

## Check 2026-06-27 10:00 — Phase 8 (Post-Execution Polish & Cleanup)

**Reviewer:** flowcode:code-reviewer-agent
**Scope:** Phase 8 — `next.config.ts` (Fix 7), `components/canvas/edges/labeled-edge.tsx` (Fix 2), `components/canvas/canvas-shell.tsx` (Fix 1/2/5/6), `lib/canvas/use-canvas-handlers.ts` NEW (Fix 1/5), `lib/canvas/store.ts` (Fix 3/4/5), `lib/canvas/adapter.ts` (Fix 5), `lib/canvas/frontmatter.ts` (Fix 5), `lib/api.ts` (Fix 5), `app/api/canvas/links/route.ts` NEW (Fix 5), `components/canvas/nodes/markdown-node.tsx` (Fix 3), `components/canvas/reader-drawer.tsx` (Fix 4), `components/canvas/nodes/{image,fallback,group}-node.tsx` + `canvas-toolbar.tsx` (Fix 1), `app/globals.css` + NEW `app/styles/{nodes,edges,controls,reader,comments,toolbar}.css` (Fix 1/4/6), `lib/canvas/store.test.ts` (reworked onConnect + new removeEdgeWriteback tests), `docs/flowcanvas-agent-contract.md` (Fix 5 note)
**Plan:** 001-initial-architecture
**Baseline conformance:** flagged (1) — `lib/canvas/use-canvas-handlers.ts` is a React hook placed in the declared-pure `lib/canvas/*` zone; violates `project-overview.md § Code Style & Conventions` (pure vs. impure split); correct location is `components/canvas/`
**Gate outcome:** PASS
**Summary:** All five gates green (tsc 0 · lint 0 · build ok · vitest 66/66 · CDP visual-parity 9/9). The seven hands-on fixes are implemented correctly: smoothstep edges route at right angles, the reader three-size segmented control and `maximizeReader` work end-to-end, `/api/canvas/links` is guarded (traversal→400, non-md→400, ENOENT→404) and preserves the file body, `onConnect` file↔file minting is idempotent and deterministic (`lk:` id matches `deriveLinkEdges` → reload is a no-op), `removeEdgeWriteback` durably removes edges from the doc before the sync loop can resurrect them. One medium finding (hook file in wrong module zone), one low finding (silent patchLinks errors), two info findings.

### Stack Gate

| Gate | Outcome | Notes |
|------|---------|-------|
| Typecheck | pass | `npx tsc --noEmit` — exit 0 |
| Lint | pass | `npm run lint` — exit 0 (zero errors/warnings) |
| Build | pass | `npm run build` — 12 routes incl. `/api/canvas/links`; pre-existing Turbopack `process.cwd()` warning in `lib/fs-guard.ts` (not Phase 8) |
| Unit | pass | `npx vitest run` — 66/66 (prior 56 + 10 new: 5 `onConnect` + 3 `removeEdgeWriteback` + 2 no-op guards) |
| Visual parity | pass | CDP 9/9 — smoothstep no cubic `C`, minimap/controls nyx glass, reader drawer/half/full widths correct, dev badge hidden, no console errors |
| Integration | pass | curl `/api/canvas/links` — add + body preserved, remove + body preserved; `../`→400, non-md→400, missing→404 |
| E2E | n/a | Phase 8 scope |

### Review Findings

#### Finding 1 — [medium] `use-canvas-handlers.ts` placed in `lib/canvas/` violates the declared `lib/canvas/*` purity convention

**Files:** `lib/canvas/use-canvas-handlers.ts:1-100`

`project-overview.md § Code Style & Conventions` (Pure vs. impure split) states: "`lib/canvas/*` modules are pure TypeScript (no DOM, no React) — they accept typed inputs and return typed outputs. All React + DOM work lives in `components/`." The sole named exception is `lib/canvas/adapter.ts`, which imports only type-only symbols plus the `MarkerType` runtime enum from `@xyflow/react`, stays DOM-free, and remains vitest-testable. `use-canvas-handlers.ts` imports `useNodesState`, `useEdgesState`, `useCallback`, `useEffect`, and `useMemo` from `react` and `@xyflow/react`, manages controlled RF component state, and is not unit-testable under `vitest run` in a Node environment. Placing it alongside `edges.ts`, `frontmatter.ts`, `brief.ts`, and `comments.ts` obscures the pure/impure split from contributors reading the `lib/canvas/` directory.

**Suggested fix:** Move `lib/canvas/use-canvas-handlers.ts` to `components/canvas/use-canvas-handlers.ts`. Update the single import in `canvas-shell.tsx` from `@/lib/canvas/use-canvas-handlers` to `@/components/canvas/use-canvas-handlers`. Add a note in the Canvas-shell row of `project-overview.md` listing the hook file as a co-located helper. No behavior changes required.

**Resolution:** fixed — moved to `components/canvas/use-canvas-handlers.ts`; `canvas-shell.tsx` now imports `./use-canvas-handlers` (its internal `@/lib/canvas/*` imports are unchanged). Plan file table + Fix 1 step updated. `project-overview.md` Canvas-shell row updated to list the co-located hook. Gates re-run green (tsc 0 · lint 0 · build ok · vitest 66/66 · CDP 9/9).

---

#### Finding 2 — [low] `patchLinks` fire-and-forget discards errors silently; a transient network failure produces opposite-direction stale state on reload depending on the path (add vs. remove)

**Files:** `lib/canvas/store.ts:130`, `lib/canvas/store.ts:153`

Both `onConnect` (add path) and `removeEdgeWriteback` (remove path) call `api.patchLinks(...).catch(() => {})` with no `console.error` and no user feedback. On a transient network error: (a) **add** — the canvas shows the new `lk:` edge but the source `.md` was not updated; on the next `load()`, `deriveLinkEdges` finds no matching entry and `reconcileEdges` drops the edge — the drawn edge silently disappears; (b) **remove** — the canvas shows the edge as deleted but the `.md` still has the entry; on the next `load()`, `deriveLinkEdges` re-derives it and the edge silently reappears. The Phase 7 `low` Finding 2 (upload errors) was escalated to a visible fix using `console.error` per file + the `.fc-toolbar__err` chip; `patchLinks` failures warrant the same treatment.

**Suggested fix:** Add `console.error('patchLinks failed for', src, e)` inside each `.catch()` as the minimum baseline (mirrors the Phase 7 upload-error pattern). A complete fix surfaces a transient error chip in the toolbar (`.fc-toolbar__err`) prompting the user to save and reload to re-sync.

**Resolution:** fixed (baseline) — both call sites now `console.error('patchLinks(add) failed', e)` / `console.error('patchLinks(remove) failed', e)`, matching the Phase 7 upload-error precedent. The toolbar error-chip surfacing is deferred as a v0.1+ enhancement (reload already self-heals the canvas↔file divergence).

---

#### Finding 3 — [info] `matter.stringify` re-emits ALL frontmatter through js-yaml — scalar normalization and key reordering are inherent to the approach

**Files:** `lib/canvas/frontmatter.ts:18`, `app/api/canvas/links/route.ts:26`

When `/api/canvas/links` patches a file, `stringifyFile(data, content)` calls `matter.stringify(content, data)`, which re-serializes the entire frontmatter through js-yaml. The body (`content`) is byte-preserved. The frontmatter is semantically preserved but js-yaml may: re-quote bare YAML truth-value scalars (`y`→`'y'`, `no`→`'no'`), change key ordering to insertion order, or alter trailing newlines. On a repository tracking `.md` files with `git diff`, a single `links:` patch can introduce apparent noise on unrelated frontmatter lines. `gray-matter` has no `preserveFormat` option. The plan's AC #5 explicitly acknowledges and accepts this caveat for v0.1.

**Suggested fix (deferred):** Accepted for v0.1. If format stability is required in a future iteration, replace `matter.stringify` with a line-scanner that surgically splices only the `links:` entry in the raw bytes, leaving all other lines untouched.

**Resolution:** accepted — documented in AC #5; deferred beyond v0.1 if needed.

---

#### Finding 4 — [info] `beforeEach` in `store.test.ts` does not reset `readerNodeId` or `readerSize` — bleed vector for future tests

**Files:** `lib/canvas/store.test.ts:28-31`

The `beforeEach` resets `path`, `doc`, `bodies`, `dirty`, `mode`, and `editingEdgeId` but omits `readerNodeId: null` and `readerSize: 'drawer'`. Phase 8 adds both fields to `CanvasState`. No current test exercises `maximizeReader` or `setReaderSize` in a way that bleeds across tests. However, a future test that calls either action without resetting could corrupt a sibling test's starting state. The Phase 7 precedent (adding `editingEdgeId` to `beforeEach` after it was introduced in Phase 6) should be applied to all new transient UI state fields consistently.

**Suggested fix:** Add `readerNodeId: null, readerSize: 'drawer'` to the `useCanvasStore.setState({...})` call in `beforeEach`.

**Resolution:** fixed — `beforeEach` now resets `readerNodeId: null, readerSize: 'drawer'`. vitest 66/66.


---

## Check 2026-06-26 23:00 — Plan completion

**Reviewer:** main agent (inline) — the Post-Execution `flowcode:code-reviewer-agent` and `flowcode:code-explorer-agent` were dispatched in parallel but **both stalled on the background-agent stream watchdog** (600 s no-progress, infrastructure — not a task failure); per `flowcode:execute` / `plan-instructions.md § Post-Execution Pipeline`, the main agent ran the final review + audit inline.
**Scope:** Plan-completion review of the whole shipped Flowcanvas v0.1 app across all 7 phases — cross-phase integration coherence, contract drift, dead/duplicated code, and design-contract satisfaction. Per-phase findings (Phases 1–7) are already resolved in the sections below and were not re-litigated.
**Baseline conformance:** pass — `project-overview.md` module table re-synced at the Phase 7 close (Store `mode`/`addNode`/`addFileNode`/`hydrateFiles`; API all-seven-live; new Toolbar/File-picker/Dropzone/Reader rows); `lib/canvas/*` remains DOM-free (`brief.ts`/`edges.ts`/`comments.ts`/`adapter.ts`/`jsoncanvas.ts`/`frontmatter.ts` import no `window`/`document`); immutable store updates throughout; pure modules unit-tested.
**Gate outcome:** PASS
**Summary:** All four gates green on a clean tree (tsc 0 · lint 0 · build ok · vitest 56/56). The design's contracts are all realized: the extended-JSONCanvas schema + `nodeKind`/`isFileNode` (`lib/canvas/jsoncanvas.ts`), the bidirectional adapter (`adapter.ts`), all **seven** guarded fs routes (`canvas`/`resolve`/`asset`/`file`/`files`/`upload`/`render`) over the lexical `guardPath`, links-derivation + reconciliation (`edges.ts`), pure comment anchoring (`comments.ts`), the 8-step idempotent agent merge (`brief.ts`), and the full chrome. Cross-cutting cleanliness scan is clean: no leftover store `commentMode`/`setCommentMode` field (the only `commentMode` references are a local derived boolean alias inside `comment-layer.tsx`), no `window.prompt` call sites (only comments noting its removal), zero `console.log`/`TODO`/`FIXME` in `app`/`lib`/`components`, no dead `.fc-modebar`/`.fc-modebtn` CSS, and no references to the never-built `markdown-renderer.tsx` (the reader uses `lib/render-md.ts`). The integration surface (Phase 7 brief/merge tying schema↔adapter↔edges↔comments↔persistence) holds together: `applyResponse` re-runs `hydrateFiles` + `reconcileEdges(deriveLinkEdges)` so an agent-generated file's `links:` auto-derive, exactly as `load`/`addFileNode` do. No new findings; the eight cross-phase divergences are documented (and accepted) in the technical-overview + the per-phase logs.

### Stack Gate

| Gate | Outcome | Notes |
|------|---------|-------|
| Typecheck | pass | `npx tsc --noEmit` — exit 0 |
| Lint | pass | `npm run lint` — exit 0 (zero error/warning) |
| Build | pass | `npm run build` — compiled, 11/11 static pages, all 7 `/api/*` routes registered incl. `/api/render` |
| Unit | pass | `npx vitest run` — 56/56 (adapter 9 · edges 11 · comments 9 · store 18 · brief 9) |
| Dev boot | pass | `GET / 200`; full CDP visual-parity run 18/18 (`mockups/captures/phase-7/`); `/api/render` curl → real shiki HTML |
| Integration | n/a | no declared integration gate for this scope |
| E2E | n/a | no declared e2e gate; interactive flows covered by the CDP driver |

### Review Findings

None — plan-completion review surfaced no new findings. All per-phase `≥ medium` findings (below) carry a `**Resolution:**`. Three `info`-level items remain deliberately deferred/accepted (Phase 7 Findings 5 contract-doc sync, 6 import revision double-bump; Phase 5 selection-clear) — none block completion.

---

## Check 2026-06-26 22:30 — Phase 7 (Agent Round-Trip & Polish)

**Reviewer:** flowcode:code-reviewer-agent
**Scope:** Phase 7 — `lib/canvas/brief.ts` (new), `lib/canvas/brief.test.ts` (new), `lib/canvas/store.ts` (modified: `mode`/`setMode`, `addNode`/`addFileNode`, `buildBrief`/`applyResponse` orchestration, `hydrateFiles`), `lib/canvas/store.test.ts` (modified), `lib/render-md.ts` (new), `app/api/render/route.ts` (new), `components/canvas/reader-drawer.tsx` (new), `components/canvas/export-panel.tsx` (new), `components/canvas/canvas-toolbar.tsx` (new), `components/canvas/file-picker.tsx` (new), `components/canvas/dropzone.tsx` (new), `components/canvas/comment-layer.tsx` (modified: reads unified `mode`), `components/canvas/canvas-shell.tsx` (modified: toolbar/dropzone/reader/agent panel mounted), `docs/flowcanvas-agent-contract.md` (new), `app/globals.css` (modified: Phase 7 styles), `app/page.tsx` (modified: error boundary)
**Plan:** 001-initial-architecture
**Baseline conformance:** flagged (1) — `project-overview.md` Store module row references removed `commentMode`/`setCommentMode`; new actions `mode`, `setMode`, `addNode`, `addFileNode` absent; API row still says `/api/render` pending
**Gate outcome:** PASS
**Summary:** All four Phase 7 gates pass (tsc 0 · lint 0 · build ok · vitest 56/56). Merge idempotency is sound: `applyResponse` keys nodes/edges by id, deduplicates id-less comments by content signature (`parentId|author|text`), and skips id-less edges that duplicate a directed pair already on the board — 7-test suite confirms all paths. `/api/render` guards with `guardPath` then the `.md` extension check; `../` + non-md both return 400 (curl-verified). The `render-md.ts` pipeline (remark-parse → remark-gfm → remark-rehype → rehype-sanitize → @shikijs/rehype → rehype-stringify) is deliberate and safe: shiki runs after sanitize on an already-clean hast tree, and its inline-styled spans are deterministic highlighter output, not user-controlled. `ExportPanel` validates `responseVersion === '0.1'` and `briefId` presence before calling `applyResponse`. One medium finding (project-overview baseline staleness), two low findings (silent upload errors; briefId overwritten on re-open export tab), and three info findings — no blockers.

### Stack Gate

| Gate | Outcome | Notes |
|------|---------|-------|
| Typecheck | pass | `npx tsc --noEmit` — exit 0 (reported) |
| Lint | pass | `npm run lint` — exit 0 (reported) |
| Build | pass | `npm run build` — exit 0 (reported) |
| Unit | pass | `npx vitest run` — 56/56 (9 new brief tests + 3 new store tests over 44 prior) |
| Dev boot | pass | `GET / 200`; `/api/render` curl-verified: real `<pre class="shiki">` output; `../` + non-md → 400 |
| Integration | n/a | Phase 7 scope |
| Coverage | n/a | Phase 7 scope |
| E2E | n/a | Phase 7 scope |

### Review Findings

#### Finding 1 — [medium] `project-overview.md` Store row stale: removed `commentMode`/`setCommentMode` still listed; new `mode`, `setMode`, `addNode`, `addFileNode` absent; `/api/render` still marked pending

**Files:** `.flowcode/project/project-overview.md:66`, `.flowcode/project/project-overview.md:73`

Phase 7 replaced Phase-6's `commentMode: boolean` + `setCommentMode` pair with a unified `mode: CanvasMode` ('select'|'connect'|'comment') + `setMode`, and added `addNode` (synchronous immutable append for text/link/group) and `addFileNode` (async path: resolve frontmatter + re-derive links graph). The Store module row (`project-overview.md:66`) still reads "...`commentMode`/`setCommentMode` (transient UI placement-mode flag — never persisted)..." — those fields no longer exist in `CanvasState`. The new `mode`, `setMode`, `addNode`, and `addFileNode` are not listed. Additionally the API row (`project-overview.md:73`) says "`render` pending (Phase 7)" — the route shipped in this phase and all seven routes are now live.

**Suggested fix:** In the Store module row, remove `commentMode`/`setCommentMode` and add `mode: CanvasMode` (transient unified mode — select / connect / comment, never persisted), `setMode`, `addNode` (immutable append for text/link/group), `addFileNode` (async: hydrates frontmatter via `/api/canvas/resolve` + re-derives links graph). Update the API row to say all seven routes live; remove the "render pending" qualifier.

**Resolution:** fixed — `project-overview.md` updated in the same close: the Store row now lists `mode: CanvasMode`/`setMode`/`addNode`/`addFileNode` + the shared `hydrateFiles` (no more `commentMode`/`setCommentMode`); the API row reads "`render` shipped Phase 7; all seven live"; the Export/Import, Reader (`+ lib/render-md.ts`), Comments, and Canvas-shell rows were refreshed, and new **Toolbar**, **File picker**, and **Dropzone** module rows were added.

---

#### Finding 2 — [low] Upload errors silently discarded in `canvas-toolbar.tsx` and `dropzone.tsx` with no user feedback

**Files:** `components/canvas/canvas-toolbar.tsx:93`, `components/canvas/dropzone.tsx:29`

Both upload paths catch errors and drop them with only a code comment:

`canvas-toolbar.tsx:93`: `} catch { /* surfaced by the route; skip the bad file */ }`
`dropzone.tsx:29`: `} catch { /* disallowed/oversize is rejected by the route; skip it */ }`

Per `error-handling.md`: "Don't swallow errors. A `catch` without action is a bug unless a comment explains why." The comment explains the server's guard role, but the user receives zero visual indication that an upload was rejected. A user dropping a `.bmp` (disallowed extension), a file exceeding `UPLOAD_MAX`, or hitting a `GuardError` sees the upload button return to normal and no node appears — an indistinguishable no-op. Both the multi-file toolbar loop and the dropzone handler share this gap.

**Suggested fix:** Surface per-file failures via a local `uploadError` state (cleared after ~3 s) rendered below the upload button (toolbar) and as an overlay message in the dropzone. At minimum, emit `console.error(file.name, e)` per rejected file so developers can trace silent failures during development.

**Resolution:** fixed — the toolbar now sets a transient `uploadError` (auto-cleared after 3.5 s) rendered as a rose `[data-testid="upload-error"]` chip (`.fc-toolbar__err`, `role="alert"`), and **both** upload paths `console.error(file.name, e)` per rejected file (toolbar loop + dropzone handler) so failures are visible and traceable.

---

#### Finding 3 — [low] `ExportPanel` re-runs `buildBrief()` on every export-tab focus, overwriting `session.lastBriefId` and making subsequent imports appear stale

**Files:** `components/canvas/export-panel.tsx:31-38`

The effect runs whenever `tab === 'export'`:

```typescript
useEffect(() => {
  if (tab !== 'export') return
  buildBrief().then(...)
}, [tab, buildBrief])
```

`buildBrief()` mints a new `briefId` and stamps it into `session.lastBriefId` on every call. If the user opens Export (agent uses `briefId = 'brief-aaa'`), then switches to Import to paste the response, then switches back to Export for any reason (re-reading the JSON, checking a field), a second call stamps `lastBriefId = 'brief-bbb'`. The agent's response carries `briefId: 'brief-aaa'`, so the import reports "Stale — briefId mismatch" even though the response is current. Every round-trip where the user visits the export tab more than once before importing will generate a false stale warning.

**Suggested fix:** Cache the built brief in the panel's local state and only rebuild on panel mount or on a user-triggered "Rebuild" action, not on every tab switch. The minimal fix: add a guard that skips `buildBrief()` when `briefJson` is already populated and the doc has not changed since the last build (e.g., compare `doc.flowcanvas.session.revision` to a cached value).

**Resolution:** fixed — added a `builtRef` guard so the brief is built **once per panel open** (the panel remounts on each open, which rebuilds against the current positions); toggling Export↔Import within a session no longer re-mints `lastBriefId`, so a freshly-pasted response no longer reads as stale. On a build error the ref resets so a retry is possible.

---

#### Finding 4 — [info] `canvas-toolbar.tsx` references `React.ReactNode` type without importing the `React` namespace

**Files:** `components/canvas/canvas-toolbar.tsx:105`

The `modeBtn` helper is typed `(m: typeof mode, testid: string, label: string, icon: React.ReactNode)`. The file's only React import is named: `import { useCallback, useEffect, useRef, useState } from 'react'` — no `import React from 'react'` or `import type { ReactNode } from 'react'`. `React.ReactNode` as a type reference requires the `React` namespace in scope. The current tsconfig resolves it (tsc exits 0), but it is non-idiomatic and would fail under a tsconfig that removes the global React namespace, which future Next.js major upgrades may enforce.

**Suggested fix:** Add `import type { ReactNode } from 'react'` and change the parameter type to `icon: ReactNode`.

**Resolution:** fixed — `canvas-toolbar.tsx` now imports `type ReactNode` and `modeBtn`'s `icon` param is typed `ReactNode` (no `React` namespace reference).

---

#### Finding 5 — [info] `AGENT_CONTRACT` inline string and `docs/flowcanvas-agent-contract.md` are consistent on rules but the doc is a superset with no explicit sync contract

**Files:** `lib/canvas/brief.ts:129-135`, `docs/flowcanvas-agent-contract.md`

The design says "keep the two in sync." All core rules match across both: one JSON object only, echo briefId, `ag-` prefix for new ids, `generatedFiles` + `upsertNodes` pair for file additions, `parentId` copy for replies, frontmatter `links:` preference, 20px grid. The doc additionally includes a loop description, the full `AgentResponse`/`AgentNode`/`AgentEdge`/`AgentComment` schema types, and a worked example — none of which conflict with the inline string. The divergence is additive and intentional. The risk is that a rule added to `AGENT_CONTRACT` in the future may not be propagated to the doc, or vice versa.

**Suggested fix (deferred):** Add a header comment above `AGENT_CONTRACT` and a note in the doc: "AGENT_CONTRACT (brief.ts) is the machine-readable compact form sent in every brief; this doc is the human-readable expanded form — any rule change in either must be mirrored in the other."

**Resolution:** accepted — additive divergence is intentional; maintenance risk acknowledged.

---

#### Finding 6 — [info] `revision` increments twice per import: once in `applyResponsePure` step 8, once by the server's POST handler

**Files:** `lib/canvas/brief.ts:315`, `lib/canvas/store.ts:212-213`, `app/api/canvas/route.ts:53`

`applyResponsePure` bumps `session.revision` by 1 (step 8). The store's `applyResponse` then calls `get().save()`, which POSTs the doc to `/api/canvas`. The server's POST handler does `doc.flowcanvas.session.revision += 1` and returns the new value. `save()` assigns it back via direct mutation: `doc.flowcanvas.session.revision = await api.saveCanvas(path, doc)`. Net result: a single import advances revision by 2 (N → N+2) instead of the design's intended 1 (N → N+1). Since revision is an optimistic-concurrency token and in-memory + server values always converge after save, no data consistency issue exists. The double-bump is an inherent consequence of the existing Phase-3 server design (the server always increments on write).

**Suggested fix (deferred):** Remove the revision bump from `applyResponsePure` step 8 and treat the server as the single authority on revision via the `save()` echo. This makes "one durable write = one revision bump" consistent across all paths. Deferred to a future polish pass.

**Resolution:** accepted — no correctness impact in v0.1; deferred.


---

## Check 2026-06-26 21:36 — Phase 6 (connection reliability: handle occlusion + self-loop)

**Reviewer:** main agent (operator-reported defect; root-caused + verified via live CDP, not an agent review)
**Scope:** `components/canvas/nodes/{markdown,image,link,note,fallback}-node.tsx` (handles → fragment siblings), `lib/canvas/store.ts` (self-connection guard in `onConnect`), `lib/canvas/store.test.ts` (self-reject test), `components/canvas/canvas-shell.tsx` (`isValidConnection`, `connectionRadius={34}`), `app/globals.css` (handle rules prefixed `.react-flow ` to win the cascade: 12px dot, `z-index:5`, `::before` grab target, valid-target highlight)
**Gate outcome:** PASS
**Summary:** Operator reported intermittent edge connections and self-referencing. Root cause found by CDP `elementFromPoint` hit-testing on the live board: `<Handle>`s nested inside the `overflow:hidden` `.fc-node` card left the `right`/`bottom` handles occluded by the card (hit returned `.fc-node`, not the handle) — only `top`/`left` could start a connection, so ~half of connection attempts failed. Moving handles to fragment siblings makes all four paint above the card subtree; CDP re-verified `isHandle=true` on all four sides and the enlarged `::before` grab target (`out12=true`). Self-connections are now rejected both declaratively (`isValidConnection`, so the drag line never snaps to the source) and in the store (`onConnect` guard, unit-tested). No findings.

### Stack Gate

| Gate | Outcome | Notes |
|------|---------|-------|
| Typecheck | pass | `npx tsc --noEmit` — exit 0 |
| Lint | pass | `npm run lint` — exit 0 |
| Build | pass | `npm run build` — exit 0 |
| Unit | pass | `npx vitest run` — 44/44 (+1 self-connection-reject test) |
| Dev boot | pass | `GET / 200`; CDP: all four handle sides `isHandle=true`, dot 12px / z-index 5, self-connection rejected (`mockups/captures/phase-6/06d-handles.png`) |

### Review Findings

None — operator-reported defect fixed and empirically verified; no new findings.

---

## Check 2026-06-26 21:00 — Phase 6 (UX fix: inline edge editor + tethered comments)

**Reviewer:** flowcode:code-reviewer-agent
**Scope:** Phase 6 UX-fix pass — `lib/canvas/store.ts` (onConnect mints empty-label edge + opens inline editor, `editingEdgeId` state + `setEditingEdge`), `lib/canvas/store.test.ts` (updated `onConnect` tests, `setEditingEdge` test, `beforeEach` resets `commentMode`/`editingEdgeId`), `components/canvas/edges/labeled-edge.tsx` (new `EdgeLabelEditor`: closed-ref guard, Enter/blur commit, Esc cancel, `nodrag nopan` + `stopPropagation`; static label `onDoubleClick` → `setEditingEdge`), `components/canvas/canvas-shell.tsx` (both `window.prompt` call sites removed, `onConnect` passed straight through, `onEdgeDoubleClick` → `setEditingEdge`, compact 38×38 icon button), `components/canvas/comment-layer.tsx` (new `placePopover`: tethered placement, flip + clamp + beakTop), `components/canvas/comment-thread.tsx` (takes `pos`/`side`/`beakTop`, renders `fc-cpop__beak`), `app/globals.css` (`.fc-modebtn`, `.fc-edge-input`, `.fc-cpop__beak`; old fixed translate offset removed), `.flowcode/project/project-overview.md` (Store/Edge/Comments rows synced)
**Plan:** 001-initial-architecture
**Baseline conformance:** pass — Store row updated with `editingEdgeId`/`setEditingEdge`; Edge component row updated with `EdgeLabelEditor` + prompt-removal note; Comments row updated with tethered-popover description; `lib/canvas/store.ts` is now fully DOM-free (`window` absent from all `lib/canvas/*` modules, resolving the open Phase-5 baseline flag)
**Gate outcome:** PASS
**Summary:** All five reported gates pass (tsc 0 · lint 0 · build ok · vitest 43/43 · dev 200). The `window.prompt` removal is clean and complete — the store is DOM-free, and the two shell call sites are gone with no stubs needed in tests. The `closed` ref guard in `EdgeLabelEditor` correctly prevents double-fire on Enter→blur (saves once) and Esc→blur (Esc cannot accidentally commit). `placePopover` reads `window.innerWidth/Height` during client render only — safe under `ssr:false`. Projection null-check and `draftPlace &&` guard handle off-board anchors. Pointer-event discipline is correct throughout (input `nodrag nopan` + keydown `stopPropagation`, popover `onClick` stopPropagation, layer `pointer-events:none` with pin/popover opt-in). `deleteKeyCode={null}` from the Phase-5 fix ensures no Backspace conflict while typing in the edge input. Three low findings (blur-on-unmount race in rapid back-to-back connects, unclamped horizontal popover left, stale CSS comment) and three info findings — none block sign-off.

### Stack Gate

| Gate | Outcome | Notes |
|------|---------|-------|
| Typecheck | pass | `npx tsc --noEmit` — exit 0 (reported) |
| Lint | pass | `npm run lint` — exit 0 (reported) |
| Build | pass | `npm run build` — exit 0 (reported) |
| Unit | pass | `npx vitest run` — 43/43 (2 updated `onConnect` tests + 1 new `setEditingEdge` test over the prior 42/42 baseline; `beforeEach` resets `editingEdgeId`) |
| Dev boot | pass | `npm run dev` — GET / 200; inline `.fc-edge-input` verified interactive; thread beak tethered; compact 38×38 icon button (reported) |
| Integration | n/a | UX-fix scope |
| Coverage | n/a | UX-fix scope |
| E2E | n/a | UX-fix scope |

### Review Findings

#### Finding 1 — [low] `EdgeLabelEditor.finish()` does not guard `setEditingEdge(null)` against a concurrent `editingEdgeId` change

**Files:** `components/canvas/edges/labeled-edge.tsx:26-27`

`finish()` always calls `setEditingEdge(null)` regardless of the current store value. In the normal single-editor path this is correct. However if a second `onConnect` fires while the first editor is open (e.g., user rapidly connects two edges), `editingEdgeId` advances to the second edge's id. When the first `EdgeLabelEditor` unmounts, the browser fires `blur` on its focused input. `closed.current` is still `false` for the first editor (it was never committed), so `finish(true)` runs: `relabelEdge('e-first', '')` (no-op — saves empty string) then `setEditingEdge(null)` — which overwrites `editingEdgeId` from the second edge's id to `null`, collapsing the second editor before the user can type.

This race requires two rapid `onConnect` drags without any intervening commit. `deleteKeyCode={null}` does not prevent it. The `closed` ref guards the Enter→blur and Esc→blur double-fire correctly for the normal single-path case; the gap is only in the cross-editor cleanup.

**Suggested fix:** Add a store-state check before clearing: `if (useCanvasStore.getState().editingEdgeId === id) setEditingEdge(null)`. Alternatively read `editingEdgeId` from the store inside `finish` via `useCanvasStore.getState()` and short-circuit the clear if it no longer matches.

**Resolution:** Fixed — `finish` now clears the editor only when `useCanvasStore.getState().editingEdgeId === id`, so a detached input's blur can no longer null out a newer editor opened by a rapid second connect.

---

#### Finding 2 — [low] `placePopover` does not clamp the horizontal `left` position

**Files:** `components/canvas/comment-layer.tsx:72-75`

The vertical axis clamps correctly: `top = Math.max(12, Math.min(aimY - 26, vh - 300))`. The horizontal axis does not clamp. For a pin projected near the left viewport edge (`aimX ≈ 0`), `side = 'right'` is chosen (because `0 + 14 + 320 < vw - 12` is true for any reasonable viewport) and `left = aimX + GAP = 14px` — this is fine. But for a pin near the right viewport edge when the popover can still fit on the right (`aimX + 14 + 320 < vw - 12` barely), `left = aimX + GAP` could produce a popover that extends past the right edge. The flip condition handles the main case but the horizontal coordinate after flip is not clamped: if `side = 'left'` and `aimX` is very small, `left = aimX - GAP - W = aimX - 334`, which is negative for any `aimX < 334` — the popover renders off-screen to the left.

In Phase 6 this is unlikely in practice (most pins are placed on visible canvas content), but the gap exists for boards where nodes are near the far-left viewport margin.

**Suggested fix:** After computing `left`, add: `const clampedLeft = Math.max(8, Math.min(left, vw - W - 8))` and use `clampedLeft` in the returned `pos`.

**Resolution:** Fixed — `left` is now clamped to `[8, vw - W - 8]` in `placePopover`, keeping the popover fully on-screen regardless of pin position / side.

---

#### Finding 3 — [low] Stale CSS comment for `.fc-edge-label` block — says "user = neutral outline"

**Files:** `app/globals.css:362-363`

```css
/* edges (Phase 5) — provenance carried by stroke (set inline in labeled-edge) + a glass label.
   links = dashed indigo + lock (auto-derived), user = neutral outline, agent = neon cyan. */
```

Phase-5 QA Finding 4 corrected the `user`-edge stroke from `var(--color-outline)` (neutral gray) to `var(--color-primary)` (electric indigo). The implementation is correct — `labeled-edge.tsx:11` has `user: 'var(--color-primary)'` — but this CSS comment was not updated and still says "user = neutral outline", contradicting both the design spec and the live code.

**Suggested fix:** Update the comment to: `links = dashed muted+lock (auto-derived), user = solid indigo, agent = neon cyan` — matching the design spec and the `STROKE` record in `labeled-edge.tsx`.

**Resolution:** Fixed — `globals.css` comment updated to "links = dashed muted + lock (auto-derived), user = solid indigo, agent = neon cyan".

---

#### Finding 4 — [info] Esc-cancelled freshly-minted edge retains `label: ''` in the store — no `removeEdge` action exists yet

**Files:** `components/canvas/edges/labeled-edge.tsx:42`, `lib/canvas/store.ts:80`

When `onConnect` mints an edge with `label: ''` and the user immediately presses Esc, `finish(false)` is called: `setEditingEdge(null)` clears the editor, but `relabelEdge` is not called (correct) and no edge removal happens. The edge survives in `doc.edges` with `label: ''`. The static-label renderer correctly hides it (`text !== '' && ...`), so no label chip is shown — the edge renders as an unlabeled indigo line, which is a valid canvas state. The user can double-click to re-open the editor and give it a label.

The alternative semantics — "Esc on a brand-new editor = delete the edge" — would require a `removeEdge` store action that does not exist yet. Phase 7 is the planned home for store-level deletion (Phase-5 Finding 1, deferred). If that action is added, `EdgeLabelEditor` could receive an `isNew` prop and call `removeEdge(id)` on Esc rather than just clearing the editor.

**Suggested fix (deferred):** No action for Phase 6. When Phase 7 adds `removeEdge`, add an `isNew?: boolean` prop to `EdgeLabelEditor` and call `removeEdge(id)` on `finish(false)` when `isNew` is true.

**Resolution:** accepted as Phase 6 state — deferred to Phase 7 `removeEdge` implementation.

---

#### Finding 5 — [info] CSS-triangle beak has no border — a 1 px seam is visible at the popover–beak junction

**Files:** `app/globals.css:568-577`

`.fc-cpop` carries `border: 1px solid var(--color-outline-variant)`. The beak (`.fc-cpop__beak`) is a CSS border-trick triangle: `border-right: 7px solid rgba(13, 21, 40, 0.92)` (the popover fill color). CSS triangles cannot reproduce the container's 1 px border, so a hairline gap of `var(--color-outline-variant)` is visible between the beak tip and the popover edge. This is a well-known CSS-triangle limitation; the popover is otherwise correctly tethered and the beak direction flips as intended.

**Suggested fix (deferred):** Replace with a dual-pseudo-element technique (one triangle for the border color, one slightly smaller for the fill) or an SVG icon. Deferred to Phase 7 visual-polish scope.

**Resolution:** accepted — deferred to Phase 7.

---

#### Finding 6 — [info] `placePopover` `vh - 300` bottom clamp assumes a max popover height of 300 px

**Files:** `components/canvas/comment-layer.tsx:74`

`top = Math.max(12, Math.min(aimY - 26, vh - 300))` clamps the popover so its top is at most `vh - 300` from the top of the viewport, implicitly assuming the popover body is ≤ 300 px tall. `.fc-cpop` has no `max-height` in CSS. Phase 7 will add more replies per thread; a thread with 8+ messages can easily exceed 300 px, causing the clamped top to push the bottom of the popover below the viewport fold.

**Suggested fix (deferred):** Add `max-height: 360px; overflow-y: auto` to `.fc-cpop__b` in `globals.css` and update the clamp constant to match. Alternatively, measure the rendered popover height via a ref and use it in the clamp formula. Deferred to Phase 7 when long threads are expected.

**Resolution:** accepted — deferred to Phase 7.


## Check 2026-06-26 20:15 — Phase 6 (Comments Layer)

**Reviewer:** flowcode:code-reviewer-agent
**Scope:** Phase 6 — `lib/canvas/comments.ts` (new), `lib/canvas/comments.test.ts` (new), `lib/canvas/store.ts` (modified: `commentMode`, `setCommentMode`, `addComment`, `replyComment`, `resolveComment`), `lib/canvas/store.test.ts` (modified: store/comments describe block), `components/canvas/comment-layer.tsx` (new), `components/canvas/comment-thread.tsx` (new), `components/canvas/canvas-shell.tsx` (modified: `<CommentLayer/>` mount + mode toggle), `app/globals.css` (modified: pin/popover/row/reply/resolve/mode-toggle styles + Tailwind `@source` fix)
**Plan:** 001-initial-architecture
**Baseline conformance:** flagged (2) — `lib/canvas/comments.ts` module absent from `project-overview.md` module table; Store module row missing `commentMode` / `setCommentMode`
**Gate outcome:** PASS
**Summary:** All five reported gates pass (tsc 0 · lint 0 · build ok · vitest 41/41 · dev 200). The two quality-gate focal areas — anchor math and thread integrity — are sound: `anchorForPoint` reads `n.measured?.width ?? n.width ?? 0` for auto-height markdown nodes, `anchorToFlowPoint` propagates the same measured geometry through `geomById`, and the zero-size guard prevents unmeasured nodes swallowing clicks. All three store comment actions are fully immutable (correct override of the plan snippet's in-place `push`), `resolveComment` guards the root-only contract via `c.parentId === null`, badge assignment is sequential across existing roots, and reply anchor copy is unit-tested. Pointer-events discipline is correct: the layer is click-through by default; `[data-mode]` CSS enables capture only in comment mode; pins and the popover carry their own `pointer-events: auto` with `e.stopPropagation()` preventing placement bleed-through. The render-phase reset for clearing the draft on mode-off is the React-sanctioned pattern; the Esc effect has correct dependencies and cleanup. No critical, high, or medium blockers — three low and three info findings, all advisory.

### Stack Gate

| Gate | Outcome | Notes |
|------|---------|-------|
| Typecheck | pass | `npx tsc --noEmit` — exit 0 (reported) |
| Lint | pass | `npm run lint` — exit 0 (reported) |
| Build | pass | `npm run build` — exit 0 (reported) |
| Unit | pass | `npx vitest run` — 42/42 (9 new anchor-math + 7 new store/comments — incl. the resolve no-op test added during finding resolution — + prior 26) |
| Dev boot | pass | `npm run dev` — GET / 200 (reported) |
| Integration | n/a | Phase 6 scope |
| Coverage | n/a | Phase 6 scope |
| E2E | n/a | Phase 6 scope |

### Visual Parity

**Outcome:** pass — no regressions. Captured + interactive-CDP-driven on the live default board (`mockups/captures/phase-6/06-{loaded,comment-mode,draft-composer,thread-open,resolved,two-pins}.png`), classified against `04-nyx-neon.html`. Teardrop `fc-pin` (rose gradient `rgb(255,81,106)`, `border-radius 999px…/2px`, badge), resolved pin dims (`data-resolved`), glass thread popover with avatar rows + reply input + indigo Send + lime ✓ Resolve, comment-mode cyan toggle (`aria-pressed=true`) + hint pill — all match the mockup. Node-anchored (badge 1) and canvas-anchored (badge 2) projection both verified. Full drift table: `001-initial-architecture-ui-design.md § Visual Parity` Phase-6 row. No `≥ medium` visual regression.

### Review Findings

#### Finding 1 — [low] `resolveComment` unconditionally sets `dirty: true` on no-op cases

**Files:** `lib/canvas/store.ts:131-138`

`resolveComment` maps over `doc.flowcanvas.comments` and stamps `resolvedAt` only when `c.id === rootId && c.parentId === null`. If `rootId` matches a reply (`parentId !== null`) or matches no comment, the `map` returns a new array with identical member references and no data change. The function still calls `set({ doc: { ...doc, flowcanvas: { ...doc.flowcanvas, comments } }, dirty: true })` unconditionally, producing a spurious `dirty: true` state and a redundant store update. The inline comment at line 130 calls the behavior "idempotent on an already-resolved or unknown root" — which is accurate for the resolved-state outcome but not for the dirty flag. Neither the "reply id" nor the "unknown id" path arises from the wired `onResolve` handler (which is only called from `CommentThread` with a confirmed root id), so there is no practical impact in Phase 6. If Phase 7 adds a save-on-dirty side-effect, the spurious flag could trigger an unnecessary network write.

**Suggested fix:** Guard the `set` call: `const changed = comments.some((c, i) => c !== doc.flowcanvas.comments[i]); if (changed) set({ doc: { ...doc, flowcanvas: { ...doc.flowcanvas, comments } }, dirty: true })`.

**Resolution:** Fixed — `resolveComment` now looks up the root-only target up front and early-returns (no `set`, stays clean) for an unknown id, a reply id, or an already-resolved root; only a real state change sets `dirty`. This also makes double-resolve a true no-op (no re-stamp), matching the inline comment. Verified by a new test (`store.test.ts § resolve is a no-op …`).

---

#### Finding 2 — [low] `lib/canvas/comments.ts` is absent from the `project-overview.md` module table

**Files:** `.flowcode/project/project-overview.md:60-74`

Phase 6 creates `lib/canvas/comments.ts` — a new pure `lib/canvas/` module exposing `anchorForPoint` and `anchorToFlowPoint`. The `project-overview.md` module table has no row for it. The existing Comments row (`project-overview.md:69`) lists only `components/canvas/comment-{layer,thread}.tsx`. The project-overview conventions require the table to reflect every active module; `comments.ts` is the sixth `lib/canvas/` module and belongs alongside `jsoncanvas.ts`, `adapter.ts`, `edges.ts`, `frontmatter.ts`, and `store.ts`. Its absence makes the module count ("14 subsystems") stale and hides the pure-math/component split for this subsystem.

**Suggested fix:** Add a row to the module table:

```
| Comments math | `lib/canvas/comments.ts` | `anchorForPoint` (flow-point hit-test → node/canvas anchor using measured geometry, zero-size guard, back-to-front topmost); `anchorToFlowPoint` (project anchor back to flow point; null when node left the board) | TypeScript | — pending (generated at phase close) |
```

Also update the existing Comments row description to note that projection math is delegated to `lib/canvas/comments.ts`.

**Resolution:** Fixed — added a "Comment anchors" row for `lib/canvas/comments.ts` to the module table, and updated the Comments component row to note projection runs over live measured geometry with the anchor math delegated to `comments.ts`.

---

#### Finding 3 — [low] `project-overview.md` Store module row missing `commentMode` and `setCommentMode`

**Files:** `.flowcode/project/project-overview.md:65`

The Store module row was pre-seeded with `addComment`, `replyComment`, `resolveComment` from the design, but does not list `commentMode` (the transient UI-only placement-mode boolean) or `setCommentMode`, both added to the `CanvasState` interface in Phase 6 (`store.ts:14,22`). The store interface now has 13 members; the project-overview description reflects 11. `commentMode` is called out in the design as "UI-only, never persisted" — a fact worth capturing in the overview for Phase 7 when the full toolbar takes over mode management.

**Suggested fix:** Append to the Store module row description: `, commentMode` (transient UI placement-mode flag — never persisted), `setCommentMode`.

**Resolution:** Fixed — Store module row now lists `commentMode`/`setCommentMode` (noted as transient UI placement-mode, immutable comment thread ops).

---

#### Finding 4 — [info] `CommentThread` `memo` is ineffective for the `screen` prop

**Files:** `components/canvas/comment-thread.tsx:100`, `components/canvas/comment-layer.tsx:55-61`

`CommentThread = memo(Inner)`. The `screen` prop is typed `{ x: number; y: number }`. The `project` callback in `comment-layer.tsx:55-61` calls `flowToScreenPosition(p)`, which returns a new object reference on every call. `React.memo` uses shallow equality: a new `{ x, y }` object — even with numerically identical values — always fails the check, causing `Inner` to re-render on every viewport change regardless of whether the pin moved. The `memo` wrapper is a no-op for this prop. Phase 6 renders at most one thread at a time, so the cost is negligible; this becomes relevant if Phase 7 introduces multiple simultaneous open threads.

**Suggested fix (deferred):** Add a custom `areEqual` comparator to `memo`: `memo(Inner, (p, n) => p.screen.x === n.screen.x && p.screen.y === n.screen.y && p.root?.id === n.root?.id && p.replies.length === n.replies.length)`. Or memoize the projected screen point in the layer before passing it.

**Resolution:** accepted — deferred to Phase 7 if multiple simultaneous threads are introduced.

---

#### Finding 5 — [info] `resolveComment` edge-case test coverage gap

**Files:** `lib/canvas/store.test.ts`

The store/comments describe block tests the happy path for `resolveComment` (line 99–104: stamps `resolvedAt` with an ISO timestamp on the root). Missing scenarios:

1. Calling `resolveComment` with a reply's id — the guard `c.parentId === null` should keep the reply unstamped; the test suite does not assert this, so a regression removing that guard would pass all existing tests.
2. Calling `resolveComment` twice on the same root — the second call updates `resolvedAt` to a new timestamp (not strictly idempotent); whether that is correct behaviour is untested and the inline comment is misleading.

**Suggested fix:** Add two tests: (a) add a reply, call `resolveComment(replyId)`, assert `reply.resolvedAt` is undefined; (b) call `resolveComment(rootId)` twice, assert `root.resolvedAt` is set after both calls (idempotent state, non-idempotent timestamp is acceptable).

**Resolution:** Fixed — added a test that resolves a reply id, an unknown id, and an already-resolved root, asserting `dirty` stays `false` and the root's `resolvedAt` is unchanged after all three (true no-op timestamp). Paired with the Finding 1 fix that makes double-resolve a genuine no-op.

---

#### Finding 6 — [info] Plan snippet for comment store actions uses in-place `push` mutation; implementation correctly deviates

**Files:** `.flowcode/plans/001-initial-architecture/001-initial-architecture-plan.md:922-935`

The Phase 6 plan snippet for `addComment` calls `doc.flowcanvas.comments.push(c); set({ doc: { ...doc }, dirty: true })` — in-place mutation of the `comments` array, the same pattern that Phase 4's `store.load()` refactor eliminated (Phase 3 Finding 8, Phase 4 deviation). The actual implementation (`store.ts:109-113`, `125-128`) correctly uses `[...doc.flowcanvas.comments, c]` and spreads the entire `flowcanvas` object, consistent with the Phase 4+ immutable-store convention. The unit test at `store.test.ts:106-111` explicitly verifies this invariant. The plan snippet is misleading for future Phase 7 authors implementing comment additions in `applyResponse`.

**Suggested fix:** Update the Phase 6 plan snippet to match the immutable spread pattern. Add a `<!-- Phase-6 reality: … -->` comment noting the deviation from the snippet (same annotation style as Phase 2 and 5).

**Resolution:** Fixed — the Phase 6 plan snippet was rewritten to the shipped immutable implementation (spread appends, `crypto.randomUUID` id helper in place of the `uuid` import, `addComment` returns the new id, and the no-op `resolveComment` guard), so Phase 7's `applyResponse` author inherits the correct pattern.

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

---
name: ui-workflow
description: The end-to-end UI design lifecycle for every frontend-touching plan — parallel mockups, implementation, phase-close visual parity, and canonical capture.
status: active
tags: [ui, workflow, mockups, visual-parity, design]
links: [.flowcode/ui/ui-index.md, .flowcode/ui/ui-mockup-discipline.md, .flowcode/ui/ui-design-system.md, .flowcode/plans/plan-instructions.md]
---

# UI Design Workflow

- Lifecycle for every UI-touching plan; load before starting design work on any plan whose scope includes frontend files.
- Design phase dispatches the `flowcode:ui-mockups` composer skill three times in parallel to produce iteration mockups, grounded in `ui-design-system.md`; the user selects one.
- The selected mockup is the implementation spec — `data-testid` attributes and design tokens carry through to code.
- Phase close runs a visual-parity check at every declared breakpoint, classifying drift as Expected / Acceptable / Regression.
- No `[medium]`+ visual-parity regression may remain before a phase flips to `done`.
- Plan close promotes the final captures to the canonical record alongside the mockup HTML.

---

## Precondition

- Plan scope includes at least one frontend file.
- `ui-index.md` loaded.
- `ui-design-system.md` exists and is loaded — the mandatory ground truth for every mockup. If it is missing or still the verbatim shipped starter on a real project, harvest/generate it first (`flowcode:bootstrap-agent § Step 6.5`) before any mockup.
- `flowcode:ui-mockups` composer skill available (the engine for mockup generation; it composes the vendored taste lenses and optional live engines).
- `flowcode:browser` available for viewport capture — it resolves a driver via its ladder (still *preferring* a wired `claude-in-chrome` MCP, falling through to project / ephemeral Playwright), so no browser MCP needs hand-wiring and the capture runs unattended. See `ui-mockup-discipline.md § MCP Preferences`.

---

## 1. Design Phase — Parallel Mockup Iterations

1. Read `ui-design-template.md` to prime the artifact shape, and `ui-design-system.md` for the token + component ground truth. Do not write the artifact yet.
2. **Dispatch the `flowcode:ui-mockups` composer skill three times in parallel** to generate three distinct mockup iterations under `.flowcode/plans/{PREFIX}/mockups/`. Each dispatch grounds in `ui-design-system.md` + `ui/references/`, selects the taste lens(es) the brief implies, and composes optional live engines. Iteration files use the parallel-iteration naming: `01-{slug}.html`, `02-{slug}.html`, `03-{slug}.html` (see `ui-mockup-discipline.md`).
3. Each iteration must cover every state declared in the Screens & States section of the upcoming `{PREFIX}-ui-design.md` (empty, loading, success, error, edge cases) across every responsive breakpoint the proposal will declare, and pass the composer's self-check against the design system's §13 checklist before it is shown.
4. User reviews the three iterations and selects one.
5. Designer (or main agent) writes `{PREFIX}-ui-design.md` using `ui-design-template.md`. The selected mockup path goes into the Screens & States section; the rejected iterations stay in the folder as history.
6. Flip the design's top-level `Status:` to `approved` once the user signs off.

If three-way parallel is impractical for the scope (e.g. a single-component tweak), produce one iteration and note the reduced exploration in the design's Open Questions. Do not skip silently.

---

## 2. Implementation Phase

- The selected mockup is the spec. Deviation requires deliberation captured either in `{PREFIX}-ui-design.md` (if lasting) or the current phase's entry in `{PREFIX}-log.md` (if one-off).
- Inline `data-testid="..."` attributes from the mockup MUST survive into the implementation. Hook-based tests rely on them.
- Design tokens (colors, spacing, typography) come from `ui-design-system.md` and the project's token file. If a token is missing, add it to the design system + token file first with rationale before using its literal value in code.

---

## 3. Phase Close — Visual Parity Check

After the implementation phase finishes its work but before flipping `Phase Status` to `done`:

1. Capture the built UI at every viewport size declared in `{PREFIX}-ui-design.md § Responsive Breakpoints` by dispatching `flowcode:browser capture` — it resolves the driver via its ladder (still prefers a wired MCP), writes the PNGs, and on a missing driver emits a tracked `[deferred]` finding rather than skipping.
2. Save captures under `.flowcode/plans/{PREFIX}/mockups/captures/{phase-N}/{viewport}-{screen}-{state}.png` (or `.html` for DOM snapshots).
3. Compare each capture against the corresponding selected mockup. Classify every drift point into one of three buckets:

| Bucket | Definition | Recording |
|--------|------------|-----------|
| **Expected** | Placeholder data in the mockup replaced by real data at runtime. Text length differs, image URLs differ, counts differ. | One-line note in `{PREFIX}-log.md` phase entry's `Deviations` field |
| **Acceptable** | Minor visual deviation that the team has explicitly decided to accept (e.g. spacing tweak, color shift after review). | `#### Finding N — [low] Visual parity: {what differs}` in `{PREFIX}-qa-report.md` with `**Resolution:** accepted — {rationale}` |
| **Regression** | Unintended drift from the approved mockup. | `#### Finding N — [medium] Visual parity regression: {what differs}` in `{PREFIX}-qa-report.md`. MUST be fixed before `Phase Status` flips to `done` |

4. No regressions → phase closes normally.
5. Any regression → loop: fix → recapture → reclassify. Continue until no `[medium]` or higher visual-parity finding is unresolved.

---

## 4. Plan Close — Canonical Capture

At plan completion, the final captures replace or supplement the iteration mockups as the canonical record of what shipped:

- Rename the chosen iteration's captures from `mockups/captures/{phase-N}/...` to `mockups/{screen}-{state}.png` (flat, alongside the original mockup HTML).
- Leave the HTML iteration files in place — they document the exploration that led here, and deleting them would erase history.
- No separate `project/ui-current/` directory is created. The mockups folder is the long-term baseline.

---

## Required MCPs / Skills

| Purpose | Preferred | Fallback |
|---------|-----------|----------|
| Mockup generation | `flowcode:ui-mockups` composer skill (grounded in `ui-design-system.md`) | Hand-authored HTML per `ui-mockup-discipline.md` + `house-style.css` |
| Taste / craft | Vendored lenses in the composer's `references/taste/` (always) + live `frontend-design` / `ui-ux-pro-max` / `impeccable` when installed | Design system §0 rules + `house-style.css` |
| Viewport captures | `flowcode:browser capture` (resolves the driver via its ladder — prefers a wired `claude-in-chrome` MCP) | Ladder fall-through: project Playwright → ephemeral headless Playwright → tracked `[deferred]` finding (never a silent skip) |
| Design-token sync (Figma-backed) | Figma MCP | Manual token table in `ui-design-system.md` |

---

## Cross-References

- `ui-mockup-discipline.md` — conventions applied by every step above.
- `templates/ui-design-template.md` — fills in the artifact per this lifecycle.
- `plans/plan-instructions.md § UI Design Gate` — gating rule that requires this workflow.

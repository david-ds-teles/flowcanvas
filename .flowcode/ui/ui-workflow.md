---
name: ui-workflow
description: The end-to-end UI design lifecycle for every frontend-touching plan — source-grounded mockups (anchor + two distinct explorations), implementation, phase-close visual parity, and canonical capture.
status: active
tags: [ui, workflow, mockups, visual-parity, design]
links: [.flowcode/ui/ui-index.md, .flowcode/ui/ui-mockup-discipline.md, .flowcode/ui/ui-design-system.md, .flowcode/plans/plan-instructions.md]
---

# UI Design Workflow

- Lifecycle for every UI-touching plan; load before starting design work on any plan whose scope includes frontend files.
- Design phase grounds in the truth — snapshot the running UI when the design is implemented, else the plan's UI/UX definitions — then produces **one fidelity anchor + two distinct explorations**; the user selects one.
- A **distinctness rule** (no two near-duplicates) and a **completeness invariant** (every defined element in all three) bind the set; each version ships as a render-verified state-switcher.
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
- `flowcode:browser` available for capture — it resolves a driver via its ladder (still *preferring* a wired `claude-in-chrome` MCP, falling through to project / ephemeral Playwright), so no browser MCP needs hand-wiring and the capture runs unattended. It is used both to snapshot the running UI as the anchor's ground truth (when the design is implemented — see § 1) and to render-verify finished mockups. See `ui-mockup-discipline.md § MCP Preferences` and `§ Fidelity`.

---

## 1. Design Phase — Source-Grounded Mockups

1. Read `ui-design-template.md` to prime the artifact shape, and `ui-design-system.md` for the token + component ground truth. Do not write the artifact yet.

2. **Find the ground truth — branch on whether the design is implemented in source.** One question decides where every mockup is grounded:

   | Case | Signal | Ground truth |
   |------|--------|--------------|
   | **Implemented** | Design-system tokens + components exist in code and the UI runs | The **source code + the running UI** |
   | **Not implemented** | The plan defines the UI/UX (directions, elements, layout) but no built UI exists | The plan's **UI/UX definition files** (`{PREFIX}-ui-design.md`, the `{PREFIX}-design.md` UI sections, `ui-design-system.md`) |

   **Implemented → snapshot first.** Capture the running UI with whatever browser/snapshot tool is wired — `flowcode:browser capture` is the default; a wired `claude-in-chrome` / browsertools MCP is equally valid. **If no snapshot tool is available, ask the user which to use — never fall back to inventing abstract HTML.** Capture is the **main session's** job; when a running UI exists the main session drives generation against the capture (the source-grounded `§ Fidelity` discipline), not a blind 3× composer dispatch.

3. **Always produce exactly three: one fidelity anchor + two distinct explorations** under `.flowcode/plans/{PREFIX}/mockups/` (`01/02/03-{slug}.html`). The roles are fixed and graduate by *departure distance from the anchor*, never free choice:

   | Role | Bound |
   |------|-------|
   | **1 — Anchor** | Canonical fidelity (mandatory). Pixel-perfect to the implemented UI (running build + all plan changes), or — if not yet built — a complete reference of the defined design system: every defined element, every token/pattern/component shape, **zero invention**. The "does it match / is it real" validation lane. |
   | **2 — On-system exploration** | A genuinely different composition / information-architecture within the *same* tokens + component shapes. **Visibly distinct from the anchor** — not a recolor. |
   | **3 — Bold direction** | A distinct art direction / aggressive UX rethink; may reorder components / menus. The **core, essence, and every defined element remain** — a relevant-discovery lane, never a different product. |

   Each grounds in `ui-design-system.md` + `ui/references/`, selects the taste lens(es) the brief implies, and composes optional live engines (the lenses shape #2 / #3's composition over the grounded render).

4. **Two guards bind the set; each version ships as a state-switcher:**
   - **Distinctness rule** — no two of the three may be recolors or near-duplicates; the composer's Step-5 self-check fails a set where any two read as the same composition.
   - **Completeness invariant** — every UI/UX element the design defines (toolbar, bottom chat widget, every menu) appears in **all three** mockups; they differ in fidelity / exploration degree, never in *which* elements exist, so each is independently validatable.
   - Each version is **one state-switcher mockup** reaching every declared state (`ui-mockup-discipline.md § State-Switcher Output Form`), render-verified before it is shown, and passing the composer's self-check against the §13 / `quality-checklist.md` Fidelity gate.

5. User reviews the three and selects one.
6. Designer (or main agent) writes `{PREFIX}-ui-design.md` using `ui-design-template.md`. The selected mockup path goes into the Screens & States section; the rejected explorations stay in the folder as history.
7. Flip the design's top-level `Status:` to `approved` once the user signs off.

If exploration must be reduced for the scope (e.g. a single-component tweak), produce the anchor alone and note the reduced exploration in the design's Open Questions. Do not skip silently.

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

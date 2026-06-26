---
name: upstream-contributions
description: Accumulator of UC-NNN framework-improvement proposals discovered during host-project use — the export payload for the flowcode maintainer.
status: active
tags: [upstream, contributions, uc, export, maintainer]
links: [.flowcode/templates/upstream-contribution-template.md]
---

# Upstream Contributions

- Accumulator for framework-level improvements found during host-project use; **this file IS the export payload** a flowcode maintainer reads when syncing changes back to the source repo.
- Appended only by `/flowcode:extend` (and `/flowcode:feedback`) when a statement is classified upstream (framework-level), not a host customization.
- IDs (`UC-NNN`) are never reused — an id retires with its entry even if rejected.
- Context must cite the framework artifact(s) with `file:line` refs (mandatory for every category except `Docs` / `Other`).
- One entry per observation — don't merge multiple observations into one row.
- Capture flow: `/flowcode:extend` § Step 2b; row shape: `.flowcode/templates/upstream-contribution-template.md`.

---

## Entries

| ID | Date | Category | Summary | Context |
|----|------|----------|---------|---------|
| UC-001 | 2026-06-26 | Workflow | Greenfield design-system lock-in starves the 3-way mockup exploration | `ui/ui-workflow.md:30-39` + greenfield-from-spec `ui-design-system.md`; with the brand pre-locked the 3 iterations collapse to near-duplicates (live: operator rejected them as "basically all the same… waste of resource") — see UC-001 details |
| UC-002 | 2026-06-26 | Rule-Gap | Mockup content-fidelity: render markdown (no raw `##`/`*`) and use real project data, not fabricated | `ui/ui-mockup-discipline.md:58-66` (HTML Contents) + `ui-design-system.md §13`; both surfaced as live operator corrections ("not rendering markdown, showing its tag"; "use … already what we have, not fake data") |
| UC-003 | 2026-06-26 | Workflow | `flowcode:ui-mockups` unreliable generating large single-file mockups — prefer an interactive state-switcher over N duplicated full-board frames | `ui/ui-workflow.md:33` (3× parallel dispatch) + `flowcode:ui-mockups` Step 4 (Generate 3 iterations); two sub-agent runs stalled / connection-dropped on a ~1000-line self-contained HTML |

---

## Extended Details

Overflow detail for any Context that exceeds ~3 sentences. One `## UC-{NNN} — {Summary}` subsection per referenced entry.

## UC-001 — Greenfield design-system lock-in starves the 3-way mockup exploration

On a greenfield / from-spec project, `ui-design-system.md` is authored from the design doc **before any UI exists**, then `ui-workflow.md §1` requires all three parallel mockups to conform to it (§0 locks palette, shell, fonts). With the brand pre-locked, the only remaining freedom is minor composition, so the three iterations collapse into near-duplicates — observed live (operator: *"basically all the same, no variations, no colors, no style… a complete waste of resource"*). The session only produced genuine variation once the operator forced divergent directions (light-editorial / vibrant / dark) and then a `DESIGN.md`-driven direction (nyx), explored **outside** the locked system.

**Proposal:** branch `ui-workflow.md §1` on design-system provenance. When `ui-design-system.md` is greenfield-from-spec (no live app, no harvested brand), run a **divergent exploration first** — 3 genuinely different visual languages (palette / register / components), operator selects one — and only **then** harvest/lock `ui-design-system.md` from the chosen direction. Reserve lock-then-explore for projects with an established system. Optionally mark a greenfield system as *provisional* in its §0 until the first exploration confirms it.

---

## Legend

- **Category:** `Bug` · `Workflow` · `Template-Gap` · `Rule-Gap` · `Docs` · `Other`

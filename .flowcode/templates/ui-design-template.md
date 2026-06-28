---
name: {PREFIX}-ui-design
description: UI design artifact for {Feature Name} — screens, states, breakpoints, interaction contract, and mockup references for plan {PREFIX}.
status: draft
tags: [ui-design, frontend, mockups, screens]
links: [.flowcode/plans/{PREFIX}/{PREFIX}-plan.md, .flowcode/ui/ui-workflow.md, .flowcode/ui/ui-mockup-discipline.md]
---

# {PREFIX} — {Feature Name} UI Design

- {One-line digest: what the UI delivers and the key screens.}
- Screens & states: {list}; responsive breakpoints: {list}.
- Status {draft|approved}; author {agent | human}; dated {DATE}.
- Gate: generated before any implementation phase — precondition for any frontend-touching plan.
- Required reading before authoring: `ui-index.md` → `ui-workflow.md` → `ui-mockup-discipline.md`.
- Sibling plan: `{PREFIX}-plan.md`.

---

## Context

{What the user sees today vs what will change. 1–2 paragraphs. Include link or reference to the current screen/flow if applicable.}

## Screens & States

### Screen 1: {Name}

**Purpose:** {one sentence}

**States covered:** empty · loading · success · error · edge case {X}

**Mockup assets:**
- `.flowcode/plans/{PREFIX}/mockups/{component}-empty.html`
- `.flowcode/plans/{PREFIX}/mockups/{component}-loading.html`
- `.flowcode/plans/{PREFIX}/mockups/{component}-error.html`

**Selected iteration:** `01-{slug}.html` | `02-{slug}.html` | `03-{slug}.html` — {1-line rationale for the choice}

**Key elements:**
- {element} — {behavior}
- {element} — {behavior}

### Screen 2: {Name}

{Repeat as needed.}

---

## Responsive Breakpoints

Declare every viewport this design supports. A mockup must exist per breakpoint (or one provably-fluid mockup must cover the full set). See `ui-mockup-discipline.md § Responsive Breakpoints`.

| Name | Width | Mockup File |
|------|-------|-------------|
| mobile-small | 320px | `mockups/{component}-mobile-320.html` |
| mobile | 420px | `mockups/{component}-mobile-420.html` |
| tablet | 768px | `mockups/{component}-tablet.html` |
| desktop | 1280px | `mockups/{component}-desktop.html` |

---

## Interaction Contract

**User flows:**

1. {Flow name} — {trigger} → {steps} → {outcome}
2. {Flow name} — …

**Keyboard / accessibility:**
- {expectation}

**Validation & error surfaces:**
- {when} → {what the user sees}

---

## Design System / Component Reuse

| Need | Existing component | Status |
|------|-------------------|--------|
| | | reuse / extend / new |

---

## Design Tokens Introduced

Tokens added to the project's token file for this plan. See `ui-mockup-discipline.md § Design Tokens`.

| Token | Value | Rationale |
|-------|-------|-----------|
| | | |

---

## Visual Parity

Required for every UI-touching plan. Populated during the phase-close visual-parity check — see `ui-workflow.md § Phase Close`.

**Capture location:** `.flowcode/plans/{PREFIX}/mockups/captures/phase-{N}/`

**Bucketing after each phase:**

| Phase | Expected drift (placeholder → real data) | Acceptable drift (explicit accept) | Regressions (must fix before phase-done) |
|-------|-------------------------------------------|-------------------------------------|-------------------------------------------|
| Phase 1 | | | |
| Phase 2 | | | |

Regressions link to their finding-as-section entry in `{PREFIX}-qa-report.md`.

---

## Open Questions

- [ ] {question that must be resolved before implementation}

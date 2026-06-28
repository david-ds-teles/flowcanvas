---
name: 003-canvas-foundation-ui-design
description: UI design artifact for Canvas Foundation & Visual Integrity — three style variants, each a faithful render of the real running studio + the real board with ALL plan-003 changes applied (universal resize, on-edge action bar, on-card comment badge, killed faded rings, recalibrated violet, redesigned reader).
status: draft
tags: [ui-design, frontend, mockups, screens, canvas, nyx]
links: [.flowcode/plans/003-canvas-foundation/003-canvas-foundation-plan.md, .flowcode/ui/ui-workflow.md, .flowcode/ui/ui-mockup-discipline.md]
---

# 003 — Canvas Foundation & Visual Integrity UI Design

- Three mockups, each a faithful SNAPSHOT of the real running studio (reusing the verbatim nyx `@theme` tokens + `app/styles/*` component CSS + the real Commerce-Platform board) with ALL plan-003 changes applied at once — not abstract sketches.
- The iteration axis is **visual style/design** (operator request), held against a constant interaction layer: every variant renders the same universal resize handles, on-edge action bar, on-card comment badge, flattened SOURCE row, and redesigned reader.
- Each mockup carries a MOCKUP-CONTROLS bar that steps through every interaction state: Overview · ① Resize · ② Edge tools · ③ Comments · ④ Violet (recalibration) · ⑤ Reader.
- Ground truth captured first: `mockups/captures/*.png` are real headless-Chrome screenshots of the current studio (the "before"), the fidelity reference the mocks were built against.
- Status draft; author agent (built in the main session from the real CSS + a captured screenshot, per `ui-mockup-discipline.md`); dated 2026-06-28.
- Gate: generated before any implementation phase — precondition for this frontend-touching plan.
- Sibling plan: `003-canvas-foundation-plan.md`.

---

## Context

Today the canvas hides its capabilities behind invisible affordances and ships always-on faded rings that read as accidental UI. Edge edit/delete is buried in a label-pill popover; comments leave no mark on the widget they annotate (only a floating pin); the `.fc-edge-input` / `.fc-note__edit` / `.fc-insp__src` inline editors carry permanent faded indigo/violet boxes; and the reader's `<FrontmatterView variant="reader">` dominates the column while the prose reads UI-ish. These mockups show the on-canvas surfaces that make the existing primitives visible (per `003-canvas-foundation-design.md` Decisions 1–4) plus a deliberate focus-only visual treatment, recalibrated `--color-secondary`, and a compact reader — rendered three ways so the operator can choose the design language.

## The constant interaction layer (identical in all three variants)

- **Universal resize** — the selected card (Auth Service) shows the 8-handle `NodeResizer` chrome + a live size chip; persists via `setNodeSize`. (`② Resize` state emphasises it.)
- **On-edge action bar** — selecting the `produces · order.created` edge floats a labeled bar `rel ▾ · Label · Delete` at the midpoint, reusing `setEdgeRel` / `relabelEdge` / `removeEdgeWriteback`; the rel grid opens from `rel ▾`. (`② Edge tools`.) Chosen over the buried popover and the icon-only mini-rail because a foundation affordance's whole purpose is to stop being hidden — labels beat icons.
- **On-card comment badge** — Order Service carries a rose `💬 1` badge anchored to the card corner (replaces the disconnected floating pin); a tethered thread popover shows the node's human name, and the inspector gains a "Comments on this node" list. (`③ Comments`.)
- **Killed faded rings** — the inspector SOURCE row is a flat hairline row (was the `.fc-insp__src` violet box); inline editors are focus-only.
- **Recalibrated violet** — `--color-secondary #ddb7ff → #e4c6ff` with role reduction (prose `em`/headings step down to `--secondary-deep`). (`④ Violet` shows the before/after swatches.)
- **Redesigned reader** — a single compact, collapsible frontmatter strip (`status · tags · frontmatter ▾`) over calmer, more readable prose. (`⑤ Reader`.)

## Screens & States

### Screen 1: Canvas — interaction affordances (Overview + ②/③ states)

**Purpose:** show universal resize, the on-edge action bar, and the on-card comment badge composed over the real board.

**States covered:** loaded (Overview) · resize · edge-tools · comments

**Mockup assets (each renders the full studio in its style):**
- `mockups/01-nyx-refined.html` — current glass-neon language, fixed
- `mockups/02-blueprint.html` — technical-schematic re-skin
- `mockups/03-editorial-calm.html` — warm-graphite, content-forward re-skin

### Screen 2: Reader — compact frontmatter + readable prose (⑤ state)

**Purpose:** the reader after the frontmatter is made compact/collapsible and the prose type is tuned (em/headings role-reduced off `--color-secondary`).

**States covered:** collapsed-frontmatter (default) · prose · size segmented control

**Mockup assets:** same three files (`⑤ Reader` state).

---

## Iteration comparison (for operator selection — pick a STYLE direction)

| Variant | Design language | Best for |
|---------|-----------------|----------|
| `01` nyx-refined | Current glass-neon, fixed — recalibrated violet, killed faded boxes, redesigned reader | Shipping the fixes with zero identity change; lowest risk |
| `02` blueprint | Flat slate panels on a hairline engineering grid, sharp 4px geometry, mono titles, amber status, crisp cyan selection | Leaning into "system-design tool" identity; precision/CAD feel |
| `03` editorial-calm | Warm graphite ground, soft surfaces, muted teal/mauve accents, no neon, larger reading type | Directly answering "boring / hard to read"; calm-premium |

**Selected variant:** `01` nyx-refined — operator-selected 2026-06-28. Ships the foundation fixes in the current glass-neon language with no identity churn (recalibrated violet, killed faded boxes, brighter description/tag contrast, fully-enclosing group fences, redesigned reader). The interaction layer (resize · edge bar · comment badge · reader) is implemented as shown; `02`/`03` remain on disk as future re-theme references only.

---

## Responsive Breakpoints

Desktop-first canvas; mobile is out of scope (design-system §6). One fluid desktop mockup per variant covers the supported range.

| Name | Width | Mockup File |
|------|-------|-------------|
| desktop | 1512px | `mockups/01-nyx-refined.html` |
| desktop | 1512px | `mockups/02-blueprint.html` |
| desktop | 1512px | `mockups/03-editorial-calm.html` |

## Interaction Contract

**User flows:**

1. Edit/delete an edge — click the edge → RF marks it selected → the floating action bar appears → `rel ▾` opens the rel grid, Label opens the inline editor, Delete removes it; `Delete`/`Backspace` still deletes a selected edge.
2. Resize a widget — select any node → drag a corner/side handle → release persists `width`/`height` (markdown re-derives the body clamp; others fix the box) → `Cmd-S` saves; size survives reload.
3. See/reach comments — a node with unresolved comments shows the on-card badge → click selects the node → the inspector "Comments on this node" list shows them → row click re-focuses the node; the thread header shows the node's human name, not a UUID.
4. Read compactly — open the reader → the frontmatter strip is collapsed by default → the toggle expands the full kv grid → prose reads at the tuned ramp.

**Keyboard / accessibility:**
- Visible focus ring (2px `--color-primary`) on every interactive element, present **only on focus** — no always-on rings.
- Edge action buttons, the comment badge, and the frontmatter toggle carry `aria-label`/`aria-expanded`; the badge `aria-label` carries the exact count even when the glyph shows "9+".
- Touch/click targets ≥ the design-system floor.

**Validation & error surfaces:**
- Deleting an edge/node is immediate + undoable via reload-before-save (no destructive confirm for a single edge; the board-clear confirm is unrelated).

---

## Design System / Component Reuse

| Need | Existing component | Status |
|------|-------------------|--------|
| Resize handles | `NodeResizer` (group-node reference) | reuse via new `NodeResizeFrame` wrapper |
| Edge rel grid | `RelPicker` (`labeled-edge.tsx`) | extend (drop embedded delete) |
| Edge label edit | `EdgeLabelEditor` (`labeled-edge.tsx`) | reuse |
| Frontmatter view | `<FrontmatterView>` | extend (collapsible reader variant) |
| Comment thread header | `CommentThread` `anchorLabel` prop | reuse (feed resolved name) |
| Inspector sections | `inspector-rail.tsx` | extend (comments section) |

## Design Tokens Introduced

| Token | Value | Rationale |
|-------|-------|-----------|
| `--color-secondary` | `#e4c6ff` (was `#ddb7ff`) | Calmer violet hue; paired with role reduction in prose (a `--secondary-deep` step for `em`/headings) so one saturated violet stops over-serving body text — design Decision 4. Contrast was never the failure (`#ddb7ff` already clears WCAG); hierarchy was |

## Visual Parity

Required for every UI-touching plan. Populated during the phase-close visual-parity check — see `ui-workflow.md § Phase Close`. The "before" baseline already exists: `mockups/captures/*.png` (real-app headless-Chrome screenshots).

**Capture location:** `.flowcode/plans/003-canvas-foundation/mockups/captures/phase-{N}/`

| Phase | Expected drift (placeholder → real data) | Acceptable drift (explicit accept) | Regressions (must fix before phase-done) |
|-------|-------------------------------------------|-------------------------------------|-------------------------------------------|
| Phase 1 | | | |
| Phase 2 | | | |

Note: the reader `em`/heading recolor (off `--color-secondary`) and the chosen style variant are **intended** — record as Expected drift, not a regression.

## Open Questions

- [x] Operator selected the STYLE variant: `01` nyx-refined (2026-06-28) — the current glass-neon language, fixed. `02`/`03` retained as re-theme references.
- [ ] Confirm the recalibrated `--color-secondary` is a global token change (ripples to the `import`-edge stroke + switcher/reader-size gradients) vs a prose/chip-scoped override — see design Open Questions.
- [ ] Dedicated long-form reading face for reader prose (amends design-system §0 + adds a dependency) — defer unless approved.

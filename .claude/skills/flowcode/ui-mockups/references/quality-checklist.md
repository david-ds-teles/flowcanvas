---
name: quality-checklist
description: The Step-5 conformance gate for every generated mockup — mirrors the design system's §13. A failure on any line means revise, do not present.
status: active
tags: [ui, mockups, checklist, quality-gate, conformance]
links: [.claude/skills/flowcode/ui-mockups/SKILL.md, .flowcode/ui/ui-design-system.md, .flowcode/ui/ui-mockup-discipline.md]
---

# Mockup Conformance Checklist

- Run on every iteration before the user sees it; this is a gate, not a suggestion.
- Mirrors `ui-design-system.md § 13`; the project's own §13 (after harvest) supersedes this list where they differ.
- A failure on any line is non-conformant — revise the iteration and re-check; never present a failing mockup.
- Grouped: grounding, structure, completeness, craft, accessibility, integrity.

---

## Grounding (the non-negotiables)

- [ ] **Font stack** matches the design system §0 rule 1 exactly — no substituted families.
- [ ] **Colors** all resolve to design-system tokens/aliases — zero stray hex in the markup.
- [ ] **Spacing** steps on the design-system scale only — no arbitrary px for padding/gap/margin.
- [ ] **Radii / borders / shadows** come from the design-system elevation scale only.

## Structure

- [ ] **Layout shell** (header / sidebar / workspace) matches §7 — not redesigned for this screen.
- [ ] **Components** are the design-system §8 shapes (button, input, table, modal, badge, tabs) — not reinvented.
- [ ] **Z-index** uses the §7 stack, no arbitrary `9999`.

## Completeness

- [ ] Every **declared state** (empty · loading · success · error · edge cases) is rendered and reachable.
- [ ] Every **declared breakpoint** is handled (or one provably-fluid layout covers them).
- [ ] **Real example data** in the markup — no lorem; empty placeholders only where the state is `empty`.

## Craft (taste lenses)

- [ ] **Motion** is purposeful and within the §10 duration band; custom ease-out; nothing animates from `scale(0)`; no animation on high-frequency/keyboard actions.
- [ ] No **AI-slop tells** — side-stripe accent borders, gradient text, hero-metric template, eyebrow-on-every-section, identical card grids (see the `impeccable` / `design-taste-frontend` lenses).
- [ ] Boldness is spent in **one** signature place; everything else is quiet.

## Accessibility floor

- [ ] Body contrast ≥ 4.5:1; large/UI glyphs ≥ 3:1; placeholders ≥ 4.5:1.
- [ ] Visible keyboard focus on every interactive element; tab order matches visual order.
- [ ] Touch targets ≥ 44×44px; icon-only controls carry an accessible label.
- [ ] Color is never the only signal; `prefers-reduced-motion` honored.

## Integrity

- [ ] **`data-testid`** on every interactive element (button, link, field, tab, menu item, row action).
- [ ] **Self-contained** — inline styles only, no external CSS; renders standalone when opened in a browser.
- [ ] **Interaction notes** as HTML comments near non-obvious behaviors.
- [ ] Filename follows `ui-mockup-discipline.md` (`01/02/03-{slug}.html` for iterations; `{component}-{state}.html` for canonical states).

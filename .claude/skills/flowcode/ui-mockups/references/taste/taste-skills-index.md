---
name: taste-skills-index
description: Router for the vendored taste lenses — maps a UI brief's register/intent to the one or two taste references the composer should read before generating.
status: active
tags: [ui, taste, mockups, router, index]
links: [.flowcode/ui/ui-design-system.md]
---

# Taste Lenses Index

- Vendored, portable design-taste references the composer reads as *reference knowledge* (not output) to lift mockups above generic defaults.
- Read only the 1–3 lenses the brief selects — never load all of them (Read-Depth discipline).
- Tokens and component shapes always come from `ui-design-system.md`; these lenses shape composition, motion, register, and what to avoid.
- Each lens is the vendored markdown of a real skill; the heavy `impeccable` lens is docs-only (its Node scripts were not vendored — run the global skill for live tooling).
- Source: copied from the user's installed `~/.claude/skills/` set (see provenance note below); refresh manually when upstreams change.

---

## Routing Table

| Brief signal / intent | Read lens(es) | What it gives |
|-----------------------|---------------|---------------|
| Animation, transitions, micro-interactions, "feel" | `emil-design-eng`, `review-animations` | Easing curves, durations, spring/gesture rules, the press/enter/exit craft bar; a review standard for motion |
| "Looks AI-generated / templated", needs taste & anti-slop | `impeccable`, `design-taste-frontend` | Absolute bans (side-stripe borders, gradient text, hero-metric, eyebrow scaffolds), the AI-slop test, brand-vs-product register guidance |
| "Make it feel premium / expensive / agency-grade" | `high-end-visual-design` | The exact fonts, spacing, shadows, card structure that read as high-end; blocks cheap defaults |
| Minimal, editorial, content-first | `minimalist-ui` | Warm monochrome, typographic contrast, flat bento, restraint |
| Data-dense, technical, terminal/dashboard | `industrial-brutalist-ui` | Rigid grids, extreme type-scale contrast, utilitarian color for dense data |
| Upgrading / redesigning an existing screen | `redesign-existing-projects` | Audit current design, identify generic patterns, apply high-end standards without breaking function |
| Brand board / identity / visual-world surface | `brandkit` | High-end brand-guideline composition |
| Generating a DESIGN.md / semantic system | `stitch-design-taste` | Agent-friendly DESIGN.md semantics, anti-generic UI standards |

**Default pick when the brief is plain product UI:** `impeccable` (docs) for the anti-slop floor + `emil-design-eng` for interaction polish. Add a register lens (`minimalist-ui` / `industrial-brutalist-ui` / `high-end-visual-design`) when the brief names a mood.

## How lenses compose with the design system

- **Design system wins on tokens** — colors, spacing, type, radii, component shapes are non-negotiable (`ui-design-system.md` §0).
- **Lens wins on composition & motion** — how to arrange, where to spend boldness, how things move.
- On conflict, keep the token/shape from the design system and apply the lens's compositional advice within those constraints.

## Vendored Lenses

| Lens | Form | Notes |
|------|------|-------|
| `emil-design-eng/` | SKILL.md | Emil Kowalski — animation/polish/component craft |
| `review-animations/` | SKILL.md + STANDARDS.md | Motion review bar (Emil-derived) |
| `design-taste-frontend/` | SKILL.md | Anti-slop frontend taste |
| `high-end-visual-design/` | SKILL.md | Agency-grade visual system |
| `minimalist-ui/` | SKILL.md | Editorial minimal |
| `industrial-brutalist-ui/` | SKILL.md | Brutalist / data-dense |
| `gpt-taste/` | SKILL.md | Editorial layout + motion engineering |
| `redesign-existing-projects/` | SKILL.md | Premium redesign of existing UIs |
| `stitch-design-taste/` | SKILL.md + DESIGN.md | Semantic DESIGN.md generator |
| `brandkit/` | SKILL.md | Brand-guideline boards |
| `impeccable/` | SKILL.md + reference/*.md | Docs-only (scripts not vendored — use the global skill for `npx impeccable` / live tooling) |

> Provenance: vendored from the operator's installed `~/.claude/skills/` (sources include Emil Kowalski's skill, `impeccable` (Apache-2.0), and the Leonxlnx taste-skill collection). These are read-only references; do not edit them here — refresh from upstream when needed.

---
name: ui-design-system
description: Per-project UI design-system digest — the pixel-accurate token + component ground truth every mockup and frontend change must obey.
status: active
tags: [ui, design-system, tokens, components, mockups, ground-truth]
links: [.flowcode/ui/ui-index.md, .flowcode/ui/ui-mockup-discipline.md, .flowcode/ui/references]
---

# {Project} UI Design System

- The single ground truth for every mockup and frontend change — read in full before authoring any HTML, SCSS, or component.
- Mode: {harvested from the live app | generated greenfield | shipped starter} on {DATE}; {N} reference files under `.flowcode/ui/references/`.
- Every value below is a token, not a literal — production code sources colors/spacing/type from these, never one-off hex (`ui-mockup-discipline.md § Design Tokens`).
- §0 lists the non-negotiables; §13 is the conformance checklist a mockup must pass before it is shown; §14 traces each value back to its source.
- Brownfield rule: never invent a token, font, or component shape — if it is not here and not in the cited source, it does not exist yet; add it here first.
- Greenfield rule: this digest IS the brand; deepen it as the product's real UI lands, keeping §14 honest.

---

## §0 — Tier-1 Rules (the non-negotiables)

> A mockup or component that breaks any of these is non-conformant and must be revised before the user is asked to choose between iterations.

1. **Font stack is `{exact stack}`.** No other families. {No Google Fonts | Fonts loaded via X}. Never substitute Inter/JetBrains/etc. "because it looks designed".
2. **Colors come from §2 only.** No raw hex in components; every color resolves to a named token or semantic alias.
3. **Spacing comes from the §4 scale.** No arbitrary px values; pad/gap/margin step on the scale.
4. **Radii / shadows / borders come from §5.** One elevation scale; no ad-hoc shadow values.
5. **Every interactive element carries `data-testid`** (§13) — load-bearing for hook-driven tests; implementation preserves them verbatim.
6. **The layout shell (§7) is fixed** — header height, sidebar widths, workspace background are not redesigned per screen.
7. **Component shapes (§8) are reused, not reinvented** — a button is `{the canonical button}`, a table is `{the canonical table}`.
8. **Accessibility floor (§11) is mandatory** — contrast ≥ 4.5:1 body, visible focus, reduced-motion honored, touch targets ≥ {size}.
9. **Motion follows §10** — purposeful, {duration band}, custom easing, never decorative on high-frequency actions.
10. **{Project-specific non-negotiable, e.g. "All currency uses tabular figures" / "No emoji as icons"}.**

---

## §1 — Stack & Sources

| Aspect | Value |
|--------|-------|
| UI framework | {Angular / React / Vue / Svelte / native / vanilla} |
| Styling | {SCSS / Tailwind vN / CSS modules / styled-components / vanilla CSS vars} |
| Component library | {Material / shadcn-ui / Mantine / none / in-house} |
| Icon set | {Font Awesome 6.x / Lucide / Material Symbols / Heroicons} — one set only |
| Token source of truth | {`src/styles/constants.scss` / `tailwind.config.ts` / `:root` in `theme.css`} |
| Reference files | `.flowcode/ui/references/` — {list the ground-truth HTML + screenshots} |

---

## §2 — Color Tokens

### §2.1 Primitives (the raw palette)

| Token | Value | Usage |
|-------|-------|-------|
| `{--color-name}` | `{#hex / oklch()}` | {where it is used} |

### §2.2 Semantic aliases (use these in components, not primitives)

| Alias | → Primitive | Role |
|-------|-------------|------|
| `--bg-app` | `{--color-x}` | App / workspace background |
| `--bg-surface` | `{--color-x}` | Cards, inputs, raised surfaces |
| `--bg-elevated` | `{--color-x}` | Modals, popovers, menus |
| `--text-primary` | `{--color-x}` | Body / headings |
| `--text-muted` | `{--color-x}` | Secondary / help text |
| `--border-default` | `{--color-x}` | Inputs, cards, dividers |
| `--accent` | `{--color-x}` | Primary action / brand |
| `--accent-hover` | `{--color-x}` | Hover / active of accent |

### §2.3 Status colors

| Token | Value | Meaning |
|-------|-------|---------|
| `--success` | `{#hex}` | Success / valid |
| `--warning` | `{#hex}` | Warning / pending |
| `--error` | `{#hex}` | Error / destructive |
| `--info` | `{#hex}` | Informational |

> Functional color is never the only signal — pair with icon/text (§11).

---

## §3 — Typography

| Aspect | Value |
|--------|-------|
| Font stack | `{exact stack — must match §0 rule 1}` |
| Base size / line-height | `{16px} / {1.5}` |
| Type scale | `{12 · 14 · 16 · 18 · 21 · 24 · 32 …}` — named below |
| Weights | `{400 body · 500 medium · 600 labels · 700 headings}` |
| Heading letter-spacing | `{e.g. -0.02em on display}` |

| Named size | Value | Used for |
|------------|-------|----------|
| `{--font-body}` | `{14px}` | Body text |
| `{--font-label}` | `{14px}` | Form labels |
| `{--font-title}` | `{21px}` | Page / card titles |

---

## §4 — Spacing & Sizing

**Spacing scale (the only allowed increments):** `{4 · 8 · 12 · 16 · 24 · 32 · 48}px`.

| Token | Value | Used for |
|-------|-------|----------|
| `--space-page` | `{16px}` | Page / card padding |
| `--gap` | `{16px}` | Grid / flex gaps |
| `--field-height` | `{36px}` | Inputs, selects, buttons |
| `--field-width-default` | `{300px}` | Default field width |

---

## §5 — Borders, Radii, Shadows

| Element | Border | Radius | Shadow / elevation |
|---------|--------|--------|--------------------|
| Card | `{1px solid var(--border-default)}` | `{8px}` | `{none / sm}` |
| Input | `{1px solid var(--border-default)}` | `{8px}` | `none` |
| Input (focus) | `{2px solid var(--accent)}` | `{8px}` | `none` |
| Button (primary) | `none` | `{8px}` | `{sm}` |
| Modal | `none` | `{12px}` | `{lg}` |

**Elevation scale:** `sm {value} · md {value} · lg {value}` — no other shadow values.

---

## §6 — Breakpoints

| Name | Range | Notes |
|------|-------|-------|
| mobile | `{≤ 600px}` | {single column} |
| tablet | `{768–991px}` | {2-col} |
| desktop | `{≥ 992px}` | {full shell} |
| large | `{≥ 1280px}` | {max content width {value}} |

---

## §7 — Layout Shell

The app frame is fixed across screens — describe it once here, never redesign per mockup.

- **Top header:** height `{value}`, background `{token}`, contents `{logo · search · user menu}`.
- **Sidebar:** collapsed `{value}` / expanded `{value}`, background `{token}`, active-item indicator `{spec}`.
- **Workspace:** background `{token}`, padding `{value}`, max content width `{value}`.
- **Z-index stack (low → high):** `{base 0 · sticky 10 · dropdown 20 · header 30 · modal-backdrop 40 · modal 50 · toast 60 · tooltip 70}`.

---

## §8 — Component Specs

Each component is a fixed shape. Mockups assemble these; they do not reinvent them.

### Buttons

| Variant | Spec |
|---------|------|
| Primary | bg `--accent`, text `{token}`, height `--field-height`, radius `{token}`, `{uppercase?}`, hover `--accent-hover` |
| Secondary / link | transparent, text `--accent`, hover bg `{token}` |
| Destructive | bg `--error`, hover `{token}` |
| Disabled | `{opacity / desaturate}` + `cursor: default`, non-interactive |
| Icon-only | size `{value}`, hit area ≥ §11 minimum |

### Form fields

{Text input · select · autocomplete · date · textarea · checkbox · radio · validation states · required marker · search bar} — height `--field-height`, border per §5, error state `{spec}`, valid/dirty state `{spec}`, label placement `{above, never placeholder-only}`.

### Lists / tables

{Header bg `{token}` · row height `{value}` · sticky header · row expansion pattern `{spec}` · pagination `{spec}` · empty state `{spec}` · loading overlay `{spec}`}.

### Modals / dialogs

{Container radius/shadow per §5 · header bg `{token}` + close affordance · sizes `sm/md/lg {values}` · footer right-aligned actions · backdrop scrim `{40–60% black}`}.

### Tabs · Cards · Badges/Status · Navigation · Toasts

{One canonical spec each — fill from the live app or the starter.}

---

## §9 — Icons & Imagery

- Icon set: `{set}` — one family only, no emoji as structural icons.
- Sizes: `{--icon-sm 16 · --icon-md 20 · --icon-lg 24}`, stroke `{value}`, filled-vs-outline discipline `{rule}`.
- Imagery: `{aspect ratios, placeholder treatment, avatar shape}`.

---

## §10 — Motion & Interaction

- Durations: button press `{100–160ms}` · dropdowns `{150–250ms}` · modals/drawers `{200–400ms}`; UI stays under 300ms.
- Easing: `--ease-out: {cubic-bezier}` for enter, `--ease-in-out: {cubic-bezier}` for movement; never `ease-in` on UI.
- Press feedback: `{transform: scale(0.97)}` on `:active`; never animate from `scale(0)`.
- High-frequency / keyboard-initiated actions: no animation.
- `prefers-reduced-motion`: every animation has a crossfade/instant alternative.
- {See the `flowcode:ui-mockups` skill's `references/taste/` lenses for the craft bar — emil-design-eng + review-animations for motion.}

---

## §11 — Accessibility Floor

- Contrast: body ≥ 4.5:1, large/UI glyph ≥ 3:1, placeholders ≥ 4.5:1.
- Visible keyboard focus on every interactive element; tab order matches visual order.
- Touch targets ≥ `{44×44px}`; ≥ 8px spacing between targets.
- Color is never the only signal; every icon-only control has an accessible label.
- Reduced motion + dynamic text scaling supported without layout breakage.

---

## §12 — States Catalog

Every screen must account for these states; mockups render each declared one:

`empty · loading · success/loaded · error · partial/edge-case {named}`.

---

## §13 — Mockup Authoring Checklist (conformance gate)

Run before showing any mockup to the user. A failure on any line is non-conformant — revise, do not present.

- [ ] Font stack matches §0 rule 1 exactly.
- [ ] All colors resolve to §2 tokens/aliases — zero stray hex.
- [ ] Spacing steps on the §4 scale only.
- [ ] Radii / borders / shadows from §5 only.
- [ ] Layout shell (§7) intact — header/sidebar/workspace unchanged.
- [ ] Components are §8 shapes, not reinvented.
- [ ] Every declared state (§12) rendered and reachable.
- [ ] Every declared breakpoint (§6) handled.
- [ ] `data-testid` on every interactive element.
- [ ] Accessibility floor (§11) met — contrast, focus, targets, labels.
- [ ] Motion (§10) purposeful and within the duration band.
- [ ] Self-contained: inline styles only, renders standalone when opened.

---

## §14 — Source-File Index

Where each section's values trace back, so an agent can drill from this digest to the live source.

| Section | Source of truth |
|---------|-----------------|
| §2 Colors | `{path:line}` |
| §3 Typography | `{path:line}` |
| §4 Spacing | `{path:line}` |
| §5 Borders/radii/shadows | `{path:line}` |
| §7 Layout shell | `{path:line}` |
| §8 Components | `{path:line per component}` |
| References | `.flowcode/ui/references/{files}` |

> Last harvested/generated: {DATE} from {source}. Keep this index honest — drift here silently corrupts every mockup.

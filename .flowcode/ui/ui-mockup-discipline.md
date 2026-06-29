---
name: ui-mockup-discipline
description: Conventions for every mockup HTML and capture file — flat layout, iteration filenames, test IDs, design tokens, breakpoints, and MCP preferences.
status: active
tags: [ui, mockups, conventions, design-tokens, breakpoints]
links: [.flowcode/ui/ui-index.md, .flowcode/ui/ui-workflow.md, .flowcode/ui/ui-design-system.md]
---

# UI Mockup Discipline

- Conventions for every HTML / capture file under `.flowcode/plans/{PREFIX}/mockups/`; load alongside `ui-workflow.md` during design and phase-close.
- Flat directory per plan — `captures/` is the only permitted sub-directory; iteration files use `01/02/03-{slug}.html`.
- Canonical state files are `{component}-{state}.html`; states come from the design's Screens & States table.
- Every interactive element carries a load-bearing `data-testid`; the implementation must preserve them verbatim.
- Every value resolves to a `ui-design-system.md` token — no invented hex; production code sources the same tokens.
- The design must declare all responsive breakpoints, each backed by a mockup; the `flowcode:ui-mockups` composer generates them and `flowcode:browser` captures them (it resolves the driver via its ladder, preferring a wired `claude-in-chrome` MCP).
- When the design is implemented and runs, mockups **snapshot the real surface** (Fidelity discipline) — reuse the verbatim tokens/CSS/board, render markdown not the raw tag, use real data, render-verify before presenting.
- Each version ships as one **state-switcher** mockup (a `MOCKUP CONTROLS` bar toggling `body[data-state]` over one complete render), never N duplicated full-board frames; the `flowcode:ui-mockups` composer ships `state-switcher-exemplar.html` as the worked pattern.

---

## Directory Layout

**Flat.** No `iterations/` vs `final/` split, no nested sub-folders per feature. One directory per plan:

```text
.flowcode/plans/{PREFIX}/
  mockups/
    01-dashboard.html              # iteration A
    02-dashboard.html              # iteration B
    03-dashboard.html              # iteration C
    dashboard-empty.html           # canonical state file (post-selection)
    dashboard-loaded.html
    dashboard-error.html
    captures/
      phase-1/
        mobile-dashboard-empty.png
        desktop-dashboard-empty.png
```

`captures/` is the only permitted sub-directory — populated by the phase-close visual-parity check (`ui-workflow.md § Phase Close`). No other nesting.

---

## Filename Conventions

| Pattern | Purpose | Example |
|---------|---------|---------|
| `01-{slug}.html` / `02-{slug}.html` / `03-{slug}.html` | Parallel iterations from the 3-way `flowcode:ui-mockups` dispatch | `02-checkout-summary.html` |
| `{component}-{state}.html` | Canonical state file (one per declared state, post-selection) | `checkout-summary-empty.html`, `checkout-summary-error.html` |
| `captures/phase-{N}/{viewport}-{component}-{state}.{png|html}` | Viewport capture from phase-close | `captures/phase-2/tablet-checkout-summary-loaded.png` |

Filenames are lowercase kebab-case. `state` values come from the Screens & States table of `{PREFIX}-ui-design.md` (empty · loading · success · error · named-edge-case).

The `01/02/03` prefix on iterations is advisory — not enforced by any hook — but strongly recommended for readability when three iterations coexist.

---

## HTML Contents

Every mockup HTML file includes:

- Full component tree for the target screen / state.
- Inline `<style>` block or inline style attributes — no external CSS references in mockup files (they must render standalone when opened).
- **Real project data** rendered into the markup — never lorem or fabricated values when the project already has the content. No empty placeholders except where the state is explicitly `empty`.
- **Rendered markdown, never the raw tag.** Markdown content renders as formatted HTML — headings, bold, lists, code — never the literal `##` / `*` / backtick source shown as text. A mockup that prints raw markdown tags is non-conformant.
- Interaction notes as HTML comments near the relevant element — `<!-- on click: opens filter drawer -->` — capturing behaviors not visible in a static render.
- `data-testid="..."` on every interactive element (button, link, form field, tab, menu item). These IDs are load-bearing for the hook-driven tests; the implementation must preserve them verbatim.

### State-Switcher Output Form

Each version ships as **one interactive mockup with a statebar** — a single complete render whose declared states are reached by a toggle — **not** N duplicated full-board frames concatenated into one file. The N-frames form bloats the payload (it is what stalls the generator on large mockups) and lets the frames silently drift apart; for an implemented UI it is a non-conformance.

The mechanism (worked in full in the `flowcode:ui-mockups` composer's `state-switcher-exemplar.html`):

- A `MOCKUP CONTROLS` bar of `data-go="{state}"` buttons, explicitly marked *"not part of the product"* so it is never mistaken for a real component.
- Clicking a button sets `body[data-state="{state}"]`; per-state CSS dims / emphasizes / reveals over the **same** DOM — e.g. `body[data-state="select"] .card:not(.is-selected){opacity:.45}`.
- Every declared state is reachable from the bar over one render. The **constant element set never changes between states** — only emphasis does. This is the *completeness invariant*: every UI/UX element the design defines (toolbar, bottom chat widget, every menu) is present in every state, so each state is independently validatable against the full feature set.

---

## Fidelity — Snapshot the Real System

When the design **is implemented and the UI runs**, a mockup is not an abstract sketch — it is a faithful snapshot of the real surface with the plan's changes applied. Generating blind (inventing HTML for a UI that already renders) is the root cause behind every low-fidelity mockup failure. The rules below are hardest in the implemented case; the ones marked **(both)** apply equally when the design is defined but not yet built.

1. **Reuse the real surface (implemented).** Inline the project's verbatim design tokens + component CSS + the real board/screen. Never invent abstract HTML for a UI that already renders.
2. **Snapshot first (implemented).** Capture the running UI — `flowcode:browser capture` or any wired browser/snapshot tool — as the "before" baseline *and* the pixel-perfect reference, before authoring. No tool wired? Ask which to use; never fall back to inventing HTML. The ground-truth branch and tooling-resolution rule live in `ui-workflow.md § 1`.
3. **Render markdown, never the tag (both).** Markdown content renders as formatted HTML; literal `##` / `*` / backtick source shown as text is a non-conformance.
4. **Real data, not fabricated (both).** Use the project's actual content; fabricated or lorem data only where a state is explicitly `empty`.
5. **Apply ALL the plan's proposed changes at once (both).** The mockup reflects the full proposed end-state, not a partial sketch of one change.
6. **Hit the fidelity bar (both).** A self-contained file that renders every declared state via the statebar — roughly **50–110 KB** of real markup for a full screen. A ~15 KB abstract sketch is below bar.
7. **Render-verify before presenting (both).** Screenshot the finished mock (`flowcode:browser capture` on the local file, or any wired tool) and confirm it renders; a mock that does not render is never shown to the user.

These seven rules are the **Fidelity gate**. They are defined here once; the composer's `quality-checklist.md` and the design system's `§13` carry pointer check-lines, not copies — keep all three in lockstep when this section changes.

---

## Design Tokens

- **`ui-design-system.md` is the ground truth.** Every color / spacing / typography / radius value in a mockup resolves to a token or semantic alias defined there — not invented. This is the single biggest lever on mockup quality.
- The composer inlines `house-style.css` (the starter token layer) as a baseline; the project's `ui-design-system.md` overrides it. Raw one-off hex in a mockup is a §13 checklist failure, not "rapid exploration".
- **Production code MUST source the same tokens.** Before the implementation phase uses any value, it must exist in the design system + the project's token file with a rationale. Missing tokens are added to the design system first — never introduced as one-off literals.
- If a token is added specifically for this plan, note it in the plan's `{PREFIX}-changelog.md § Tokens` section and reflect it in `ui-design-system.md` so the mapping is traceable.

---

## Responsive Breakpoints

- `{PREFIX}-ui-design.md` MUST declare the full list of viewports the plan supports (e.g. `mobile-small-320`, `mobile-420`, `tablet-768`, `desktop-1280`, `desktop-1920`).
- At least one mockup file per declared breakpoint OR one responsive-fluid mockup that provably handles them all. A plan that declares breakpoints without corresponding mockups is an incomplete design — hold before implementation.
- The phase-close visual-parity check captures every declared breakpoint. No optional breakpoints.

---

## MCP Preferences

| Need | Preferred | Avoid |
|------|-----------|-------|
| Mockup generation | `flowcode:ui-mockups` composer skill (grounds in `ui-design-system.md`, composes taste lenses) | Hand-rolling without reading the design system first |
| Design taste / craft | Vendored lenses in `references/taste/` (always) + live `frontend-design`, `ui-ux-pro-max`, `impeccable` when installed | Generic AI defaults (cream-bg serif, eyebrow scaffolds, hero-metric) — see the `impeccable` lens |
| Browser captures | `flowcode:browser` — resolves a driver via its ladder, *preferring* a wired `claude-in-chrome` MCP, then project / ephemeral Playwright | Hand-wiring `microsoft/playwright-mcp` — ≈4× token cost vs. direct Playwright, no quality advantage; the ladder picks the cheaper driver for you |
| Figma sync | Figma MCP (when the project uses Figma as source of truth) | Manual screenshot copy-paste |
| Google Stitch design-to-code | `stitch-mcp` | — |

---

## Hand-off to Implementation

When the phase closes:

- Canonical `{component}-{state}.html` files stay as the visual spec.
- Captures land under `captures/phase-{N}/`.
- The implementation references mockups by relative path (`../mockups/checkout-summary-empty.html`) in component-level comments or story files so the trail from shipped UI to spec is one click away.

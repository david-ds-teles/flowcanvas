---
name: flowcode:ui-mockups
description: Generate high-quality, self-contained HTML mockups and screens grounded in the project's design system. Use whenever the task is to design, mock up, prototype, or iterate a UI screen/page/component as HTML — both standalone (via /flowcode:mockup, no plan needed) and inside the flowcode UI design lifecycle (dispatched by the designer agent / UI Design Gate). Composes vendored taste lenses (Emil Kowalski, impeccable, design-taste, etc.) and optional live design engines on top of the design-system ground truth.
status: active
tags: [ui, mockups, screens, design-system, taste, html]
links: [.flowcode/ui/ui-design-system.md, .flowcode/ui/ui-mockup-discipline.md, .flowcode/ui/ui-workflow.md]
---

# UI Mockups Composer

- The shared engine that turns a UI brief into **one fidelity anchor + two distinct explorations** as self-contained HTML, grounded in the source (or the design system) and shaped by curated taste lenses — never subjective, never ungrounded.
- Grounds on the truth: when the design **is implemented and runs**, snapshot the running UI and build the anchor pixel-perfect against it; otherwise build from the plan's UI/UX definitions (Step 0 branch). Never invent abstract HTML for a UI that already renders.
- Two entry points, one engine: framework-triggered (designer agent / UI Design Gate) and standalone (`/flowcode:mockup`, no plan required).
- Tier A (always): read the matching vendored taste lens(es) from `references/taste/` per `references/taste/taste-skills-index.md`. Tier B (optional): live engines — `frontend-design`, `ui-ux-pro-max`, `impeccable` — when present.
- Output follows `ui-mockup-discipline.md`: anchor + two distinct explorations (`01/02/03-{slug}.html`), each a state-switcher reaching every declared state, `data-testid` on every interactive element, inline styles only.
- A **distinctness rule** (no two near-duplicates) + a **completeness invariant** (every defined element in all three) bind the set; the `state-switcher-exemplar.html` is the worked output form.
- Step 5 self-checks each version against the §13 / `quality-checklist.md` Fidelity gate — render-verified; non-conformant versions are revised before the user ever sees them.

---

## When To Use

Use whenever the work is to produce or iterate a UI as HTML: a screen, page, component, dashboard, form, empty/error state, onboarding, or a redesign. Triggered two ways:

- **Standalone:** `/flowcode:mockup <description>` — ad-hoc, no plan. Default output `.flowcode/ui/mockups/{slug}/`.
- **In-framework:** the designer agent / UI Design Gate runs this skill during a plan's design phase per `ui/ui-workflow.md § 1` — main-session-driven and capture-grounded when the UI is implemented, else composer-generated from the plan's UI/UX definitions; output goes to `.flowcode/plans/{PREFIX}/mockups/`.

Not for: backend logic, non-visual code, or final production-framework components (mockups are vanilla HTML specs that the implementation phase translates into the project's stack).

## Step 0 — Ensure the ground truth exists

Read `.flowcode/ui/ui-design-system.md`.

- **Missing or empty** → the project has no design system yet. Offer once: harvest it from the live app, or generate a starter (the bootstrap UI step, `flowcode:bootstrap-agent § Step 6.5`). If the user declines, fall back to the shipped starter system and say so — output will use generic defaults.
- **Present** → it is the mandatory ground truth for everything below. Read it in full. Read the files in `.flowcode/ui/references/` too — they are the visual ground truth.

**Then branch on whether the design is implemented in source** (`ui/ui-workflow.md § 1` — the canonical statement of this branch):

- **Implemented** (the design-system tokens + components exist in code and the UI runs) → the ground truth is the **source code + the running UI**. **Snapshot it first** — `flowcode:browser capture`, or any wired `claude-in-chrome` / browsertools MCP — as the "before" baseline *and* the pixel-perfect reference. **No snapshot tool wired? Ask the user which to use — never fall back to inventing abstract HTML for a UI that already renders.** Reuse the verbatim tokens + component CSS + real board (the `ui-mockup-discipline.md § Fidelity` discipline).
- **Not implemented** (the plan defines the UI/UX but no built UI exists) → the ground truth is the plan's **UI/UX definition files** (`{PREFIX}-ui-design.md`, the `{PREFIX}-design.md` UI sections, `ui-design-system.md`). Build the anchor as a complete reference of the defined design system.

**Hard rule:** never invent a token, font, color, spacing value, or component shape. Every value in a mockup traces to the ground truth above (or its cited source). This is the single biggest lever on quality — confia-grade parity comes from enforced ground truth, not from improvisation.

## Step 1 — Read the brief and pin the scope

Establish, from the brief or the `{PREFIX}-ui-design.md` Screens & States section:

- The screen(s) and their single job.
- The states to render (`empty · loading · success · error · edge cases` — §12 of the design system).
- The breakpoints to cover (§6).
- The register / mood (minimal, premium, data-dense, brutalist, playful…) — drives taste-lens selection in Step 2.

If the brief is thin, pin the missing axes yourself and state your choice (do not stall).

## Step 2 — Select taste lenses (Tier A — vendored, always available)

Read `references/taste/taste-skills-index.md` and pull the 1–3 lenses the brief calls for. Read only those (Read-Depth discipline — do not load all of them). They are *reference knowledge that shapes generation*, not output to copy. Typical routing:

- Motion / micro-interaction polish → `emil-design-eng` + `review-animations`.
- Anti-slop discipline, absolute bans, register (brand vs product) → `impeccable` (docs) + `design-taste-frontend`.
- "Make it feel expensive" / premium agency feel → `high-end-visual-design`.
- Minimal / editorial → `minimalist-ui`; data-dense / technical → `industrial-brutalist-ui`.
- Upgrading an existing screen → `redesign-existing-projects`.
- Brand board / identity surface → `brandkit`; DESIGN.md semantics → `stitch-design-taste`.

The taste lenses inform *how* to spend boldness; the design system constrains *which* tokens/shapes. When they conflict, the design system wins on tokens; the taste lens wins on composition and motion.

## Step 3 — Compose live engines (Tier B — optional, detect-and-prefer)

If these are installed in the session, additionally delegate, passing the design system + selected references as context:

- `frontend-design` (Anthropic) — aesthetic direction, typography pairing, anti-templated thesis.
- `ui-ux-pro-max` — its `--design-system` recommendations + 99 UX/a11y/perf rules + pre-delivery checklist.
- the full global `impeccable` skill — for live browser iteration / its command flow.

Absent → skip silently and rely on Tier A + the house style. **Never hard-fail for a missing engine.**

## Step 4 — Generate the anchor + two distinct explorations

Always exactly three (`01/02/03-{slug}.html`), fixed roles graduating by *departure distance from the anchor* — never a free choice of three directions:

| Role | Bound |
|------|-------|
| **1 — Anchor** | Canonical fidelity (mandatory). Pixel-perfect to the implemented UI (the Step-0 snapshot + all plan changes), or — if not yet built — a complete reference of the defined design system: every defined element, every token/pattern/component shape, **zero invention**. |
| **2 — On-system exploration** | A genuinely different composition / information-architecture within the *same* tokens + component shapes. **Visibly distinct from the anchor**, not a recolor. |
| **3 — Bold direction** | A distinct art direction / aggressive UX rethink; may reorder components / menus. The **core, essence, and every defined element remain** — a relevant-discovery lane, never a different product. |

The taste lenses (Step 2/3) shape #2's and #3's composition over the grounded render; the design system constrains the tokens. Then, for the whole set:

- **Distinctness rule** — no two of the three may be recolors or near-duplicates (Step 5 fails a set where any two read as the same composition).
- **Completeness invariant** — every UI/UX element the design defines (toolbar, bottom chat widget, every menu) appears in **all three**; they differ in fidelity / exploration degree, never in *which* elements exist.
- **State-switcher form** — each version is one statebar mockup reaching every declared state (`ui-mockup-discipline.md § State-Switcher Output Form`), not N duplicated full-board frames. Pattern-match `references/state-switcher-exemplar.html`.
- Self-contained: inline `<style>` (or inline attrs), no external CSS; `references/house-style.css` is the baseline token/reset layer when the design system doesn't override it.
- `data-testid` on every interactive element; interaction notes as HTML comments; **markdown rendered as formatted HTML, never the raw tag**; real project data, not lorem (empty placeholders only where the state is `empty`).

Output location:
- Standalone: `.flowcode/ui/mockups/{slug}/` (or the command's `--out`).
- In a plan: `.flowcode/plans/{PREFIX}/mockups/`.

## Step 5 — Self-check (the gate)

Run each version against `references/quality-checklist.md` (the §13 / Fidelity gate). A failure on any line is non-conformant — revise; do not present. Per version: font stack, tokens-not-hex, spacing scale, radii/shadows, shell intact, component shapes, every state reachable via the statebar, every breakpoint handled, `data-testid` coverage, accessibility floor, motion within band, renders standalone.

Then the **Fidelity + set-level** checks (the lines added for plan 011):

- **Render-verify** — screenshot each finished mock (`flowcode:browser capture` on the local file, or any wired tool) and confirm it renders; a mock that does not render is never shown.
- **Fidelity bar** — reuses the real render (not abstract HTML) when implemented; markdown rendered not raw; real data not fabricated; ~50–110 KB for a full screen (not a ~15 KB sketch).
- **Distinctness rule** — across the three, no two are recolors or near-duplicates; each reads as a genuinely different composition.
- **Completeness invariant** — every defined element is present in **all three** (only fidelity / exploration degree varies between them).

## Step 6 — Present for selection

Show the user the three — anchor + two distinct explorations (paths + a one-line rationale each). In a plan, the selected one becomes the spec recorded in `{PREFIX}-ui-design.md`; the rejected two stay as history. Standalone, just hand back the paths.

## References

| File | Use |
|------|-----|
| `.flowcode/ui/ui-design-system.md` | Mandatory ground truth — tokens, components, §13 checklist, §14 sources |
| `.flowcode/ui/references/` | Visual ground-truth HTML/screenshots |
| `references/house-style.css` | Baseline token + reset layer to inline when the design system doesn't override |
| `references/quality-checklist.md` | The Step-5 conformance gate |
| `references/state-switcher-exemplar.html` | The worked **state-switcher output form** — `MOCKUP CONTROLS` → `body[data-state]` over one complete render, constant element set across states; pattern-match this instead of improvising |
| `references/taste/taste-skills-index.md` | Router: brief/register → which vendored taste lens(es) to read |
| `references/taste/<lens>/` | Vendored taste-skill reference knowledge (read on demand) |
| `.flowcode/ui/ui-mockup-discipline.md` | Filenames, layout, `data-testid`, breakpoints, MCP prefs |
| `.flowcode/ui/ui-workflow.md` | The full UI lifecycle this skill plugs into |

## Non-Goals

- Do not generate production-framework components — mockups are vanilla HTML specs.
- Do not invent abstract HTML for a UI that already renders — snapshot the running UI and reuse the real surface (`ui-mockup-discipline.md § Fidelity`).
- Do not invent design tokens — ground in the design system or stop and harvest one.
- Do not load every taste lens — read only the ones the brief selects.
- Do not block on a missing Tier-B engine — degrade gracefully to Tier A + house style.

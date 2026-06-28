---
name: flowcode:ui-mockups
description: Generate high-quality, self-contained HTML mockups and screens grounded in the project's design system. Use whenever the task is to design, mock up, prototype, or iterate a UI screen/page/component as HTML — both standalone (via /flowcode:mockup, no plan needed) and inside the flowcode UI design lifecycle (dispatched by the designer agent / UI Design Gate). Composes vendored taste lenses (Emil Kowalski, impeccable, design-taste, etc.) and optional live design engines on top of the design-system ground truth.
status: active
tags: [ui, mockups, screens, design-system, taste, html]
links: [.flowcode/ui/ui-design-system.md, .flowcode/ui/ui-mockup-discipline.md, .flowcode/ui/ui-workflow.md, .claude/commands/flowcode/mockup.md, .claude/agents/flowcode/designer-agent.md]
---

# UI Mockups Composer

- The shared engine that turns a UI brief into 3 self-contained HTML iterations, grounded in the design system and shaped by curated taste lenses — never subjective, never ungrounded.
- Two entry points, one engine: framework-triggered (designer agent / UI Design Gate) and standalone (`/flowcode:mockup`, no plan required).
- Step 1 always grounds in `.flowcode/ui/ui-design-system.md`; if it is missing, offer to harvest/generate it before any HTML (Step 0).
- Tier A (always): read the matching vendored taste lens(es) from `references/taste/` per `references/taste/taste-skills-index.md`.
- Tier B (optional): when present, also delegate to live engines — `frontend-design` (Anthropic), `ui-ux-pro-max`, the full global `impeccable`.
- Output follows `ui-mockup-discipline.md`: 3 iterations (`01/02/03-{slug}.html`), every state × breakpoint, `data-testid` on every interactive element, inline styles only.
- Step 5 self-checks each iteration against the design system's §13 checklist; non-conformant iterations are revised before the user ever sees them.

---

## When To Use

Use whenever the work is to produce or iterate a UI as HTML: a screen, page, component, dashboard, form, empty/error state, onboarding, or a redesign. Triggered two ways:

- **Standalone:** `/flowcode:mockup <description>` — ad-hoc, no plan. Default output `.flowcode/ui/mockups/{slug}/`.
- **In-framework:** the designer agent / UI Design Gate dispatches this skill 3× in parallel during a plan's design phase; output goes to `.flowcode/plans/{PREFIX}/mockups/`.

Not for: backend logic, non-visual code, or final production-framework components (mockups are vanilla HTML specs that the implementation phase translates into the project's stack).

## Step 0 — Ensure the ground truth exists

Read `.flowcode/ui/ui-design-system.md`.

- **Missing or empty** → the project has no design system yet. Offer once: harvest it from the live app, or generate a starter (the bootstrap UI step, `flowcode:bootstrap-agent § Step 6.5`). If the user declines, fall back to the shipped starter system and say so — output will use generic defaults.
- **Present** → it is the mandatory ground truth for everything below. Read it in full. Read the files in `.flowcode/ui/references/` too — they are the visual ground truth.

**Hard rule:** never invent a token, font, color, spacing value, or component shape. Every value in a mockup traces to `ui-design-system.md` (or its cited source). This is the single biggest lever on quality — confia-grade parity comes from enforced ground truth, not from improvisation.

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

## Step 4 — Generate 3 iterations

Per `ui-mockup-discipline.md`:

- Three distinct directions (`01-{slug}.html`, `02-{slug}.html`, `03-{slug}.html`) — genuinely different compositions, not recolors of one.
- Each covers every declared state × breakpoint.
- Self-contained: inline `<style>` (or inline attrs), no external CSS; `references/house-style.css` is the baseline token/reset layer to inline or adapt when the design system doesn't override it.
- `data-testid` on every interactive element — load-bearing for hook tests; the implementation preserves them verbatim.
- Interaction notes as HTML comments near the relevant element.
- Real example data, not lorem; empty placeholders only where the state is `empty`.

Output location:
- Standalone: `.flowcode/ui/mockups/{slug}/` (or the command's `--out`).
- In a plan: `.flowcode/plans/{PREFIX}/mockups/`.

## Step 5 — Self-check (the gate)

Run each iteration against `references/quality-checklist.md` (which mirrors the design system's §13). A failure on any line is non-conformant — revise the iteration; do not present it. Check at minimum: font stack, tokens-not-hex, spacing scale, radii/shadows, shell intact, component shapes, every state reachable, every breakpoint handled, `data-testid` coverage, accessibility floor, motion within band, renders standalone.

## Step 6 — Present for selection

Show the user the 3 iterations (paths + a one-line rationale each). In a plan, the selected iteration becomes the spec recorded in `{PREFIX}-ui-design.md`; the rejected two stay as history. Standalone, just hand back the paths.

## References

| File | Use |
|------|-----|
| `.flowcode/ui/ui-design-system.md` | Mandatory ground truth — tokens, components, §13 checklist, §14 sources |
| `.flowcode/ui/references/` | Visual ground-truth HTML/screenshots |
| `references/house-style.css` | Baseline token + reset layer to inline when the design system doesn't override |
| `references/quality-checklist.md` | The Step-5 conformance gate |
| `references/taste/taste-skills-index.md` | Router: brief/register → which vendored taste lens(es) to read |
| `references/taste/<lens>/` | Vendored taste-skill reference knowledge (read on demand) |
| `.flowcode/ui/ui-mockup-discipline.md` | Filenames, layout, `data-testid`, breakpoints, MCP prefs |
| `.flowcode/ui/ui-workflow.md` | The full UI lifecycle this skill plugs into |

## Non-Goals

- Do not generate production-framework components — mockups are vanilla HTML specs.
- Do not invent design tokens — ground in the design system or stop and harvest one.
- Do not load every taste lens — read only the ones the brief selects.
- Do not block on a missing Tier-B engine — degrade gracefully to Tier A + house style.

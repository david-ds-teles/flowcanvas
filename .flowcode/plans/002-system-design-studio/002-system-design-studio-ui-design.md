---
name: 002-system-design-studio-ui-design
description: UI design artifact for Flowcanvas System Design Studio (v2) — the five new agent/relation surfaces (Submit, change-review, typed-edge affordance, reference-navigation chip, template library) over the nyx glass shell; three iterations for operator selection.
status: draft
tags: [ui-design, frontend, mockups, canvas, agent, mcp, nyx]
links: [.flowcode/plans/002-system-design-studio/002-system-design-studio-plan.md, .flowcode/ui/ui-workflow.md, .flowcode/ui/ui-mockup-discipline.md, .flowcode/ui/ui-design-system.md]
---

# 002-system-design-studio — System Design Studio UI Design

- Adds five surfaces to the v0.1 nyx canvas: Submit-to-agent, agent change-review/diff, typed-relationship edge affordance, reference-navigation ↗ chip (focus-or-add), and the template library.
- Three iterations authored and ready for operator selection — they differ in where the agent surfaces live, not in the visual language (all nyx-conformant against `ui-design-system.md`).
- The chosen iteration's `data-testid` names and tokens carry verbatim into implementation; rejected iterations stay in the folder as history.
- Reuses the v0.1 glass shell (§7), `fc-node`, `fc-edge-label`, `agent-panel`, and reader prose unchanged; the new surfaces are additive overlays.
- Desktop-only (≥1024 / ≥1440), per `ui-design-system §6`; no mobile.
- Status: **draft** — operator must select one iteration before it flips to `approved` and the plan is unblocked.
- Sibling plan: `002-system-design-studio-plan.md` (created after this design + the sibling technical design are approved).

---

## Context

v0.1 ships the nyx glass board with a clipboard agent round-trip in the right `agent-panel` (Export brief / Import response — `components/canvas/export-panel.tsx`). v2 makes the canvas the authoritative relation graph and runs the round-trip natively over MCP. That introduces five UI surfaces the v0.1 shell has no home for: a **Submit** kickoff (intent + send), a **change-review** surface to accept/discard an agent round, a **typed-relationship** affordance on edges (the `rel` enum from the design's Decision 7), a **reference-navigation** chip that focuses-or-adds a referenced node (Decision 9), and the **template library** (Decision 8).

These are additive — the fixed shell (full-viewport void, dot grid, 56px toolbar, right drawers) is unchanged. The three iterations explore *where* each surface lives (right drawer family vs focused stepper vs command palette/dock), which is the real UX decision; the tokens, glass mechanics, and component shapes are identical and nyx-locked across all three.

---

## Screens & States

### Screen: The Canvas (v2 surfaces over the fixed nyx shell)

**Purpose:** kick off an agent round, review the result, link/navigate typed relationships, and instantiate templates — all reading/writing the one canvas graph.

**States covered (per iteration mockup):** `submit` · `change-review` (added / updated / removed / file / comment entries) · `templates` (kind-filtered library) · `typed-edge` (rel picker open) · `reference-navigation` (focus vs add) · `empty` · `loading` (agent working) · `error` (stale-round / briefId mismatch).

**Mockup assets (three iterations — all five surfaces + the eight states in each):**
- `.flowcode/plans/002-system-design-studio/mockups/01-studio-drawer.html`
- `.flowcode/plans/002-system-design-studio/mockups/02-review-stepper.html`
- `.flowcode/plans/002-system-design-studio/mockups/03-command-spotlight.html`

**Iteration directions:**

| Iteration | Direction | Tradeoff |
|-----------|-----------|----------|
| `01-studio-drawer.html` | Every agent surface in the right glass drawer family (extends `agent-panel`); review is a scrollable list + stepper; rel-picker popover off the edge label; templates a right drawer | Most cohesive with v0.1 drawers; lowest build risk; review can feel cramped on a large round |
| `02-review-stepper.html` | Change-review is a focused, full-height centered stepper (one change, big before/after, filmstrip); Submit a bottom command bar; templates a left rail; rel a segmented control | Best for careful, change-by-change review; Submit/templates split across three edges adds spatial load |
| `03-command-spotlight.html` | Submit a center command palette (⌘K); review a grouped overlay inspector (sections by kind, expand a row for the diff); templates a bottom dock; rel a quick-pick gem flyout | Fastest kickoff + whole-round scannability; overlays dim the board more aggressively |

**Selected iteration:** _pending operator selection_ — present all three; on sign-off, record the choice here and flip `Status:` to `approved`. **Designer recommendation:** `01-studio-drawer.html` — it reuses the proven v0.1 drawer pattern (lowest implementation risk, one panel idiom to learn), and the change-review list+stepper scales to large rounds; pull the grouped-by-kind inspector idea from `03` into it if the operator wants whole-round scannability.

**Key elements (data-testid carried to implementation, consistent across iterations):**
- **Submit** — `toolbar-submit`, `submit-panel`, `submit-intent`, `submit-send`, `submit-mcp-status`, `submit-scope` (03).
- **Change-review** — `review-panel`, `review-item`, `review-prev` / `review-next` (stepper), `review-filter-{all,nodes,edges,comments,files}`, `review-accept`, `review-discard`, `review-close`.
- **Typed edge** — `edge-rel-pill` (the label shows the `rel` eyebrow + free-form text), `edge-rel-picker`, `edge-rel-option` (one per `RelationshipType`), `edge-label-input`.
- **Reference navigation** — `link-chip` (the ↗ chip), `refnav-focus`, `refnav-add` (or the chip's on/off focus-or-add state).
- **Templates** — `toolbar-templates`, `template-tray`, `template-card`, `template-instantiate`, `template-kind-filter`, `template-close`.
- **Bundle** — `toolbar-bundle` (File-menu / toolbar entry → `GET /api/canvas/bundle`).

---

## Responsive Breakpoints

| Name | Width | Mockup File |
|------|-------|-------------|
| desktop | 1280px | `mockups/01-studio-drawer.html` (fluid; 02 + 03 likewise) |
| large | 1440px | same — no layout change, more canvas |

Desktop-first canvas; the board fills the viewport at both sizes. **Mobile is out of scope (v2)** per `ui-design-system §6` — do not author mobile mockups. Each mockup is a single fluid layout that covers both breakpoints.

---

## Interaction Contract

**User flows:**

1. **Submit a round** — `toolbar-submit` (or ⌘K in 03) → enter intent → `submit-send` → board saves (rev N), snapshot captured, active-board pointer written → `loading` → review opens.
2. **Review a round** — step / filter through `review-item` entries (added/updated/removed nodes+edges, generated files, comments) → `review-accept` (keep) or `review-discard` (restore snapshot + delete round-generated files).
3. **Type a relationship** — click `edge-rel-pill` → `edge-rel-picker` → choose `edge-rel-option` (sets `meta.rel`) → optional `edge-label-input` (free-form display, defaults to the type) → apply.
4. **Navigate a reference** — click a `link-chip` (frontmatter or reader-prose link) → if the target node is on-board it focuses (select + center); else it adds the node near the source and draws a `references` edge back. One action.
5. **Instantiate a template** — open `template-tray` → filter by `template-kind-filter` → drag a `template-card` onto the board (or `template-instantiate`) → fresh-id clone at the drop point (document kind also writes its md scaffold).
6. **Export a bundle** — `toolbar-bundle` → `GET /api/canvas/bundle` streams the portable zip.

**Keyboard / accessibility:**
- ⌘↵ / ⌘K submits (per iteration); `Esc` closes any overlay (submit / review / templates / rel-picker) and returns to `loaded`.
- Visible 2px `--color-primary` focus ring on every interactive element; `aria-pressed` on rel options + filters + scope toggles; `aria-label` on icon-only buttons; touch targets ≥44px; `prefers-reduced-motion` honored (drawer transitions + spinner become instant).
- Relationship type is signalled by the mono eyebrow text + edge stroke style, not color alone; review entry kind by the add/upd/rem badge text + color.

**Validation & error surfaces:**
- MCP sidecar down → `submit-mcp-status` shows an amber "MCP off" pill; Submit explains harness-relay is required.
- Stale round (`briefId`/`baseRevision` mismatch) → `error` frame + an amber banner in the review report; proceed last-writer-wins or re-submit.
- Discard round → confirm the file deletions named in the review before rollback.

---

## Design System / Component Reuse

| Need | Existing component | Status |
|------|-------------------|--------|
| Submit panel | glass `agent-panel` drawer (`export-panel.tsx`) | extend (add Submit tab/surface) |
| Change-review | glass drawer / overlay + report styles | new (`review-panel.tsx`) |
| Typed-edge affordance | `fc-edge-label` + inline editor (`labeled-edge.tsx`) | extend (rel picker) |
| Reference ↗ chip | `fc-link-chip` (`frontmatter-view.tsx`) | extend (clickable + focus-or-add) |
| Template library | glass drawer/dock + card grid | new (`template-tray.tsx`) |
| Bundle export entry | toolbar File menu (`canvas-toolbar.tsx`) | extend |

All new surfaces use the existing nyx primitives: glass fill + blur + 1px gradient edge, `--glow-indigo` hover, indigo-gradient primary buttons, mono metadata, the §2 token palette. No new visual language.

---

## Design Tokens Introduced

No new color/spacing/type tokens — every value resolves to an existing `ui-design-system §2/§4` nyx token. Two semantic *reuses* worth noting for implementation:

| Token | Value | Rationale |
|-------|-------|-----------|
| `--color-neon-lime` | `#b6f36a` | "added" review badge + Accept action (settled/positive) — matches existing resolved/success usage |
| `--color-tertiary-cont` | `#ff516a` | "removed" badge + Discard action (destructive) — matches existing comment/destructive usage |

The "updated" badge reuses `--color-neon-cyan` (in-flight/agent), consistent with the agent-edge accent.

---

## Visual Parity

Populated during phase-close visual-parity checks (`ui-workflow.md §3`), using the headless-Chrome + pure-Node CDP capture path established in plan 001 (`001-initial-architecture-ui-design.md § Visual Parity`).

**Capture location:** `.flowcode/plans/002-system-design-studio/mockups/captures/phase-{N}/`

| Phase | Expected drift (placeholder → real data) | Acceptable drift (explicit accept) | Regressions (must fix before phase-done) |
|-------|-------------------------------------------|-------------------------------------|-------------------------------------------|
| (per plan) | | | |

Regressions link to their finding-as-section entry in `002-system-design-studio-qa-report.md`.

---

## Open Questions

- [ ] Operator selects one of the three iterations (designer recommends `01-studio-drawer.html`); record the choice + flip `Status:` to `approved`.
- [ ] `flowcode:ui-mockups` composer skill was not dispatchable in this pass — the three iterations were hand-authored per `ui-workflow.md` (Required-MCPs fallback) against `ui-design-system.md`. Re-run through the composer if richer live-engine taste exploration is wanted before lock-in.
- [ ] Confirm the change-review surface placement for very large rounds (50+ changes) — does the chosen iteration need pagination / virtualized list, or is the kind-grouped inspector (`03`) the better base?

---
name: 002-system-design-studio-ui-design
description: UI design artifact for Flowcanvas System Design Studio (v2) — the five new agent/relation surfaces (Submit, change-review, typed-edge affordance, reference-navigation chip, template library) over the nyx glass shell; four genuinely-distinct full-tool iterations for operator selection.
status: approved
tags: [ui-design, frontend, mockups, canvas, agent, mcp, nyx]
links: [.flowcode/plans/002-system-design-studio/002-system-design-studio-plan.md, .flowcode/ui/ui-workflow.md, .flowcode/ui/ui-mockup-discipline.md, .flowcode/ui/ui-design-system.md]
---

# 002-system-design-studio — System Design Studio UI Design

- Adds five surfaces to the v0.1 nyx canvas: Submit-to-agent, agent change-review/diff, typed-relationship edge affordance, reference-navigation ↗ chip (focus-or-add), and the template library.
- Four exploratory iterations + a selected fusion — each exploratory iteration is a **genuinely-distinct product IA** (board-hero diagram / tri-pane model-IDE / agent-round-loop / spec↔canvas split), not the same board with a panel moved. All render the **same full, dense decomposed system** (a "Commerce Platform" — 4 subsystem groups, ~14 varied nodes, 10 typed edges, provenance, enriched legend + minimap) and carry **all five v2 surfaces**, nyx-token-locked against `ui-design-system.md`.
- **Selected:** the operator chose the **fusion of `01` (clean canvas) + `02` (premium, complete workbench)** → `05-studio-canvas.html`: the diagram-first canvas hero inside the tri-pane workbench shell, with collapsible rails toggling `canvas-focus` ⇄ `workbench`.
- Supersedes the first hand-authored set (`studio-drawer` / `review-stepper` / `command-spotlight`), which was rejected for varying only by **agent-panel placement** over a near-empty 2–3-node board — it failed the "three distinct directions" rule (`ui-mockups §4` / `ui-workflow §1`) and did not depict a full system-design tool.
- The chosen iteration's `data-testid` names and tokens carry verbatim into implementation; rejected iterations stay in the folder as history.
- Reuses the v0.1 glass shell (§7), `fc-node`, `fc-edge-label`, `agent-panel`, and reader prose unchanged; the new surfaces are additive overlays.
- Desktop-only (≥1024 / ≥1440), per `ui-design-system §6`; no mobile.
- Status: **approved** — operator selected `05-studio-canvas.html` (the `01`+`02` fusion) on 2026-06-27; the UI direction is locked. The plan is unblocked once the sibling `002-system-design-studio-design.md` (technical design) is also approved.
- Sibling plan: `002-system-design-studio-plan.md` (created after this design + the sibling technical design are approved).

---

## Context

v0.1 ships the nyx glass board with a clipboard agent round-trip in the right `agent-panel` (Export brief / Import response — `components/canvas/export-panel.tsx`). v2 makes the canvas the authoritative relation graph and runs the round-trip natively over MCP. That introduces five UI surfaces the v0.1 shell has no home for: a **Submit** kickoff (intent + send), a **change-review** surface to accept/discard an agent round, a **typed-relationship** affordance on edges (the `rel` enum from the design's Decision 7), a **reference-navigation** chip that focuses-or-adds a referenced node (Decision 9), and the **template library** (Decision 8).

These are additive over the fixed nyx primitives (full-viewport void, dot grid, 56px toolbar, glass nodes/edges/drawers). The **real UX decision is the product's organizing principle** — how the authoritative design graph and the agent loop are foregrounded — so the four iterations explore four different information architectures, each rendering a *full* decomposed system on the board rather than a 2–3-node placeholder. The tokens, fonts, glass mechanics, and component shapes are identical and nyx-locked across all four; only the IA, layout, and what is foregrounded differ.

---

## Screens & States

### Screen: The Canvas (v2 surfaces over the fixed nyx shell)

**Purpose:** kick off an agent round, review the result, link/navigate typed relationships, and instantiate templates — all reading/writing the one canvas graph.

**States covered (per iteration mockup):** `submit` · `change-review` (added / updated / removed / file / comment entries) · `templates` (kind-filtered library) · `typed-edge` (rel picker open) · `reference-navigation` (focus vs add) · `empty` · `loading` (agent working) · `error` (stale-round / briefId mismatch).

**Mockup assets (four exploratory iterations + the selected fusion — every state, all five v2 surfaces, the same full Commerce-Platform board in each):**
- `.flowcode/plans/002-system-design-studio/mockups/01-architecture-canvas.html`
- `.flowcode/plans/002-system-design-studio/mockups/02-studio-workbench.html`
- `.flowcode/plans/002-system-design-studio/mockups/03-agent-design-loop.html`
- `.flowcode/plans/002-system-design-studio/mockups/04-spec-canvas.html`
- `.flowcode/plans/002-system-design-studio/mockups/05-studio-canvas.html` ← **selected** (fusion of 01 + 02)

**Iteration directions (each a distinct product IA, not a panel-placement variant):**

| Iteration | Organizing principle | Tradeoff |
|-----------|----------------------|----------|
| `01-architecture-canvas.html` | **Board-hero / diagram-first.** The dense decomposed architecture IS the screen — subsystem group containers, the full typed-edge graph + enriched legend + minimap dominate; v2 surfaces are lightweight & contextual (rel-picker popover, ref-nav chips on nodes, Submit/Templates/Review as right glass drawers over a dimmed board). | Reads instantly as a real system-design tool; lowest new-shell risk (reuses v0.1 board chrome). Review/templates compete with the board for the right edge on large rounds. |
| `02-studio-workbench.html` | **Tri-pane model-IDE.** Left structure rail (design graph as a collapsible subsystem→node outline) · center canvas · right persistent inspector (selected node's IN/OUT typed relations, `meta.source` provenance, refs; Submit/Review as inspector modes). Navigate the architecture both structurally and spatially. | Best for large graphs + relation/provenance editing; the model tree scales. Densest shell — three panes shrink the canvas; highest build cost. |
| `03-agent-design-loop.html` | **Agent-round-loop / copilot.** The human↔agent cycle is the spine: a round-history rail (R1…Rn, intent + ±diff + rev window), Submit as the first-class command, change-review as the centerpiece diff; the board highlights the current round's agent additions (glowing). | Best for iterative agent-driven design + careful round review; foregrounds the v2 thesis. Round rail + review claim screen real-estate from the static board. |
| `04-spec-canvas.html` | **Spec ↔ canvas split (document-grounded).** The source design.md renders as flawless nyx prose on the left with live, clickable in-prose reference chips (focus-or-add on the board); the decomposed board sits on the right with `source` provenance chips that scroll the spec to their heading. Extraction + ref-nav + reconcile are the spine. | Best embodiment of "canvas as a true view over real md" + reference navigation + disk reconcile; the two panes stay in sync. Half the width goes to the doc; least canvas room of the four. |
| `05-studio-canvas.html` ← **selected** | **Studio Canvas — fusion of 01 + 02 (best of both).** The premium, complete tri-pane workbench shell from `02` (structure rail · canvas · relation/provenance inspector; Submit/Review as inspector modes; templates docked in the rail) wrapped around the **clean, diagram-first canvas hero from `01`**. Both side rails are **collapsible** via `toggle-rail-left` / `toggle-rail-right`: expanded = full Studio Workbench, collapsed (`canvas-focus`) = near-full-width clean Architecture Canvas — one surface that is either, on demand. | Delivers operator-chosen "clean canvas + premium complete experience" in one shell; the collapse mechanic resolves the tri-pane-vs-canvas-room tradeoff. Slightly more interaction surface to build (rail-collapse state machine). |

**Selected iteration:** `05-studio-canvas.html` — the operator chose the **fusion of `01-architecture-canvas` (clean, diagram-first canvas) and `02-studio-workbench` (premium, complete tri-pane experience)**; `05` realizes that as one shell with collapsible rails (`canvas-focus` ⇄ `workbench`). Iterations `01`–`04` stay in the folder as the explored history. Approved by the operator on 2026-06-27 — `Status:` flipped to `approved`; `05`'s `data-testid` names + tokens carry verbatim into implementation (collapsed rails confirmed as thin clickable icon rails, not fully hidden). A later phase may still graft in `03`'s round-history strip once multi-round iteration matters.

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
| desktop | 1280px | `mockups/01-architecture-canvas.html` (fluid; 02 / 03 / 04 likewise) |
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

- [x] Operator selected `05-studio-canvas.html` (fusion of `01` clean canvas + `02` premium workbench) on 2026-06-27; choice recorded + `Status:` flipped to `approved`.
- [ ] Iterations rebuilt 2026-06-27: the first hand-authored set varied only by agent-panel placement over a near-empty 2–3-node board and was rejected (did not depict a full system-design tool; failed the "distinct directions" rule). The replacement set gives four distinct product IAs, each rendering the full decomposed Commerce-Platform board + all five v2 surfaces, grounded verbatim in the v0.1 nyx primitives (`04-nyx-neon.html`). Still hand-authored against `ui-design-system.md` (the `flowcode:ui-mockups` composer's live taste engines were not dispatchable this pass) — re-run through the composer if richer taste exploration is wanted before lock-in.
- [ ] Confirm the change-review surface for very large rounds (50+ changes) — virtualized list vs. the kind-grouped inspector — once an iteration is chosen.
- [ ] If `01` is chosen, decide whether to graft in `02`'s relation/provenance inspector and `03`'s round-history strip now or defer to a later phase.

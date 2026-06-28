---
name: 004-generation-loop-ui-design
description: UI design artifact for the Markdown-Core Generation Loop — one nyx mockup rendering the reframe: a system-design canvas of kind-typed component widgets generated from a living, editable, bidirectionally-linked core-markdown spine, plus the Agent Generation Kit and frictionless import surfaces.
status: draft
tags: [ui-design, frontend, mockups, canvas, mcp, nyx]
links: [.flowcode/plans/004-generation-loop/004-generation-loop-plan.md, .flowcode/ui/ui-workflow.md, .flowcode/ui/ui-mockup-discipline.md]
---

# 004 — Markdown-Core Generation Loop UI Design

- One high-fidelity nyx mockup (the language selected in plan 003) rendering the full reframe at real density, built from the verbatim `@theme` tokens + the nyx component language — `mockups/01-generation-loop.html`.
- The canvas is now a **system-design diagram**: kind-typed component widgets (service · datastore · queue · actor · external · decision) with distinct icon/shape/accent + a `§section` provenance chip — not markdown-file cards.
- The right pane is the **living Core-Doc spine** (docked, not an overlay): full-fidelity render, Edit toggle, dirty indicator, "Submit changes" (re-submit over MCP), and per-section highlight.
- **Bidirectional linking**: selecting a component highlights its section in the spine (and a "↔ linked to §…" tag); the canvas widget shows a matching link tag.
- The **Agent Generation Kit** is a discoverable modal (System prompt · Schema contracts · MCP loop · Worked example · + your markdown) with one-click "Copy full kit" AND the MCP surface (`get_generation_kit()` · `flowcanvas://generation-kit`).
- **Frictionless import** modal: Paste JSON · Upload `.canvas` · Drag-drop, with the extension-dispatch guarantee (md/images still add as nodes) and the zod-validate + `0.x → 0.3` migration note.
- A MOCKUP-CONTROLS bar steps through the states: Overview · Kinds · Linking · Edit core · Generation Kit · Import.
- Status draft; author agent (built in the main session from the nyx language + the 004 design); dated 2026-06-28.
- Sibling plan: `004-generation-loop-plan.md`.

---

## Context

Plan 004 turns the canvas from "an arrangement of markdown-file cards" into a system-design diagram generated from a core markdown doc, with that doc as the living, editable, linked spine (per `004-generation-loop-design.md`). The UI must make five things first-class and visible: kind-typed component widgets, the docked core-doc spine, bidirectional linking, the discoverable Agent Generation Kit, and three import paths. This is one composed screen with modal surfaces, in the nyx language.

## Screens & States

### Screen 1: Studio — system-design canvas + living core spine

**Mockup:** `mockups/01-generation-loop.html` (self-contained; MOCKUP-CONTROLS bar switches states).

**States covered:**

- **Overview** — left component rail (by subsystem, kind-dot) · center canvas of kind-typed widgets in subsystem groups with typed rel-eyebrow edges · right Core-Doc spine rendering `commerce-design.md`, with the selected component's section highlighted.
- **Kinds** — the per-kind visual identity (service/datastore-cylinder/queue/actor/external-dashed/decision), icon + accent + kind label.
- **Linking** — component selected → its spine section gets the violet "↔ linked to …" highlight; the widget shows a matching link tag (bidirectional).
- **Edit core** — the spine flips to an editor; the dirty indicator lights and "Submit changes" activates (re-submit the revised markdown over MCP).
- **Generation Kit** — the kit modal: nav (System prompt · Schema contracts · MCP loop · Worked example · + your markdown) + "Copy full kit" + the `get_generation_kit()` / `flowcanvas://generation-kit` MCP affordance.
- **Import** — the import modal: Paste JSON · Upload `.canvas` · Drag-drop tabs, the drop target, "Validate & load", and the migration note.

**Key elements (testids for implementation):**
- `component-node` (per kind, `data-kind`), `component-source-chip` (→ `navigateRef`), `core-spine`, `spine-edit-toggle`, `spine-dirty`, `spine-submit`, `spine-section` (`data-anchor`, `is-linked`), `generation-kit-button` / `generation-kit-modal` / `kit-copy`, `import-button` / `import-modal` / `import-paste` / `import-upload` / `import-drop`.

## Interaction Contract

**User flows:**

1. Generate — open the Generation Kit → copy the full kit (system prompt + contracts + MCP how-to + worked example + the attached markdown) into any LLM, OR a connected harness fetches it via `get_generation_kit()` → the LLM returns an `AgentResponse` → import.
2. Import — paste a `FlowcanvasDoc` JSON, upload a `.canvas`, or drag-drop a `.canvas` onto the board → zod-validate → `0.x → 0.3` migrate → load. Md/image drops still add nodes (extension dispatch).
3. Read the system — components render kind-typed; each carries a `§section` chip → click scrolls/highlights the spine section.
4. Link both ways — select a component → its spine section highlights; select/hover a spine section → its component(s) highlight on canvas.
5. Co-design — edit the core doc in the spine → dirty flag → "Submit changes" ships the revised markdown over MCP → the agent reasons and returns an updated board through the existing change-review window.

**Keyboard / accessibility:**
- Spine editor, kit copy, import controls, and the edit/submit toggles carry `aria-label`/`aria-pressed`; visible focus rings (2px `--color-primary`), focus-only.
- The kit modal and import modal are dialogs (focus-trapped, `Esc` to close).

## Design System / Component Reuse

| Need | Existing component | Status |
|------|-------------------|--------|
| Component widget | node components (`nodes/*`) | new kind-aware `component-node.tsx` |
| Core-doc render | `lib/render-md.ts` + reader pipeline | reuse + `rehype-slug` for anchor ids |
| Re-submit over MCP | `submitToAgent` + change-review | reuse (spine edit feeds it) |
| Linking | `meta.source` + `navigateRef` + `refs.ts` | extend (reverse index) |
| Import | export-panel + `dropzone.tsx` | extend (paste/upload + extension dispatch) |
| Kit content | `AGENT_CONTRACT` (`brief.ts`) | promote to `lib/canvas/generation-kit.ts` |

## Design Tokens Introduced

| Token group | Value | Rationale |
|-------------|-------|-----------|
| `ComponentKind` accents | service=cyan · datastore=lime · queue=amber · actor=violet · external=rose · decision=indigo | Per-kind visual identity; reuses existing nyx accent tokens (no new palette) |

## Visual Parity

Required for every UI-touching plan; populated at phase close. Unlike 003 there is no "before" capture — these surfaces are new.

**Capture location:** `.flowcode/plans/004-generation-loop/mockups/captures/phase-{N}/`

| Phase | Expected drift | Acceptable drift | Regressions (must fix) |
|-------|----------------|------------------|------------------------|
| Phase 1 | | | |

## Open Questions

- [ ] Spine placement — docked right (shown) vs a left spine vs a toggleable full-height panel; confirm against the 003 inspector/structure rails so the studio doesn't over-crowd.
- [ ] Component widget density — how much role text shows at rest vs on hover/select (the mock shows a one-line role + source chip).
- [ ] Kit copy payload — whether the attached markdown is always inlined or linked when large (design Open Question).

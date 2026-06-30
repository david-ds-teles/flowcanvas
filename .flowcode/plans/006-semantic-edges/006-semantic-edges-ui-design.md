---
name: 006-semantic-edges-ui-design
description: UI design artifact for Semantic Edges & Connection Ports — connection-port dots, the on-canvas flow-type legend/picker, and the reusable color picker for plan 006-semantic-edges.
status: approved
tags: [ui-design, frontend, edges, ports, legend]
links: [.flowcode/plans/006-semantic-edges/006-semantic-edges-plan.md, .flowcode/ui/ui-workflow.md, .flowcode/ui/ui-mockup-discipline.md]
---

# 006-semantic-edges — Semantic Edges & Connection Ports UI Design

- Delivers three operator-locked canvas surfaces: dot-anchored **connection ports** (Phase 2), an on-canvas **flow-type legend that doubles as the edge-type picker** (Phase 3), and a reusable **`<ColorPicker>`** (Phase 3) shared by edges + node text/fill.
- Screens: the canvas (ports + typed edges + legend overlay), the edge style panel, the node format bar; single desktop breakpoint (the studio is a desktop-only canvas app).
- Status **approved**; author david-ds-teles; dated 2026-06-30.
- Gate: this artifact is the UI-gate spec for the frontend phases (2–3). It records the operator's locked decisions instead of a 3-mockup exploration — see § Reduced Exploration.
- Sibling plan: `006-semantic-edges-plan.md`.

---

## Reduced Exploration

The operator directed **direct execution** (no mockup-selection round) and locked every load-bearing visual decision up front via AskUserQuestion (2026-06-30). Per `ui-workflow.md § 1` ("If exploration must be reduced for the scope … note the reduced exploration"), the standard one-anchor-plus-two-explorations mockup set is intentionally skipped; this artifact captures the locked choices as the implementation spec, and phase-close visual parity is verified live (headless-Chrome CDP) against these choices rather than against static mockups.

**Locked decisions (operator, 2026-06-30):**

| Decision | Locked choice |
|----------|---------------|
| Legend palette | The 6 `EDGE_TYPE_STYLE` defaults as shipped (see § Legend Palette) |
| Legend placement | On-canvas **corner overlay** that doubles as the edge-type picker |
| Connection dots | **Subtle filled, always-visible** dots; arrowhead seats inside the dot |
| Color model | Type sets the default; the reusable picker overrides color per-edge (design D3) |
| Agent parity | Consolidated into Phase 4 (one coherent contract surface) |
| Shift-snap increment | 45° (design D5) |

---

## Screens & States

### Screen 1: Canvas — connection ports (Phase 2)

**Purpose:** every edge anchors to a real, reusable, movable dot on a node perimeter (replaces the 005 floating endpoints).

**States covered:** node with ports · node with no ports yet (faint side "add" handles only) · dragging a connection · Alt-dragging a dot · multiple dots on one side.

**Key elements:**
- **Port dot** (`.fc-port`) — always-visible subtle filled dot at `{side, t}`; the edge endpoint + arrowhead seat exactly here. Hover brightens; valid drop target turns cyan.
- **Side "add" handle** (`.fc-port-add`) — four faint per-side handles, hidden at rest, revealed on node-hover / connect-mode; dragging from/to one **creates** a new dot on that side (spread to a free `t`), so any node can start a connection.
- **Reuse-or-create** — dropping on an existing dot reuses it; dropping on a side handle creates a new dot. "More than one dot per side" falls out for free.
- **Alt-drag a dot** — slides it along its side; every edge anchored to it follows. (Plain drag = connect.)

### Screen 2: Canvas — flow-type legend / picker (Phase 3)

**Purpose:** read the board by color/line/head, and set an edge's flow type by clicking a legend row.

**States covered:** legend at rest · a row hovered · a row clicked while an edge is selected (applies the type).

**Key elements:**
- **Legend corner overlay** — a small pinned card listing each `EdgeType` → swatch (color + line + head). Always readable as a legend; clicking a row sets `meta.edgeType` on the selected edge (replaces the 005 rel pill/picker).

### Screen 3: Edge style panel + node format bar — reusable color picker (Phase 3)

**Purpose:** one shared `<ColorPicker>` (native `<input type=color>` + preset chips + clear) used by the edge color override and the node text/fill controls.

**Key elements:**
- **`<ColorPicker>`** — preset chips (the 6 nyx presets) + a custom native swatch + an optional "clear" (edge: back to the type default color).

---

## Responsive Breakpoints

| Name | Width | Notes |
|------|-------|-------|
| desktop | ≥1280px | The studio is a desktop-only canvas workbench; no mobile/tablet layout (consistent with plans 001–005). |

---

## Interaction Contract

**User flows:**

1. **Connect (reuse)** — drag from a port dot → drop on another node's port dot → edge anchors to both dots; arrowhead seats in the target dot.
2. **Connect (create)** — drag from a node's faint side handle → drop on a target's side handle → a new dot is created on each side; edge anchors to them.
3. **Move a dot** — Alt-drag a dot along its side → `movePort` updates `{side, t}`; anchored edges re-route to follow.
4. **Type an edge** — select an edge → click a legend row → `setEdgeType` applies `EDGE_TYPE_STYLE[type]` (color + line + head).
5. **Override color** — open the edge style panel → pick a color in `<ColorPicker>` → per-edge `color` overrides the type default; clear → back to type color.
6. **Shift-snap a bend** — hold Shift while dragging a line bend → segment angle snaps to 45° (already landed).

**Keyboard / accessibility:**
- Alt = move-dot modifier; Shift = snap-angle modifier. Legend rows + picker chips are buttons (focusable, `aria-pressed`).

**Validation & error surfaces:**
- Self-connections rejected (no self-loop edge). Dropping a connection on empty canvas creates nothing.

---

## Design System / Component Reuse

| Need | Existing component | Status |
|------|-------------------|--------|
| Connection dots | React Flow `<Handle>` | extend — one per port, custom `{side,t}` placement (`PortHandles`) |
| Color picker | `node-format-bar.tsx` native `<input type=color>` | extract → shared `components/ui/color-picker.tsx` |
| Legend / type picker | the 005 rel pill/picker (`labeled-edge.tsx`) | replace with an on-canvas legend bound to `EDGE_TYPE_STYLE` |
| Edge style panel | `EdgeStylePanel` (005) | extend — color via `<ColorPicker>`; type from the legend |

---

## Legend Palette

The single source of truth is `EDGE_TYPE_STYLE` (`lib/canvas/jsoncanvas.ts`). Locked values:

| EdgeType | Color | Line | Head |
|----------|-------|------|------|
| data-flow | cyan (preset `5`) | solid | arrow |
| request | amber (preset `2`) | solid | arrow-open |
| response | amber (preset `2`) | dotted | arrow-open |
| event | violet (preset `6`) | solid | diamond |
| dependency | muted grey `#8b93a7` | dashed | arrow |
| reference | muted grey `#6b7280` | dotted | circle |

---

## Design Tokens Introduced

| Token | Value | Rationale |
|-------|-------|-----------|
| (none) | — | Reuses existing nyx tokens + the 6 presets; dependency/reference use literal muted hex (no muted preset exists), passed through by `adapter.colorVar`. |

---

## Visual Parity

**Capture / verification:** live headless-Chrome CDP against the running app on `examples/commerce-platform.canvas` (the reduced-exploration substitute for static-mockup parity).

| Phase | Expected drift | Acceptable drift | Regressions |
|-------|----------------|------------------|-------------|
| Phase 2 | Real board data vs. spec illustration | — | none — CDP verified: dots render, edge seats in dot (0.4px), Alt-drag moves a dot, connect reuses/creates |
| Phase 3 | — | — | (verified at Phase 3 close) |

---

## Open Questions

- [x] Legend palette — locked (the 6 defaults).
- [x] Legend placement — locked (canvas corner overlay / picker).
- [x] Dot resting appearance — locked (subtle filled, always-visible).
- [x] Color model — locked (type default + per-edge picker override).

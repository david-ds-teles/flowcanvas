---
name: 006-semantic-edges-changelog
description: Per-phase changelog for 006-semantic-edges — file-level change record built incrementally and reconciled against code at plan completion.
status: active
tags: [changelog, changes, per-phase]
links: [.flowcode/plans/006-semantic-edges/006-semantic-edges-plan.md, .flowcode/plans/006-semantic-edges/006-semantic-edges-technical-overview.md]
---

# Changelog — 006-semantic-edges Semantic Edges & Connection Ports

- Reworks the 005-edges floating-edge model into dot-anchored connection ports, flow-typed edges, a reusable color picker, and Shift-snap angle alignment — with full human↔agent parity (digest finalized at plan completion).
- Type: FEATURE.
- Status active; dated 2026-06-30.
- Built incrementally per phase; reconciled against code at plan completion.
- Source plan: `006-semantic-edges-plan.md`.

---

## Summary

Reworked the canvas edge system into three operator-locked specs plus Shift-snap, schema `0.4 → 0.5`, and full human↔agent parity. Phase 1 landed the pure `0.5` foundation (`ConnectionPort`, the `EdgeType` flow taxonomy + `EDGE_TYPE_STYLE` legend, `ports.ts`, `snapAngle`, the migration that seeds ports + maps `rel → edgeType`, `normalizePorts`). Phase 2 made dots the live connection model (always-visible port handles, edges anchored at `portPoint`, reuse-or-create on connect, Alt-drag to move). Phase 3 made edges carry meaning (style resolved from `EDGE_TYPE_STYLE[edgeType]`, an on-canvas legend that doubles as the type picker, a reusable `<ColorPicker>` shared by edges + node text/fill, rel→edgeType UI). Phase 4 closed agent parity (`edgeType` in `AgentEdge`/`BriefEdge` + buildBrief/applyResponse, the generation-kit contract + regenerated mirror doc, MCP passthrough) and verified all four specs end-to-end (CDP). Gates: tsc 0 · lint 0 · vitest 239/239 · build ok · smoke:mcp + smoke:render PASS · live CDP four-spec PASS.

---

## Phase 1 — Schema, Legend & Pure-Lib Foundation

Pure, side-effect-free `0.5` foundation: the connection-port + flow-typed-edge type system, a new pure port-geometry module, the `snapAngle` helper, the `0.4 → 0.5` migration that seeds ports and maps legacy `rel → edgeType`, the idempotent `normalizePorts`, and the validator enum — all unit-tested. Data leads, render follows: opening a board now migrates it to `0.5` (ports seeded, `edgeType` mapped) while rendering still floats until Phase 2.

| File | Type | Summary |
|------|------|---------|
| `lib/canvas/jsoncanvas.ts` | modified | Added `ConnectionPort`; the `EdgeType` flow taxonomy (`EDGE_TYPES`) + `EdgeTypeStyle`/`EDGE_TYPE_STYLE` legend + `REL_TO_EDGE_TYPE` map; extended `NodeMeta.ports?`, `CanvasEdge.fromPort?`/`toPort?` + `meta.edgeType?`; `SCHEMA_VERSIONS` and `FlowcanvasExt.schemaVersion` widened to `'0.5'`. |
| `lib/canvas/ports.ts` | created | Pure port geometry (no DOM/React): `portPoint`, `sideAndT`, `portAt` (reuse-within-hitRadius), `autoPort` (geometric default side/t). The single geometric source of truth for edge endpoints. |
| `lib/canvas/ports.test.ts` | created | Vitest for all four `ports.ts` functions — perimeter points per side, nearest side/t, hit-radius reuse vs null, geometric auto-side. |
| `lib/canvas/edge-geometry.ts` | modified | Added `SNAP_STEP_DEG` (45°) + `snapAngle(prev, p, stepDeg?)` — snaps a segment's angle to the nearest step multiple, length-preserving (consumed by the Phase 3 waypoint drag). |
| `lib/canvas/edge-geometry.test.ts` | modified | Added `snapAngle` cases: 45° snap, length preserved, zero-length returns `p`. |
| `lib/canvas/migrate.ts` | modified | Added private `ensurePort`/`seedSideT`/`seedEdgePorts` (+ `PORT_T_TOL`); the `0.4 → 0.5` ladder step (seed a port per endpoint, map `rel → edgeType`); exported `normalizePorts` (load-time idempotent port guarantee, no version bump). |
| `lib/canvas/migrate.test.ts` | modified | Re-targeted the existing ladder cases to `'0.5'`; added the worked `0.4 → 0.5` case (ports seeded + `edgeType:'request'`) and a `normalizePorts` idempotency test. |
| `lib/canvas/validate.ts` | modified | `schemaVersion` zod enum widened to include `'0.5'`; new port/edgeType fields ride the existing `.passthrough()` (not modeled). |
| `lib/canvas/validate.test.ts` | modified | Accepted-version loop now covers `0.1`–`0.5`; added a passthrough round-trip assertion for `fromPort`/`toPort`/`meta.edgeType`/`meta.ports`. |

---

## Phase 2 — Ports Rendering & Interaction

Turns the Phase-1 seeded ports into the live connection model: per-port React Flow handles (always-visible dots), edges anchored to the dots (arrowheads seat inside, drop the floating endpoint math), reuse-or-create on connect, and Alt-drag to slide a dot. The demo board upgraded to `0.5` (ports seeded) and is the Phase 2 showcase fixture.

| File | Type | Summary |
|------|------|---------|
| `lib/canvas/store.ts` | modified | Port helpers (`firstFreeT`, `portForConnect`, `portIdMint`); `onConnect` rewritten to reuse an existing dot or create one on a side handle (default `edgeType:'reference'`); `load` runs `normalizePorts` (persists when seeded); `newBoard` born at `'0.5'`; new `addPort`/`movePort` actions. |
| `lib/canvas/adapter.ts` | modified | Resolves `fromPort`/`toPort` → `{side,t}` into edge data (`fromPortST`/`toPortST`) so the renderer anchors at the dot lag-free; `sourceHandle`/`targetHandle = fromPort ?? fromSide`; passes `edgeType`. |
| `components/canvas/nodes/port-handles.tsx` | created | Shared `<PortHandles>` — one always-visible dot per port (handle id = port id) + 4 faint side "add" handles; dots carry `data-fc-portid`/`data-fc-nodeid` for the Alt-drag listener. |
| `components/canvas/nodes/node-frame.tsx` | modified | `NodeResizeFrame` takes `node` and renders `<PortHandles>` instead of 4 fixed side handles (suppressed in comment mode). |
| `components/canvas/nodes/{group,fallback}-node.tsx` | modified | Render `<PortHandles>` in place of their own 4 side handles. |
| `components/canvas/nodes/{markdown,note,image,link,component}-node.tsx` | modified | Pass `node` to `NodeResizeFrame`. |
| `components/canvas/edges/labeled-edge.tsx` | modified | Endpoints computed via `portPoint(liveRect, {side,t})` from edge data; floating-perimeter math kept only as the port-less/legacy fallback. |
| `components/canvas/use-canvas-handlers.ts` | modified | One window CAPTURE-phase pointerdown listener: Alt-drag on a `.fc-port` slides the dot (`movePort`) and suppresses RF's connect-start via `stopPropagation`. |
| `app/styles/edges.css` | modified | `.fc-port` always-visible subtle dot styling; `.fc-port-add` keeps the at-rest-hidden / hover-reveal behavior. |
| `lib/canvas/store.test.ts` | modified | `onConnect` now asserts created ports + `edgeType:'reference'`; new `addPort`/`movePort` + reuse + spread-second-dot tests. |
| `app/api/routes-contract.test.ts` | modified | Demo board GET now returns `schemaVersion:'0.5'` (open-migration persisted ports). |
| `examples/commerce-platform.canvas` | modified | Upgraded `0.4 → 0.5` (ports seeded, `rel → edgeType`) — the Phase 2 ports showcase fixture. |

---

## Phase 3 — Semantic Typing, Legend UI & Reusable ColorPicker

Edges now carry meaning: the `EdgeType` taxonomy drives each edge's default {color, line, head}; an on-canvas legend doubles as the type picker; a reusable `<ColorPicker>` is shared by edges + node text/fill; the rel pill/picker is replaced by an edgeType pill/picker. (Shift-snap was wired earlier.)

| File | Type | Summary |
|------|------|---------|
| `lib/canvas/store.ts` | modified | New `setEdgeType(id, type)`: sets `meta.edgeType` and clears the per-edge overrides it supersedes (`color`, `meta.line`, `fromEnd`, `toEnd`) so the edge reads as its type; the picker re-overrides colour after. |
| `components/ui/color-picker.tsx` | created | Shared `<ColorPicker>` — preset chips + native `<input type=color>` + optional clear. Reused by the edge style panel and node-format-bar. |
| `components/canvas/legend.tsx` | created | `<EdgeLegend>` — on-canvas corner overlay listing the 6 `EdgeType`s (swatch = colour+line+head); reads the selected edge via RF `useStore`; clicking a row sets that edge's flow type (rows disabled when no edge is selected). |
| `components/canvas/canvas-shell.tsx` | modified | Mounts `<EdgeLegend>` in the canvas centre pane. |
| `components/canvas/edges/labeled-edge.tsx` | modified | Style resolved `per-edge override → EDGE_TYPE_STYLE[edgeType] → provenance` (stroke/line/markers); `RelPicker` → `EdgeTypePicker` (6 types + label field); rel pill → type pill; action-bar `rel ▾` → `type ▾`; `EdgeStylePanel` colour swatches → shared `<ColorPicker>`. |
| `components/canvas/nodes/node-format-bar.tsx` | modified | Node text + fill colour use the shared `<ColorPicker>` (the same component as the edge colour). |
| `app/styles/studio-edge.css` | created | Legend (top-left corner overlay) + ColorPicker styling; registered in `app/globals.css`. |
| `lib/canvas/store.test.ts` | modified | `setEdgeType` clears-superseded-overrides test. |

---

## Phase 4 — Agent Parity, Contract & Verification

| File | Type | Summary |
|------|------|---------|
| | | |

---

## Reconciliation

Code Explorer audit (2026-06-30): **34/34 plan files present and spec-matching.** Documented divergences (all in the technical-overview Deviations + phase logs): (1) the design's aspirational `connectPort` public store action was folded into the private `portForConnect` (sole caller is `onConnect`); (2) the legend is pinned top-left (bottom-left fell below the fold / collided with RF Controls — CDP-diagnosed); (3) `fc-relpick*`/`fc-edge-label__rel` CSS classes kept as stable handles across the rel→type rename; (4) Phase-4 review folded into the plan-completion review; (5) `app/styles/studio-edge.css` is a net-new partial (logged, +1 `@import`). Side effect: opening boards during verification migrated `examples/commerce-platform.canvas` (adopted as the `0.5` showcase) and the default `flowcanvas.canvas` / `boards/msgflow-mvp.canvas` to `0.5` on disk — expected open-migration behavior. Otherwise per-phase entries match the code.

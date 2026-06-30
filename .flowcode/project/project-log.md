---
name: project-log
description: Project-level chronological log of plan completions, bootstraps, and fixes — the brief cross-plan history record.
status: active
tags: [project-log, history, logging, knowledge-base]
links: [.flowcode/templates/project-log-template.md, .flowcode/plans/plan-instructions.md]
---

# Project Log

- Project-level log: reverse chronological, most recent entry on top, new entries always added directly below this header.
- Scope is project-wide only — `[PLAN COMPLETE]`, `[BOOTSTRAP]`, `[BUGFIX]`, `[QUICKFIX]`; per-phase entries belong in the plan's own `{PREFIX}-log.md`.
- Use the entry templates in `.flowcode/templates/project-log-template.md`.

---

## [BUGFIX] Node + group resize — markdown card honors its box; group auto-grows to fit its components — 2026-06-30

**Dev:** david-ds-teles <david.ds.teles@gmail.com>
**Cause:** Two operator-reported resize defects, surfaced in sequence. (1) A markdown card was content-sized — the adapter emitted `height: undefined` (RF auto-measures) and the body was capped by a `max-height` *ceiling* — so a dragged height never stuck: during drag only the fence grew, and on drop the height reverted to the text's content height (width worked, it was always explicit). Component widgets (`.fc-cmp` `height:100%` + explicit RF height) were unaffected. (2) Once height-resize worked, a child INSIDE a group was clamped by the group box — the adapter set `extent:'parent'` on children, so the boundary capped the resize instead of adapting to it.
**Fix:** (1) An EXPANDED markdown card now keeps its authored box like every other node — adapter emits `height: n.height` (collapsed → `undefined`, header only, so the collapse toggle still shrinks it); `.fc-node` gets `height:100%` and `.fc-node__body` flex-fills (`min-height:0`) instead of the `max-height` ceiling (`--fc-body-max` retired). (2) Dropped `extent:'parent'` so a child is not clamped; the group auto-grows to enclose its children via pure `fitGroupToChildren` (GROW-ONLY — expands to contain a spilling child, never shrinks a roomy box) wired into `setNodeSize` (child resize) + a new `fitGroups` action called from `onNodeDragStop` (child drag). `GROUP_PAD`/`GROUP_LABEL_PAD` exported from `layout` for reuse.
**Affected:** `lib/canvas/{adapter,store,layout}.ts`, `components/canvas/use-canvas-handlers.ts`, `app/styles/nodes.css`; tests `lib/canvas/{adapter,store}.test.ts` (+4). Gates: tsc 0 · lint 0 · vitest 249/249 · build ok. NOT yet gesture-verified (no Playwright/CDP in env) — markdown resize is implicitly confirmed (operator hit the group clamp while resizing a card); group auto-grow pending a live gesture check per [[verify-interactions-end-to-end]].

---

## [QUICKFIX] Agent generation quality — compliance-forced spec · server-side quality net · visible contract sync — 2026-06-30

**Dev:** david-ds-teles <david.ds.teles@gmail.com>
**Root cause:** Operator-reported low-quality agent boards (`boards/brasilog-design.canvas`): boundary groups with **0** member nodes (no `parentId`), all 12 edges forced to `toEnd:"arrow"` (overriding the semantic legend), zero notes. Verified **not** a stale-MCP/deployment lag — `.mcp.json` runs `npx tsx mcp/flowcanvas-mcp.ts` against the working tree, so a respawned sidecar serves the live `kitSections()`. The agent received the current spec and ignored the load-bearing **visual** rules buried in dense prose. Spec-served ≠ spec-followed ([[mcp-spec-served-not-followed]]).
**Fix:** (A) `generation-kit.ts` — rewrote `SYSTEM_PROMPT` (visual-diagram, use-all-resources framing) + front-loaded a RETURN CHECKLIST (parentId mandatory · omit fromEnd/toEnd · notes · coreDocPath) at the head of the schema contract. (B) `brief.ts` `applyResponse` — server-side quality net: infer a missing `parentId` by geometric containment, and new `MergeReport.warnings[]` flagging empty boundary groups, legend-overriding edge ends, and note-less component boards (returned over MCP so the agent self-corrects). (C) Visible sync — `buildContractDoc()` single source + `npm run gen:contract` + `contract-sync.test.ts` (fails the build on doc drift) + an MCP startup spec fingerprint. (D, separate commit) `canvas-shell.tsx` — read specs in place: single-click a file/component node → core spine (highlight its section); double-click → reader (debounced) ([[markdown-component-click-spec]]).
**Affected:** `lib/canvas/{brief,generation-kit}.ts` · new `scripts/gen-contract.ts` · new `lib/canvas/contract-sync.test.ts` · `lib/canvas/brief.test.ts` (+4) · `mcp/flowcanvas-mcp.ts` · `docs/flowcanvas-agent-contract.md` · `package.json` · `components/canvas/{canvas-shell,use-canvas-handlers}.tsx`. Bundles the prior uncommitted "MCP/agent spec sync" quickfix (same files). Gates: tsc 0 · lint 0 · vitest 245/245 (+6) · smoke:mcp 16/16 · contract-drift PASS. **D NOT yet gesture-verified** (no Playwright/CDP in env) — pending per [[verify-interactions-end-to-end]]. Untracked scratch boards (`brasilog-design.*`, `untitled-*.canvas`) left out. Commit to `main` per the repo's solo direct-to-main pattern.

---

## [QUICKFIX] MCP/agent spec sync — groups parentId, edge legend heads, node content, notes, tool desc — 2026-06-30

**Dev:** david-ds-teles <david.ds.teles@gmail.com>
**Root cause:** 4-way desync between canvas features (006) and the generation kit/MCP spec. (1) `applyResponse` hardcoded `toEnd:'arrow'` default on every new/updated edge, overriding the edgeType legend for event (diamond), request (open-arrow), and reference (circle) ends. (2) `GROUPS` section missing from the generation kit — agents created boundary groups but never set `parentId` on children → nodes floated outside the boundary. (3) `apply_response` MCP tool description claimed "places a readable markdown card" for `coreDocPath` but the implementation (reversed 2026-06-30) never does. (4) Spec gaps: no `fromPort`/`toPort` warning, node files too sparse (name only, no spec body), no canvas notes guidance.
**Fix:** `brief.ts` — removed `?? 'arrow'` default from both the new-edge and update-edge paths (renderer already resolves via `EDGE_TYPE_STYLE[edgeType].toEnd`). `generation-kit.ts` — added GROUPS section with mandatory-parentId rule + coordinate guidance, strengthened EXTRACTION node-file body rule (2–4 spec sentences), added "Do NOT set fromPort/toPort", sharpened fromEnd/toEnd "OMIT BOTH" rule, added CANVAS NOTES section, rewrote worked example to show parentId nesting and no explicit end markers. `mcp/flowcanvas-mcp.ts` — fixed `coreDocPath` tool description (spine pane, not a card). `docs/flowcanvas-agent-contract.md` — regenerated from updated `kitSections()`.
**Affected:** `lib/canvas/brief.ts` · `lib/canvas/generation-kit.ts` · `mcp/flowcanvas-mcp.ts` · `docs/flowcanvas-agent-contract.md`. Gates: 239/239 vitest ✓.

---

## [PLAN COMPLETE] 006-semantic-edges — Semantic Edges & Connection Ports — 2026-06-30

**Dev:** david-ds-teles <david.ds.teles@gmail.com>
**Delivered:** Reworked the canvas edge system into three operator-locked specs + Shift-snap, schema `0.4 → 0.5`, full agent parity: dot-anchored **connection ports** (always-visible reusable dots · reuse-or-create on connect · Alt-drag to move · arrowhead seats IN the dot — replaces 005 floating endpoints), a reusable **`<ColorPicker>`** (edges + node text/fill), and **flow-typed edges** (an `EdgeType` taxonomy bound to one `EDGE_TYPE_STYLE` legend driving color/line/head, with an on-canvas legend that doubles as the type picker) + **Shift-snap** 45° line angles. New pure `lib/canvas/ports.ts`; new `components/canvas/{legend,nodes/port-handles}.tsx` + `components/ui/color-picker.tsx`. Boards upgrade + seed ports on open; agents reach `edgeType` via brief/generation-kit/MCP. Built on 005-edges.
**Phases:** 4/4 — all complete (Schema & Pure-Lib Foundation · Ports Rendering & Interaction · Semantic Typing, Legend UI & ColorPicker · Agent Parity, Contract & Verification).
**Artifacts:** `006-semantic-edges-{technical-overview,changelog,test-notes,qa-report,ui-design}.md`; 2 new + 9 refreshed module docs; `project-overview.md` propagated (schema `0.5`); showcase `examples/commerce-platform.canvas` (→ `0.5`).
**Gates:** tsc 0 · lint 0 · vitest 239/239 · build ok · smoke:mcp PASS (8 tools) · smoke:render PASS · live CDP four-spec PASS (ports 5/5 · typed+legend+ColorPicker 6/6 · Shift-snap) · reviews PASS (Code Explorer audit 34/34 spec-match; plan-completion review in qa-report).
**Follow-ups:** retire `meta.rel` one version after `0.5`; optional CSS rename of the stable `fc-relpick*`/`fc-edge-label__rel` handles; optional `EdgeLegend` single-`useStore` micro-opt. Commit held — operator controls commits; the working tree also carries open-migrated boards (`flowcanvas.canvas`, `boards/msgflow-mvp.canvas` → `0.5`).

---

## [QUICKFIX] MCP board creation — agent can create a board from scratch; writes require an explicit canvasRef (anti-clobber) — 2026-06-30

**Dev:** david-ds-teles <david.ds.teles@gmail.com>
**Related:** standalone (closes the create-a-board half of the [[agent-feature-parity]] gap; theme-aligned with draft `007-live-agent-canvas`)
**What:** `apply_response` now (a) **creates the board** when `canvasRef` points to a path that does not exist yet — starts from a fresh empty `0.4` board (mirrors `store.newBoard`), merges, auto-organizes, persists, and registers it as the active board so the app surfaces it; and (b) **requires an explicit `canvasRef`** for any write — the silent active-board fallback (`resolveRef`) is gone for writes, kept only for read-only `get_board`. New 404-aware `getCanvasDoc` + `emptyBoard` helpers; `generation-kit.ts` MCP-loop how-to + tool descriptions teach the create flow and the explicit-ref rule.
**Why:** The agent could not create a `.canvas` over MCP (a human does File→New; `apply_response` 404'd on a missing file and `write_file` is `.md`-only), and an omitted `canvasRef` silently latched onto the open board — which overwrote `examples/commerce-platform.canvas` during a BL-001 run. Operator: "a new file is just a new canvas; the agent should create/update it as trivially as any file."
**Impact:** A board is now created + populated in **one** `apply_response` call against a new path; a generation can never clobber the board the human has open. No schema change. **Live agent tools pick this up only after the flowcanvas MCP sidecar respawns** (tsx, no build → a session/MCP restart).
**Files:** `mcp/flowcanvas-mcp.ts`, `lib/canvas/generation-kit.ts`, `scripts/smoke-mcp.mjs` (+2 create/anti-clobber assertions), module doc `mcp-sidecar.md`. Gates: tsc 0 · lint 0 · smoke:mcp 16/16 (incl. from-scratch create + no-ref rejection) · smoke:render PASS · vitest 232/233 (the 1 fail is pre-existing 006 `0.5`-vs-`0.4` drift on `commerce-platform.canvas`, untouched here). Commit held — intermixed with the in-progress 005/006 working tree (operator controls commits).

---

## [QUICKFIX] Free-form edge styling — routing · color · line · markers · sides · movable label · draggable line, with full agent parity — 2026-06-30

**Dev:** david-ds-teles <david.ds.teles@gmail.com>
**Scope:** Operator-directed **direct-build feature** (no plan folder — operator chose direct build over the design→plan cycle; arguably plan-scale given the schema bump). Reworks the canvas edge system into a design-tool-grade, free-form connection model with full human↔agent capability parity ([[agent-feature-parity]]). Iterated **twice** on operator feedback. Round 1 (4 corrections): bezier-default → **smoothstep (angle) default**; **black arrowheads** → color-matched; floating "chaos" → orthogonal-clean; + line waypoints. Round 2: the line-drag shipped **non-functional** — bend handles only appeared on a *selected* edge and edge-click-selection was occluded, so nothing was draggable (verified broken by a CDP drag simulation: `lineDragChangedPath:false`). Refit so **the line itself is the drag affordance** (grab anywhere → bend; no selection required) via a fat transparent hit-path, plus a preserved-edge-selection fix; re-verified by CDP (`lineDragCreatedBend:true, lineDragChangedPath:true`).
**Built:** (1) Per-edge style on `CanvasEdge`/`meta`: `routing` (smoothstep DEFAULT · bezier · straight), `line` (solid/dashed/dotted), `color` (now actually drives the stroke), `fromEnd`/`toEnd` marker shapes (none/arrow/arrow-open/circle/diamond), `fromSide`/`toSide` pin-or-float, `labelT` (label draggable ALONG the path), `points[]` (manual line waypoints — **grab the line anywhere and drag to bend it** via a fat transparent hit-path; drag a bend handle to move, double-click to remove). (2) **Floating endpoints** — edges anchor at node center and meet the perimeter aimed at the next bend/neighbour (the requested "from the middle"); connect-handle dots hide at rest, reveal on node-hover/connect (noise reduction). (3) New pure `lib/canvas/edge-geometry.ts` (perimeter intersection + nearest-T) + per-edge **colored** `components/canvas/edges/edge-markers.tsx` (replaces the shared `context-stroke` markers, which rendered black across React Flow's separate SVG roots). (4) Edge **Style panel** (`style ▾`) + waypoint affordances in `labeled-edge.tsx`. (5) 7 store actions (`setEdgeRouting`/`setEdgeLine`/`setEdgeColor`/`setEdgeMarker`/`setEdgeSide`/`setEdgeLabelT`/`setEdgeWaypoints`); `onConnect` floats by default. (6) **Agent parity** — `AgentEdge`/`BriefEdge` gain every style field; `buildBrief` emits, `applyResponse` threads (create + update); documented in `generation-kit.ts` § EDGE STYLE + the contract mirror; MCP `apply_response` rides `applyResponse` unchanged (`z.any()` edges already pass new fields through). (7) Schema `0.3 → 0.4` (additive) — `migrateDoc` floats existing edges (drops the auto-assigned handle sides — the reading noise); boards persist `0.4` on open. (8) Fixed a latent `adapter.toJSONCanvas` bug that dropped edge `meta` (routing/line/labelT) on every RF state sync.
**Affected:** `lib/canvas/{jsoncanvas,migrate,validate,adapter,store,brief,generation-kit}.ts` + new `lib/canvas/edge-geometry.ts`, `components/canvas/edges/{labeled-edge,edge-markers}.tsx`, `components/canvas/{canvas-shell,use-canvas-handlers}.tsx` (edge-selection preserved across doc edits), `app/styles/edges.css`, `docs/flowcanvas-agent-contract.md`; tests `lib/canvas/{edge-geometry,migrate,store,brief,adapter}.test.ts` + `app/api/routes-contract.test.ts`; `project-overview.md` + module docs synced.
**Gates:** tsc 0 · lint 0 · build ok · vitest 216/216 (+10: edge-geometry incl. nearestSegmentIndex, migrate 0.4, store edge-style + waypoints, brief agent-parity + waypoint round-trip) · smoke:render PASS · smoke:mcp PASS (8 tools) · live CDP on `boards/msgflow-mvp.canvas` — 21 edges orthogonal, arrowhead fill === stroke (rgb(94,242,255), not black), and a simulated **line-drag created a bend + changed the path** (`lineDragCreatedBend:true, lineDragChangedPath:true`). **Commit held** — same uncommitted working tree as the core-doc-card `[BUGFIX]` below; operator controls commits (the two features are intermixed in the tree).

---

## [BUGFIX] MCP-generated boards missing the core-doc markdown component — 2026-06-30

**Dev:** david-ds-teles <david.ds.teles@gmail.com>
**Cause:** Operator-reported: a generated board (`boards/msgflow-mvp.canvas` — 16 typed widgets + 2 boundary groups, all 34 `meta.source.path` = `boards/msgflow-mvp.md`) carried **no canvas element for the core spec doc** (`nodes.find(n => n.file === 'boards/msgflow-mvp.md')` → null; `coreDocPath` not even persisted). Three verified causes: (1) the generation-kit contract put the core doc in `generatedFiles` ONLY, never `upsertNodes` — by 004 design ("core doc = spine, not a card"); (2) `AgentResponse` had no `coreDocPath` field and the MCP `apply_response` zod schema **stripped** any agent-sent `coreDocPath`, so over MCP the spine was never bound and no card was made (binding only happened later in `store.load`'s sole-cited-doc inference, never as a node); (3) the docked `CoreSpine` lives behind the right-rail `spine` tab while the default tab is `inspector`, so even when bound it was undiscoverable. Operator decision (2026-06-30, via AskUserQuestion) **reverses the locked 004/005 "spine, not a card" rule**: the core doc is now BOTH the spine pane AND a readable canvas card, and clicking the card focuses the spine.
**Fix:** (a) `brief.ts` — `AgentResponse.coreDocPath?: string` + pure `ensureCoreDocNode()`/`CORE_DOC_CARD`; `applyResponse` binds `session.coreDocPath` and idempotently mints a kind-less `type:"file"` core-doc card (renders as a plain markdown card, never a widget). (b) `layout.ts` — `organizeByType(nodes, coreDocPath?)` pins that card to its own leftmost band (rank -1). (c) `store.ts` — organize action passes `coreDocPath`; `load` **heals** boards generated before this change (mints + hydrates + persists the card when a bound core doc has no node — fixes existing boards on open). (d) `mcp/flowcanvas-mcp.ts` — `apply_response` schema accepts `coreDocPath` + passes it to organize. (e) `generation-kit.ts` + `docs/flowcanvas-agent-contract.md` — contract now requires the agent to SET `coreDocPath` (the app owns the card; the one exception to the generatedFiles+upsertNodes rule); worked example + MCP loop updated. (f) `canvas-shell.tsx` — clicking the core-doc card focuses the Spine tab instead of the reader. Cause 3 (external design doc outside `FLOWCANVAS_ROOT`) — operator chose **keep root-only** (`fs-guard` unchanged); copy the doc under the project root first. Gates (this change): tsc 0 · lint 0 · build ok · +4 vitest (2 brief `coreDocPath` round-trip/idempotent, 2 layout pinning) all PASS. NOTE: the full `vitest run` shows 6 pre-existing failures (`migrate`/`adapter`/`brief`/`store` edge tests) — **all from the in-progress `005-edges` routing/style feature in the same uncommitted working tree, none from this change**. Commit held (mixed tree; operator controls commits).
**Affected:** `lib/canvas/{brief,layout,store}.ts`, `mcp/flowcanvas-mcp.ts`, `lib/canvas/generation-kit.ts`, `components/canvas/canvas-shell.tsx`, `docs/flowcanvas-agent-contract.md`, `lib/canvas/{brief,layout}.test.ts` (+4), module docs `{brief,layout,generation-kit,store,mcp-sidecar}.md`. Generation-quality reversal aligns with the locked 005 "agent-driven canvas" scope; the 005 design should record the "core doc = spine AND card" decision when that plan is next opened.

---

## [BUGFIX] Operator-reported canvas/agent UX — 8 fixes (FAB · edge labels · overflow · core-doc · type-layout · undo/redo) — 2026-06-29

**Dev:** david-ds-teles <david.ds.teles@gmail.com>
**Cause:** Operator runtime testing of the MCP-generated `boards/msgflow-mvp.canvas` surfaced 8 defects. (4) A near-invisible "agent FAB" chat bubble added off-workflow (`3f142b3`) contradicting the locked 005 "no in-app chat". (5) The component `§source` chip overflowed its widget on long anchor slugs. (6) Edge rel-labels were unreadable — 82%-opaque, no z-index, so lines/widgets bled through. (3) The core-doc spine threw a bare "not found". (2) The agent generated a board with **no core spec doc** — every node's `meta.source.path` cited a `…-design.md` it never wrote, so `coreDocPath` stayed unset and components had no readable specification. (7/8) The agent hand-placed nodes nested in *system* boundary groups with no interior layout, and ELK "Re-organize" only arranged top-level nodes → an unreadable, type-unseparated mess. (1) No undo/redo at all; change-review (agent-round-only) read as "useless" for local edits.
**Fix:** (4) deleted `agent-fab.{tsx,css}` + its mount/import. (5) `.fc-cmp__src` `max-width:100%` + ellipsised `<span>`. (6) near-opaque label plate + `z-index` on the label and the edge-label renderer. (3) precise "core spec not found — references X, never written" message. (2) `store.load` auto-binds the sole cited doc when it EXISTS (005-D4); the single-source generation-kit contract now REQUIRES authoring + citing exactly one core spec doc (never a phantom path) and a `label` + `name:`/`description:` frontmatter per node — worked example corrected (it had taught the bug). (7/8) new pure `organizeByType` — deterministic component-kind bands that also lay out each group's children and resize the group to enclose them; wired to the "Organize by type" toolbar button + auto-applied on import and first agent extraction — in the client store **and** the MCP `apply_response` sidecar, so MCP-generated boards organize too. (1) history middleware (`past`/`future`, reset on board switch) + `undo`/`redo` + ⌘Z/⌘⇧Z + toolbar buttons; the change-review empty state now explains it tracks agent rounds and points local edits at undo/redo.
**Affected:** `lib/canvas/{store,layout,generation-kit}.ts` (+ `layout`/`store` tests), `components/canvas/{canvas-toolbar,core-spine,review-panel,canvas-shell,nodes/component-node}.tsx`, `app/styles/{nodes,edges,studio-review}.css` + `globals.css`, `mcp/flowcanvas-mcp.ts` (server-side first-extraction auto-arrange), `scripts/smoke-render.mjs` (stale selector). Gates: tsc 0 · lint 0 · build ok · vitest 193/193 (+15) · smoke:render PASS · live CDP probe of `boards/msgflow-mvp.canvas` PASS (FAB gone · undo/redo present · 16 widgets · 21 edge labels · 0 chip overflow · console clean). #4/#5/#6 already committed by the operator in `22212f3`; #1/#2/#3/#7/#8 in the working tree (uncommitted). Generation-quality items (#2/#7/#8) align with the locked 005 "agent-driven canvas" scope. Side-effect: `examples/commerce-platform.canvas` gained `coreDocPath` (correct one-time auto-bind on first load). **Validated end-to-end:** generated the real `msgflow-mvp` system board from `…/msgflow-mvp-design.md` (16 typed components · 2 boundaries · 19 typed edges · 55KB auto-bound core spine) — browser snapshot confirms every element renders with real names, the spine renders the spec (not "not found"), and "Organize by type" yields a clean type-banded diagram (`boards/msgflow-mvp-gen.*`).

---

## [MIGRATION] 0.11.0 → 0.16.0 — 2026-06-29

**Dev:** david-ds-teles <david.ds.teles@gmail.com>
**Overwritten:** 78 framework files written (13 added — `eval/` subsystem, `/flowcode:evaluate` + `/flowcode:revise` commands/skills, `evaluator-agent`, `plans/plan-execution.md`, `changelog-archive.md`, `evaluation-report-template.md`, `state-switcher-exemplar.html`; 65 changed — agents, commands, skills, hooks, workflow, rules, ui, templates). Mode: delta, no-LLM path.
**Backfilled:** 0 host files
**Harvested:** none — the 4 host-edited plan files (003/004 design + ui-design) were preserved in place, not harvested
**Hooks merged:** none (new registrations already present — idempotent merge)
**Follow-ups:** Pre-apply, the stock delta wanted to **delete 37 entries** — 36 real `001`–`004` plan artifacts + the stale `.flowcode/README.md` — because the v0.11.0 install recorded host plan folders as `category: flowcode` and the ownership model (`install-lib.js:32`) only treats `plans/plan-index.md` as host-owned. De-classified all 37 from `install-manifest.json` (left on disk, no longer framework-tracked) so nothing of value was deleted and future migrates won't target them. Upstream gap to report: `.flowcode/plans/{PREFIX}/` should be host-owned in `install-lib.js`. Backup of pre-edit manifest in session scratchpad.

---

## [PLAN COMPLETE] 004-generation-loop — Markdown-Core Generation Loop — 2026-06-29

**Dev:** david-ds-teles <david.ds.teles@gmail.com>
**Delivered:** The closed generation loop, end to end: any LLM turns a markdown design doc into a **system-design `.canvas`** via a discoverable **Agent Generation Kit** (single-source `lib/canvas/generation-kit.ts` → MCP tool `get_generation_kit` + static resource `flowcanvas://generation-kit` + a UI "Copy full kit"); components render as kind-typed widgets (`ComponentKind` on `meta.kind` → `component-node.tsx`), not document cards; the markdown is a **living, editable, bidirectionally-linked core spine** (`core-spine.tsx`) re-submittable over MCP; and a generated `.canvas` **imports three ways** (paste · upload · drag-drop → zod-validate → migrate → adopt). Schema `0.2 → 0.3` (additive; boards upgrade on open). New pure libs `spine`/`validate`/`migrate`/`generation-kit`. Built over Plan 003; no existing board changes behavior at rest.
**Phases:** 5/5 — all complete (Schema & Pure-Lib Foundation · System-Design Component Rendering · Agent Generation Kit Surfaces · Living Core Spine & Bidirectional Linking · Frictionless Import).
**Artifacts:** `004-generation-loop-{technical-overview,changelog,test-notes,qa-report}.md`; 6 new + 9 refreshed module docs; `project-overview.md` propagated; showcase `examples/commerce-system.{canvas,md}`.
**Gates:** tsc 0 · lint 0 · build ok · vitest 178/178 (+20) · smoke:mcp (8 tools) · smoke:render · CDP browser automation all surfaces — 0 console errors · all reviews PASS.
**Follow-ups:** store/adapter/MCP are smoke/CDP-covered (no vitest yet); 2 deferred info findings (mixed-drop non-canvas discard — intentional; ZodError toast reflow — cosmetic). Commit held pending operator review (004 work currently on the `003-canvas-foundation` branch).

---

## [BUGFIX] 003 canvas-foundation visual follow-ups — group resize scaling, RF group chrome, sharp rect corners, full-reader frontmatter — 2026-06-29

**Dev:** david-ds-teles <david.ds.teles@gmail.com>
**Cause:** Five operator-reported defects against the shipped `003-canvas-foundation`. (1) Resizing a group fence left its child widgets unscaled — `setNodeSize` wrote only the group's own w/h. (2 & 5) Groups/shapes showed an opaque grey box and a fence drawn ~10px smaller than + offset from the children — React Flow's built-in `.react-flow__node-group` chrome (grey fill + border + 10px padding, from RF's stylesheet which loads after ours) was never reset, so the padding inset/offset the SVG outline. (3) Rectangle corners were rounded — `ShapeOutline`'s rect used `rx="6"`. (4) The maximized ("full") reader hid the frontmatter status pill + first tags — the reader is `position:absolute` inside the `overflow:hidden` center pane, so `width:100vw` overflowed left under the structure rail and clipped the left-aligned frontmatter.
**Fix:** (1) `setNodeSize` is now group-aware — scales every child's position + size by the resize ratio about the resize origin (`group-node` passes `p.x/p.y`). (2 & 5) Reset RF group chrome to transparent / 0-border / 0-padding / 0-radius on `.react-flow__node:has(.fc-group)` — the SVG outline now fills the box and aligns with the children (the §8 faint-indigo fill is kept). (3) Dropped the rect `rx` → true 90° corners. (4) `data-size='full'` is now a `position:fixed; inset:0; z-index:45` viewport overlay that escapes the clip so all frontmatter is visible.
**Affected:** `lib/canvas/store.ts`, `components/canvas/nodes/group-node.tsx`, `app/styles/nodes.css`, `app/styles/reader.css`, `lib/canvas/store.test.ts` (+3 tests). Gates: tsc 0 · lint 0 · build ok · vitest 157/157 (+3) · live CDP verify — group wrapper bg transparent / border 0 / padding 0, SVG inset 0,0 (fence == box), rect rx none, full reader fixed z45 spanning 0–1440 with status pill @l=23 + tags visible.

---

## [PLAN COMPLETE] 003-canvas-foundation — Canvas Foundation & Visual Integrity — 2026-06-29

**Dev:** david-ds-teles <david.ds.teles@gmail.com>
**Delivered:** Repaired the direct-manipulation surface v2 left incomplete — **universal widget resize** (shared `NodeResizeFrame` across markdown/note/image/link), a **discoverable on-edge `EdgeActionBar`** (rel ▾ · ✎ Label · ✕; explicit `selectable`/`deletable` + `elementsSelectable`/`edgesFocusable`), and **comments connected to widgets** (on-card `CommentBadge` via a primitive `selectNodeCommentCount`, human-name thread header + inspector "Comments on this node" list via a shared pure `nodeDisplayName`) — plus a **visual-integrity pass**: killed the always-on faded rings (focus-only states), recalibrated `--color-secondary` `#ddb7ff → #e4c6ff`, role-reduced the prose violet (reader `em`→text-primary, links→primary indigo), and made the reader frontmatter compact/collapsible. Built entirely on existing primitives — **no schema, MCP, or agent-contract change** (`schemaVersion` stays `0.2`).
**Phases:** 4/4 — Universal Resize · Edge Action Bar & Explicit Selection · Comment ↔ Widget Connection · Visual Integrity & Reader Redesign (waves 1∥2 → 3 → 4; executed with parallel implementer workers per wave).
**Artifacts:** `003-canvas-foundation-{technical-overview,changelog,test-notes,qa-report}.md` + captures under `mockups/captures/phase-{1..4}/`.
**Gates:** tsc 0 · lint 0 · build ok · vitest 154/154 (+7 new) · live Playwright browser harness 35/35 (console clean) · code reviews PASS (0 ≥low open).
**Follow-ups:** align `rgba(221,183,255,*)` chip literals to `#e4c6ff`; regenerate 3 race-affected module docs (`adapter`/`canvas-nodes`/`canvas-shell`) flagged by the concurrent module-doc backfill; `image-node.tsx` eslint-disable ticket ref; → plan **004-generation-loop** builds on this foundation.

---

## [BOOTSTRAP] partial — 2026-06-29

**Dev:** david-ds-teles <david.ds.teles@gmail.com>
**Detected:** standalone monolith + stdio MCP sidecar / TypeScript 5 / Next.js 16 (App Router) + React 19 / React Flow + Zustand + Tailwind v4 — overview already current (plans 001+002 complete); this run was a **targeted module-doc backfill**, not a full re-bootstrap. Backfilled the empty `modules/` dir (only `README.md` existed — a standing sync breach since the greenfield bootstrap deferred per-module docs). 22 deep docs generated by parallel `flowcode:module-explorer-agent` dispatches (cohesive grouping): 11 pure `lib/canvas/*` (schema, adapter, brief, edges, refs, review, templates, comments, frontmatter, layout, store) + `fs-guard`, `api-client`, `render-md`, `api-routes`, `mcp-sidecar` + 6 component clusters (canvas-shell, canvas-nodes, canvas-toolbar, studio-rails, comments-ui, reader).
**Files:** 22 new `.flowcode/project/modules/*.md`; `.flowcode/project/project-overview.md` (§ Modules Detail-File column reconciled to point every row at its owning doc; added `API Client` + `Render MD` rows for the two code modules that lacked one).
**Needs manual input:** Assign `BL-NNN` to two doc-flagged tech-debt gaps (`fs-guard` symlink-traversal; `schema`/`render-md`/`reader` missing unit tests — React/server render paths covered only by `smoke:render`). 3 docs (`adapter`, `canvas-nodes`, `canvas-shell`) were generated while a **concurrent `/flowcode:execute` on plan 003 wave 1 (Phases 1∥2) was editing source** — they may capture a transient state (e.g. `canvas-nodes` flagged `node-frame.tsx` as "unused" because the new resize frame was on disk but not yet wired in).
**Next steps:** After plan-003 wave 1 (Phases 1+2) closes, regenerate the 3 race-affected docs — `/flowcode:module-doc adapter canvas-nodes canvas-shell` — so they reflect the final wired Universal-Resize / Edge-Action-Bar state. Bootstrap touched **zero source files**; the wave-1 source changes belong to the concurrent executor and were left untouched.

---

## [FEEDBACK] 003 + 004 board-generation redesign (design + mockups) — 2026-06-28

**Dev:** david-ds-teles <davidarius2@gmail.com>
**Captured:** 2 rules, 2 conventions, 4 decisions/definitions, 1 UC.
**Applied:** `ui/ui-design-system.md` — §11 content-readability rule (body/description uses `--color-text-primary`, never muted grey) + legible-metadata-chip rule + the `--color-secondary` `#ddb7ff → #e4c6ff` role-reduction note; §8 group spec now requires a container to fully enclose all its child nodes (no ~80%-width clip).
**Logged (not applied):** (1) **Two-plan split** — `003` Canvas Foundation → `004` Generation Loop, foundation first to avoid v2's plumbing-heavy / experience-light repeat. (2) **System-design-centric reframe** — the canvas is a system-design diagram generated FROM a core markdown doc (the living, linked core), not an arrangement of md-file cards (`004-generation-loop-design.md`). (3) Semantic component enum is **`ComponentKind` on `meta.kind`**, NOT `NodeKind` (already the render-kind discriminator) (`004` design Decision 1). (4) Selected design language for the redesign: **nyx-refined** (`003-canvas-foundation-ui-design.md`).
**Routed upstream:** **UC-004** — mockup low-fidelity recurrence (4th); the framework-level fix (the "Fidelity — snapshot the real system" discipline = rows 1–2) routes here because `ui/ui-mockup-discipline.md` + `ui/ui-workflow.md` are framework-owned symlinks the host cannot bind.
**Rejected/deferred:** none.

---

## [PLAN COMPLETE] 002-system-design-studio — Flowcanvas System Design Studio v2 (re-close after Phase 7) — 2026-06-29

**Dev:** david-ds-teles <davidarius2@gmail.com>
**Delivered:** Re-closed `complete` at **7/7 phases** after **Phase 7 — Runtime Defect Remediation** (operator-directed reopen). Runtime triage (app + MCP sidecar + headless-Chrome CDP + a scripted MCP round-trip and submit→reload→review cycle) found the prime suspect (0-height tri-pane canvas) was a PASS and most v2 surfaces functional; the real gap was that the studio was **unexercisable on launch** — the default board was the stale v0.1 Welcome board and no templates shipped. Fixed four defects, all runtime-verified: **D1** canvas selection sync (`use-canvas-handlers`); **D2** an importable v2 demo board `examples/commerce-platform.canvas` + content + `templates/*.canvas` exercising every studio surface; **D3** MCP `get_board` stamps `session.lastBriefId` (round-trip no longer falsely `stale`); **D4** non-blocking change-review round-ready banner (`use-round-ready`). Closed the coverage gap that let static gates certify a non-working UI: 14 route-contract vitest tests (in-gate) + `npm run smoke:mcp` + `npm run smoke:render`.
**Phases:** 7/7 — Phases 1–6 `complete`, Phase 7 `done`.
**Artifacts:** `002-system-design-studio-{qa-report,technical-overview,changelog,test-notes,plan,log}.md` updated; `project-overview.md` (gates 143/143 + smoke gates + Evolution Log); `quality-gates.md` (smoke gates registered).
**Gates:** tsc 0 · lint 0 (0 warnings) · build ok (full v2 route table) · vitest 143/143 · smoke:mcp PASS · smoke:render PASS · plan-completion review PASS (0 ≥medium; 2 low + 3 info resolved/accepted).
**Follow-ups:** Decision-10 disk-divergence reconcile banner; 1280-px visual pixel-diff; collapsed-rail thin icon strip; drag-to-canvas templates; scope-aware submit; `instantiateTemplate` uniquify document-template file paths.

---

## [PLAN COMPLETE] 002-system-design-studio — Flowcanvas System Design Studio v2 — 2026-06-28

> **⚠️ AMENDED (2026-06-29): plan REOPENED.** Operator runtime testing found ~half the v2 features non-functional end-to-end — the static gates + code review below never exercised the wired runtime. Plan status is now `active` with **Phase 7 — Runtime Defect Remediation** pending. This entry stands as the historical close record; current state lives in `plan-index.md` (active 6/7), the plan log's `[PLAN REOPENED]` entry, and the qa-report `Operator runtime testing` FAIL check.

**Dev:** david-ds-teles <davidarius2@gmail.com>
**Delivered:** Canvas-authoritative typed-relation graph (schema v2, `RelationshipType` catalog, `NodeSource` provenance, one-time `0.1→0.2` migration), 7-tool stdio MCP sidecar (`@modelcontextprotocol/sdk` v1.29.0), snapshot-diff change-review (accept/discard), template library, bundle export, and the tri-pane studio shell — 6/6 phases, tsc 0 · lint 0 · build ok · vitest 129/129.
**Artifacts:** `002-system-design-studio-technical-overview.md`, `002-system-design-studio-changelog.md`, `002-system-design-studio-test-notes.md`, `002-system-design-studio-qa-report.md`
**Follow-ups:** disk-divergence banner (Decision 10); visual-parity CDP capture at 1280/1440; collapsed-rail thin strip; `lastBriefId` MCP stamp; drag-to-canvas templates; scope-aware submit; live MCP probe

---

## [PLAN COMPLETE] 001-initial-architecture — Phase 10 canvas mechanics & file I/O — 2026-06-27

**Dev:** david-ds-teles
**Delivered:** Re-closed `001-initial-architecture` `complete` at **10/10 phases** after executing the previously-deferred **Phase 10** (operator-directed reopen). Shipped: **multi-select** (marquee gated on select mode + ⌘/Ctrl-click), **true group containers** (`parentId`/`extent:'parent'`, drag-as-a-unit, group/ungroup) keeping the doc's coords absolute (all abs↔rel confined to the adapter), an **ELK "Re-organize"** auto-layout (`elkjs`), and **Save-as / Open-board** (`<BoardDialog>` modal + `?path=` adoption + inline dirty-guard). The operator-added transitive-hydration / ≤1-action referenced-file-access and the wider **linking / source-of-truth + agent-collaboration** vision were split to the new plan **`002-system-design-studio`**.
**Phases:** 10/10 — all `done`.
**Artifacts:** technical-overview (Phase 10 sections; 9→10 phases, 66→79 tests), changelog (Phase 10 + Summary 10/10), test-notes (Phase 10 unit + CDP + gaps), qa-report (Phase 10 + plan-completion, both PASS) under `.flowcode/plans/001-initial-architecture/`; `project-overview.md` propagated (Schema/Adapter/Layout/Store, folder structure, `elkjs`).
**Follow-ups:** `002-system-design-studio` (linking semantics, source-of-truth, reference nav/hydration, templates, richer agent loop). Tech-debt: component tests for toolbar flyout / `<FrontmatterView>` / `<BoardDialog>`; `reorganize` fitView heuristic; dead `setNodePosition`.
**Gates:** tsc 0 · lint 0 · build ok · vitest 79/79 · CDP live-verified (group/ungroup/re-organize/save-as/open). Review: 0 ≥medium (2 low fixed, 3 info accepted); plan-completion PASS.

---

## [PLAN COMPLETE] 001-initial-architecture — Phase 9 UX/UI redesign + bugfixes; Phase 10 deferred — 2026-06-27

**Dev:** david-ds-teles
**Delivered:** Closed `001-initial-architecture` `complete` at **9/10 phases**. Phase 9 shipped the single-rail toolbar (direct insert buttons + Shape/File flyouts + disabled Phase-10 scaffolds + `+ Add ▾` narrow fallback), the shared `<FrontmatterView>` (card + sticky reader-bar), a readability-overhauled reader (opaque surface, 17px/≤66ch, frontmatter header bar), and `.json` agent import (`Load .json…` + brief-vs-response detection). A post-Phase-9 bugfix pass fixed the selection ring (conforms to the rounded cards), the shape outline (dashed bright-indigo), and the import message. **Phase 10 deferred** — multi-select + true group containers, ELK "Re-organize", save-as/open-board, plus operator-added transitive board hydration + ≤1-action access to referenced files (needs a UI pass) → carried into the next exploration/design cycle.
**Phases:** 9/10 — Phases 1–9 `done`; Phase 10 `deferred`.
**Artifacts:** technical-overview (regenerated from a code-explorer audit), changelog (reconciled), test-notes, qa-report (plan-completion PASS) under `.flowcode/plans/001-initial-architecture/`; `project-overview.md` propagated.
**Follow-ups:** Phase 10 → next plan; add Phase-9 component tests (toolbar flyout state machine / `<FrontmatterView>` — CDP-only today); standing v0.1 tech-debt (revision double-bump, `AGENT_CONTRACT` ⇄ contract-doc sync, reader relative-image rewriting, symlink-aware path guard).
**Gates:** tsc 0 · lint 0 · build ok · vitest 66/66 · CDP visual-parity green. Review: 0 ≥medium across all checks; plan-completion PASS.

---

## [BUGFIX] Post-Phase-9 UX: selection ring / shape contrast / import message — 2026-06-27

**Dev:** david-ds-teles
**Cause:** (1) the `.selected` box-shadow sat on the **square** `.react-flow__node` wrapper while the cards are 16px-rounded, so the ring fenced a gap around the corners and its wide soft glow read fuzzy/low-contrast; (2) shape/group nodes used a 5%-indigo fill + thin solid `--color-primary-cont` stroke, reading as a faint gray box; (3) pasting the exported **DesignBrief** into Import gave a cryptic "Missing responseVersion/briefId" error (the brief carries `briefVersion`, not `responseVersion`).
**Fix:** (1) moved the ring onto the rounded cards (`.fc-node`/`.fc-node--link`/`.fc-node--note`) with a crisp 2px `--color-primary` ring + tight indigo halo, wrapper shadow `none` — conforms to the corners; (2) shape outline is now a **dashed** (`7 5`) bright-indigo (`--color-primary`) container with 8% fill (design system §8); (3) Import detects a pasted brief and explains the round-trip ("hand the brief to your agent — Import expects its AgentResponse").
**Affected:** `app/globals.css`, `components/canvas/nodes/group-node.tsx`, `app/styles/nodes.css`, `components/canvas/export-panel.tsx`. Gates: tsc 0 · lint 0 · build ok · vitest 66/66 · CDP — selection ring conforms to 16px card (wrapper shadow none), shape rect `stroke-dasharray=7 5` stroke `rgb(192,193,255)`, Import shows the brief-guidance message. Captures `mockups/captures/phase-9/09-fix-{selection,shape,import}.png`.

---

## [PLAN COMPLETE] 001-initial-architecture — Phase 8 polish & cleanup — 2026-06-27

**Dev:** david-ds-teles
**Delivered:** Re-closed `001-initial-architecture` after **Phase 8** (8/8 phases) — seven post-v0.1 polish fixes: behavior-preserving refactor (globals.css → 6 `app/styles/*` partials + `useCanvasHandlers` hook + inline-styles→classes), orthogonal smoothstep edges, a 3-size reader (drawer/half/full) with working maximize, bidirectional `links:` write-back via a new guarded `/api/canvas/links` route (file↔file edge ⇄ source `.md` frontmatter), nyx minimap/controls, and removal of the Next dev badge. The three earlier 2026-06-27 `[BUGFIX]` entries below were the operator reports this plan reopening formalized and finished.
**Gates:** tsc 0 · lint 0 · build ok · vitest 66/66 · CDP visual-parity 9/9 · curl `/api/canvas/links` guards 400/400/404.
**Artifacts:** technical-overview, changelog, test-notes, qa-report (all updated for Phase 8) under `.flowcode/plans/001-initial-architecture/`.

---

## [BUGFIX] Shapes weren't real / couldn't resize or change — 2026-06-27

**Dev:** david-ds-teles
**Cause:** Groups rendered an SVG inside a still-rectangular node — the hit area + selection box were rectangular ("fake"), and the node was forced to `zIndex:0` (behind content), so new shapes spawned under existing nodes and couldn't be selected/resized; changing the shape also deselected the node (the controlled-state re-sync wiped RF selection).
**Fix:** True shapes — only the painted SVG outline is hit-testable (`.fc-group` + RF node wrapper `pointer-events:none !important`, shapes `visiblePainted`); React Flow's rectangular `.selected` glow suppressed (shape stroke glows instead); dropped the forced `zIndex`; added a shape switcher (`setNodeShape` rectangle/ellipse/diamond) + enlarged `NodeResizer` handles on select; the shell now preserves RF `selected` across store re-syncs so editing doesn't deselect.
**Affected:** `components/canvas/nodes/group-node.tsx`, `lib/canvas/{store,adapter}.ts`, `components/canvas/canvas-shell.tsx`, `app/globals.css`, `lib/canvas/store.test.ts`. Gates: tsc 0 · lint 0 · build ok · vitest 61/61 · CDP shape-probe 8/8 (corner-click passes through, switcher changes shape, resize-drag 347×255→406×314, body-drag moves).

---

## [BUGFIX] Link/note handles misaligned (bottom-edge gap) — 2026-06-27

**Dev:** david-ds-teles
**Cause:** `.fc-node--note` and `.fc-node--link` (and latently `.fc-node--img`) sized to their content, shorter than the authored RF node box; React Flow anchors handles to the wrapper edges, so the bottom/side handles floated in the gap below the visible card.
**Fix:** `height: 100%` on the note/link/image cards so the card fills the wrapper (note body `flex: 1` to absorb slack). CDP-measured `gapBelowCard=0px` and `handleVsCardBottom=0px` for all three.
**Affected:** `app/globals.css` (`.fc-node--note`/`.fc-node--link`/`.fc-note__body`), `components/canvas/nodes/image-node.tsx`

---

## [BUGFIX] Flowcanvas node usability — text/group editing, link 404, shapes, full-read — 2026-06-27

**Dev:** david-ds-teles
**Cause:** Post-v0.1 operator report — added node types weren't usable: notes/groups had no edit path (editing was deferred), link chips with a scheme-less url (`google.com`) resolved relative → 404, the shape tool only made rectangles, and the markdown card's clamped body had no discoverable "read full" path.
**Fix:** Note nodes double-click → inline textarea (`setNodeText`); group nodes are now a real `GroupNode` — resizable (`NodeResizer`/`setNodeSize`), double-click label edit (`setNodeLabel`), SVG outline rectangle/ellipse/diamond via `meta.shape` (`NodeShape`), painted behind content nodes (adapter `zIndex:0`); `normalizeUrl` prepends `https://` to scheme-less links; add-node menu gained a Shape ▸ rectangle/ellipse/diamond sub-row; markdown header gained a `node-read` button → reader drawer (reader state moved into the store: `readerNodeId`/`openReader`/`closeReader`).
**Affected:** `lib/canvas/{jsoncanvas,store,adapter}.ts`, `components/canvas/nodes/{note,link,group,markdown}-node.tsx` (+ new `group-node.tsx`), `components/canvas/{canvas-shell,canvas-toolbar}.tsx`, `app/globals.css`, `lib/canvas/store.test.ts`. Gates: tsc 0 · lint 0 · build ok · vitest 60/60 · CDP fix-probe 7/7.

---

## [PLAN COMPLETE] 001-initial-architecture — Flowcanvas v0.1 — 2026-06-26

**Dev:** david-ds-teles
**Delivered:** A standalone Next.js 16 / React Flow canvas that maps flowcode markdown into spatial nodes with `links:`-derived + manual edges, pinned comment threads, and a bidirectional, idempotent human↔agent JSON round-trip — persisted to a `.canvas` file behind seven guarded fs routes.
**Artifacts:** `001-initial-architecture-technical-overview.md`, `001-initial-architecture-changelog.md`, `001-initial-architecture-test-notes.md`, `001-initial-architecture-qa-report.md`
**Follow-ups:** autosave; per-node revision tracking (conflicts); symlink-aware path guard; reader image-src rewriting; node-body inline editing

---

## [FEEDBACK] UI design gate + nyx pivot — 2026-06-26

**Dev:** david-ds-teles
**Captured:** 1 decision, 1 convention, 1 workflow-friction (→ 3 UC), 1 KB update, 1 backlog
**Applied:** `project/project-overview.md` (UI = nyx glassmorphic-neon; fonts Geist + JetBrains Mono)
**Logged (not applied):** BL-002 (add `loading`/`error` mockup frames); nyx direction (mockup 04) approved — supersedes dark-minimal, drag-drop upload added to scope — recorded in `001-initial-architecture-ui-design.md` and synced into the design + plan + `ui-design-system.md`
**Routed upstream:** UC-001 (greenfield design-system lock-in starves mockup exploration), UC-002 (mockup content-fidelity: render markdown + use real data), UC-003 (`ui-mockups` large-HTML reliability)
**Rejected/deferred:** none

---

## [BOOTSTRAP] success — 2026-06-25

**Dev:** david-ds-teles
**Detected:** standalone monolith / TypeScript 5 + React 19 / Next.js 15 (App Router) / React Flow `@xyflow/react` ^12 / Zustand ^5 / Tailwind v4 / Geist fonts / vitest (unit) + tsc + ESLint + next build — from `001-initial-architecture-design.md` and `001-initial-architecture-plan.md` (greenfield-from-spec; no source code on disk)
**Files:** `.flowcode/project/project-overview.md`, `.flowcode/quality-checks/quality-gates.md`, `.flowcode/workflow/flowcode-tools.md`, `.flowcode/quality-checks/naming-conventions.md`, `.flowcode/quality-checks/typed-models.md`, `.flowcode/quality-checks/enums-and-constants.md`, `.flowcode/quality-checks/error-handling.md`, `.flowcode/quality-checks/idiomatic-code.md`, `.flowcode/quality-checks/clean-code.md`, `.flowcode/ui/ui-design-system.md`, `.flowcode/project/project-log.md`
**Needs manual input:** Module detail files deferred — `.flowcode/project/modules/{module}.md` files are not generated because no source code exists yet; each will be produced by `flowcode:module-explorer-agent` at the close of the phase that builds it. CI/CD not configured — update `project-overview.md § CI/CD` and `quality-gates.md` when a pipeline is added. `§14` source paths in `ui-design-system.md` reference `app/globals.css` (Phase 1 target) — update to concrete line references once Phase 1 is complete.
**Next steps:** Execute Phase 1 of `001-initial-architecture-plan.md` (project scaffold + dark shell); run `npx tsc --noEmit`, `npm run lint`, `npm run build` at phase close to verify the first three gates green.

---

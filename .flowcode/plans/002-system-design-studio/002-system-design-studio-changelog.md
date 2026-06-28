---
name: 002-system-design-studio-changelog
description: Per-phase changelog for 002-system-design-studio — file-level change record built incrementally and reconciled against code at plan completion.
status: active
tags: [changelog, changes, per-phase]
links: [.flowcode/plans/002-system-design-studio/002-system-design-studio-plan.md, .flowcode/plans/002-system-design-studio/002-system-design-studio-technical-overview.md]
---

# Changelog — 002-system-design-studio Flowcanvas System Design Studio (v2)

- Per-phase file-level record for the v2 canvas-authoritative System Design Studio; built incrementally per phase, reconciled at plan completion.
- Type: FEATURE.
- Status active; dated 2026-06-28.
- Built incrementally per phase; reconciled against code at plan completion.
- Source plan: `002-system-design-studio-plan.md`.

---

## Summary

Plan `002-system-design-studio` promoted Flowcanvas from a markdown viewer board into a full System Design Studio: the `.canvas` file is now the authoritative typed-relation graph (content stays in live `.md` files), a 7-tool MCP sidecar exposes the board natively to any MCP-capable harness, and a snapshot-diff change-review surface gates every agent round with round-level accept/discard. Six phases delivered schema v2 (typed relationships, groups, provenance), three pure library modules (`refs`, `review`, `templates`), four new HTTP routes + store canvas-authoritative rewrite, the MCP sidecar, and the tri-pane studio shell with five v2 UI surfaces; the retired `links:` write-back route and `patchLinks` wrapper were removed. Final gate: tsc 0 · lint 0 · build ok · vitest 129/129.

---

## Phase 1 — Schema v2 & Agent Contract Foundation

| File | Type | Summary |
|------|------|---------|
| `lib/canvas/jsoncanvas.ts` | modified | Schema v2 type root: added `RelationshipType` (8-value catalog) + `RELATIONSHIP_TYPES` + `REL_LABELS`; `NodeSource` provenance; `EDGE_ORIGINS` + `SCHEMA_VERSIONS`. Extended `EdgeOrigin` (+`'import'`), `NodeMeta` (+`source`,`+template`), `CanvasEdge.meta` (+`rel`), `SessionMeta` (+`baseRevision`,`+pendingReview`); widened `FlowcanvasExt.schemaVersion` → `'0.1'\|'0.2'`. All additions optional → `0.1` boards still parse. |
| `lib/canvas/refs.ts` | created | Pure reference extractor (Decision 9): `RefKind`, `DocRef`, `extractRefs(basePath, frontmatter, body)` — frontmatter `links:` (root-relative) + body `[..](x.md)`/`![](img)` (file-relative), external-URL flag, anchor capture, dedup. No fs/DOM. |
| `lib/canvas/refs.test.ts` | created | 10 vitest cases for `extractRefs` incl. the plan's worked example. |
| `lib/canvas/brief.ts` | modified | Contract extension: `BriefNode` (+`label`,`parentId`,`source`,`refs`), `BriefEdge` (+`rel`), `AgentNode` (type +`'group'`; +`label`,`shape`,`parentId`,`source`), `AgentEdge` (+`rel`). `nodeFromAgent` group branch + `meta.source`; `buildBrief` emits refs/rel/parentId/source/label; `applyResponse` edges carry `meta.rel` + default `label` from `REL_LABELS`. `AGENT_CONTRACT` gained EXTRACTION/TYPED-EDGES/GROUPS and dropped the stale "prefer links:" rule. |
| `lib/canvas/brief.test.ts` | modified | Added `v2 extraction surfaces` cases (group create/update, typed-edge rel + default label, buildBrief refs/rel/source/parentId); updated the existing edges `toEqual` for the always-emitted `rel`. |
| `docs/flowcanvas-agent-contract.md` | modified | Mirrored the extended contract (extraction, typed edges, groups, provenance); retired the Phase-8 `links:`-round-trips-both-ways blockquote (Decision 4 demotion). |
| `components/canvas/edges/labeled-edge.tsx` | modified | Ripple fix: one `import: 'var(--color-outline)'` entry added to the exhaustive `Record<EdgeOrigin, string>` stroke map after widening `EdgeOrigin`. Full edge styling lands in Phase 6. |

---

## Phase 2 — Pure Library Layer

| File | Type | Summary |
|------|------|---------|
| `lib/canvas/review.ts` | created | Change-review primitives (Decision 6): `ReviewState`, `ReviewDiff`, pure `diffDocs(snapshot, current, roundGeneratedFiles=[])` — id-keyed added/updated/removed for nodes+edges, added-only comments, order-insensitive `canon` compare so reordered keys don't read as changes. |
| `lib/canvas/review.test.ts` | created | 15 cases — node/edge add·update·remove, reordered-key non-update, comment added/pre-existing/removed-invariant, files passthrough. |
| `lib/canvas/templates.ts` | created | Template library (Decision 8): `TemplateKind`, `CanvasTemplate`, pure `instantiateTemplate(t, dropX, dropY, mint)` — fresh `n-*`/`e-*` ids, coord rebase, `parentId` + edge-endpoint remap, `meta.origin:'user'`+`meta.template` provenance, returns `{nodes,edges,files}`. |
| `lib/canvas/templates.test.ts` | created | 13 cases — id mint, coord rebase, parentId remap + external fallback, provenance stamp, edge remap/preserve, document `files` passthrough, plan worked example. |
| `lib/canvas/edges.ts` | modified | Added pure `projectLinksForExport(doc)` — `deriveLinkEdges` inverse projecting file→file canvas edges into per-file `links:` lists for bundle export (Decision 4/10). `deriveLinkEdges`/`reconcileEdges` unchanged. |
| `lib/canvas/edges.test.ts` | modified | +6 cases for `projectLinksForExport` (single/dup/non-file-endpoints/multi-target/empty). |

---

## Phase 3 — HTTP API & Fetch Wrappers

| File | Type | Summary |
|------|------|---------|
| `app/api/canvas/review/route.ts` | created | GET/POST/DELETE over `<board-stem>.review.json` (Decision 6 change-review snapshot); guarded, `runtime='nodejs'`. |
| `app/api/canvas/active/route.ts` | created | GET/POST over `.flowcanvas/active-board.json` pointer (Decision 5); `{active:null}` when unset; creates `.flowcanvas/` on POST. |
| `app/api/templates/route.ts` | created | GET lists `templates/*.canvas` `CanvasTemplate` fragments; `?id=` resolves one (404 on miss); missing dir → `[]` (Decision 8). |
| `app/api/canvas/bundle/route.ts` | created | GET streams an fflate `zipSync` bundle — `.canvas` + referenced `.md` (with `links:` projected via `projectLinksForExport`) + assets + `bundle-manifest.json`; out-of-root/missing refs recorded, not fatal (Decision 10). |
| `lib/api.ts` | modified | Added v2 wrappers `getReview`/`putReview`/`clearReview`, `bundleUrl`, `listTemplates`, `getActive`/`putActive` + `ActiveBoard`. `patchLinks` kept + marked deprecated (its removal + the `links` route deletion moved to Phase 4 — sequencing fix, since `store.ts` still consumes it). |
| `package.json` | modified | Added `fflate` (zip bundling). |

---

## Phase 4 — Store Integration & Canvas-Authoritative Load

| File | Type | Summary |
|------|------|---------|
| `lib/canvas/store.ts` | modified | Canvas-authoritative `load` (no per-load reconcile; one-time immutable `0.1→0.2` migration; writes active-board pointer; loads review snapshot on `pendingReview`); `onConnect` mints a typed `user` edge (`rel:'related'`, inline editor), `removeEdgeWriteback` just removes — both drop the `links:` write-back (Decision 4). 7 new actions (`submitToAgent`/`reviewDiff`/`acceptRound`/`discardRound`/`navigateRef`/`addTemplate`/`resyncFile`) + `clearFocus`; transient `reviewState`/`focusNodeId`; `addFileNode`→`Promise<string>`; `applyResponse` no re-derive; `saveAs` writes the pointer; removed `fileOf`. |
| `lib/canvas/adapter.ts` | modified | Threads `meta.rel` onto `RFEdge.data` and back through `toJSONCanvas` (typed-edge styling). |
| `lib/canvas/store.test.ts` | modified | Rewrote `onConnect`/`removeEdgeWriteback` for v2 (typed user edges, no fs write-back); added `reviewDiff` + `navigateRef`-focus cases; dropped the `patchLinks` mock. |
| `lib/canvas/adapter.test.ts` | modified | +1 case: `meta.rel` round-trips onto `RFEdge.data` and back. |
| `app/api/file/route.ts` | modified | Added `GET` (raw read — MCP `read_file`) + `DELETE` (markdown — `discardRound` rollback). |
| `lib/api.ts` | modified | Added `readFileApi`/`deleteFileApi`; **removed `patchLinks`** (Decision 4). |
| `app/api/canvas/links/route.ts` | deleted | Phase-8 `links:` write-back route retired (Decision 4; sequencing fix from Phase 3 lands here, atomic with the store change). |

---

## Phase 5 — MCP Sidecar & Native Round-Trip

| File | Type | Summary |
|------|------|---------|
| `mcp/flowcanvas-mcp.ts` | created | stdio MCP server (`@modelcontextprotocol/sdk` v1.29.0, `registerTool` + zod) — 7 tools (`get_board`, `apply_response`, `read_file`, `write_file`, `list_dir`, `resolve_paths`, `get_active_board`) wrapping pure `buildBrief`/`applyResponse` + the guarded HTTP routes over `FLOWCANVAS_BASE_URL`; stderr-only diagnostics (Decision 5). |
| `mcp/README.md` | created | How the harness spawns the sidecar over stdio, the `FLOWCANVAS_BASE_URL` binding, and the 7 tools. |
| `package.json` | modified | Added `@modelcontextprotocol/sdk` + `zod` deps, dev `tsx`, and the `mcp` run script (`fflate` added in Phase 3). |

---

## Phase 6 — Studio UI Surfaces & Tri-Pane Shell

| File | Type | Summary |
|------|------|---------|
| `components/canvas/review-panel.tsx` | created | Change-review stepper (Decision 6): filters, prev/next stepper, `review-item` diff rows, accept/discard/close → store `acceptRound`/`discardRound`. + `app/styles/studio-review.css`. |
| `components/canvas/template-tray.tsx` | created | Template library (Decision 8): kind filter, cards, `template-instantiate` → `addTemplate`; fetches `listTemplates`. + `app/styles/studio-template.css`. |
| `components/canvas/structure-rail.tsx` | created | Left rail outline: tree groups + nodes, filter, click → `focusNode` (select + center). + `app/styles/studio-structure.css`. |
| `components/canvas/inspector-rail.tsx` | created | Right inspector: provenance, IN/OUT typed relations, ref chips (→ `navigateRef`), + Submit mode (`submitToAgent`) + review-button gating. + `app/styles/studio-inspector.css`. |
| `components/canvas/canvas-shell.tsx` | modified | Tri-pane shell (toolbar row + structure rail · canvas · inspector), collapsible rails (`data-railleft`/`-right`), left tab + inspector mode (renders `ReviewPanel` for review), `FocusBridge` centers on `focusNodeId`. |
| `components/canvas/canvas-toolbar.tsx` | modified | `toggle-rail-left`/`-right`, `toolbar-submit`, `toolbar-templates`, `toolbar-bundle` (download via `bundleUrl`). |
| `components/canvas/edges/labeled-edge.tsx` | modified | Typed-edge `edge-rel-pill` (rel eyebrow + label) + `edge-rel-picker` (option per `RelationshipType` + `edge-label-input`) → `setEdgeRel`/`relabelEdge`; keeps inline quick-editor + provenance strokes (+`import` violet). |
| `components/canvas/frontmatter-view.tsx` | modified | `↗` `link-chip` → clickable button calling `navigateRef` when `sourceNodeId` is supplied. |
| `components/canvas/reader-drawer.tsx` | modified | Delegated prose-link click → `navigateRef`; passes `sourceNodeId` to the frontmatter view. |
| `components/canvas/nodes/markdown-node.tsx` | modified | Passes `sourceNodeId` so the card's `↗` chips are clickable. |
| `lib/canvas/store.ts` | modified | Phase-6 UI actions: `setEdgeRel(id, rel)` (rel picker) + `focusNode(id)` (rail centering). |
| `app/styles/studio-shell.css` | created | Tri-pane layout + collapse + rail tabs + typed-edge eyebrow + rel-picker popover (app `--color-*` tokens). |
| `app/globals.css` | modified | `@import`s the 5 studio CSS partials. |

---

## Phase 7 — Runtime Defect Remediation

Plan reopened after operator runtime testing (most v2 surfaces worked; the studio was unexercisable on launch — stale default board + no templates). Four defects fixed and runtime-verified (CDP + MCP round-trip); coverage added so static gates can't recertify a non-working UI. Full triage matrix in `002-system-design-studio-qa-report.md § Check — Phase 7`.

| File | Type | Summary |
|------|------|---------|
| `components/canvas/use-canvas-handlers.ts` | modified | **D1** — added a store-`selectedIds` → React Flow `node.selected` sync effect (equality-guarded, loop-safe) so structure-rail clicks + `navigateRef` focus highlight the canvas node, not just the inspector. |
| `components/canvas/use-round-ready.ts` | created | **D4** — polls the persisted board revision while `pendingReview`; exposes `{show, reload, dismiss}` when disk runs ahead (an out-of-band MCP round landed). |
| `components/canvas/canvas-shell.tsx` | modified | **D4** — mounts `useRoundReady`; renders a non-blocking "Agent round ready — Reload to review" banner; reload re-loads + opens change-review. |
| `app/styles/studio-shell.css` | modified | **D4** — `.fc-roundready` banner styles (pulsing dot, reduced-motion guard). |
| `app/api/canvas/route.ts` | modified | **D3** — optional `bump` flag on POST: `bump:false` persists a metadata stamp without advancing the revision (keeps `baseRevision` + the D4 poll valid). |
| `mcp/flowcanvas-mcp.ts` | modified | **D3** — `get_board` stamps `session.lastBriefId` via a `bump:false` POST so a matching `apply_response.briefId` is no longer falsely `stale`. |
| `examples/commerce-platform.canvas` + `examples/commerce-platform/*.md` + `sequence.svg` | created | **D2** — importable v2 demo board (3 subsystem groups, 8 typed `rel` edges, provenance, an off-board ref, image+note+link) + 8 content docs. Open via the board dialog to validate every surface. |
| `templates/{tpl-note,tpl-flow,tpl-service}.canvas` | created | **D2** — sample templates (node / diagram / document kinds) so the template library populates + instantiate works. |
| `app/api/routes-contract.test.ts` | created | Route-contract gate (14 tests) — imports handlers, invokes with `NextRequest`; now in the `vitest run` gate. |
| `scripts/smoke-mcp.mjs`, `scripts/smoke-render.mjs` | created | MCP round-trip smoke + headless-Chrome tri-pane render smoke. |
| `package.json`, `vitest.config.ts`, `.flowcode/quality-checks/quality-gates.md` | modified | `smoke:mcp`/`smoke:render` scripts; vitest `app/**` + `@` alias; smoke gates registered. |
| `.flowcode/project/project-overview.md` | modified | Quality Gates (vitest 143, smoke gates) + Evolution Log Phase 7 entry. |

---

## Phase 8 — Studio UX & Deletion Remediation (round 2)

Second operator runtime round (8 reported defects). Triage (CDP over the live app) found 3 already working in shipped code (Submit/Templates/Bundle, drag-drop + `/api/upload`, board-load renders all elements) — reduced to discoverability; the rest fixed and runtime-verified (18/18 CDP checks). The headline real bug: nodes were undeletable.

| File | Type | Summary |
|------|------|---------|
| `lib/canvas/store.ts` | modified | Added `removeNode` (drops the node + every edge touching it + comments anchored to it; a deleted group orphans its children, like ungroup; closes the reader if open; file stays on disk), `newBoard` (mint + write + adopt a fresh `untitled-*.canvas`, reset transient UI), `clearBoard` (wipe the current board's nodes/edges/comments + clear `pendingReview`, dirty for Save). |
| `lib/canvas/adapter.ts` | modified | `deletable:false` → `deletable:true` on every RF node — nodes are now key-deletable (the doc write-back lives in `use-canvas-handlers`). |
| `components/canvas/use-canvas-handlers.ts` | modified | Wrapped `onNodesChange` to route `remove` changes through `store.removeNode` before the base handler (mirrors the edge `remove` path); RF suppresses the delete key while an input/textarea is focused, so inline editing is safe. |
| `components/canvas/canvas-toolbar.tsx` | modified | File menu gained **✨ New board** + **🧹 Clear board…**; arrange group gained a **Delete** (trash, `--danger`, enabled on selection · Del). |
| `components/canvas/inspector-rail.tsx` | modified | Selected-node header gained a **Delete node** action. |
| `components/canvas/edges/labeled-edge.tsx` | modified | Edge rel picker gained a **Delete connection** footer button (`removeEdgeWriteback`). |
| `components/canvas/canvas-shell.tsx` | modified | Renders the mockup-`05` **"No board open"** empty state over any 0-node board (Open .canvas… / Extract via agent); clear-board **confirm modal**; `onClearBoard` prop; `title` tooltips on the structure/templates rail tabs. |
| `app/styles/toolbar.css` | modified | `.fc-toolbar` z-index `10 → 30` (above the `.fc-reader`/`.fc-agent` drawers at 12 — fixes the flyout-menu-behind-reader bug); `.fc-tbtn--danger` hover variant. |
| `app/styles/studio-shell.css` | modified | `.fc-emptyboard` overlay (orb + actions, `pointer-events` pass-through so drops still land), `.fc-confirm` modal, `.fc-relpick__del` styles. |
| `app/styles/studio-inspector.css` | modified | `.fc-insp__nodeact` / `.fc-insp__del` delete-node button styles. |
| `flowcanvas.canvas`, `.flowcanvas/active-board.json` | modified | Default board reset to empty (0 nodes) so the app opens on the "No board open" state (operator choice). |

---

## Reconciliation

Code Explorer audit confirmed full spec conformance. The per-phase entries above match the shipped code with the following noted anomalies:

- **Phase 1 — `extractRefs` frontmatter resolution:** the plan's snippet resolved frontmatter `links:` against `basePath`; the implementation treats them as root-relative. The plan's own worked example used root-relative paths, so this is the correct behavior and the plan spec was updated in the same turn. Reflected in the Phase 1 entry ("Deviation").
- **Phase 2 — `diffDocs` 3-arg signature:** the plan's Data Models section showed a 2-arg signature; the implementation adds a 3rd optional `roundGeneratedFiles` param to keep the function pure. Reflected in the Phase 2 entry.
- **Phase 3 — `bundleUrl` vs `getBundle`:** the plan listed `getBundle` as a fetch wrapper; `bundleUrl` (URL helper) was shipped instead. Reflected in the Phase 3 entry.
- **Phase 3 → Phase 4 — sequencing fix:** the `links` route deletion + `patchLinks` removal were planned for Phase 3 but moved to Phase 4 to land atomically with the `onConnect`/`removeEdgeWriteback` consumer removal. Both phase entries document this.
- **Phase 4 — `addFileNode` return type:** `void` in the design; `Promise<string>` in the implementation (returns new node id for `navigateRef`). Reflected in the Phase 4 entry.
- **Phase 4 — `reviewDiff().files`:** derived from added file-node paths instead of `roundGeneratedFiles` (MCP writes files out-of-band). Reflected in the Phase 4 entry.
- **Phase 5 — `get_board` / `lastBriefId`:** `apply_response` reported `stale:true` (advisory; last-writer-wins merge is correct). Documented as an info-level noted-not-fixed item in the Phase 5 entry — **resolved in Phase 7 (D3):** `get_board` now stamps `lastBriefId` so the round-trip reports `stale:false`.
- **Phase 6 — Submit location:** the plan mentioned an `export-panel` Submit tab; Submit is the inspector's Submit mode (`inspector-submit`). `export-panel` stays the clipboard fallback. Reflected in the Phase 6 entry.

None of these anomalies represent specification regressions — each was documented in the relevant phase log entry and the plan spec was updated in the same turn where applicable.

---
name: 003-canvas-foundation-changelog
description: Per-phase changelog for 003-canvas-foundation — file-level change record built incrementally and reconciled against code at plan completion.
status: complete
tags: [changelog, changes, per-phase]
links: [.flowcode/plans/003-canvas-foundation/003-canvas-foundation-plan.md, .flowcode/plans/003-canvas-foundation/003-canvas-foundation-technical-overview.md]
---

# Changelog — 003-canvas-foundation Canvas Foundation & Visual Integrity

- Repairs the direct-manipulation canvas v2 left incomplete — universal widget resize, discoverable on-edge edit/delete, comments connected to widgets — plus a visual-integrity pass, all on existing primitives (no schema/MCP/contract change).
- Type: FEATURE.
- Status complete; dated 2026-06-29.
- Built incrementally per phase; reconciled against code at plan completion.
- Source plan: `003-canvas-foundation-plan.md`.

---

## Summary

26 files changed across 4 phases: a new shared `NodeResizeFrame` wrapper brought universal resize to all four remaining node types; a portaled `EdgeActionBar` made edge editing discoverable on the canvas surface; a pure `nodeDisplayName` helper, a primitive `selectNodeCommentCount` selector, and an on-card `CommentBadge` connected comments to their widgets read-side with no schema change; and a cross-cutting CSS/component pass killed always-on faded rings, recalibrated `--color-secondary` to `#e4c6ff`, role-reduced prose violet, and delivered a collapsible compact reader frontmatter. All four phases ran on existing primitives — `jsoncanvas.ts`, the MCP toolset, and the agent contract are unchanged, and `schemaVersion` stays `0.2`. Dev: david-ds-teles &lt;david.ds.teles@gmail.com&gt;; completed 2026-06-29.

---

## Phase 1 — Universal Resize

| File | Type | Summary |
|------|------|---------|
| `components/canvas/nodes/node-frame.tsx` | created | Shared `NodeResizeFrame` wrapper — renders `<NodeResizer>` + the card `{children}` + the four source `<Handle>`s as siblings; `isVisible = selected && mode !== 'comment'`; resize persists via the existing `setNodeSize`. |
| `components/canvas/nodes/markdown-node.tsx` | modified | `Inner` gains `selected`; card wrapped in `<NodeResizeFrame minWidth=240 minHeight=140>`; markdown stays auto-height (no adapter change); local `SIDES`/`<Handle>` + unused imports removed. |
| `components/canvas/nodes/note-node.tsx` | modified | `Inner` gains `selected`; `.fc-node--note` wrapped (180×120, fixed box); double-click inline editor kept; handles removed. |
| `components/canvas/nodes/image-node.tsx` | modified | `Inner` gains `id`/`selected`; `.fc-node--img` wrapped (160×120); handles removed. |
| `components/canvas/nodes/link-node.tsx` | modified | `Inner` gains `id`/`selected`; `.fc-node--link` wrapped (180×56); `normalizeUrl` export untouched; handles removed. |
| `app/styles/nodes.css` | modified | Added shared `.fc-rzline` / `.fc-rzhandle` resizer chrome (mirrors `.fc-group__rz*`; group rules untouched). |

---

## Phase 2 — Edge Action Bar & Explicit Selection

| File | Type | Summary |
|------|------|---------|
| `components/canvas/edges/labeled-edge.tsx` | modified | Consumes `selected`; new portaled `EdgeActionBar` (`rel ▾ · ✎ Label · ✕`) shown only when selected; delete moved OUT of `RelPicker` (single delete surface, `data-testid="edge-delete"`); selected stroke thickened; picker closes on deselect (render-phase reset); `aria-controls`/picker `id` wired. |
| `lib/canvas/adapter.ts` | modified | `toReactFlow` edge mapping gains explicit `selectable: true, deletable: true` (was relying on RF defaults). |
| `components/canvas/canvas-shell.tsx` | modified | `<ReactFlow>` gains explicit `elementsSelectable` + `edgesFocusable`. |
| `app/styles/edges.css` | modified | Added `.fc-edge-actions` bar styles (nyx glass, below the pill). |
| `lib/canvas/adapter.test.ts` | modified | Added assertions: mapped edge carries `selectable: true` and `deletable: true`. |

---

## Phase 3 — Comment ↔ Widget Connection

| File | Type | Summary |
|------|------|---------|
| `lib/canvas/node-name.ts` | created | Pure, DOM-free `nodeDisplayName(node)` — group→label, link→url, text→first line, file markdown→frontmatter.name\|\|basename, file other→basename. Shared name resolver. |
| `lib/canvas/store.ts` | modified | NEW exported `selectNodeCommentCount(id)` — primitive-returning selector counting unresolved root node-anchored comments (churn-free per-node subscription). No state/action change. |
| `components/canvas/nodes/comment-badge.tsx` | created | `CommentBadge({nodeId})` — on-card rose corner pill; hidden at 0, `9+` above cap, exact-count `aria-label`; click → `setSelection([nodeId])` (stopPropagation). |
| `components/canvas/nodes/markdown-node.tsx` | modified | Renders `<CommentBadge nodeId={id} />` as a card-sibling inside `NodeResizeFrame`. |
| `components/canvas/nodes/note-node.tsx` | modified | Renders `<CommentBadge>` (card-sibling). |
| `components/canvas/nodes/image-node.tsx` | modified | Renders `<CommentBadge>` (card-sibling). |
| `components/canvas/nodes/link-node.tsx` | modified | Renders `<CommentBadge>` (card-sibling). |
| `components/canvas/comment-layer.tsx` | modified | Thread header resolves the anchored node's human name via `nodeDisplayName` (was the raw UUID) over a `nodeById` map. |
| `components/canvas/inspector-rail.tsx` | modified | Uses the shared `nodeDisplayName` (local `displayName` removed); new "Comments on this node" list (badge · author · preview) with row click → `focusNode`. |
| `app/styles/nodes.css` | modified | `.fc-node__badge` corner-pill styles (+ reduced-motion). |
| `app/styles/studio-inspector.css` | modified | `.fc-insp__cmt` comment-row styles (+ reduced-motion). |
| `lib/canvas/node-name.test.ts` | created | 5 unit cases for `nodeDisplayName` (all node kinds). |
| `lib/canvas/comment-count.test.ts` | created | 2 unit cases for `selectNodeCommentCount` (counting rules + no-doc). |

---

## Phase 4 — Visual Integrity & Reader Redesign

| File | Type | Summary |
|------|------|---------|
| `app/globals.css` | modified | `--color-secondary` `#ddb7ff → #e4c6ff` (@theme token; global, benign ripple accepted). |
| `app/styles/edges.css` | modified | `.fc-edge-input` always-on 3px ring moved to `:focus` only (drop shadow stays at rest; crisp 2px primary on focus). |
| `app/styles/nodes.css` | modified | `.fc-note__edit` rest border → `--color-outline-variant`; crisp `--color-primary` `:focus` ring (dropped the always-on indigo border + faded second ring). |
| `app/styles/studio-inspector.css` | modified | `.fc-insp__src` → neutral glass surface (`--color-surface-low` + `--color-outline-variant`); the "source" label keeps the violet via text only. |
| `app/styles/toolbar.css` | modified | `.fc-agent__ta` lightened to `--color-surface-low` + crisp `:focus` border/ring. |
| `app/styles/reader.css` | modified | Prose `em → --color-text-primary`, inline links `→ --color-primary` (underline kept; `h3` keeps its violet accent); type tuning (`font-feature-settings`/`text-rendering`, 17px/1.7, +paragraph spacing). |
| `app/styles/frontmatter.css` | modified | Reader collapsible frontmatter styles (`.fc-fm__bar`, `.fc-fm__toggle`, `.fc-fm__chev`, `.fc-fm--collapsed`). |
| `components/canvas/frontmatter-view.tsx` | modified | NEW `collapsible` prop (reader variant): collapsed default = status pill + first 3 tags + "+N" + `frontmatter ▾` expander (`data-testid="reader-fm-toggle"`); expanded reveals the full grid + a collapse toggle. |
| `components/canvas/reader-drawer.tsx` | modified | Passes `collapsible` to `<FrontmatterView variant="reader">`. |

---

## Reconciliation

Per-phase entries match the code (Code Explorer audit: 26/26 files verified). One file changed beyond the per-phase plan tables: `app/styles/studio-shell.css` — dead `.fc-relpick__del` CSS rules were removed during Phase 4 as a Phase 2 cleanup follow-through (the rules were orphaned when the delete control moved from `RelPicker` to `EdgeActionBar` in Phase 2; `studio-shell.css` was not in Phase 2's file table because the rules were not discovered until Phase 4's cross-cutting CSS pass). The removal is benign and logged in the Phase 4 `[PHASE]` entry in `003-canvas-foundation-log.md`. No other divergence between per-phase entries and the final code state.

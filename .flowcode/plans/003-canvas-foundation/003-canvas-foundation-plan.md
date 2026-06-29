---
name: 003-canvas-foundation-plan
description: Implementation plan for Canvas Foundation & Visual Integrity — the phased execution spec (universal resize, on-edge action bar, comment↔widget connection, visual-integrity + reader redesign) and authoritative source of truth while plan 003 is built.
status: complete
tags: [plan, implementation, phases, canvas, ux]
links: [.flowcode/plans/003-canvas-foundation/003-canvas-foundation-design.md, .flowcode/plans/003-canvas-foundation/003-canvas-foundation-log.md]
---

# 003-canvas-foundation — Canvas Foundation & Visual Integrity Implementation Plan

- Delivers a correct, complete direct-manipulation canvas: every widget resizes, every edge is visibly editable/deletable, comments are connected to the widget they annotate, and the always-on faded rings / low-contrast violet / bloated reader are fixed — all on existing primitives, no schema/MCP/contract change.
- Phases: 4 — Universal Resize, Edge Action Bar & Explicit Selection, Comment ↔ Widget Connection, Visual Integrity & Reader Redesign.
- Status complete; dated 2026-06-29.
- Upstream design: `003-canvas-foundation-design.md` (approved 2026-06-29; all 5 Open Questions resolved at recommended defaults). Constant interaction layer + Visual Parity table: `003-canvas-foundation-ui-design.md` (approved; variant `01` nyx-refined).
- Phase 1 (active) is junior-executable at full depth: production-ready `NodeResizeFrame` snippet, per-node wrap diffs, a worked resize example, a sequence diagram, and named quality checks — per `plan-instructions.md § Active-Phase Completeness Bar`. Phases 2–4 are honest stubs, expanded before each becomes active.
- Frontend-touching plan: every phase declares a Visual Parity + App Smoke close step via `flowcode:browser` (`plan-instructions.md § UI Design Gate`); the reader `em`/heading recolor + recalibrated violet are **Expected drift**, not regressions.
- Waves: Phase 1 and Phase 2 are dependency-independent and path-disjoint (both `Depends On [none]`) → eligible to run as one parallel wave; Phase 3 follows Phase 1; Phase 4 is the cross-cutting CSS/visual closer after 1–3.
- Execution history lives in `003-canvas-foundation-log.md` (one entry per phase end + plan end) — not inlined here.

---

## Objective

Make flowcanvas a correct, complete direct-manipulation system-design canvas — universal widget resize, discoverable on-edge edit/delete, comments visibly connected to their widgets — and repair the visual integrity (kill always-on faded rings, recalibrate the violet, redesign the reader) before the 004 generation-loop redesign lands on top of it.

---

## Phases Catalog

`Depends On` lists the earlier phases that must be `done` first (`[none]` = a root phase). It is the single signal the executor uses to derive parallel waves — phases whose dependencies are all `done` and whose `Files to create / modify:` tables are path-disjoint may run concurrently (`plan-instructions.md § Phase Dependencies & Waves`).

| Phase | Name | Depends On | Summary |
|-------|------|------------|---------|
| 1 | Universal Resize | [none] | Shared `NodeResizeFrame` (resizer + 4 handles) wraps markdown/note/image/link cards; markdown stays auto-height (vertical drag re-derives `--fc-body-max`), others fix the box; persists via existing `setNodeSize`. |
| 2 | Edge Action Bar & Explicit Selection | [none] | Selected-edge `EdgeActionBar` (rel ▾ · ✎ label · ✕) reusing `setEdgeRel`/`relabelEdge`/`removeEdgeWriteback`; delete moves out of `RelPicker`; explicit `selectable`/`deletable` on adapter edges + `elementsSelectable`/`edgesFocusable` on `<ReactFlow>`. |
| 3 | Comment ↔ Widget Connection | [Phase 1] | `selectNodeCommentCount` selector + pure `nodeDisplayName` helper + on-card `CommentBadge` + thread-header human name + inspector "Comments on this node" list with click-to-focus. Read-side only — no change to comment creation/anchoring. |
| 4 | Visual Integrity & Reader Redesign | [Phase 1, Phase 2, Phase 3] | Kill always-on rings (focus-only states), recalibrate `--color-secondary #ddb7ff → #e4c6ff`, role-reduce prose violet (`em`/links), collapsible compact reader frontmatter + prose ramp tuning. Cross-cutting CSS closer over edges.css/nodes.css/studio-inspector.css written by 1–3. |

> **Wave structure:** Wave 1 = Phase 1 ∥ Phase 2 (both `[none]`, file-disjoint). Wave 2 = Phase 3 (after Phase 1). Wave 3 = Phase 4 (after 1–3). Waves are advisory; a strictly sequential 1→2→3→4 run is never a breach (`plan-instructions.md § Phase Dependencies & Waves`).

> **Execution record:** this file is the spec. Phase execution history lives in `003-canvas-foundation-log.md` (same folder, one entry per phase end + one plan-end entry). The plan file and the log file are separate by design — do not inline execution status here.

---

## Phase 1 — Universal Resize

**Goal:** Lift the group node's proven `NodeResizer` pattern into a single shared `NodeResizeFrame` wrapper and apply it uniformly to the markdown, note, image, and link nodes, so every widget selects and resizes with visible handles and the new size persists through the existing `setNodeSize` action. First because 004's new surfaces must land on a canvas where the basics work, and because it is the largest discoverability gap (only `group-node.tsx` resizes today). This is the active phase — full depth.

**Phase Status:** done

**Evaluation:** review-agent (code-reviewer-agent + `flowcode:browser` visual-parity/app-smoke at phase close)

**Depends On:** [none]

**Touched Modules:**
- `node-components` (`components/canvas/nodes/*` + `app/styles/nodes.css` resizer chrome) → `.flowcode/project/modules/node-components.md` — **MISSING (pre-existing gap)**: no per-module detail file exists; `.flowcode/project/modules/` holds only `README.md`. Flag at the gate; do not fabricate.

> Phase 1 only **reads** `store.setNodeSize` and `store.mode` — it does not change the Store module, so Store is not a Touched Module here.

**Files to create / modify:**

| File | Operation | Description |
|------|-----------|-------------|
| `components/canvas/nodes/node-frame.tsx` | create | NEW `NodeResizeFrame({id, selected, minWidth, minHeight, children})` — renders `<NodeResizer>` (sibling) + `children` (the card) + the four source `<Handle>`s (siblings). `isVisible = selected && mode !== 'comment'`; `onResizeEnd → setNodeSize(id, round(w), round(h))`. The shared, imported-by-all file — written first in the main session. |
| `components/canvas/nodes/markdown-node.tsx` | modify | `Inner({ id, data })` → `Inner({ id, selected, data })`; replace the outer `<>…{SIDES.map}</>` with `<NodeResizeFrame id selected minWidth={240} minHeight={140}>{the .fc-node--md card}</NodeResizeFrame>`; delete the local `SIDES` const + `<Handle>` block (frame owns them). Adapter markdown auto-height left untouched (Decision 1 Option C). |
| `components/canvas/nodes/note-node.tsx` | modify | add `selected` to `Inner`; wrap the `.fc-node--note` div in `<NodeResizeFrame … minWidth={180} minHeight={120}>` (fixed box); delete local handles/`SIDES`. |
| `components/canvas/nodes/image-node.tsx` | modify | `Inner({ data })` → `Inner({ id, selected, data })`; wrap `.fc-node fc-node--img` in `<NodeResizeFrame … minWidth={160} minHeight={120}>`; delete local handles/`SIDES`. |
| `components/canvas/nodes/link-node.tsx` | modify | `Inner({ data })` → `Inner({ id, selected, data })`; wrap the `.fc-node--link` `<a>` in `<NodeResizeFrame … minWidth={180} minHeight={56}>`; delete local handles/`SIDES`; keep the `normalizeUrl` export. |
| `app/styles/nodes.css` | modify | add `.fc-rzline` + `.fc-rzhandle` chrome mirroring `.fc-group__rzline`/`.fc-group__rzhandle` (lines 413–420). Do **not** touch any `.fc-group__*` rule. |

> **Within-phase fan-out:** `node-frame.tsx` is the shared NEW file every node imports — write it (and the `nodes.css` rule) in the **main session first**. The four node-component `modify` rows are then mutually independent (no row imports another) → the executor MAY fan them out to parallel `flowcode:implementer-agent` workers, integrating after they return (`plan-instructions.md § Phase Execution`).

**Implementation steps:**

- [x] Create `components/canvas/nodes/node-frame.tsx` exporting `NodeResizeFrame`. Subscribe `setNodeSize` and `mode === 'comment'` from `useCanvasStore`. Render `<NodeResizer isVisible={selected && !commentMode} minWidth minHeight onResizeEnd={(_e,d)=>setNodeSize(id, Math.round(d.width), Math.round(d.height))} lineClassName="fc-rzline" handleClassName="fc-rzhandle" />`, then `{children}`, then a `[Top,Right,Bottom,Left].map(p => <Handle key={p} type="source" position={p} id={p} />)`.
- [x] `markdown-node.tsx`: change the signature to `Inner({ id, selected, data }: NodeProps)`; replace the outer fragment + trailing `{SIDES.map(...)}` with the `<NodeResizeFrame id={id} selected={!!selected} minWidth={240} minHeight={140}>` wrapper around the existing `.fc-node--md` card; remove the now-unused local `SIDES` const and the `import { Handle, Position }` (frame owns handles — keep only `type { NodeProps }`).
- [x] `note-node.tsx`: change the signature to `Inner({ id, selected, data }: NodeProps)`; wrap the `.fc-node--note` div in `<NodeResizeFrame id={id} selected={!!selected} minWidth={180} minHeight={120}>`; remove the local `SIDES`/`<Handle>` block + unused `Handle`/`Position` imports. Keep the double-click → inline textarea edit intact.
- [x] `image-node.tsx`: change the signature to `Inner({ id, selected, data }: NodeProps)`; wrap the `.fc-node fc-node--img` div in `<NodeResizeFrame id={id} selected={!!selected} minWidth={160} minHeight={120}>`; remove the local handles + unused imports.
- [x] `link-node.tsx`: change the signature to `Inner({ id, selected, data }: NodeProps)`; wrap the `.fc-node--link` `<a>` in `<NodeResizeFrame id={id} selected={!!selected} minWidth={180} minHeight={56}>`; remove the local handles + unused imports; leave `export function normalizeUrl` untouched.
- [x] `app/styles/nodes.css`: append the `.fc-rzline` / `.fc-rzhandle` rules (mirroring `.fc-group__rzline` / `.fc-group__rzhandle`). Do not modify the existing `.fc-group__*` rules — the group keeps its bespoke chrome and stays the reference.
- [x] Confirm `components/canvas/nodes/group-node.tsx` is **not** modified (reference pattern; it retains `.fc-group__rzline`/`.fc-group__rzhandle` and the `:has(.fc-group)` pointer-events rules).
- [x] `flowcode:browser` verify: each of markdown/note/image/link selects + shows the 8-handle resizer; drag persists + survives `Cmd-S` + reload; markdown reveal semantics hold (no inner scrollbar); comment mode hides the handles. Capture the `② Resize` state to `mockups/captures/phase-1/`.

**Code & examples:**

New shared frame — `components/canvas/nodes/node-frame.tsx` (full file; mirrors the proven group-node usage at `group-node.tsx:59-66` + the design's API/Interface Contract):

```tsx
'use client'
import { Handle, Position, NodeResizer, type NodeProps } from '@xyflow/react'
import type { ReactNode } from 'react'
import { useCanvasStore } from '@/lib/canvas/store'

const SIDES = [Position.Top, Position.Right, Position.Bottom, Position.Left]

export interface NodeResizeFrameProps {
  id: string
  selected: boolean
  minWidth: number
  minHeight: number
  children: ReactNode
}

// One shared resizer + handles wrapper for every non-group card. The <NodeResizer> and the four
// <Handle>s are SIBLINGS of the card (never nested inside its overflow:hidden box) — the exact
// constraint the node-component comments warn about. Resize persists through the existing setNodeSize
// action (no schema change). Handles are hidden in comment mode so they never swallow a pin-drop click.
export function NodeResizeFrame({ id, selected, minWidth, minHeight, children }: NodeResizeFrameProps) {
  const setNodeSize = useCanvasStore((s) => s.setNodeSize)
  const commentMode = useCanvasStore((s) => s.mode === 'comment')
  return (
    <>
      <NodeResizer
        isVisible={selected && !commentMode}
        minWidth={minWidth}
        minHeight={minHeight}
        onResizeEnd={(_e, d) => setNodeSize(id, Math.round(d.width), Math.round(d.height))}
        lineClassName="fc-rzline"
        handleClassName="fc-rzhandle"
      />
      {children}
      {SIDES.map((p) => (
        <Handle key={p} type="source" position={p} id={p} />
      ))}
    </>
  )
}
```

Per-node wrap — `markdown-node.tsx` (the representative auto-height case; the trailing `{SIDES.map}` block and the local `SIDES` const are removed, the frame supplies the handles):

```tsx
// imports: drop `Handle, Position`; keep `type { NodeProps }`; add the frame
import { type NodeProps } from '@xyflow/react'
import { NodeResizeFrame } from './node-frame'
// ...
function Inner({ id, selected, data }: NodeProps) {      // was ({ id, data })
  const node = (data as { node: FileNode }).node
  // ...unchanged: fm / collapsed / body / toggle / maximizeReader / title...
  return (
    <NodeResizeFrame id={id} selected={!!selected} minWidth={240} minHeight={140}>
      <div className={cn('fc-node', 'fc-node--md', collapsed && 'is-collapsed')}>
        <header className="fc-node__head">{/* …title · md · ⤢ · collapse… */}</header>
        <FrontmatterView frontmatter={fm} variant="card" sourceNodeId={node.id} />
        <div className="fc-node__body">
          <CanvasMarkdown basePath={node.file}>{body ?? '_resolving…_'}</CanvasMarkdown>
        </div>
      </div>
    </NodeResizeFrame>
  )
}
```

Per-node wrap — `image-node.tsx` (the representative `{ data }`-only case that must gain `id`/`selected`):

```tsx
import { type NodeProps } from '@xyflow/react'
import { NodeResizeFrame } from './node-frame'
// ...
function Inner({ id, selected, data }: NodeProps) {      // was ({ data })
  const node = (data as { node: FileNode }).node
  const name = node.file.split('/').pop() ?? node.file
  const [errored, setErrored] = useState(false)
  return (
    <NodeResizeFrame id={id} selected={!!selected} minWidth={160} minHeight={120}>
      <div className="fc-node fc-node--img">
        <div className="fc-node__imgwrap">
          {errored
            ? <span className="fc-node__imgwrap--err">image not found</span>
            // eslint-disable-next-line @next/next/no-img-element
            : <img src={assetUrl(node.file)} alt={name} loading="lazy" onError={() => setErrored(true)} />}
        </div>
        <span className="fc-node__caption">{name}</span>
      </div>
    </NodeResizeFrame>
  )
}
```

Resizer chrome — append to `app/styles/nodes.css` (mirrors `.fc-group__rzline`/`.fc-group__rzhandle` at lines 413–420):

```css
/* Shared NodeResizeFrame chrome (markdown / note / image / link) — nyx accents; handles enlarged
   for grab. Mirrors the group resizer; group keeps its own .fc-group__rz* rules unchanged. */
.fc-rzline { border-color: var(--color-primary) !important; }
.fc-rzhandle {
  width: 10px !important;
  height: 10px !important;
  background: var(--color-primary) !important;
  border: 1.5px solid var(--color-bg) !important;
  border-radius: 2px;
}
```

Worked example (pins the markdown reveal vs fixed-box behavior):

```text
Markdown node "Auth Service" (id n-auth), authored box 320×240:
  user drags the SE handle to ~420×360 and releases
  → NodeResizer onResizeEnd(d = { width: 419.6, height: 360.4 })
  → setNodeSize('n-auth', 420, 360)                          // Math.round each
  → store: doc.nodes[n-auth] = { …, width: 420, height: 360 }, dirty = true
  → adapter.toReactFlow: kind === 'markdown' ⇒ RF height = undefined (auto-measure),
        style['--fc-body-max'] = max(72, 360 - 88) = 272px   // body clamp grows; more body revealed
  → card settles to its CONTENT height (≤ the dragged box); width = 420
  → Cmd-S → POST /api/canvas writes width:420,height:360 → reload restores the size

Note node "Risk" (id n-risk), authored box 200×140 (non-markdown ⇒ fixed):
  drag to 260×200 → setNodeSize('n-risk', 260, 200)
  → adapter keeps RF height = 200 → card renders exactly 260×200 (fixed box, like the group node)
```

**Diagram:** resize → persist (markdown re-derives the body clamp on release; others fix the box) — condensed from the design's Sequence/Flow diagram:

```mermaid
sequenceDiagram
  participant U as User
  participant NR as "NodeResizer (in NodeResizeFrame)"
  participant S as "store.setNodeSize"
  participant A as "adapter.toReactFlow"
  U->>NR: "drag a handle (selected && mode !== 'comment')"
  NR-->>S: "onResizeEnd(round(width), round(height))"
  S->>S: "doc.nodes[id].width/height set, dirty=true"
  S->>A: "doc change rebuilds RF nodes"
  A-->>U: "markdown ⇒ height undefined + new --fc-body-max; others ⇒ fixed height"
  U->>S: "Cmd-S persists width/height to .canvas (survives reload)"
```

**Acceptance criteria:**
- [x] Selecting a markdown, note, image, or link node renders the 8-handle `NodeResizer` chrome styled `.fc-rzline`/`.fc-rzhandle`; the group node still uses its own `.fc-group__rz*` and is unchanged.
- [x] Dragging any handle calls `setNodeSize(id, round(w), round(h))`; `Cmd-S` writes `width`/`height` to the `.canvas` file; reload restores the new size.
- [x] Markdown stays content-driven: a vertical drag changes `--fc-body-max` (reveals more/less body), the card never exceeds its content height, no inner scrollbar appears, and the collapse toggle still shrinks the card.
- [x] Note, image, and link resize as fixed boxes (the card matches the dragged dimensions).
- [x] All four sides' `<Handle>`s remain grabbable (handles are frame siblings, not clipped by the card's `overflow:hidden`).
- [x] In comment mode (`mode === 'comment'`) a selected node shows **no** resize handles, so a pin-drop click is not swallowed.
- [x] `flowcode:browser` capture of the `② Resize` state matches the `01-nyx-refined` mockup; console clean; result logged to the ui-design Visual Parity table + `mockups/captures/phase-1/`.

**Quality checks (run at phase close):**
- `typecheck` — `npx tsc --noEmit` (exit 0).
- `lint` — `npm run lint` (exit 0; changed files clean, no unused `Handle`/`Position`/`SIDES`).
- `build` — `npm run build` (exit 0).
- `unit` — `npx vitest run` (stays green; Phase 1 touches no vitest-covered pure module — node components are React, covered by the browser smoke, not vitest — so no new unit tests; confirm no regression).
- `flowcode:browser` (UI Design Gate) — Visual Parity capture of the `② Resize` state at the 1512px desktop breakpoint + App Smoke (resize chrome renders, console clean); classify drift Expected/Acceptable/Regression; no `≥ medium` regression may remain before `Phase Status → done`.

> **Active-phase depth:** Phase 1 is the active phase and meets `plan-instructions.md § Active-Phase Completeness Bar`. Phases 2–4 stay stubs until they become active.

> **Quality gate:** code-review sub-agent runs. See `plan-instructions.md § Phase Close Sequence` for the six-step close. Phase-end `[PHASE]` entry is appended to `003-canvas-foundation-log.md`, not here.

---

## Phase 2 — Edge Action Bar & Explicit Selection

**Goal:** Convert the hidden, popover-buried edge edit/delete into an obvious on-canvas affordance — a portaled `EdgeActionBar` (rel ▾ · ✎ label · ✕) shown only when an edge is `selected`, reusing `setEdgeRel`/`relabelEdge`/`removeEdgeWriteback` verbatim — and make React Flow selection semantics explicit so the contract is legible and stable. (Design Decision 2.)

**Phase Status:** done

**Evaluation:** review-agent

**Depends On:** [none]

> File-disjoint from Phase 1 (edges + adapter + shell vs nodes) and dependency-independent → eligible to run with Phase 1 as Wave 1.

**Touched Modules:**
- `edge-component` (`components/canvas/edges/labeled-edge.tsx`) → `.flowcode/project/modules/edge-component.md` — **MISSING (pre-existing gap)**.
- `adapter` (`lib/canvas/adapter.ts`) → `.flowcode/project/modules/adapter.md` — **MISSING (pre-existing gap)**.
- `canvas-shell` (`components/canvas/canvas-shell.tsx`) → `.flowcode/project/modules/canvas-shell.md` — **MISSING (pre-existing gap)**.

**Files to create / modify (rough — expand to full depth when active):**

| File | Operation | Description |
|------|-----------|-------------|
| `components/canvas/edges/labeled-edge.tsx` | modify | Consume `selected` from `EdgeProps`; render `EdgeActionBar` in `EdgeLabelRenderer` at `(labelX, labelY + 24)` with `rel ▾` (toggle `RelPicker`) · `✎` (`setEditingEdge`→`relabelEdge`) · `✕` (`removeEdgeWriteback`, `data-testid="edge-delete"`). Strip `fc-relpick__del` from `RelPicker` (single delete surface). |
| `lib/canvas/adapter.ts` | modify | `toReactFlow` edge mapping gains `selectable: true, deletable: true` (was relying on RF defaults). |
| `components/canvas/canvas-shell.tsx` | modify | `<ReactFlow>` gains explicit `elementsSelectable` + `edgesFocusable`. |
| `app/styles/edges.css` | modify | New `.fc-edge-actions` bar styles (anchored below the pill; nyx glass). |

**Implementation steps (outline — expand when active):**
- [x] Destructure `selected` in `LabeledEdge`; portal `EdgeActionBar` only when `selected`.
- [x] Move the delete control + `data-testid="edge-delete"` out of `RelPicker` into the bar; reduce `RelPicker` to the rel grid + free-form label field.
- [x] Add `selectable: true, deletable: true` to adapter edges; add `elementsSelectable`/`edgesFocusable` to `<ReactFlow>`.
- [x] Style `.fc-edge-actions`; verify keyboard `Delete`/`Backspace` still deletes; verify multi-select does not over-clutter.

**Acceptance criteria (outline):**
- [x] Clicking an edge selects it and reveals the bar; `rel ▾`/`✎`/`✕` drive the three existing store actions; the only delete surface is the bar.
- [x] `selectable`/`deletable` are explicit on edges; `elementsSelectable`/`edgesFocusable` explicit on `<ReactFlow>`; keyboard delete still works.
- [x] `flowcode:browser` `② Edge tools` capture matches the `01-nyx-refined` mockup; console clean.

**Quality checks (run at phase close):** `typecheck` (`npx tsc --noEmit`) · `lint` (`npm run lint`) · `build` (`npm run build`) · `unit` (`npx vitest run` — adapter `selectable`/`deletable` mapping covered by `adapter.test.ts`) · `flowcode:browser` Visual Parity + App Smoke.

> **Quality gate:** code-review sub-agent runs. See `plan-instructions.md § Phase Close Sequence`.

---

## Phase 3 — Comment ↔ Widget Connection

**Goal:** Connect comments to the widgets they annotate, purely on the read side: a primitive-returning `selectNodeCommentCount(id)` selector drives an on-card `CommentBadge`, a shared pure `nodeDisplayName(node)` resolves the thread header's human name (replacing the raw UUID), and the inspector gains a "Comments on this node" list with click-to-focus. No change to how comments are created or anchored. (Design Decision 3.)

**Phase Status:** done

**Evaluation:** review-agent

**Depends On:** [Phase 1]

> Renders `<CommentBadge>` as a sibling inside the node-component fragments Phase 1 establishes, and shares `app/styles/nodes.css` with Phase 1 — hence the dependency. File-disjoint from Phase 2, so it may co-run with a still-running Phase 2 once Phase 1 is `done`.

**Touched Modules:**
- `node-components` (`components/canvas/nodes/*` — render the badge; `app/styles/nodes.css` `.fc-node__badge`) → `.flowcode/project/modules/node-components.md` — **MISSING (pre-existing gap)**.
- `node-name` (`lib/canvas/node-name.ts` — NEW pure helper) → `.flowcode/project/modules/node-name.md` — **MISSING (pre-existing gap)**.
- `store` (`lib/canvas/store.ts` — export `selectNodeCommentCount`) → `.flowcode/project/modules/store.md` — **MISSING (pre-existing gap)**.
- `comments` (`components/canvas/comment-layer.tsx` — `anchorLabel` via `nodeDisplayName`) → `.flowcode/project/modules/comments.md` — **MISSING (pre-existing gap)**.
- `inspector-rail` (`components/canvas/inspector-rail.tsx` — comments section) → `.flowcode/project/modules/inspector-rail.md` — **MISSING (pre-existing gap)**.

**Files to create / modify (rough — expand to full depth when active):**

| File | Operation | Description |
|------|-----------|-------------|
| `components/canvas/nodes/comment-badge.tsx` | create | `CommentBadge({nodeId})` — subscribes `selectNodeCommentCount`; hidden at 0; `9+` above `COUNT_CAP`; click → `setSelection([nodeId])`; `data-testid="node-comment-badge"`. |
| `lib/canvas/node-name.ts` | create | Pure `nodeDisplayName(node)` (group→label, link→url, text→first line, file(md)→`meta.frontmatter.name`||basename, file(other)→basename). DOM-free. |
| `lib/canvas/store.ts` | modify | Export `selectNodeCommentCount(id)` (unresolved root comments anchored to `id`; returns a primitive `number`). No state change. |
| `components/canvas/nodes/{markdown,note,image,link}-node.tsx` | modify | Render `<CommentBadge nodeId={id} />` as a card-sibling inside the `NodeResizeFrame` fragment. |
| `components/canvas/comment-layer.tsx` | modify | Replace `anchorLabel` (UUID) with `nodeDisplayName` over a `nodeById` map. |
| `components/canvas/inspector-rail.tsx` | modify | "Comments on this node" list (badge # · author · preview · resolved), row click → `focusNode(id)`. |
| `app/styles/nodes.css` | modify | `.fc-node__badge` styles. |
| `app/styles/studio-inspector.css` | modify | Comments-section styles. |

**Acceptance criteria (outline):**
- [x] A node with unresolved root comments shows the on-card badge (hidden at 0; `9+` above cap; `aria-label` carries the exact count); click selects the node and populates the inspector.
- [x] Thread header shows the node's human name, not a UUID; inspector lists the node's comments with click-to-focus via `focusNode`.
- [x] `selectNodeCommentCount` returns a primitive (no object-identity churn); `addComment`/anchor math unchanged.
- [x] `flowcode:browser` `③ Comments` capture matches the `01-nyx-refined` mockup; console clean.

**Quality checks (run at phase close):** `typecheck` · `lint` · `build` · `unit` (`npx vitest run` — add unit coverage for the pure `nodeDisplayName` + the `selectNodeCommentCount` selector under `lib/canvas/*`) · `flowcode:browser` Visual Parity + App Smoke.

> **Quality gate:** code-review sub-agent runs. See `plan-instructions.md § Phase Close Sequence`.

---

## Phase 4 — Visual Integrity & Reader Redesign

**Goal:** The cross-cutting visual closer — remove the always-on faded rings and replace them with deliberate focus-only states, recalibrate `--color-secondary #ddb7ff → #e4c6ff` and reduce its prose roles (reader `em → --color-text-primary`, inline links `→ --color-primary`), and rework the reader so frontmatter is compact/collapsible and the prose ramp reads well (keep Geist; tune `font-feature-settings`/spacing only). (Design Decision 4 + all 5 resolved Open Questions.)

**Phase Status:** done

**Evaluation:** review-agent

**Depends On:** [Phase 1, Phase 2, Phase 3]

> Cross-cutting CSS closer: it edits `app/styles/edges.css` (shared with Phase 2), `app/styles/nodes.css` (shared with Phases 1 & 3), and `app/styles/studio-inspector.css` (shared with Phase 3) — so it follows all three to avoid write races, and verifies the full interaction layer in the browser in one pass.

**Touched Modules:**
- `frontmatter-view` (`components/canvas/frontmatter-view.tsx` — `collapsible` reader variant) → `.flowcode/project/modules/frontmatter-view.md` — **MISSING (pre-existing gap)**.
- `reader` (`components/canvas/reader-drawer.tsx` — pass `collapsible`) → `.flowcode/project/modules/reader.md` — **MISSING (pre-existing gap)**.
- `design-tokens-and-styles` (`app/globals.css` `--color-secondary`; `app/styles/{edges,nodes,studio-inspector,toolbar,reader,frontmatter}.css`) → `.flowcode/project/modules/design-tokens-and-styles.md` — **MISSING (pre-existing gap)**.

**Files to create / modify (rough — expand to full depth when active):**

| File | Operation | Description |
|------|-----------|-------------|
| `app/globals.css` | modify | `--color-secondary: #ddb7ff → #e4c6ff` (`@theme` token; global, benign ripple accepted per resolved Open Question). |
| `app/styles/edges.css` | modify | `.fc-edge-input` 3px ring moves to `:focus` only (drop shadow stays at rest). |
| `app/styles/nodes.css` | modify | `.fc-note__edit` rest border → `--color-outline-variant` + crisp `--color-primary` `:focus` ring (drop always-on indigo border + faded second ring). |
| `app/styles/studio-inspector.css` | modify | `.fc-insp__src` → neutral glass surface (`--color-surface-low` + `--color-outline-variant`); label carries the violet via text only. |
| `app/styles/toolbar.css` | modify | `.fc-agent__ta` lighten to a surface token + crisp `:focus` border. |
| `app/styles/reader.css` | modify | Prose `em → --color-text-primary`, inline links `→ --color-primary` (underline kept); `h3` keeps violet accent; type ramp tuning (Geist + `font-feature-settings`/`text-rendering`, 17px/1.7); collapsible-fm styles. |
| `app/styles/frontmatter.css` | modify | Reader collapsible toggle styles. |
| `components/canvas/frontmatter-view.tsx` | modify | Add `collapsible` prop (reader variant); collapsed = status pill + first tags + "+N", `data-testid="reader-fm-toggle"` expander reveals the full kv grid + links. |
| `components/canvas/reader-drawer.tsx` | modify | Pass `collapsible` to `<FrontmatterView variant="reader">`. |

**Acceptance criteria (outline):**
- [x] No always-on faded ring/box on any inline editor or input — focus states are crisp and present only on `:focus`.
- [x] `--color-secondary` is `#e4c6ff` globally; reader `em` renders in `--color-text-primary`, inline links in `--color-primary`; `h3` keeps a violet accent.
- [x] Reader frontmatter is collapsed by default (status + tags + "+N") with a working expander; prose reads at the tuned ramp.
- [x] `flowcode:browser` `④ Violet` + `⑤ Reader` captures match the `01-nyx-refined` mockup; the reader `em`/heading recolor + recalibrated violet are recorded as **Expected drift**, not regressions, in the ui-design Visual Parity table + qa-report.

**Quality checks (run at phase close):** `typecheck` · `lint` · `build` · `unit` (`npx vitest run` — `frontmatter-view` `collapsible` is React, not vitest-covered; confirm no regression) · `flowcode:browser` Visual Parity (heavy — Expected drift for violet/reader) + App Smoke.

> **Quality gate:** code-review sub-agent runs. See `plan-instructions.md § Phase Close Sequence`.

> **Within-phase parallelism:** the `create` rows in a phase's `Files to create / modify:` table that are mutually independent (no row imports another) are the unit of within-phase fan-out — the executor may implement them with parallel `flowcode:implementer-agent` workers, while shared/`modify` rows (files many others import) stay in the main session. List files at that granularity so the split is visible (`plan-instructions.md § Phase Execution`).

---

## Post-Execution Artifacts

After all phases complete, run the two-phase pipeline (see `flowcode/workflow/flowcode-workflow.md § Generate Artifacts Workflow` and `plan-instructions.md § Post-Execution Pipeline`):

**Sequential — audit and authoritative source:**
1. Code Explorer sub-agent (sonnet) audits implementation against plan (`code-explorer-agent.md`)
2. `.flowcode/plans/003-canvas-foundation/003-canvas-foundation-technical-overview.md` (use `technical-overview-template.md`) — generated from audit findings; feeds the downstream artifacts
3. `.flowcode/plans/003-canvas-foundation/003-canvas-foundation-qa-report.md` (use `qa-report-template.md`) — requires all gates to pass

**Parallel — finalization (sonnet sub-agents, after technical-overview + QA gates pass):**
- `.flowcode/plans/003-canvas-foundation/003-canvas-foundation-changelog.md` — finalize Summary and Reconciliation sections; per-phase sections were appended during the plan
- `.flowcode/plans/003-canvas-foundation/003-canvas-foundation-test-notes.md` (use `test-notes-template.md`)

Update `.flowcode/plans/plan-index.md` row: status → `complete`.

---

## Dependencies

| Dependency | Type | Notes |
|------------|------|-------|
| `003-canvas-foundation-design.md` | upstream artifact | Approved 2026-06-29; all 5 Open Questions resolved at recommended defaults. |
| `003-canvas-foundation-ui-design.md` | upstream artifact | Approved; variant `01` nyx-refined; constant interaction layer + Visual Parity table wired into each UI phase close. |
| `@xyflow/react` ^12 `NodeResizer` / edge selection API | external | Stable; in-repo reference is `group-node.tsx` (Phase 1) + `labeled-edge.tsx` (Phase 2). No new dependency. |
| Module detail files under `.flowcode/project/modules/` | known gap | Only `README.md` exists; every Touched Module is flagged **MISSING (pre-existing gap)** — surfaced at the gate; not created by this plan. |

---

## Revision History

| Date | Change | Reason |
|------|--------|--------|
| 2026-06-29 | Plan created — 4 phases; Phase 1 (Universal Resize) at full depth, Phases 2–4 stubbed | Translate the approved 003 design into an execution-ready plan |

---
name: 004-generation-loop-changelog
description: Per-phase changelog for 004-generation-loop — file-level change record built incrementally and reconciled against code at plan completion.
status: active
tags: [changelog, changes, per-phase]
links: [.flowcode/plans/004-generation-loop/004-generation-loop-plan.md, .flowcode/plans/004-generation-loop/004-generation-loop-technical-overview.md]
---

# Changelog — 004-generation-loop Markdown-Core Generation Loop

- The closed generation loop: a markdown doc → a discoverable Agent Generation Kit → a typed system-design `.canvas`, with the markdown kept as a living, bidirectionally-linked core spine, plus frictionless three-way import. Built additively over Plan 003 (`schemaVersion 0.2 → 0.3`).
- Type: FEATURE.
- Status active; dated 2026-06-29.
- Built incrementally per phase; reconciled against code at plan completion.
- Source plan: `004-generation-loop-plan.md`.

---

## Summary

Plan 004 delivered the closed Markdown-Core Generation Loop in five phases (30/30 files verified by the code-explorer audit): a single-source Agent Generation Kit (`lib/canvas/generation-kit.ts`) surfaced over MCP tool + static resource + UI tab; a `ComponentKind` schema model (`lib/canvas/jsoncanvas.ts:15`) with kind-aware `component-node.tsx` widgets that render system-design diagrams instead of document cards; a docked, editable `CoreSpine` pane with bidirectional section↔component highlighting built on `buildSourceIndex` (`lib/canvas/spine.ts:36`); and a `parseFlowcanvasDoc` → `migrateDoc` → `importDoc` import path (paste / upload / drag-drop) that upgrades every board to `schemaVersion:'0.3'` on open. All additions were purely additive over Plan 003 — no existing board changes behavior at rest.

---

## Phase 1 — Schema & Pure-Lib Foundation

| File | Type | Summary |
|------|------|---------|
| `lib/canvas/jsoncanvas.ts` | modified | Added `ComponentKind` (8-value semantic system-design enum, DISTINCT from `NodeKind`), `COMPONENT_KINDS`, `ComponentKindMeta` + `COMPONENT_KIND_META` (per-kind label/glyph/silhouette/accent); `NodeMeta.kind?`; `SessionMeta.coreDocPath?`; widened `SCHEMA_VERSIONS`→`['0.1','0.2','0.3']` and `FlowcanvasExt.schemaVersion`. All additive/optional. |
| `lib/canvas/generation-kit.ts` | created | Single-source Agent Generation Kit: `kitSections()` (systemPrompt · schemaContract · mcpHowTo · workedExample) + `buildKit(markdown?)`. Owns the contract text (moved from `brief.AGENT_CONTRACT`) + the `ComponentKind` catalog + github-slug rule + boundary group-only constraint. Pure. |
| `lib/canvas/spine.ts` | created | Pure slug/outline/index helpers: `slugify` (wraps `github-slugger`), `outlineOf`, `buildSourceIndex` (anchor→nodeIds), `citedDocPaths` (spine-switcher choices). Feeds Phase 4 bidirectional linking. |
| `lib/canvas/validate.ts` | created | `flowcanvasDocSchema` (zod) + `parseFlowcanvasDoc` — import-path gatekeeper; node members `.passthrough()` (preserve unmodeled fields); enforces `ComponentKind` enum + rejects `meta.kind:'boundary'` on non-group nodes (Q3). |
| `lib/canvas/migrate.ts` | created | `migrateDoc(doc): { doc, migrated }` — version ladder `0.1→0.2` (bake derived `links:` edges) `→0.3` (no-op bump); shared by `store.load` + `importDoc` (Phase 5). Pure. |
| `lib/canvas/brief.ts` | modified | `BriefNode.componentKind?`, `AgentNode.kind?`, `DesignBrief.coreDocPath?`; `buildBrief` emits them + `responseContract = kitSections().schemaContract`; `nodeFromAgent` threads `an.kind → meta.kind`; `AGENT_CONTRACT` is now a re-export of `kitSections().schemaContract` (single source). |
| `lib/render-md.ts` | modified | Inserted `rehype-slug` after `rehypeSanitize` (before shiki) so rendered headings carry `id`s matching `slugify()` / `meta.source.anchor` (three-way slug parity, Q2). |
| `docs/flowcanvas-agent-contract.md` | modified | Regenerated verbatim from `kitSections().schemaContract` with a GENERATED header note (no longer an independent copy). |
| `package.json` / `package-lock.json` | modified | Added `github-slugger@^2.0.0` + `rehype-slug@^6.0.0` as direct deps (transitive-absent before). |
| `lib/canvas/spine.test.ts` | created | Unit tests incl. the mandatory three-way slug-parity test (`slugify` === rendered `<h2 id>` === agent anchor), `outlineOf`, `buildSourceIndex`, `citedDocPaths`. |
| `lib/canvas/validate.test.ts` | created | Accepts valid 0.1/0.2/0.3 docs; rejects malformed JSON, unknown `ComponentKind`, and `boundary` on a non-group node. |
| `lib/canvas/migrate.test.ts` | created | `0.1→0.3` (link edges baked), `0.2→0.3` (no-op-but-bumped), `0.3` idempotent; `migrated` flag correctness. |
| `lib/canvas/generation-kit.test.ts` | created | `kitSections()` 4 sections; `schemaContract` contains all 8 kinds + slug rule + boundary line; `buildKit(md)` appends payload, `buildKit()` omits it. |
| `lib/canvas/brief.test.ts` | modified | Added a `004 generation-loop round-trip` block (componentKind/coreDocPath emission, kind threading, single-source contract). |
| `.flowcode/project/modules/{schema,brief,render-md}.md` | modified | Refreshed contracts for the Phase 1 additions. |
| `.flowcode/project/modules/{generation-kit,spine,validate,migrate}.md` | created | New deep module docs for the four new pure-lib modules. |

---

## Phase 2 — System-Design Component Rendering

| File | Type | Summary |
|------|------|---------|
| `lib/canvas/adapter.ts` | modified | `toReactFlow` computes `renderType = n.meta?.kind && n.type !== 'group' ? 'component' : nodeKind(n)` (kinded non-group → `'component'`); `autoHeight = renderType === 'markdown'`; a `boundary`/colored group injects `--node-accent` from `COMPONENT_KIND_META[kind].accent`. Imports `COMPONENT_KIND_META`. |
| `components/canvas/nodes/component-node.tsx` | created | Kind-aware system-design widget: `KindGlyph` (inline SVG per `COMPONENT_KIND_META.glyph`), name + kind eyebrow + one-line role + `§source` chip; `data-testid="component-node"` + `data-kind`/`data-silhouette`; `NodeResizeFrame` (4 handles) + `CommentBadge`; neutral `unknown` fallback. First `NodeResizeFrame` adopter. |
| `components/canvas/canvas-shell.tsx` | modified | Registers `component: ComponentNode` in `nodeTypes` (kept `NodeKind`-exhaustive via intersection); agent-panel tab type widened to `'export'|'import'|'kit'`. |
| `app/styles/nodes.css` | modified | `.fc-cmp` glass widget + per-kind accent palette keyed off `data-kind` (service=cyan · datastore=lime · queue=amber · actor=violet · external=rose · decision=indigo · process · boundary), cylinder (datastore) + dashed (external) silhouettes, `§source` chip, selection ring; `.fc-group` outline now honors `--node-accent`. |

---

## Phase 3 — Agent Generation Kit Surfaces

| File | Type | Summary |
|------|------|---------|
| `mcp/flowcanvas-mcp.ts` | modified | `registerTool('get_generation_kit', { markdownPath? })` (reads the attached doc via `/api/file`, returns `buildKit(md)`) + `registerResource('generation-kit', 'flowcanvas://generation-kit', …)` static-URI returning `buildKit()`. 7→8 tools + 1 resource. Imports `buildKit`. |
| `components/canvas/export-panel.tsx` | modified | New `'kit'` tab (`generation-kit-modal`): 5-section nav over `kitSections()`, `<pre>` body, "Copy full kit" (`kit-copy`) copying `buildKit(coreDocMarkdown)` (core doc via `readFileApi(session.coreDocPath)`; base kit until the spine lands). |
| `components/canvas/canvas-toolbar.tsx` | modified | "Generation Kit" button (`generation-kit-button`) → `onOpenAgent('kit')`; `onOpenAgent` prop widened to `'export'|'import'|'kit'`. |
| `app/styles/toolbar.css` | modified | `.fc-tbtn--kit` (lime→cyan) + kit-tab styles (`.fc-kit__nav`, `.fc-kit__navbtn`, `.fc-kit__body`, `.fc-kit__attached`). |
| `scripts/smoke-mcp.mjs` | modified | Assert 8 tools; exercise `get_generation_kit` (base + `markdownPath`) and the `flowcanvas://generation-kit` resource (list + read). Header comments refreshed. |
| `.flowcode/project/modules/{adapter,canvas-nodes,canvas-shell,canvas-toolbar,mcp-sidecar}.md` | modified | Contracts refreshed for the Wave 2 changes. |
| `.flowcode/project/project-overview.md` | modified | MCP Sidecar row → 8 tools + `get_generation_kit` + the resource. |

---

## Phase 4 — Living Core Spine & Bidirectional Linking

| File | Type | Summary |
|------|------|---------|
| `lib/canvas/store.ts` | modified | Transient `coreDocBody`/`coreDocDraft`/`coreDocDirty`/`spineHighlightAnchor`/`linkedNodeIds` + 6 actions: `setCoreDoc` (stamp `coreDocPath` + resolve body), `editCoreDoc`, `submitCoreDocEdit` (pendingReview guard → `writeFileApi` → `submitToAgent`), `highlightSpineSection`, `highlightComponents` (`buildSourceIndex`), `clearLinkHighlight`. `load` resolves the core-doc body; `newBoard`/`clearBoard` reset the spine state. `normPath` now imported from `./spine`. |
| `components/canvas/core-spine.tsx` | created | Docked spine pane: `/api/render` prose + edit textarea + dirty + "Submit changes" (single-open-round guard); `citedDocPaths` switcher (Q4); section outline with per-heading component-count badges (`buildSourceIndex`); component→section scroll+one-shot pulse; prose relative-link → focus-if-on-board. |
| `components/canvas/canvas-shell.tsx` | modified | Mount `<CoreSpine>` (flex pane between canvas + inspector) when a core doc is bound or a doc is cited; `spineOpen` state + reopen strip; pulse `linkedNodeIds` via `fc-rf--linked` over a `rfNodes` useMemo. |
| `components/canvas/nodes/component-node.tsx` | modified | `§source` chip → `button.nodrag.nopan` → `highlightSpineSection(anchor)`. |
| `components/canvas/inspector-rail.tsx` | modified | Component-kind eyebrow (`inspector-kind`) + `§` affordance (`inspector-spine-section`) → `highlightSpineSection`; `normPath` from `./spine`. |
| `lib/canvas/spine.ts` | modified | Export `normPath` (de-duplicated from 3 call sites); `outlineOf` now skips fenced code blocks. |
| `app/styles/studio-spine.css` | created | Spine pane + outline + editor + prose + component-selected heading pulse + section→canvas `fc-rf--linked` pulse + inspector kind eyebrow. `@import`ed in `globals.css`. |
| `app/styles/nodes.css` | modified | `.fc-cmp__src` chip styled as an interactive button (cursor/hover/focus). |
| `lib/canvas/spine.test.ts` | modified | +1 test: `outlineOf` skips ATX-heading lines inside fenced code blocks. |
| `.flowcode/project/modules/core-spine.md` | created | NEW module doc for the spine pane. |
| `.flowcode/project/modules/{store,canvas-shell,canvas-nodes,studio-rails}.md` | modified | Contracts refreshed for the Phase 4 spine/link surfaces. |

---

## Phase 5 — Frictionless Import

| File | Type | Summary |
|------|------|---------|
| `lib/canvas/store.ts` | modified | `importDoc(doc, path?)` (write the validated doc to a minted collision-safe `<stem>-<rid>.canvas` → `load()` adopts — hydrate→migrate→`0.3`→active pointer→`?path=`) + `importCanvasFile(file)` (`JSON.parse(file.text())` → `parseFlowcanvasDoc` → `importDoc`). `load` routes through `migrateDoc` (0.1→0.2→0.3, persists `'0.3'`); `newBoard` mints `'0.3'`. Imports `migrateDoc`+`parseFlowcanvasDoc`; dropped unused `reconcileEdges`. |
| `components/canvas/dropzone.tsx` | modified | Extension dispatch — a `.canvas` in the drop is handled exclusively behind a dirty-guard confirm (`importCanvasFile`, `import-drop-error` toast on invalid); md/image/other keep the unchanged `uploadFile`+`addFileNode` path. |
| `components/canvas/export-panel.tsx` | modified | Import tab (`import-modal`): pasted full board (`flowcanvas`+`nodes`+`edges`, no `responseVersion`) → `parseFlowcanvasDoc` → `importDoc`; AgentResponse keeps the merge path; "Upload .canvas…" (`import-upload`) → `importCanvasFile`; `confirmReplace` dirty-guard on both destructive paths; paste box retestid'd `import-paste`. |
| `app/styles/toolbar.css` | modified | `.fc-dropzone__err` import-error toast; dropzone copy mentions `.canvas`. |
| `app/api/routes-contract.test.ts` | modified | Demo-board + `miniDoc` schemaVersion assertions → `'0.3'` (the post-004 version every opened board upgrades to). |
| `examples/commerce-platform.canvas` | modified | Migrated `0.2 → 0.3` (the intended one-time upgrade when `load` opens a board). |
| `examples/commerce-system.canvas` + `examples/commerce-system.md` | created | A 004 showcase: a system-design board (8 kind-typed components in 3 boundary groups, typed edges) generated from a living core doc — `coreDocPath` bound, every node `meta.source`-anchored. Exercises the whole loop on launch. |
| `.flowcode/project/modules/{store,canvas-toolbar}.md` | modified | Contracts refreshed for the Phase 5 import surfaces. |

---

## Reconciliation

None — per-phase entries match the code (code-explorer audit: 30/30 files present, spec-vs-code MATCH). The eight documented divergences in the per-phase entries are confirmed implementation decisions, not anomalies: (1) widget color via `data-kind` CSS vs `COMPONENT_KIND_META.accent`; (2) kit UI as an agent-panel tab vs standalone modal; (3) spine as a flex pane coexisting with the inspector; (4) `importDoc` write-then-load + minted collision-safe path; (5) `normPath` extracted to `spine.ts`; (6) `outlineOf` skips fenced code blocks; (7) spine mounts when any doc is cited; (8) `clearBoard` resets spine state. All eight are captured in the technical overview Deviations table.

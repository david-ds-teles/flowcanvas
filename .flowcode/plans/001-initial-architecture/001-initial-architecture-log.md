---
name: 001-initial-architecture-log
description: Per-plan execution log for the Flowcanvas v0.1 initial-architecture plan — plan creation, phase ends, and plan completion.
status: active
tags: [plan-log, execution-log, flowcanvas, canvas]
links: [.flowcode/plans/001-initial-architecture/001-initial-architecture-plan.md, .flowcode/plans/001-initial-architecture/001-initial-architecture-design.md, .flowcode/plans/plan-instructions.md]
---

# 001-initial-architecture — Flowcanvas Log

- Per-plan execution record for Flowcanvas v0.1; exactly one log at this path.
- Reverse chronological — newest entry on top, directly below this header; updated at every phase end and at plan end.
- Holds `[PLAN CREATED]` (once), `[PHASE]` (each phase end), `[PLAN COMPLETE]` (once).
- Every entry opens with `**Dev:**`, taken from the session's Acting-as-Dev identity.

---

## [PHASE 4] Content Nodes — complete — 2026-06-26

**Dev:** david-ds-teles
**Started:** 2026-06-26
**Completed:** 2026-06-26
**Built:** The real content layer for the canvas — five `memo` node components (`MarkdownNode`: frontmatter mono table + collapsible rendered body; `ImageNode`: inline `<img>` via `assetUrl` + caption; `LinkChipNode`: `↗` URL chip; `NoteNode`: `text` via `CanvasMarkdown`; `FallbackNode`: catch-all for `group`/non-md `file`) over a thin shared `CanvasMarkdown` renderer — plus the shell rewrite that drops the Phase-2 placeholder/seed, registers the real `nodeTypes`, loads the board (from `?path`, else the default `flowcanvas.canvas`), renders `toReactFlow(doc)`, and shows a minimal empty/error overlay; a shipped **default demo board** (`flowcanvas.canvas` + `examples/welcome.md`/`schema.md`/`architecture.svg`) so the canvas shows real content out of the box; `store.toggleCollapsed` + an immutable `store.load()` refactor; and the Phase-4 node-anatomy + empty-state CSS.
**Files:** `components/canvas/canvas-markdown.tsx`, `components/canvas/nodes/markdown-node.tsx`, `components/canvas/nodes/image-node.tsx`, `components/canvas/nodes/link-node.tsx`, `components/canvas/nodes/note-node.tsx`, `components/canvas/nodes/fallback-node.tsx`, `components/canvas/canvas-shell.tsx`, `lib/canvas/store.ts`, `lib/canvas/adapter.ts`, `lib/canvas/adapter.test.ts`, `app/globals.css`, `flowcanvas.canvas`, `examples/welcome.md`, `examples/schema.md`, `examples/architecture.svg`, `.flowcode/project/project-overview.md`
**Gates:** `tsc 0 · lint 0 · build ok · vitest 8/8 · dev 200 · review: 0 critical/high, 1 medium fixed (FallbackNode), 2 low (1 fixed / 1 deferred→Phase 5), 1 info fixed` — visual-parity: **screenshot-verified** via headless Chrome (default board renders all node kinds; bad `?path` shows the error card; no client console errors) — supersedes the earlier MCP-unavailable deferral; ui-design § Visual Parity Phase-4 row updated with the captures.
**Deviations:** (1) qa Finding 1 (medium): `group` + non-md/non-image `file` kinds were left unregistered after `PlaceholderNode` removal → added `FallbackNode` and registered it for both, `project-overview.md § Node components` synced. (2) qa Finding 3 (low, fixed): removed duplicate `display:flex`/`flexDirection` inline style in `link-node.tsx` (the `.fc-node--link` class already declares them). (3) qa Finding 4 (info, fixed): `markdown-node.tsx` uses the destructured `id` for `bodyFor(id)`. (4) qa Finding 2 (low, deferred→Phase 5): node drags live only in React Flow state until Phase-5 `onNodesChange` writes positions back to the store — a planned phase gap. (5) Collapse `meta.collapsed` is a persistable field, but the save **trigger** (button/autosave) is Phase 7 — `save()` already POSTs the doc, so collapse round-trips once a Phase-7 save fires. (6) **Entry-point gap (user-caught, fixed):** the first close shipped no way to see content — a bare `localhost:3000` was an empty grid because the shell only loaded a board when `?path` was present and no sample existed. Re-opened the phase: added the default-board load + the shipped `flowcanvas.canvas`/`examples/*` demo + a minimal empty/error overlay, and re-verified visually with headless-Chrome screenshots. The prior "data-path-only / PNG deferred" verification was insufficient — headless Chrome is in fact available and is now the visual-parity method. (7) **Content-node design pass (user-caught, fixed):** the first cards didn't match mockup 04 and had three defects — (a) collapse had no visible effect (fixed React-Flow height); (b) inline images only worked for SVG (embedded markdown images resolved against the page URL, 404); (c) frontmatter showed only 3 fields with purple keys and no chips. Fixed by content-sizing markdown nodes in the adapter (`height: undefined` + `--fc-body-max`, so collapse shrinks; CDP-measured 388→171→388 px) with a `nodrag` toggle, routing embedded images through `/api/asset` in `CanvasMarkdown` (PNG verified), and rebuilding the cards to the mockup (all frontmatter fields, muted keys, semantic status chips + tag chips, mono-cyan headings, glowing bullets, code chips, type badge). qa-report Check 18:10 (Findings 6 [high], 7 [high], 8 [medium] — all fixed).

---

## [PHASE 3] Persistence & Resolve API — complete — 2026-06-26

**Dev:** david-ds-teles
**Started:** 2026-06-26
**Completed:** 2026-06-26
**Built:** Six guarded fs Route Handlers (canvas GET/POST with revision bump, batch resolve, asset streaming, markdown file write, directory listing, multipart upload) over a lexical `guardPath` root-confinement guard + a `gray-matter` frontmatter parser, plus typed client wrappers (`lib/api.ts`) and the zustand `useCanvasStore` (`load`/`save` + transient `bodies` cache). Backend persistence + resolve layer for the canvas.
**Files:** `lib/fs-guard.ts`, `lib/canvas/frontmatter.ts`, `app/api/canvas/route.ts`, `app/api/canvas/resolve/route.ts`, `app/api/asset/route.ts`, `app/api/file/route.ts`, `app/api/files/route.ts`, `app/api/upload/route.ts`, `lib/api.ts`, `lib/canvas/store.ts`, `.flowcode/project/project-overview.md`, `.flowcode/plans/001-initial-architecture/001-initial-architecture-design.md`
**Gates:** `tsc 0 · lint 0 · build ok · vitest 8/8 · dev 200 · curl-acceptance 6/6 routes · review: 0 critical/high, 1 medium fixed, 5 low (4 fixed / 1 deferred→Phase 7), 2 info (accepted / deferred→Phase 4)` — visual-parity N/A (Phase 3 is backend-only, no UI surface); qa-runner gates run inline (matching Phase 1/2 precedent).
**Deviations:** (1) `.mdx` accepted alongside `.md` in `/api/file` + `/api/upload` (consistent with `nodeKind`/resolve + design's MARKDOWN_EXT). (2) `mkdir(dirname,{recursive})` before every write (`file`, `upload`, and `canvas` POST — the last added in-close per qa Finding 2) so nested targets don't 500. (3) `/api/canvas/resolve` returns per-item errors inside a 200 rather than a top-level 400 — design contract updated to match (qa Finding 3). (4) `lib/api.ts` + `store.ts` verbatim from plan snippets. (5) Deferred: `store.save()` not echoing server `updatedAt` → Phase 7 (qa Finding 5); zustand in-place node mutation in `load()` → Phase 4 immutable refactor (qa Finding 8). (6) `store.load()` verified transitively (thin glue over `getCanvas`+`resolvePaths`, both curl-confirmed) — no browser harness this phase.

---

## [PHASE 2] Schema, Adapter & Empty Canvas — complete — 2026-06-26

**Dev:** david-ds-teles
**Started:** 2026-06-26
**Completed:** 2026-06-26
**Built:** Typed extended-JSONCanvas schema (`FlowcanvasDoc` + all node/edge/comment types) + bidirectional `FlowcanvasDoc ↔ React Flow` adapter (`toReactFlow`/`toJSONCanvas`/`colorVar`) + a live React Flow canvas (pan/zoom/dot-grid/Controls/MiniMap) rendering two adapter-seeded nyx glass nodes.
**Files:** `lib/canvas/jsoncanvas.ts`, `lib/canvas/adapter.ts`, `lib/canvas/adapter.test.ts`, `components/canvas/canvas-shell.tsx`, `.flowcode/project/project-overview.md`
**Gates:** `tsc 0 · lint 0 · build ok · vitest 8/8 · dev 200 · review: 0 critical/high, 1 medium fixed, 2 low fixed, 2 info (1 fixed/1 accepted)`
**Deviations:** (1) Plan adapter snippet's `React.CSSProperties` (no import) → `import type { CSSProperties }` + `as CSSProperties`. (2) Plan's `toJSONCanvas` edge map hardcoded `toEnd:'arrow'` + `…?.origin as never`, silently erasing edge `color`/`fromEnd` on save → rebuilt with `prevEdgeById` to preserve them (qa-report Finding 1, medium, fixed in-phase). (3) Plan's `nodeTypes = {}` would make React Flow v12 render fallback boxes for the seed → registered a temporary `PlaceholderNode` for all kinds (removed in Phase 4). (4) Seed `SessionMeta` dates given real ISO values. (5) Info: `adapter.ts` legitimately imports `MarkerType` from `@xyflow/react` — project-overview pure-lib rule clarified to exempt it. Visual-parity PNG capture deferred (browser-capture MCP unavailable) — foundation live-verified, no regressions.

---

## [PHASE 1] Project Bootstrap & nyx Visual Foundation — complete — 2026-06-26

**Dev:** david-ds-teles
**Started:** 2026-06-26
**Completed:** 2026-06-26
**Built:** Next.js 16.2.9 + React 19.2.4 + Tailwind v4 app serving the nyx glass void on localhost:3000; nyx `@theme` token system (surfaces/text/accents/neon/radii), local Geist + JetBrains Mono fonts, `cn()` util, vitest config, and an `ssr:false` placeholder CanvasShell.
**Files:** `package.json`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx`, `components/canvas/canvas-shell.tsx`, `lib/utils.ts`, `vitest.config.ts`, `eslint.config.mjs`, `next.config.ts`, `postcss.config.mjs`, `tsconfig.json` (+ removed `public/*.svg`)
**Gates:** `tsc 0 · lint 0 · build ok · dev 200 · unit n/a · review clean (0 critical/high/medium; 2 low fixed, 3 info deferred)`
**Deviations:** create-next-app@latest installed **Next 16.2.9 / React 19.2.4** (not 15 — superset; plan synced); `next lint` removed in 16 → lint script is `eslint`; legacy `rehype-shiki@0.1` (native oniguruma, fails to build on Node 26) replaced by `@shikijs/rehype` + `shiki` (WASM) — reader pipeline is Phase 7; `@types/uuid` dropped (uuid@14 self-types); `vitest` resolved to `^4` (API-compatible). Added Phase-1 placeholder `components/canvas/canvas-shell.tsx` (not in the original file table) so `page.tsx`'s dynamic import resolves and the styled shell renders. Scoped `eslint.config.mjs` to ignore flowcode framework dirs (`.claude/`, `.flowcode/`, `references/`) so the lint gate covers app source only. Removed unused Next demo SVGs. Accepted [info]: `layout.tsx` body uses `var(--font-geist-sans)` directly rather than the `--font-sans` token alias (identical resolution). Visual-parity capture deferred to Phase 2 (no Phase-1 canvas surface to compare; browser-capture MCP unavailable).

---

## [PLAN CREATED] — 2026-06-25

**Dev:** david-ds-teles
**Scope:** Ship Flowcanvas v0.1 — an extended-JSONCanvas board (React Flow) over flowcode markdown files, with `links:`-derived + manual edges, inline images, pinned comments, and a bidirectional human↔agent JSON loop, persisted to a `.canvas` file.
**Phases planned:** 7 — Project Bootstrap & Dark Visual Foundation, Schema/Adapter & Empty Canvas, Persistence & Resolve API, Content Nodes, Edges, Comments Layer, Agent Round-Trip & Polish.
**Design ref:** `001-initial-architecture-design.md`

---

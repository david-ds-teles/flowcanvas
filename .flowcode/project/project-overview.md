---
name: project-overview
description: Top-level knowledge base for Flowcanvas — architecture, technology stack, module boundaries, quality gates, and environment configuration.
status: active
tags: [project-overview, architecture, stack, modules, canvas, jsoncanvas]
links: [.flowcode/project/project-log.md, .flowcode/project/backlog.md, .flowcode/quality-checks/quality-checks-index.md]
---

# Project Overview

- Flowcanvas renders flowcode markdown files as spatial canvas nodes, connects them with labeled edges derived from `links:` frontmatter, embeds images inline, and round-trips the entire board to/from an AI agent as one self-contained JSON (extended-JSONCanvas 1.0).
- Architecture: standalone monolith — one Next.js 16 App Router app; client-only React Flow canvas over thin Node-runtime Route Handlers wrapping `fs`.
- Primary stack: TypeScript 5 / Next.js 16 / React 19 / React Flow / Zustand / Tailwind v4.
- Datastore: filesystem-backed (`.canvas` JSON files); no database, cache, or message bus.
- Modules: 18 subsystems across `lib/canvas/*`, `components/canvas/*`, `app/api/*` — plan closed 2026-06-27 (10 phases).
- Status active; last updated 2026-06-27 — Phases 1–10 complete; plan `001` closed. The linking / source-of-truth + agent-collaboration evolution continues in plan `002-system-design-studio`.

---

## Project Description

Flowcanvas is a standalone Next.js 16 application for knowledge workers and AI-assisted system designers who need to map, explore, and co-evolve a body of flowcode markdown documents with an AI agent. The canvas renders each `.md` file as a card showing parsed YAML frontmatter and rendered body; it auto-derives labeled edges from each file's `links:` frontmatter (the flowcode graph), lets users draw and label manual edges, and embeds images inline so the board reads as a live diagram. The AI agent loop is bidirectional: the human exports a self-contained `DesignBrief` JSON embedding all content; the agent replies with an `AgentResponse` in a sibling schema; an idempotent id-keyed merge re-renders the board and writes any agent-authored files. The `.canvas` file on disk — extended JSONCanvas 1.0 — is the durable, machine-readable, cross-session memory of the whole session.

## Architecture Style

**Standalone monolith.** A single Next.js 16 App Router application running in one Node.js process. The canvas screen is a purely client-side React Flow component (loaded with `dynamic({ ssr: false })`) over a thin set of Node-runtime Route Handlers that wrap Node `fs`. There is no external database, no cache, no message bus. The `.canvas` JSON file on disk is the sole persistent store; `FLOWCANVAS_ROOT` (defaults to `process.cwd()`) governs the guarded filesystem root. The AI agent participates via clipboard/file JSON round-trip in v0.1 — not a wired API. The architecture is intentionally thin: entry layer (`app/page.tsx`), canvas shell + components (`components/canvas/*`), pure library modules (`lib/canvas/*`), and guarded fs routes (`app/api/*/route.ts`).

## Technology Stack

| Layer | Technology | Version | Notes |
|-------|------------|---------|-------|
| Language | TypeScript | 5 | Strict; no `any` on contracts |
| UI Runtime | React | 19 | Client components only on the canvas screen |
| Framework | Next.js (App Router) | 16 | Node runtime on all routes — not Edge; Turbopack default |
| Canvas engine | React Flow (`@xyflow/react`) | ^12 (MIT) | Custom node types are React components; labeled edges |
| State | Zustand | ^5 | Single `useCanvasStore`; no Redux/Context |
| Markdown (nodes) | react-markdown + remark-gfm | ^10 / ^4 | Client; lightweight; no shiki in node bodies |
| Markdown (reader) | unified + remark-parse + remark-rehype + @shikijs/rehype + shiki + rehype-stringify + rehype-sanitize | ^11 / ^4 / ^10 / ^6 | Server; full-fidelity with syntax highlighting (WASM shiki — replaced legacy native `rehype-shiki`) |
| Frontmatter | gray-matter | ^4 | Server only; parses YAML frontmatter from `.md` files |
| Styling | Tailwind v4 + @tailwindcss/postcss | ^4 | CSS `@theme` design tokens; **nyx** glassmorphic-neon design language (`ui-design-system.md`); no tailwind.config.ts needed |
| Fonts | geist + @fontsource/jetbrains-mono | ^1 / ^5 | Geist (UI) + JetBrains Mono (code/keys/metadata); local — zero CDN |
| Utilities | clsx, tailwind-merge, uuid, next-themes | ^2 / ^3 / ^14 / ^0.4 | `cn()`, id-minting, dark-mode |
| Testing | vitest | ^4 | Pure modules only: adapter, edges, brief |
| Lint | ESLint (flat config) | bundled with Next 16 | `npm run lint` (= `eslint`; `next lint` removed in 16); scoped to app source — ignores `.claude/`, `.flowcode/`, `references/` |
| Typecheck | tsc | 5 | `npx tsc --noEmit` |
| Build | next build | 16 | `npm run build` |
| Datastore | Filesystem (`.canvas` JSON files) | — | No external DB; `FLOWCANVAS_ROOT` guards all paths |
| Cache | None | — | Transient `bodies` map in Zustand store only |
| Message Bus | None | — | Agent loop via clipboard/file in v0.1 |
| Infrastructure | Local Node.js process | — | Docker/K8s not configured |
| Package Manager | npm | — | Lock file: `package-lock.json` |
| CI/CD | None | — | Local dev gates only (tsc, lint, build, vitest) |

## Modules / Services

Seeded from design `§ Module Boundaries`. Plan `001` closed 2026-06-27 (10 phases).

| Module | Path | Purpose | Stack | Detail File |
|--------|------|---------|-------|------------|
| Schema | `lib/canvas/jsoncanvas.ts` | Extended-JSONCanvas types (`CanvasNode` union, `CanvasEdge`, `FlowcanvasDoc`, `Comment`, `SessionMeta`) + `nodeKind` discriminator + `isFileNode` guard; `meta.shape` (`NodeShape` = rectangle\|ellipse\|diamond) for group nodes; **`parentId?` (group membership; coords stay absolute)** | TypeScript | — plan closed |
| Adapter | `lib/canvas/adapter.ts` | `FlowcanvasDoc` ↔ React Flow `{nodes, edges}` bidirectional conversion; `colorVar` preset mapping; `group` nodes get `zIndex:0` (painted behind content nodes) so a shape can frame others; **Phase 10: stable parent-before-child ordering + absolute↔relative child-position conversion + `extent:'parent'` (dangling `parentId` → top-level)** | TypeScript | — plan closed |
| Layout | `lib/canvas/layout.ts` | **Phase 10:** ELK `computeLayout(nodes, edges, measured)` — the "Re-organize" auto-layout (layered, L→R, orthogonal, measured-height fallback ladder, top-level-only with group-resolved edges, separated components/islands) | TypeScript (elkjs) | — plan closed |
| Brief/Merge | `lib/canvas/brief.ts` | `buildBrief` (human→agent export) + `applyResponse` (8-step idempotent merge) + `AGENT_CONTRACT` string | TypeScript | — plan closed |
| Edges | `lib/canvas/edges.ts` | `deriveLinkEdges` (deterministic `lk:` id from `links:` frontmatter) + `reconcileEdges` (keeps user/agent, drops stale derived) | TypeScript | — plan closed |
| Comment anchors | `lib/canvas/comments.ts` | Pure anchor geometry (DOM-free): `anchorForPoint` (flow-space click → node/canvas `CommentAnchor`, top-most hit, clamped 0..1 fractions) + `anchorToFlowPoint` (project an anchor back to a flow point against live node geometry) | TypeScript | — plan closed |
| Frontmatter | `lib/canvas/frontmatter.ts` | `gray-matter` parse wrapper; enforces `BODY_CAP` (40 000 chars); returns `{frontmatter, body, truncated}`; `stringifyFile(path, newFrontmatter)` merges updated frontmatter back into the file body-preservingly (scalars may re-quote via js-yaml) | TypeScript | — plan closed |
| Store | `lib/canvas/store.ts` | Zustand store: `load` (hydrates frontmatter via shared `hydrateFiles` + runs `reconcileEdges(deriveLinkEdges)`), `save`, `onConnect` (branches: file↔file mints deterministic `lk:` links edge + `patchLinks(add)`; non-file-pair mints empty-label user edge + opens inline editor)/`relabelEdge` (links→user promotion)/`setEditingEdge` (transient `editingEdgeId`)/`setNodePosition` (drag write-back)/`removeEdgeWriteback` (removes edge from `doc.edges` + `patchLinks(remove)` for durable deletion), `toggleCollapsed`, `mode: CanvasMode` (transient unified interaction mode — `select`\|`connect`\|`comment`, never persisted)/`setMode`, `addNode` (immutable append for text/link/group)/`addFileNode` (async: `hydrateFiles` frontmatter + re-derive links graph for a new md/image node), `setNodeText`/`setNodeLabel`/`setNodeShape` (in-place note-body / group-label / group-shape edit) + `setNodeSize` (persist a group resize), `addComment`/`replyComment`/`resolveComment` (immutable comment thread ops), `readerNodeId` + `openReader`/`closeReader` (which markdown node is open in the reader drawer), `readerSize: ReaderSize` (default `'drawer'`)/`setReaderSize`/`maximizeReader` (expand to full-width 100vw), `buildBrief` (resolve all md → brief, stamp `session.lastBriefId`), `applyResponse` (pure 8-step merge → write generated files → re-resolve/re-derive → persist); **Phase 10: `selectedIds` + `setSelection` (equality-guarded), `groupSelection`/`ungroup` (true group containers via `parentId`), `applyLayout` (bulk absolute write — ELK + group drag), `saveAs`/`openBoard` (board file I/O + `?path=` adoption)** | TypeScript/React | — plan closed |
| Canvas shell | `components/canvas/canvas-shell.tsx` | React Flow provider + `<Background variant=dots>` + `<Controls>` + `<MiniMap>`; registers nodeTypes and edgeTypes; loads the board from `?path` else the default `flowcanvas.canvas`; mounts the Phase-7 chrome (`<CanvasToolbar>`, `<Dropzone>`, `<CommentLayer>`, `<ReaderDrawer>` on a markdown-node click, `<ExportPanel>`); `connect`-mode adds `.fc-rf--connect`; minimal `.fc-empty` empty/error overlay while no doc is loaded; consumes `useCanvasHandlers` (RF controlled state + event callbacks extracted to hook); `connectionLineType=SmoothStep` + `defaultEdgeOptions={type:'labeled'}`; nyx hex props on `<MiniMap>`; `deleteKeyCode=['Delete','Backspace']` (edges-only — per-node `deletable:false` in adapter) | TypeScript/React | — plan closed |
| Canvas handlers | `components/canvas/use-canvas-handlers.ts` | `useCanvasHandlers` hook: RF controlled state (`useNodesState`/`useEdgesState` + change handlers), all RF interaction callbacks (connect, drag-stop, edge double-click), and `removeEdgeWriteback` (keyboard-delete write-back: removes from `doc.edges` + calls `patchLinks(remove)`). Placed in `components/canvas/` (not `lib/canvas/`) — contains React hooks so it belongs in the component layer | TypeScript/React | — |
| Frontmatter view | `components/canvas/frontmatter-view.tsx` (+ `app/styles/frontmatter.css`) | Shared `<FrontmatterView frontmatter variant="card"|"reader">` component extracted from `markdown-node.tsx`. Renders: semantic status pill (`statusClass` — exported), violet tag chips, `↗` link chips (basename via exported `basename`), muted mono kv grid. `FmValue`/`PRIORITY`/`SKIP`/`MAX_CHIPS` are module-private. Returns null when empty. `fc-fm--card` (bordered, compact) and `fc-fm--reader` (sticky bar) variants. Consumed by `markdown-node.tsx` (card) and `reader-drawer.tsx` (reader bar) | TypeScript/React | — plan closed |
| Node components | `components/canvas/nodes/*` | `MarkdownNode` (frontmatter via `<FrontmatterView variant="card">` + collapsible body + `node-read` header button → reader drawer), `ImageNode` (inline img via assetUrl), `LinkChipNode` (URL chip; `normalizeUrl` prepends `https://` to a scheme-less url), `NoteNode` (renders `text` markdown; **double-click → inline textarea edit** via `setNodeText`), `FallbackNode` (catch-all for non-md/non-image `file` kinds only). **Each returns a fragment** — the card `<div>` plus the four `<Handle>`s as siblings of the card (never nested inside the `overflow:hidden` card) | TypeScript/React | — plan closed |
| Group / shape node | `components/canvas/nodes/group-node.tsx` | Real shape node (`type:"group"`). `ShapeOutline` SVG stretched to the node box (`preserveAspectRatio:none`) — rectangle/ellipse/diamond per `meta.shape`; only the painted shape captures pointer events. At rest: dashed-bright-indigo outline (`7 5` dash, `--color-primary`, 8% fill). Selected: solid glowing ring + `NodeResizer` handles (`setNodeSize`) + 3-button shape-switcher bar (`setNodeShape`). Double-click label → `<input>` inline editor (`setNodeLabel`). RF rectangular `.selected` glow suppressed (`nodes.css:343`) — shape stroke manages its own selection highlight | TypeScript/React | — plan closed |
| Edge component | `components/canvas/edges/labeled-edge.tsx` | `memo`'d bezier edge with portaled `EdgeLabelRenderer` label; origin-styled per design: `links`=muted-dashed+🔒, `user`=solid indigo, `agent`=neon cyan; **inline in-canvas label editor** (`EdgeLabelEditor`, gated on store `editingEdgeId`) replaces the old `window.prompt` — opens on connect / label double-click, commits on Enter/blur, cancels on Esc | TypeScript/React | — plan closed |
| Comments | `components/canvas/comment-{layer,thread}.tsx` | `CommentLayer` pin overlay — projects anchors via `flowToScreenPosition` over **live measured** node geometry (`useNodes` + `useViewport`, so pins track drag/measure/pan/zoom), places pins on click in comment mode (anchor math from `lib/canvas/comments.ts`), computes the tethered popover placement (flip near edges + clamp + beak aim); `CommentThread` glass popover **tethered to its pin** via a connector beak — flat thread + reply + resolve, doubles as the draft composer. Comment mode is entered via the toolbar's `toolbar-comment-mode` (reads the unified store `mode === 'comment'`) | TypeScript/React | — plan closed |
| Export/Import | `components/canvas/export-panel.tsx` | Right glass drawer, Export/Import tabs. Export: build `DesignBrief` (via store) → copy / download JSON. Import: paste or `Load .json…` (hidden file-input reads the chosen file via `f.text()` → `setPaste`) `AgentResponse` → validate `responseVersion`/`briefId` → `applyResponse` → inline merge report (created/updated/removed counts + generated files + amber stale banner on briefId mismatch); pasting a `DesignBrief` (has `briefVersion`, no `responseVersion`) triggers an explanatory message instead of a false error | TypeScript/React | — plan closed |
| Reader | `components/canvas/reader-drawer.tsx` (+ `lib/render-md.ts` server pipeline) | Full-fidelity read-only drawer; fetches `GET /api/render?path=` → sanitized shiki HTML (`remark`→`rehype-sanitize`→`@shikijs/rehype`); opens on a markdown-node click; shows `<FrontmatterView variant="reader">` as a sticky bar above the prose (hidden when frontmatter is empty); shows the node's comment thread beneath the prose; opaque `--color-surface-lowest` scroll area; prose 17 px / 1.72 line-height / ≤66ch centered / sans headings; inline-code scoped off `<pre>` so shiki fenced-block tokens survive; 3-size segmented control (Drawer / Half / Full) drives `data-size` + CSS widths (440px / 50vw / 100vw) via `readerSize`/`setReaderSize`; `⤢` in the node header calls `maximizeReader` to jump to full size | TypeScript/React | — plan closed |
| Toolbar | `components/canvas/canvas-toolbar.tsx` | Top glass single rail: mode group (`select`/`connect`/`comment` → store `setMode`); direct icon insert buttons (`toolbar-add-{note,markdown,image,link,shape}`) + Shape flyout (rectangle/ellipse/diamond); `[File ▾]` button collapsing Upload/Import/Export under one menu; three **disabled** Phase-10 scaffold buttons (group/ungroup/reorganize); unified `open` flyout state machine anchored on `.fc-toolbar__flyhost` with Esc + outside-mousedown close; below 1024 px the `+ Add ▾` fallback popover (`toolbar-add-node`) reappears for narrow screens; `useSaveShortcut` (⌘S) | TypeScript/React | — plan closed |
| File picker | `components/canvas/file-picker.tsx` | Glass dir-browser popover over guarded `/api/files`; navigates directories, filters pickable files by an `accept` predicate; used by the add-node menu for markdown/image | TypeScript/React | — plan closed |
| Dropzone | `components/canvas/dropzone.tsx` | Full-canvas drag-drop overlay; window drag listeners gated on `dataTransfer.types` containing `Files`; on drop `uploadFile` each → `addFileNode` at the projected drop point | TypeScript/React | — plan closed |
| API | `app/api/{canvas,canvas/resolve,canvas/links,asset,file,files,upload,render}/route.ts` | Eight guarded Node-runtime Route Handlers wrapping `fs`; all map `GuardError`→400, `ENOENT`→404, else→500. `canvas` GET/POST: reads/writes `.canvas` doc + bumps `session.revision`. `canvas/resolve` POST: batch frontmatter+body resolve. `canvas/links` (Phase 8): `POST {path, op:'add'|'remove', link}` — body-preserving `links:` patch via `frontmatter.stringifyFile`; surfaced as `patchLinks` in `lib/api.ts`. `render` GET `?path=` → `{html}` full-fidelity shiki. `asset`/`file`/`files`/`upload`: image streaming, agent-file writes, dir listing, multipart upload | TypeScript/Next.js | — plan closed |
| FS guard | `lib/fs-guard.ts` | `ROOT` resolution from `FLOWCANVAS_ROOT` + `guardPath` (rejects any path escaping ROOT; lexical normalization only — symlinks not dereferenced) + `GuardError` class | TypeScript | live — Phase 3 |

## Folder Structure

Target build layout — created phase by phase. **Phase 1 scaffolded the shell** (`app/layout.tsx`, `app/page.tsx`, `app/globals.css`, a placeholder `components/canvas/canvas-shell.tsx`, `lib/utils.ts`, `vitest.config.ts`, config); the canvas modules below land Phase 2+.

```text
flowcanvas/
  app/                            — Next.js App Router root
    layout.tsx                    — Geist (UI) + JetBrains Mono (code/keys) fonts; <html class="dark">; base body styles
    page.tsx                      — Client component; dynamic(ssr:false) import of CanvasShell; empty/error states
    globals.css                   — Tailwind v4 @import + @theme token block + React Flow CSS var overrides; @imports app/styles/*.css partials (Phase 8 split)
    styles/                       — CSS partials @imported from globals.css (Phase 8: 6 partials; Phase 9: +frontmatter.css = 7)
      nodes.css                   — Node anatomy styles (.fc-node, .fc-prose, chips, collapse, group shape rules)
      frontmatter.css             — Frontmatter view variants (.fc-fm--card, .fc-fm--reader, .fc-pill, .fc-tag, .fc-link-chip)
      edges.css                   — Edge + label styles (.fc-edge-label, origin variants)
      controls.css                — RF controls/minimap overrides (.react-flow prefix for cascade)
      reader.css                  — Reader drawer widths (440px/50vw/100vw per data-size) + Phase 9 readability
      comments.css                — Comment pin + thread + beak styles
      toolbar.css                 — Toolbar, menus, flyout state, disabled scaffolds, dropzone, upload-error
    api/
      canvas/route.ts             — GET read / POST write FlowcanvasDoc (bumps session.revision)
      canvas/resolve/route.ts     — POST {paths[]} → [{path, frontmatter, body, truncated}]
      canvas/links/route.ts       — POST {path, op:'add'|'remove', link} body-preserving links: patch
      asset/route.ts              — GET image bytes; IMAGE_EXT allowlist; guardPath
      file/route.ts               — POST write agent-generated .md files
      files/route.ts              — GET directory listing for add-node picker
      render/route.ts             — GET ?path → {html} (full shiki pipeline; guarded)
  components/
    canvas/
      canvas-shell.tsx            — ReactFlowProvider + Background(dots) + Controls + MiniMap
      canvas-toolbar.tsx          — Single-rail toolbar (direct inserts, Shape flyout, File ▾ menu w/ Open+Save-as, Group/Ungroup/Re-organize, narrow-screen fallback)
      board-dialog.tsx            — Open / Save-as glass modal (.canvas browse, inline dirty-guard) — Phase 10
      use-canvas-handlers.ts      — RF controlled state + event callbacks + removeEdgeWriteback + onSelectionChange + group-aware drag write-back
      canvas-markdown.tsx         — Client react-markdown + remark-gfm (lightweight, no shiki)
      frontmatter-view.tsx        — Shared <FrontmatterView variant="card"|"reader"> (extracted Phase 9)
      comment-layer.tsx           — Pin overlay; projects anchors to screen; comment-mode click handler
      comment-thread.tsx          — Root + replies flat thread; reply box; resolve toggle
      export-panel.tsx            — Brief export (copy/download) + response import (paste/Load .json… + brief-detection)
      reader-drawer.tsx           — Shiki drawer + sticky FrontmatterView bar + node comment thread + 3-size control
      nodes/
        markdown-node.tsx         — <FrontmatterView variant="card"> + collapsible rendered body + 4 handles
        image-node.tsx            — Inline <img> via /api/asset; 4 handles
        link-node.tsx             — URL chip / non-md file with extension glyph; 4 handles
        note-node.tsx             — Renders node.text via CanvasMarkdown; double-click → inline textarea edit
        group-node.tsx            — SVG ShapeOutline (rectangle/ellipse/diamond) + NodeResizer + shape-switcher bar + inline label editor
      edges/
        labeled-edge.tsx          — Smoothstep (orthogonal) + EdgeLabelRenderer; origin-styled (links/user/agent)
  lib/
    canvas/
      jsoncanvas.ts               — All extended-JSONCanvas types + nodeKind + isFileNode
      adapter.ts                  — toReactFlow / toJSONCanvas / colorVar
      brief.ts                    — buildBrief + applyResponse (8-step pure merge) + AGENT_CONTRACT
      edges.ts                    — deriveLinkEdges + reconcileEdges
      frontmatter.ts              — gray-matter wrapper + BODY_CAP enforcement
      layout.ts                   — ELK computeLayout (Re-organize auto-layout) — Phase 10
      store.ts                    — useCanvasStore (Zustand): all canvas actions
    fs-guard.ts                   — ROOT + guardPath + GuardError
    api.ts                        — Typed fetch wrappers: getCanvas, saveCanvas, resolvePaths, writeFileApi, listDir, assetUrl
    utils.ts                      — cn() (clsx + tailwind-merge)
    render-md.ts                  — Server unified pipeline (remark-gfm + @shikijs/rehype) → sanitized HTML
  docs/
    flowcanvas-agent-contract.md  — The agent output contract (mirrors AGENT_CONTRACT in brief.ts)
  .flowcode/                      — Flowcode knowledge base (framework files, not shipped)
```

## Dependencies & Integrations

| Dependency | Purpose | How Used |
|------------|---------|----------|
| `@xyflow/react` ^12 (MIT) | Canvas rendering engine | Custom node types (`nodeKind`-keyed) are React components; `LabeledEdge` is a custom edge type; `Background`, `MiniMap`, `Controls` are built-in; `flowToScreenPosition` for comment pin projection |
| `react-markdown` ^10 + `remark-gfm` ^4 | Lightweight client markdown | Node bodies (`canvas-markdown.tsx`); chosen over shiki because one shiki instance per card jank on large boards (Decision 4) |
| `unified` + `remark-parse` + `remark-rehype` + `@shikijs/rehype` + `shiki` + `rehype-stringify` + `rehype-sanitize` | Full-fidelity server markdown | `/api/render` route handler + `lib/render-md.ts`; runs only in the reader drawer so shiki cost is amortized. WASM shiki (`@shikijs/rehype` ^4) replaces the legacy native `rehype-shiki@0.1`, which fails to compile on Node 26 |
| `gray-matter` ^4 | YAML frontmatter parse/stringify | `lib/canvas/frontmatter.ts`; server-side only; parses each `.md` file's frontmatter into `Record<string, unknown>` |
| `zustand` ^5 | React state management | Single `useCanvasStore` for all canvas state (doc, bodies, dirty, path); no Redux/Context overhead |
| `geist` ^1 + `@fontsource/jetbrains-mono` ^5 | Local font packages | Geist (UI) + JetBrains Mono (code/keys) loaded in `app/layout.tsx`; zero CDN — no remote font fetch |
| `tailwindcss` v4 + `@tailwindcss/postcss` | CSS design token system | `@theme` block in `globals.css` defines all design tokens; no JS config file needed in v4 |
| `clsx` + `tailwind-merge` | Class composition | `cn()` utility in `lib/utils.ts`; used by all components |
| `uuid` | ID generation | Minting node/edge/comment/brief IDs in the store and brief modules |
| `elkjs` ^0.11.1 | Graph auto-layout | `lib/canvas/layout.ts` — the toolbar "Re-organize" runs ELK's layered algorithm over measured node sizes (bundled JS build, no native deps) |
| `next-themes` | Dark-mode provider | Enforces `class="dark"` on `<html>` (dark-only app in v0.1) |
| `vitest` ^4 | Unit test runner | Pure modules (`adapter.test.ts`, `edges.test.ts`, `brief.test.ts`); not used for React component tests |
| Node.js `fs` (platform) | File persistence | All six route handlers read/write via `fs/promises`; every path goes through `guardPath` |

**External services / APIs:** None. The AI agent interacts via clipboard/file JSON paste in v0.1 — there is no wired agent API endpoint. No auth, no telemetry, no CDN.

## Code Style & Conventions

- **Language:** TypeScript throughout — no `.js` files, no `any` on contracts.
- **Files:** `kebab-case.ts(x)` everywhere (e.g., `canvas-shell.tsx`, `labeled-edge.tsx`, `fs-guard.ts`).
- **Types / Interfaces / Components:** `PascalCase` (e.g., `CanvasNode`, `FlowcanvasDoc`, `MarkdownNode`).
- **Functions / Variables / Module exports:** `camelCase` (e.g., `nodeKind`, `buildBrief`, `useCanvasStore`).
- **Constants / Sets / Caps:** `UPPER_SNAKE_CASE` (e.g., `BODY_CAP`, `IMAGE_EXT`, `ROOT`).
- **Pure vs. impure split:** `lib/canvas/*` modules are pure TypeScript (no DOM, no React) — they accept typed inputs and return typed outputs. All React + DOM work lives in `components/`. The one exception is `lib/canvas/adapter.ts`, whose sole job is the React Flow translation boundary: it imports type-only symbols plus the `MarkerType` runtime enum from `@xyflow/react`, stays DOM-free, and remains unit-testable under the vitest gate. This boundary is enforced by the vitest gate running only on `lib/canvas/*`.
- **Route handler pattern:** `guardPath(rel)` first; map `GuardError`→`400`, `ENOENT`→`404`, unhandled→`500` via typed `NextResponse.json`.
- **React components:** thin shells over the Zustand store; minimal local state; `memo()` on node components to prevent unnecessary re-renders.
- **Edge IDs:** derived edges use the deterministic pattern `lk:${fromNode}->${toNode}`; agent-minted IDs use `ag-` prefix; user-minted use `e-` prefix.
- See `.flowcode/quality-checks/` sub-files for per-concept rules.

## Quality Gates

| Gate | Tool | Command | When Applied | Threshold |
|------|------|---------|-------------|-----------|
| Typecheck | tsc | `npx tsc --noEmit` | post-phase (all 9 phases) | All phases exit 0 |
| Lint | ESLint (flat config) | `npm run lint` | post-phase (phases 1, 7, 9) | All phases exit 0 |
| Build | next build | `npm run build` | post-phase (all 9 phases) | All phases exit 0 |
| Unit | vitest | `npx vitest run` | post-phase (phases 2, 5, 7, 8) | 66/66 green (Phase 8 hardened); Phase 9 no new files |
| Visual parity (CDP) | pure-Node headless Chrome | custom CDP driver | phases 7, 8, 9 | 18/18 (Ph7) · 9/9 (Ph8) · 7/7 (Ph9) |

## Environment Variables

| Variable | Purpose | Required | Default |
|----------|---------|----------|---------|
| `FLOWCANVAS_ROOT` | Filesystem root for all guarded route handlers — every requested path is resolved and validated against this root; paths escaping it receive a 400 | No | `process.cwd()` |

## CI / CD

Not configured — local dev gates only. All quality enforcement is manual (`npx tsc --noEmit`, `npm run lint`, `npm run build`, `npx vitest run`) run at phase close per the plan's acceptance criteria.

## Evolution Log

| Date | Change |
|------|--------|
| 2026-06-27 | Plan `001` closed — Phase 9 (UX/UI Redesign & File Import) + post-Phase-9 bugfix pass shipped; Phase 10 (`group-operations`) deferred. Phase 9 added: shared `<FrontmatterView>` component + `frontmatter.css` (7th CSS partial); toolbar single-rail redesign (direct inserts, Shape flyout, `[File ▾]`, disabled Phase-10 scaffolds, narrow-screen `+ Add ▾` fallback); reader readability overhaul (opaque scroll, 17px/1.72/66ch, sans headings, scoped inline-code); `Load .json…` + DesignBrief-detection on Import tab; `GroupNode` promoted to full SVG shape node (ShapeOutline + NodeResizer + shape-switcher + inline label editor); `NoteNode` double-click inline editing. Bugfix pass: selection ring conformed to rounded cards (`globals.css:69-74`); group/shape opt-out (`nodes.css:343`); dashed-indigo group outline at rest |
| 2026-06-27 | Plan `001` Phase 8 (Post-Execution Polish & Cleanup) shipped — `app/globals.css` split into `app/styles/*.css` partials; smoothstep edges; reader 3-size control (440px/50vw/100vw); bidirectional `links:` write-back via `POST /api/canvas/links` + `patchLinks` + `frontmatter.stringifyFile`; nyx controls cascade fixed; dev badge off; `useCanvasHandlers` hook extracted; vitest 66/66 |
| 2026-06-26 | Plan `001` Phase 1 (Bootstrap & nyx Visual Foundation) shipped — scaffolded the Next.js 16 / React 19 / Tailwind v4 app shell on the nyx `@theme` token system with local Geist + JetBrains Mono fonts and an `ssr:false` placeholder canvas shell. Stack facts updated: Next 15→16, `next lint`→`eslint`, legacy native `rehype-shiki`→WASM `@shikijs/rehype`+`shiki`, util/test versions (tailwind-merge ^3, uuid ^14, vitest ^4) |
| 2026-06-25 | Initial bootstrap — greenfield project; stack, modules, and design system declared from `001-initial-architecture-design.md` and `001-initial-architecture-plan.md`; module detail files deferred to phase close; CI/CD not configured |

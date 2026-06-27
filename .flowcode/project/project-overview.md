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
- Modules: 14 subsystems across `lib/canvas/*`, `components/canvas/*`, `app/api/*` — detail files pending at phase close.
- Status active; last updated 2026-06-26 — Phase 1 (bootstrap & nyx visual foundation) shipped the app shell; canvas modules land Phase 2+.

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

Seeded from design `§ Module Boundaries`. Detail files generated at each phase close, not before source exists.

| Module | Path | Purpose | Stack | Detail File |
|--------|------|---------|-------|------------|
| Schema | `lib/canvas/jsoncanvas.ts` | Extended-JSONCanvas types (`CanvasNode` union, `CanvasEdge`, `FlowcanvasDoc`, `Comment`, `SessionMeta`) + `nodeKind` discriminator + `isFileNode` guard; `meta.shape` (`NodeShape` = rectangle\|ellipse\|diamond) for group nodes | TypeScript | — pending (generated at phase close) |
| Adapter | `lib/canvas/adapter.ts` | `FlowcanvasDoc` ↔ React Flow `{nodes, edges}` bidirectional conversion; `colorVar` preset mapping; `group` nodes get `zIndex:0` (painted behind content nodes) so a shape can frame others | TypeScript | — pending (generated at phase close) |
| Brief/Merge | `lib/canvas/brief.ts` | `buildBrief` (human→agent export) + `applyResponse` (8-step idempotent merge) + `AGENT_CONTRACT` string | TypeScript | — pending (generated at phase close) |
| Edges | `lib/canvas/edges.ts` | `deriveLinkEdges` (deterministic `lk:` id from `links:` frontmatter) + `reconcileEdges` (keeps user/agent, drops stale derived) | TypeScript | — pending (generated at phase close) |
| Comment anchors | `lib/canvas/comments.ts` | Pure anchor geometry (DOM-free): `anchorForPoint` (flow-space click → node/canvas `CommentAnchor`, top-most hit, clamped 0..1 fractions) + `anchorToFlowPoint` (project an anchor back to a flow point against live node geometry) | TypeScript | — pending (generated at phase close) |
| Frontmatter | `lib/canvas/frontmatter.ts` | `gray-matter` parse wrapper; enforces `BODY_CAP` (40 000 chars); returns `{frontmatter, body, truncated}` | TypeScript | — pending (generated at phase close) |
| Store | `lib/canvas/store.ts` | Zustand store: `load` (hydrates frontmatter via shared `hydrateFiles` + runs `reconcileEdges(deriveLinkEdges)`), `save`, `onConnect` (mints an empty-label user edge + opens its inline editor)/`relabelEdge` (links→user promotion)/`setEditingEdge` (transient `editingEdgeId`)/`setNodePosition` (drag write-back), `toggleCollapsed`, `mode: CanvasMode` (transient unified interaction mode — `select`\|`connect`\|`comment`, never persisted)/`setMode`, `addNode` (immutable append for text/link/group)/`addFileNode` (async: `hydrateFiles` frontmatter + re-derive links graph for a new md/image node), `setNodeText`/`setNodeLabel` (in-place note-body / group-label edit) + `setNodeSize` (persist a group resize), `addComment`/`replyComment`/`resolveComment` (immutable comment thread ops), `readerNodeId` + `openReader`/`closeReader` (which markdown node is open in the reader drawer), `buildBrief` (resolve all md → brief, stamp `session.lastBriefId`), `applyResponse` (pure 8-step merge → write generated files → re-resolve/re-derive → persist) | TypeScript/React | — pending (generated at phase close) |
| Canvas shell | `components/canvas/canvas-shell.tsx` | React Flow provider + `<Background variant=dots>` + `<Controls>` + `<MiniMap>`; registers nodeTypes and edgeTypes; loads the board from `?path` else the default `flowcanvas.canvas`; mounts the Phase-7 chrome (`<CanvasToolbar>`, `<Dropzone>`, `<CommentLayer>`, `<ReaderDrawer>` on a markdown-node click, `<ExportPanel>`); `connect`-mode adds `.fc-rf--connect`; minimal `.fc-empty` empty/error overlay while no doc is loaded | TypeScript/React | — pending (generated at phase close) |
| Node components | `components/canvas/nodes/*` | `MarkdownNode` (frontmatter table + collapsible body + a `node-read` header button → reader drawer for the full doc), `ImageNode` (inline img via assetUrl), `LinkChipNode` (URL chip; `normalizeUrl` prepends `https://` to a scheme-less url so a bare `google.com` opens instead of 404ing), `NoteNode` (renders `text` markdown; **double-click → inline textarea edit** via `setNodeText`), `GroupNode` (resizable via `NodeResizer` + double-click label edit via `setNodeLabel`/`setNodeSize`; SVG outline drawn rectangle/ellipse/diamond per `meta.shape`; sits behind content nodes), `FallbackNode` (catch-all for non-md/non-image `file` kinds only). **Each returns a fragment** — the card `<div>` plus the four `<Handle>`s as *siblings* of the card (never nested inside the `overflow:hidden` card, or the right/bottom handles get occluded and connections only work from 2 of 4 sides) | TypeScript/React | — pending (generated at phase close) |
| Edge component | `components/canvas/edges/labeled-edge.tsx` | `memo`'d bezier edge with portaled `EdgeLabelRenderer` label; origin-styled per design: `links`=muted-dashed+🔒, `user`=solid indigo, `agent`=neon cyan; **inline in-canvas label editor** (`EdgeLabelEditor`, gated on store `editingEdgeId`) replaces the old `window.prompt` — opens on connect / label double-click, commits on Enter/blur, cancels on Esc | TypeScript/React | — pending (generated at phase close) |
| Comments | `components/canvas/comment-{layer,thread}.tsx` | `CommentLayer` pin overlay — projects anchors via `flowToScreenPosition` over **live measured** node geometry (`useNodes` + `useViewport`, so pins track drag/measure/pan/zoom), places pins on click in comment mode (anchor math from `lib/canvas/comments.ts`), computes the tethered popover placement (flip near edges + clamp + beak aim); `CommentThread` glass popover **tethered to its pin** via a connector beak — flat thread + reply + resolve, doubles as the draft composer. Comment mode is entered via the toolbar's `toolbar-comment-mode` (reads the unified store `mode === 'comment'`) | TypeScript/React | — pending (generated at phase close) |
| Export/Import | `components/canvas/export-panel.tsx` | Right glass drawer, Export/Import tabs. Export: build `DesignBrief` (via store) → copy / download JSON. Import: paste `AgentResponse` → validate `responseVersion`/`briefId` → `applyResponse` → inline merge report (created/updated/removed counts + generated files + amber stale banner on briefId mismatch) | TypeScript/React | — pending (generated at phase close) |
| Reader | `components/canvas/reader-drawer.tsx` (+ `lib/render-md.ts` server pipeline) | Full-fidelity read-only drawer; fetches `GET /api/render?path=` → sanitized shiki HTML (`remark`→`rehype-sanitize`→`@shikijs/rehype`); opens on a markdown-node click; shows the node's comment thread beneath the prose | TypeScript/React | — pending (generated at phase close) |
| Toolbar | `components/canvas/canvas-toolbar.tsx` | Top glass toolbar: mode group (`select`/`connect`/`comment` → store `setMode`), `+ Add ▾` menu (markdown/image via `FilePicker`, note, Shape ▸ rectangle/ellipse/diamond, link via inline input — no `window.prompt`), upload (`/api/upload`), Import/Export (open the agent panel), fit-view (`useReactFlow`), save + dirty dot; `useSaveShortcut` (⌘S) | TypeScript/React | — pending (generated at phase close) |
| File picker | `components/canvas/file-picker.tsx` | Glass dir-browser popover over guarded `/api/files`; navigates directories, filters pickable files by an `accept` predicate; used by the add-node menu for markdown/image | TypeScript/React | — pending (generated at phase close) |
| Dropzone | `components/canvas/dropzone.tsx` | Full-canvas drag-drop overlay; window drag listeners gated on `dataTransfer.types` containing `Files`; on drop `uploadFile` each → `addFileNode` at the projected drop point | TypeScript/React | — pending (generated at phase close) |
| API | `app/api/{canvas,canvas/resolve,asset,file,files,upload,render}/route.ts` | Seven guarded Node-runtime Route Handlers wrapping `fs`; all map `GuardError`→400, `ENOENT`→404, else→500 (the `canvas/resolve` batch route surfaces per-item errors inside its 200 body). `render` (GET `?path=` → `{html}` full-fidelity shiki markdown) shipped Phase 7; all seven live | TypeScript/Next.js | — pending (generated at phase close) |
| FS guard | `lib/fs-guard.ts` | `ROOT` resolution from `FLOWCANVAS_ROOT` + `guardPath` (rejects any path escaping ROOT; lexical normalization only — symlinks not dereferenced) + `GuardError` class | TypeScript | live — Phase 3 |

## Folder Structure

Target build layout — created phase by phase. **Phase 1 scaffolded the shell** (`app/layout.tsx`, `app/page.tsx`, `app/globals.css`, a placeholder `components/canvas/canvas-shell.tsx`, `lib/utils.ts`, `vitest.config.ts`, config); the canvas modules below land Phase 2+.

```text
flowcanvas/
  app/                            — Next.js App Router root
    layout.tsx                    — Geist (UI) + JetBrains Mono (code/keys) fonts; <html class="dark">; base body styles
    page.tsx                      — Client component; dynamic(ssr:false) import of CanvasShell; empty/error states
    globals.css                   — Tailwind v4 @import + @theme token block + React Flow CSS var overrides
    api/
      canvas/route.ts             — GET read / POST write FlowcanvasDoc (bumps session.revision)
      canvas/resolve/route.ts     — POST {paths[]} → [{path, frontmatter, body, truncated}]
      asset/route.ts              — GET image bytes; IMAGE_EXT allowlist; guardPath
      file/route.ts               — POST write agent-generated .md files
      files/route.ts              — GET directory listing for add-node picker
      render/route.ts             — GET ?path → {html} (full shiki pipeline; guarded)
  components/
    canvas/
      canvas-shell.tsx            — ReactFlowProvider + Background(dots) + Controls + MiniMap
      canvas-toolbar.tsx          — Add-node, save (Cmd+S), export, import, fit-view, dirty dot
      canvas-markdown.tsx         — Client react-markdown + remark-gfm (lightweight, no shiki)
      comment-layer.tsx           — Pin overlay; projects anchors to screen; comment-mode click handler
      comment-thread.tsx          — Root + replies flat thread; reply box; resolve toggle
      export-panel.tsx            — Brief export (copy/download) + response import (paste/upload)
      reader-drawer.tsx           — Full-fidelity shiki drawer + node comment thread
      nodes/
        markdown-node.tsx         — Frontmatter table + collapsible rendered body + 4 handles
        image-node.tsx            — Inline <img> via /api/asset; 4 handles
        link-node.tsx             — URL chip / non-md file with extension glyph; 4 handles
        note-node.tsx             — Renders node.text via CanvasMarkdown; 4 handles
      edges/
        labeled-edge.tsx          — Bezier + EdgeLabelRenderer; origin-styled (links/user/agent)
    markdown-renderer.tsx         — Full-fidelity unified pipeline (@shikijs/rehype); used in reader
  lib/
    canvas/
      jsoncanvas.ts               — All extended-JSONCanvas types + nodeKind + isFileNode
      adapter.ts                  — toReactFlow / toJSONCanvas / colorVar
      brief.ts                    — buildBrief + applyResponse (8-step pure merge) + AGENT_CONTRACT
      edges.ts                    — deriveLinkEdges + reconcileEdges
      frontmatter.ts              — gray-matter wrapper + BODY_CAP enforcement
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
| Typecheck | tsc | `npx tsc --noEmit` | post-phase (all 7 phases) | All phases exit 0 |
| Lint | ESLint (flat config) | `npm run lint` | post-phase (phases 1, 7) | All phases exit 0 |
| Build | next build | `npm run build` | post-phase (all 7 phases) | All phases exit 0 |
| Unit | vitest | `npx vitest run` | post-phase (phases 2, 5, 7) | Pure modules pass: adapter, edges, brief |

## Environment Variables

| Variable | Purpose | Required | Default |
|----------|---------|----------|---------|
| `FLOWCANVAS_ROOT` | Filesystem root for all guarded route handlers — every requested path is resolved and validated against this root; paths escaping it receive a 400 | No | `process.cwd()` |

## CI / CD

Not configured — local dev gates only. All quality enforcement is manual (`npx tsc --noEmit`, `npm run lint`, `npm run build`, `npx vitest run`) run at phase close per the plan's acceptance criteria.

## Evolution Log

| Date | Change |
|------|--------|
| 2026-06-26 | Plan `001` Phase 1 (Bootstrap & nyx Visual Foundation) shipped — scaffolded the Next.js 16 / React 19 / Tailwind v4 app shell on the nyx `@theme` token system with local Geist + JetBrains Mono fonts and an `ssr:false` placeholder canvas shell. Stack facts updated: Next 15→16, `next lint`→`eslint`, legacy native `rehype-shiki`→WASM `@shikijs/rehype`+`shiki`, util/test versions (tailwind-merge ^3, uuid ^14, vitest ^4) |
| 2026-06-25 | Initial bootstrap — greenfield project; stack, modules, and design system declared from `001-initial-architecture-design.md` and `001-initial-architecture-plan.md`; module detail files deferred to phase close (no source code yet); CI/CD not configured |

---
name: 001-initial-architecture-ui-design
description: UI design artifact for Flowcanvas v0.1 — the nyx futuristic-neon glass canvas; screens, states, interaction contract, and the selected mockup (04-nyx-neon).
status: approved
tags: [ui-design, frontend, mockups, canvas, nyx, glassmorphic]
links: [.flowcode/plans/001-initial-architecture/001-initial-architecture-plan.md, .flowcode/ui/ui-workflow.md, .flowcode/ui/ui-mockup-discipline.md, .flowcode/ui/ui-design-system.md]
---

# 001-initial-architecture — Flowcanvas UI Design

- Delivers the UI for Flowcanvas v0.1: one fixed canvas screen with overlay surfaces (toolbar, nodes, edges, comments, reader drawer, agent panel) over a dark glassmorphic void.
- **Selected direction: `mockups/04-nyx-neon.html`** — the "nyx" futuristic-neon glass language from `references/DESIGN.md`, chosen after four explorations.
- The approved mockup is the implementation spec; its `data-testid` names and tokens carry through to code verbatim.
- **nyx supersedes the current dark `ui-design-system.md`** — that ground-truth file must be re-authored from dark → nyx before Phase 1 (tracked in Open Questions).
- Desktop-only (≥1024 / ≥1440); no mobile in v0.1.
- One **scope addition** beyond the design doc: drag-drop **image upload** — needs a new upload route + drop handler folded into the design + plan.
- Status: **approved** — satisfies the UI Design Gate precondition (`plan-instructions.md §204`); Phase 1 is unblocked.

---

## Context

Flowcanvas is a frontend-touching plan, so the UI Design Gate applies: an approved `*-ui-design.md` backed by parallel mockups must exist before implementation. The gate was skipped during planning and is resolved here.

The first round produced three iterations (`01-light-editorial`, `02-vibrant-canvas`, `03-dark-minimal`) all forced to conform to the greenfield dark `ui-design-system.md`; with the palette/shell/fonts hard-locked, the variation collapsed into near-duplicates. The operator rejected them, kept them as history, and directed a fourth direction driven by `references/DESIGN.md` (theme: **futuristic neon**), populated from **real flowcode frontmatter** (a dogfood board of the 001 plan's own artifacts) and showing the full canvas element vocabulary. After iteration (markdown rendering fidelity; non-overlapping layout + coherent edges; a plan-complete toolbar), `04-nyx-neon.html` was approved.

> **Finding (framework):** running the 3-way exploration *after* a greenfield design system is locked starves the variation. For greenfield, divergent visual exploration should precede design-system lock-in, then the system is harvested from the chosen direction. Captured for upstream.

---

## Screens & States

### Screen: The Canvas (single screen, fixed shell)

**Purpose:** map flowcode markdown files as a spatial, relational board and round-trip it with an agent.

**Shell (per nyx design system §7):** full-viewport glassmorphic dark void with a dot grid; a top 56px glass toolbar; minimap bottom-right; zoom controls bottom-left; an edge-origin legend. No header/sidebar nav.

**States covered (§12 + interaction modes):**

| State / mode | Where in the mockup | Notes |
|--------------|---------------------|-------|
| `empty` | 04 → **Empty** | No `?path`; glass open/create prompt |
| `loaded` | 04 → **Loaded** | The dogfood board: 6 markdown nodes (real frontmatter), a group rectangle, text + image + link nodes, 3 origin-styled edges, comment pin, chrome |
| `dirty` | 04 → Loaded (toolbar) | Amber save-dot in the Save button |
| `comment-mode` | 04 → **Comment** | Pin-placement crosshair + open flat thread (reply + resolve) |
| `reader-open` | 04 → **Reader** | Right glass drawer, full-fidelity rendered markdown (prose) + node thread |
| `stale-merge` | 04 → **Agent I/O** (Import) | `briefId` mismatch warning in the merge report |
| `connect` (draw edge) | 04 → **Connect** | Glowing handles + in-progress neon ghost-edge + hint |
| `upload` (drag-drop) | 04 → **Upload** | Full-canvas dropzone (images → image nodes, `.md` → markdown nodes) |
| `agent-io` | 04 → **Agent I/O** | Export DesignBrief (copy/download) · Import AgentResponse (paste → apply → report) |
| `loading` | _pending_ | Add a centered spinner frame before Phase 2 visual-parity |
| `error` | _pending_ | Add an fs-error frame (ENOENT/guard 400) + retry before Phase 3 visual-parity |

**Selected iteration:** `mockups/04-nyx-neon.html` — the only direction that (a) matches the operator's intended `DESIGN.md` neon-glass aesthetic, (b) renders real flowcode data, and (c) surfaces the complete plan capability set. Rejected iterations `01-light-editorial.html`, `02-vibrant-canvas.html`, `03-dark-minimal.html` remain in the folder as exploration history.

**Key elements (all carry `data-testid`):**
- **Toolbar** — modes: `toolbar-select` · `toolbar-connect` (draw edges) · `toolbar-comment-mode`; insert: `toolbar-add-node` ▾ (`add-node-markdown` file-picker · `add-node-text` · `add-node-rectangle` group · `add-node-image` · `add-node-link`); `toolbar-upload`; agent: `toolbar-import` / `toolbar-export`; `toolbar-fit-view`; `toolbar-save` (⌘S + dirty dot).
- **Node types** — markdown (frontmatter chip-table + collapsible rendered body, `node-collapse-toggle`), image, link, text/note, rectangle/group.
- **Edges** — bezier, arrowhead, midpoint label pill; origins: `links` (dashed + lock), `user` (solid indigo), `agent` (neon). Anchored to card handles.
- **Comments** — `comment-pin` (teardrop), flat thread, `comment-reply-input`, `comment-resolve`.
- **Reader** — `reader-close`; flawless rendered-markdown prose (h1/h2, lists, blockquote, inline code, neon syntax-highlighted code block).
- **Agent panel** — `agent-tab-export`/`agent-tab-import`, `brief-copy`, `brief-download`, `response-paste`, `response-apply`, `agent-close`.
- **Upload** — `dropzone-browse`.
- **Empty** — `open-file`.

---

## Responsive Breakpoints

| Name | Width | Mockup |
|------|-------|--------|
| desktop | 1280px | `mockups/04-nyx-neon.html` (fluid) |
| large | 1440px | same (no layout change — more canvas) |

Desktop-first canvas; the board fills the viewport at all sizes. **Mobile is out of scope (v0.1)** — do not author mobile mockups (`ui-design-system §6`).

---

## Interaction Contract

**User flows:**
1. **Open / load** — `?path=board.canvas` → `GET /api/canvas` → `POST /api/canvas/resolve` (frontmatter+body) → derive `links:` edges + reconcile → render.
2. **Add node / shape** — `toolbar-add-node` ▾ → markdown (file picker over `/api/files`), note (text), rectangle/group, image (pick or upload), link.
3. **Connect (draw edge)** — `toolbar-connect` → drag from a node handle to another → label prompt → `user` edge persists; `links:` edges auto-derive; promotion on label edit.
4. **Image upload (drag-drop)** — drop image/`.md` files onto the canvas (or `toolbar-upload` → browse) → bytes written → image/markdown node created. *(Scope addition — see below.)*
5. **Comment** — comment-mode → click node/canvas to drop a pin → flat thread → reply → resolve.
6. **Agent round-trip** — `toolbar-export` → DesignBrief (copy/download) → agent → `toolbar-import` → paste AgentResponse → idempotent merge (write generated files, upsert nodes/edges, attach replies, re-derive) → report; mismatched `briefId` → stale warning.
7. **Save / view** — `⌘S` saves (clears dirty dot); fit-view; reader drawer opens on node click.

**Keyboard / accessibility:**
- `⌘S` save; `Esc` closes any overlay (reader/agent/menu) and exits connect/comment/upload.
- Visible focus ring (accent) on every interactive element; `aria-label` on icon-only buttons; `aria-pressed` on mode toggles; touch targets ≥44px; `prefers-reduced-motion` honored; body contrast ≥4.5:1.
- Edge origin is signalled by stroke style (dashed/solid) in addition to color.

**Validation & error surfaces:**
- fs error (guard 400 / ENOENT 404 / 500) → `error` state with message + retry *(frame pending)*.
- Stale `briefId` → warning in the Agent I/O merge report before last-writer-wins.

---

## Design System / Component Reuse

The approved visual language is **nyx** (glassmorphic futuristic-neon), sourced from `references/DESIGN.md`. It **replaces** the dark language currently in `.flowcode/ui/ui-design-system.md`; that file is re-authored to nyx as the next action so production code and every future mockup source the same ground truth.

| Need | Component | Status |
|------|-----------|--------|
| Canvas card | glass `fc-node` (markdown/image/link/text) | new (nyx) |
| Container | `group` rectangle with header tab | new |
| Edge | origin-styled labeled bezier (`links`/`user`/`agent`) | new |
| Comment | teardrop `fc-pin` + flat thread | new |
| Reader | glass drawer + nyx prose | new |
| Agent panel | glass right-drawer, export/import tabs | new |
| Upload | dropzone overlay | new |

---

## Design Tokens Introduced

The nyx token set (supersedes the prior dark tokens wholesale; to be written into `app/globals.css @theme` in Phase 1 and into `ui-design-system.md`):

| Group | Tokens |
|-------|--------|
| Surfaces | `--bg #0b1326` · `--c-lowest #060e20` · `--c-low #131b2e` · `--c #171f33` · `--c-high #222a3d` · `--c-highest #2d3449` |
| Text/line | `--on #dae2fd` · `--on-var #c7c4d7` · `--outline #908fa0` · `--outline-var #464554` |
| Accents | `--primary #c0c1ff` · `--primary-cont #8083ff` · `--secondary #ddb7ff` · `--secondary-cont #6f00be` · `--tertiary-cont #ff516a` |
| Neon syntax | `--neon-cyan #5ef2ff` · `--neon-lime #b6f36a` · `--neon-rose #ff8fb0` |
| Glass | `backdrop-filter: blur(16–40px)` + ~50% fill + 1px white→indigo gradient edge; depth via blur, hover = border glow |
| Radii / space | 8px / 16px (cards) · pill `full`; 8px spacing grid |
| Type | **Geist** (UI) + **JetBrains Mono** (code/keys/metadata) — both local, no CDN |

> **New dependency:** JetBrains Mono (added alongside Geist). Must ship locally (npm/`@fontsource` or self-host) — no Google Fonts/CDN (carry the §0 no-remote-fetch rule into nyx).

---

## Scope Addition — drag-drop image upload

Not in `001-initial-architecture-design.md` as written (images are referenced by **path** via the `/api/files` picker + `/api/asset` byte-server; nothing *writes* uploaded bytes). The approved mockup includes drag-drop upload, so the design + plan must absorb:
- **Design / API:** `POST /api/upload` — guarded (`guardPath`), `IMAGE_EXT` allowlist, writes bytes under `FLOWCANVAS_ROOT`, returns the relative path.
- **Plan:** Phase 3 (the route) + Phase 4/7 (canvas drop handler → create image/markdown node from dropped files).

---

## Visual Parity

Populated during phase-close visual-parity checks (`ui-workflow.md §3`).

**Capture location:** `mockups/captures/phase-{N}/`

**Capture method (resolved Phase 4):** headless Google Chrome — `"…/Google Chrome" --headless=new --disable-gpu --window-size=1400,900 --virtual-time-budget=9000 --screenshot=<png> "http://localhost:3000/?path=<board>"`. This supersedes the "browser-capture MCP unavailable" deferral used in Phases 1–3: Chrome headless is present and is the standard visual-parity capture path going forward. The `--virtual-time-budget` lets the client-side load + async resolve settle before the shot.

**Interactive capture (added Phase 6):** for overlays gated behind interaction (comment mode → place pin → thread → reply → resolve), the static `--screenshot` can't reach the state. Phase 6 drives the same headless Chrome over a **pure-Node CDP-over-WebSocket driver** (no new deps — raw `net` + WS framing): `Page.navigate`, `Runtime.evaluate` to toggle mode / dispatch placement clicks / drive the controlled inputs (native value-setter + `input` event) / click send & resolve, then `Page.captureScreenshot` per state. The driver also asserts computed styles inline (pin teardrop radius, gradient, `data-resolved`).

| Phase | Expected drift | Acceptable drift | Regressions (must fix before phase-done) |
|-------|----------------|------------------|-------------------------------------------|
| Phase 1 | n/a — no mockup-comparable surface yet: Phase 1 ships only the glass void + nyx tokens + fonts; nodes/edges/chrome arrive Phase 2+ | PNG capture deferred to Phase 2 (browser-capture MCP unavailable). Foundation verified live: `GET / 200`, dark void `#0b1326`, Geist + JetBrains Mono applied, no hydration warnings, `ssr:false` shell | none |
| Phase 2 | Seeded nodes render as the **temporary Phase-2 `PlaceholderNode`** (kind label + glass `.fc-node`), not the real markdown frontmatter-table / image / link / note cards from `04-nyx-neon.html` — those land Phase 4. Edges (mockup shows 3 origin-styled) are Phase 5. So the board is intentionally chrome-light vs the loaded mockup. | PNG capture deferred (browser-capture MCP still unavailable). Verified live: `GET / 200`, canvas mounts client-side (`ssr:false` chunk wired), dot-grid `<Background variant=dots gap=22>` on `#0b1326`, two seeded glass nodes via `toReactFlow` `fitView`-centered, bottom-left `<Controls>` + bottom-right `<MiniMap>` chrome present, no server/hydration errors. Toolbar/legend are Phase 7. | none |
| Phase 4 | Content cards match `04-nyx-neon.html`: markdown card = title + `md` type badge + bordered collapse, **all** frontmatter fields with muted mono keys + semantic **status chip** (lime/cyan/amber) + **tag chips**, body with mono-cyan headings, glowing square bullets, cyan code chips, fade-to-card edge; image card streams any allowed type via `/api/asset` + `onError` fallback; cyan-tinted note card (`NOTE` kicker); horizontal link chip (`↗` + `LINK` kicker + mono URL); `group`/non-md `file` → `FallbackNode`. Edges + toolbar/legend remain Phase 5/7. | **Screenshot- + CDP-verified** (headless Chrome). Redesign board renders all kinds; status/tag chips colored by value; embedded markdown PNG + PNG image node render; **collapse measured interactively** on the welcome card via CDP — height 388px (body shown) → 171px (hidden) → 388px; default board + `?path=…not-found` error card also verified. No client console errors. | none |
| Phase 5 | Origin-styled edges match the mockup's edge language (design § Design System line 619): `links` muted + dashed + 🔒 lock label, `user` solid indigo, `agent` neon cyan. The default board's `welcome.md → schema.md` `links:` derives one edge. Manual-edge / relabel toolbars stay Phase 7. | **Screenshot- + CDP-verified** (`captures/phase-5/default-board-edges.png`). CDP on the live board: 1 edge `lk:n-welcome->n-schema`, `stroke-dasharray 5px,4px`, stroke `rgb(144,143,160)` (= `--color-outline`, muted), portaled label `🔒links` with class `fc-edge-label--links`; 5 nodes, no "node type not found". First draft had links/user colors inverted (indigo vs gray) — caught by qa Finding 4, corrected to the design and re-verified. | none |
| Phase 6 | Comment pins + flat threads match `04-nyx-neon.html`'s comment language: rose **teardrop** `fc-pin` (badge number, tail pointing at the anchor, glow), resolved pin dims to surface-gray; glass thread popover = header + avatar comment rows (human cyan/indigo, agent violet/rose) + reply input + indigo **Send** + lime **✓ Resolve**; comment-mode cyan toggle (`aria-pressed`) + centered hint pill. The full toolbar (modes/add-node/save/export) stays Phase 7; the minimal mode toggle is the only chrome Phase 6 ships. | **Screenshot- + interactive-CDP-verified** (`captures/phase-6/06-{loaded,comment-mode,draft-composer,thread-open,resolved,two-pins}.png`). Driven on the live default board: toggle → `aria-pressed=true` + hint shown; click on `n-welcome` → node-anchored draft composer; add → pin badge `1`; reply → thread shows 2 `.fc-cmt` rows; CDP-asserted pin `<i>` `border-radius 999px…/2px` (teardrop) + gradient `rgb(255,81,106)`; resolve → `data-resolved=true` + `.fc-resolve--done`; a second **canvas-anchored** click → pin badge `2` projecting correctly between nodes. Final board: pin 1 (resolved, dimmed) + pin 2 (rose). No client console errors. **UX-fix pass (operator feedback, post-close):** comment-mode control → compact 38×38 icon toggle; thread popover **tethered to its pin** with a connector beak (CDP: `data-side` set, ~1px pin→popover gap); edge labels edited via an inline glass `<input>` (no `window.prompt`) — captures `captures/phase-6/06b-{loaded,edge-editing,edge-labeled,comment-thread}.png`. | none |
| Phase 7 | The full plan-complete chrome lands, matching `04-nyx-neon.html`: top glass **toolbar** (◐ FLOWCANVAS mark · select/connect/comment mode group · `+ Add ▾` · `↑ Upload` · Import/Export · fit-view · Save+dirty-dot), the agent **right drawer** (Export = DesignBrief JSON + Copy/Download; Import = paste → Apply → merge report with amber stale banner), the full-fidelity **reader drawer** (shiki-highlighted prose + node thread), the add-node menu + file-picker, and the drag-drop dropzone. | **Screenshot- + interactive-CDP-verified** (`captures/phase-7/07-{loaded,add-menu,reader,export,import}.png`; pure-Node CDP driver, **18/18** checks). Live default-board copy: toolbar + all 9 controls present; connect mode → `aria-pressed` + `.fc-rf--connect`; comment mode → layer `data-mode`; `+ Add ▾` menu has all 5 items; add-note 5→6 nodes + dirty dot; Save clears the dot; markdown-node click → reader drawer, 404 chars of prose (mono-cyan headings + inline code chips), close works; Export → right drawer, brief JSON 4174 chars embedding `frontmatter`/`body`/`responseContract`; Import (mismatched briefId) → merge report + `stale-warning` banner + node 6→7 + generated `.md` written. `/api/render` curl confirms real `<pre class="shiki github-dark-default">` + per-token color spans. | none — **but a process catch:** the **first** CDP run rendered the chrome unstyled (toolbar/drawers as full-width block-flow at the page bottom, `bg:transparent`, `z:auto`). Root cause: **dev-server Turbopack CSS-chunk staleness** — the running `next dev` served a cached `globals.css` chunk predating the Phase-7 rules (the production `next build` CSS had all of them: `fc-toolbar`/`fc-agent`/`fc-reader`/`fc-picker`/`fc-dropzone`). Fixed by `rm -rf .next` + dev restart; re-verified 18/18 with the chrome correctly styled. **Lesson:** verify visual parity against a **clean-cache** dev (or the production build), since Turbopack HMR can serve a stale CSS chunk after large `globals.css` edits. |

---

## Content-node design rationale

The content nodes are the product — everything else is chrome around them. The guiding decisions:

- **The card is a document, not a form.** A markdown node reads top-to-bottom: identity (title + type badge) → metadata (frontmatter) → content (body). The frontmatter table is the *spec sheet*; the body is the *prose*. They get different visual weight — mono/compact for metadata, prose/airy for the body — so the eye separates "what this file is" from "what it says" without a label.
- **Color carries meaning, not decoration.** Frontmatter keys are deliberately muted (mono gray) so the values pop. The *value* is where state lives, so the value gets the color: `status` becomes a semantic chip (lime = settled/approved/done, cyan = in-flight/active, amber = caution/blocked), tags become violet chips. Coloring the key instead (the earlier version) was backwards — it emphasized the label "status" over the answer "approved". A board should be skimmable by status color from across the canvas.
- **Show the whole frontmatter, ranked.** Truncating to three fields hides exactly the metadata that makes a board worth having. Render every field, but rank it: `status`, `tags`, `links` first (the relational/state signals), then the rest in source order. Arrays become chip rows; long ones get a `+N` overflow so the card never blows out.
- **Collapse is a real state, so the card must change shape.** Hiding the body while the box keeps its height reads as "broken." Markdown nodes are therefore content-sized: collapsing drops the body and the card snaps down to its header + frontmatter (a "spec chip"). That makes collapse a spatial decision the user can feel — collapse the reference cards, keep the focus card open.
- **In-node markdown is a distinct typographic register.** Not a shrunk article — a dense, scannable one: mono cyan headings (they double as section markers), tight line-height, glowing square list bullets, cyan-tinted code. The body fades to the card color at its bottom edge so a clipped document signals "there's more" instead of ending mid-sentence.
- **Every file kind is first-class.** Images stream through the guarded asset route (any type, with an explicit not-found state rather than a broken-image glyph); embedded body images resolve the same way; notes get a cyan-tinted glass to separate human annotation from file content; links are horizontal chips that read as actions. Unknown kinds degrade to a labelled fallback, never a raw React-Flow box.

---

## Open Questions

- [x] Re-author `.flowcode/ui/ui-design-system.md` from dark → **nyx** — done 2026-06-25; the design system is now nyx and supersedes the dark starter. Phase 1 wrote its `@theme` tokens into `app/globals.css`.
- [ ] Add the `loading` and `error` state frames to `04-nyx-neon.html` before their implementing phase's visual-parity (Phase 2 / Phase 3). *(still open — due before Phase 2/3 visual-parity)*
- [x] Confirm **JetBrains Mono** ships locally (npm / self-host), not via CDN — confirmed Phase 1: `@fontsource/jetbrains-mono` (400/600 weights) imported in `app/layout.tsx`; Geist via the local `geist` package; zero CDN.
- [x] Fold the **upload** scope addition into `001-initial-architecture-design.md` (API) and the plan — done: design § Scope + § API Contracts (`POST /api/upload`, `UPLOAD_MAX`, 413) and plan Phase 3 (route + `uploadFile`) / Phase 7 (`dropzone.tsx`).

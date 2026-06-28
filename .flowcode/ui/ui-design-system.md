---
name: ui-design-system
description: Flowcanvas UI design system — the "nyx" glassmorphic futuristic-neon canvas ground truth for every mockup and frontend component. Re-authored from references/DESIGN.md (2026-06-25).
status: active
tags: [ui, design-system, tokens, components, mockups, ground-truth, nyx, glassmorphic, neon, canvas]
links: [.flowcode/ui/ui-index.md, .flowcode/ui/ui-mockup-discipline.md, .flowcode/ui/references]
---

# Flowcanvas UI Design System — nyx

- The single ground truth for every mockup and frontend change — read in full before authoring any HTML, CSS, or component.
- Language: **nyx** — Glassmorphic-Minimalist over a deep obsidian/indigo void, with electric-indigo/violet accents and a sparing cyan/lime/rose neon spectrum. Source: `references/DESIGN.md` + the approved mockup `plans/001-initial-architecture/mockups/04-nyx-neon.html`.
- Every value is a token — production code sources colors/spacing/type from `app/globals.css @theme`, never one-off hex.
- Depth comes from **background blur**, not drop shadows; surfaces are translucent glass with a 1px gradient edge; hover raises the **border glow**, not the fill.
- §0 = non-negotiables; §13 = the conformance checklist a mockup passes before it is shown; §14 = source index.
- Visual reference: `mockups/04-nyx-neon.html` (the approved board; live-app screenshot deferred to Phase 2 visual-parity — Phase 1 shipped the void/tokens/fonts foundation, browser-capture MCP unavailable).
- Supersedes the prior dark-minimal design system (2026-06-25 rewrite); `001-initial-architecture-ui-design.md` records the approval.

---

## §0 — Tier-1 Rules (the non-negotiables)

> A mockup or component that breaks any of these is non-conformant and must be revised before the user is asked to choose between iterations.

1. **Font stack is `'Geist', system-ui, sans-serif` for UI and `'JetBrains Mono', ui-monospace, monospace` for code / frontmatter keys / metadata.** Both loaded **locally** (geist npm + a self-hosted/`@fontsource` JetBrains Mono). No Google Fonts, no CDN. Never substitute Inter or another family.
2. **Colors come from §2 only.** No raw hex in components; every color resolves to a `--color-*` / nyx token. The entire palette is dark-glass; there is no light mode in v0.1.
3. **Spacing steps on the §4 8px grid.** No arbitrary px; pad/gap/margin on the scale only.
4. **Depth is glass, not shadow (§5).** Surfaces use `backdrop-filter: blur(...)` + a translucent fill + a 1px white→indigo gradient edge. Drop shadows are reserved for elevated overlays (drawers, menus, popovers) as a single low-opacity ambient shadow. No ad-hoc shadows on cards.
5. **Every interactive element carries `data-testid`** — preserved verbatim into implementation; load-bearing for hook-driven tests.
6. **The layout shell (§7) is fixed** — 100vw × 100vh glass void, dot grid, a 56px top toolbar, no header/sidebar. Never redesign the shell per screen.
7. **Component shapes (§8) are reused, not reinvented** — a canvas card is the glass `fc-node`, an edge label is `fc-edge-label`, a comment pin is the teardrop `fc-pin`, the reader uses the nyx prose, the agent round-trip uses the glass `agent-panel`.
8. **Accessibility floor (§11) is mandatory** — contrast ≥ 4.5:1 body, visible focus, reduced-motion honored, touch targets ≥ 44px.
9. **Motion follows §10** — transition only specific properties (transform / opacity / background-color / border-color / box-shadow); never `transition: all`. Drawers/overlays 200–250ms. No animation on high-frequency canvas events (pan, zoom, drag).
10. **Accent discipline.** `--primary` (Electric Indigo) carries selection, focus rings, agent-origin edges, **and** primary actions (the indigo gradient button). `--secondary` (Vivid Violet) carries tags/metadata + selection highlights. `--tertiary` (Rose) carries comments + destructive. The neon spectrum (cyan/lime/rose) is for syntax highlighting and active states — **used with intent, never as flat decoration**. Color also encodes meaning (edge origin, node accent), but is never the *only* signal (§11).

---

## §1 — Stack & Sources

| Aspect | Value |
|--------|-------|
| UI framework | React 19 (client components); Next.js 16 App Router |
| Styling | Tailwind v4 + `@tailwindcss/postcss`; CSS `@theme` design tokens in `app/globals.css` |
| Component library | None — in-house CSS classes (`fc-node`, `fc-edge-label`, `fc-pin`, `fc-fm`, `fc-prose`, `agent-panel`) |
| Canvas engine | React Flow (`@xyflow/react` ^12, MIT) |
| Icon set | Inline SVG only (1.5px stroke, outline); no emoji as structural icons |
| Token source of truth | `app/globals.css` `@theme` block (built in Phase 1 from this file) |
| Fonts | Geist (UI) via `geist` npm; JetBrains Mono (code/keys) self-hosted / `@fontsource` — both local, no CDN |
| Reference files | `references/DESIGN.md` (nyx spec) · `mockups/04-nyx-neon.html` (approved board) |

---

## §2 — Color Tokens

### §2.1 Primitives — the nyx obsidian/indigo palette

All tokens map to the `@theme` block in `app/globals.css`. Use these names verbatim.

| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg` | `#0b1326` | The canvas void / app background (with a subtle radial indigo/violet wash) |
| `--color-grid` | `rgba(146,143,160,.16)` | Dot-grid point color |
| `--color-surface-lowest` | `#060e20` | Deepest panels (minimap, code blocks) |
| `--color-surface-low` | `#131b2e` | Low elevation |
| `--color-surface` | `#171f33` | Card / node fill base (used at ~50% with blur) |
| `--color-surface-high` | `#222a3d` | Toolbar buttons, raised chips |
| `--color-surface-highest` | `#2d3449` | Highest container |
| `--color-primary` | `#c0c1ff` | Electric Indigo — selection ring, focus, agent edges, primary text-on-gradient |
| `--color-primary-cont` | `#8083ff` | Primary action gradient stop / strong indigo |
| `--color-secondary` | `#ddb7ff` | Vivid Violet — tags/metadata, selection highlights |
| `--color-secondary-cont` | `#6f00be` | Deep violet container |
| `--color-tertiary-cont` | `#ff516a` | Rose — comment pins, destructive |
| `--color-error` | `#ffb4ab` | Error text |
| `--color-text-primary` | `#dae2fd` | Body, node titles (cool off-white) |
| `--color-text-secondary` | `#c7c4d7` | Secondary body |
| `--color-outline` | `#908fa0` | Default edge stroke, muted lines, dividers |
| `--color-outline-variant` | `#464554` | Hairline borders on glass |
| `--color-neon-cyan` | `#5ef2ff` | Syntax / active accents / agent edge |
| `--color-neon-lime` | `#b6f36a` | Syntax (strings) / resolved-success |
| `--color-neon-rose` | `#ff8fb0` | Syntax (numbers) / warm accent |

### §2.2 Glass surfaces

Glass is the defining mechanic. A panel = a translucent fill **+** blur **+** a 1px gradient edge.

| Alias | Recipe |
|-------|--------|
| `--glass-fill` | `rgba(23,31,51,.55)` (≈ `--color-surface` @ 55%) |
| `--glass-edge` | `linear-gradient(135deg, rgba(192,193,255,.45), rgba(255,255,255,.04) 45%, rgba(128,131,255,.30))` applied as a `padding-box`/`border-box` 1px border |
| blur | `backdrop-filter: blur(16px)` cards · `blur(20px)` toolbar · `blur(40px)` menus/drawers |
| `--glow-indigo` | `0 0 0 1px rgba(128,131,255,.35), 0 0 22px -6px rgba(128,131,255,.55)` — the hover/selection glow |

### §2.3 Functional / status colors

| Token | Value | Meaning |
|-------|-------|---------|
| `--color-status-green` | `#b6f36a` (neon-lime) | Resolved comment, valid, success |
| `--color-status-amber` | `#f59f00` | Warning, stale merge, dirty/pending |
| `--color-status-red` | `#ff516a` (tertiary) | Error, destructive, guard violation |

### §2.4 JSONCanvas color presets (Flowcanvas rendering)

The JSONCanvas spec defines presets `"1"`..`"6"`. Flowcanvas renders them on nyx as node accent ticks / edge tints:

| Preset | Hex | Semantic |
|--------|-----|----------|
| `"1"` | `#ff516a` | Red / rose |
| `"2"` | `#f59f00` | Orange |
| `"3"` | `#e3b341` | Yellow |
| `"4"` | `#b6f36a` | Green / lime |
| `"5"` | `#5ef2ff` | Cyan |
| `"6"` | `#a371f7` | Purple |

Consumed via `colorVar(c?: CanvasColor)` in `lib/canvas/adapter.ts`. Never hardcode them outside that function.

> Functional color is never the only signal — pair with icon/stroke-style/text (§11).

---

## §3 — Typography

| Aspect | Value |
|--------|-------|
| Primary font | `'Geist'` (`var(--font-geist-sans)`) — UI labels, body, headings |
| Monospace font | `'JetBrains Mono'` (`var(--font-jetbrains-mono)`) — frontmatter keys, edge labels, code, metadata, chips |
| Base size / line-height | `14px / 1.5` UI; reader body `16px / 1.66` (per DESIGN.md `body-editor`) |
| Type scale | `9 · 10 · 11 · 12 · 13 · 14 · 16 · 22 · 26` px |
| Weights | `400` body · `600` titles/strong · `700` display |
| Display | `26px` reader h1, tight `-0.02em`; mono `label-caps` 11–12px uppercase `0.1em` |

| Named size | Value | Used for |
|------------|-------|----------|
| `--font-label-caps` | `11px` mono, `0.1em`, uppercase | Section labels, edge labels, kbd, tabs |
| `--font-caption` | `12px` | Captions, frontmatter values |
| `--font-body` | `13px` | Node body text, UI body |
| `--font-filename` | `13px / 600` | Node title |
| `--font-base` | `14px` | UI controls |
| `--font-reader` | `16px / 1.66` | Reader drawer prose |
| `--font-display` | `26px / 700 / -0.02em` | Reader h1 |

---

## §4 — Spacing & Sizing

**Scale (8px grid):** `4 · 8 · 12 · 16 · 24 · 32 · 48` px.

| Token | Value | Used for |
|-------|-------|----------|
| `--space-node-pad` | `12px` | Node inner padding |
| `--space-node-gap` | `8px` | Gap between frontmatter rows |
| `--gap` | `16px` | General flex/grid gap |
| `--gap-tight` | `8px` | Inline gaps |
| `--space-reader` | `24–30px` | Reader drawer padding |
| `--toolbar-height` | `56px` | Canvas toolbar height |

---

## §5 — Surfaces, Radii, Depth

**Depth is glass + blur, not shadow.** Borders are the 1px gradient edge (§2.2).

| Element | Surface | Radius | Depth |
|---------|---------|--------|-------|
| Node (rest) | `--glass-fill` + `blur(16px)` + 1px `--glass-edge` | `16px` | none (glass) |
| Node (hover) | same | `16px` | `--glow-indigo` border glow |
| Node (selected) | same | `16px` | `0 0 0 2px var(--color-primary)` + soft indigo glow |
| Edge label | `rgba(13,21,40,.85)` + 1px `--color-outline-variant` | `full` | none |
| Reader / agent drawer | glass + `blur(40px)` | `0` (full-height) | `-30px 0 80px -30px rgba(0,0,0,.75)` ambient |
| Menus / popovers | glass + `blur(40px)` | `8px` | ambient + `--glow-indigo` |
| Comment pin | gradient rose fill | `full` (teardrop) | rose glow |

**Radii:** `--radius-card: 16px` · `--radius-control: 8px` · `--radius-pill: 999px` · `--radius-sm: 4px`.

**Shadows (overlays only):**
- `--shadow-drawer: -30px 0 80px -30px rgba(0,0,0,.75)`
- `--shadow-overlay: 0 24px 60px -20px rgba(0,0,0,.7)`

No drop shadow on node cards — glow only.

---

## §6 — Breakpoints

Desktop-first canvas. The canvas fills 100vw × 100vh; responsive layout is not a v0.1 concern.

| Name | Range | Behavior |
|------|-------|----------|
| desktop | `≥ 1024px` | Full canvas; reader/agent drawers overlay right |
| large | `≥ 1440px` | No layout change; more canvas |

Mobile is out of scope for v0.1 (design § Scope). Do not author mobile mockups.

---

## §7 — Layout Shell

Fixed across all screens — describe once, never redesign per mockup.

- **Canvas:** full viewport, background `--color-bg` with a subtle radial indigo/violet wash; dot-grid overlay (`gap 22px`, `--color-grid`).
- **No top header or sidebar nav.** The canvas owns the viewport.
- **Toolbar:** fixed top strip, `--toolbar-height` (56px), glass (`blur(20px)`) + 1px bottom edge. Grouped: board title · **modes** (Select / Connect / Comment, segmented) · **insert** (Add ▾: markdown file-picker / note / rectangle-group / image / link) + **Upload** · **agent** (Import / Export) · Fit-view · Save (⌘S + dirty dot).
- **Reader drawer & Agent panel:** slide from the right, `min(46–48vw, 600–640px)`, glass `blur(40px)`, `--shadow-drawer`; scroll independent of the canvas.
- **MiniMap:** bottom-right, glass, colored node dots.
- **Controls:** bottom-left (zoom +/−, fit).
- **Legend:** edge-origin key (links/user/agent), bottom-center.
- **Dropzone:** full-canvas dashed-neon overlay for drag-drop upload (images → image nodes, `.md` → markdown nodes).
- **Z-index (low → high):** `canvas 0 · node 10 · comment-layer 20 · chrome 30 · toolbar 40 · reader/agent 45–48 · toast 50 · tooltip 60`.

---

## §8 — Component Specs

### Canvas node (`fc-node`)

Glass card, base for markdown/image/link/text:
```css
.fc-node{
  border-radius: 16px;
  background-image: linear-gradient(var(--glass-fill), var(--glass-fill)), var(--glass-edge);
  background-origin: border-box; background-clip: padding-box, border-box;
  border: 1px solid transparent; backdrop-filter: blur(16px);
  color: var(--color-text-primary);
  transition: box-shadow .14s ease, border-color .14s ease;   /* never 'all' */
}
.fc-node:hover{ box-shadow: var(--glow-indigo); }
.react-flow__node.selected .fc-node{ box-shadow: 0 0 0 2px var(--color-primary), 0 0 26px -4px rgba(192,193,255,.6); }
```

### Markdown node anatomy

```
┌──────────────────────────────────────────┐
│ node-title (Geist 600/13px)   [md]  [–]  │  ← header; kind chip + collapse toggle
├──────────────────────────────────────────┤
│ status   approved (chip)   (JetBrains Mono)│  ← frontmatter chip-table
│ tags     design · architecture            │
├──────────────────────────────────────────┤
│ ## Problem Statement  (rendered, no '##') │  ← rendered GFM body (collapsible)
└──────────────────────────────────────────┘
  ◦   ◦          ◦         ◦   — 4 handles (Loose mode); glow in Connect mode
```

- Title: `frontmatter.name` or filename; 600 / `--font-filename`.
- Frontmatter: keys in JetBrains Mono / `--color-text-secondary`; values as chips (status = lime/cyan, tags = violet).
- **Body renders markdown** (react-markdown + remark-gfm) — headings, lists, blockquote, inline code, strong/em — styled in nyx; never show raw `##`/`*` markers. Overflow fades. No shiki in nodes (reserved for reader).
- Collapse toggle: `–`/`+`, `data-testid="node-collapse-toggle"`.

### Image / link / text nodes
- **Image:** glass card, header + caption, image fills (`objectFit: contain`); hover "drop to replace" hint.
- **Link:** glass chip with link glyph + URL (violet) + sub-label.
- **Text/note:** glass card, cyan `text · note` eyebrow, rendered markdown.

### Rectangle / group
Translucent indigo-tinted container with a dashed indigo border and a header-tab label (mono uppercase). **Must fully enclose all its child nodes on every side with padding** — a fence that clips a member (e.g. a right or bottom edge ending mid-card, at ~80% width) is non-conformant; size the container to its members' bounding box plus padding.

### Edge label (`fc-edge-label`)
Mono pill, `rgba(13,21,40,.85)` + 1px `--color-outline-variant`, `radius full`, midpoint of a 1.5–2px bezier.
- `links`: dashed (`4 4`) + lock glyph, muted `--color-outline`.
- `user`: solid `--color-primary`.
- `agent`: neon gradient (`--color-neon-cyan` → `--color-secondary`) + glow.

### Comment pin (`fc-pin`)
26px teardrop (`border-radius: 999px 999px 2px 999px`), rose gradient fill + glow + small anchor tail, mono 700/12px badge. Resolved = `opacity .45`, no glow. Active = primary border.

### Reader drawer + nyx prose (`fc-prose`)
Glass `blur(40px)` right drawer. Prose: h1 26/700, h2 mono-uppercase indigo rule, 16/1.66 body, neon-dot list markers, indigo-rule blockquote, cyan inline-code chips, and a neon syntax-highlighted code block (cyan keywords, lime strings, rose numbers). **The read experience must be flawless** — rendered markdown, never raw markers.

### Agent panel (`agent-panel`)
Glass right drawer, two tabs: **Export** (DesignBrief JSON preview + Copy/Download) and **Import** (paste AgentResponse textarea + Apply + merge report; stale-`briefId` warning).

### Buttons (toolbar)
| Variant | Spec |
|---------|------|
| Icon/text | 38px, glass `--color-surface-high` @50%, 1px `--color-outline-variant`, radius 8px; hover = `--glow-indigo`; press `scale(.97)` |
| Primary | electric-indigo gradient (`--color-primary-cont` → `#6f5bff`), white text, no border |
| Mode toggle (segmented) | `aria-pressed`; active = indigo gradient |
| Destructive | text `--color-status-red` |

### Dropzone
Full-canvas dashed `--color-neon-cyan` border, faint cyan fill + inner glow, upload glyph, copy, and a Browse button (`data-testid="dropzone-browse"`).

---

## §9 — Icons & Imagery

- Inline SVG, one family, 1.5px stroke, outline only. Sizes: 16px (toolbar), 20px (drawer). No emoji as structural icons.
- Canvas images render via `<img src="/api/asset?path=…">` (path-based) **or** via drag-drop upload (`POST /api/upload`).
- Avatars (comment authors): initial circle, gradient fill (human = cyan→indigo, agent = violet→rose).

---

## §10 — Motion & Interaction

- **Node:** `transition: box-shadow .14s ease, border-color .14s ease` — never `all`. No position/size animation.
- **Drawers (reader/agent):** slide `translateX` 200–220ms `cubic-bezier(.23,1,.32,1)`.
- **Connect mode:** handles pulse-glow (cyan); an in-progress neon ghost-edge follows the cursor.
- **Button press:** `scale(.97)` 100ms.
- **Toast:** slide bottom-right 200ms; auto-dismiss 4s.
- **High-frequency events (pan/zoom/drag):** no custom animation.
- `@media (prefers-reduced-motion: reduce)`: drawers/toasts/handle-pulse become instant/crossfade.
- `--ease-out: cubic-bezier(.23,1,.32,1)`.

---

## §11 — Accessibility Floor

- Contrast: `--color-text-primary` (#dae2fd) on `--color-bg` (#0b1326) ≈ 12:1; on glass cards ≈ 9:1 — well above 4.5:1. Verify any neon-on-glass text stays ≥ 4.5:1 (use neon for accents/large glyphs, not small body).
- Visible keyboard focus on every interactive element — the 2px `--color-primary` ring; `aria-pressed` on mode toggles, `aria-selected` on tabs, `aria-label` on icon-only buttons.
- Touch targets ≥ 44px (pins, toolbar) via `min-width/height`.
- Color never the only signal: edge origin = dashed/solid/neon stroke style + lock glyph in addition to color; status = glyph + text.
- Reduced motion & dynamic text scaling must not break node layout (`min-height`, not fixed `height`, on node bodies).
- Glass legibility: keep a sufficiently opaque fill behind body text; do not let blur drop contrast below the floor.
- **Content readability (readability-first).** Body / description / node-role text uses `--color-text-primary` — the muted `--color-text-secondary` / `--color-outline` greys are reserved for labels, eyebrows, and metadata keys, never for content a user must read. A description rendered in a muted grey is a readability defect.
- **Metadata chips stay legible.** Frontmatter tag chips must read as cleanly as the status pills — give the chip text + border enough contrast; never wash a tag to a near-invisible faded violet.
- `--color-secondary` is recalibrated `#ddb7ff → #e4c6ff` with **role reduction** (prose `em` / headings step down to a deeper violet) in plan `003` — a hierarchy fix for one over-saturated violet serving too many roles, **not** a contrast fix (`#ddb7ff` already clears WCAG on every surface, ~9–12:1).

---

## §12 — States Catalog

Every canvas screen/component must account for:

- `empty` — no `?path`; glass open/create prompt.
- `loading` — doc fetching; centered spinner on the void.
- `loaded` — board rendered with nodes, edges, minimap.
- `dirty` — unsaved; amber save-dot in the toolbar.
- `error` — fs error (guard 400 / ENOENT 404 / 500); message + retry.
- `stale-merge` — `AgentResponse.briefId` ≠ `session.lastBriefId`; warning in the merge report.
- `comment-mode` — pin-placement crosshair; click targets the canvas.
- `reader-open` — reader drawer overlays right; board navigable underneath.
- `connect` — edge-draw mode; handles glow; ghost-edge to cursor.
- `upload` — drag-drop dropzone overlay active.
- `agent-io` — agent panel open (Export brief / Import response).

---

## §13 — Mockup Authoring Checklist (conformance gate)

Run before showing any mockup. A failure on any line is non-conformant — revise, do not present.

- [ ] Font stack is Geist (UI) + JetBrains Mono (code/keys) per §0 rule 1. No other families, no CDN.
- [ ] All colors resolve to §2 nyx tokens — zero stray hex.
- [ ] Spacing on the §4 8px scale.
- [ ] Depth is glass (blur + 1px gradient edge); shadows only on drawers/menus; hover = border glow (§5).
- [ ] Layout shell intact (§7): full-viewport glass void, dot-grid, 56px toolbar, no header/sidebar.
- [ ] Components are §8 shapes: glass `fc-node`, `fc-edge-label`, teardrop `fc-pin`, nyx prose, `agent-panel`, dropzone.
- [ ] **Markdown renders** (headings/lists/blockquote/inline-code) — never raw `##`/`*` markers. Reader prose is flawless.
- [ ] Every declared §12 state rendered and reachable.
- [ ] Desktop-only (§6); no mobile.
- [ ] `data-testid` on every interactive element.
- [ ] Accessibility floor (§11): contrast (incl. neon-on-glass), focus ring, `aria-*`, touch targets.
- [ ] Motion (§10): specific properties only; no `transition: all`; reduced-motion honored.
- [ ] Accent discipline (§0 rule 10) respected.
- [ ] Self-contained: inline styles only; renders standalone; no external URLs/fonts/images.

---

## §14 — Source-File Index

| Section | Source of truth |
|---------|-----------------|
| Whole system | `references/DESIGN.md` (nyx tokens, typography, glass, shapes, components) |
| §2 Colors / §5 glass | `references/DESIGN.md` frontmatter + `mockups/04-nyx-neon.html` `:root` |
| §3 Typography (Geist + JetBrains Mono) | `references/DESIGN.md` typography + `001-…-plan.md` Phase 1 `app/layout.tsx` |
| §7 Layout shell / §8 components | `mockups/04-nyx-neon.html` (approved) + `001-…-plan.md` Phases 2–7 |
| §2.4 preset colors | `001-…-design.md § Enums & Constants` + `lib/canvas/adapter.ts PRESET` |
| Approval record | `plans/001-initial-architecture/001-initial-architecture-ui-design.md` |
| References | `mockups/04-nyx-neon.html` · `references/DESIGN.md` (live-app screenshot pending Phase 1) |

> Last generated: 2026-06-25, re-authored from `references/DESIGN.md` (nyx) replacing the prior dark-minimal system. Mode: design-driven. Update §14 to concrete `app/globals.css:line` references once Phase 1 lands the `@theme` block.

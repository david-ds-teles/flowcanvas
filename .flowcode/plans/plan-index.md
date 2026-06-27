---
name: plan-index
description: Index of every plan managed by this flowcode installation — PREFIX, name, status, progress, and design/plan artifact links.
status: active
tags: [plans, index, lifecycle, progress]
links: [.flowcode/plans/plan-instructions.md, .flowcode/templates/plan-template.md, .flowcode/flowcode-index.md]
---

# Plan Index

- Registry of every plan in this installation — one row per plan with PREFIX, name, status, progress, and design/plan links.
- Lifecycle, statuses, and the create/complete procedures live in `plan-instructions.md`; this file is the row table only.
- Discover a plan here, then open its `.flowcode/plans/{PREFIX}/` folder for the design, plan, log, and post-execution artifacts.
- Keep the table file-listing-only — no per-plan narrative; update the row on every status transition.

---

| PREFIX | Name | Status | Progress | Design | Plan | Notes |
|--------|------|--------|----------|--------|------|-------|
| `001-initial-architecture` | Flowcanvas v0.1 | complete | 8/8 | [design](001-initial-architecture/001-initial-architecture-design.md) | [plan](001-initial-architecture/001-initial-architecture-plan.md) | **Complete (v0.1 + Phase 8 polish)** — Flowcanvas: standalone Next.js 16 / React Flow canvas over flowcode markdown with `links:`-derived + manual edges, content nodes (md/image/link/note + fallback), pinned comment threads, and a bidirectional idempotent human↔agent JSON round-trip; **8** guarded fs routes; nyx glass UI (mockup 04). Phase 8 (2026-06-27) added: CSS-partial refactor + `useCanvasHandlers` hook, orthogonal smoothstep edges, a 3-size reader + maximize, bidirectional `links:` write-back (`/api/canvas/links`), nyx minimap/controls, no dev badge. Post-exec artifacts updated. Gates: tsc 0 · lint 0 · build ok · vitest 66/66 · CDP visual-parity 9/9 |

**Progress format:** `{completed}/{total}` — count `[PHASE]` entries with status `complete` or `complete-with-warnings` in `{PREFIX}-log.md`.

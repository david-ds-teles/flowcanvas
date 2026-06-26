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
| `001-initial-architecture` | Flowcanvas v0.1 | active | 4/7 | [design](001-initial-architecture/001-initial-architecture-design.md) | [plan](001-initial-architecture/001-initial-architecture-plan.md) | Greenfield Next.js 16 canvas app; UI approved (nyx glass, mockup 04); all 7 phases at full depth; Phase 1 done (nyx visual foundation), Phase 2 done (schema + adapter + empty canvas), Phase 3 done (persistence & resolve API — guarded fs routes + store), Phase 4 done (Content Nodes — md/image/link/note + FallbackNode), Phase 5 next (Edges) |

**Progress format:** `{completed}/{total}` — count `[PHASE]` entries with status `complete` or `complete-with-warnings` in `{PREFIX}-log.md`.

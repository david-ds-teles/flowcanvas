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
| `002-system-design-studio` | Flowcanvas System Design Studio (v2) | draft | 0/? | [design](002-system-design-studio/002-system-design-studio-design.md) | — | **Draft — design in progress.** v2 evolution: canvas becomes system-of-record for the design graph (typed/labeled relations across all endpoint types), content stays in live md, `links:` demoted to extraction-input + export-projection. Agent-driven extraction import (canvas-schema + extraction spec handed to the agent), reference navigation/hydration, template library, richer full-architecture agent round-trip over **MCP** (native, no clipboard) + Submit panel + snapshot-diff change-review (round-level accept/discard), portable bundle export, load-time disk-divergence reconcile. Builds on 001 Phase 10. Out-of-scope parked as BL-003…BL-008. Upper sections approved; `flowcode:designer-agent` to fill technical depth (schema DDL, extraction-spec format, MCP signatures, merge/diff). |
| `001-initial-architecture` | Flowcanvas v0.1 | complete | 10/10 | [design](001-initial-architecture/001-initial-architecture-design.md) | [plan](001-initial-architecture/001-initial-architecture-plan.md) | **Complete (10/10).** v0.1 (Phases 1–7) + Phase 8 polish + **Phase 9 UX/UI redesign** + a post-Phase-9 UX bugfix pass shipped & verified. Ph9 (2026-06-27): single-rail toolbar (direct inserts + Shape/File flyouts + disabled Phase-10 scaffolds), shared `<FrontmatterView>` (card + reader-bar), opaque 17px/66ch reader + frontmatter bar, agent `Load .json…` import; bugfixes: selection ring conforms to rounded cards, dashed-indigo shapes, import brief-detection. Plan closed via the post-exec pipeline (code-explorer audit → technical-overview regen, changelog reconciled, test-notes, project-overview propagated, plan-completion review PASS). Gates: tsc 0 · lint 0 · build ok · vitest 66/66 · CDP green. **Phase 10 delivered** — canvas mechanics: multi-select + true group containers (`parentId`/`extent`), ELK "Re-organize", save-as/open-board (`<BoardDialog>`). Gates: tsc 0 · lint 0 · build ok · vitest 79/79 · CDP live-verified. The operator-added transitive board hydration, ≤1-action referenced-file access, and the broader linking / source-of-truth + agent-collaboration vision are split to **`002-system-design-studio`** (in design). |

**Progress format:** `{completed}/{total}` — count `[PHASE]` entries with status `complete` or `complete-with-warnings` in `{PREFIX}-log.md`.

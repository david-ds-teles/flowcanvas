---
name: backlog
description: Canonical, durable idea list that prevents features, debt, and bugs being lost between plans.
status: active
tags: [backlog, ideas, grooming, knowledge-base]
links: [.flowcode/workflow/flowcode-rules.md, .flowcode/templates/backlog-entry-template.md, .flowcode/project/project-overview.md]
---

# Project Backlog

- Canonical idea list — the durable backlog that prevents ideas being lost between plans.
- IDs never reused: once an ID like `BL-007` is assigned it retires with its entry, even if the entry is rejected.
- Groomed only during brainstorming or design sessions — never on a schedule, never at plan-start.
- No silent auto-add: user approval is required to move items into or out of `Active`.
- Full discipline lives in `.flowcode/workflow/flowcode-rules.md § Backlog`; see the Legend below for field values.

---

## Entries

| ID | Status | Type | Importance | Date | Source | References | Description |
|----|--------|------|-----------|------|--------|-----------|-------------|
| BL-001 | New | Debt | Medium | 2026-04-27 | brainstorm command design session | `/flowcode:brainstorm`, `.flowcode/ui/ui-workflow.md` | `ui/ui-workflow.md` is currently optimized for designer-stage 3-iteration mockups; brainstorm-stage visual comparisons may need a lighter-weight, comparison-grade flow — evaluate fit and decide whether a brainstorm-stage variant is justified |
| BL-002 | New | Feature | Medium | 2026-06-26 | UI design session (001) | `001-initial-architecture`, `mockups/04-nyx-neon.html` | Add `loading` + `error` state frames to the approved `04-nyx-neon.html` before Phase 2/3 visual-parity (it currently covers empty/loaded/connect/comment/upload/agent/reader; `dirty` + `stale-merge` are shown inline) |
| BL-003 | New | Feature | Low | 2026-06-27 | flowcanvas v2 brainstorm | `002-system-design-studio` | Real-time multi-user collaboration / presence / CRDT. Out of v2 scope — flowcanvas stays a single-user filesystem app; revisit if concurrent co-design becomes a goal |
| BL-004 | New | Feature | Low | 2026-06-27 | flowcanvas v2 brainstorm | `002-system-design-studio` | Auth / multi-tenancy / cloud hosting. Out of v2 scope — no auth/telemetry/external services today; revisit if flowcanvas is hosted beyond local single-user use |
| BL-005 | New | Feature | Medium | 2026-06-27 | flowcanvas v2 brainstorm | `002-system-design-studio` | Flowcode-agnostic import — any agent reads any markdown (not just flowcode design/plan docs) and emits flowcanvas format. Generalizes the v2 agent-driven extraction beyond flowcode artifacts |
| BL-006 | New | Feature | Low | 2026-06-27 | flowcanvas v2 brainstorm | `002-system-design-studio` | Deterministic in-tool markdown→canvas parser. v2 deliberately delegates extraction to the agent (no fragile parser); revisit a deterministic parser only if agent-driven import proves insufficient or costly |
| BL-007 | New | Feature | Medium | 2026-06-27 | flowcanvas v2 brainstorm | `002-system-design-studio` | Rich import of arbitrary (non-flowcode) markdown — beyond v2's best-effort single-node degrade; richer structural extraction for arbitrary md |
| BL-008 | New | Feature | Medium | 2026-06-27 | flowcanvas v2 brainstorm | `002-system-design-studio` | Per-change cherry-pick reject / branching history / full undo stack for agent change-review. v2 ships round-level accept-or-discard only; granular per-change reject + history is a future extension |
| BL-009 | New | Debt | Medium | 2026-06-29 | user — KB tech-debt review | `lib/fs-guard.ts` | `guardPath` does lexical-only normalization, so a symlink inside `FLOWCANVAS_ROOT` that points outside it is not dereferenced and a guarded read/write can escape the root |
| BL-010 | New | Debt | Medium | 2026-06-29 | user — KB tech-debt review | `lib/canvas/jsoncanvas.ts`, `lib/render-md.ts` | No vitest unit coverage for the schema module (`nodeKind`/guards), the `render-md` server pipeline, or the reader drawer — those render paths are exercised only by `smoke:render` |

---

## Legend

- **Status:** `New` · `Active` · `On-Hold` · `Fold-In` · `Rejected`
- **Type:** `Feature` · `Bug` · `Debt`
- **Importance:** `Critical` · `High` · `Medium` · `Low`
- **Source:** who or what raised it (user, postmortem, audit, etc.)
- **References:** plan `{PREFIX}`, research `{slug}`, issue link, etc.

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

---

## Legend

- **Status:** `New` · `Active` · `On-Hold` · `Fold-In` · `Rejected`
- **Type:** `Feature` · `Bug` · `Debt`
- **Importance:** `Critical` · `High` · `Medium` · `Low`
- **Source:** who or what raised it (user, postmortem, audit, etc.)
- **References:** plan `{PREFIX}`, research `{slug}`, issue link, etc.

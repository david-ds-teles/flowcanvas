---
name: backlog-entry-template
description: Row format and field rules for adding a BL-NNN entry to the project backlog (.flowcode/project/backlog.md).
status: active
tags: [template, backlog, entries, grooming]
links: [.flowcode/templates/templates-index.md, .flowcode/project/backlog.md]
---

# Backlog Entry Template

- Use for every new row added to `.flowcode/project/backlog.md` — one row per idea.
- `## Row Template` gives the 8-column row; `## Field Rules` and `## Grooming Rules` constrain it.
- IDs are `BL-NNN`, never reused; status changes into or out of `Active` require user approval.

---

## Row Template

| ID | Status | Type | Importance | Date | Source | References | Description |
|----|--------|------|-----------|------|--------|-----------|-------------|
| BL-{NNN} | New | Feature \| Bug \| Debt | Critical \| High \| Medium \| Low | {YYYY-MM-DD} | {who/what raised it} | {plan PREFIX, research slug, link} | {1-sentence problem or opportunity — not a solution} |

---

## Field Rules

- **ID:** `BL-{NNN}` — next unused integer, zero-padded to 3 digits. **Never reused.** A rejected or folded-in entry keeps its ID forever.
- **Status:**
  - `New` — raised, not triaged
  - `Active` — committed; work has started or is imminent (should reference a plan PREFIX)
  - `On-Hold` — triaged but intentionally deferred
  - `Fold-In` — absorbed into another entry or plan; reference the absorber
  - `Rejected` — decided not to do; rationale lives in Description
- **Type:** `Feature` · `Bug` · `Debt`
- **Importance:** honest; don't inflate
- **Date:** entry creation date, not last-modified
- **Source:** who or what surfaced this — user, postmortem, audit, research file
- **References:** relevant artifacts — `{PREFIX}`, `{slug}-research.md`, external ticket link
- **Description:** one sentence. State the problem or opportunity, not the solution. Solutions belong in a design.

---

## Grooming Rules

- Add or promote to `Active` only during a brainstorming or design session
- Never at plan-start (avoids dragging low-priority items into scope)
- Never on schedule
- User approval required for any status change into or out of `Active`

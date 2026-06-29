---
name: {PREFIX}-changelog
description: Per-phase changelog for {PREFIX} — file-level change record built incrementally and reconciled against code at plan completion.
status: active
tags: [changelog, changes, per-phase]
links: [.flowcode/plans/{PREFIX}/{PREFIX}-plan.md, .flowcode/plans/{PREFIX}/{PREFIX}-technical-overview.md]
---

# Changelog — {PREFIX} {Feature Name}

- {2–3 sentence digest of the overall change set; written at plan completion.}
- Type: {FEATURE | BUG_FIX | QUICK-FIX | REFACTORING | TEST}.
- Status {active|complete}; dated {DATE}.
- Built incrementally per phase; reconciled against code at plan completion.
- Source plan: `{PREFIX}-plan.md`.

---

## Summary

{2–3 sentences describing the overall change set at the highest level. Written at plan completion.}

---

## Phase 1 — {Phase Name}

| File | Type | Summary |
|------|------|---------|
| `{path}` | created | {2-line max: what was created and why} |
| `{path}` | modified | {2-line max: what changed and what behavior it affects} |
| `{path}` | deleted | {2-line max: what was removed and why it's no longer needed} |

---

## Phase 2 — {Phase Name}

| File | Type | Summary |
|------|------|---------|
| | | |

---

## Phase N — {Phase Name}

{Append a `## Phase N — {Phase Name}` section at the close of each phase. See `plan-execution.md § Phase Close Sequence` step 5.}

---

## Reconciliation

{Written at plan completion after the Code Explorer audit. Correct any divergence between per-phase entries and the final code state; flag anomalies. If none: write "None — per-phase entries match the code."}

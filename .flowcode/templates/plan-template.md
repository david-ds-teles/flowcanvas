---
name: {PREFIX}-plan
description: Implementation plan for {Feature Name} — the phased execution spec and authoritative source of truth while plan {PREFIX} is built.
status: active
tags: [plan, implementation, phases]
links: [.flowcode/plans/{PREFIX}/{PREFIX}-design.md, .flowcode/plans/{PREFIX}/{PREFIX}-log.md]
---

# {PREFIX} — {Feature Name} Implementation Plan

- {One sentence: what this plan delivers when fully executed.}
- Phases: {N} — {comma-separated phase names}.
- Status {active|paused|complete}; dated {DATE}.
- Upstream design: `{PREFIX}-design.md` (approved before execution).
- The active phase is junior-executable: production-ready snippets, worked examples, a flow diagram (where non-trivial), and named quality checks — per `plan-instructions.md § Active-Phase Completeness Bar`.
- Execution history lives in `{PREFIX}-log.md` (one entry per phase end + plan end) — not inlined here.

---

## Objective

{One sentence: what this plan delivers when fully executed.}

---

## Phases Catalog

{One row per phase. `Depends On` lists the earlier phases that must be `done` first ( `[none]` = a root phase). It is the single signal the executor uses to derive parallel waves — phases whose dependencies are all `done` and whose `Files to create / modify:` tables are path-disjoint may run concurrently (`plan-instructions.md § Phase Dependencies & Waves`).}

| Phase | Name | Depends On | Summary |
|-------|------|------------|---------|
| 1 | {name} | [none] | {one line} |
| 2 | {name} | [Phase 1] | {one line} |

> **Execution record:** this file is the spec. Phase execution history lives in `{PREFIX}-log.md` (same folder, one entry per phase end + one plan-end entry). The plan file and the log file are separate by design — do not inline execution status here.

---

## Phase 1 — {Phase Name}

**Goal:** {What this phase achieves and why it must come first.}

**Phase Status:** pending | in-progress | quality-check | done

**Evaluation:** user | review-agent | skipped ({reason})

**Depends On:** [none]

**Touched Modules:**
- `{module-name}` → `.flowcode/project/modules/{module-name}.md`

**Files to create / modify:**

| File | Operation | Description |
|------|-----------|-------------|
| `{path}` | create | {what and why} |
| `{path}` | modify | {what section, what change} |

**Implementation steps:**

- [ ] {Concrete, unambiguous step a junior engineer could execute without asking — name the function, type, field, endpoint, config key, or SQL statement and the call site, all already decided in the design.}
- [ ] {step}
- [ ] {step}

> Every step is a checkbox. Check it (`- [x]`) the moment the underlying work finishes — never batch. A step that cannot be executed this phase carries an inline annotation: `(deferred: reason)` or `(N/A: reason)`. A phase cannot close with unchecked boxes lacking an annotation.

**Code & examples:**

{Production-ready snippet for each non-trivial step — real signatures, imports, types, and error handling; copy-adaptable, grounded in the design and module files (never invent an API they do not define).}

```{lang}
{the actual code or diff to write}
```

{Worked example — a concrete input → output that pins the expected behavior.}

```text
{sample request/response, fixture row, config, or CLI invocation + its result}
```

**Diagram:** {a `mermaid` (or ASCII) diagram of the control/data flow, sequence, state, or architecture this phase adds or changes. Omit only when the phase is trivially linear, with a one-line reason.}

```mermaid
{flow / sequence / state diagram}
```

**Acceptance criteria:**
- [ ] {criterion — verifiable, not vague}
- [ ] {criterion}

**Quality checks (run at phase close):** {the concrete gates from `quality-checks/quality-gates.md` that apply to this phase's scope — `build` / `test` / `lint` / `e2e` — named explicitly.}

> **Active-phase depth:** Phase 1 is the active phase — it must meet `plan-instructions.md § Active-Phase Completeness Bar` (junior-executable: production-ready snippets, worked examples, a flow diagram where non-trivial, named quality checks). Later phases stay stubs until they become active.

> **Quality gate:** code-review sub-agent runs. See `plan-instructions.md § Phase Close Sequence` for the four-step close. Phase-end `[PHASE]` entry is appended to `{PREFIX}-log.md`, not here.

---

## Phase 2 — {Phase Name}

**Goal:** {What this phase achieves.}

**Phase Status:** pending | in-progress | quality-check | done

**Evaluation:** user | review-agent | skipped ({reason})

**Depends On:** [Phase 1]

**Touched Modules:**
- `{module-name}` → `.flowcode/project/modules/{module-name}.md`

**Files to create / modify:**

| File | Operation | Description |
|------|-----------|-------------|
| `{path}` | create | {what} |

**Implementation steps:**

- [ ] {step}
- [ ] {step}

**Acceptance criteria:**
- [ ] {criterion}

> **Quality gate:** code-review sub-agent runs. See `plan-instructions.md § Phase Close Sequence`.

---

## Phase N — {Phase Name}

{Repeat the phase structure above — goal, **Phase Status**, **Evaluation**, **Depends On**, files, steps (checkboxes), acceptance criteria, quality gate — for each phase. `Phase Status` moves `pending → in-progress → quality-check → done` per `plan-instructions.md § Phase Status`. `Depends On` lists the earlier phases that must be `done` first (`[none]` for a root phase) — set it honestly: it is what lets the executor run independent phases in parallel waves. Later phases stay stubs (name, goal, rough file set) until they become active; when a phase becomes active, expand it to Phase 1's full structure and meet `plan-instructions.md § Active-Phase Completeness Bar` (production-ready snippets, worked examples, a flow diagram where non-trivial, named quality checks). Do not add free-form execution narrative here; that belongs in `{PREFIX}-log.md`.}

> **Within-phase parallelism:** the `create` rows in a phase's `Files to create / modify:` table that are mutually independent (no row imports another) are the unit of within-phase fan-out — the executor may implement them with parallel `flowcode:implementer-agent` workers, while shared/`modify` rows (files many others import) stay in the main session. List files at that granularity so the split is visible (`plan-instructions.md § Phase Execution`).

---

## Post-Execution Artifacts

After all phases complete, run the two-phase pipeline (see `flowcode/workflow/flowcode-workflow.md § Generate Artifacts Workflow` and `plan-instructions.md § Post-Execution Pipeline`):

**Sequential — audit and authoritative source:**
1. Code Explorer sub-agent (sonnet) audits implementation against plan (`code-explorer-agent.md`)
2. `.flowcode/plans/{PREFIX}/{PREFIX}-technical-overview.md` (use `technical-overview-template.md`) — generated from audit findings; feeds the downstream artifacts
3. `.flowcode/plans/{PREFIX}/{PREFIX}-qa-report.md` (use `qa-report-template.md`) — requires all gates to pass

**Parallel — finalization (sonnet sub-agents, after technical-overview + QA gates pass):**
- `.flowcode/plans/{PREFIX}/{PREFIX}-changelog.md` — finalize Summary and Reconciliation sections; per-phase sections were appended during the plan
- `.flowcode/plans/{PREFIX}/{PREFIX}-test-notes.md` (use `test-notes-template.md`)

Update `.flowcode/plans/plan-index.md` row: status → `complete`.

---

## Dependencies

| Dependency | Type | Notes |
|------------|------|-------|
| `{PREFIX}-design.md` | upstream artifact | Must be approved before execution |
| | external | |

---

## Revision History

| Date | Change | Reason |
|------|--------|--------|
| {DATE} | Plan created | Initial draft |

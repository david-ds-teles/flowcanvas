---
name: plan-instructions
description: The non-overridable rules governing every plan — lifecycle, phase status, gates, halt conditions, artifacts, and the post-execution pipeline.
status: active
tags: [plans, lifecycle, phases, gates, execution]
links: [.flowcode/plans/plan-index.md, .flowcode/workflow/flowcode-workflow.md, .flowcode/quality-checks/quality-gates.md, .flowcode/ui/ui-workflow.md, .flowcode/templates/plan-template.md]
---

# Plan Instructions

- The non-overridable rule set for every plan; individual plan files cannot override these.
- Plan lifecycle `draft → active → complete` (with `paused`); update `plan-index.md` on every transition.
- Phase status `pending → in-progress → quality-check → done` is an orthogonal axis — never skip a state.
- Each phase declares `Depends On`; the executor runs dependency-free, file-disjoint phases as parallel **waves** and may fan out disjoint files within a phase — advisory, with a sequential fallback that is never a breach.
- The active (full-depth) phase must meet the **Active-Phase Completeness Bar** — a junior engineer finishes it without asking, via production-ready snippets, worked examples, a flow diagram where non-trivial, explicit steps, and named quality checks.
- Phase-Close Minimum gates (build, tests, lint, boot, e2e) must be green before a phase flips to `done`.
- Halt conditions stop autopilot and surface to the user — critical findings, out-of-scope probe failures, scope breaches.
- Plan artifacts follow `{PREFIX}-{type}.md` inside a `{PREFIX}/` folder; `{PREFIX}-log.md` is mandatory.
- Every phase declares Touched Modules; the post-execution pipeline produces technical-overview, changelog, test-notes, and qa-report.
- Frontend-touching plans pass the UI Design Gate via `../ui/ui-workflow.md`.

---

## Plan Lifecycle

A plan moves through exactly these statuses — never skip, never reverse.

`draft` → `active` → `complete`

| Status | When to set |
|--------|-------------|
| `draft` | Design or plan file not yet complete |
| `active` | First phase begins execution |
| `paused` | Work stopped; can be resumed |
| `complete` | All phases done, all artifacts generated, merged |

Update `.flowcode/plans/plan-index.md` on every status transition.

---

## Phase Status

Orthogonal to plan status. Every `## Phase N` block carries a `**Phase Status:**` line that moves through exactly these states:

`pending` → `in-progress` → `quality-check` → `done`

| Status | Meaning |
|--------|---------|
| `pending` | Phase not started. Default on plan creation |
| `in-progress` | Implementation steps actively being executed |
| `quality-check` | Implementation complete; Phase Close Sequence running (code review, cleanup, changelog, log) |
| `done` | Phase Close Sequence finished, all minimum gates green, `[PHASE]` entry written |

Rules:
- Cannot skip a status.
- Cannot mark `done` while code-review findings of severity ≥ medium are unresolved.
- Cannot mark `done` while any declared Phase-Close Minimum gate is red.
- A phase sitting in `quality-check` for longer than one close cycle without progress is a framework breach — either resolve findings or formally pause.

Plan status and Phase Status are independent axes — a plan is `active` whenever any phase is not `done`.

---

## Active-Phase Completeness Bar

The phase written at **full depth** — the active, next-to-execute phase — must be executable by an engineer who did not write the design: a competent junior who can finish it without coming back to ask questions. Full depth means substance grounded in the approved design, never ceremonial padding; later phases stay stubs until they become active (see `§ Phase Status`).

Beyond its status / evaluation / Touched Modules, the active phase MUST carry:

1. **Concrete file targets.** Every file to create or modify — exact path, and what changes inside it.
2. **Unambiguous steps.** Checkbox steps that name the functions, types, fields, endpoints, config keys, SQL, and call sites already decided in the design. No "wire it up" hand-waves.
3. **Production-ready snippets.** For every non-trivial step, the actual code or diff to write — correct signatures, imports, types, error handling; copy-adaptable, not pseudocode. Snippets must trace to the design and module files — never invent an API they do not define; flag the gap instead.
4. **Worked examples.** A concrete input → output that pins expected behavior: a sample request/response, a fixture row, an example config, or a CLI invocation and its result.
5. **A diagram where flow is non-obvious.** A `mermaid` (or ASCII) diagram of the control/data flow, sequence, state, or architecture the phase adds or changes. Skip only when the phase is trivially linear, with a one-line reason.
6. **Named quality checks.** The concrete gates this phase closes against — `build` / `test` / `lint` / `e2e` from `quality-checks/quality-gates.md`, scoped to the phase — plus its acceptance criteria as verifiable checkboxes.

A required element that cannot be produced because the design never decided it is a **design gap**: surface it and route back to `flowcode:design` — do not guess. This bar raises substance, not length: it never licenses padding later phases or restating the design's rationale inside the plan.

---

## Phase-Close Minimum

Abstract gates every phase must pass before it can flip to `done`. Concrete commands for each gate live in `.flowcode/quality-checks/quality-gates.md § Gate Registry` — this list is the contract, not a stack-specific recipe.

1. **Build / compile clean.** Whatever the project's `build` gate is (tsc, go build, mvn compile, etc.).
2. **Tests pass 100%.** All declared unit + integration gates green. No skipped tests without an explicit annotation.
3. **Lint zero error, zero warning.** Applied to changed files at minimum; project-wide if the project enforces that.
4. **App boots clean on a fresh env.** Where applicable (service, app, script). For pure-library phases, skip with an annotation.
5. **Contract / e2e pass.** Only if the project declares `e2e` or contract gates for this phase's scope.

A phase cannot flip from `quality-check` to `done` while any declared-applicable gate is red. Skipped gates require an annotation in the `[PHASE]` entry's `Gates` field with the reason (e.g. `e2e: skipped — phase ships no user-facing flow`).

---

## Halt Conditions

If any of these fire during phase execution, stop implementing and surface to the user. Do not continue on autopilot.

- **Critical finding requires design changes.** Code review turns up a bug or architectural flaw whose fix mutates the design, not just the implementation.
- **Probe fails outside phase's declared scope.** A quality gate fails on code the current phase didn't touch — indicates either a regression the phase caused indirectly (investigate) or pre-existing drift (user decision).
- **Module contract change affects modules not listed in phase's Touched Modules.** Public API, schema, or event shape changed for a module outside the phase's declared scope.
- **User-declared scope about to be exceeded.** The phase would need to modify files the user said were out of bounds.
- **Tier 1 read-set drift.** The Tier 1 list in `flowcode-workflow.md` would need to grow to let this phase finish cleanly — stop and confirm.

Surfacing format: a short user-facing message — what triggered the halt, what options exist (narrow scope, redesign, escalate to a new plan), no autonomous recovery.

---

## Plan Files

Every plan folder at `.flowcode/plans/{PREFIX}/` MUST contain, at minimum:

| File | Created when | Purpose |
|------|--------------|---------|
| `{PREFIX}-design.md` | Design stage | Approved design for the feature |
| `{PREFIX}-plan.md` | Plan stage | Implementation spec — phases, steps, acceptance criteria, Touched Modules |
| `{PREFIX}-log.md` | Plan folder creation (same turn as `{PREFIX}-plan.md`) | Per-plan execution record. `[PLAN CREATED]` entry written immediately; `[PHASE]` entries appended at every phase end; `[PLAN COMPLETE]` entry appended at plan end. Use `.flowcode/templates/plan-log-template.md` |

Post-execution pipeline later adds: `technical-overview`, `changelog`, `test-notes`, `qa-report`.

A plan folder that lacks `{PREFIX}-log.md` is a framework breach.

---

## Artifact Naming

All plan artifacts follow the pattern **`{PREFIX}-{type}.md`** and live inside a directory named exactly `{PREFIX}`.

### PREFIX

Free-form identifier — no format is enforced. Pick whatever matches the team's workflow:

- `001-user-auth` — numeric with slug
- `CMP-234` — ticket-style
- `auth` — short slug
- `#1` — number with hash

### Plan Directory Layout

```text
.flowcode/plans/
  CMP-234/
    CMP-234-design.md
    CMP-234-plan.md
    CMP-234-ui-design.md          # only when the plan touches frontend
    CMP-234-log.md
    CMP-234-technical-overview.md
    CMP-234-changelog.md
    CMP-234-test-notes.md
    CMP-234-qa-report.md
    mockups/                       # only for UI-touching plans; flat directory
      login-empty-state.html
      login-error-state.html
```

### Allowed Types

| Type | When generated |
|------|---------------|
| `design` | Design stage |
| `plan` | Plan stage |
| `ui-design` | Before implementation, when the plan touches frontend |
| `log` | Plan folder creation; updated at every phase end and at plan end |
| `technical-overview` | Post-execution (parallel) |
| `changelog` | Built incrementally per phase; reconciled post-execution |
| `test-notes` | Post-execution (parallel) |
| `qa-report` | Post-execution (after all gates pass) |

### Phase Headings

Inside `{PREFIX}-plan.md`, every phase block uses `## Phase N`. Never `P{N}`, `Phase N:`, or any other variation.

### Enforcement

The `artifact-naming-check` hook validates naming on every write inside `.flowcode/plans/`. A violation is a framework breach — fix immediately. Research artifact naming is enforced by the same hook and documented in the `flowcode:researcher-agent` sub-agent.

---

## Touched Modules

Every phase in `{PREFIX}-plan.md` MUST declare a **Touched Modules** list — the set of modules whose code, API, or data shape the phase will change. Each entry cross-references the module's detail file:

```markdown
**Touched Modules:**
- `auth` → `.flowcode/project/modules/auth.md`
- `billing` → `.flowcode/project/modules/billing.md`
```

Rules:
- A module named in Touched Modules but missing its `.flowcode/project/modules/{name}.md` file is a framework breach — create it from `module-template.md` or run `/flowcode:bootstrap`.
- Mid-phase, if work expands to a module not on the list: either narrow the change to keep scope, or halt the phase per `§ Halt Conditions` and revise the plan.
- Phase close: when a module's public API, DB schema, or Key Insights changed, update the module file in the same edit as the code change (see `flowcode-rules.md § 7b`).

---

## UI Design Gate (Frontend-Touching Plans)

If a plan's scope touches frontend files (Angular, React, Vue, Svelte, native mobile UI, design tokens, style sheets), the UI subsystem is loaded and followed.

**Before design begins:**
- Load `.flowcode/ui/ui-index.md` (it pulls in `ui-design-system.md`, `ui-workflow.md`, and `ui-mockup-discipline.md` as needed).
- Ensure `.flowcode/ui/ui-design-system.md` exists as the mandatory ground truth. If it is missing or still the verbatim shipped starter on a real project, harvest/generate it first (`flowcode:bootstrap-agent § Step 6.5`) before any mockup.
- Dispatch the `flowcode:ui-mockups` composer skill three times in parallel to produce iteration mockups (`01-{slug}.html`, `02-{slug}.html`, `03-{slug}.html`) under `.flowcode/plans/{PREFIX}/mockups/`, each grounded in the design system and self-checked against its §13 checklist. (The same capability is available standalone via `/flowcode:mockup`.)
- User selects one iteration; the designer writes `{PREFIX}-ui-design.md` using `ui-design-template.md`, recording the selected iteration.
- `{PREFIX}-ui-design.md` Status must be `approved` before the first implementation phase begins.

**Phase close for UI-touching phases:**
- Run the visual-parity check per `ui/ui-workflow.md § Phase Close`: capture at every declared breakpoint, classify drift (Expected / Acceptable / Regression), log findings in `{PREFIX}-qa-report.md` using the finding-as-section format. No `[medium]`+ visual-parity regression may remain unresolved before `Phase Status` flips to `done`.

**Mockup layout:** flat under `.flowcode/plans/{PREFIX}/mockups/` — no `iterations/` / `final/` split. `captures/phase-{N}/` is the only permitted sub-directory.

Backend-only plans skip this gate entirely. Full workflow: `.flowcode/ui/ui-index.md`.

---

## Phase Dependencies & Waves

Phases carry a `**Depends On:**` field — the earlier phases that must be `done` before they can start (`[none]` = a root phase; e.g. `[Phase 1]`, `[Phase 1, Phase 3]`). The set of all `Depends On` links MUST be acyclic (a dependency cycle is a framework breach — fix the decomposition). This single field is the contract the executor schedules from; the existing `Files to create / modify:` tables supply the write-safety check.

**Backward compatibility:** a phase that declares no `Depends On` field (a legacy plan predating it) is treated as depending on **all earlier phases** — i.e. fully sequential. Existing plans therefore execute exactly as before until their phases are annotated; parallelism is opt-in via the field, never inferred against a plan that omits it.

**Wave derivation.** The executor repeatedly:

1. Computes the **frontier** — every phase not `done` whose `Depends On` phases are all `done`.
2. Selects a **wave** — a frontier subset whose `Files to create / modify:` tables are **pairwise path-disjoint**. Two frontier phases that are dependency-independent but share any file path are **serialized** (kept in different waves) to avoid write races — the disjoint-Files check is the conflict guard, independent of `Depends On`.
3. Runs the wave (below), then recomputes from step 1 until every phase is `done`.

A single-phase wave is the common case and behaves exactly as a lone phase always has. When a wave holds multiple phases, they run concurrently:

- All wave phases flip `pending → in-progress` together; their implementation runs concurrently (and each phase may itself fan out internally — see `§ Phase Execution`).
- The Phase Close Sequence runs **once for the wave**: code review covers the union of changed files; the Phase-Close Minimum gates run **once** on the integrated tree (integration correctness is the goal). The QA report `## Check` heading may name the wave's phases (e.g. `— Phase 1+2`); `qa-probe-gate.js` is unaffected (it reads the latest `## Check`).
- **Per-phase bookkeeping is preserved:** each phase in the wave still gets its own `## Phase N` changelog section, its own `[PHASE]` log entry, its own `Phase Status → done` flip, and its own `plan-index.md` Progress increment. Revertibility holds because wave phases are file-disjoint by construction.

**Advisory, not mandatory.** Phase-execution parallelism (waves and within-phase fan-out) is a judgment call, deliberately unlike the *mandatory* rules in `flowcode-workflow.md § Parallelism Rules`. The executor MAY run the whole plan strictly sequentially — one phase per wave, all work in the main session — whenever files are not cleanly disjoint, the context budget is tight, or confidence is low. **Running phases sequentially is never a framework breach.** Parallelize to save wall-clock when it is clearly safe; fall back to sequential otherwise.

---

## Phase Execution

Each phase follows this sequence — automatic, no user interaction. Do not stop, do not ask the user. When the active wave holds more than one phase, apply this sequence at wave granularity per `§ Phase Dependencies & Waves` (implement all wave phases, then one combined close, with per-phase bookkeeping).

**Precondition:** `{PREFIX}-log.md` exists in the plan folder with a `[PLAN CREATED]` entry. If it is missing, create it from `plan-log-template.md` and write the `[PLAN CREATED]` entry before continuing.

### Implementation

1. Execute all implementation steps for the phase. Each step is a GitHub-flavored checkbox (`- [ ]`) in the plan file; check it (`- [x]`) the moment the underlying work finishes — never batch. A step that cannot be executed this phase carries an inline annotation: `(deferred: reason)` or `(N/A: reason)`. A phase cannot close with unchecked boxes lacking an annotation — framework breach.
2. If implementation diverges from the plan spec (file path changed, step reordered, approach adjusted), update `{PREFIX}-plan.md` **in the same edit** so the plan file never contradicts the code. One-off deviations are also recorded in the phase log entry's `Deviations` field; lasting changes rewrite the plan spec itself.

**Within-phase fan-out (advisory).** When a phase's `Files to create / modify:` table holds several mutually-independent `create` rows (no row imports another), the executor MAY implement them concurrently by dispatching one `flowcode:implementer-agent` per disjoint slice, partitioning the files so no two workers share a path. **Shared / wiring files** (existing files imported by many — store, shell, barrels, route tables; typically `modify` rows) stay in the main session and are written **after** the workers return, in an **integration pass** that wires the slices together using each worker's reported exported symbols. The close-sequence code review is the safety net for cross-slice coherence. Fall back to writing everything in the main session whenever the slices are not cleanly disjoint or context is tight — this is never a breach (`§ Phase Dependencies & Waves`).

### Phase Close Sequence

After implementation steps complete, execute these six steps in order. Never skip, never reorder.

1. **Code Review (prepend to QA report)** — Dispatch `code-reviewer-agent` (sonnet) — or an inline code-review sub-agent when the agent roster is unavailable — over all changed files in the phase scope. The reviewer **prepends** a new `## Check YYYY-MM-DD HH:MM — Phase N` section to `{PREFIX}-qa-report.md` directly below the file header (newest on top), following `qa-report-template.md`. Stack Gate as a ≤ 3-col table, findings in finding-as-section format, severity `critical`/`high`/`medium`/`low`/`info`.
   - `[critical]` / `[high]` findings → dispatch fix sub-agent (sonnet) → re-review (prepend a new `## Check` section) → repeat until clean.
   - `[medium]` findings → must reach `**Resolution:**` (fixed, or `deferred — BL-NNN`) before `Phase Status` flips to `done`. `qa-probe-gate.js` enforces this for commits/PRs.
   - `[low]` / `[info]` → fold into the phase log entry's `Deviations` field, continue.
2. **Cleanup Sweep** — No dead code, unused imports, debug output, or stray files. Lint and type checks must pass.
3. **Phase-Close Minimum gates** — Verify every applicable gate per `plan-instructions.md § Phase-Close Minimum` is green. Skipped gates require an annotation in the `[PHASE]` entry's `Gates` field.
4. **Visual Parity + App Smoke** (UI- / app-touching phases) — the executor dispatches `flowcode:browser`. UI-touching phases run `ui/ui-workflow.md § Phase Close` (`flowcode:browser capture` → drift classified Expected / Acceptable / Regression; a `≥ medium` regression blocks close). App-touching phases also run `flowcode:browser smoke` (load-bearing testids render, console clean) → e2e findings in `{PREFIX}-qa-report.md`. Both are **advisory in availability but honest in reporting**: `flowcode:browser` resolves a driver via its ladder and never skips silently — only if no driver resolves does it record a tracked `[deferred]` finding carrying the exact repro command. A `[deferred]` is a recorded finding, not a skipped gate. These are agent-orchestrated checks, distinct from any plain-shell `e2e` gate in the registry (`quality-checks/quality-gates.md`).
5. **Incremental Changelog** — Append a `## Phase N — {Phase Name}` section to `{PREFIX}-changelog.md` listing files changed in this phase. Create the file from `changelog-template.md` on first phase close.
6. **Log Entry + Status** — Append a `[PHASE]` entry to the **top** of `{PREFIX}-log.md` (below the file header) using the `[PHASE]` template from `plan-log-template.md`. Every field mandatory; empty fields are a framework breach. Update the plan's row in `plan-index.md` Progress column: increment the completed count. Flip the phase block's `**Phase Status:**` to `done` in `{PREFIX}-plan.md`.

**Read-only overlap (advisory).** Steps 1 (code review) and 3 (gates) are both read-only on source. Once the cleanup sweep (step 2) has landed any source changes, the executor MAY dispatch review and gates **concurrently** to save wall-clock — the numbered order stays the contract; only the read-only pair overlaps. If review then yields a `critical`/`high` fix, re-run the gates after the fix. When in doubt, run them sequentially — overlap is an optimization, never required. For a multi-phase wave, this close runs once over the union of the wave's changed files (`§ Phase Dependencies & Waves`), with the per-phase changelog/log/status/index bookkeeping (steps 5–6) written once per phase.

When the close completes, **recompute the frontier and begin the next wave** (`§ Phase Dependencies & Waves`); each newly-started phase flips `pending → in-progress`. In the common single-phase-wave case this is simply "begin the next phase immediately."

Phase-end entries are written to `{PREFIX}-log.md` only. Do NOT write `[PHASE]` entries to `.flowcode/project/project-log.md` — that file is project-level only (`[PLAN COMPLETE]`, `[BOOTSTRAP]`, `[BUGFIX]`, `[QUICKFIX]`).

---

## Post-Execution Pipeline

Runs after the **final phase** passes its quality gate. All steps are mandatory.

**Step 1 — Quality gates (sequential):**
Run tests, lint, typecheck, coverage. Fix all failures before proceeding.

**Step 2 — Technical overview (sequential):**
1. Main agent loads plan context (design, plan, log, incremental changelog) via the normal Tier 2 sweep — no dedicated loader agent needed.
2. `flowcode:code-explorer-agent` (sonnet) audits all changed code → code map + divergence report.
3. `flowcode:artifact-updater-agent` (sonnet) generates `{PREFIX}-technical-overview.md` from the audit; prepends `> **Audit skipped:** {reason}` if step 2 returned `skipped`.

**Step 3 — QA report (sequential, prepend-only):**
Dispatch `code-reviewer-agent` (when available) or a sonnet code-review sub-agent to prepend a new `## Check YYYY-MM-DD HH:MM — Plan completion` section to `{PREFIX}-qa-report.md`. The file is reverse-chronological and prepend-only: insert directly below the file header, above any prior `## Check` sections; never rewrite prior sections. Stack Gate uses a ≤ 3-column table; Review Findings use the finding-as-section format defined in `markdown-quality.md § Finding-as-Section Format`.

- All `[medium]`+ findings must reach `**Resolution:**` (fixed, or `deferred — BL-NNN`) before proceeding.
- `qa-probe-gate.js` blocks `git commit` / `gh pr create` / `gh pr merge` while unresolved `[medium]`+ findings remain in the latest check.

**Step 4 — Changelog reconciliation + test notes (parallel):**
Dispatch `flowcode:artifact-updater-agent` in `plan-close` mode, which runs the following in parallel internally:
- `{PREFIX}-changelog.md` — reconcile per-phase sections against the code; write the Summary and Reconciliation sections (per-phase sections were appended during the plan by each phase close)
- `{PREFIX}-test-notes.md` — generate using `test-notes-template.md`

When the agent roster is unavailable, the main agent runs the two steps inline.

**Step 5 — Finalize:**
- Append `[PLAN COMPLETE]` entry to the **top** of `{PREFIX}-log.md` using the `[PLAN COMPLETE]` template in `plan-log-template.md` — the plan's own closing record (richer: includes phase count, artifacts, follow-ups).
- Append `[PLAN COMPLETE]` entry to the **top** of `.flowcode/project/project-log.md` using the `[PLAN COMPLETE]` template in `project-log-template.md` — the brief cross-plan view. Both entries required; both must agree.
- Update `plan-index.md` row: status → `complete`, Progress → `{N}/{N}`.
- Flip the plan file's top-level `Status:` to `complete`.
- Commit all artifacts — clean, no AI attribution.

All artifacts saved to `.flowcode/plans/{PREFIX}/`.

---

## Log Updates

Two log files, each with a dedicated scope. Never cross-write.

| Event | Target file | Template | Notes |
|-------|------------|----------|-------|
| Plan folder created | `{PREFIX}-log.md` | `[PLAN CREATED]` in `plan-log-template.md` | First entry in the per-plan log |
| Phase gate passes | `{PREFIX}-log.md` | `[PHASE]` in `plan-log-template.md` | Never written to `project-log.md` |
| Plan completes | `{PREFIX}-log.md` **and** `.flowcode/project/project-log.md` | `[PLAN COMPLETE]` in each of the two templates | Both entries required |
| Bootstrap runs | `.flowcode/project/project-log.md` | `[BOOTSTRAP]` in `project-log-template.md` | — |
| Bugfix lands | `.flowcode/project/project-log.md` | `[BUGFIX]` in `project-log-template.md` | — |
| Quickfix lands | `.flowcode/project/project-log.md` | `[QUICKFIX]` in `project-log-template.md` | — |

New entries always go at the **top** of their file, directly below the file header.

**Dev attribution.** Every log entry — plan-log and project-log alike — opens with a `**Dev:**` line naming the developer who did the work. Copy it verbatim from the SessionStart banner's `Acting as Dev:` line (resolved from `FLOWCODE_DEV`, else `git config user.name <user.email>`, else `unknown`); never invent or guess it. This identity is stamped into flowcode log artifacts only — it is **never** written into git commit messages (`flowcode-rules.md § Git` keeps commits clean). Project-log writes that omit `Dev:` are blocked by `project-log-format-check.js`; plan-log `[PHASE]` entries are not hard-gated but carry the field by template. `/flowcode:contributors` reads these `Dev:` fields to answer who built what.

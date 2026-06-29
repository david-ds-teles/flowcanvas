---
name: plan-instructions
description: The non-overridable rules governing every plan — lifecycle, phase status, gates, halt conditions, artifacts, and the revise stage. The execution procedure lives in plan-execution.md.
status: active
tags: [plans, lifecycle, phases, gates, execution, revise]
links: [.flowcode/plans/plan-index.md, .flowcode/plans/plan-execution.md, .flowcode/workflow/flowcode-workflow.md, .flowcode/quality-checks/quality-gates.md, .flowcode/ui/ui-workflow.md, .flowcode/templates/plan-template.md]
---

# Plan Instructions

- The non-overridable rule set for every plan; individual plan files cannot override these.
- Plan lifecycle `draft → active → complete` (with `paused`), update `plan-index.md` on every transition; `complete` is set only on user sign-off after the **revise stage**, never auto-chained from execution.
- Phase status `pending → in-progress → quality-check → done` is an orthogonal axis — never skip a state.
- Each phase declares `Depends On`; the executor runs dependency-free, file-disjoint phases as parallel **waves** and may fan out disjoint files within a phase — advisory, with a sequential fallback that is never a breach.
- The active (full-depth) phase must meet the **Active-Phase Completeness Bar** — a junior engineer finishes it without asking, via production-ready snippets, worked examples, a flow diagram where non-trivial, explicit steps, and named quality checks.
- Phase-Close Minimum gates (build, tests, lint, boot, e2e) must be green before a phase flips to `done`.
- Halt conditions stop autopilot and surface to the user — critical findings, out-of-scope probe failures, scope breaches.
- Plan artifacts follow `{PREFIX}-{type}.md` inside a `{PREFIX}/` folder; `{PREFIX}-log.md` is mandatory.
- Every phase declares Touched Modules; the post-execution pipeline produces technical-overview, changelog, test-notes, and qa-report — the execution sequence + pipeline procedure live in `plan-execution.md` (on-demand).
- Frontend-touching plans pass the UI Design Gate via `../ui/ui-workflow.md`.

---

## Plan Lifecycle

A plan moves through exactly these statuses — never skip, never reverse.

`draft` → `active` → **[revise stage]** → `complete`

| Status | When to set |
|--------|-------------|
| `draft` | Design or plan file not yet complete |
| `active` | First phase begins execution; remains `active` through the revise stage |
| `paused` | Work stopped; can be resumed |
| `complete` | All phases done, all artifacts generated, merged — **only on explicit user sign-off** |

The **revise stage** is not a separate status value — it is the structural state "all phases `done` + `Status: active`". When `plan-index.md` shows `Progress N/N` and the plan is still `active`, the plan is in the revise stage. The executor announces this explicitly on entering it; the next session detects it from the plan file without inference. `complete` is never set autonomously — only on explicit user sign-off (through `flowcode:revise` or direct confirmation). See `§ Revise Stage` for the full procedure.

Update `.flowcode/plans/plan-index.md` on every status transition.

---

## Revise Stage

The named interval between "all phases implemented" and "plan complete" — a plan out of execution is *implemented*, not *done*. It is the safe loop to fix issues, gaps, and build-vs-spec drift before the post-execution pipeline runs and the plan closes.

**Entry signal.** When the final phase flips to `done`, the executor surfaces a completion summary (phases done, rolled-up `Deviations` as build-vs-spec divergences, artifacts pending) and **stops**. The plan stays `Status: active` with `Progress N/N` — that combination *is* the revise-stage signal; no new status value.

**Scope guard — not a backdoor re-plan.** Each pass is ≈ 1–5 files, no new phases, no architecture shifts. `flowcode:revise` classifies the ask first: **in-envelope** (small fix / adjust / spec-rewrite) → apply inline; **out-of-envelope** (new phase, cross-module contract change, undecided design question) → **halt and escalate** to `/flowcode:design` or `/flowcode:plan`. Revise never silently grows into a re-plan.

**Two contexts, one primitive** — `flowcode:revise` covers both: **post-execution polish** (plan `active`, all phases `done`; each pass keeps it `active`; user "done" triggers completion) and **post-completion amendment** (plan `complete`; apply + record, stays `complete` — closed plans are history, not a contract).

**Three jobs, one pass** — fix what's broken, adjust what's needed, amend the plan/design spec when the change is lasting (the same rule as `plan-execution.md § Phase Execution § Implementation` step 2, extended past phase close).

**Recording — `[REVISE]` into the plan's own artifacts** (never `project-log.md` — that is the quickfix/bugfix lane). Two writes per pass: a `[REVISE]` entry at the **top** of `{PREFIX}-log.md` (`plan-log-template.md § [REVISE]`, all fields mandatory), and a dated note under a `## Revisions` section in `{PREFIX}-changelog.md` (created on first revise).

**Completion — user-gated.** On sign-off ("done", "complete it", "ship it"), `flowcode:revise` (or `flowcode:execute` on a direct "just complete") runs `plan-execution.md § Post-Execution Pipeline` end to end, including finalize (§ Step 5). Artifacts generate against the polished state, not the raw implementation. The executor never runs the pipeline or flips `Status: complete` autonomously.

**Sub-agents reused — no new agent:** `flowcode:implementer-agent`, `flowcode:code-reviewer-agent`, `flowcode:artifact-updater-agent`. **Dual surface:** entered automatically by `flowcode:execute`; its loop is driven by `flowcode:revise` / `/flowcode:revise` (see `flowcode-workflow.md § Available Workflows`).

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

- All wave phases flip `pending → in-progress` together; their implementation runs concurrently (and each phase may itself fan out internally — see `plan-execution.md § Phase Execution`).
- The Phase Close Sequence runs **once for the wave**: code review covers the union of changed files; the Phase-Close Minimum gates run **once** on the integrated tree (integration correctness is the goal). The QA report `## Check` heading may name the wave's phases (e.g. `— Phase 1+2`); `qa-probe-gate.js` is unaffected (it reads the latest `## Check`).
- **Per-phase bookkeeping is preserved:** each phase in the wave still gets its own `## Phase N` changelog section, its own `[PHASE]` log entry, its own `Phase Status → done` flip, and its own `plan-index.md` Progress increment. Revertibility holds because wave phases are file-disjoint by construction.

**Advisory, not mandatory.** Phase-execution parallelism (waves and within-phase fan-out) is a judgment call, deliberately unlike the *mandatory* rules in `flowcode-workflow.md § Parallelism Rules`. The executor MAY run the whole plan strictly sequentially — one phase per wave, all work in the main session — whenever files are not cleanly disjoint, the context budget is tight, or confidence is low. **Running phases sequentially is never a framework breach.** Parallelize to save wall-clock when it is clearly safe; fall back to sequential otherwise.

---

## Execution Procedure

The per-phase execution procedure — implementation steps, the ordered **Phase Close Sequence**, and the **Post-Execution Pipeline** — lives in `plan-execution.md` (`on-demand`, loaded when `flowcode:execute` runs). It is the *sequence*; the rules it obeys (Phase Status, Phase-Close Minimum, Halt Conditions, Phase Dependencies & Waves, Revise Stage) are defined above in this file. Loading the procedure only when actually running, resuming, or closing a plan keeps it off the eager startup path — `plan-instructions.md` carries the contract; `plan-execution.md` carries the steps.

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

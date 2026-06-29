---
name: flowcode:execute
description: Execute or resume an active plan — drive its phases through the mandatory phase-close sequence, then enter the revise stage (announce + stop). Completion fires only on user sign-off via flowcode:revise. Use to start implementing an active plan or to continue a paused/interrupted one ("execute plan X", "continue the plan", "resume").
status: active
tags: [execute, continue-plan, phases, phase-close, revise-stage, orchestration]
links: [.flowcode/plans/plan-instructions.md, .flowcode/plans/plan-execution.md, .flowcode/ui/ui-workflow.md]
---

# Execute / Continue Plan

- The operator-facing playbook for turning an active `{PREFIX}-plan.md` into shipped code: it detects the resume point, schedules phases into parallel waves, runs each wave's implementation (in the main session, optionally fanning disjoint files out to `flowcode:implementer-agent` workers), and dispatches the review/QA/audit/artifact agents at every gate.
- **`plan-instructions.md` is the law, not this file.** Phase status axis, Phase Dependencies & Waves, Phase-Close Minimum gates, Halt Conditions, and the Revise Stage are defined in `plan-instructions.md`; the execution *sequence* (Phase Close Sequence) and the Post-Execution Pipeline live in `plan-execution.md`. This skill sequences them and points — it never restates the rules (drift between two copies is the failure mode flowcode exists to prevent).
- **Resume-safe:** the same invocation starts a fresh plan or continues a paused one — it reads `{PREFIX}-log.md` (last `[PHASE]`) + `{PREFIX}-plan.md` (phase statuses + unchecked boxes) to find exactly where to pick up.
- Per wave: compute the frontier (`Depends On` all `done`) and a file-disjoint subset, flip those phases `pending → in-progress`, execute checkbox steps (check each the moment it lands; keep the plan spec in sync with reality in the same edit), then `in-progress → quality-check`, then run the close once for the wave, then each phase `quality-check → done`. Parallelism is advisory — a single phase per wave, all in the main session, is always a valid fallback.
- The Phase Close Sequence (`plan-execution.md § Phase Close Sequence`) is mandatory and ordered: code review → cleanup → phase-close-minimum gates → visual parity + app smoke (browser checks) → incremental changelog → log entry + status + index — dispatching `flowcode:code-reviewer-agent`, `flowcode:qa-runner-agent`, `flowcode:browser-runner-agent`, and `flowcode:artifact-updater-agent` at the points it names.
- A phase cannot flip to `done` while a `≥ medium` review finding is unresolved or a declared gate is red; `qa-probe-gate.js` enforces this at commit/PR time.
- **Halt, don't improvise:** when a Halt Condition fires (critical finding needs a design change, out-of-scope probe failure, undeclared module-contract change, scope breach, Tier-1 drift), stop autopilot and surface options to the operator.
- **Execution ends at "implemented," not "done."** When the final phase closes, this skill enters the revise stage (`plan-instructions.md § Revise Stage`) — announces the completion summary and stops. The Post-Execution Pipeline and finalize run only on user sign-off, triggered by `flowcode:revise` or a direct "complete it" confirmation.

## When To Use

Use to implement an `active` plan or resume one that was paused/interrupted. Triggered by `/flowcode:execute <PREFIX>`, or directly: "execute plan X", "continue", "resume the plan", "keep going on X". The predecessor is `flowcode:plan`; the successor is `flowcode:revise` (polish to done) — this skill carries a plan to "implemented"; `flowcode:revise` carries it to `complete`.

Not for: writing the plan (`flowcode:plan`), one-off changes that don't belong to a plan (bugfix/quickfix workflows in `flowcode-workflow.md`), or producing a design (`flowcode:design`). Not for post-phase polish — that is the revise stage, driven by `flowcode:revise`.

## Procedure

### 1 — Load plan context and detect the resume point

Resolve `{PREFIX}` (argument or ask; confirm against `plan-index.md`). Load the plan's Tier-2 set: `{PREFIX}-plan.md`, `{PREFIX}-design.md`, `{PREFIX}-log.md`, `{PREFIX}-ui-design.md` (if frontend), and the `modules/{name}.md` for the active phase's Touched Modules.

Find where to resume:

- Last `[PHASE]` entry in `{PREFIX}-log.md` + each `## Phase N` block's `**Phase Status:**` and `**Depends On:**` in the plan.
- Compute the **active wave** per `plan-instructions.md § Phase Dependencies & Waves`: the frontier is every phase not `done` whose `Depends On` are all `done`; the wave is a frontier subset whose `Files to create / modify:` tables are pairwise path-disjoint. Phases already `in-progress`/`quality-check` belong to the in-flight wave — resume there: an `in-progress` phase at its first unchecked (`- [ ]`) step, a `quality-check` phase mid-close at the first incomplete close step.
- Parallelism is advisory: when dependencies, file-disjointness, or context make a multi-phase wave unclear, take one phase per wave — this matches today's behavior exactly and is never a breach.
- **Precondition:** the plan folder must hold `{PREFIX}-log.md` with a `[PLAN CREATED]` entry — if missing, create it from `plan-log-template.md` first (`plan-execution.md § Phase Execution` precondition).

### 2 — Run the active wave

Follow `plan-execution.md § Phase Execution § Implementation`:

- Flip every phase in the wave `pending → in-progress` on start.
- Execute their implementation steps; check each box (`- [x]`) the moment the work finishes — never batch. A step that can't run this phase carries an inline `(deferred: reason)` / `(N/A: reason)` annotation.
- **Within-phase fan-out (advisory):** when a phase's `Files to create / modify:` table holds several mutually-independent `create` rows, dispatch one `flowcode:implementer-agent` (sonnet) per disjoint slice — partition the files so no two workers share a path, and pass each worker its owned-file list, the design slice + acceptance criteria, and the relevant module contracts. Keep shared / `modify` files (imported by many — store, shell, barrels) in the main session. When the workers return, run the **integration pass** in the main session: write the shared/wiring files using each worker's reported exported symbols, and reconcile cross-slice consistency. Fall back to writing everything inline when slices aren't cleanly disjoint or context is tight.
- If implementation diverges from the spec (path, order, approach), update `{PREFIX}-plan.md` in the **same edit** so the plan never contradicts the code; one-off deviations also go in each phase log's `Deviations` field.

When all steps across the wave are checked, flip each phase `in-progress → quality-check`.

### 3 — Phase Close Sequence (ordered, never skip)

Execute `plan-execution.md § Phase Execution § Phase Close Sequence` in order. For a **multi-phase wave**, run this close **once** over the union of the wave's changed files — review and gates cover the whole wave — while writing the bookkeeping (steps 5–6: changelog section, `[PHASE]` log entry, status flip, index increment) **per phase**. Steps 1 (review) and 3 (gates) are read-only on source: after the cleanup sweep, you MAY dispatch them concurrently to save wall-clock (re-run gates if a `critical`/`high` review fix lands); run them sequentially when unsure.

1. **Code review** — dispatch `flowcode:code-reviewer-agent` (sonnet) over the phase's changed files; it prepends a `## Check` section to `{PREFIX}-qa-report.md`. Resolve findings by severity: `critical`/`high` → fix → re-review until clean; `medium` → reach `**Resolution:**` before close; `low`/`info` → fold into the log's Deviations.
2. **Cleanup sweep** — no dead code, unused imports, debug output, stray files; lint + typecheck pass.
3. **Phase-Close Minimum gates** — verify every applicable gate (`plan-instructions.md § Phase-Close Minimum`) is green; dispatch `flowcode:qa-runner-agent` (sonnet) to run the declared gates and fill the Stack Gate table. Annotate any skipped gate in the `[PHASE]` entry.
4. **Visual parity + app smoke** (UI- / app-touching phases) — dispatch `flowcode:browser` via its worker. UI-touching phases run `ui/ui-workflow.md § Phase Close` (`flowcode:browser capture`: capture at every declared breakpoint, classify drift Expected / Acceptable / Regression). App-touching phases also run `flowcode:browser smoke` (load-bearing testids render, console clean) → e2e findings in `{PREFIX}-qa-report.md`. No `≥ medium` regression or smoke failure may remain unresolved; a missing driver yields a tracked `[deferred]` finding (with a repro command), never a silent skip.
5. **Incremental changelog** — append a `## Phase N` section to `{PREFIX}-changelog.md` (create from `changelog-template.md` on first close); `flowcode:artifact-updater-agent` handles this and step 6.
6. **Log entry + status** — append a `[PHASE]` entry to the **top** of `{PREFIX}-log.md` (all fields mandatory), increment Progress in `plan-index.md`, and flip the phase `quality-check → done`.

Then **recompute the frontier and run the next wave** (step 1's wave logic): repeat steps 2–3 until every phase is `done`. In the common single-phase-wave case this is simply "begin the next phase immediately."

### 4 — Honor Halt Conditions throughout

At any point, if a `plan-instructions.md § Halt Conditions` trigger fires, **stop implementing** and surface a short message: what triggered the halt and the options (narrow scope, redesign, escalate to a new plan). No autonomous recovery — these are operator decisions.

### 5 — Enter the revise stage (after the final phase closes)

Do **not** auto-run the Post-Execution Pipeline. When the final phase flips to `done`, enter the revise stage per `plan-instructions.md § Revise Stage`:

1. Roll up the `Deviations` fields from all `[PHASE]` entries in `{PREFIX}-log.md` as build-vs-spec divergences.
2. Surface a completion summary to the operator:
   - Phases done (count + names, all terminal statuses)
   - Build-vs-spec divergences (rolled-up Deviations — list each concisely)
   - Artifacts pending (technical-overview, qa-report, changelog reconciliation, test-notes — not yet generated)
   - Point the operator at `/flowcode:revise {PREFIX}` for polish passes, or "say it's done to complete."
3. **Stop.** The plan stays `Status: active`; `plan-index.md` shows `Progress N/N`. Do not flip `complete`, do not commit the close, do not write `[PLAN COMPLETE]`.

### 6 — Completion (on sign-off)

This step runs when the user explicitly signs off — either via `flowcode:revise` (after the revise loop) or directly here (operator says "just complete it", "ship it", "no revisions needed"). Both surfaces invoke the same shared step.

Run `plan-execution.md § Post-Execution Pipeline` end to end:

1. Quality gates (tests, lint, typecheck, coverage) — fix all failures.
2. `flowcode:code-explorer-agent` (sonnet) audits changed code → divergence report; `flowcode:artifact-updater-agent` generates `{PREFIX}-technical-overview.md` from it (prepend `> **Audit skipped:** {reason}` if the audit returns `skipped`).
3. `flowcode:code-reviewer-agent` prepends the final `## Check — Plan completion` section to `{PREFIX}-qa-report.md`; resolve all `≥ medium` findings.
4. `flowcode:artifact-updater-agent` in `plan-close` mode reconciles `{PREFIX}-changelog.md` and generates `{PREFIX}-test-notes.md` (in parallel internally).
5. Finalize: `[PLAN COMPLETE]` to the top of both `{PREFIX}-log.md` and `project-log.md` (both required, must agree), `plan-index.md` row → `complete` / `N/N`, plan `Status: complete`, then commit (clean, no AI attribution — `git-workflow.md`).

## References

| File | Use |
|------|-----|
| `.flowcode/plans/plan-instructions.md` | The authoritative rules — phase status, phase dependencies & waves, phase-close minimum, halt conditions, revise stage |
| `.flowcode/plans/plan-execution.md` | The execution procedure — phase execution, phase close sequence, post-execution pipeline |
| `flowcode:implementer-agent` | Within-phase fan-out — implements one exclusively-owned, file-disjoint slice; returns exports/deviations for main-session integration |
| `flowcode:code-reviewer-agent` | Phase-close + plan-completion code review → `{PREFIX}-qa-report.md` |
| `flowcode:qa-runner-agent` | Runs declared quality gates → Stack Gate table + `logs/qa-runs/` |
| `flowcode:browser-runner-agent` | Phase-close browser checks via `flowcode:browser` — viewport capture (visual parity) + smoke (testids/console) → findings in `{PREFIX}-qa-report.md` |
| `flowcode:code-explorer-agent` | Post-exec audit — code vs spec divergence report |
| `flowcode:artifact-updater-agent` | Changelog/log/module refresh (phase close) and technical-overview/test-notes/sync (plan close) |
| `.flowcode/ui/ui-workflow.md` | Visual-parity check for UI-touching phase closes |
| `/flowcode:plan` | The predecessor — produces the plan this skill executes |
| `/flowcode:revise` | The successor — drives the revise loop and triggers completion on sign-off |

## Non-Goals

- Do not restate or override `plan-instructions.md` — sequence it and point to it; it wins on every rule.
- Do not skip or reorder the Phase Close Sequence, and do not flip a phase `done` with unresolved `≥ medium` findings or red gates.
- Do not continue past a Halt Condition — surface it and wait.
- Do not write `[PHASE]` entries to `project-log.md` — they belong in `{PREFIX}-log.md` only.
- Do not start when no plan is `active` — run `flowcode:plan` first.
- Do not auto-run the Post-Execution Pipeline when the final phase closes — enter the revise stage (step 5) and stop; completion is user-gated.
- Do not flip `Status: complete` or write `[PLAN COMPLETE]` autonomously — only on explicit user sign-off (step 6).

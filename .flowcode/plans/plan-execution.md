---
name: plan-execution
description: The procedure an executor follows to run a plan — per-phase implementation, the ordered Phase Close Sequence, and the Post-Execution Pipeline. Loaded on-demand when flowcode:execute runs.
status: active
tags: [plans, execution, phase-close, post-execution, pipeline]
links: [.flowcode/plans/plan-instructions.md, .flowcode/quality-checks/quality-gates.md, .flowcode/ui/ui-workflow.md]
---

# Plan Execution

- The executable procedure behind `flowcode:execute` — load when running, resuming, or closing a plan; the *rules* it obeys live in `plan-instructions.md` (the law), this file is the *sequence*.
- Each phase: run its checkbox steps (check each the moment it lands; keep the plan spec in sync), then the ordered six-step **Phase Close Sequence**, then flip the phase `done`.
- Within-phase fan-out and read-only close-step overlap are **advisory** — a single phase per wave, all in the main session, is always a valid fallback (never a breach).
- The **Phase Close Sequence** is mandatory and ordered: code review → cleanup → phase-close-minimum gates → visual parity + app smoke → incremental changelog → log entry + status. Never skip, never reorder.
- A phase cannot close while a `≥ medium` review finding is unresolved or a declared gate is red.
- The **Post-Execution Pipeline** runs only on user sign-off after the revise stage (`plan-instructions.md § Revise Stage`) — never auto-run when the final phase closes — so artifacts reflect the polished state.
- Gate contracts, halt conditions, lifecycle, and waves are defined in `plan-instructions.md` — this file references them, never restates them.

---

## Phase Execution

Each phase follows this sequence — automatic, no user interaction. Do not stop, do not ask the user. When the active wave holds more than one phase, apply this sequence at wave granularity per `plan-instructions.md § Phase Dependencies & Waves` (implement all wave phases, then one combined close, with per-phase bookkeeping).

**Precondition:** `{PREFIX}-log.md` exists in the plan folder with a `[PLAN CREATED]` entry. If it is missing, create it from `plan-log-template.md` and write the `[PLAN CREATED]` entry before continuing.

### Implementation

1. Execute all implementation steps for the phase. Each step is a GitHub-flavored checkbox (`- [ ]`) in the plan file; check it (`- [x]`) the moment the underlying work finishes — never batch. A step that cannot be executed this phase carries an inline annotation: `(deferred: reason)` or `(N/A: reason)`. A phase cannot close with unchecked boxes lacking an annotation — framework breach.
2. If implementation diverges from the plan spec (file path changed, step reordered, approach adjusted), update `{PREFIX}-plan.md` **in the same edit** so the plan file never contradicts the code. One-off deviations are also recorded in the phase log entry's `Deviations` field; lasting changes rewrite the plan spec itself.

**Within-phase fan-out (advisory).** When a phase's `Files to create / modify:` table holds several mutually-independent `create` rows (no row imports another), the executor MAY implement them concurrently by dispatching one `flowcode:implementer-agent` per disjoint slice, partitioning the files so no two workers share a path. **Shared / wiring files** (existing files imported by many — store, shell, barrels, route tables; typically `modify` rows) stay in the main session and are written **after** the workers return, in an **integration pass** that wires the slices together using each worker's reported exported symbols. The close-sequence code review is the safety net for cross-slice coherence. Fall back to writing everything in the main session whenever the slices are not cleanly disjoint or context is tight — this is never a breach (`plan-instructions.md § Phase Dependencies & Waves`).

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

**Read-only overlap (advisory).** Steps 1 (code review) and 3 (gates) are both read-only on source. Once the cleanup sweep (step 2) has landed any source changes, the executor MAY dispatch review and gates **concurrently** to save wall-clock — the numbered order stays the contract; only the read-only pair overlaps. If review then yields a `critical`/`high` fix, re-run the gates after the fix. When in doubt, run them sequentially — overlap is an optimization, never required. For a multi-phase wave, this close runs once over the union of the wave's changed files (`plan-instructions.md § Phase Dependencies & Waves`), with the per-phase changelog/log/status/index bookkeeping (steps 5–6) written once per phase.

When the close completes, **recompute the frontier and begin the next wave** (`plan-instructions.md § Phase Dependencies & Waves`); each newly-started phase flips `pending → in-progress`. In the common single-phase-wave case this is simply "begin the next phase immediately."

Phase-end entries are written to `{PREFIX}-log.md` only. Do NOT write `[PHASE]` entries to `.flowcode/project/project-log.md` — that file is project-level only (`[PLAN COMPLETE]`, `[BOOTSTRAP]`, `[BUGFIX]`, `[QUICKFIX]`).

---

## Post-Execution Pipeline

Runs on **user sign-off** (after the revise stage). All steps are mandatory. The executor does not auto-run this pipeline when the final phase closes — it enters the revise stage first (`plan-instructions.md § Revise Stage`) and runs the pipeline only on explicit user approval. Artifacts therefore reflect the polished state, not the raw implementation.

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

**Step 6 — Evaluate (advisory, non-blocking):**
After `[PLAN COMPLETE]` is written, dispatch `flowcode:evaluator-agent` (sonnet, session-isolated, read-only) for the just-completed plan to score its artifact quality (Layer 3 of the evaluation system — see `eval/eval-index.md`). It writes `logs/eval/{PREFIX}.json` + appends `trend.jsonl`. This step is **non-blocking**: any failure (agent error, missing artifacts) is swallowed and does not affect completion — the plan is already complete. Run the full surface anytime via `/flowcode:evaluate`.

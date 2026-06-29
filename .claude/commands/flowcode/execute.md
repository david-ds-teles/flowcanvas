---
name: flowcode:execute
description: Standalone slash command to execute or resume an active plan — drive its phases to completion through the mandatory phase-close sequence and the post-execution pipeline. Runs the `flowcode:execute` skill, which detects the resume point and orchestrates the review/QA/audit/artifact agents at each gate.
status: active
tags: [command, execute, continue-plan, phases, standalone]
argument-hint: "<PREFIX>"
links: [.flowcode/plans/plan-instructions.md]
---

# /flowcode:execute

- Thin entry point: loads and runs the shared `flowcode:execute` skill — the procedure lives in the skill, not here.
- **Resume-safe:** the same command starts a fresh `active` plan or continues a paused/interrupted one — it reads `{PREFIX}-log.md` + the plan's phase statuses to find exactly where to pick up.
- Runs each phase through `plan-instructions.md`'s ordered Phase Close Sequence (code review → cleanup → gates → visual parity → changelog → log + status), dispatching `flowcode:code-reviewer-agent`, `flowcode:qa-runner-agent`, and `flowcode:artifact-updater-agent` at the points it names.
- Stops on any Halt Condition and surfaces options — no autonomous recovery.
- On the final phase, runs the Post-Execution Pipeline (audit → technical-overview → final QA → changelog/test-notes → `[PLAN COMPLETE]` → plan `complete`).

## Usage

```text
/flowcode:execute <PREFIX>
/flowcode:execute                                # no argument — resume the active plan from plan-index.md
```

Examples:

- `/flowcode:execute 004-optimistic-locking`
- `/flowcode:execute CMP-234`
- `/flowcode:execute` — resumes the in-progress plan from where it stopped

## What This Does

1. Loads the `flowcode:execute` skill and runs its procedure.
2. Loads plan context and detects the resume point (first phase not `done`; resume mid-phase or mid-close as needed).
3. Runs the active phase's implementation steps, keeping the plan spec in sync with the code.
4. Executes the ordered Phase Close Sequence per phase, dispatching the review/QA/artifact agents.
5. Honors Halt Conditions; on the final phase, runs the full Post-Execution Pipeline to `complete`.

## Prompt

You are executing or resuming a plan.

Run the `flowcode:execute` skill and execute its procedure. Treat `$ARGUMENTS` as the `{PREFIX}`; if empty, resolve the active plan from `.flowcode/plans/plan-index.md`. Detect the resume point from `{PREFIX}-log.md` + the plan's phase statuses, then drive phases per `plan-instructions.md` — never skip or reorder the Phase Close Sequence, never flip a phase `done` with unresolved `≥ medium` findings or red gates, and halt-and-surface on any Halt Condition. Run the Post-Execution Pipeline after the final phase closes.

## Non-Goals

- Do not implement the procedure inline — the skill is the single source of truth; this command only invokes it.
- Do not restate or override `plan-instructions.md` — it wins on every rule.
- Do not continue past a Halt Condition — surface it and wait.
- Do not start when no plan is `active` — run `/flowcode:plan` first.

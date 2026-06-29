---
name: flowcode:plan
description: Standalone slash command to turn an approved design into an execution-ready `{PREFIX}-plan.md` — phased, with checkbox steps, file targets, acceptance criteria, and Touched Modules. Runs the `flowcode:plan` skill, which dispatches `flowcode:planner-agent` and gates on the operator before execution.
status: active
tags: [command, plan, planning, phases, standalone]
argument-hint: "<PREFIX>"
links: [.flowcode/plans/plan-instructions.md]
---

# /flowcode:plan

- Thin entry point: loads and runs the shared `flowcode:plan` skill — the procedure lives in the skill, not here.
- **Precondition:** the target plan's `{PREFIX}-design.md` is `status: approved` (and `{PREFIX}-ui-design.md` too, for frontend). If not, the skill stops and points to `/flowcode:design`.
- Runs `flowcode:planner-agent` (opus): minimal phases, active phase at full depth, later phases stubbed; single plan file; creates `{PREFIX}-log.md` with `[PLAN CREATED]`.
- Registers the plan `active` / `0/N` in `plan-index.md`, then presents the phase breakdown for review.
- Hands off to `/flowcode:execute` — **user-gated**, never auto-started.

## Usage

```text
/flowcode:plan <PREFIX>
/flowcode:plan                                   # no argument — resolve the PREFIX against plan-index.md
```

Examples:

- `/flowcode:plan 004-optimistic-locking`
- `/flowcode:plan CMP-234`
- `/flowcode:plan` — asks which approved design to plan

## What This Does

1. Loads the `flowcode:plan` skill and runs its procedure.
2. Resolves the `{PREFIX}` and verifies the design is approved (else points to `/flowcode:design`).
3. Dispatches `flowcode:planner-agent` to write `{PREFIX}-plan.md` and initialize `{PREFIX}-log.md`.
4. Finalizes registration (`plan-index.md` → `active` / `0/N`) and flags any missing module files.
5. Presents the phase breakdown at a pre-execution review gate — does not auto-start execution.

## Prompt

You are running a plan session.

Run the `flowcode:plan` skill and execute its procedure. Treat `$ARGUMENTS` as the `{PREFIX}`; if empty, resolve it against `.flowcode/plans/plan-index.md` (ask if ambiguous). Verify `{PREFIX}-design.md` is `status: approved` before planning — if it is `draft` or missing, stop and point to `/flowcode:design`. Dispatch `flowcode:planner-agent`, finalize the `plan-index.md` registration on return, and end at the pre-execution review gate. Do **not** auto-start `/flowcode:execute`.

## Non-Goals

- Do not implement the procedure inline — the skill is the single source of truth; this command only invokes it.
- Do not plan an unapproved design — verify `status: approved` first.
- Do not auto-start execution — `/flowcode:execute` is user-gated.
- Do not write per-phase files — one `{PREFIX}-plan.md` only.
- Do not modify source code — planning writes the spec, not the implementation.

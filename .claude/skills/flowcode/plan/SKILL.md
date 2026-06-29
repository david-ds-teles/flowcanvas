---
name: flowcode:plan
description: Turn an approved design into an execution-ready `{PREFIX}-plan.md` — phased, with checkbox steps, concrete file targets, acceptance criteria, Phase Status, and Touched Modules. Runs the `flowcode:planner-agent` agent (opus), registers the plan, and gates on the operator before execution. Use after a design is approved, when the operator says "plan it" / "break this into phases."
status: active
tags: [plan, planning, phases, acceptance-criteria, touched-modules]
links: [.flowcode/templates/plan-template.md, .flowcode/templates/plan-log-template.md, .flowcode/plans/plan-instructions.md, .flowcode/plans/plan-index.md]
---

# Plan Session

- The operator-facing playbook for converting an approved `{PREFIX}-design.md` into `{PREFIX}-plan.md`; runs the `flowcode:planner-agent` agent (opus) as the worker and owns the precondition check, plan registration, and the pre-execution gate.
- **Precondition: the design is approved.** `{PREFIX}-design.md` must be `status: approved` (and `{PREFIX}-ui-design.md` too, for frontend-touching plans). If it isn't, stop and offer `flowcode:design` first — planning an unapproved design front-runs the review gate.
- The planner decomposes the design into the minimum phases that stay independently reviewable, revertible, and scope-coherent (typically 2–6; a single-phase plan is valid — resist ceremonial padding).
- Only the **active** (next-to-execute) phase is written at full depth; later phases stay stubbed until they become active. The single-plan-file rule holds — one `{PREFIX}-plan.md`, never per-phase files (`artifact-naming-check.js` enforces).
- **Full depth means the Active-Phase Completeness Bar:** the active phase must be finishable by a junior engineer with no follow-up questions — production-ready snippets, worked examples, a flow diagram where non-trivial, explicit steps, and named quality checks. The authoritative definition lives in `plan-instructions.md § Active-Phase Completeness Bar`; this is substance traced to the design, never padding.
- On first run the planner creates `{PREFIX}-log.md` with a `[PLAN CREATED]` entry and cross-references every Touched Module to its `modules/{name}.md`; a missing module file is flagged, not invented.
- The main agent finalizes registration: flip `plan-index.md` to `active`, Progress `0/N`.
- All lifecycle rules (phase status axis, phase-close minimum, halt conditions) live in `plan-instructions.md` — this skill points there, it does not restate them.
- Hands off to `flowcode:execute` — **user-gated**, never auto-started.

## When To Use

Use once a design is approved and the operator wants the executable breakdown. Triggered by `/flowcode:plan <PREFIX>` or directly ("plan it", "break this into phases"). The natural predecessor is `flowcode:design`; the natural successor is `flowcode:execute`.

Not for: producing the design itself (`flowcode:design`), or running the phases (`flowcode:execute`). Planning writes the spec; it does not implement.

## Procedure

### 1 — Resolve the PREFIX and verify the precondition

Identify the target `{PREFIX}` (from the argument, or ask — confirm against `plan-index.md`). Read `.flowcode/plans/{PREFIX}/{PREFIX}-design.md`:

- **Missing** → there is nothing to plan. Offer `flowcode:design` to produce it. Stop.
- **`status: draft`** → not yet approved. Surface this and ask the operator to approve the design (or run `flowcode:design`'s final review gate) before planning. Do not plan a draft.
- **`status: approved`** → proceed. For frontend-touching plans, also confirm `{PREFIX}-ui-design.md` is `approved`; if not, the UI design gate (`plan-instructions.md § UI Design Gate`) is unmet — surface it.

### 2 — Dispatch the planner

Dispatch `flowcode:planner-agent` (opus) for `{PREFIX}`. It loads context in parallel (design, ui-design if any, project-overview, scoped `modules/{name}.md`, quality-checks index), decomposes into phases, and writes `{PREFIX}-plan.md` from `plan-template.md`:

- Per phase: `## Phase N — {Name}`, `**Phase Status:** pending`, `**Evaluation:**`, `**Touched Modules:**` (each cross-referenced to its module file), `**Files to create / modify:**`, `**Implementation steps:**` (checkboxes), `**Acceptance criteria:**`.
- Active phase at full depth — and clearing the Active-Phase Completeness Bar: production-ready snippets, worked examples, a flow diagram where non-trivial, and named quality checks (`plan-instructions.md § Active-Phase Completeness Bar`). Later phases stubbed; any element the design did not decide is flagged as a design gap, not guessed.
- On first run, it also creates `{PREFIX}-log.md` with the `[PLAN CREATED]` entry.

The planner owns Template First, the single-file rule, and merge-on-rerun (it preserves checked boxes, phase statuses, and deviation notes) — do not duplicate that here.

### 3 — Finalize registration

On the planner's return, the main agent completes what the agent doesn't:

- Update the plan's row in `.flowcode/plans/plan-index.md`: `status` → `active`, Progress → `0/{N}` (N = phase count).
- Surface any module files the planner flagged as missing — each is a framework breach to resolve (`module-template.md` or `/flowcode:bootstrap`) before execution.

### 4 — Pre-execution review gate

Present the phase breakdown to the operator: the phase list, each phase's goal and Touched Modules, and the active phase at full depth. Before confirming, verify the active phase clears the **Active-Phase Completeness Bar** (`plan-instructions.md`) — it carries production-ready snippets, worked examples, a flow diagram where non-trivial, unambiguous steps, and named quality checks, such that a junior engineer could execute it without asking. If it falls short or a required element is missing because the design never decided it, send it back to the planner (or to `flowcode:design` for a genuine design gap) before the gate. Confirm the decomposition makes sense before any code is written. **Do not auto-start `flowcode:execute`** — execution is a deliberate, separate step the operator triggers.

## References

| File | Use |
|------|-----|
| `flowcode:planner-agent` | The worker (opus) — decomposes the design and writes `{PREFIX}-plan.md` + initial log |
| `.flowcode/templates/plan-template.md` | Plan artifact shape — phases, statuses, checkbox steps, acceptance criteria |
| `.flowcode/templates/plan-log-template.md` | `[PLAN CREATED]` entry the planner writes on first run |
| `.flowcode/plans/plan-instructions.md` | Authoritative lifecycle rules — phase status, **Active-Phase Completeness Bar**, phase-close minimum, halt conditions, artifact naming, UI gate |
| `.flowcode/quality-checks/quality-gates.md` | Concrete gate registry — the planner names this phase's `build`/`test`/`lint`/`e2e` gates from here |
| `.flowcode/plans/plan-index.md` | Receives the `active` / `0/N` registration update |
| `flowcode:design` | The predecessor — produces and approves the design this skill consumes |
| `/flowcode:execute` | The successor — runs the phases (user-gated) |

## Non-Goals

- Do not plan an unapproved design — verify `status: approved` first, or run `flowcode:design`.
- Do not auto-start execution — `flowcode:execute` is user-gated.
- Do not write per-phase files or invent depth for later phases — single plan file, active phase only at full depth.
- Do not pad to hit the completeness bar — depth is substance a junior actually needs (real snippets, examples, diagrams traced to the design), never length, ceremonial phases, or a re-copy of the design's rationale.
- Do not restate the lifecycle rules — point to `plan-instructions.md`.
- Do not modify source code — planning writes the spec, not the implementation.

---
name: flowcode:revise
description: Polish a just-executed plan to done, or amend a closed one — classify the ask (in-envelope vs escalate), apply fix/adjust/amend, review the diff, record a [REVISE] log entry + changelog note, and trigger completion on user sign-off. The safe post-execution loop between "implemented" and "done".
status: active
tags: [revise, post-execution, polish, amend, plan-lifecycle, sign-off]
links: [.flowcode/plans/plan-instructions.md]
---

# Revise Plan

- The operator-facing playbook for the revise stage — the named interval between "all phases implemented" and "plan complete." Drives fix, adjust, and spec-amend passes; records each into the plan's own artifacts.
- **`plan-instructions.md § Revise Stage` is the law.** Scope guard, two contexts, `[REVISE]` recording contract, and completion gate are defined there once — this skill sequences them and points, never restates.
- **Two contexts off one primitive:** post-execution polish (plan `active`, all phases `done`) and post-completion amendment (plan `complete`). Same recording, same scope guard; only the terminal status differs.
- **Classify first, apply second.** In-envelope (≈ 1–5 files, no new phase, no architecture shift) → apply inline. Out-of-envelope → halt and escalate to `/flowcode:design` or `/flowcode:plan`.
- Apply via `flowcode:implementer-agent` for non-trivial code; review the diff via `flowcode:code-reviewer-agent`; record via `flowcode:artifact-updater-agent`.
- Each pass writes `[REVISE]` to `{PREFIX}-log.md` and a dated note to `{PREFIX}-changelog.md § Revisions`; plan/design spec rewritten in the same pass when the change is lasting.
- Completion (Post-Execution Pipeline + finalize) runs only on user sign-off — never auto-triggered.
- No new sub-agent — reuses `implementer-agent`, `code-reviewer-agent`, `artifact-updater-agent`.
- Closed-plan revises keep `Status: complete`; active-revise-stage plans keep `Status: active` until sign-off.

## When To Use

Use whenever a plan needs polishing after execution, or a closed plan needs a scoped amendment:

- **Post-execution polish (primary)** — the plan is `active` with all phases `done` (the revise stage). Execution stopped here; this skill drives the fix/adjust/amend loop until the user signs off.
- **Post-completion amendment (secondary)** — the plan is `complete`. A specific gap or drift was found; apply + record without re-opening the plan.

Two ways in:
- **Via command:** `/flowcode:revise [PREFIX] [what…]` — explicit entry; `PREFIX` optional (skill infers/asks).
- **Via execute:** `flowcode:execute` announces the revise stage and hands off — the user then runs `/flowcode:revise` for each pass, or says "just complete it" to skip directly to completion.

Not for: changes that need a new phase, a contract change across undeclared modules, or a design decision that was never made — those escalate to `/flowcode:design` or `/flowcode:plan`.

## Procedure

### 1 — Resolve `{PREFIX}` and load context

Resolve `{PREFIX}` in priority order:
1. Explicit argument (`/flowcode:revise 009 …`).
2. Most-recent plan at `active` + `Progress N/N` (the plan in the revise stage) from `plan-index.md`.
3. Ask the operator if ambiguous.

Confirm against `plan-index.md`. Then load **only** that plan's artifacts at summary depth: `{PREFIX}-plan.md`, `{PREFIX}-design.md`, `{PREFIX}-log.md`, `{PREFIX}-changelog.md`, and `{PREFIX}-ui-design.md` if the plan touches frontend. Do not do a full Tier-2 sweep — load only what this plan needs.

Determine the context:
- Plan `Status: active` + all phases `done` → **post-execution polish**
- Plan `Status: complete` → **post-completion amendment**

### 2 — Classify the ask

Before applying anything, classify the requested change:

**In-envelope** (proceed to step 3):
- ≈ 1–5 files touched
- No new phase required
- No architecture shift; no new module contract
- No design decision that was never made

**Out-of-envelope** (halt and escalate — do NOT apply):
- Needs a new phase → escalate: "This change needs a new phase — run `/flowcode:plan` to merge it into the plan."
- Needs a contract change across undeclared modules → escalate: "This is a module-boundary change. Surface it to the user and route to `/flowcode:design` or `/flowcode:plan`."
- Needs a design decision that was never made → escalate: "This requires a design decision. Run `/flowcode:design` to decide it first."

State the classification plainly. Never silently apply an out-of-envelope change.

### 3 — Apply fix / adjust / amend

Execute the in-envelope change. For non-trivial code slices (> ~30 lines across files), dispatch `flowcode:implementer-agent` (sonnet) — pass it the owned-file slice, the change request, and the relevant design/module context. For small targeted edits, apply inline in the main session.

When the change is a **lasting spec update** (a default was wrong, a value changed, a step needs rewriting): rewrite the relevant section of `{PREFIX}-plan.md` or `{PREFIX}-design.md` **in the same pass** — the `[REVISE]` entry's `Plan/spec amended` field names where. This is the same rule as `plan-execution.md § Phase Execution § Implementation` step 2, extended past phase close.

### 4 — Review the diff

Dispatch `flowcode:code-reviewer-agent` (sonnet) over all files changed in this pass. It **prepends** a new `## Check {DATE} — Revise pass` section to `{PREFIX}-qa-report.md` (newest on top). Resolve findings by severity:
- `critical` / `high` → fix → re-review until clean.
- `medium` → must reach `**Resolution:**` before recording.
- `low` / `info` → fold into the `[REVISE]` entry's `Gates` field.

### 5 — Record `[REVISE]` + changelog note

Via `flowcode:artifact-updater-agent` (sonnet), write two artifacts in the same pass:

1. **`{PREFIX}-log.md`** — prepend a `[REVISE]` entry (newest on top, below the file header) using the template from `plan-log-template.md § [REVISE]`. All fields mandatory.

2. **`{PREFIX}-changelog.md`** — append a dated note under `## Revisions` (create the section on first revise):
   ```markdown
   ## Revisions
   - **{DATE}** — {what changed and why}. Files: `path/a`, `path/b`.
   ```

### 6 — Sign-off branch

After recording, present a one-line summary of what was done and ask: **"Anything else to fix, or is the plan done?"**

**More passes** → repeat from step 1 with the next ask. The plan stays `active`.

**User signs off** ("done", "ship it", "complete it", "yes") → run the **shared completion step**:

1. Run `plan-execution.md § Post-Execution Pipeline` end to end (quality gates → code-explorer audit → technical-overview → final QA → parallel changelog reconciliation + test-notes).
2. Finalize (`plan-execution.md § Post-Execution Pipeline § Step 5`): `[PLAN COMPLETE]` to the top of `{PREFIX}-log.md` and `project-log.md` (both required, must agree), `plan-index.md` row → `complete` / `N/N`, plan `Status: complete`, commit (clean, no AI attribution).

**Post-completion amendment context** — after recording the `[REVISE]` entry, the plan stays `complete`. Announce what was done; no completion pipeline re-run.

## Stance Rules

- A `complete` plan is history — apply + record, stay `complete`, never re-litigate status.
- An `active`-at-`N/N` plan stays `active` through every revise pass; `complete` fires only on explicit user sign-off.
- Never write to `project-log.md` during a revise pass — that's the quickfix/bugfix lane. Revise records into `{PREFIX}-log.md` and `{PREFIX}-changelog.md` only.
- Never grow a revise pass into a re-plan — scope guard (step 2) blocks it and escalates.

## References

| File | Use |
|------|-----|
| `.flowcode/plans/plan-instructions.md § Revise Stage` | The law — scope guard, two contexts, `[REVISE]` recording contract, completion gate |
| `.flowcode/templates/plan-log-template.md § [REVISE]` | The `[REVISE]` entry format — all fields mandatory |
| `flowcode:implementer-agent` | Non-trivial code fixes — dispatched for > ~30 lines across files |
| `flowcode:code-reviewer-agent` | Diff review → `## Check` prepend to `{PREFIX}-qa-report.md` |
| `flowcode:artifact-updater-agent` | `[REVISE]` log entry + changelog note + spec sync |

## Non-Goals

- Do not restate `plan-instructions.md § Revise Stage` — point to it; it wins on every rule.
- Do not write to `project-log.md` — that is the quickfix/bugfix lane.
- Do not grow into a re-plan — classify first; escalate when out-of-envelope.
- Do not auto-trigger completion — only on explicit user sign-off.
- Do not add a new lifecycle status — "all phases `done` + `Status: active`" is the revise-stage signal over existing primitives.

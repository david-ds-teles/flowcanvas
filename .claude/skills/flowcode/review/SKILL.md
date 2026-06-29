---
name: flowcode:review
description: Run a standalone code review over an arbitrary diff — grounded in project-overview, module contracts, quality gates, and code conventions, and plan-aware when a plan applies. Dispatches `flowcode:code-reviewer-agent` and routes findings to the plan's `{PREFIX}-qa-report.md` or to a `.flowcode/reviews/{slug}-review.md`. Use ad-hoc via `/flowcode:review`, no plan required.
status: active
tags: [review, code-review, findings, quality, standalone]
links: [.flowcode/reviews/reviews-index.md, .flowcode/templates/review-report-template.md, .flowcode/quality-checks/quality-checks-index.md]
---

# Review Session

- The operator-facing playbook for an ad-hoc code review; runs `flowcode:code-reviewer-agent` (sonnet) as the worker and owns scope resolution, plan detection, and output routing around it.
- Two surfaces, one engine: standalone via `/flowcode:review` (no plan needed) and the phase-close / plan-completion review the `flowcode:execute` pipeline already dispatches — the same agent, the same finding-as-section format.
- **Grounded by default:** every run loads `project-overview.md`, the touched `modules/{name}.md` contracts, the declared quality gates, and the six code-quality conventions. A change that contradicts any of them is a finding — a red flag even when no plan exists.
- **Plan-aware when a plan applies:** if a `{PREFIX}` is resolved, the plan's acceptance criteria and Touched Modules become part of the check, and findings land in `{PREFIX}-qa-report.md` (where `qa-probe-gate.js` enforces them).
- **Plan-optional:** with no plan, the review still runs against the baseline and findings persist to `.flowcode/reviews/{slug}-review.md` (advisory — does not gate commits).
- Scope is whatever the operator points at: uncommitted working tree (default), staged, a ref range or branch, or an explicit file/dir set.
- Read-only on source; the only writes are the prepended `## Check` section and the index row. Review-only — it does not apply fixes.

## When To Use

Use whenever you want a flowcode-grounded review of a change outside the phase-close lifecycle: before a commit or PR, after a quick fix or a spike, on a teammate's branch, or to sanity-check that work-in-progress still respects the project's architecture and conventions. Two ways in:

- **Standalone:** `/flowcode:review [scope]` — ad-hoc, anytime, no plan required.
- **In-framework:** the `flowcode:execute` phase-close sequence and plan-completion QA dispatch the same `flowcode:code-reviewer-agent` against the phase/plan scope — that path is owned by the execute skill, not re-implemented here.

Not for: applying fixes (this is review-only — feed the findings to an implementer), and not a substitute for the phase-close review inside an active plan's execution (that runs automatically).

## Procedure

### 1 — Resolve the scope

Parse the argument into a change set (default when empty: the uncommitted working tree). Recognized forms:

- *(empty)* → working tree: `git diff HEAD` plus untracked files
- `staged` → `git diff --cached`
- `<refA>..<refB>` or a single `<ref>`/branch → `git diff <base>...<ref>` (branch vs its merge-base)
- one or more paths → those files/dirs (their working-tree diff if changed, else read whole)

If the scope is empty (nothing changed, no path given), say so and stop — there is nothing to review.

### 2 — Detect the plan context (optional)

Resolve a `{PREFIX}`, in priority order: an explicit `PREFIX=<X>` token in the argument → the current branch name if it carries a known PREFIX → the most-recent `active` plan in `plan-index.md` whose Touched Modules intersect the changed files. If one resolves, this is a **plan-bound** review; otherwise it is **baseline-only**. When ambiguous (several plausible plans), ask the operator rather than guessing.

### 3 — Dispatch the reviewer

Dispatch `flowcode:code-reviewer-agent` (sonnet) once, in `standalone` mode, passing: the resolved scope (the diff/file set), the `{PREFIX}` or `none`, and the output target. The agent owns context loading, the scan (baseline conformance first, then conventions / acceptance-criteria / security / tests), the stack gates, Template First, and the prepend — do not duplicate that here. Output target:

- plan-bound → `.flowcode/plans/{PREFIX}/{PREFIX}-qa-report.md`
- baseline-only → `.flowcode/reviews/{slug}-review.md`, where `{slug}` is a short kebab of the branch name (or the primary path) — the agent also updates the `reviews-index.md` row

### 4 — Relay the verdict

Collect the agent's report and relay a decision-ready summary: the gate outcome, baseline-conformance status (call out red-flag divergences first), finding counts by severity, the unresolved blockers, and the artifact path. For a plan-bound review, note that `≥ medium` unresolved findings now block commits/PRs via `qa-probe-gate.js`; for a standalone review, note it is advisory.

## References

| File | Use |
|------|-----|
| `flowcode:code-reviewer-agent` | The worker — loads context, scans, runs gates, prepends the `## Check` section; sonnet |
| `.flowcode/reviews/reviews-index.md` | Index of standalone review reports — the agent updates the row on completion |
| `.flowcode/templates/review-report-template.md` | Standalone report structure; the agent reads it before writing a new `{slug}-review.md` |
| `.flowcode/templates/qa-report-template.md` | Plan-bound report structure; used when a `{PREFIX}` is in scope |
| `.flowcode/quality-checks/quality-checks-index.md` | Conventions + gates the baseline-conformance check is measured against |

## Non-Goals

- Do not apply fixes or edit source — this is review-only; hand findings to an implementer.
- Do not re-implement the reviewer's context-load / scan / prepend procedure here — dispatch the agent; this skill only resolves scope, detects the plan, and relays.
- Do not write anywhere but the resolved report (`{PREFIX}-qa-report.md` or `.flowcode/reviews/{slug}-review.md`) and its index row.
- Do not run the phase-close review here — that is owned by the `flowcode:execute` pipeline, which dispatches the same agent.
- Do not invent a `{PREFIX}` to force a plan-bound review — when none clearly applies, review baseline-only.

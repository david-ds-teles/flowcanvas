---
name: flowcode:review
description: Standalone slash command to run a flowcode-grounded code review over an arbitrary diff — checks project-overview, module contracts, quality gates, and code conventions, plan-aware when a plan applies. Runs the `flowcode:review` skill; no plan required.
status: active
tags: [command, review, code-review, quality, standalone]
argument-hint: "[ | staged | <refA>..<refB> | <branch> | <path…> ] [PREFIX=<X>]"
links: [.claude/skills/flowcode/review/SKILL.md, .flowcode/reviews/reviews-index.md, .flowcode/templates/review-report-template.md]
---

# /flowcode:review

- Thin entry point: loads and runs the shared `flowcode:review` skill at `.claude/skills/flowcode/review/SKILL.md` — the procedure lives in the skill, not here.
- **Standalone, no plan required** — review any diff on demand; findings persist for later reference.
- **Grounded:** every run checks the change against `project-overview.md`, the touched `modules/{name}.md` contracts, the declared quality gates, and the code conventions — divergence is a first-class finding.
- **Plan-aware:** if a `{PREFIX}` resolves (explicit, branch, or active plan), the plan's acceptance criteria join the check and findings land in `{PREFIX}-qa-report.md`; otherwise they land in `.flowcode/reviews/{slug}-review.md`.
- Dispatches `flowcode:code-reviewer-agent` (sonnet) once over the resolved scope. Review-only — it does not apply fixes.

## Usage

```text
/flowcode:review                       # uncommitted working tree (default)
/flowcode:review staged                # staged changes only
/flowcode:review main..HEAD            # a ref range / branch vs base
/flowcode:review src/auth/ src/api.ts  # an explicit file/dir set
/flowcode:review PREFIX=CMP-234        # bind to a plan for acceptance-criteria context
```

Examples:

- `/flowcode:review` — review what I've changed but not committed yet.
- `/flowcode:review main..HEAD` — review my whole feature branch against `main`.
- `/flowcode:review src/billing/ PREFIX=BIL-12` — review the billing changes against plan BIL-12's acceptance criteria.

## What This Does

1. Loads the `flowcode:review` skill and runs its procedure standalone.
2. Resolves the scope from `$ARGUMENTS` (default: the uncommitted working tree).
3. Detects an optional plan `{PREFIX}` (explicit → branch → active plan touching the changed files).
4. Dispatches `flowcode:code-reviewer-agent` once — baseline conformance first, then conventions, acceptance criteria (if a plan applies), security, and tests.
5. Routes findings to `{PREFIX}-qa-report.md` (plan-bound) or `.flowcode/reviews/{slug}-review.md` (standalone), and relays a decision-ready verdict.

## Prompt

You are running a standalone code review on demand.

Load `.claude/skills/flowcode/review/SKILL.md` and execute its procedure. Treat `$ARGUMENTS` as the scope: empty → the uncommitted working tree; `staged` → staged changes; a `<refA>..<refB>` or branch → that range vs its base; one or more paths → those files/dirs. A `PREFIX=<X>` token binds the review to that plan for acceptance-criteria context; otherwise detect a plan from the branch or the active plan touching the changed files, and if none clearly applies, review baseline-only. Dispatch `flowcode:code-reviewer-agent` once over the resolved scope and relay the gate outcome, baseline-conformance status, finding counts, and the artifact path. Do not apply fixes.

## Non-Goals

- Do not implement the procedure inline — the skill is the single source of truth; this command only invokes it.
- Do not apply fixes or edit source — review-only; hand findings to an implementer.
- Do not run the phase-close review — that is owned by the `flowcode:execute` pipeline.
- Do not write outside the resolved report and its index row.

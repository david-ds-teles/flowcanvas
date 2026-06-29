---
name: flowcode:revise
description: Polish a just-executed plan to done, or amend a closed one — fix what's broken, adjust what's needed, amend the spec. Thin entry that runs the flowcode:revise skill. PREFIX optional (inferred from the plan in the revise stage, or asked).
status: active
tags: [command, revise, post-execution, polish, amend, plan-lifecycle]
argument-hint: "[PREFIX] [what to fix/adjust/amend…]"
links: [.flowcode/plans/plan-instructions.md]
---

# /flowcode:revise

- Thin entry point: loads and runs the `flowcode:revise` skill — the procedure lives in the skill, not here.
- **Post-execution polish (primary):** drives the fix/adjust/amend loop for a plan at `active` + all phases `done` (the revise stage). Each pass records a `[REVISE]` entry; the loop ends when the user signs off → completion.
- **Post-completion amendment (secondary):** applies a scoped change to a closed plan, records `[REVISE]`, plan stays `complete`.
- `PREFIX` is optional — the skill infers it from the most-recent plan in the revise stage, or asks when ambiguous.
- Classify-first: in-envelope changes apply; out-of-envelope escalates to `/flowcode:design` or `/flowcode:plan` — never silently grows into a re-plan.
- Review-driven: every pass dispatches `flowcode:code-reviewer-agent`; `≥ medium` findings resolved before recording.

## Usage

```text
/flowcode:revise                                        # infer PREFIX (most-recent plan in revise stage)
/flowcode:revise 009                                   # specify PREFIX; skill asks what to fix
/flowcode:revise 009 smoke should also assert console-clean
/flowcode:revise 010 phase 1 gated completion prose is ambiguous — tighten it
/flowcode:revise PREFIX=BIL-12 billing summary tooltip overflows on mobile
```

Examples:

- `/flowcode:revise` — I just finished executing a plan; start the revise loop on the plan currently in revise stage.
- `/flowcode:revise 009 capture missing the 768px viewport` — fix a specific gap in plan 009.
- `/flowcode:revise 007 amend the migration block — it referenced the old path` — post-completion spec correction.

## What This Does

1. Loads `flowcode:revise` skill and runs its procedure.
2. Resolves `{PREFIX}` from `$ARGUMENTS` (explicit → inferred from `plan-index.md` → ask).
3. Loads only that plan's artifacts at summary depth.
4. Classifies the ask: in-envelope (apply) vs out-of-envelope (escalate, halt).
5. Applies fix/adjust/amend (dispatches `flowcode:implementer-agent` for non-trivial code); rewrites plan/design spec in the same pass when lasting.
6. Reviews the diff via `flowcode:code-reviewer-agent` → `## Check` prepend to `{PREFIX}-qa-report.md`; resolves `≥ medium` findings.
7. Records `[REVISE]` entry (top of `{PREFIX}-log.md`) + dated note (`{PREFIX}-changelog.md § Revisions`) via `flowcode:artifact-updater-agent`.
8. **Sign-off branch:** more passes → stay in the loop; user signs off → run the Post-Execution Pipeline + finalize → `Status: complete`.

## Prompt

You are running a revise pass on a plan.

Run the `flowcode:revise` skill and execute its procedure. Treat `$ARGUMENTS` as the revise input: an optional `PREFIX` (or `PREFIX=<X>`) followed by a free-text description of what to fix, adjust, or amend. If no PREFIX is given, infer it from the most-recent plan in the revise stage (`active` + all phases `done` in `plan-index.md`), or ask if ambiguous. Run the full classify → apply → review → record → sign-off loop.

## Non-Goals

- Do not implement the procedure inline — the skill is the single source of truth; this command only invokes it.
- Do not write to `project-log.md` — revise records into `{PREFIX}-log.md` and `{PREFIX}-changelog.md` only.
- Do not auto-complete — completion runs only on explicit user sign-off.
- Do not grow into a re-plan — classify and escalate if out-of-envelope.

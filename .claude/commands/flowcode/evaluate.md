---
name: flowcode:evaluate
description: Assess the quality of plan artifacts with the 3-layer evaluation system — hooks-log + static rubric (free, inline) then the LLM judge per plan. Thin entry that runs the flowcode:evaluate skill. PREFIX optional (defaults to all plans). Advisory; never gates.
status: active
tags: [command, evaluate, quality, evaluation, advisory]
argument-hint: "[PREFIX]"
links: [.flowcode/eval/eval-index.md]
---

# /flowcode:evaluate

- Thin entry point: loads and runs the `flowcode:evaluate` skill — the procedure lives in the skill, not here.
- Assesses **output quality** (design depth, artifact coherence, decision traceability) — the signal the structural hooks cannot capture.
- **Advisory by contract** — never gates a phase, plan, or commit; it surfaces thin quality for a human to act on.
- Runs Layer 1 (hooks-log) + Layer 2 (static rubric) inline via `.flowcode/eval/flowcode-eval.js`, then dispatches `flowcode:evaluator-agent` (sonnet, session-isolated) per plan for Layer 3.
- `PREFIX` optional: given → evaluate that plan; omitted → every plan in `plan-index.md` (Layer 1 is always project-wide).

## Usage

```text
/flowcode:evaluate                 # evaluate every plan (L1 project-wide, L2 all plans, L3 per plan)
/flowcode:evaluate 012-eval-system # evaluate one plan
```

Examples:

- `/flowcode:evaluate` — full quality sweep across all plans, plus the hooks-log health check.
- `/flowcode:evaluate 013-harness-leak-elimination` — judge one plan's artifacts and write its `logs/eval/013-harness-leak-elimination.json`.

## What This Does

1. Loads the `flowcode:evaluate` skill and runs its procedure.
2. Resolves scope from `$ARGUMENTS` (a `{PREFIX}`, or all plans from `plan-index.md`).
3. Runs `node .flowcode/eval/flowcode-eval.js --layer all [--plan PREFIX]` — Layers 1 + 2, writing reports under `.flowcode/logs/eval/`.
4. Dispatches `flowcode:evaluator-agent` per in-scope plan (parallel, batched) for the Layer 3 judge scores.
5. Relays a decision-ready rollup: flagged hooks, static scores (lowest first), per-plan judge total `/20` + top gap; points to `logs/eval/` + `trend.jsonl`.

## Prompt

You are running the standalone evaluation surface.

Run the `flowcode:evaluate` skill and execute its procedure. Treat `$ARGUMENTS` as the scope: a `{PREFIX}` → evaluate that one plan; empty → evaluate every plan in `.flowcode/plans/plan-index.md`. Run the orchestrator (`node .flowcode/eval/flowcode-eval.js --layer all [--plan PREFIX]`) for Layers 1–2, then dispatch `flowcode:evaluator-agent` (session-isolated, read-only) per in-scope plan for Layer 3, and relay a decision-ready rollup with the flagged hooks, the static score table, and each plan's judge total and top gap. Evaluation is advisory — do not gate anything on the result.

## Non-Goals

- Do not implement the procedure inline — the skill is the single source of truth; this command only invokes it.
- Do not gate anything on the scores — evaluation is advisory.
- Do not edit artifacts or source — read-only except the scripts'/agent's `logs/eval/` writes.
- Do not review a raw code diff — that is `/flowcode:review`.

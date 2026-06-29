---
name: flowcode:evaluate
description: Run the 3-layer evaluation system over the project's plan artifacts — Layer 1 (hooks-log) + Layer 2 (static rubric) inline via the orchestrator, then Layer 3 (the flowcode:evaluator-agent LLM judge) per plan — and relay a decision-ready quality rollup. Advisory; never gates. Run via /flowcode:evaluate.
status: active
tags: [evaluate, quality, evaluation, judge, advisory]
links: [.flowcode/eval/eval-index.md, .flowcode/templates/evaluation-report-template.md, .flowcode/plans/plan-index.md]
---

# Evaluate Session

- The operator-facing playbook for assessing **output quality** — design depth, artifact coherence, decision traceability — the signal flowcode's structural hooks cannot capture.
- Three layers, increasing cost: **L1** hooks-log aggregation + **L2** static artifact rubric (free, offline, inline via `.flowcode/eval/flowcode-eval.js`); **L3** the `flowcode:evaluator-agent` LLM judge (token cost, opt-in, one dispatch per plan).
- **Advisory by contract** — evaluation never gates a phase, plan, or commit. It surfaces where quality is thin so a human can decide.
- Two surfaces, one engine: standalone via `/flowcode:evaluate [PREFIX]`, and the non-blocking post-completion dispatch in `plan-execution.md § Post-Execution Pipeline § Step 6` (which fires only L3 for the just-completed plan).
- Scope is a single `{PREFIX}` when given, else every plan in `plan-index.md`. L1 is project-wide regardless.
- Read-only on source and artifacts; the only writes are under `.flowcode/logs/eval/` (done by the scripts and the agent, not by this skill).

## When To Use

Use to get a quality read on plan artifacts outside the structural gates: after finishing a plan, when auditing a backlog of plans for thin design/QA, when calibrating whether the team's artifacts are deep enough, or to watch quality trend over time (`trend.jsonl`). Two ways in:

- **Standalone:** `/flowcode:evaluate [PREFIX]` — evaluate one plan or all of them, anytime.
- **In-framework:** Post-Execution Pipeline Step 6 dispatches the L3 judge for the just-completed plan, non-blocking — that path is owned by the execute/revise close, not re-implemented here.

Not for: gating anything (this is advisory), reviewing a raw code diff (that is `flowcode:review`), or judging whether the feature itself is worthwhile (the judge scores the *artifacts*, not the idea).

## Procedure

### 1 — Resolve the scope

If `$ARGUMENTS` names a `{PREFIX}`, scope to that plan. Otherwise read `.flowcode/plans/plan-index.md` and scope to every plan (Layer 2 scores all; Layer 3 is dispatched per plan — batch large sets). Layer 1 is always project-wide.

### 2 — Run Layers 1 + 2 (inline, free)

Run the orchestrator via Bash from the project root:

```bash
node .flowcode/eval/flowcode-eval.js --layer all [--plan PREFIX]
```

It writes `logs/eval/hooks-{date}.{md,json}`, `static-{date}.{md,json}`, and `summary-{date}.md`, and prints the headline counts. Read the `summary-{date}.md` (and the per-layer reports if a number looks off). If Node is unavailable, say so and stop — Layers 1–2 cannot run without it.

### 3 — Dispatch Layer 3 (the judge, per plan)

For each in-scope plan, dispatch `flowcode:evaluator-agent` (sonnet, **session-isolated, read-only**) with the `{PREFIX}` and the flowcode root. Dispatch independent plans **in parallel** (batches of ~6). Each agent reads that plan's artifacts, scores 0–4 on the five dimensions with `file:line` evidence, writes `logs/eval/{PREFIX}.json`, and appends to `trend.jsonl`. Collect each agent's rollup.

### 4 — Relay the rollup

Relay a decision-ready summary, not the raw files:

- **Layer 1:** any flagged hooks (high block/error rate) — the rules the agent keeps fighting.
- **Layer 2:** the static score table (lowest first) and notable absent artifacts.
- **Layer 3:** per-plan total `/20` and the top gap (with `file:line`) for each judged plan.
- Point to `logs/eval/` for detail and `trend.jsonl` for the history. Restate that this is advisory.

## References

| File | Use |
|------|-----|
| `.flowcode/eval/eval-index.md` | The eval scripts + the `logs/eval/` output convention |
| `flowcode:evaluator-agent` | The Layer 3 worker — sonnet, session-isolated, read-only; one dispatch per plan |
| `.flowcode/templates/evaluation-report-template.md` | Shape of the `{PREFIX}.json` the judge writes |
| `.flowcode/plans/plan-index.md` | The plan registry — the scope when no PREFIX is given |

## Non-Goals

- Do not gate anything — evaluation is advisory; never block a phase, plan, or commit on a score.
- Do not edit artifacts, source, or logs other than `logs/eval/` (the scripts and the agent own those writes).
- Do not re-implement the rubric or the judge inline — run the orchestrator and dispatch the agent.
- Do not judge the feature's merit or its runtime behavior — score the artifacts' quality only.
- Do not invent a `{PREFIX}` — with no argument, evaluate all plans from the index.

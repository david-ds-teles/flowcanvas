---
name: eval-index
description: Index of the flowcode evaluation scripts (Layer 1 + Layer 2 + orchestrator) and the logs/eval output convention.
status: active
tags: [index, eval, quality, scripts, evaluation]
links: [.flowcode/flowcode-index.md, .flowcode/templates/evaluation-report-template.md]
---

# Eval Index

- Lists the offline evaluation scripts in `.flowcode/eval/` and where they write — the deterministic, free layers of the 3-layer evaluation system.
- The system assesses *output quality* (design depth, artifact coherence, decision traceability) — the signal flowcode's structural hooks cannot capture.
- **Layer 1 + Layer 2** are dependency-free Node (run with `node`, no bash/jq), offline, advisory; **Layer 3** is the `flowcode:evaluator-agent` LLM judge, dispatched by the `flowcode:evaluate` skill.
- Run the whole thing via `/flowcode:evaluate [PREFIX]` (or the orchestrator directly); evaluation **never gates** anything — exit code is always 0.
- All outputs land in `.flowcode/logs/eval/` (host-runtime, not shipped); per-plan judge scores accrete in `{PREFIX}.json` + `trend.jsonl`.

---

## Scripts

| File | Load Type | Purpose |
|------|-----------|---------|
| `.flowcode/eval/flowcode-eval.js` | on-demand | Orchestrator — `--layer {1\|2\|3\|all}`, `--plan PREFIX`, `--since N`, `--root DIR`. Runs Layer 1 + Layer 2 inline; prints the Layer 3 dispatch instruction; writes `logs/eval/summary-{date}.md` |
| `.flowcode/eval/eval-hooks-log.js` | on-demand | Layer 1 — parses `logs/hooks.log` (TSV) into per-hook outcome counts + high-block-rate flags; writes `logs/eval/hooks-{date}.{md,json}` |
| `.flowcode/eval/eval-artifacts.js` | on-demand | Layer 2 — structural rubric over `plans/{PREFIX}/` artifacts (max 100, post-completion categories excluded when N/A); writes `logs/eval/static-{date}.{md,json}` |

---

## Output Convention

All evaluation output is written under `.flowcode/logs/eval/` (created on first run; host-runtime, never shipped):

| File | Written by | Shape |
|------|-----------|-------|
| `hooks-{date}.{md,json}` | Layer 1 | Per-hook fire/outcome counts + flags |
| `static-{date}.{md,json}` | Layer 2 | Per-plan rubric scores + breakdown |
| `summary-{date}.md` | Orchestrator | Combined L1+L2 headlines + the L3 dispatch line |
| `{PREFIX}.json` | `flowcode:evaluator-agent` | Latest Layer 3 judge scores for one plan (overwrite) — shape in `evaluation-report-template.md` |
| `trend.jsonl` | `flowcode:evaluator-agent` | Append-only history — one JSON line per judged plan over time |

**Retention.** The orchestrator prunes dated snapshots (`hooks-`/`static-`/`summary-{date}`) at the end of a run via `--retain N` (default **10** days; `--retain 0` disables). `{PREFIX}.json` (overwrite) and `trend.jsonl` (append) are durable history — never pruned. The runtime `hooks.log` is size-capped (~2 MB, keep-last-half) by the hooks that write it, not by the eval scripts (so a run that hasn't aggregated never loses data).

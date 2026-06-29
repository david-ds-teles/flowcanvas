---
name: evaluation-report-template
description: Shape of the Layer 3 evaluation report that flowcode:evaluator-agent writes to logs/eval/{PREFIX}.json, plus the trend.jsonl history line.
status: active
tags: [template, evaluation, evaluator, judge, quality]
links: [.flowcode/eval/eval-index.md, .flowcode/plans/plan-instructions.md]
---

# Evaluation Report Template

- The output contract for `flowcode:evaluator-agent` (Layer 3 LLM judge) — it writes this JSON to `.flowcode/logs/eval/{PREFIX}.json` and appends a compact line to `.flowcode/logs/eval/trend.jsonl`.
- Five dimensions scored 0–4 (max 20): Depth, Coherence, Cross-references, Decision-traceability, Clarity.
- **Evidence-bound:** every non-zero dimension carries a `file:line` citation; no citable evidence ⇒ score 0.
- `total` MUST equal the sum of the five dimension scores.
- These are machine outputs under host-runtime `logs/` — JSON, not flowcode-frontmatter `.md`; this template documents the shape, it is not copied verbatim.

---

## `{PREFIX}.json` (latest, overwrite)

```json
{
  "prefix": "012-eval-system",
  "evaluated": "2026-06-29",
  "model": "sonnet",
  "total": 16,
  "dimensions": {
    "depth": {
      "score": 4,
      "evidence": "012-eval-system-plan.md:60 — rubric table with per-check point allocation",
      "rationale": "Design carries the full rubric, control-flow diagram, and worked example."
    },
    "coherence": {
      "score": 3,
      "evidence": "012-eval-system-plan.md:24 — deviations reconciled against flowcode.yml contract",
      "rationale": "Plan, log, and changelog agree; one minor drift in the worked example."
    },
    "crossReferences": {
      "score": 3,
      "evidence": "012-eval-system-plan.md:18 — Touched Modules + scope path list",
      "rationale": "Cites scope files and module surfaces; no research refs (none needed)."
    },
    "decisionTraceability": {
      "score": 4,
      "evidence": "012-eval-system-plan.md:20 — Deviations section with rationale per choice",
      "rationale": "Bash→Node and skill-addition both recorded with the why."
    },
    "clarity": {
      "score": 2,
      "evidence": "012-eval-system-plan.md:1 — summary bullets present",
      "rationale": "Readable but dense; some sections could tighten."
    }
  },
  "strengths": [
    "Decision traceability — every deviation carries its rationale (plan.md:20)."
  ],
  "gaps": [
    "No qa-report.md yet at evaluation time (logs/eval expected after close)."
  ]
}
```

### Fields

| Field | Type | Notes |
|-------|------|-------|
| `prefix` | string | The plan PREFIX evaluated |
| `evaluated` | string | `YYYY-MM-DD` of this evaluation |
| `model` | string | The judge model (e.g. `sonnet`) |
| `total` | integer 0–20 | Sum of the five dimension scores — must reconcile |
| `dimensions.<dim>.score` | integer 0–4 | `0` absent/token · `1` shallow · `2` adequate · `3` strong · `4` exemplary |
| `dimensions.<dim>.evidence` | string | `file:line — note`; required for any non-zero score |
| `dimensions.<dim>.rationale` | string | One line — why this score |
| `strengths` | string[] | Top strengths, each with a `file:line` |
| `gaps` | string[] | Top gaps, each actionable |

Dimension keys (exact): `depth`, `coherence`, `crossReferences`, `decisionTraceability`, `clarity`.

---

## `trend.jsonl` (append-only, one line per evaluation)

```json
{"prefix":"012-eval-system","evaluated":"2026-06-29","total":16,"depth":4,"coherence":3,"crossRefs":3,"decisionTraceability":4,"clarity":2}
```

Never rewrite an existing line — this file is the history the team trends quality over.

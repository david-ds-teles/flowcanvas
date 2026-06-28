---
name: {PREFIX}-qa-report
description: QA gate report for {PREFIX} — per-phase and plan-completion review findings and stack-gate outcomes.
status: active
tags: [qa-report, quality-gate, review, findings]
links: [.flowcode/plans/{PREFIX}/{PREFIX}-plan.md, .flowcode/quality-checks/markdown-quality.md]
---

# QA Report — {PREFIX} {Feature Name}

- {1–2 sentence verdict for the latest check: PASS/FAIL/WARN and whether the phase/plan can close.}
- Scope: per-phase close + plan completion.
- Reverse-chronological, prepend-only: newest `## Check YYYY-MM-DD HH:MM` directly below this header; never rewrite prior sections.
- Each check: Stack Gate as a ≤3-column table; Review Findings as finding-as-section entries.
- Baseline conformance (project-overview, module contracts, declared gates, code conventions) is checked every run and recorded on the `**Baseline conformance:**` line; divergence is a first-class finding.
- Severity values: `critical` · `high` · `medium` · `low` · `info`.
- A finding with no `**Resolution:**` line is unresolved; `qa-probe-gate.js` blocks commits/PRs when any unresolved finding is ≥ medium.
- Follow `markdown-quality.md § Finding-as-Section Format` and `§ Tables`.

---

## Check YYYY-MM-DD HH:MM — {Phase N | Plan completion}

**Reviewer:** {code-reviewer-agent | qa-runner-agent | human}
**Baseline conformance:** pass | flagged ({N})
**Gate outcome:** PASS | FAIL | WARN
**Summary:** {1–2 sentence verdict — is this ready to close the phase / merge the plan?}

### Stack Gate

| Gate | Outcome | Notes |
|------|---------|-------|
| Build | pass / fail / n/a | {tool + command} |
| Unit tests | pass / fail / n/a | {count, pass rate} |
| Integration tests | pass / fail / n/a | {tool} |
| Lint | pass / fail / n/a | {0 err / 0 warn} |
| Typecheck | pass / fail / n/a | |
| Coverage | pass / fail / n/a | {actual % / threshold %} |
| E2E / Contract | pass / fail / n/a | {tool} |

### Review Findings

#### Finding 1 — [high] Title

**Files:** `path/to/file.ext:42`, `path/to/other.ext:110-120`

{1–3 sentence description of what is wrong or risky, and why it matters. Concrete, not abstract.}

**Suggested fix:** {What should change — a specific edit, not a platitude.}

**Resolution:** {Filled by implementer when addressed, or `deferred — BL-NNN` with revisit condition. Leave blank until addressed.}

#### Finding 2 — [medium] Title

**Files:** `path/to/file.ext:200`

{Description.}

**Suggested fix:** {fix}

**Resolution:**

{Add more findings as needed. For visual-parity scope, include a dedicated Finding with severity reflecting drift bucket — see `ui/ui-workflow.md § Phase Close`.}

---

<!-- Older QA runs continue below. New runs are prepended above this line, directly under the file header. Never rewrite prior sections. -->

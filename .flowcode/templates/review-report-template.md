---
name: {slug}-review
description: Standalone code-review report for {slug} — ad-hoc review findings and baseline-conformance checks against the flowcode knowledge base, plan-optional.
status: active
tags: [review, findings, standalone, quality]
links: [.flowcode/reviews/reviews-index.md, .flowcode/quality-checks/markdown-quality.md, .flowcode/quality-checks/quality-checks-index.md]
---

# Review Report — {slug}

- {1–2 sentence verdict for the latest check: PASS/FAIL/WARN and the headline risk.}
- Scope: a standalone `/flowcode:review` run over an arbitrary diff (working tree, staged, a ref range, or a file set) — not tied to a phase close.
- Reverse-chronological, prepend-only: newest `## Check YYYY-MM-DD HH:MM` directly below this header; never rewrite prior sections.
- Baseline conformance is first-class: any divergence from `project-overview.md`, a `modules/{name}.md` contract, a declared quality gate, or the code conventions is a finding — a red flag even when no plan exists.
- Each check: optional Stack Gate as a ≤3-column table; Review Findings as finding-as-section entries.
- Severity values: `critical` · `high` · `medium` · `low` · `info`.
- Plan-bound reviews write to `{PREFIX}-qa-report.md` instead (where `qa-probe-gate.js` enforces them); this standalone report is advisory and does not gate commits.
- Follow `markdown-quality.md § Finding-as-Section Format` and `§ Tables`.

---

## Check YYYY-MM-DD HH:MM — Standalone | {scope}

**Reviewer:** flowcode:code-reviewer-agent
**Scope:** {what was reviewed — e.g. `working tree`, `git diff main...HEAD`, `src/auth/**`}
**Plan:** none | {PREFIX} (context only)
**Baseline conformance:** pass | flagged ({N})
**Gate outcome:** PASS | FAIL | WARN
**Summary:** {1–2 sentence verdict — what is the headline risk and is the change safe to ship?}

### Stack Gate

| Gate | Outcome | Notes |
|------|---------|-------|
| Build | pass / fail / n/a | {tool + command} |
| Lint | pass / fail / n/a | {0 err / 0 warn} |
| Tests | pass / fail / n/a | {count, pass rate} |

### Review Findings

#### Finding 1 — [high] Title

**Files:** `path/to/file.ext:42`, `path/to/other.ext:110-120`

{1–3 sentence description of what is wrong or risky, and why it matters. For a baseline-conformance breach, name the file it diverges from — e.g. "introduces a Redis dependency not listed in `project-overview.md § Dependencies`" or "violates the `auth` module boundary in `modules/auth.md`".}

**Suggested fix:** {What should change — a specific edit, not a platitude.}

**Resolution:** {Filled when addressed, or `deferred — BL-NNN` with the revisit condition. Leave blank until addressed.}

#### Finding 2 — [medium] Title

**Files:** `path/to/file.ext:200`

{Description.}

**Suggested fix:** {fix}

**Resolution:**

{Add more findings as needed.}

---

<!-- Older reviews continue below. New runs are prepended above this line, directly under the file header. Never rewrite prior sections. -->

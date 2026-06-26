---
name: reviews-index
description: Index of all standalone code-review reports produced for this project — one row per ad-hoc /flowcode:review run.
status: active
tags: [review, index, findings]
links: [.flowcode/templates/review-report-template.md, .flowcode/flowcode-index.md]
---

# Reviews Index

- Index of every standalone `/flowcode:review` report in this installation; each row points to a `{slug}-review.md` file.
- Standalone reviews are plan-optional and advisory — plan-bound reviews live in the plan's `{PREFIX}-qa-report.md`, not here.
- Lifecycle (scope resolution, plan detection, prepend-only `## Check` sections, naming) lives in the `flowcode:review` skill and the `flowcode:code-reviewer-agent` sub-agent.
- The table below is the file listing; keep it to one row per review report.

---

| Slug | Scope | Date | Verdict | File |
|------|-------|------|---------|------|

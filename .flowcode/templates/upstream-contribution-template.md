---
name: upstream-contribution-template
description: Row format and composition rules for adding a UC-NNN entry to .flowcode/upstream-contributions.md.
status: active
tags: [template, upstream-contribution, entries, extend]
links: [.flowcode/templates/templates-index.md, .flowcode/upstream-contributions.md]
---

# Upstream Contribution Template

- Use for every new row added to `.flowcode/upstream-contributions.md` — one row per observation.
- Written only by `/flowcode:extend` when a statement is a framework-level improvement for the flowcode source repo.
- The Context cell must be evidence-based (read the target framework file first, cite `file:line`) — a raw user quote is not an entry.
- `## Row Template`, `## Field Rules`, and `## Composition Rules` below define and constrain the entry.

---

## Row Template

| ID | Date | Category | Summary | Context |
|----|------|----------|---------|---------|
| UC-{NNN} | {YYYY-MM-DD} | Bug \| Workflow \| Template-Gap \| Rule-Gap \| Docs \| Other | {1-sentence problem statement — not a solution} | {what the user was doing; what the framework actually did, citing `file:line` refs; what was expected} |

---

## Field Rules

- **ID:** `UC-{NNN}` — next unused integer, zero-padded to 3 digits. **Never reused.** A rejected or folded-in entry keeps its ID forever. Chosen prefix `UC-` to avoid collision with backlog `BL-NNN`.
- **Date:** entry creation date, not last-modified.
- **Category:**
  - `Bug` — framework artifact behaves incorrectly (hook, agent, command, install script)
  - `Workflow` — a lifecycle step is awkward, missing, or out of order (plan phases, gates, handoffs)
  - `Template-Gap` — an artifact type has no template, or the template misses a required field
  - `Rule-Gap` — a rule in `flowcode-rules.md` or a subsystem-specific rules file is missing, wrong, or contradicts itself
  - `Docs` — content error in `flowcode-index.md`, `templates-index.md`, `README.md`, or per-subsystem index files
  - `Other` — does not fit the five above
- **Summary:** one sentence. State the problem, not the solution. Solutions belong upstream in the framework repo's own planning.
- **Context:** this is the heart of the entry. Required contents:
  1. What the user was doing when the observation surfaced
  2. What the framework actually did (cite specific `file:line` references — e.g. `.flowcode/workflow/flowcode-rules.md:42`)
  3. What was expected (if obvious — otherwise omit rather than speculate)
  
  An entry with no `file:line` reference is acceptable only for `Docs` or `Other`. For all other categories the reference is mandatory — it's what makes the entry actionable without follow-up questions.

- **Overflow rule:** if Context would need more than ~3 sentences, put the essential observation in the cell and append a fuller `## UC-{NNN} — {Summary}` subsection under the `## Extended Details` heading at the bottom of `upstream-contributions.md`. Reference it inline in the cell as `see detail UC-{NNN} below`.

---

## Composition Rules (when written by `/flowcode:extend`)

- **Investigate before composing.** Before writing the row, read every target framework file end-to-end. The Context cell cites what was read.
- **No speculation.** If a behavior is unclear, state what was observed and stop there. Do not infer intent from code without evidence.
- **No solutions.** The row records the problem and the evidence, not a proposed fix. Fix design happens upstream, in the framework repo.
- **Preview before apply.** Per the `/flowcode:extend` contract, the composed row is shown to the user for approve/revise/cancel before landing in the file.

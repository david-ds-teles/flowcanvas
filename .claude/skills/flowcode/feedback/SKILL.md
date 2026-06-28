---
name: flowcode:feedback
description: End-of-session feedback loop — analyze the whole session (file changes anywhere + decisions/rules/conventions/gates/memories stated in conversation), extract candidates, classify host-local vs upstream, and present an operator-gated proposal table where each item is applied (made binding) or logged (recorded only). Use whenever a flowcode session wraps up, when the Stop-hook nudges, or when the operator runs /flowcode:feedback — including sessions that changed no files but settled decisions or conventions in conversation.
status: active
tags: [feedback-loop, session-end, knowledge-capture, decisions, extend, upstream, operator-gated]
links: [.claude/commands/flowcode/feedback.md, .claude/commands/flowcode/extend.md, .flowcode/upstream-contributions.md, .flowcode/templates/project-log-template.md, .flowcode/templates/upstream-contribution-template.md]
---

# Feedback Loop

- The single shared definition of the end-of-session extract→stage→decide→apply loop; the `/flowcode:feedback` command runs it and the Stop-hook nudge points here — there is no second copy.
- Captures EVERYTHING the session established — not just `.flowcode/` edits: decisions, decision-gates, rules, conventions, quality gates, memories/knowledge, research, backlog (`BL-NNN`), and upstream contributions (`UC-NNN`) — including items stated only in conversation with no file change.
- Step 1 runs the bundled `scripts/analyze-session.sh` to gather the raw session evidence deterministically; the agent reasons over its output rather than re-deriving the git/log commands each run.
- Each candidate gets a disposition the operator chooses: **apply** (promote to an active framework file — becomes binding) or **log** (record as history, not binding); plus **reject**.
- Reuses `/flowcode:extend` machinery: its routing table picks an applied candidate's target file and its host-local-vs-upstream split decides where it lands.
- Operator-gated: the loop produces a proposal table and writes NOTHING until the operator sets each row's disposition. No silent auto-apply, ever.
- Runs in the MAIN session because the review is conversational — never delegate it to a sub-agent (no return channel to the operator).
- Applied rows honor Template First, append-only logs (newest on top), and no-silent-overwrite of human-authored content.
- Closes with one `[FEEDBACK]` entry in `.flowcode/project/project-log.md` recording what was applied vs logged.

## When To Run

Manually anytime via `/flowcode:feedback`, or when the Stop hook nudges (once per session). Safe to run mid-session — it only proposes; applying is gated. An optional focus arg narrows the sweep (e.g. one module, "rules only", "decisions only").

## Bundled Resources

- `scripts/analyze-session.sh` — read-only evidence gatherer for Step 1. Run it from the host project root; it prints a structured digest (working-tree changes across the whole repo, recent `hooks.log` block/warn lines, and the heads of the active plan log + project log) and writes nothing. Pass an optional focus string as `$1` to echo it into the digest header. It is a *gathering* aid only — every judgment call (what is a candidate, where it routes, apply vs log) stays with the agent in the steps below.

## Procedure

Run all seven steps in the main session, in order. Steps 1–4 are read-only investigation and staging. Nothing touches disk until Step 6, and only for items the operator chose to apply or log.

### 1 — Analyze the whole session

Reconstruct what actually happened — from evidence AND from the conversation (this is the one place the agent's memory of what was agreed is a valid source):

- **Run `scripts/analyze-session.sh`** (bundled with this skill) from the project root to collect the file-evidence in one pass: whole-repo `git status` + `git diff --stat`, recent `block`/`warn` lines from `.flowcode/logs/hooks.log`, and the heads of the active plan log and `project-log.md`. Read its digest before reasoning. If the script is unavailable, fall back to running those commands by hand.
- **The conversation itself** — decisions made, scope calls, and any rule / convention / quality-gate / decision-gate the operator stated, preferences expressed, or fact the operator asked to remember. First-class candidates **even when no file changed** — and invisible to the script, so the agent must supply them.
- **The digest's working-tree changes** — code, config, and framework changes alike, plus the decisions they imply. Read the full `git diff` for any change whose intent the `--stat` line doesn't make obvious.
- **The digest's `hooks.log` lines** — a repeated `block`/`warn` signals a missing host convention or a framework rough edge.
- **The digest's plan/project log heads** — so you don't re-capture what's already recorded.
- Problems hit + workarounds applied, and any step the operator repeated by hand (a recurring manual step is a candidate rule, gate, or tool).

### 2 — Extract candidates by category

For each observation draft one candidate with: `what`, `evidence` (a `file:line` ref OR a concrete session event / quoted decision), and a `proposed target` file:

- **Decision / decision-gate** — an architectural, design, scope, or process decision, or an agreed gate ("before X, require Y"). Often conversation-only.
- **Rule** — a hard `never/always/must` constraint.
- **Convention** — a naming, structure, layout, or style preference.
- **Quality gate / check** — a gate, threshold, lint rule, or code-quality convention to enforce.
- **Memory / knowledge-base fact** — a durable fact, contract change, ownership, or known gap → `project-overview.md` or `modules/{name}.md`.
- **Research finding** — a reusable discovery worth caching under `.flowcode/researches/`.
- **Backlog item** — future work to capture, not do now → `BL-NNN`.
- **Upstream contribution** — a framework-level bug, gap, or friction → `UC-NNN`.

One observation = one candidate; omit anything already recorded. Don't pad.

### 3 — Determine each candidate's target and suggested disposition

For each candidate:

- **Target** — run it through the `/flowcode:extend` routing table (`.claude/commands/flowcode/extend.md § Step 2 — Classify`); do not reinvent it. Host customization → the matching `.flowcode/` file (rules, persona, tools, project-overview, modules, backlog, quality-checks, naming-conventions, git-workflow, workflow, plan-instructions, research). Framework-level → `.flowcode/upstream-contributions.md` as a `UC-NNN`, per `.flowcode/templates/upstream-contribution-template.md`.
- **Suggested disposition** — `apply` when the item is a clear, durable constraint/fact ready to be binding; `log` when it's a decision/context worth recording but not (yet) a binding rule. The operator overrides this in Step 5.

A single observation may split (a host rule + an upstream note on why it was needed) — emit one candidate per target.

### 4 — Present the proposal table

Show the operator one table and apply nothing yet:

| # | category | candidate | target file | suggested |
|---|----------|-----------|-------------|-----------|

- `candidate` — the change in one sentence (its `file:line` / decision evidence available on request).
- `target file` — the exact `.flowcode/` path (or `.flowcode/upstream-contributions.md`).
- `suggested` — `apply` / `log` / `upstream`.

State explicitly that nothing has been written and that each row needs a disposition.

### 5 — Operator sets dispositions

The operator sets the final disposition per row — **apply**, **log**, **upstream**, or **reject** — and may edit the candidate text or retarget it. Apply the operator's edits to the staged candidate before writing. Do not infer a disposition from silence; an un-acted row is left unwritten.

### 6 — Apply per disposition

For each row, by its final disposition:

- **apply** → write it into its target so it becomes active/binding, following `/flowcode:extend § Step 7 — Apply`: Template First (load the matching template first), merge into existing sections (no silent overwrite), append-only logs newest-on-top.
- **log** → record it as a non-binding decision/note: list it in this session's `[FEEDBACK]` log entry (Step 7), and where a natural home exists append it as a dated note rather than a rule (e.g. a module's *Key Insights*, a design's *Deliberations*, or `project-log.md`). Logged items are history, not enforced constraints.
- **upstream** → append the `UC-NNN` row to `.flowcode/upstream-contributions.md` (next unused id; create from template if a legacy install lacks it).
- **reject** → write nothing.

**Index discipline:** if an applied row introduces a new file or changes a file's load type, update the parent `index.md` and `.flowcode/flowcode-index.md` in the same turn.

### 7 — Log the session

Append one `[FEEDBACK]` entry to the TOP of `.flowcode/project/project-log.md`, using the `[FEEDBACK]` format in `.flowcode/templates/project-log-template.md` (append-only, newest on top):

```markdown
## [FEEDBACK] {session label} — {DATE}

**Captured:** {count by category — e.g. 2 decisions, 1 rule, 1 convention, 1 UC}
**Applied:** {target files written/appended, or "none"}
**Logged (not applied):** {one-line list of decisions/notes recorded but not made binding, or "none"}
**Routed upstream:** {UC-NNN ids, or "none"}
**Rejected/deferred:** {one line, or "none"}
```

## Non-Goals

- Do not write or edit any file before Step 6, and never a row the operator did not act on.
- Do not modify source code — this loop only updates `.flowcode/` knowledge + the upstream accumulator.
- Do not run the review in a sub-agent; it must happen in the main session.
- Do not duplicate the routing logic — defer to `/flowcode:extend`; this skill only adds session analysis, the apply-vs-log disposition, and the proposal-table framing on top of it.

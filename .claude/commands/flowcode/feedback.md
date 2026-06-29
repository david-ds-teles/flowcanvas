---
name: flowcode:feedback
description: Slash command that runs the feedback-loop skill in the main session — analyze the whole session (file changes anywhere + decisions/rules/conventions/gates/memories from conversation), stage candidates, classify host-local vs upstream, present an operator-gated proposal table, and apply or log each item per the operator's disposition.
status: active
tags: [command, feedback-loop, session-end, decisions, operator-gated]
argument-hint: "[optional focus area]"
links: [.flowcode/upstream-contributions.md, .flowcode/templates/project-log-template.md]
---

# /flowcode:feedback

- Thin entry point: it loads and runs the `flowcode:feedback` skill — the procedure lives in the skill, not here.
- Captures the WHOLE session into durable flowcode knowledge — decisions, rules, conventions, quality gates, memories, research, `BL-NNN` — including items stated only in conversation; queues framework-worthy findings upstream as `UC-NNN`.
- Each item gets a disposition you choose: **apply** (promote to an active framework file — binding) or **log** (record as history only); plus reject.
- Reuses `/flowcode:extend` classification and apply machinery; it does not reinvent routing or the host-local-vs-upstream split.
- Executes in the MAIN session — it must converse with you for per-row dispositions; never a sub-agent.
- Operator-gated: nothing is written until you set each row's disposition.
- Invoke manually anytime; this is also what the Stop-hook nudge reminds you to run.

---

## Usage

```text
/flowcode:feedback                 # sweep the full session
/flowcode:feedback <focus area>    # scope the sweep (e.g. "rules only", "decisions only", "auth module")
```

Examples:

- `/flowcode:feedback` — end-of-session wrap-up; analyze everything (changes + decisions) and propose captures.
- `/flowcode:feedback rules only` — restrict the sweep to rule/convention candidates.
- `/flowcode:feedback the auth module` — focus on one module's decisions, KB, and contract changes.

---

## What This Does

1. Loads the `flowcode:feedback` skill and runs its seven-step procedure in the main session.
2. Analyzes the WHOLE session — `git` diff across the repo, `hooks.log`, plan/project logs, AND decisions/rules/conventions/gates stated in conversation (even with no file change).
3. Extracts candidates by category (decisions, rules, conventions, quality gates, memories, research, backlog, upstream) and classifies each host-local vs upstream via the `/flowcode:extend` routing table.
4. Presents an operator-gated proposal table and writes nothing until you set each row's disposition (apply / log / upstream / reject).
5. Applies each row per its disposition — apply (binding) or log (history) — then appends a `[FEEDBACK]` entry to `.flowcode/project/project-log.md` recording what was applied vs logged.

---

## Prompt

You are running the end-of-session feedback loop.

Run the `flowcode:feedback` skill and execute its procedure end-to-end in the **main session**. Treat `$ARGUMENTS`, if present, as a focus hint that scopes which session signals and categories to emphasize (e.g. "rules only", "decisions only", "just the auth module"); otherwise sweep the full session — file changes anywhere in the repo AND decisions/rules/conventions/gates/memories established in conversation.

The review is conversational — present the proposal table and wait for the operator's per-row disposition (apply / log / upstream / reject). Never delegate it to a sub-agent: sub-agents have no return channel to the operator. Write each row per its disposition (apply = make binding in its target file; log = record as history), then append the `[FEEDBACK]` entry to `.flowcode/project/project-log.md` per `.flowcode/templates/project-log-template.md`.

---

## Non-Goals

- Do not implement the procedure inline — the skill is the single source of truth; this command only invokes it.
- Do not write any file before the operator sets dispositions, and never a row they did not act on.
- Do not modify source code; this loop only updates `.flowcode/` knowledge and the upstream accumulator.
- Do not run the review conversation in a sub-agent.

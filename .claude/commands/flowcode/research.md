---
name: flowcode:research
description: Standalone slash command to run a research-and-exploration session — resolve one or more scoped questions against authoritative external sources, cache-first, and produce/update `{slug}-research.md`. Runs the `flowcode:research` skill; no plan required.
status: active
tags: [command, research, exploration, cache, standalone]
argument-hint: "<research question> [; another independent question]"
links: [.claude/skills/flowcode/research/SKILL.md, .flowcode/researches/researches-index.md, .flowcode/templates/research-template.md]
---

# /flowcode:research

- Thin entry point: loads and runs the shared `flowcode:research` skill at `.claude/skills/flowcode/research/SKILL.md` — the procedure lives in the skill, not here.
- **Standalone, no plan required** — answer any external unknown on demand; the finding is cached for every later phase to reuse.
- **Cache-first:** reads `.flowcode/researches/researches-index.md` before any fetch; a fresh `complete` hit is returned as-is, never re-fetched.
- Splits a multi-part request into independent scoped questions and dispatches the `flowcode:researcher-agent` (haiku) for each — in parallel.
- Each answer lands in `.flowcode/researches/{slug}-research.md` (new) or as a `## Update YYYY-MM-DD` append (existing), with every source cited.

## Usage

```text
/flowcode:research <question>                          # one scoped question
/flowcode:research <q1> ; <q2> ; <q3>                  # independent questions → parallel dispatch
```

Examples:

- `/flowcode:research does Postgres LISTEN/NOTIFY survive a connection pool like PgBouncer in transaction mode?`
- `/flowcode:research current stable API for the Stripe usage-based billing meter ; recommended idempotency-key strategy for webhooks`
- `/flowcode:research what are the rate limits and backoff guidance for the GitHub REST API in 2026?`

## What This Does

1. Loads the `flowcode:research` skill and runs its procedure standalone.
2. Scopes the request into one or more decision-ready questions.
3. Checks the research cache first; returns a fresh hit without re-fetching.
4. Dispatches `flowcode:researcher-agent` per question (parallel for independent ones), preferring official primary sources.
5. Relays the consolidated, decision-ready findings with artifact paths and any open questions.

## Prompt

You are running a research session on demand.

Load `.claude/skills/flowcode/research/SKILL.md` and execute its procedure. Treat `$ARGUMENTS` as the request: split it into independent scoped questions (a `;` or an explicit "and" between distinct unknowns usually marks a split). Check `.flowcode/researches/researches-index.md` before any fetch, dispatch `flowcode:researcher-agent` for each question that needs fetching (parallel when independent), and relay the consolidated findings. Do not re-fetch a fresh `complete` cache hit.

## Non-Goals

- Do not implement the procedure inline — the skill is the single source of truth; this command only invokes it.
- Do not re-research a fresh cache hit — return it as-is.
- Do not produce design or planning output — research yields facts, not architecture.
- Do not write outside `.flowcode/researches/`, and never source code.

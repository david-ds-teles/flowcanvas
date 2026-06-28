---
name: flowcode:docs
description: Run a documentation-reference session — explore a technology's official documentation and distill token-efficient `references/docs/{tech-slug}.md` references a code agent learns from, cache-first. Use to gather the whole project stack (no args), one technology (`<tech>`), or lazily the first time work touches a stack technology with no cached reference. Both ad-hoc via `/flowcode:docs` and as the silent reference-gather the consult-every-time rule leans on.
status: active
tags: [docs, references, documentation, distill, cache, stack, standalone]
links: [.claude/agents/flowcode/docs-researcher-agent.md, .flowcode/references/references-index.md, .flowcode/templates/doc-reference-template.md, .claude/commands/flowcode/docs.md, .flowcode/project/project-overview.md, .flowcode/quality-checks/markdown-quality.md]
---

# Documentation Reference Session

- The operator-facing playbook for turning a technology's official docs into cached, distilled references a code agent follows; runs `flowcode:docs-researcher-agent` (sonnet) as the worker and owns scoping, parallelism, and cache discipline.
- Two surfaces, one engine: standalone via `/flowcode:docs`, and the silent reference-gather the consult-every-time rule triggers the first time work touches a stack technology with no cached reference.
- **Cache-first, always:** read `.flowcode/references/references-index.md` before any fetch — a fresh `current` reference at the in-scope version is returned as-is, never re-gathered.
- Three modes: **no args** → read `project-overview.md § Technology Stack` and fan out one researcher per technology; **`<tech>`** → gather one; **lazy** → gather the single technology just touched.
- One technology per researcher dispatch, one reference written or updated; **independent technologies dispatch in parallel** — gathering them sequentially is a parallelism breach.
- Existing reference → the researcher runs in update mode (`## Update YYYY-MM-DD` append, version re-pin), never overwriting prior content.
- Output is decision-ready and distilled — each `references/docs/{tech-slug}.md` carries a ≤10-bullet summary plus Setup → Core Concepts → Idioms → Anti-Patterns → Project-Relevant API → Version Notes → Sources; the index row reflects current state.
- Writes nothing outside `.flowcode/references/`; never touches source code.

## When To Use

Use whenever a code agent must work with a technology from `project-overview.md § Technology Stack` and there is no fresh, distilled reference for it yet. Three ways in:

- **Whole stack:** `/flowcode:docs` (no args) — gather references for every technology in the stack, in parallel. Run after bootstrap, or whenever the stack moved.
- **One technology:** `/flowcode:docs <tech>` — gather or refresh one (e.g. after a version bump).
- **Lazy (silent):** the consult-every-time rule (`flowcode-rules.md § Consult References`) dispatches this the first time work touches a stack technology whose reference is missing or `stale`, before coding.

Not for: ad-hoc external facts or "use X or Y?" decisions — that is `flowcode:research` (question-driven cache). This skill builds the persistent, technology-keyed reference the agent re-consults every time.

## Procedure

### 1 — Resolve the technologies in scope

- **No args:** read `.flowcode/project/project-overview.md § Technology Stack`; each non-empty row (language, framework, datastore, etc.) is one technology with its declared version.
- **`<tech>` given:** that single technology (resolve its version from the stack table when listed).
- **Lazy entry:** the single technology the current work touches.

Split a multi-technology request into independent per-technology gathers; each becomes its own researcher dispatch and its own `references/docs/{tech-slug}.md`.

### 2 — Check the cache first

Read `.flowcode/references/references-index.md`. For each technology:

- **Fresh `current` hit at the in-scope version** → return that reference's summary as the answer. Do not dispatch, do not fetch. Say it came from cache.
- **`stale`, or the pinned version no longer matches the stack** → dispatch in **update mode** against the existing file.
- **No hit** → dispatch in **new mode**.

Re-gathering what the cache already holds fresh is a framework breach — this step is mandatory before any dispatch.

### 3 — Dispatch the docs researcher

For every technology that needs gathering, dispatch `flowcode:docs-researcher-agent` (sonnet). **Dispatch independent technologies in parallel** — one agent per technology, all in the same turn (batches of ~6 for large stacks). Pass each agent its single technology, the in-scope version, and whether it is `new` or `update` mode against a named file.

The agent owns Template First (`doc-reference-template.md`), distillation, append-only update semantics, source citation, and the index row update — this skill scopes and parallelizes, the agent gathers and distills.

### 4 — Relay the references

Collect each researcher's report (`Mode / Status / Version / Key idioms / File / Open questions`) and relay a consolidated answer: the key idioms per technology, the reference path(s), and any open question. For a lazy/in-framework caller, hand back the `references/docs/{tech-slug}.md` path so coding proceeds against the distilled reference.

## References

| File | Use |
|------|-----|
| `.claude/agents/flowcode/docs-researcher-agent.md` | The worker — official-docs distill + cache-first write/update of one `references/docs/{tech-slug}.md`; sonnet |
| `.flowcode/references/references-index.md` | Cache index — read before every dispatch; the researcher updates the row on completion |
| `.flowcode/references/docs/{tech-slug}.md` | Individual distilled references — read a fresh `current` hit instead of re-gathering |
| `.flowcode/templates/doc-reference-template.md` | Reference structure (Setup → Core Concepts → Idioms → Anti-Patterns → Project-Relevant API → Version Notes → Sources); the researcher reads it before writing |
| `.flowcode/project/project-overview.md` | Source of the stack + versions that drives which references to gather |
| `.flowcode/quality-checks/markdown-quality.md` | Markdown rules the reference must satisfy |

## Non-Goals

- Do not re-gather a fresh `current` cache hit — return it as-is.
- Do not write or edit anything outside `.flowcode/references/`, and never source code.
- Do not gather independent technologies sequentially — parallel dispatch is mandatory.
- Do not answer "use X or Y?" decisions or ad-hoc facts — that is `flowcode:research`; this skill builds persistent per-technology references.
- Do not dump raw documentation — the reference is distilled; reimplementing the researcher's fetch/distill here is out of scope.

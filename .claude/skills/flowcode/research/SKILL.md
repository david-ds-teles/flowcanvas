---
name: flowcode:research
description: Run a standalone research-and-exploration session — resolve one or more scoped questions against authoritative external sources, cache-first, and produce/update `{slug}-research.md` artifacts. Use whenever a decision needs facts the repo doesn't already hold (a library API, protocol, version/compatibility matrix, config option, best practice) — both ad-hoc via `/flowcode:research` and as the silent context-gather other phases lean on.
status: active
tags: [research, exploration, web-fetch, cache, sources, standalone]
links: [.flowcode/researches/researches-index.md, .flowcode/templates/research-template.md, .flowcode/quality-checks/markdown-quality.md]
---

# Research Session

- The operator-facing playbook for resolving external unknowns into cached, citable findings; runs the `flowcode:researcher-agent` agent (haiku) as the worker and owns scoping, parallelism, and cache discipline around it.
- Two surfaces, one engine: standalone via `/flowcode:research <question>` (no plan needed) and the silent context-gather the design/brainstorm session and the designer agent dispatch when they hit a tech they don't already know.
- **Cache-first, always:** read `.flowcode/researches/researches-index.md` before any fetch — a fresh `complete` hit is returned as-is, never re-fetched (re-researching a cached fact is wasted tokens and a framework breach).
- One question per researcher dispatch, one artifact written or updated; **independent questions dispatch in parallel** — running them sequentially is a parallelism breach.
- Existing file → the researcher runs in update mode (`## Update YYYY-MM-DD` append), never overwriting prior findings or spawning a `-v2` sibling.
- Output is decision-ready: each `{slug}-research.md` carries Summary → Findings → Conclusions → Caveats → Raw Sources, every URL + version + access date cited; the index row reflects current state.
- Prefers official primary sources (vendor docs, RFCs, source repos); secondary sources require corroboration.
- Writes nothing outside `.flowcode/researches/`; never touches source code.

## When To Use

Use whenever the next good decision depends on a fact the codebase and `project-overview.md` don't already answer: an external library's real API or limits, a protocol or spec detail, a version/compatibility matrix, a config option's behavior, a current best practice. Two ways in:

- **Standalone:** `/flowcode:research <question>` — ad-hoc, anytime, no plan required. The finding lands in the cache for every later phase to reuse.
- **In-framework (silent):** the design session (`flowcode:design`) and the `flowcode:designer-agent` agent invoke this to fill a knowledge gap before writing a design. Same engine, same cache.

Not for: questions answerable from the repo itself (read the code or `project-overview.md` first), and not for design or planning decisions — research produces facts, not architecture.

## Procedure

### 1 — Scope the question(s)

State each research question as one decision-ready line — the specific answer a downstream decision needs, not a broad topic. If a request bundles several independent unknowns (e.g. "auth library AND rate-limit strategy AND queue durability"), split it into separate scoped questions; each becomes its own researcher dispatch and its own `{slug}-research.md`. If a request is really one question with sub-parts, keep it as one.

### 2 — Check the cache first

Read `.flowcode/researches/researches-index.md`. For each scoped question:

- **Fresh `complete` hit** → return that file's Summary + Recommendations as the answer. Do not dispatch, do not fetch, do not write. Say it came from cache.
- **`partial` or `stale` hit** → dispatch in **update mode** targeting the existing file.
- **No hit** → dispatch in **new mode**.

Asking the web what the cache already answers is a framework breach — this step is mandatory before any dispatch.

### 3 — Dispatch the researcher

For every question that needs fetching, dispatch `flowcode:researcher-agent` (haiku). **Dispatch independent questions in parallel** — one agent per question, all in the same turn. Pass each agent its single scoped question and whether it is `new` or `update` mode against a named file. The agent runs index-first internally too, fetches the minimum authoritative source set, and writes exactly one artifact.

The agent owns Template First (`research-template.md`), append-only update semantics, source citation, and the index row update — do not duplicate that work here; this skill scopes and parallelizes, the agent researches.

### 4 — Relay the findings

Collect each researcher's report (`Mode / Status / Key finding / File / Open questions`) and relay a consolidated, decision-ready answer to the caller — the key finding per question, the artifact path(s), and any open question that should gate the next step. For an in-framework caller, hand back the `{slug}-research.md` paths so the design/plan can cite them in its Research References section.

## References

| File | Use |
|------|-----|
| `flowcode:researcher-agent` | The worker — scoped fetch + cache-first write/update of one `{slug}-research.md`; haiku |
| `.flowcode/researches/researches-index.md` | Cache index — read before every dispatch; the researcher updates the row on completion |
| `.flowcode/researches/{slug}-research.md` | Individual cached findings — read a fresh `complete` hit instead of re-fetching |
| `.flowcode/templates/research-template.md` | Artifact structure (Summary → Findings → Conclusions → Caveats → Raw Sources); the researcher reads it before writing |
| `.flowcode/quality-checks/markdown-quality.md` | Markdown rules the artifact must satisfy |

## Non-Goals

- Do not re-research a fresh `complete` cache hit — return it as-is.
- Do not write or edit anything outside `.flowcode/researches/`, and never source code.
- Do not run independent questions sequentially — parallel dispatch is mandatory.
- Do not produce design or planning output — research yields facts; architecture is the design session's job.
- Do not reimplement the researcher's fetch/write/cite procedure here — dispatch the agent; this skill only scopes, parallelizes, and relays.

---
name: flowcode:docs
description: Standalone slash command to run a documentation-reference session — explore a technology's official docs and distill token-efficient `references/docs/{tech-slug}.md` references, cache-first. Runs the `flowcode:docs` skill; no plan required.
status: active
tags: [command, docs, references, documentation, cache, standalone]
argument-hint: "[technology] [; another technology]"
links: [.flowcode/references/references-index.md, .flowcode/templates/doc-reference-template.md, .flowcode/project/project-overview.md]
---

# /flowcode:docs

- Thin entry point: loads and runs the shared `flowcode:docs` skill — the procedure lives in the skill, not here.
- **Standalone, no plan required** — gather distilled references for the stack on demand; each reference is cached for every later phase (and the consult-every-time rule) to reuse.
- **Cache-first:** reads `.flowcode/references/references-index.md` before any fetch; a fresh `current` reference at the in-scope version is returned as-is, never re-gathered.
- **No args** → reads `project-overview.md § Technology Stack` and fans out one `flowcode:docs-researcher-agent` (sonnet) per technology, in parallel. **`<tech>`** → gathers/refreshes one.
- Each reference lands in `.flowcode/references/docs/{tech-slug}.md` (new) or as a `## Update YYYY-MM-DD` append (existing), version-pinned, every source cited.

## Usage

```text
/flowcode:docs                                # gather the whole stack from project-overview, in parallel
/flowcode:docs <technology>                   # one technology
/flowcode:docs <tech-a> ; <tech-b>            # independent technologies → parallel dispatch
```

Examples:

- `/flowcode:docs` — gather references for every technology in the project stack
- `/flowcode:docs react 19` — gather (or refresh) the React 19 reference
- `/flowcode:docs spring-boot ; postgres ; redis` — three independent references in parallel

## What This Does

1. Loads the `flowcode:docs` skill and runs its procedure standalone.
2. Resolves the technologies in scope (the whole stack with no args, else the named ones).
3. Checks the references cache first; returns a fresh `current` hit without re-gathering.
4. Dispatches `flowcode:docs-researcher-agent` per technology (parallel for independent ones), preferring official primary sources.
5. Relays the consolidated key idioms with reference paths and any open questions.

## Prompt

You are running a documentation-reference session on demand.

Run the `flowcode:docs` skill and execute its procedure. Treat `$ARGUMENTS` as the request: with no arguments, read `.flowcode/project/project-overview.md § Technology Stack` and gather a reference per technology; otherwise split `$ARGUMENTS` into independent technologies (a `;` marks a split). Check `.flowcode/references/references-index.md` before any fetch, dispatch `flowcode:docs-researcher-agent` for each technology that needs gathering (parallel when independent), and relay the consolidated references. Do not re-gather a fresh `current` cache hit.

## Non-Goals

- Do not implement the procedure inline — the skill is the single source of truth; this command only invokes it.
- Do not re-gather a fresh cache hit — return it as-is.
- Do not answer ad-hoc "use X or Y?" facts — that is `/flowcode:research`; this builds persistent per-technology references.
- Do not write outside `.flowcode/references/`, and never source code.

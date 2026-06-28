---
name: {tech-slug}
description: Distilled official-documentation reference for {Technology} {version} — setup, idioms, gotchas, and the project-relevant API surface a code agent must follow.
status: current
tags: [reference, docs, {tech-slug}]
links: [.flowcode/references/references-index.md]
---

# {Technology} Reference

- {What it is + the one-line mental model — e.g. "React 19: declarative UI via function components + hooks; Server Components are the App-Router default."}
- Pinned version: {version}; gathered {DATE}. Status {current|stale}.
- Top idioms: {the 3–5 highest-leverage "do it this way" rules for this project}.
- Sharpest gotchas: {the 2–3 mistakes this stack punishes — the ones worth the every-time reminder}.
- Official sources: {root docs URL(s)}.

---

## Setup & Tooling

{Install, package manager, CLI, project config, and the build/test/run commands. Only what this project needs — not the full tooling catalog.}

## Core Concepts

{The mental model an agent must hold to write correct code — concepts, lifecycle, data flow. Distilled, not transcribed.}

## Idioms & Best Practices

{The right way to do the common tasks, each as a decision-ready "Use X for Y" line with a short snippet where it clarifies.}

```{language}
{minimal idiomatic example}
```

## Anti-Patterns & Gotchas

{What to avoid and why — deprecated APIs, footguns, version-specific traps the official docs call out.}

## Project-Relevant API Surface

{Only the APIs/modules THIS project uses, narrowed from the full surface — signature + one-line purpose each. Not the whole API.}

## Version Notes

{Pinned version, breaking changes to watch, the next-version migration to expect, and when to re-gather (the condition that flips this reference to `stale`).}

## Official Sources

| Source | URL | Section |
|--------|-----|---------|
| | | |

## Update Discipline (append-only)

Distill to a focused reference, not a doc mirror. Never overwrite prior content on revisit: append a `## Update YYYY-MM-DD` section, re-pin the version, flip the top-of-file `status:` (`current` or `stale`), and refresh the `references-index.md` row.

### Example

```markdown
## Update 2026-07-01

**Trigger:** {Technology} {new version} released; reference was pinned to {old version}.

**Changes:**
- {What changed in the idioms / API surface the project relies on.}

**Verdict:** {current|stale} — {what a code agent must now do differently}.
```

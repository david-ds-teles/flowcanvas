---
name: flowcode:contributors
description: Read-only developer-attribution report — reads the `**Dev:**` field stamped on every plan-log and project-log entry and rolls it up to answer who did what. Use when someone asks who built a feature, what changes a given developer made, or what fixes a developer shipped in some area. Filters by developer / `--me`, feature prefix, type (fix vs feature), and area keyword. Reports only; never writes.
status: active
tags: [attribution, contributors, reporting, multi-dev, read-only]
links: [.flowcode/plans/plan-instructions.md, .flowcode/templates/plan-log-template.md, .flowcode/templates/project-log-template.md]
---

# Contributors Report

- Answers "who did what" by reading the `**Dev:**` attribution that every log entry carries — there is no separate ownership store to maintain.
- Data sources: per-plan logs `.flowcode/plans/*/*-log.md` (`[PLAN CREATED]`, `[PHASE]`, `[PLAN COMPLETE]`) and the project log `.flowcode/project/project-log.md` (`[PLAN COMPLETE]`, `[BOOTSTRAP]`, `[BUGFIX]`, `[QUICKFIX]`, `[MIGRATION]`, `[FEEDBACK]`).
- Each entry resolves to `{dev, type, feature, date, title, files}`; filters compose over that shape.
- Strictly read-only: gather, parse, group, present. It never writes, edits, or reorders the logs.
- Runs in the main session and prints the report directly; no sub-agent (the output is conversational).

## When To Run

On demand via `/flowcode:contributors`, whenever someone needs an attribution rollup — "who built feature X", "everything David touched", "what fixes Valkyrie shipped in auth". Safe anytime; it only reads.

## Inputs

Parse the arguments (all optional, all composable):

- **`<dev>`** — a developer name or handle; case-insensitive substring match against the whole `Dev:` value (so `david` matches `David Teles <david@acme.dev>`).
- **`--me`** — resolve the current identity and use it as `<dev>`. Take it from the SessionStart banner's `Acting as Dev:` line already in context; if absent, resolve it the same way the hook does — `FLOWCODE_DEV`, else `git config user.name` + `git config user.email`, else `unknown`.
- **`--feature <prefix>`** — restrict to one plan: its log `.flowcode/plans/<prefix>/<prefix>-log.md` plus any project-log entry whose title/`Related` names `<prefix>`.
- **`--type fix|feature`** — `fix` = `[BUGFIX]` + `[QUICKFIX]`; `feature` = plan work (`[PLAN CREATED]`, `[PHASE]`, `[PLAN COMPLETE]`).
- **`--area <keyword>`** — case-insensitive match against the entry's title, `Files`/`Affected`, and `Built` text.

No arguments → report all developers grouped by identity.

## Procedure

### 1 — Gather attributed entries

Find every attributed entry in one pass, then read the matched files for context:

```bash
# All Dev: lines with file + line number (the index of attributed entries)
grep -rn '^\*\*Dev:\*\*' .flowcode/plans/*/*-log.md .flowcode/project/project-log.md 2>/dev/null

# The entry headings, to pair each Dev: with its tag/title/date
grep -rn '^## \[' .flowcode/plans/*/*-log.md .flowcode/project/project-log.md 2>/dev/null
```

Read the log files that have matches and parse each entry block (one `## [TAG] …` heading to the next) into:

- **dev** — the `**Dev:**` value (or `unknown` if the entry has none — legacy entries predate attribution; report them as `unknown`, never guess).
- **type** — from the tag: `[BUGFIX]`/`[QUICKFIX]` → `fix`; `[PLAN CREATED]`/`[PHASE]`/`[PLAN COMPLETE]` → `feature`; `[BOOTSTRAP]`/`[MIGRATION]`/`[FEEDBACK]` → `ops`.
- **feature** — the plan PREFIX: the owning folder name for plan-logs; for project-log entries, the `{PREFIX}` in the heading or the `Related:` field, else `—`.
- **date** — the `— {DATE}` in the heading.
- **title** — the heading text after the tag.
- **files** — the `Files:` / `Affected:` field if present, else `—`.

### 2 — Filter

Apply every supplied filter (AND): `<dev>`/`--me` on dev, `--feature` on feature, `--type` on type, `--area` on title+files+built. Drop entries that fail any.

### 3 — Present

Pick the framing that fits the query and state the filters applied + the source files scanned:

- **By developer** (default, or a `<dev>` query) — one section per developer, newest first:

  ```text
  David Teles <david@acme.dev>
    feature  CMP-234  Phase 2 Checkout API           2026-06-20  src/api/checkout.ts, …
    fix      —        [QUICKFIX] Bump DB pool          2026-06-18  config/database.ts
  ```

- **By feature** (`--feature <prefix>`) — who created it, who executed each phase, who closed it:

  ```text
  CMP-234 — Checkout
    created   David Teles    2026-06-15
    Phase 1   Valkyrie       2026-06-17
    Phase 2   David Teles    2026-06-20
    complete  David Teles    2026-06-21
  ```

- **Fix list** (`--type fix`) — flat, newest first: `date · dev · title · files`.

Close with a one-line tally (e.g. "David Teles: 1 feature phase, 1 quickfix"). If a filter matched nothing, say so plainly and name the filter that excluded everything. If any matched entries were `unknown`, note the count so the gap in legacy attribution is visible rather than silently dropped.

## Non-Goals

- Do not write, edit, or reorder any file — reporting only.
- Do not guess attribution for entries without a `Dev:` field — report them as `unknown`.
- Do not read source code or git history to reconstruct authorship; the `Dev:` fields are the single source. (For committed-code authorship at line granularity, that is what `git blame` is for — out of scope here.)

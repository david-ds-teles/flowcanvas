---
name: flowcode:contributors
description: Slash command that runs the contributors skill in the main session — reads the `Dev:` attribution stamped on plan-log and project-log entries and reports who did what, filtered by developer, feature, type (fix vs feature), or area. Answers questions like "who built feature X?", "show all changes by David", "what fixes did Valkyrie ship in the auth module?".
status: active
tags: [command, attribution, contributors, reporting, multi-dev]
argument-hint: "[dev] [--me] [--feature <prefix>] [--type fix|feature] [--area <keyword>]"
links: [.flowcode/plans/plan-instructions.md, .flowcode/templates/plan-log-template.md, .flowcode/templates/project-log-template.md]
---

# /flowcode:contributors

- Thin entry point: it loads and runs the `flowcode:contributors` skill — the procedure lives in the skill, not here.
- Read-only attribution report: rolls up the `**Dev:**` field that every log entry carries (plan-logs + `project-log.md`) to answer who designed, executed, or fixed what.
- Filters compose: a developer name/handle, `--me` (the current identity), `--feature <prefix>`, `--type fix|feature`, and `--area <keyword>` narrow the rollup.
- Reads only — it never writes, never edits source, never touches the logs it reports on.
- Runs in the MAIN session so it can present the report conversationally.

---

## Usage

```text
/flowcode:contributors                      # everyone, grouped by developer
/flowcode:contributors --me                 # just my contributions (current Acting-as-Dev identity)
/flowcode:contributors David                # everything David did (plans, phases, fixes)
/flowcode:contributors --feature CMP-234    # who built feature CMP-234 (creator + phase executors + closer)
/flowcode:contributors Valkyrie --type fix --area auth   # fixes Valkyrie shipped touching "auth"
```

Filters combine: `<dev>` / `--me` (who), `--feature <prefix>` (which plan), `--type fix|feature` (fixes = `[BUGFIX]`/`[QUICKFIX]`; features = plan work), `--area <keyword>` (match against entry title / Files / Affected / Built).

---

## What This Does

1. Loads the `flowcode:contributors` skill and runs its read-only rollup in the main session.
2. Gathers every `**Dev:**`-stamped entry from `.flowcode/plans/*/*-log.md` and `.flowcode/project/project-log.md`.
3. Parses each entry into `{dev, type, feature, date, title, files}` and applies the requested filters.
4. Presents a grouped report — by developer, by feature, or a flat fix list — depending on the query.

---

## Prompt

You are running the contributors attribution report.

Run the `flowcode:contributors` skill and execute its procedure in the **main session**. Parse `$ARGUMENTS` for the optional developer name/handle, `--me`, `--feature <prefix>`, `--type fix|feature`, and `--area <keyword>` filters; with no arguments, report all developers grouped by identity. This is a read-only report — gather and present, write nothing.

---

## Non-Goals

- Do not implement the rollup inline — the skill is the single source of truth; this command only invokes it.
- Do not write or edit any file — this is a reporting surface only.
- Do not infer attribution beyond the recorded `Dev:` fields; entries without one are reported as `unknown`, not guessed.

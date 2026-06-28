---
name: flowcode:migrate
description: The supported upgrade path — runs the deterministic delta engine (migrate-plan.js) to bring an existing install to the current framework spec by touching only the files that changed, and dispatches flowcode:migrator-agent only when there is judgment work (a host edit to harvest or a non-inferable Migration block).
status: active
tags: [migrate, upgrade, delta, manifest, command]
links: [.claude/agents/flowcode/migrator-agent.md, .flowcode/changelog.md, framework-manifest.json]
argument-hint: "[--source <path>] [--force] [--dry-run]"
---

# /flowcode:migrate

- The supported **UPGRADE** path for an already-installed flowcode. First-time install is still `flowcode-install.js` — this command does not bootstrap a fresh project.
- **Delta-driven, not a per-file sweep.** It runs `migrate-plan.js`, which diffs the installed `install-manifest.json` against the framework's shipped `framework-manifest.json` (per-file sha256) and touches **only** the framework files that changed / were added / were removed.
- **No LLM in the common case.** The deterministic work (diff, copy changed files, merge hooks, restamp) is a script. The `flowcode:migrator-agent` sub-agent is dispatched **only** when there is judgment work — a host-edited framework file to harvest, or an applied version with a `**Migration**` block. A clean upgrade spends no sub-agent tokens at all.
- **Host work is never touched.** The delta is computed over framework-owned files only; a host edit to a framework file is harvested as a `UC-NNN` proposal before that file is overwritten or removed.
- **Legacy fallback.** An install whose manifest has no `version`/`sha256` (or a source shipping no `framework-manifest.json`) can't be diffed → `migrate-plan.js` reports `mode: full-convergence` and the migrator-agent runs the old full sweep, once.
- Args: `--source <path>` (framework repo to migrate against; defaults to the manifest `source`), `--force` (re-apply every framework file even if versions match), `--dry-run` (report the plan, write nothing).

---

## Usage

```text
/flowcode:migrate
/flowcode:migrate --source ~/dev/flowcode/flowcode
/flowcode:migrate --dry-run
/flowcode:migrate --force
```

| Arg | Effect |
|-----|--------|
| `--source <path>` | Framework source repo to migrate against (the directory holding `framework-manifest.json` + the framework files). Defaults to the `source` recorded in `.flowcode/install-manifest.json`. Pass this when the framework repo has moved. |
| `--force` | Re-apply every framework file even when the installed `version` already equals the framework version (diff against an empty baseline). |
| `--dry-run` | Compute and print the full plan (added/changed/removed/host-edited counts and file lists) but write nothing. |

First-time setup is **not** this command — run `node flowcode/flowcode-install.js` (or the `flowcode.sh` / `flowcode.cmd` launcher). Use `/flowcode:migrate` only to upgrade an existing `.flowcode/` install.

---

## What This Does

1. Runs `node <source>/migrate-plan.js --root <project-root> --source <source>` (a pure Node script) and reads its JSON plan: `mode`, `from`/`to`, `added/changed/removed`, `hostEditedFiles`, `versionsApplied`, `versionsWithMigration`, `needsAgent`, `upToDate`.
2. Decides, from the plan, whether any LLM work is needed (`needsAgent`) — host edits to harvest, a `**Migration**` block to apply, or the legacy full-convergence fallback.
3. **No-LLM path** (clean delta): copies the changed/added files, removes dropped files, merges new hooks, and restamps the manifest — all via `migrate-plan.js --apply --merge-hooks --restamp`.
4. **Agent path** (judgment needed): dispatches `flowcode:migrator-agent`, which harvests host edits as `UC-NNN`, applies `**Migration**` transforms, then applies/restamps.
5. Logs a `[MIGRATION]` entry to `project/project-log.md` and reports what changed (`from → to`, counts, harvested `UC-NNN` ids).

---

## Prompt

You are running the flowcode upgrade. Parse `$ARGUMENTS` for `--source`, `--force`, `--dry-run`.

### Step 1 — Compute the plan (deterministic, no sub-agent)

Resolve the framework source: the `--source` value if given, else the `source` field in `.flowcode/install-manifest.json`. Run, from the project root:

```bash
node <source>/migrate-plan.js --root <project-root> --source <source> --dry-run [--force]
```

Parse the JSON it prints. (If `migrate-plan.js` is not found at `<source>`, the source is too old to migrate against — tell the user to point `--source` at a current framework checkout.)

### Step 2 — Branch on the plan

- **`mode == "full-convergence"`** → this is a legacy/pre-baseline install. Dispatch the `flowcode:migrator-agent` sub-agent (model **sonnet**) with the parsed flags; it runs the full-convergence fallback. Then go to Step 4.
- **`upToDate == true` and not `--force`** → report `"Already up to date (version <to>)"` and stop.
- **`needsAgent == true`** (host-edited framework files, or `versionsWithMigration` non-empty) → dispatch the `flowcode:migrator-agent` sub-agent (model **sonnet**) with the parsed flags. It harvests host edits, applies `**Migration**` transforms, then applies + restamps. Then go to Step 4.
- **Otherwise (clean delta, `needsAgent == false`)** → run the **no-LLM path** in Step 3.

### Step 3 — No-LLM apply (clean delta only)

Do **not** spawn a sub-agent. If `--dry-run`, print the plan and stop. Otherwise run:

```bash
node <source>/migrate-plan.js --root <project-root> --source <source> --apply --merge-hooks --restamp [--force]
```

This copies the added/changed framework files, removes any dropped ones, merges new hook registrations into `.claude/settings.json`, and restamps `install-manifest.json` to the new version.

### Step 4 — Log and report

Append a `[MIGRATION]` entry to the top of `.flowcode/project/project-log.md` (below the header), following `project-log-template.md` if a `[MIGRATION]` shape exists there, else:

```markdown
## [MIGRATION] {from} → {to} — {DATE}

**Changed:** {N} framework files (added {A}, changed {C}, removed {R})
**Harvested:** {host edits captured as UC-IDs, or "none"}
**Hooks merged:** {count, or "none"}
**Mode:** {delta | full-convergence}

---
```

Then report to the user: the `from → to` version, the added/changed/removed counts, any harvested `UC-NNN` ids (point them at `.flowcode/upstream-contributions.md`), hooks merged, and — on `--dry-run` — make clear nothing was written and how to apply for real.

### Non-Goals

- Do not run for a first-time install — that is `flowcode-install.js`. If `.flowcode/install-manifest.json` is absent, tell the user to install first.
- Do not modify host source code or anything outside `.flowcode/` and `.claude/`.
- Do not overwrite or remove a host-edited framework file without first harvesting the edit (the agent path handles this; the no-LLM path only runs when there are no host edits).
- Do not spawn the sub-agent when the plan says `needsAgent == false` — the script does the whole job.

---
name: git-workflow
description: Branch policy, commit conventions, multi-repo discipline, pre-commit gates, and destructive-operation guardrails for git work.
status: active
tags: [git, branching, commits, pull-requests, on-demand]
links: [.flowcode/workflow/flowcode-rules.md, .flowcode/workflow/flowcode-tools.md, .flowcode/quality-checks/quality-checks-index.md, .flowcode/flowcode-index.md]
---

# Git Workflow

- On-demand load: read before any git operation — branching, committing, merging, releasing.
- Branch policy: feature `{PREFIX}/desc`, bugfix `fix/desc`, quickfix `quickfix/desc`; keep branches short-lived.
- Commit conventions: clean imperative messages, no AI co-author trailers, one logical change per commit, reference the plan `{PREFIX}`.
- Pre-commit gates (lint, typecheck, tests on changed files) must pass — never bypass with `--no-verify`.
- Destructive operations (`push --force`, `reset --hard`, `branch -D`, `clean -f`) require explicit user confirmation.

---

## Branch Policy

- Default branch matches the project convention (`main`, `master`, `develop`). Never assume — check `git remote show origin` or the project overview.
- Feature branches: `{PREFIX}/short-description` where `PREFIX` matches the plan folder (e.g. `CMP-234/ai-platform-refactor`).
- Bugfix branches: `fix/short-description` or `{ISSUE-ID}/short-description`.
- Quickfix branches: `quickfix/short-description`.
- Keep branches short-lived. Long-lived branches diverge and create merge pain.

## Commit Conventions

- Clean messages. No AI co-author trailers. See `.flowcode/workflow/flowcode-rules.md § Git`.
- Imperative mood: "Add X", "Fix Y", "Refactor Z" — not "Added", "Fixes", "Refactoring".
- Subject line ≤ 72 chars. Body wraps at 72. Body explains **why**; the diff shows **what**.
- One logical change per commit. If the subject needs "and", split it.
- Reference the plan `{PREFIX}` or ticket in the subject or body when applicable.

### Conventional Commits (when the project uses them)

```text
{type}({scope}): {subject}
```

Common types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`.

## Pre-Commit Gates

Before every commit, relevant quality gates from `.flowcode/quality-checks/quality-checks-index.md` must pass:

- Lint
- Typecheck
- Tests covering changed files

If a pre-commit hook fails, investigate — do not bypass with `--no-verify`.

## Multi-Repo / Multi-Module Discipline

For projects with multiple repos or modules that evolve together:

- Branch every touched module from the same known-good snapshot so reviewers and CI see a consistent set.
- Land merges in dependency order (producer before consumer).
- Record the snapshot reference in the plan's `{PREFIX}-log.md`.

## Destructive Operations — User Confirmation Required

Never run these without explicit user approval:

- `git push --force` (especially to shared branches)
- `git reset --hard` on branches with committed work
- `git branch -D` on branches that may hold unmerged work
- `git clean -f` in a working tree you did not set up

## PR / Merge

- Open PRs against the default branch unless the plan specifies otherwise.
- PR description references the plan `{PREFIX}`, pulls highlights from `{PREFIX}-technical-overview.md`, and lists checks from `{PREFIX}-test-notes.md`.
- Squash vs merge-commit: match the project's existing pattern — check recent merges.

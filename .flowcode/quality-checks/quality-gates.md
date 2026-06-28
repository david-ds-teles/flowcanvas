---
name: quality-gates
description: The registry of executable test, lint, typecheck, and build gates plus the rules for when they run and how to add one.
status: active
tags: [quality, gates, ci, tests, bootstrap]
links: [.flowcode/quality-checks/quality-checks-index.md, .flowcode/workflow/git-workflow.md, .flowcode/flowcode-index.md]
---

# Quality Gates

- Executable test/lint/typecheck/build commands run at phase close, plan completion, and pre-PR; bootstrap populates the registry from the detected stack (empty by default).
- Gate types: unit, integration, e2e, lint, typecheck, coverage, build.
- When they run: code-review sub-agent each phase (fix all before the next phase), full registry at plan completion, full suite pre-PR before the QA report.
- Add a gate by appending a registry row, optionally a `{slug}-check.md`, then referencing it in plan acceptance criteria.
- Consumers: `qa-runner-agent`, the `qa-probe-gate.js` PreToolUse hook, and plan agents at phase close.

---

## Gate Registry

| Gate | Tool | Command | When Applied | Threshold | File |
|------|------|---------|-------------|-----------|------|
| typecheck | tsc | `npx tsc --noEmit` | post-phase | Exit 0 — all phases | — |
| lint | ESLint (next lint) | `npm run lint` | post-phase | Exit 0 — phases 1, 7 | — |
| build | next build | `npm run build` | post-phase | Exit 0 — all phases | — |
| unit | vitest | `npx vitest run` | post-phase | Pass — pure modules (adapter, edges, brief) + route contracts (`app/api/**`); phases 2, 5, 7 | — |
| integration | MCP smoke | `npm run smoke:mcp` | pre-close (app running) | Pass — 7-tool round-trip, non-stale apply; phase 7 | `scripts/smoke-mcp.mjs` |
| e2e | render smoke | `npm run smoke:render` | pre-close (app running + Chrome) | Pass — tri-pane renders, non-zero canvas; phase 7 | `scripts/smoke-render.mjs` |

## Gate Types

| Type | Description |
|------|-------------|
| `unit` | Unit tests for individual functions and modules |
| `integration` | Tests that verify interactions between modules |
| `e2e` | End-to-end tests (browser, API, or workflow level) |
| `lint` | Code style and static analysis |
| `typecheck` | Static type checking |
| `coverage` | Test coverage threshold enforcement |
| `build` | Compilation or bundle validation |

## When Gates Run

- **After each plan phase:** the code-review sub-agent runs. All issues must be fixed before the next phase starts.
- **Plan completion:** all gates listed in the registry must pass before a plan is marked `complete`.
- **Pre-PR:** full gate suite runs. The QA report (`{PREFIX}-qa-report.md`) is generated only after all gates pass or findings are explicitly acknowledged.

## Adding a Gate

1. Add a row to the Gate Registry above.
2. If the gate needs standalone documentation, create a `{slug}-check.md` file in this directory.
3. Reference the gate in the relevant plan's acceptance criteria.

## Default Gates

Bootstrap detects and registers the project's test runner, linter, type checker, and coverage tool. The Gate Registry is empty by default; `/flowcode:bootstrap` fills it.

## Consumers

- `qa-runner-agent` reads the registry and executes the commands.
- `qa-probe-gate.js` PreToolUse hook reads the latest QA report's gate outcomes to clear or block `git commit` / `gh pr create` / `gh pr merge`.
- Plan agents read the registry when planning a phase close.

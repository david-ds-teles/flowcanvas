---
name: flowcode:bootstrap
description: Initialize flowcode for the current project (or re-bootstrap a stale one) by exploring the codebase and generating the knowledge base — project-overview, deep per-module docs, quality gates, project tools, and the UI design system for frontend projects. Runs the `flowcode:bootstrap` skill.
status: active
tags: [command, bootstrap, initialization, project-overview]
links: [.flowcode/project/project-overview.md]
---

# /flowcode:bootstrap

- Thin entry point: loads and runs the shared `flowcode:bootstrap` skill — the procedure lives in the skill (which dispatches `flowcode:bootstrap-agent`), not here.
- Produces a fully populated `project-overview.md` with details modules, technology stack, one **deep** `modules/{name}.md` per module (via `flowcode:module-explorer-agent`), 
  detected quality gates, 
  project tools, stack-specific code-quality conventions, and (frontend) the UI design system.
- Run on first install, after major restructuring, or when the overview has gone stale. Re-bootstrap is merge-mode — human-authored content is preserved.
- Greenfield gate: for a near-empty project with no detectable stack, the agent asks the operator for the stack + quality-gate picks before writing.
- Records a `[BOOTSTRAP]` entry in `project-log.md`; points to `/flowcode:design` as the next step.

## Usage

```text
/flowcode:bootstrap
```

No arguments. The session guides you if input is needed (e.g. a new project with no detectable stack).

## What This Does

1. Loads the `flowcode:bootstrap` skill and runs its procedure.
2. Checks whether bootstrap is warranted (empty/skeleton overview, restructuring, staleness).
3. Dispatches `flowcode:bootstrap-agent` (sonnet) to explore the project and generate the knowledge base.
4. Surfaces the greenfield gate (stack + gate picks) when the stack can't be auto-detected.
5. Relays the report and points to the next step — review `project-overview.md`, then start a feature with `/flowcode:design`.

## Prompt

You are bootstrapping the project.

Run the `flowcode:bootstrap` skill and execute its procedure. It will check whether bootstrap is warranted, dispatch `flowcode:bootstrap-agent` (model **sonnet**) against the project root, surface the greenfield gate if the stack can't be detected, and relay the report. After completion, point the operator at `/flowcode:design` to start the first plan.

## Non-Goals

- Do not implement the procedure inline — the skill is the single source of truth; this command only invokes it.
- Do not guess a stack for a from-scratch project — surface the greenfield gate.
- Do not clobber human-authored `project-overview.md` content — re-bootstrap is merge-mode.

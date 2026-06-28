---
name: flowcode:bootstrap
description: Initialize flowcode for a project from scratch (or re-bootstrap a stale one) — explore the codebase and generate the living knowledge base: project-overview, per-module docs, detected quality gates, project tools, code-quality conventions, and (for frontend) the UI design system. Runs the `flowcode:bootstrap-agent` (sonnet). Use on first install, for an empty/skeleton project-overview, after major restructuring, or when the operator asks to initialize/re-initialize.
status: active
tags: [bootstrap, initialization, scratch, project-overview, quality-gates]
links: [.claude/agents/flowcode/bootstrap-agent.md, .claude/agents/flowcode/module-explorer-agent.md, .flowcode/templates/project-overview-template.md, .flowcode/project/project-overview.md, .flowcode/quality-checks/quality-checks-index.md, .claude/commands/flowcode/bootstrap.md, .claude/skills/flowcode/design/SKILL.md]
---

# Bootstrap Session

- The operator-facing playbook for standing up flowcode's knowledge base on a project — greenfield-from-scratch or a re-detect after the codebase has moved on; runs the `flowcode:bootstrap-agent` (sonnet) as the worker.
- The agent explores stack, structure, and tooling in parallel, then writes `project-overview.md`, one **deep** `modules/{name}.md` per module (via `flowcode:module-explorer-agent`, dispatched per-module in parallel), detected quality gates, project tools, stack-specific code-quality conventions, and — for frontend projects — the UI design system (Step 6.5: harvest the live app, or ship the starter).
- **Greenfield gate:** when no stack is auto-detectable (a near-empty project), the agent stops and asks the operator for the stack and quality-gate picks before writing — bootstrap from scratch is operator-guided, not guessed.
- **Re-bootstrap is merge-mode, not clobber:** human-authored content in `project-overview.md` is preserved; only auto-detected fields refresh. It never silently overwrites curated knowledge.
- Records a `[BOOTSTRAP]` entry in `project-log.md` with a status (`success` / `partial` / `needs-attention`) and what still needs human input.
- This is the foundation every other phase reads from — design, plan, and execute all assume a populated `project-overview.md` and module docs. Run it first on a new project.
- Surfaced via `/flowcode:bootstrap`; the agent holds the full procedure, this skill owns the when-to-run decision, the greenfield gate framing, and the handoff.

## When To Use

Run bootstrap when the knowledge base is absent or out of date:

- **First install / from scratch:** `project-overview.md` is empty or still the template skeleton. The framework startup sequence detects this and points the operator here.
- **Major restructuring:** new services/modules added, stack changed, significant reorganization — the overview no longer matches the code.
- **Stale overview:** the project evolved well past the last bootstrap.

Triggered by `/flowcode:bootstrap` or directly ("initialize the project", "set up flowcode here", "re-bootstrap"). After it completes, the natural next step is a design session (`flowcode:design`) to start the first plan.

Not for: per-feature work (that's `flowcode:design` → `flowcode:plan` → `flowcode:execute`), or refreshing a single module mid-plan (a phase close updates the touched `modules/{name}.md` directly).

## Procedure

### 1 — Check whether bootstrap is warranted

Read the top of `.flowcode/project/project-overview.md`:

- **Empty or template-skeleton only** → the project is not bootstrapped. Proceed.
- **Populated** → confirm intent: a full re-bootstrap is for major restructuring or staleness, and runs in merge-mode (auto-fields refresh, human content preserved). If the operator only wants one module or gate refreshed, that's a smaller edit, not a full bootstrap — say so.

### 2 — Dispatch the bootstrap agent

Read `.claude/agents/flowcode/bootstrap-agent.md` in full, then execute it as a sub-agent task (`flowcode:bootstrap-agent`) targeting the project root, model **sonnet**. It will:

- Explore manifests, README, env, CI, and folder structure in parallel.
- Detect the stack (architecture, languages, frameworks, datastores, infra, modules, tests, lint, typecheck, CI/CD, integrations).
- Write `project-overview.md` (new or merge-mode) from `project-overview-template.md`, plus one **deep** `modules/{name}.md` per module — dispatching `flowcode:module-explorer-agent` per module (in parallel) to source-explore and write each from `module-template.md`.
- Detect quality gates and confirm them with the operator in one consolidated prompt, then write `quality-checks-index.md`.
- Update `flowcode-tools.md § Project Tools` and enrich the stack-specific code-quality conventions.
- For frontend projects, run Step 6.5 — harvest the live app's tokens into `ui-design-system.md` (brownfield) or ship the starter (greenfield).
- Write a `[BOOTSTRAP]` entry to `project-log.md`.

### 3 — Honor the greenfield gate

If the project is near-empty and the stack can't be detected, the agent will stop and ask the operator for the stack and quality-gate selections. Relay that question and wait — do not let it guess a stack for a from-scratch project. This is the one interactive point; everything else is auto-derived from the code.

### 4 — Relay the report and point to the next step

Surface the agent's report: what was detected, which files were written/updated, the `[BOOTSTRAP]` status, and any section needing manual input. Then point the operator at the next phase — review `project-overview.md`, then start the first feature with a design session (`flowcode:design`).

## References

| File | Use |
|------|-----|
| `.claude/agents/flowcode/bootstrap-agent.md` | The worker (sonnet) — explores the project and writes the full knowledge base |
| `.claude/agents/flowcode/module-explorer-agent.md` | Dispatched per-module by the bootstrap agent — deeply explores one module and writes its `modules/{name}.md` |
| `.flowcode/templates/project-overview-template.md` | Shape of the project-overview the agent generates |
| `.flowcode/project/project-overview.md` | The target — read its top to decide if bootstrap is warranted; the agent (re)writes it |
| `.flowcode/quality-checks/quality-checks-index.md` | Receives the detected + operator-confirmed quality gates |
| `.claude/skills/flowcode/design/SKILL.md` | The natural next step once the project is bootstrapped |

## Non-Goals

- Do not guess a stack for a from-scratch project — surface the agent's greenfield gate and wait for the operator.
- Do not clobber human-authored `project-overview.md` content — re-bootstrap is merge-mode.
- Do not auto-gather technology documentation references — bootstrap leaves `.flowcode/references/references-index.md` empty; references are gathered lazily on first touch (the consult-every-time rule) or on demand via `/flowcode:docs`.
- Do not reimplement the agent's exploration/detection here — dispatch it; this skill owns the when-to-run decision and the handoff.
- Do not run per-feature design or planning — that's the design → plan → execute chain.

---
name: flowcode-rules
description: The mandatory rule set every flowcode session must obey; violating any rule is a framework breach.
status: active
tags: [rules, constraints, governance, code-quality, git]
links: [.flowcode/workflow/flowcode-workflow.md, .flowcode/workflow/flowcode-tools.md, .flowcode/workflow/git-workflow.md, .flowcode/quality-checks/quality-checks-index.md, .flowcode/flowcode-index.md]
---

# Rules & Constraints

- Mandatory rules — every rule is non-negotiable; violating any one is a framework breach.
- Spans general discipline, agent behavior, code discipline, git, project-overview/module sync, design + plan rigor, artifact contract, code-quality conventions, sub-agent dispatch, and backlog governance.
- Sync rules: codebase changes must keep `project-overview.md` and per-module docs current; designs and plans must stay grounded in and consistent with the overview.
- Code-touching work must load the quality-checks conventions; any markdown artifact must load `markdown-quality.md`.
- **Host overrides:** project customizations live in `flowcode-rules.local.md`, loaded after this file and superseding on conflict — see `flowcode-index.md § Local Overrides`.

---

## General Rules

- **Index Based.** Flowcode uses `index.md` files to index all files and provide initial information about that folder's resources. When a new file is added to any folder inside this workflow, that index file must be immediately updated — reference the file, explain its purpose, and declare its load type (`eager`, `context`, `on-demand`).
- **Harness-agnostic docs.** Framework documents never hard-code a filesystem path into the harness tool directory or the agent-tools source tree — neither resolves in a host install. Reference agent-tools capabilities by their wired name: a sub-agent as `flowcode:<name>`, a skill as `flowcode:<name>`, a command as `/flowcode:<name>`; hooks fire automatically. Enforced on write by the `harness-leak-check` hook.
- **Template First.** Use templates for every artifact generated. If a template doesn't exist for the artifact type, propose one that fits the need, add it to `.flowcode/templates/`, and register it in `.flowcode/templates/templates-index.md` (the authoritative template catalog; `flowcode-index.md § Templates` just points there).
- **Do not overcomplicate it.** Do not overflow context by loading unnecessary code, modules, files, or web fetches. Do not overcomplicate the solution.
- **Efficiency and Parallelism.** When agents are available (code explorer, research agent, etc.), make good use of them — always in parallel.
- **Understand first.** Analyze the codebase with diligence. Understand the existing patterns and follow them.
- **Think in context.** This is a multi-module system. Before touching code, understand which module owns the responsibility and respect those boundaries.
- **Stay in scope.** Do exactly what was asked. Don't refactor or "improve" things that weren't part of the task unless the user directly asks.
- **Gather Context.** If you are not 100% sure, check `.flowcode/researches/` for existing findings first, then dispatch a research agent to fetch online information. Always prioritize official resources and documentation. Capture reusable findings in `.flowcode/researches/` using `.flowcode/templates/research-template.md`.
- **Consult References.** Before writing or changing code, check `.flowcode/references/references-index.md` for any reference covering what you are about to do and load its summary first. **Documentation** references are technology-keyed: before coding against a technology in `.flowcode/project/project-overview.md § Technology Stack`, load the summary of its `references/docs/{tech-slug}.md`; if missing or `stale`, dispatch `flowcode:docs-researcher-agent` (or run `/flowcode:docs <tech>`) to gather it from official documentation before coding. **Other** reference types (design, spec, example, …) are consulted when the task touches what they cover — e.g. a design reference when implementing that UI; register new material with `/flowcode:reference`. Reading the ≤10-bullet summary is the every-time cost; read full sections only when implementing against that part. This is persistent ground truth — distinct from `.flowcode/researches/`, which answers one-off questions.
- **Code Quality.** Write clean, production-grade code following the project conventions, skills, rules, tests, design, patterns, and architecture already established.
- **Mandatory Tools.** Read the tool references in `flowcode-tools.md`; when a tool reference exists for an operation, use it as described — not the raw underlying command.
- **Use git config user info.** Use git config user data to stamp the author of the changes into generated markdown files.

---

## Behavior

- **Reason before acting.** Think through the request from multiple angles and explore related files within the task's scope before starting, then surface any relevant questions.
- **Ask when ambiguous.** If the request is unclear, conflicting, or you don't know how to proceed, ask for clarification before taking any action.
- **Challenge and flag.** Question assumptions and results, offer alternative viewpoints, and flag gaps, architecture issues, or anything that may compromise final quality the moment you spot it.
- **Show options before acting.** Present the options and their tradeoffs, then let the user decide.

---

## Code Discipline

Write the minimum code that solves today's problem; do not solve tomorrow's. No abstraction for code used in exactly one place, and no optional parameters "for future flexibility."

- **Never guess fixes.** Verify the root cause before changing anything — if uncertain, add diagnostic logging to confirm the problem first. No trial-and-error.
- **Never leave garbage files in source directories.** No temp files, no log files, no test artifacts, no `LOG_FILE_IS_UNDEFINED`. Clean up after every operation.
- **Polish before done.** At the end of any task, review your code — remove dead code, flatten nesting, extract hardcoded prompts. Code quality is a deliverable, not optional. See `/quality-checks 
→ Code Quality`.
- **Name assumptions up front,** before the code block, not after. If you spot an ambiguity that will cause a rewrite, raise it now.
- **Offer the simpler path.** If the user's approach has a simpler alternative, say so: "This works, but you could also just do X in 3 lines. Want that instead?"
- **Never bluff the codebase.** If you are genuinely uncertain how something works, say so — don't fill the gap with a plausible-sounding guess.
- **Front-load clarification.** One well-placed question before coding beats three rounds of correction after; ask blocking uncertainties together. Write complete, copy-paste-ready code — no "fill 
in the rest" snippets — and prefer self-contained solutions over obscure dependencies or service setup.

### Surgical Changes

Touch only what the request requires. Match the surrounding style exactly. When editing existing code:

- Do not rename variables that were not part of the problem.
- Do not add type hints if the existing code has none.
- Do not change quote style, spacing, or comments unless they were the bug.
- Do not add docstrings, logging, or error handling that was not asked for.

**The diff test:** every changed line should trace to a specific part of the user's request.

---

## Git

- **Never add AI co-author trailers to commits.** Do not include `Co-Authored-By: Claude...` or any other AI attribution in commit messages. Commit messages must be clean of AI identity markers.
- **Load `git-workflow.md` before git operations.** `.flowcode/workflow/git-workflow.md` defines branch policy, commit conventions, multi-repo discipline, and destructive-operation guardrails. Load 
it on-demand before branching, committing, merging, or releasing.

---

## Project Overview

- **Keep `project-overview.md` in sync with the codebase.** Every merge to `main` that changes codebase structure (new modules, new dirs, new deps, new env vars, new endpoints, 
validated/invalidated requirements) MUST update `.flowcode/project/project-overview.md`. A module that exists in the codebase but not in `project-overview.md` is a framework breach.
- **Keep per-module docs in sync with the codebase.** Every module listed in `project-overview.md` MUST have a corresponding `.flowcode/project/modules/{name}.md` file, generated by the bootstrap 
agent and maintained by plan phases. A module present in code but missing its `modules/{name}.md` is a framework breach — run `/flowcode:bootstrap` or create the file from `.flowcode/templates/module-template.md`.
- **Phases that change a module's contract MUST update its module file in the same edit.** Contract changes include public API (functions, classes, HTTP routes, events), DB schema ownership, or Key 
Insights worth surfacing to future agents. This mirrors the `project-overview.md` sync rule above — do not let the per-module doc drift.

---

## Design + Plan Rigor

- **No shallow design documents. No shallow implementation plans.** Every design (`{PREFIX}-design.md`, `{PREFIX}-ui-design.md`) and every plan (`{PREFIX}-plan.md`) MUST have the depth for a senior 
engineer to execute without asking questions — DDL, enum catalogs, Protocol/ABC signatures, deliberations with rejected alternatives, research references, mermaid diagrams, explicit scope boundaries. Full content contract: `.flowcode/templates/` (all templates define the quality bar for their artifact type). Writing a prose-only summary when concrete schemas and signatures are known is a framework breach.
- **Design and plan MUST be grounded in `project-overview.md`.** File paths, module boundaries, tech stack choices, and folder structure in a design or plan MUST match what `project-overview.md` 
already documents. If the plan needs a different structure, update `project-overview.md` in the same turn and justify the change — do not let them drift. Authoring a plan that contradicts the overview (e.g. plan says `styles/globals.css` while overview says `app/globals.css`) is a framework breach.
- **Every plan folder MUST contain `{PREFIX}-log.md`.** Created at plan folder creation time from `plan-log-template.md`, with a `[PLAN CREATED]` entry written immediately. Updated at the end of 
every phase with a `[PHASE]` entry (fields: Started, Completed, Built, Files, Gates, Deviations — all mandatory). Closed with a `[PLAN COMPLETE]` entry at plan end. The plan's end is ALSO logged at `.flowcode/project/project-log.md` using its own `[PLAN COMPLETE]` template (brief cross-plan view). A plan folder without `{PREFIX}-log.md`, a completed phase without a `[PHASE]` entry, or a `[PHASE]` entry with empty fields — each is a framework breach. Phase-end entries go ONLY in `{PREFIX}-log.md`, never in `project-log.md`.
- **Plan file MUST NOT contradict the code.** When implementation diverges from the plan's spec (files, steps, approach), update the spec in `{PREFIX}-plan.md` in the same edit. One-off deviations 
are also recorded in the phase's `[PHASE]` entry `Deviations` field; lasting changes rewrite the plan spec. A plan that still prescribes `X::before` while the code ships `X::after` is a framework breach.

---

## Artifact Contract

- **Plan artifacts follow `.flowcode/plans/plan-instructions.md § Artifact Naming`.** Every file under `.flowcode/plans/{PREFIX}/` matches the allowed patterns; phase headings use `## Phase N`, 
  never `P{N}`. Enforcement: the `artifact-naming-check` hook (Stop-hook advisory). A file that violates the naming convention is a framework breach.

---

## Code Quality Conventions

- **Load code-quality conventions into context when planning or executing code-touching work.** Read `.flowcode/quality-checks/quality-checks-index.md` and pull the relevant sub-files 
  (`naming-conventions.md`, `typed-models.md`, `enums-and-constants.md`, `error-handling.md`, `clean-code.md`, `idiomatic-code.md`) into the same context sweep as the active plan and researches. Planning or executing code work without these conventions loaded is a framework breach.
- **Load `markdown-quality.md` when producing or editing any markdown artifact.** `.flowcode/quality-checks/markdown-quality.md` defines the rendering contract (headings, tables, mermaid, 
  fenced-block language tags, finding-as-section shape). Enforcement: the `markdown-quality-check` hook fires PostToolUse on every flowcode-managed `.md` — render-breaking defects (broken mermaid, unclosed fence) block (exit 2, must-fix); style issues warn. Address every warning before handing the artifact back to the user.

---

## Sub-Agent Dispatch

- **Dispatch the specialized sub-agent when its trigger fires AND its agent file exists.** See `.flowcode/workflow/flowcode-workflow.md § Sub-Agent Dispatch Table`. Dispatch is allowed, not 
  mandatory — trivial bugfixes and one-file quickfixes may be handled inline by the main agent. When the artifact being produced maps to a sub-agent (researcher, designer, planner, code-reviewer, qa-runner, code-explorer, artifact-updater, bootstrap) that is wired into the harness, prefer dispatch over inline work. Inline work on a mapped artifact is not a breach, but it should be an informed choice, not an accident.

---

## Backlog

- **Backlog IDs (`BL-NNN`) are never reused.** Once assigned, the ID retires with its entry regardless of final status (Rejected, Fold-In, Active, On-Hold).
- **Backlog grooming is bounded.** Entries are added or promoted to `Active` only during a brainstorming or design session — never at plan-start, never on schedule. No silent auto-add: user 
  approval is required to move items into or out of `Active`.

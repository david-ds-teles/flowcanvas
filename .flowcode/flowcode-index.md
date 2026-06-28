---
name: flowcode-index
description: Authoritative map of every flowcode framework file with its Load Scope and purpose.
status: active
tags: [index, map, loading, startup]
links: [.flowcode/workflow/flowcode-workflow.md, .flowcode/workflow/file-conventions.md]
---

# Flowcode Index

- Authoritative map of every flowcode framework file — read on startup; never scan the filesystem to find files.
- Lists files only; rules live where the agent needs them (naming in `plan-instructions.md`, load order in `flowcode-workflow.md`).
- Two loading axes: **Load Scope** (the `Load Type` column — eager/context/on-demand) and **Read Depth** (index→frontmatter→summary→full, see `workflow/file-conventions.md`).
- Every framework `.md` carries frontmatter + a ≤10-line summary so the shallow Read Depth tiers cost few tokens.
- **Local overrides:** any `X.md` may have a host-owned `X.local.md` sibling, loaded as an overlay right after it — see `§ Local Overrides`.

---

## Load Types

The `Load Type` column below is the **Load Scope** axis. *How much* of a chosen file to read is a separate axis — see `workflow/file-conventions.md § Read Depth Protocol`.

| Type | When to Load |
|------|-------------|
| **eager** | Every conversation start (Tier 1) |
| **context** | When a relevant signal is detected (Tier 2) |
| **on-demand** | Only when a specific workflow step is executing (Tier 3) |

---

## Local Overrides

Any framework file `X.md` may have a host-authored sibling `X.local.md` in the same directory (e.g. `flowcode-rules.local.md` beside `flowcode-rules.md`). When you load `X.md`, immediately load `X.local.md` if it exists and apply it as an overlay:

- **Additive by default**, and on a direct conflict the `.local` entry **supersedes** the base (last-wins).
- An override that *replaces* a base directive must name the item it supersedes (e.g. "Replaces Rule 8: …") so the intent is unambiguous.
- `*.local.md` is **host-owned** — shipped by the host/org, never overwritten on upgrade, preserved on uninstall. It is the surface `/flowcode:extend` writes project customizations to.
- Most-overridden: `flowcode-rules.local.md`, `flowcode-tools.local.md`, `flowcode-persona.local.md`. The convention applies to every framework file, eager or on-demand.

---

## Core Framework

| File | Load Type | Purpose |
|------|-----------|---------|
| `.flowcode/flowcode-index.md` | eager | This file — authoritative map of every framework file with its load type |
| `.flowcode/workflow/flowcode-workflow.md` | eager | Tier loading rules, Read Depth protocol, available workflows, model routing, parallelism rules, sub-agent dispatch table |
| `.flowcode/workflow/file-conventions.md` | context | The frontmatter + summary standard and the full Read Depth protocol; load when authoring or validating a managed `.md`. The operational Read Depth ladder is inline in `flowcode-workflow.md` |
| `.flowcode/workflow/flowcode-persona.md` | eager | Agent communication style and identity |
| `.flowcode/workflow/flowcode-rules.md` | eager | All mandatory behavioral rules — every rule must be followed without exception |
| `.flowcode/workflow/flowcode-tools.md` | eager | Tools registry — mandatory tools, flowcode agent tools, project tools |
| `.flowcode/project/project-overview.md` | eager | Living project knowledge base — architecture, stack, modules, quality gates |
| `.flowcode/project/project-log.md` | eager | Reverse-chronological project-level event log (`[PLAN COMPLETE]`, `[BOOTSTRAP]`, `[BUGFIX]`, `[QUICKFIX]`) |
| `.flowcode/plans/plan-instructions.md` | eager | Mandatory phase lifecycle rules, phase statuses, halt conditions, phase-close minimum |

---

## Project

| File | Load Type | Purpose |
|------|-----------|---------|
| `.flowcode/project/backlog.md` | context | Canonical idea list (`BL-NNN`). Load during brainstorming or design sessions |
| `.flowcode/project/modules/{name}.md` | context | Per-module detail file — purpose, public API, DDL, dependencies, key insights, known gaps. One per module listed in `project-overview.md § Modules`. Load when a plan's Touched Modules references this module or the user names it directly |
| `.flowcode/project/modules/README.md` | reference | Convention marker for the modules directory — names the template, sync rule, generation source |
| `.flowcode/upstream-contributions.md` | on-demand | Top-level accumulator of `UC-NNN` entries. Read when `/flowcode:extend` routes to the upstream branch, or when the user reviews pending contributions |

---

## Workflow Support

| File | Load Type | Purpose |
|------|-----------|---------|
| `.flowcode/workflow/git-workflow.md` | on-demand | Git discipline — branches, commits, multi-repo, merge. Load before any git operation |

---

## Plan Files

| File | Load Type | Purpose |
|------|-----------|---------|
| `.flowcode/plans/plan-index.md` | context | Index of all plans with status. Load when a plan is referenced or work is being resumed |
| `.flowcode/plans/{PREFIX}/{PREFIX}-design.md` | context | Design artifact for a specific plan. Load when executing or reviewing that plan |
| `.flowcode/plans/{PREFIX}/{PREFIX}-plan.md` | context | Implementation plan with phases. Load when executing or reviewing that plan |
| `.flowcode/plans/{PREFIX}/{PREFIX}-ui-design.md` | context | UI design artifact for frontend-touching plans. Generated before implementation begins |
| `.flowcode/plans/{PREFIX}/{PREFIX}-log.md` | context | Per-plan execution record — `[PLAN CREATED]`, `[PHASE]` per phase end, `[PLAN COMPLETE]`. Created with the plan folder. Load when executing, resuming, or auditing that plan |
| `.flowcode/plans/{PREFIX}/{PREFIX}-technical-overview.md` | on-demand | Post-execution technical summary. Load for bug investigation or plan review |
| `.flowcode/plans/{PREFIX}/{PREFIX}-changelog.md` | on-demand | File-level change log, built incrementally per phase. Load for tracing what changed in a plan |
| `.flowcode/plans/{PREFIX}/{PREFIX}-test-notes.md` | on-demand | Test coverage notes. Load when reviewing test strategy |
| `.flowcode/plans/{PREFIX}/{PREFIX}-qa-report.md` | on-demand | QA gate report. Load when reviewing quality findings |

---

## Templates

| File | Load Type | Purpose |
|------|-----------|---------|
| `.flowcode/templates/templates-index.md` | on-demand | Local index of all templates — mirrors this section for discovery inside `templates/` |
| `.flowcode/templates/agent-instructions.md` | on-demand | The `<flowcode-instructions>` block injected into host project CLAUDE.md by `flowcode-install.js` |
| `.flowcode/templates/design-template.md` | on-demand | Template for design artifacts — load immediately before writing a design file |
| `.flowcode/templates/plan-template.md` | on-demand | Template for plan artifacts — load immediately before writing a plan file |
| `.flowcode/templates/plan-log-template.md` | on-demand | Template for `{PREFIX}-log.md` per-plan log — contains 3 entry templates in one file (`[PLAN CREATED]`, `[PHASE]`, `[PLAN COMPLETE]`). Load when creating a plan folder, appending a `[PHASE]` entry, or writing `[PLAN COMPLETE]` |
| `.flowcode/templates/research-template.md` | on-demand | Template for research artifacts — load before a research agent writes its findings |
| `.flowcode/templates/doc-reference-template.md` | on-demand | Template for the `docs`-type technology documentation reference — load before `flowcode:docs-researcher-agent` writes a `references/docs/{tech-slug}.md` |
| `.flowcode/templates/reference-template.md` | on-demand | Template for a general reference card (registered material — design, spec, example, …) — load before `/flowcode:reference` writes a `references/{type}/{slug}.md` card |
| `.flowcode/templates/qa-report-template.md` | on-demand | Template for QA reports — load before generating the QA report |
| `.flowcode/templates/review-report-template.md` | on-demand | Template for standalone `{slug}-review.md` reports — load before a `/flowcode:review` writes a new ad-hoc review report |
| `.flowcode/templates/technical-overview-template.md` | on-demand | Template for technical overviews — load before post-execution artifact generation |
| `.flowcode/templates/changelog-template.md` | on-demand | Template for changelogs — load at each phase close (per-phase append) and during post-exec reconciliation |
| `.flowcode/templates/test-notes-template.md` | on-demand | Template for test notes — load during post-execution parallel artifact generation |
| `.flowcode/templates/ui-design-template.md` | on-demand | Template for UI design artifacts — load before generating `{PREFIX}-ui-design.md` |
| `.flowcode/templates/ui-design-system-template.md` | on-demand | Template for the per-project `ui-design-system.md` digest — load before harvesting/generating the design system |
| `.flowcode/templates/html-deliverable-template.html` | on-demand | House-style dark-theme HTML deliverable shell — load when rendering an artifact via `/flowcode:render-html` |
| `.flowcode/templates/backlog-entry-template.md` | on-demand | Template for new `BL-NNN` rows in `.flowcode/project/backlog.md` — load before adding a backlog entry |
| `.flowcode/templates/upstream-contribution-template.md` | on-demand | Template for new `UC-NNN` rows in `.flowcode/upstream-contributions.md` — load before `/flowcode:extend` appends an upstream-contribution entry |
| `.flowcode/templates/project-overview-template.md` | on-demand | Template for the project overview — load when bootstrap regenerates `project-overview.md` |
| `.flowcode/templates/project-log-template.md` | on-demand | Templates for `[PLAN COMPLETE]`, `[BOOTSTRAP]`, `[BUGFIX]`, `[QUICKFIX]` entries in `.flowcode/project/project-log.md` — project-level events only. `[PHASE]` entries go in `{PREFIX}-log.md`, not here |
| `.flowcode/templates/agents-structure-template.md` | on-demand | Template for agent files — load immediately before authoring any new flowcode sub-agent (wired into the harness as a `flowcode:` sub-agent) |
| `.flowcode/templates/module-template.md` | on-demand | Template for per-module detail files — load immediately before writing any file under `.flowcode/project/modules/` |

---

## UI Subsystem

| File | Load Type | Purpose |
|------|-----------|---------|
| `.flowcode/ui/ui-index.md` | on-demand | Subsystem router — load first when a plan touches frontend |
| `.flowcode/ui/ui-design-system.md` | on-demand | Mandatory design ground truth — token + component digest every mockup obeys; ships as a starter, harvested per-project by bootstrap (host-owned) |
| `.flowcode/ui/ui-workflow.md` | on-demand | UI design lifecycle — 3-iteration parallel mockups (via `flowcode:ui-mockups`), selection, implementation, phase-close visual parity, plan-close canonical capture |
| `.flowcode/ui/ui-mockup-discipline.md` | on-demand | Mockup conventions — flat directory, parallel-iteration filenames, test IDs, design tokens, breakpoints, MCP preferences |
| `.flowcode/ui/references/` | on-demand | Visual ground-truth HTML/screenshots — starter `starter-dashboard.html`; per-project harvest adds live-app references |

---

## Researches

| File | Load Type | Purpose |
|------|-----------|---------|
| `.flowcode/researches/researches-index.md` | context | Index of all cached research. Load when user references a technology or topic — check before dispatching a new research agent |
| `.flowcode/researches/{slug}-research.md` | on-demand | Individual research artifact. Load when implementing a feature that the research informs |

---

## References

| File | Load Type | Purpose |
|------|-----------|---------|
| `.flowcode/references/references-index.md` | context | Index of all reference material — documentation, design, specs, examples, diagrams. Load when working on something a reference may cover; check before consulting or registering a reference |
| `.flowcode/references/docs/{tech-slug}.md` | on-demand | `docs`-type reference — distilled official-docs reference for one technology (setup, idioms, gotchas, project-relevant API surface). Gathered by `flowcode:docs-researcher-agent` (`/flowcode:docs`). Load its summary before writing code that uses that technology |
| `.flowcode/references/{type}/{slug}.md` | on-demand | Reference card for registered material (`design`, `spec`, `example`, …) — distills the material and links to its stored source asset under the same folder. Written by `/flowcode:reference`. Load when the task touches what it covers |

---

## Reviews

| File | Load Type | Purpose |
|------|-----------|---------|
| `.flowcode/reviews/reviews-index.md` | context | Index of all standalone `/flowcode:review` reports. Load when reviewing prior ad-hoc reviews — plan-bound reviews live in `{PREFIX}-qa-report.md`, not here |
| `.flowcode/reviews/{slug}-review.md` | on-demand | Individual standalone review report — prepend-only `## Check` sections, finding-as-section. Advisory (does not gate commits). Load when revisiting a past ad-hoc review |

---

## Quality Checks

| File | Load Type | Purpose |
|------|-----------|---------|
| `.flowcode/quality-checks/quality-checks-index.md` | context | Router for the quality-checks subsystem — file listing only |
| `.flowcode/quality-checks/quality-gates.md` | context | Gate registry, gate types, when-run rules, adding-a-gate procedure. Load when a phase is closing, when running QA, or when adding/editing a gate |
| `.flowcode/quality-checks/naming-conventions.md` | context | Classes, methods, variables, constants, files, packages. Universal principles + per-stack rules populated by bootstrap |
| `.flowcode/quality-checks/typed-models.md` | context | DTOs, entities, request/response shapes — no raw dicts. Universal principles |
| `.flowcode/quality-checks/enums-and-constants.md` | context | Enum patterns, no magic numbers or hardcoded strings. Universal principles |
| `.flowcode/quality-checks/error-handling.md` | context | Error boundaries, exception patterns, context-rich error messages. Universal principles |
| `.flowcode/quality-checks/clean-code.md` | context | Dead code, SRP, encapsulation, imports, scope discipline. Applies on any code edit |
| `.flowcode/quality-checks/idiomatic-code.md` | context | Language-specific idioms (comprehensions, optional chaining, streams). Universal principles |
| `.flowcode/quality-checks/markdown-quality.md` | context | Heading progression, table width, mermaid, fenced-block language tags, finding-as-section. Loaded whenever producing or editing markdown artifacts |

---

## Agent Tools (wired into the active harness by the installer — see `flowcode.yml` `install_paths.agent_tools`)

These are invoked by their wired name, not read by path — there is no `agent-tools/` directory in a host install (the installer routes them into the harness). Reference a sub-agent as `flowcode:<name>`, a skill as `flowcode:<name>`, a command as `/flowcode:<name>`; hooks fire automatically.

| Capability | Load Type | Purpose |
|------|-----------|---------|
| `flowcode:bootstrap-agent` | on-demand | Bootstrap sub-agent (sonnet). Loaded and executed when `/flowcode:bootstrap` runs — explores the project and writes the knowledge base; dispatches `flowcode:module-explorer-agent` per module for deep per-module docs |
| `flowcode:module-explorer-agent` | on-demand | Module-explorer sub-agent (sonnet). Deeply explores ONE module's source and writes a self-contained `modules/{name}.md` (real signatures, usage example, config/env, traced deps, conventions). Dispatched per-module by bootstrap Step 3.5 or standalone via `flowcode:module-doc`; merge-mode |
| `flowcode:code-explorer-agent` | on-demand | Code-explorer sub-agent. Dispatched in the Post-Execution Pipeline before technical-overview generation — audits implementation vs spec, produces divergence report |
| `flowcode:researcher-agent` | on-demand | Researcher sub-agent (haiku). Resolves one scoped research question; checks the researches cache first, writes `{slug}-research.md` new or as `## Update` append |
| `flowcode:docs-researcher-agent` | on-demand | Doc-researcher sub-agent (sonnet). Explores a technology's official documentation and distills a token-efficient `references/docs/{tech-slug}.md`; cache-first against `references-index.md`, append-only `## Update`, version-pinned. Dispatched by `flowcode:docs` |
| `flowcode:designer-agent` | on-demand | Designer sub-agent (opus). Produces `{PREFIX}-design.md` at full depth — DDL, signatures, rejected alternatives, mermaid, scope boundaries, risks, research refs. Dispatches 3-iteration mockup flow for UI plans |
| `flowcode:planner-agent` | on-demand | Planner sub-agent (opus). Produces `{PREFIX}-plan.md` from approved design; active phase full depth, later phases stubbed; annotates each phase's `Depends On`; creates `{PREFIX}-log.md` with `[PLAN CREATED]` |
| `flowcode:implementer-agent` | on-demand | Implementer sub-agent (sonnet). Dispatched by `flowcode:execute` for within-phase fan-out — implements ONE exclusively-owned, file-disjoint slice of a phase from the design slice + module contracts, never touching shared/wiring files, returning a compact exports/deviations report for the main session to integrate. Leaf agent; advisory (sequential fallback always valid) |
| `flowcode:code-reviewer-agent` | on-demand | Code-reviewer sub-agent (sonnet). Three modes — phase, plan, and standalone (`/flowcode:review`, plan-optional). Checks baseline conformance (project-overview, module contracts, gates, conventions) as a first-class finding. Prepends a `## Check` section (newest on top) to `{PREFIX}-qa-report.md` (phase/plan) or `.flowcode/reviews/{slug}-review.md` (standalone) in finding-as-section format |
| `flowcode:qa-runner-agent` | on-demand | QA-runner sub-agent (sonnet). Executes declared quality gates; fills Stack Gate table in the latest `## Check` section; captures raw logs to `logs/qa-runs/` |
| `flowcode:artifact-updater-agent` | on-demand | Artifact-updater sub-agent (sonnet). Phase close: appends changelog + log + refreshes module docs. Plan close: technical-overview + test-notes + project-overview sync + `[PLAN COMPLETE]` logs |
| `flowcode:migrator-agent` | on-demand | Migrator sub-agent (sonnet). Dispatched by `/flowcode:migrate` **only** for the judgment remainder of a delta upgrade — harvests host edits to changed/removed framework files as `UC-NNN` before overwrite, applies non-inferable `**Migration**` transforms, then drives `migrate-plan.js` to apply/restamp. Also runs the full-convergence fallback for legacy installs |
| `flowcode:browser-runner-agent` | on-demand | Browser-runner sub-agent (sonnet). Dispatched by the `flowcode:browser` skill — resolves a driver via the four-rung ladder (wired MCP → project Playwright → ephemeral Playwright → tracked `[deferred]`), boots/attaches the app, drives the vendored `capture.mjs` engine to screenshot viewports + assert load-bearing testids, writes PNGs + `result.json` + raw logs under `logs/browser/`, returns a compact report. Never edits source |
| `artifact-naming-check` | automatic | PreToolUse hook (Write/Edit/MultiEdit) — validates plan/research artifact naming. Banned-name reject list + structural rules. Writes outcome to `.flowcode/logs/hooks.log` |
| `frontmatter-summary-check` | automatic | PreToolUse hook (Write/Edit/MultiEdit) — blocks any flowcode-managed `.md` written without valid frontmatter (5 keys) or a 1–10 bullet summary. Enforces `workflow/file-conventions.md` |
| `harness-leak-check` | automatic | PreToolUse hook (Write/Edit/MultiEdit) — blocks a write that would put a harness directory or a non-resolvable agent-tools path into a `.flowcode/` framework `.md` doc; keeps framework docs harness-agnostic (reference agent-tools capabilities by their wired name — `flowcode:` skill/sub-agent, `/flowcode:` command, hook name). Excludes the agent-tools source tree and `changelog.md`. Writes outcome to `.flowcode/logs/hooks.log` |
| `markdown-quality-check` | automatic | PostToolUse render-lint over every flowcode-managed `.md` — render-breaking defects (broken mermaid, unclosed fence, Unicode arrows) block (exit 2, must-fix); style issues (heading/table/fence-language) warn. Writes outcome (pass/warn/error) to `.flowcode/logs/hooks.log` |
| `project-log-format-check` | automatic | PreToolUse hook — blocks writes to `project-log.md` that introduce tags other than `[PLAN COMPLETE]`, `[BOOTSTRAP]`, `[BUGFIX]`, `[QUICKFIX]`, `[MIGRATION]`, `[FEEDBACK]`, or that omit the `**Dev:**` attribution line on an entry. Catches the common `[PHASE]`-in-project-log mistake; new-writes-only, legacy entries tolerated |
| `qa-probe-gate` | automatic | PreToolUse hook (matcher Bash) — blocks `git commit` / `gh pr create` / `gh pr merge` when the latest QA report shows `Gate outcome: FAIL` or unresolved finding of severity ≥ medium |
| `plan-artifact-index` | automatic | SessionStart hook — emits a compact summary to stdout so the agent has session context without scanning: the acting developer identity (`Acting as Dev:`, resolved from `FLOWCODE_DEV` / `git config user.name`+`user.email`, for stamping the `Dev:` log field), active plans (with active `## Phase N`), and the last 5 project-log entries |
| `notify-sound` | automatic | Stop + Notification hook that plays a sound when the agent finishes a turn or asks for user input — cross-platform (macOS/Linux/Windows). Writes outcome to `.flowcode/logs/hooks.log` |
| `feedback-nudge` | automatic | Stop hook — when the session changed anything in the repo (`git status`), surfaces a one-line reminder (stdout `systemMessage`) to run `/flowcode:feedback`, once per session. Never blocks; never runs the loop; guards `stop_hook_active` |
| `/flowcode:bootstrap` | on-demand | `/flowcode:bootstrap` slash command — thin entry that runs the `flowcode:bootstrap` skill (which dispatches `flowcode:bootstrap-agent`) to initialize or re-bootstrap the project |
| `/flowcode:module-doc` | on-demand | `/flowcode:module-doc` slash command — thin entry that runs the `flowcode:module-doc` skill (dispatches `flowcode:module-explorer-agent`); (re)generates one module's deep doc in merge-mode without a full re-bootstrap |
| `/flowcode:extend` | on-demand | `/flowcode:extend` slash command definition — extends/customizes the framework from a natural-language statement; classifies intent against this index, previews edits, applies on approval |
| `/flowcode:brainstorm` | on-demand | `/flowcode:brainstorm` slash command — fuzzy-idea entry; thin alias into the `flowcode:design` skill (Mode A, conversational). Same engine as `/flowcode:design` |
| `/flowcode:feedback` | on-demand | `/flowcode:feedback` slash command — runs the feedback-loop skill in the main session (extract → stage → operator-approve → apply session knowledge) |
| `/flowcode:migrate` | on-demand | `/flowcode:migrate` slash command — runs `migrate-plan.js` to compute + apply the upgrade delta, dispatching `flowcode:migrator-agent` **only** when there is judgment work (a host edit to harvest or a `**Migration**` block). A clean upgrade spends no sub-agent tokens. Args: `--source`, `--force`, `--dry-run` |
| `/flowcode:mockup` | on-demand | `/flowcode:mockup` slash command — standalone trigger for the `flowcode:ui-mockups` composer; generates grounded HTML mockups/screens with no plan required |
| `/flowcode:render-html` | on-demand | `/flowcode:render-html` slash command — renders an artifact (design/plan/technical-overview, or `architecture`/`flow`) into a self-contained house-style HTML deliverable |
| `/flowcode:research` | on-demand | `/flowcode:research` slash command — thin entry that runs the `flowcode:research` skill (dispatches `flowcode:researcher-agent`); standalone, cache-first research session |
| `/flowcode:docs` | on-demand | `/flowcode:docs` slash command — thin entry that runs the `flowcode:docs` skill (dispatches `flowcode:docs-researcher-agent`); gathers/consults distilled tech-doc references (no-arg = whole stack in parallel, `<tech>` = one) |
| `/flowcode:review` | on-demand | `/flowcode:review` slash command — thin entry that runs the `flowcode:review` skill (dispatches `flowcode:code-reviewer-agent`); standalone, plan-optional code review over an arbitrary diff |
| `/flowcode:design` | on-demand | `/flowcode:design` slash command — thin entry that runs the `flowcode:design` skill (scope → `flowcode:designer-agent` depth); canonical design surface (`/flowcode:brainstorm` is the fuzzy-idea alias) |
| `/flowcode:plan` | on-demand | `/flowcode:plan` slash command — thin entry that runs the `flowcode:plan` skill (dispatches `flowcode:planner-agent`); turns an approved design into `{PREFIX}-plan.md` |
| `/flowcode:execute` | on-demand | `/flowcode:execute` slash command — thin entry that runs the `flowcode:execute` skill; executes/resumes an active plan through the phase-close sequence + post-execution pipeline |
| `/flowcode:browser` | on-demand | `/flowcode:browser` slash command — thin entry that runs the `flowcode:browser` skill (dispatches `flowcode:browser-runner-agent`); standalone viewport-capture + app-smoke against the running app, no plan required. Modes `capture` / `smoke` / `all` |
| `/flowcode:contributors` | on-demand | `/flowcode:contributors` slash command — thin entry that runs the `flowcode:contributors` skill; read-only attribution report over the `Dev:` log fields, filtered by developer / `--me` / `--feature` / `--type` / `--area` |
| `flowcode:contributors` | on-demand | Contributors report skill — read-only rollup of the `**Dev:**` field across `plans/*/*-log.md` + `project-log.md`; answers who built a feature, what a developer changed, what fixes they shipped. Run by `/flowcode:contributors` |
| `flowcode:feedback` | on-demand | Feedback-loop skill — the single shared extract→stage→approve→apply procedure run by `/flowcode:feedback` and pointed to by the Stop-hook nudge |
| `flowcode:feedback` → `scripts/analyze-session.sh` | on-demand | Bundled read-only evidence gatherer for the feedback skill's Step 1 — prints a digest of whole-repo `git status`/`--stat`, recent `hooks.log` block/warn lines, and plan/project-log heads. Writes nothing |
| `flowcode:ui-mockups` | on-demand | Mockup composer skill — grounds in `ui-design-system.md`, composes vendored taste lenses (`references/taste/`) + optional live engines, emits 3 self-checked HTML iterations. Dispatched by the UI gate and by `/flowcode:mockup` |
| `flowcode:ui-mockups` → `references/` | on-demand | Composer reference bundle — `house-style.css`, `quality-checklist.md`, and `taste/` (vendored taste-skill lenses + `taste-skills-index.md` router) |
| `flowcode:research` | on-demand | Research-session skill — cache-first scoped research; dispatches `flowcode:researcher-agent` (parallel for independent questions). Run by `/flowcode:research`; also the silent context-gather inside the design session |
| `flowcode:docs` | on-demand | Documentation-reference skill — cache-first; reads the stack from `project-overview.md` and fans out `flowcode:docs-researcher-agent` per technology (parallel), or gathers one. Run by `/flowcode:docs`; also the lazy first-touch gather behind the consult-every-time rule |
| `flowcode:review` | on-demand | Review-session skill — resolves scope (working tree / staged / ref range / paths), detects an optional plan `{PREFIX}`, dispatches `flowcode:code-reviewer-agent`, routes findings to `{PREFIX}-qa-report.md` or `.flowcode/reviews/{slug}-review.md`. Run by `/flowcode:review` |
| `flowcode:design` | on-demand | Design-session skill — conversational scope (fuzzy-idea or approved-scope entry) then `flowcode:designer-agent` depth; ends at a review gate, hands to `flowcode:plan`. Run by `/flowcode:design` and `/flowcode:brainstorm` |
| `flowcode:plan` | on-demand | Plan-session skill — verifies the design is approved, dispatches `flowcode:planner-agent`, registers the plan `active`, gates before execution. Run by `/flowcode:plan` |
| `flowcode:execute` | on-demand | Execute/continue-plan skill — resume detection + per-phase Phase Close Sequence + Post-Execution Pipeline; orchestrates the review/QA/audit/artifact agents. Run by `/flowcode:execute` |
| `flowcode:browser` | on-demand | Browser/app-check skill — resolves mode (capture/smoke/all) + scope (plan ui-design viewports + mockup, or standalone routes) + the App-Run recipe, dispatches `flowcode:browser-runner-agent`, routes findings (capture → visual-parity drift; smoke → e2e) to `{PREFIX}-qa-report.md` or relays advisory. Run by `/flowcode:browser`; also dispatched by the UI gate + `flowcode:execute` close |
| `flowcode:browser` → `references/` | on-demand | Harness reference bundle — `capture.mjs` (vendored Playwright engine), `provisioning.md` (driver ladder + commands), `browser-config.schema.md` (config/result contract) |
| `flowcode:bootstrap` | on-demand | Bootstrap-session skill — the when-to-bootstrap decision + greenfield gate around `flowcode:bootstrap-agent`. Run by `/flowcode:bootstrap` |
| `flowcode:module-doc` | on-demand | Module-doc skill — the which-module/when decision around `flowcode:module-explorer-agent`; (re)generates one stale/missing `modules/{name}.md` at depth in merge-mode, no full re-bootstrap. Run by `/flowcode:module-doc` |
| harness settings template | reference | The installer merges its hook registrations into the active harness's settings on install (not a runtime-loaded file) |
| `.flowcode/logs/hooks.log` | reference | TSV sink for every hook fire (`timestamp\thook\ttool\tpath\toutcome`). Auto-created on first hook execution |
| `.flowcode/install-manifest.json` | reference | Manifest of every installed file (with `version` + per-file `sha256`) and CLAUDE.md block written by `flowcode-install.js`. Consumed by `flowcode-uninstall.js` (removal) and by `migrate-plan.js` (diffed against `framework-manifest.json` to compute the upgrade delta) |
| `.flowcode/framework-manifest.json` | reference | Per-version checksum manifest of framework-owned files (installed-path form), generated + self-checked by `bundle.js` and shipped with the framework. The machine source of truth `migrate-plan.js` diffs against the install manifest to decide which files an upgrade touches |

---

## Installation Tooling

| File | Load Type | Purpose |
|------|-----------|---------|
| `flowcode/flowcode.yml` | reference | Framework metadata (name, version, spec_version, requirements, install paths). `version` is stamped into `install-manifest.json` at install and read by `migrate-plan.js` to scope the changelog version range |
| `.flowcode/changelog.md` | on-demand | Version-keyed flowcode changelog — a human summary plus an auto-generated `Added/Changed/Removed` file list (`files:auto`, written + verified by `bundle.js`) per version, and for non-inferable host-owned changes a migrator-executable `**Migration**` block. `migrate-plan.js` reads only the Migration blocks; the file delta comes from `framework-manifest.json` |
| `flowcode/migrate-plan.js` | on-demand | Deterministic delta engine behind `/flowcode:migrate` — diffs `install-manifest.json` against the source `framework-manifest.json` (framework-owned only), and `--apply` (copy changed/added, harvest-then-remove dropped) / `--merge-hooks` / `--restamp`. Does all the per-file work outside any LLM turn; `mode: full-convergence` for legacy installs |
| `flowcode-install.js` | on-demand | Installer engine — cross-platform Node, no deps (`flowcode.sh`/`flowcode.cmd` are thin launchers). Copies the `flowcode/` kernel to `.flowcode/`, wires agent-tools into the active harness (`flowcode.yml` `install_paths.agent_tools`), injects the flowcode block into the harness's root instructions file, writes `install-manifest.json` (version + sha256), and merges the hook registrations into the harness settings. First-install by default; refuses a silent re-run over an existing install (upgrade via `/flowcode:migrate`). `--force` refreshes framework files while preserving host-owned content; `--dry-run` previews |
| `flowcode-uninstall.js` | on-demand | Uninstaller engine (`.sh`/`.cmd` launchers) — reads `install-manifest.json` and removes only listed paths; preserves host-owned content (per `install-lib.js`) unless `--purge-artifacts` is passed. Supports `--dry-run` |
| `flowcode/install-lib.js` | reference | Single source of truth for the ownership split (`FLOWCODE_HOST_OWNED` + `isHostOwned`), the dev-only top-level set, the installed-path mapper (`installedPathFor`), and the idempotent hook-registration merge (`mergeHookRegistrations`). Required by `flowcode-install.js`, `flowcode-uninstall.js`, `link_project.js`, `bundle.js`, and `migrate-plan.js` so ownership / path-mapping / hook-merge stay consistent |
| `flowcode/install-fs.js` | reference | Cross-platform filesystem helpers (sha256, recursive copy/walk/remove) shared by the install / uninstall / link / bundle / migrate scripts — the dependency-free Node replacements for rsync / find / shasum |

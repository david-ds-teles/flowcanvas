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
| `.flowcode/workflow/flowcode-workflow.md` | eager | Tier loading rules, Read Depth protocol, available workflows, parallelism rules, sub-agent dispatch table |
| `.flowcode/workflow/file-conventions.md` | context | The frontmatter + summary standard and the full Read Depth protocol; load when authoring or validating a managed `.md`. The operational Read Depth ladder is inline in `flowcode-workflow.md` |
| `.flowcode/workflow/flowcode-persona.md` | eager | Agent communication style and identity |
| `.flowcode/workflow/flowcode-rules.md` | eager | All mandatory behavioral rules — every rule must be followed without exception |
| `.flowcode/workflow/flowcode-tools.md` | eager | Tools registry — mandatory tools, flowcode agent tools, project tools |
| `.flowcode/project/project-overview.md` | eager | Living project knowledge base — architecture, stack, modules, quality gates |
| `.flowcode/project/project-log.md` | eager | Reverse-chronological project-level event log (`[PLAN COMPLETE]`, `[BOOTSTRAP]`, `[BUGFIX]`, `[QUICKFIX]`) |
| `.flowcode/plans/plan-instructions.md` | eager | Mandatory phase lifecycle rules, phase statuses, halt conditions, phase-close minimum |
| `.flowcode/plans/plan-execution.md` | on-demand | The execution procedure — per-phase implementation, Phase Close Sequence, Post-Execution Pipeline. Load when running, resuming, or closing a plan |

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
| `.flowcode/templates/templates-index.md` | on-demand | **Authoritative** catalog of every artifact template (one row each, with used-by + trigger). Load before writing any artifact to find and read its template (Template First) |

---

## UI Subsystem

| File | Load Type | Purpose |
|------|-----------|---------|
| `.flowcode/ui/ui-index.md` | on-demand | Subsystem router — load first when a plan touches frontend |
| `.flowcode/ui/ui-design-system.md` | on-demand | Mandatory design ground truth — token + component digest every mockup obeys; ships as a starter, harvested per-project by bootstrap (host-owned) |
| `.flowcode/ui/ui-workflow.md` | on-demand | UI design lifecycle — source-grounded mockups (snapshot the running UI when implemented, else the plan's UI/UX definitions): one fidelity anchor + two distinct explorations, selection, implementation, phase-close visual parity, plan-close capture |
| `.flowcode/ui/ui-mockup-discipline.md` | on-demand | Mockup conventions — flat directory, filenames, test IDs, design tokens, breakpoints, MCP prefs, the Fidelity discipline + state-switcher output form |
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

## Evaluation

| File | Load Type | Purpose |
|------|-----------|---------|
| `.flowcode/eval/eval-index.md` | on-demand | Router for the evaluation subsystem — lists the 3 eval scripts and the `logs/eval/` output convention. Load when running `/flowcode:evaluate` or wiring evaluation |
| `.flowcode/eval/flowcode-eval.js` | on-demand | Orchestrator — runs Layer 1 + Layer 2 inline (dependency-free Node), prints the Layer 3 dispatch, writes `logs/eval/summary-{date}.md`. Invoked by the `flowcode:evaluate` skill |
| `.flowcode/eval/eval-hooks-log.js` | on-demand | Layer 1 — aggregates `logs/hooks.log` into per-hook outcome counts + high-block flags |
| `.flowcode/eval/eval-artifacts.js` | on-demand | Layer 2 — structural rubric scorer over `plans/{PREFIX}/` artifacts |
| `.flowcode/logs/eval/` | reference | Host-runtime output sink for all evaluation reports (`hooks-{date}`, `static-{date}`, `summary-{date}`, `{PREFIX}.json`, `trend.jsonl`). Auto-created on first run; never shipped |

---

## Agent Tools (wired into the active harness by the installer — see `flowcode.yml` `install_paths.agent_tools`)

These are invoked by their wired name, not read by path — there is no `agent-tools/` directory in a host install (the installer routes them into the harness). Reference a sub-agent as `flowcode:<name>`, a skill as `flowcode:<name>`, a command as `/flowcode:<name>`; hooks fire automatically. This is the discovery roster — each capability's full behavior lives in its own file, loaded on dispatch. All are **on-demand** by name except rows marked `automatic` (hooks — fire by themselves) or `reference` (runtime/installer artifacts, not invoked).

| Capability | Purpose |
|------|------|
| `flowcode:bootstrap-agent` | Explores the project, writes the knowledge base; dispatches `module-explorer` per module (sonnet) |
| `flowcode:module-explorer-agent` | Deeply explores ONE module → self-contained `modules/{name}.md`, merge-mode (sonnet) |
| `flowcode:code-explorer-agent` | Post-execution audit of implementation vs spec → divergence report (sonnet) |
| `flowcode:researcher-agent` | Resolves one scoped research question → `{slug}-research.md`, cache-first (haiku) |
| `flowcode:docs-researcher-agent` | Distills a technology's official docs → `references/docs/{tech-slug}.md`, cache-first (sonnet) |
| `flowcode:designer-agent` | Produces `{PREFIX}-design.md` at full depth; runs the mockup flow for UI plans (opus) |
| `flowcode:planner-agent` | Produces `{PREFIX}-plan.md` + `{PREFIX}-log.md` from the approved design (opus) |
| `flowcode:implementer-agent` | Implements one file-disjoint phase slice → exports/deviations report; advisory fan-out (sonnet) |
| `flowcode:code-reviewer-agent` | Reviews changed files → `## Check` prepend; phase/plan/standalone modes (sonnet) |
| `flowcode:qa-runner-agent` | Runs declared quality gates → Stack Gate table + raw logs (sonnet) |
| `flowcode:artifact-updater-agent` | Phase/plan close: changelog, logs, module docs, technical-overview, test-notes, syncs (sonnet) |
| `flowcode:migrator-agent` | Delta-upgrade judgment remainder — harvest host edits, apply `**Migration**` blocks (sonnet) |
| `flowcode:evaluator-agent` | Layer 3 judge — scores one plan's artifacts 0–4 → `logs/eval/{PREFIX}.json` + trend; advisory (sonnet) |
| `flowcode:browser-runner-agent` | Drives `capture.mjs` → screenshots + testid asserts + `result.json`; driver ladder (sonnet) |
| `artifact-naming-check` | automatic — PreToolUse: validates plan/research artifact naming |
| `frontmatter-summary-check` | automatic — PreToolUse: blocks managed `.md` lacking frontmatter (5 keys) or summary |
| `harness-leak-check` | automatic — PreToolUse: blocks harness dirs / non-resolvable agent-tools paths in framework docs |
| `markdown-quality-check` | automatic — PostToolUse render-lint: render-breaking defects block, style issues warn |
| `project-log-format-check` | automatic — PreToolUse: enforces project-log tags + the `**Dev:**` line |
| `qa-probe-gate` | automatic — PreToolUse(Bash): blocks commit/PR on FAIL or unresolved `≥ medium` finding |
| `plan-artifact-index` | automatic — SessionStart: emits dev identity, active plans, last 5 project-log entries |
| `notify-sound` | automatic — Stop/Notification: plays a cross-platform sound |
| `feedback-nudge` | automatic — Stop: nudges `/flowcode:feedback` once per session when the repo changed |
| `/flowcode:bootstrap` | Runs the `flowcode:bootstrap` skill to initialize or re-bootstrap the project |
| `/flowcode:module-doc` | Runs `flowcode:module-doc` — (re)generate one module's deep doc, merge-mode |
| `/flowcode:extend` | Extends/customizes the framework from a natural-language statement; previews then applies |
| `/flowcode:brainstorm` | Fuzzy-idea entry — alias into the `flowcode:design` skill (Mode A) |
| `/flowcode:feedback` | Runs the feedback-loop skill (extract → stage → approve → apply) |
| `/flowcode:migrate` | Runs `migrate-plan.js` to compute/apply the upgrade delta. Args: `--source`, `--force`, `--dry-run` |
| `/flowcode:mockup` | Standalone `flowcode:ui-mockups` — grounded HTML mockups, no plan |
| `/flowcode:render-html` | Renders an artifact into a self-contained house-style HTML deliverable |
| `/flowcode:research` | Runs `flowcode:research` — standalone cache-first research session |
| `/flowcode:docs` | Runs `flowcode:docs` — gather/consult distilled tech-doc references (no-arg = whole stack) |
| `/flowcode:review` | Runs `flowcode:review` — standalone, plan-optional code review over a diff |
| `/flowcode:evaluate` | Runs `flowcode:evaluate` — 3-layer plan-artifact evaluation; advisory, `PREFIX` optional |
| `/flowcode:revise` | Runs `flowcode:revise` — post-execution polish loop + completion trigger |
| `/flowcode:design` | Runs `flowcode:design` — canonical design surface (`/flowcode:brainstorm` is the alias) |
| `/flowcode:plan` | Runs `flowcode:plan` — turns an approved design into `{PREFIX}-plan.md` |
| `/flowcode:execute` | Runs `flowcode:execute` — execute/resume an active plan through close + pipeline |
| `/flowcode:browser` | Runs `flowcode:browser` — viewport capture + app smoke (`capture`/`smoke`/`all`) |
| `/flowcode:contributors` | Runs `flowcode:contributors` — attribution report over `Dev:` log fields |
| `flowcode:contributors` | Read-only `**Dev:**`-field rollup across plan + project logs — who built/changed/fixed what |
| `flowcode:feedback` | The shared extract→stage→approve→apply session-knowledge loop |
| `flowcode:feedback` → `scripts/analyze-session.sh` | Read-only evidence gatherer for the feedback skill's Step 1 |
| `flowcode:ui-mockups` | Source-grounded mockup composer — anchor + two distinct explorations, self-checked |
| `flowcode:ui-mockups` → `references/` | Composer bundle — `house-style.css`, checklist, exemplar, vendored taste lenses |
| `flowcode:research` | Cache-first scoped research; dispatches `flowcode:researcher-agent` (parallel) |
| `flowcode:docs` | Cache-first docs gather; fans out `flowcode:docs-researcher-agent` per technology (parallel) |
| `flowcode:review` | Resolves scope, dispatches code-reviewer, routes findings to qa-report / reviews |
| `flowcode:evaluate` | Runs the L1–2 orchestrator + dispatches the L3 judge per plan; advisory |
| `flowcode:revise` | Revise-stage loop (fix/adjust/amend); records `[REVISE]`; triggers completion on sign-off |
| `flowcode:design` | Conversational scope → `flowcode:designer-agent` depth; ends at a review gate |
| `flowcode:plan` | Verifies design approved, dispatches planner, registers plan `active`, gates |
| `flowcode:execute` | Resume detection + per-phase close + post-execution pipeline orchestration |
| `flowcode:browser` | Resolves mode/scope/driver, dispatches browser-runner, routes findings |
| `flowcode:browser` → `references/` | Harness bundle — `capture.mjs`, `provisioning.md`, config schema |
| `flowcode:bootstrap` | When-to-bootstrap decision + greenfield gate around `flowcode:bootstrap-agent` |
| `flowcode:module-doc` | Which-module/when decision around `flowcode:module-explorer-agent`, merge-mode |
| harness settings template | reference — installer merges hook registrations into the harness settings on install |
| `.flowcode/logs/hooks.log` | reference — TSV sink for every hook fire (`timestamp\thook\ttool\tpath\toutcome`); auto-created; size-capped ~2 MB (keep-last-half) by the writing hooks |
| `.flowcode/install-manifest.json` | reference — manifest of installed files (version + sha256); consumed by uninstall + migrate |
| `.flowcode/framework-manifest.json` | reference — per-version checksum manifest `migrate-plan.js` diffs against the install manifest |

---

## Installation Tooling

| File | Load Type | Purpose |
|------|-----------|---------|
| `flowcode/flowcode.yml` | reference | Framework metadata (name, version, spec_version, requirements, install paths). `version` stamps the install manifest; `migrate-plan.js` scopes the changelog range from it |
| `.flowcode/changelog.md` | on-demand | Version-keyed changelog — human summary + auto `Added/Changed/Removed` file list (`files:auto`, by `bundle.js`) + migrator `**Migration**` blocks (the only part `/flowcode:migrate` reads; file delta comes from `framework-manifest.json`) |
| `flowcode/migrate-plan.js` | on-demand | Deterministic delta engine behind `/flowcode:migrate` — diffs install vs source `framework-manifest.json`; `--apply` / `--merge-hooks` / `--restamp`; `full-convergence` for legacy installs. All per-file work outside any LLM turn |
| `flowcode-install.js` | on-demand | Installer engine (cross-platform Node, no deps). Copies the kernel to `.flowcode/`, wires agent-tools into the harness, injects the CLAUDE.md block, writes `install-manifest.json`, merges hook registrations. First-install only; `--force` / `--dry-run` |
| `flowcode-uninstall.js` | on-demand | Uninstaller engine — reads `install-manifest.json`, removes only listed paths, preserves host-owned content unless `--purge-artifacts`. `--dry-run` |
| `flowcode/install-lib.js` | reference | Single source of truth for the ownership split, dev-only set, installed-path mapper, and hook-registration merge. Required by install/uninstall/link/bundle/migrate |
| `flowcode/install-fs.js` | reference | Cross-platform fs helpers (sha256, recursive copy/walk/remove) shared by install/uninstall/link/bundle/migrate — dependency-free |

---
name: flowcode-workflow
description: The agent operating manual — tier loading sequence, read-depth protocol, workflow catalog, sub-agent dispatch, and model routing.
status: active
tags: [workflow, load-scope, read-depth, dispatch, model-routing]
links: [.flowcode/workflow/flowcode-rules.md, .flowcode/workflow/file-conventions.md, .flowcode/workflow/git-workflow.md, .flowcode/flowcode-index.md, .flowcode/plans/plan-instructions.md]
---

# Flowcode AI Workflow Framework

- Lightweight, portable, pure-markdown operating manual: on startup the agent reads a few files, understands project state, and knows what to load, skip, or do next.
- **Load Scope** governs which files load and when — Tier 1 (mandatory startup), Tier 2 (context-aware), Tier 3 (task-step triggered); Tier 1 must complete before responding to the user.
- **Read Depth** governs how much of a chosen file to read — index→frontmatter→summary→full; orthogonal to Load Scope. Full spec: file-conventions.md.
- Workflow catalog carries per-workflow steps and model: bootstrap, brainstorm, new-feature, continue-plan, bugfix, quick-fix, research, docs, plan-update, generate-artifacts, ui-design.
- Sub-Agent Dispatch Table maps trigger to agent, output, and model; dispatch is allowed, not mandatory.
- Model Routing: opus only for main orchestration and brainstorm/design sessions; sonnet or haiku for everything else.
- Parallelism is mandatory wherever work is independent — running parallelizable operations sequentially is a framework breach.

---

## Read Tier Rules

Every conversation must follow the tier loading sequence below. Skipping tiers or loading files out of order is a framework breach.

1. **Tier 1:** Mandatory reads — load on every startup, no exceptions
2. **Tier 2:** Context-aware reads — load after Tier 1 when signals are present
3. **Tier 3:** Task-dependent reads — load only when a specific workflow step is actively executing


### Tier 1 Rules

**STOP. Do not read any plan, task, or project file, and do not respond to the user's request until these MANDATORY files are loaded.** Proceeding without completing Tier 1 is a framework breach.

- `.flowcode/flowcode-index.md`
- `.flowcode/workflow/flowcode-workflow.md`
- `.flowcode/workflow/flowcode-persona.md`
- `.flowcode/workflow/flowcode-rules.md`
- `.flowcode/workflow/flowcode-tools.md`
- `.flowcode/project/project-overview.md`
- `.flowcode/project/project-log.md`
- `.flowcode/plans/plan-instructions.md`

**IMPORTANT:** From now on you act, behave and produce high quality outputs per this framework specification and must NEVER deviate from its instructions.

**If `project-overview.md` is empty or contains only the template skeleton:**
Immediately inform the user that the project has not been bootstrapped and offer to run `/flowcode:bootstrap` before proceeding.


### Tier 2 Rules

Context-aware files. Load **after Tier 1** only when related to the current request.

1. **Active or recent plan**
   - Load: `.flowcode/plans/plan-index.md` → `{PREFIX}-design.md` → `{PREFIX}-plan.md` → `{PREFIX}-ui-design.md` (if the plan touches frontend)
   - Also load: source files and modules listed in the plan scope

2. **Prior research on a referenced topic**
   - Load: `.flowcode/researches/researches-index.md` → relevant research file(s)

3. **Reference material in scope**
   - When the request touches something a reference covers, load: `.flowcode/references/references-index.md` → the relevant `references/{type}/{slug}.md` (summary-first). Documentation references are technology-keyed (a stack technology in `project-overview.md § Technology Stack` → its `docs/{tech-slug}.md`); design, spec, and example references load when the task touches what they cover
   - If a needed `docs` reference is missing or `stale`, dispatch `flowcode:docs-researcher-agent` (or run `/flowcode:docs <tech>`) before coding; register new material with `/flowcode:reference` — see `flowcode-rules.md § Consult References`

4. **Quality Checks (gates + code-quality conventions + markdown-quality)**
   - Load: `.flowcode/quality-checks/quality-checks-index.md`
   - When the active plan or request touches code: also load the relevant code-quality sub-files from the same directory (`naming-conventions.md`, `typed-models.md`, `enums-and-constants.md`, `error-handling.md`, `clean-code.md`, `idiomatic-code.md`)
   - When producing markdown artifacts (plans, designs, reports): also load `markdown-quality.md`

5. **Backlog (brainstorming or design sessions)**
   - Load: `.flowcode/project/backlog.md`

6. **Context to reason**
   - Load: any extra file needed to fully comprehend the current user request and propose a high-quality response

**Loading order:** `plan-index.md` → plan files → source files → `researches-index.md` → research files → `references-index.md` → reference files → `quality-checks-index.md` → `backlog.md`


### Tier 3 Rules

Task-dependent files are loaded **only when a specific workflow step is actively executing**. They are never loaded during startup or context gathering.

| Workflow Step | Load / Dispatch | Trigger |
|--------------|-------------|---------|
| Running a phase session | the matching `flowcode:{phase}` skill (`design`, `plan`, `execute`, `research`, `bootstrap`) | User runs the phase's slash command — `/flowcode:design` / `/flowcode:brainstorm`, `/flowcode:plan`, `/flowcode:execute`, `/flowcode:research`, `/flowcode:bootstrap` — or asks to run that phase |
| Running a review session | `flowcode:review` | User runs `/flowcode:review` (or asks for an ad-hoc code review outside the phase-close lifecycle) |
| Creating a design artifact | `.flowcode/templates/design-template.md` | Design stage begins; brainstorm hands off, or user says "design" / "new feature" directly with an already-approved scope |
| Creating a plan artifact | `.flowcode/templates/plan-template.md` | Plan generation begins; design is approved and plan writing starts |
| Creating a UI design artifact | `.flowcode/templates/ui-design-template.md` | Plan touches frontend; UI design stage begins before implementation |
| Creating or updating `{PREFIX}-log.md` | `.flowcode/templates/plan-log-template.md` | Plan folder creation (`[PLAN CREATED]` entry); every phase end (`[PHASE]` entry); plan end (`[PLAN COMPLETE]` entry) |
| Capturing research findings | `.flowcode/templates/research-template.md` | Research agent completes and is about to write its output |
| Capturing a technology reference | `.flowcode/templates/doc-reference-template.md` | Docs researcher completes and is about to write `references/docs/{tech-slug}.md` |
| Registering reference material | `flowcode:reference` skill (+ `.flowcode/templates/reference-template.md`) | User runs `/flowcode:reference <material>` to file material and write a `references/{type}/{slug}.md` card |
| Writing a QA report | `.flowcode/templates/qa-report-template.md` | Phase-complete pipeline reaches QA report generation |
| Writing a technical overview | `.flowcode/templates/technical-overview-template.md` | Post-execution pipeline begins; all phases are done |
| Writing a changelog | `.flowcode/templates/changelog-template.md` | Phase end (append per-phase section) or post-exec reconciliation |
| Writing test notes | `.flowcode/templates/test-notes-template.md` | Post-execution parallel artifact generation step |
| Adding a backlog entry | `.flowcode/templates/backlog-entry-template.md` | During brainstorming/design, before appending a `BL-NNN` row |
| Writing code | `.flowcode/quality-checks/quality-checks-index.md` (+ relevant code-quality sub-files) | Tier 2 — load when planning or executing code-touching work. See `flowcode-rules.md § Code Quality Conventions` |
| Git operations | `.flowcode/workflow/git-workflow.md` | Before any branch / commit / merge / release |
| Running bootstrap | `flowcode:bootstrap-agent` | User runs `/flowcode:bootstrap` or explicitly asks to initialize the project |
| Running module explorer | `flowcode:module-explorer-agent` | Bootstrap Step 3.5 (one per module); standalone single-module (re)generation via `/flowcode:module-doc` |
| Running code explorer | `flowcode:code-explorer-agent` | Post-execution pipeline Step 2 — before technical-overview generation |
| Running researcher | `flowcode:researcher-agent` | Parent needs authoritative external facts and `researches-index.md` has no fresh hit |
| Running docs researcher | `flowcode:docs-researcher-agent` | A stack technology is in scope and `references-index.md` has no fresh reference, or `/flowcode:docs` runs |
| Running designer | `flowcode:designer-agent` | Scope approved; `{PREFIX}-design.md` about to be written |
| Running planner | `flowcode:planner-agent` | Design approved; `{PREFIX}-plan.md` about to be written |
| Running code reviewer | `flowcode:code-reviewer-agent` | Phase Close Sequence Step 1; plan completion QA; standalone `/flowcode:review` |
| Running QA runner | `flowcode:qa-runner-agent` | Phase close; plan close; user requests a full quality run |
| Running artifact updater | `flowcode:artifact-updater-agent` | Phase Close Sequence Steps 5-6; Post-Execution Pipeline Steps 4-5 |
| Creating an agent | `.flowcode/templates/agents-structure-template.md` | A new sub-agent needs to be authored and wired into the harness |
| Writing a module detail file | `.flowcode/templates/module-template.md` | Any new file under `.flowcode/project/modules/` (bootstrap or plan-phase contract change) |

**Rule:** Load the template or file immediately before executing the step. Never load speculatively.
**Rule:** After generating an artifact from a template, the artifact-naming-check hook validates it automatically.


---

## Read Depth

The Tier rules above are the **Load Scope** axis (which files, when). **Read Depth** is the orthogonal axis — how much of a chosen file to read: **index → frontmatter → summary → full**, stopping as soon as you have enough. Frontmatter + the ≤10-line summary at the top of every file make the shallow tiers cheap, and a file's `links:` let you jump to related files without re-deriving paths from the index. Full protocol (frontmatter schema, status values, `links` navigation): `.flowcode/workflow/file-conventions.md`.

---

## Available Workflows

Every phase of the lifecycle is an independently invocable **skill** paired with a thin **slash command** — run any phase standalone, anytime (the dual-surface rule: no capability is agent-discretion-only). The sections below summarize each workflow; the **full executable procedure lives in the named skill** — load it (Read Depth) when you run the phase, rather than re-deriving it here. Bug Fix and Quick Fix stay inline — too small to warrant a skill.

| Workflow | Run via | When to Use |
|----------|---------|-------------|
| **Bootstrap** | `flowcode:bootstrap` skill · `/flowcode:bootstrap` | First-time setup; `project-overview.md` empty/skeleton; major restructuring |
| **Research** | `flowcode:research` skill · `/flowcode:research` | Resolve an external unknown into a cached, citable finding |
| **Documentation** | `flowcode:docs` skill · `/flowcode:docs` | Gather/consult distilled official-docs references (the `docs` reference type) for stack technologies — before coding against a technology |
| **Reference** | `flowcode:reference` skill · `/flowcode:reference` | Register existing material (design files, specs, diagrams, examples) as a reusable reference card under `references/` — consulted thereafter like any reference |
| **Review** | `flowcode:review` skill · `/flowcode:review` | Code-review an arbitrary diff against the knowledge base (project-overview, module contracts, gates, conventions) — standalone, plan-optional, review-only |
| **Design** | `flowcode:design` skill · `/flowcode:design`, `/flowcode:brainstorm` | Turn a fuzzy idea or approved scope into a complete `{PREFIX}-design.md` |
| **Plan** | `flowcode:plan` skill · `/flowcode:plan` | Turn an approved design into a phased `{PREFIX}-plan.md` |
| **Execute / Continue Plan** | `flowcode:execute` skill · `/flowcode:execute` | Implement a fresh active plan or resume a paused/interrupted one through to completion |
| **Generate Artifacts** | tail of `flowcode:execute` (Post-Execution Pipeline) | Post-execution artifacts for a completed plan (technical-overview, changelog, test-notes, qa-report) |
| **New Feature** | the chain `/flowcode:design` → `/flowcode:plan` → `/flowcode:execute` | Full lifecycle: design → (ui-design if frontend) → plan → implement → quality → artifacts → PR |
| **Plan Update** | `flowcode:plan` (merge re-run); `/flowcode:design` for scope changes | Modify an existing plan or design after new information |
| **Bug Fix** | inline workflow (no skill) — see § Bugfix Workflow | Diagnosing and fixing a specific defect — no design/plan cycle needed |
| **Quick Fix** | inline workflow (no skill) — see § Quick Fix Workflow | Small scoped change, may or may not relate to an active plan |

---

## Design Session

The standalone design phase — turns a fuzzy idea (or an already-approved scope) into a complete `{PREFIX}-design.md`. **Run via `/flowcode:design` (canonical) or `/flowcode:brainstorm` (the fuzzy-idea alias); the full procedure lives in the `flowcode:design` skill** — load it when the phase runs rather than duplicating its steps here.

- Conversational, **main session** — clarifying questions one at a time; a sub-agent can't host the loop (no return channel mid-run). `flowcode:designer-agent` is dispatched as a sub-agent; the conversation is not.
- Silent parallel context-gather first (`flowcode:code-explorer-agent`, `flowcode:research` when a tech is unknown, Tier-2 reads) — never ask what the repo already answers.
- Decomposition gate for multi-subsystem topics; per-question visual-companion offer for UI topics (`ui/ui-workflow.md § 1`).
- Section-by-section approval (Problem → Success Criteria → In/Out Scope → Considered Alternatives → Recommended Approach) → PREFIX assignment → write upper sections + register the `draft` plan row → dispatch `flowcode:designer-agent` (gap-fill) for DDL, signatures, mermaid, risks, research refs.
- Ends at a final review gate; the planner (`flowcode:plan`) is **user-gated, never auto-chained**.

**Model:** opus (design sessions use opus).

---

## Bugfix Workflow

Bugfixes do not require design or plan artifacts. They follow a tight investigate-fix-log loop.

**Steps:**

1. Read `.flowcode/project/project-log.md` last 10 entries to understand recent project changes
2. Load Tier 2 files related to the issue if they exist — get module and file context before touching code
3. Diagnose root cause (never guess — verify by reading code, logs, and recent changes)
4. Apply the minimal correct fix. Do not refactor or improve surrounding code
5. Run all tests and quality gates — all must pass
6. Add a `[BUGFIX]` entry at the **top** of `.flowcode/project/project-log.md` using `.flowcode/templates/project-log-template.md` — 3 lines max: root cause + fix + affected component
7. Commit — clean, no AI attribution

**No artifacts generated.** Bugfixes are logged in `project-log.md`, not as plan artifacts.

**Model:** sonnet.

---

## Quick Fix Workflow

A quickfix is a small, scoped change that doesn't justify a full design/plan cycle. It may relate to an existing plan or be a standalone project change.

**Steps:**

1. Read `.flowcode/project/project-log.md` last 10 entries to understand recent project changes
2. Confirm scope is truly small (1–3 files, < 1 day). If it grows, escalate to a plan
3. Load Tier 2 files related to the change — get module and file context
4. Plan the solution, assess impacts and side-effects, **show the plan to the user for approval before applying**
5. Apply the approved change
6. Run relevant quality gates
7. Add a `[QUICKFIX]` entry at the **top** of `.flowcode/project/project-log.md` using `.flowcode/templates/project-log-template.md` — 5 lines max, include the plan PREFIX if related to one
8. Commit — clean, no AI attribution

**No artifacts generated.** Quickfixes are logged in `project-log.md` only.

**Model:** sonnet.

---

## UI Design Workflow

**Gated opt-in.** Applies only when a plan's scope touches frontend files (Angular, React, Vue, Svelte, native mobile UI, design tokens, style sheets). Backend-only plans skip this workflow entirely.

For the full lifecycle — 3-iteration parallel mockup dispatch, selection, implementation, phase-close visual parity, plan-close canonical capture — load `.flowcode/ui/ui-index.md` and follow the files it points to (`ui-workflow.md`, `ui-mockup-discipline.md`).

Gating rule and phase-close visual parity requirements: `.flowcode/plans/plan-instructions.md § UI Design Gate`.

---

## Generate Artifacts Workflow

Produces post-execution artifacts for a completed plan: `technical-overview`, `changelog` reconciliation, `test-notes`, `qa-report`.

**Run via:** the tail of `flowcode:execute` — it runs automatically when the final phase closes, not as a separate operator command.

**Trigger:** All phases done, quality gates pass.

**Pipeline:** Sequential gates + audit + authoritative artifacts, then parallel finalization. Full specification in `.flowcode/plans/plan-instructions.md § Post-Execution Pipeline`.

**Sequential — gates, audit, authoritative artifacts:**
1. Quality gates (tests, lint, typecheck, coverage) — all must pass
2. Code Explorer (sonnet) — audits code vs spec, produces divergence report via `flowcode:code-explorer-agent` agent (main agent already holds plan/design/log context from the normal Tier 2 sweep)
3. Main agent — generates `{PREFIX}-technical-overview.md` using the audit report as authoritative source
4. Code-review agent (sonnet) — generates `{PREFIX}-qa-report.md`; all findings fixed before the parallel step

**Audit fallback:** If step 2 fails (agent error, empty output, or explicit `skipped` status), do **not** block the pipeline. Proceed to step 3 without the divergence report and prepend `> **Audit skipped:** {reason}` to the top of `{PREFIX}-technical-overview.md`. Downstream artifacts in the parallel step inherit the same caveat.

**Parallel — finalization:**
Dispatch 2 sonnet sub-agents simultaneously: changelog reconciliation + test-notes generation.

**Model:** sonnet for all sub-agents. Main agent (orchestration) is opus.

---

## Sub-Agent Dispatch Table

| Agent | Trigger | Output | Model |
|-------|---------|--------|-------|
| `flowcode:bootstrap-agent` | `/flowcode:bootstrap`, empty/stale `project-overview.md` | `project-overview.md`, `modules/*.md` (via `module-explorer-agent`), `quality-checks-index.md` rows, `[BOOTSTRAP]` log | sonnet |
| `flowcode:module-explorer-agent` | Bootstrap Step 3.5 (one per module, parallel); standalone via `/flowcode:module-doc` | one deep `modules/{name}.md` (merge-mode) | sonnet |
| `flowcode:researcher-agent` | Parent needs authoritative external facts; `researches-index.md` has no fresh hit | `{slug}-research.md` (new or `## Update` append) | haiku |
| `flowcode:docs-researcher-agent` | A stack technology is in scope with no fresh `references-index.md` reference; `/flowcode:docs` | `references/docs/{tech-slug}.md` (new or `## Update` append) | sonnet |
| `flowcode:designer-agent` | Scope approved; before plan generation | `{PREFIX}-design.md` (+ 3 mockup iterations for UI plans) | opus |
| `flowcode:planner-agent` | Design approved; before execution | `{PREFIX}-plan.md`, `{PREFIX}-log.md` (`[PLAN CREATED]`) | opus |
| `flowcode:code-reviewer-agent` | Phase Close Sequence Step 1; plan-completion QA; standalone `/flowcode:review` | `## Check` prepend (newest on top) to `{PREFIX}-qa-report.md` (phase/plan) or `.flowcode/reviews/{slug}-review.md` (standalone) | sonnet |
| `flowcode:qa-runner-agent` | Phase close; plan close; user requests full quality run | Stack Gate written into latest (top) `## Check` of `{PREFIX}-qa-report.md`; raw logs in `logs/qa-runs/` | sonnet |
| `flowcode:code-explorer-agent` | Post-Execution Pipeline Step 2 | Code Explorer divergence report (transient, feeds `artifact-updater`) | sonnet |
| `flowcode:artifact-updater-agent` | Phase Close Sequence Step 5-6; Post-Execution Pipeline Steps 4-5 | `{PREFIX}-changelog.md`, `{PREFIX}-log.md`, `modules/*.md`, `{PREFIX}-technical-overview.md`, `{PREFIX}-test-notes.md`, `project-overview.md`, `project-log.md` | sonnet |

Rules:

- Dispatch is **allowed, not mandatory.** Trivial bugfixes and one-file quickfixes may bypass the agent roster entirely — the main agent handles them inline. The dispatch rule kicks in whenever the artifact being produced is registered in `flowcode-index.md` and the corresponding specialized agent exists.
- Agents that produce artifacts follow Template First — each reads its target template before writing.
- The main agent orchestrates; specialized agents do not dispatch each other unless their own file declares it (e.g. `designer` may dispatch `researcher`; `bootstrap` dispatches one `module-explorer` per module). A dispatched agent is itself a leaf — `module-explorer` never dispatches further.

---

## Model Routing

Subagents MUST use the specified model. Using opus for file-reading or templated writing wastes tokens.

| Subagent task | Model | Rationale |
|---------------|-------|-----------|
| Context loading (reading files on startup) | **haiku** | Pure file I/O, no reasoning needed |
| Code exploration (codebase audit, grep, read) | **sonnet** | Search + read + summarize |
| Code review (pre-phase and pre-PR QA) | **sonnet** | Pattern matching against conventions |
| Fix subagent (applying review findings) | **sonnet** | Directed fixes from explicit findings |
| Code explorer (plan-vs-code audit) | **sonnet** | Spec comparison + divergence report |
| Artifact generation (changelog, test-notes, technical-overview) | **sonnet** | Structured writing from templates |
| Research agent (`flowcode:researcher-agent` — scoped fetch + append to cache) | **haiku** | Directed web-fetch + structured write; no novel reasoning |
| Docs researcher (`flowcode:docs-researcher-agent` — official-docs distill into a reference) | **sonnet** | Synthesis of documentation into idioms/gotchas/API surface — more than a directed fetch |
| Bootstrap agent (project exploration + overview generation) | **sonnet** | Structured exploration and writing |
| Planning, design, main orchestration | **opus** | Novel reasoning, architecture decisions |

**Rule:** Only the main orchestration agent and brainstorm/design sessions use opus. Everything else uses sonnet or haiku.


---

## Parallelism Rules

**Core principle:** Never do sequentially what can be done in parallel. Sequential execution of parallelizable operations is a framework breach.

### 1. Bug Investigation

Dispatch parallel reads: technical-overview + changelog + git blame/log of relevant files. Merge results before forming hypothesis.

### 2. Design + Research Sessions

Dispatch multiple research sub-agents in parallel when multiple independent topics need investigation. Each saves its output to `.flowcode/researches/`. Main agent synthesizes into the design artifact after all complete.

### 3. Post-Execution Artifact Generation

After the sequential pipeline (gates → audit → technical-overview → QA report) completes, dispatch 2 sonnet sub-agents in parallel for the changelog reconciliation and test-notes generation.

### 4. Bootstrap Module Exploration

In bootstrap Step 3.5, dispatch one `flowcode:module-explorer-agent` per detected module **in parallel** (batches of ~6 for large module counts). Modules are independent — exploring them sequentially is a parallelism breach. The same applies to `/flowcode:module-doc` over multiple targets.

### 5. Stack Documentation Gather

When `/flowcode:docs` (no args) gathers references for the whole stack, dispatch one `flowcode:docs-researcher-agent` per technology **in parallel** (batches of ~6 for large stacks). Technologies are independent — gathering them sequentially is a parallelism breach.

### When NOT to Parallelize

- Single file reads
- Sequential dependencies (one output feeds the next input)
- User interactions (always sequential — never parallel with other work)
- Within a single phase's implementation work (implement → review → fix is sequential by definition)

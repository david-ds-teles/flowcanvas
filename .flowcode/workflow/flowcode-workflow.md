---
name: flowcode-workflow
description: The agent operating manual — tier loading sequence, read-depth protocol, workflow catalog, and sub-agent dispatch.
status: active
tags: [workflow, load-scope, read-depth, dispatch, parallelism]
links: [.flowcode/workflow/flowcode-rules.md, .flowcode/workflow/file-conventions.md, .flowcode/workflow/git-workflow.md, .flowcode/flowcode-index.md, .flowcode/plans/plan-instructions.md]
---

# Flowcode AI Workflow Framework

- Lightweight, portable, pure-markdown operating manual: on startup the agent reads a few files, understands project state, and knows what to load, skip, or do next.
- **Load Scope** governs which files load and when — Tier 1 (mandatory startup), Tier 2 (context-aware), Tier 3 (task-step triggered); Tier 1 must complete before responding to the user.
- **Read Depth** governs how much of a chosen file to read — index→frontmatter→summary→full; orthogonal to Load Scope. Full spec: file-conventions.md.
- Workflow catalog carries per-workflow steps and model: bootstrap, brainstorm, new-feature, continue-plan, bugfix, quick-fix, research, docs, plan-update, generate-artifacts, ui-design.
- Sub-Agent Dispatch Table maps trigger → agent, output, and model; dispatch is allowed, not mandatory — opus only for main orchestration + brainstorm/design, sonnet/haiku otherwise.
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
| Running / closing a phase, or the post-exec pipeline | `.flowcode/plans/plan-execution.md` | `flowcode:execute` enters phase implementation, the Phase Close Sequence, or (on sign-off) the Post-Execution Pipeline |
| Running a review session | `flowcode:review` | User runs `/flowcode:review` (or asks for an ad-hoc code review outside the phase-close lifecycle) |
| Running an evaluate session | `flowcode:evaluate` | User runs `/flowcode:evaluate`, or the Post-Execution Pipeline Step 6 dispatches the L3 judge at plan completion (non-blocking) |
| Running a revise session | `flowcode:revise` | User runs `/flowcode:revise`, or `flowcode:execute` announces the revise stage and hands off — any post-execution polish or closed-plan amendment |
| Running a browser / app check | `flowcode:browser` | User runs `/flowcode:browser`, or a UI/app phase close runs the visual-parity / smoke check |
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
| Running browser runner | `flowcode:browser-runner-agent` | `flowcode:browser` capture/smoke dispatch — UI/app phase close, or standalone `/flowcode:browser` |
| Running artifact updater | `flowcode:artifact-updater-agent` | Phase Close Sequence Steps 5-6; Post-Execution Pipeline Steps 4-5 |
| Creating an agent | `.flowcode/templates/agents-structure-template.md` | A new sub-agent needs to be authored and wired into the harness |
| Writing a module detail file | `.flowcode/templates/module-template.md` | Any new file under `.flowcode/project/modules/` (bootstrap or plan-phase contract change) |

**Rule:** Load the template or file immediately before executing the step. Never load speculatively.
**Rule:** After generating an artifact from a template, the artifact-naming-check hook validates it automatically.


---

## Read Depth

**Read Depth** is the axis orthogonal to the Tier rules above — *how much* of a chosen file to read: **index → frontmatter → summary → full**, stopping as soon as you have enough. Full protocol (frontmatter schema, status values, `links` navigation): `.flowcode/workflow/file-conventions.md § Read Depth Protocol`.

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
| **Evaluate** | `flowcode:evaluate` skill · `/flowcode:evaluate` | Assess plan-artifact quality (3-layer: hooks-log + static rubric + LLM judge) — advisory, never gates; standalone or non-blocking at plan completion |
| **Browser / App Check** | `flowcode:browser` skill · `/flowcode:browser` | Capture viewports (visual parity) + smoke-test the running app (testids/console, e2e) — standalone or at a UI/app phase close; the driver resolves via its ladder, unattended when Node is present |
| **Design** | `flowcode:design` skill · `/flowcode:design`, `/flowcode:brainstorm` | Turn a fuzzy idea or approved scope into a complete `{PREFIX}-design.md` |
| **Plan** | `flowcode:plan` skill · `/flowcode:plan` | Turn an approved design into a phased `{PREFIX}-plan.md` |
| **Execute / Continue Plan** | `flowcode:execute` skill · `/flowcode:execute` | Implement a fresh active plan or resume a paused/interrupted one; ends at the revise stage (announce + stop) — not at `complete` |
| **Revise** | `flowcode:revise` skill · `/flowcode:revise` | Polish a just-executed plan to done (fix/adjust/amend loop); amend a closed one. Each pass records `[REVISE]`; completion fires on user sign-off |
| **Generate Artifacts** | tail of `flowcode:revise` / `flowcode:execute` sign-off (Post-Execution Pipeline) | Post-execution artifacts for a completed plan (technical-overview, changelog, test-notes, qa-report) — runs on user sign-off after the revise stage, not automatically at last phase |
| **New Feature** | the chain `/flowcode:design` → `/flowcode:plan` → `/flowcode:execute` → `/flowcode:revise` | Full lifecycle: design → (ui-design if frontend) → plan → implement → revise (polish) → quality → artifacts → PR |
| **Plan Update** | `flowcode:plan` (merge re-run); `/flowcode:design` for scope changes; `/flowcode:revise` for scoped post-execution spec corrections | Modify an existing plan or design after new information. Use `/flowcode:revise` for small spec corrections after execution; escalate to `/flowcode:plan` when a new phase is needed |
| **Bug Fix** | inline workflow (no skill) — see § Bugfix Workflow | Diagnosing and fixing a specific defect — no design/plan cycle needed |
| **Quick Fix** | inline workflow (no skill) — see § Quick Fix Workflow | Small scoped change, may or may not relate to an active plan |

---

## Design Session

The standalone design phase turns a fuzzy idea (or an already-approved scope) into a complete `{PREFIX}-design.md`. **Run via `/flowcode:design` (canonical) or `/flowcode:brainstorm` (the fuzzy-idea alias); the full procedure lives in the `flowcode:design` skill** — a conversational main-session loop (a sub-agent can't host it), silent parallel context-gather first, section-by-section approval, then `flowcode:designer-agent` gap-fill (DDL, signatures, mermaid, risks). Ends at a review gate; the planner is **user-gated, never auto-chained**. **Model:** opus.

---

## Bugfix Workflow

A tight investigate-fix-log loop — no design/plan artifacts; logged in `project-log.md` only. **Model:** sonnet.

1. Read the last ~10 `.flowcode/project/project-log.md` entries + load Tier-2 files for the affected module/files.
2. Diagnose the root cause — verify by reading code, logs, and recent changes; never guess.
3. Apply the minimal correct fix (no surrounding refactor); run all tests + quality gates — all must pass.
4. Add a `[BUGFIX]` entry to the **top** of `project-log.md` (`project-log-template.md` — 3 lines: root cause + fix + affected component), then commit clean (no AI attribution).

---

## Quick Fix Workflow

A small scoped change (1–3 files, < 1 day) that doesn't justify a design/plan cycle — standalone or related to a plan; if it grows, escalate to a plan. Logged in `project-log.md` only. **Model:** sonnet.

1. Read the last ~10 `.flowcode/project/project-log.md` entries + load Tier-2 files for context.
2. Plan the change, assess impacts/side-effects, **show the plan to the user for approval before applying**.
3. Apply the approved change; run the relevant quality gates.
4. Add a `[QUICKFIX]` entry to the **top** of `project-log.md` (`project-log-template.md` — ≤5 lines, include the plan PREFIX if related), then commit clean (no AI attribution).

---

## UI Design Workflow

**Gated opt-in.** Applies only when a plan's scope touches frontend files (Angular, React, Vue, Svelte, native mobile UI, design tokens, style sheets). Backend-only plans skip this workflow entirely.

For the full lifecycle — 3-iteration parallel mockup dispatch, selection, implementation, phase-close visual parity, plan-close canonical capture — load `.flowcode/ui/ui-index.md` and follow the files it points to (`ui-workflow.md`, `ui-mockup-discipline.md`).

Gating rule and phase-close visual parity requirements: `.flowcode/plans/plan-instructions.md § UI Design Gate`.

---

## Generate Artifacts Workflow

Post-execution artifacts for a completed plan (technical-overview, changelog reconciliation, test-notes, qa-report). **Runs on user sign-off** after the revise stage — via the tail of `flowcode:revise` or the sign-off step of `flowcode:execute`, never automatically when the last phase closes. Sequential gates → audit → authoritative artifacts, then parallel finalization. Full procedure: `.flowcode/plans/plan-execution.md § Post-Execution Pipeline`. **Model:** sonnet sub-agents; opus orchestration.

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
| `flowcode:implementer-agent` | `flowcode:execute` within-phase fan-out (one per disjoint file slice, parallel; advisory) | the slice's owned source files + a compact exports/deviations report | sonnet |
| `flowcode:code-reviewer-agent` | Phase Close Sequence Step 1; plan-completion QA; standalone `/flowcode:review` | `## Check` prepend (newest on top) to `{PREFIX}-qa-report.md` (phase/plan) or `.flowcode/reviews/{slug}-review.md` (standalone) | sonnet |
| `flowcode:qa-runner-agent` | Phase close; plan close; user requests full quality run | Stack Gate written into latest (top) `## Check` of `{PREFIX}-qa-report.md`; raw logs in `logs/qa-runs/` | sonnet |
| `flowcode:browser-runner-agent` | UI/app phase close (visual parity + smoke); standalone `/flowcode:browser` | PNGs + `result.json` under `captures/` (or a logs path) + raw logs in `logs/browser/`; compact report | sonnet |
| `flowcode:code-explorer-agent` | Post-Execution Pipeline Step 2 | Code Explorer divergence report (transient, feeds `artifact-updater`) | sonnet |
| `flowcode:artifact-updater-agent` | Phase Close Sequence Step 5-6; Post-Execution Pipeline Steps 4-5 | `{PREFIX}-changelog.md`, `{PREFIX}-log.md`, `modules/*.md`, `{PREFIX}-technical-overview.md`, `{PREFIX}-test-notes.md`, `project-overview.md`, `project-log.md` | sonnet |
| `flowcode:evaluator-agent` | `/flowcode:evaluate` (per plan); Post-Execution Pipeline Step 6 (non-blocking) | `logs/eval/{PREFIX}.json` + appended `logs/eval/trend.jsonl` (Layer 3 judge scores) | sonnet |

Rules:

- Dispatch is **allowed, not mandatory.** Trivial bugfixes and one-file quickfixes may bypass the agent roster entirely — the main agent handles them inline. The dispatch rule kicks in whenever the artifact being produced is registered in `flowcode-index.md` and the corresponding specialized agent exists.
- Agents that produce artifacts follow Template First — each reads its target template before writing.
- The main agent orchestrates; specialized agents do not dispatch each other unless their own file declares it (e.g. `designer` may dispatch `researcher`; `bootstrap` dispatches one `module-explorer` per module). A dispatched agent is itself a leaf — `module-explorer` never dispatches further.
- **Model.** Each dispatched agent uses the model named in its row above (sonnet or haiku) — set in its own `model:` frontmatter. Only the main orchestration agent and brainstorm/design sessions use opus; using opus for file-reading or templated writing wastes tokens.

---

## Parallelism Rules

**Core principle:** Never do sequentially what can be done in parallel. Sequential execution of parallelizable operations is a framework breach. Each scenario's full detail lives in its owning surface (named below) — this is the index.

**Mandatory-parallel scenarios:**

1. **Bug investigation** — dispatch parallel reads (technical-overview + changelog + git blame/log), merge before forming a hypothesis.
2. **Design + research** — dispatch independent research questions concurrently; the `flowcode:research` skill owns scoping + parallel dispatch.
3. **Post-execution artifacts** — changelog reconciliation ∥ test-notes as 2 sonnet agents (`plan-execution.md § Post-Execution Pipeline § Step 4`).
4. **Bootstrap module exploration** — one `flowcode:module-explorer-agent` per module, batches of ~6 (`flowcode:bootstrap-agent`); same for `/flowcode:module-doc` over many targets.
5. **Stack documentation gather** — one `flowcode:docs-researcher-agent` per technology, batches of ~6 (`flowcode:docs` skill).

**Advisory — judgment call, never a breach to skip:** plan-execution parallelism (concurrent file-disjoint waves, within-phase implementer fan-out, read-only review ∥ gates overlap) is decided per `plan-instructions.md § Phase Dependencies & Waves`. Running a plan one phase at a time, all in the main session, is always valid.

### When NOT to Parallelize

- Single file reads
- Sequential dependencies (one output feeds the next input)
- User interactions (always sequential — never parallel with other work)
- The implement → review → fix cycle **for a given file** (sequential by definition) — but disjoint new files within a phase MAY be created concurrently by `flowcode:implementer-agent` workers (advisory)
- Browser capture/smoke — a `flowcode:browser` run walks all routes × viewports inside **one** `flowcode:browser-runner-agent` dispatch (the engine loops internally); never fan out one agent per viewport, so the image-heavy capture work stays in the worker and off the main context

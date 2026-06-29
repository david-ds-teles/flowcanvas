---
name: extend
description: Extends or customizes the framework from a natural-language statement, routing it to the right .flowcode/ file or queuing an upstream contribution after preview and approval.
status: active
tags: [command, extend, customization, upstream-contribution, routing]
links: [.flowcode/flowcode-index.md, .flowcode/workflow/flowcode-rules.md, .flowcode/workflow/flowcode-tools.md, .flowcode/workflow/flowcode-persona.md, .flowcode/upstream-contributions.md, .flowcode/templates/upstream-contribution-template.md]
---

# /flowcode:extend

- Extends the framework from a natural-language statement; classifies intent as a host customization or an upstream contribution before writing anything.
- Host customization → routes to the correct `.flowcode/` file via the routing table; framework-owned behavior files (rules/tools/persona/workflow/…) take the change through their host-owned `.local.md` sibling so it survives upgrades, while host-owned files (project, quality-checks, researches) are edited directly.
- Upstream contribution → investigates the named framework artifact end-to-end and composes a `UC-NNN` entry in `upstream-contributions.md` with `file:line` evidence.
- Reads every target file before composing a preview that shows exact final-format lines plus any required index updates.
- Always waits for explicit approval (approve / revise / cancel) before applying edits; updates parent indexes and `flowcode-index.md` in the same turn.
- Never edits the harness agent-tools dir, root `CLAUDE.md`, or anything outside `.flowcode/`; agent-behavior changes route through the `.local.md` overrides of the workflow files agents read at runtime.

## Usage

```text
/flowcode:extend <natural language statement>
/flowcode:extend                              # no argument — prompt inline
```

Examples:

- `/flowcode:extend I use ./scripts/git.sh as the only git entrypoint; git must never be invoked another way` — bundled: tools row + rule (host customization)
- `/flowcode:extend always respond in Brazilian Portuguese for code review comments` — persona (host customization)
- `/flowcode:extend we only ship with 100% test coverage` — quality gate (host customization)
- `/flowcode:extend our PRs must be ≤300 LOC` — ambiguous rule vs quality gate; triggers disambiguation (host customization)
- `/flowcode:extend the artifact-naming-check hook is rejecting filenames that include a capital letter in the slug` — upstream contribution (framework-level bug)
- `/flowcode:extend there is no template for incident postmortems` — upstream contribution (template gap)

---

## What This Does

1. Reads the statement (prompts inline if missing).
2. Classifies the **intent class**: host customization or upstream contribution.
3. For host customization — classifies the target file against `.flowcode/flowcode-index.md` and reads it. For upstream contribution — identifies the target framework artifact, reads it end-to-end (the *investigate* step), and composes a `UC-NNN` entry with `file:line` evidence.
4. Shows the preview (exact lines, not paraphrase) plus any required index updates.
5. On approval, applies the edits and updates every parent `index.md` and `flowcode-index.md` in the same turn.

---

## Prompt

You are extending the flowcode framework from a user-stated preference, rule, tool, convention, or fact.

### Step 1 — Capture

Treat `$ARGUMENTS` as the statement. If empty, ask the user for it inline in one short sentence and wait.

### Step 2 — Classify

First decide the **intent class**: is this a **host customization** (a fact, rule, tool, or preference that applies to THIS project's install and should land in a `.flowcode/` framework file) or an **upstream contribution** (a framework-level bug, gap, or workflow improvement that the flowcode source repo needs)?

Signals of **upstream contribution**:

- Names a framework file, hook, agent, command, or template as the subject of a complaint (e.g. "the artifact-naming-check hook", "the designer-agent should", "there is no template for")
- Describes unexpected or incorrect framework behavior
- Asks for a missing template, rule, category, or workflow step
- Uses phrasings like "flowcode should", "the framework should", "this hook shouldn't", "there is no template for"

Signals of **host customization**: every row in the routing table below.

If truly ambiguous between the two classes, `AskUserQuestion` with both as options. A single statement may also be bundled across classes (e.g. a host-rule plus an upstream complaint) — split it and handle each in its own branch within one preview.

- **If upstream contribution → skip the routing table; go to Step 2b (Upstream branch) below.**
- **If host customization → continue with the routing table.**

Use `.flowcode/flowcode-index.md` as the source of truth for host-customization targets. **Routing principle:** a framework-owned file is never edited in place — route the customization to its host-owned `.local.md` sibling (loaded as an overlay after the base, survives upgrades; see `flowcode-index.md § Local Overrides`). Host-owned files (`project/`, `quality-checks/`, `researches/`, `ui/ui-design-system.md`) are edited directly. Apply this mapping first:

| Signal in the statement | Target file | Format |
|-------------------------|-------------|--------|
| Tool / command / script the project must use | `.flowcode/workflow/flowcode-tools.local.md` | Append a row to the `\| Scope \| Reference \| Load \|` table (scaffold the file with that header if absent). Host-owned, so it survives upgrades — never edit the base `flowcode-tools.md` |
| Hard behavioral rule, constraint, "never / always / must" | `.flowcode/workflow/flowcode-rules.local.md` | Append a bullet with **Title.** bold lead + prose, using *must / never / always* for hard constraints. To replace a base rule, name it (*"Replaces Rule N: …"*); otherwise it is additive. Scaffold the file if absent |
| Communication style, tone, language, voice preference | `.flowcode/workflow/flowcode-persona.local.md` | Append/modify a bullet; scaffold if absent |
| Project fact scoped to the whole project — stack, environment, cross-module policy | `.flowcode/project/project-overview.md` | Update the matching section (host-owned — edit in place); respect `project-overview-template.md` if rewriting a section |
| Fact scoped to one module — API, DDL, ownership, known gap | `.flowcode/project/modules/{name}.md` | Update the matching section; respect `module-template.md`. If the module file doesn't exist yet, create it from the template and add a row to `project-overview.md § Modules` |
| Backlog idea — "capture for later", future work | `.flowcode/project/backlog.md` | Append a `BL-NNN` row using `backlog-entry-template.md` |
| Git discipline — branches, commits, push/merge policy | `.flowcode/workflow/git-workflow.local.md` | Append/edit the matching section; scaffold if absent |
| Quality gate, test requirement, coverage threshold, lint rule, code-quality convention | `.flowcode/quality-checks/*` | Read the matching sub-file first (host-owned — edit in place); add in its existing section format. Create a new sub-file only if no existing one fits, and register it in `quality-checks-index.md` |
| Workflow / tier-loading change | `.flowcode/workflow/flowcode-workflow.local.md` | Append/edit the matching section; scaffold if absent |
| Phase lifecycle change — halt conditions, phase-close minimum, phase statuses | `.flowcode/plans/plan-instructions.local.md` | Append/edit the matching section; scaffold if absent |
| UI mockup convention — tokens, breakpoints, filenames, test IDs | `.flowcode/ui/ui-mockup-discipline.local.md` | Append/edit the matching section; scaffold if absent |
| UI workflow change — iteration count, selection flow, phase-close parity | `.flowcode/ui/ui-workflow.local.md` | Append/edit the matching section; scaffold if absent |
| Reusable research finding | `.flowcode/researches/{slug}-research.md` via `research-template.md` | Create or append; update `researches-index.md` |
| Agent-behavior change — how a sub-agent works | `.flowcode/workflow/flowcode-rules.local.md` / `flowcode-tools.local.md` / `flowcode-persona.local.md` (not the harness agent-tools dir) | The `flowcode:*` sub-agents read the base workflow files at runtime and the `.local` sibling layers on top, so the rule lands in `.local` and trickles down. Editing a sub-agent file directly is a non-goal because it drifts per-install |
| Anything else | Pick the closest target from `flowcode-index.md`; if it is framework-owned, write its `.local.md` sibling | Match that file's existing format |

**Bundled statements can hit multiple targets.** A statement like *"use script X for git; git must never be invoked another way"* writes a tool row in `flowcode-tools.local.md` AND a rule in `flowcode-rules.local.md`. Produce the full set in a single preview.

### Step 2b — Upstream branch (framework-level contribution)

For statements classified as upstream contributions. No routing table — the target is always `.flowcode/upstream-contributions.md`. The payload is a `UC-NNN` row composed from investigated evidence, not a raw user quote.

- **Target file:** `.flowcode/upstream-contributions.md`
- **Template:** `.flowcode/templates/upstream-contribution-template.md`

Sub-steps:

**i. Identify target framework artifact(s).** Consult `.flowcode/flowcode-index.md` to resolve the user's statement to concrete framework files. Examples:

- naming complaint → the `artifact-naming-check` hook
- missing template → `.flowcode/templates/*`
- phase lifecycle surprise → `.flowcode/plans/plan-instructions.md`
- persona rough edge → `.flowcode/workflow/flowcode-persona.md`
- command bug → a `/flowcode:*` command
- sub-agent gap → a `flowcode:*` sub-agent
- rule contradiction → `.flowcode/workflow/flowcode-rules.md`
- quality gate / convention gap → `.flowcode/quality-checks/*`

If the statement cannot be resolved to a specific file, target = `"general"`.

**ii. Investigate.** Read every identified target file end-to-end. This is not optional — it is the step that converts a user quote into maintainer-actionable evidence. Note the specific rules, regexes, functions, or headings involved with `file:line` references. An entry composed without this step is rejected: re-do it.

**iii. Categorize.** Pick one: `Bug` · `Workflow` · `Template-Gap` · `Rule-Gap` · `Docs` · `Other`. If two categories plausibly fit, `AskUserQuestion` with both as options.

**iv. Compose row** using `upstream-contribution-template.md`. Assign the next `UC-NNN` by reading `.flowcode/upstream-contributions.md` and incrementing the max existing ID (zero-pad to 3 digits). Fill fields:

- **Summary:** one sentence stating the problem, not a solution.
- **Context:** cite `file:line` refs from step ii; include what the user was doing, what the framework actually did, and — where obvious — what was expected. Mandatory for every category except `Docs` / `Other`.
- **Overflow rule:** if Context needs more than ~3 sentences, append a `## UC-NNN — {Summary}` subsection under the `## Extended Details` heading at the bottom of `upstream-contributions.md` and reference it inline (`see detail UC-NNN below`).

**v. Proceed to Step 5 (Preview)** with the composed row (and any Extended Details subsection).

### Step 3 — Disambiguate when needed

When 2+ targets plausibly fit (confidence split or overlapping categories), use `AskUserQuestion` with the candidate files as options. Never silently pick. Common cases:

- rule vs quality gate (e.g. "PRs must be ≤300 LOC")
- project-wide fact vs module-scoped fact (e.g. "we use Postgres" — everywhere, or just one module?)
- persona vs rule for communication constraints (preference vs hard constraint)

### Step 4 — Read before writing

Before composing the preview, read every target file you intend to edit. The edit must match that file's existing section structure, heading depth, table columns, bullet shape, and numbering. For `.flowcode/quality-checks/*` and `.flowcode/ui/*`, the section structure varies per sub-file — always read first.

For upstream contributions, Step 2b.ii already covers the framework-side reads. Additionally read `.flowcode/upstream-contributions.md` to (a) assign the next `UC-NNN`, (b) check for duplicate observations — if a matching entry already exists, surface it and ask whether to extend the existing Context or skip.

### Step 5 — Preview

Produce a single preview listing, for each target:

- File path
- Section where the change lands
- The final-format content being added or modified (not a paraphrase — the exact lines)
- Any `index.md` updates required (parent folder `index.md` and/or `.flowcode/flowcode-index.md` if a new file is introduced or an existing file's load type changes)

If a new file is being created, seed it from the matching template under `.flowcode/templates/` when one exists (per Rule 2, Template First — check `templates-index.md`). Choose the load type per `.flowcode/flowcode-index.md § Load Types` and justify the choice in one line.

When scaffolding a `.local.md` override sibling (no template exists for these), create it with valid frontmatter — `name: <base-name>-local`, a one-line `description`, `status: active`, `tags`, `links: [<base file>]` — plus a one-bullet summary and the single target section, so `frontmatter-summary-check.js` passes; then apply the change. A `.local.md` needs no `flowcode-index.md` row — the base file's `§ Local Overrides` already covers it.

### Step 6 — Confirm

Ask the user explicitly: approve, revise, or cancel. Do not proceed without approval.

### Step 7 — Apply

On approval:

1. Use `Edit` to apply each change and `Write` for any new file.
2. Update parent `index.md` files per Rule 1 (Index Based).
3. Update `.flowcode/flowcode-index.md` when a new file is introduced or an existing file's load type changes.
4. For upstream contributions, append the composed row to `.flowcode/upstream-contributions.md`. If the file is absent (legacy install that predates this feature), create it from `upstream-contribution-template.md` before appending.
5. Report the final list of files touched.

On cancel, leave disk untouched and confirm to the user: *"Cancelled — no files changed."*

### Non-goals

- Do not edit the harness agent-tools dir, root `CLAUDE.md`, or anything outside `.flowcode/`. Agent-behavior statements route through the `.local.md` overrides of `flowcode-rules.md` / `flowcode-tools.md` / `flowcode-persona.md` — the agents read those base files at runtime and the `.local` sibling layers on top, so the rule lands there and survives upgrades.
- Do not invent new template files unless the Step 2 mapping specifically calls for one and Rule 2 (Template First) applies.
- Do not classify without reading the target file first.

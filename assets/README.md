# Flowcode

Flowcode is a lightweight, portable, pure-markdown AI development framework that orchestrates AI code agents through a structured development lifecycle. It has no runtime and no build step — just markdown files that define rules, workflows, templates, and agent behavior, plus a handful of small Node install scripts that run on Windows, macOS, and Linux.

> **🤖 AI agents:** If you're reading this inside a flowcode bundle, install it with no manual steps — copy this `flowcode/` directory to the target project root, then from that root run `node flowcode/flowcode-install.js`, and start a new conversation with `/flowcode:bootstrap`. Full detail in [Installation](#installation).

---

## Philosophy

- **Markdown-only.** Every rule, guide, template, and artifact is a markdown file. Any agent that can read markdown can follow this framework.
- **Portable.** Packaged once, installed anywhere. Works with any codebase — greenfield or existing.
- **Zero codebase impact.** The framework lives entirely in `.flowcode/` and `.claude/`. Nothing in your source code changes.
- **Lifecycle-enforced.** Design, plan, implement, quality, review, commit, PR, merge, publish — each stage has defined artifacts, quality gates, and completion criteria. Nothing ships without passing its gates.
- **Artifact-driven.** Every significant decision, design, and change is captured as a versioned artifact. The codebase and its history are always explainable.
- **Agent-native.** Rules, tiered file loading, model routing, and parallelism guidelines are written for AI agents to follow directly. Humans configure it; agents execute it.

---

## Development Lifecycle

```
design → plan → implement → quality → review → commit → PR → merge → publish
```

| Stage | What Happens | Key Artifact |
|-------|-------------|-------------|
| **Design** | Brainstorm, research, define scope, architecture decisions | `{PREFIX}-design.md` |
| **Plan** | Break design into executable phases with concrete steps | `{PREFIX}-plan.md` |
| **Implement** | Execute plan phase by phase, code review after each phase | Source code changes |
| **Quality** | Automated tests, lint, type check, E2E — all must pass | `{PREFIX}-qa-report.md` |
| **Review** | (Optional) Human review of deliverables before PR | Adjustments in-place |
| **Commit** | Clean commit with no AI attribution trailers | Git commit |
| **PR** | Pull request opened with technical overview as description | `{PREFIX}-technical-overview.md` |
| **Merge** | PR merged, logs updated | `{PREFIX}-changelog.md`, `{PREFIX}-test-notes.md` |
| **Publish** | Release, deploy, or distribution step | Project-specific |

---

## How It Works

### Startup (every conversation)

1. Agent reads `.flowcode/workflow/flowcode-workflow.md` to get the tier rules
2. Agent loads all **Tier 1** files (mandatory, always)
3. Agent scans for **Tier 2** signals and loads context-relevant files
4. Agent proceeds — **Tier 3** files load on-demand as specific workflow steps begin

### Artifact Flow

```
User request
  → Design (brainstorm + research → design.md)
    → Plan (design.md → plan.md with phases)
      → Implement (phase 1 → review → fix → phase 2 → review → fix → ...)
        → Quality (all tests pass, qa-report.md generated)
          → Artifacts (technical-overview.md + changelog.md + test-notes.md)
            → Commit + PR
```

### Naming Convention

Artifact naming (PREFIX format, allowed plan types, directory structure, phase heading format, enforcement) is defined canonically in [`.flowcode/plans/plan-instructions.md § Artifact Naming`](./flowcode/plans/plan-instructions.md). The hook `.claude/hooks/artifact-naming-check.js` enforces it automatically.

---

## Installation

**Prerequisites:** `node` (≥14) — the only hard requirement. The installer, uninstaller, migrator, and hooks are all dependency-free Node, so flowcode needs no `bash`, `rsync`, `python3`, or coreutils and runs natively on **Windows, macOS, and Linux**. Add `git` only if you obtain flowcode by cloning.

### Step 1 — Put flowcode in your project

You need a `flowcode/` directory at your project root. Two ways to get one:

```bash
# A) From a release bundle (recommended) — a clean, kernel-only copy:
cp -r /path/to/flowcode-bundle ./flowcode

# B) From source — clone or submodule the repo:
git clone https://github.com/your-org/flowcode flowcode
```

> A "bundle" is a stripped, kernel-only copy of flowcode (no development prompts, plans, or test fixtures). See [How Packaging & Installation Work](#how-packaging--installation-work) to build one.

### Step 2 — Run the installer

From your **project root** (not from inside `flowcode/`):

```bash
node flowcode/flowcode-install.js
```

This one command works on every OS. POSIX users can also run the `bash ./flowcode/flowcode.sh` shim; on Windows, `flowcode\flowcode.cmd` does the same — both just call the Node engine. It does everything — no manual editing required:

- Copies the framework kernel → `.flowcode/`
- Installs the agent tools (agents, commands, hooks, skills) → `.claude/`
- Injects the `<flowcode-instructions>` block into your `CLAUDE.md` (creates the file if it doesn't exist)
- Registers flowcode's hooks in `.claude/settings.json` (**merged** — your existing hooks and settings are untouched)
- Writes `.flowcode/install-manifest.json` (version + a checksum for every installed file, used by upgrade and uninstall)

Preview without changing anything using `node flowcode/flowcode-install.js --dry-run`.

### Step 3 — Bootstrap your project

Start a new conversation and run:

```
/flowcode:bootstrap
```

The bootstrap agent explores your codebase and generates `.flowcode/project/project-overview.md`. For new projects, it asks about your intended stack and guides your initial structure decisions.

---

## How Packaging & Installation Work

Flowcode ships as plain files moved into place by small, single-purpose **Node** scripts (no bash/python needed). You only ever run the installer and (later) the uninstaller. The other scripts exist for maintainers and contributors. Each tool is a `.js` engine plus thin `.sh`/`.cmd` launchers, so the same command works on every OS.

| Tool | Who runs it | When | What it does |
|--------|-------------|------|--------------|
| **`flowcode/flowcode-install.js`** <br>(launchers: `flowcode.sh` · `flowcode.cmd`) | You (host project) | Install / reinstall | Lays the framework into `.flowcode/` + `.claude/`, wires up `CLAUDE.md` and hooks, writes the install manifest. Flags: `--dry-run`, `--force`. |
| **`flowcode/flowcode-uninstall.js`** <br>(launchers: `.sh` · `.cmd`) | You (host project) | Uninstall | Removes exactly what was installed (reads the manifest). Keeps your own content unless you pass `--purge-artifacts`. Flags: `--dry-run`. |
| **`bundle.js`** (repo root; `bundle.sh` shim) | Framework maintainer | Cutting a release | Builds a clean, kernel-only `dist/flowcode/` to distribute. |
| **`flowcode/link_project.js`** <br>(launchers: `.sh` · `.cmd`) | Framework developer | Working *on* flowcode | Symlinks the source into a test project so framework edits apply live (directories via junctions on Windows). |
| **`flowcode/install-lib.js`** + **`install-fs.js`** | *(required as modules, never run directly)* | — | Shared host-owned/framework-owned ownership definitions and cross-platform filesystem helpers, used by all of the above so they always agree. |

### Building a distribution bundle

To hand flowcode to a host as a clean, **kernel-only** payload — no development prompts, dev plans, or eval workspaces — build a bundle from this repo's root:

```bash
node ./bundle.js
```

This produces `dist/flowcode/`, containing only the framework kernel. It is assembled from a top-level **allowlist** (a new top-level entry under `flowcode/` does not ship until it's added to the list), with nested dev/runtime paths pruned (`skills/**/workspace/`, plan/research instances, `logs/`, `ui/mockups/`), and a **fail-closed self-check** that aborts the build if a known dev path slips through. `dist/` is gitignored — it's build output, not source.

A host then installs from it exactly like a clone:

```bash
cp -r dist/flowcode ~/myapp/flowcode
cd ~/myapp && node flowcode/flowcode-install.js
```

`bundle.js` (and its `bundle.sh` shim) lives at the repo root (not inside `flowcode/`) so it is structurally outside the bundle and never ships.

---

## Testing Changes in a Host Project

To evaluate flowcode in real conditions, link it into a host project (any project directory outside this repo). Instead of reinstalling on every edit, `link_project.js` symlinks the source tree directly into the host so changes take effect immediately — no reinstall, no copy step.

### Link (dev install)

From the repo root, pass the host project path as a positional arg:

```bash
node flowcode/link_project.js ../my-host-project
```

Framework files in `.flowcode/` and `.claude/` become symlinks pointing at the live source. Edits to `flowcode/` are visible to Claude Code in the host project instantly.

> Running without `--project` from the repo root is an error — the script detects that cwd is the flowcode source parent and refuses, preventing accidental linking into the dev repo.

**Re-linking after a machine migration or username change** — if the symlinks point to a stale path (e.g. `/Users/old-name/...`), add `--migrate`:

```bash
node flowcode/link_project.js ../my-host-project --migrate
```

`--migrate` removes stale symlinks and real files that were previously installed as framework-owned, then re-links them to the current source path.

### Unlink

```bash
node flowcode/link_project.js --unlink ../my-host-project
```

Removes all framework symlinks — current `FRAMEWORK_LINKS` entries, per-file hook symlinks, and any orphan framework symlinks left by older installs (detected by target path pointing into the flowcode source tree). Host-owned seeds (real copies of `project/`, `researches/`, `quality-checks/`, etc.) are preserved. Empty dirs left behind — including the `.flowcode/` and `.claude/` parents once they hold no framework or host content — are pruned automatically.

For a full clean reset (drop host-owned content too — `project/`, `researches/`, `reviews/`, `quality-checks/`, `plans/plan-index.md`, `logs/`, mockups, the harvested UI design system, …), add `--purge-artifacts` — same flag and semantics as `flowcode-uninstall.js`:

```bash
node flowcode/link_project.js --unlink --purge-artifacts ../my-host-project
```

Preview what would be removed without changing anything (works with or without `--purge-artifacts`):

```bash
node /path/to/flowcode/link_project.js --dry-run --unlink
```

After teardown, re-run `link_project.js` (or the full installer) to start fresh.

---

## Where Files Live (after installation)

Everything flowcode installs goes into two top-level directories. **`.flowcode/`** holds the framework and your project knowledge base; **`.claude/`** holds the Claude Code agent tooling.

```
.flowcode/
  flowcode-index.md         — the agent's startup file map
  flowcode.yml              — framework metadata (version, requirements)
  install-manifest.json     — what was installed (version + per-file checksum)
  workflow/                 — tier loading, rules, persona, tools, git workflow
  project/                  — your living project knowledge base (overview, log, backlog, modules)
  plans/
    plan-instructions.md    — phase lifecycle rules (framework-owned)
    plan-index.md           — index of your plans (yours)
    {PREFIX}/               — one directory per plan, with its design/plan/log/qa artifacts (yours)
  researches/               — research cache (index + your findings)
  quality-checks/           — code-quality + rendering rules you tailor per stack
  templates/                — artifact templates the agents fill in
  ui/                       — UI subsystem (framework rules + your harvested design system)
```

```
.claude/
  agents/flowcode/          — sub-agents (bootstrap, planner, designer, researcher, …)
  commands/flowcode/        — slash commands (/flowcode:bootstrap, :plan, :design, …)
  hooks/                    — enforcement hooks (naming, frontmatter, QA gate, …)
  skills/flowcode/          — reusable skills (plan, design, research, execute, …)
  settings.json             — your settings; flowcode merges its hook registrations in
```

---

## Framework-Owned vs Host-Owned

This is the rule that makes reinstalls and upgrades safe: flowcode tracks which files belong to the **framework** and which belong to **you**, and never overwrites yours. The split is defined once, in `flowcode/install-lib.js`, and shared by the install, uninstall, and link scripts so they can't disagree.

| | What it includes | On install | On reinstall (`--force`) | On uninstall |
|---|---|---|---|---|
| **Framework-owned** | `workflow/`, `templates/`, `plans/plan-instructions.md`, the UI rules, `flowcode-index.md`, and all agent tooling in `.claude/` | installed | **refreshed** | removed |
| **Host-owned** | your `plans/` (registry + plan folders), `project/`, `researches/`, `quality-checks/`, `upstream-contributions.md`, the harvested UI design system & references, `logs/`, generated mockups | **seeded** if missing | **preserved** | **preserved** (unless `--purge-artifacts`) |

In short: framework files always come from the install; everything *you* author or customize is protected.

---

## Customizing Without Forking (and tracking upstream)

Customize framework behavior by **adding `.local.md` override siblings**, never by editing a framework file. Any framework file `X.md` may have a host-owned `X.local.md` beside it; the agent loads it as an overlay right after the base — additive, and on a direct conflict the `.local` entry wins (to replace a base item, name it, e.g. *"Replaces Rule 8: …"*). `/flowcode:extend` writes there for you.

```
.flowcode/workflow/flowcode-rules.md          ← framework-owned: refreshed on every upgrade
.flowcode/workflow/flowcode-rules.local.md    ← yours: never overwritten, preserved on uninstall
```

Because customizations live in files the framework never authors, upgrades never collide with them.

**For a company fork:** fork this repo privately and keep every customization in `*.local.md` siblings (plus any net-new files under disjoint paths) — never edit an upstream file. Pulling a release is then conflict-free by construction:

```bash
git remote add upstream https://github.com/your-org/flowcode
git fetch upstream --tags
git merge v0.5.0          # touches no shared file → no conflicts
```

As a belt-and-suspenders, a fork can claim its overlay paths in `.gitattributes` so even a stray upstream edit to the same path keeps the fork's version on merge:

```gitattributes
**/*.local.md merge=ours
```

(requires `git config merge.ours.driver true` in each checkout — git has no built-in `ours` driver).

---

## Reinstalling, Upgrading & Uninstalling

### Reinstall (repair / refresh framework files)

Re-running the installer over an existing install is **refused by default** — that protects you from silently leaving changed framework files stale. To force a refresh of framework-owned files while preserving everything host-owned:

```bash
node flowcode/flowcode-install.js --force
```

### Upgrade to a newer flowcode version

Don't use `--force` for version upgrades. Run the migrator, which compares the manifest checksums per file and transforms your install up to the current spec:

```
/flowcode:migrate
```

### Uninstall

```bash
node flowcode/flowcode-uninstall.js            # removes framework files, keeps your content
node flowcode/flowcode-uninstall.js --dry-run  # preview first
```

It reads `.flowcode/install-manifest.json` and removes only what was installed, including the `<flowcode-instructions>` block from `CLAUDE.md`. Your host-owned content (plans, project docs, researches, quality-checks, logs) is **preserved**; add `--purge-artifacts` to remove that too. Zero impact on your source code.

> The uninstaller is run from the source tree (`./flowcode/`), not from `.flowcode/` — the installer deliberately doesn't copy the install scripts into your installed framework.

---

## Authoring Agents for Flowcode

Agents are markdown files in `.claude/agents/flowcode/` (or `flowcode/agent-tools/agents/flowcode/` in the source repo). Claude Code loads them as sub-agents that run independently from the main orchestration agent. Use `bootstrap-agent.md` as the reference model.

### Anatomy of an Agent File

Every agent file starts with YAML frontmatter, followed by the system prompt body:

```
name: agent-name
description: One or two sentences. What this agent does and when to invoke it. Claude uses this field to route dispatch decisions — write it like a routing signal, not a title.
tools: Read, Write, Edit, Bash, WebFetch, WebSearch
model: sonnet
---

You are the {name} agent. {One sentence: role and sole purpose.}

## Your Task

{Numbered steps, in execution order.}

## Rules

{Hard constraints. Scope boundaries.}
```

**Frontmatter fields:**

| Field | Purpose |
|-------|---------|
| `name` | Identifier used when dispatching the agent |
| `description` | How Claude decides *when* to invoke this agent — the primary routing signal |
| `tools` | Restricts which tools the agent can call — scope to least privilege |
| `model` | Which model runs this agent — overrides the caller's model |

The `---` line closes the frontmatter. Everything after it is the system prompt.

The model field in the frontmatter replaces the need for a model rule in the body — don't duplicate it. If the agent dispatches haiku sub-agents for file reads, note that in the body Rules section.

### Step Design Patterns

**Parallel reads up front.** The first step should batch all file reads into parallel groups. Group by dependency: batch 1 has no dependencies; batch 2 depends on batch 1 results; and so on. Never read files one by one.

```markdown
### Step 1 — Load Context

Dispatch in parallel using haiku subagents:
- Read `path/to/file-a.md`
- Read `path/to/file-b.md`
- Run `find . -maxdepth 2 -type d`
```

**Number every step.** Steps must be numbered and named. The agent references them in its report. Unnumbered steps get skipped or reordered.

**Specify the template before generating any artifact.** The "Template First" rule applies inside agents. Read the relevant template immediately before writing the artifact — not at the start of the file.

```markdown
### Step 3 — Generate artifact.md

Read `.flowcode/templates/{type}-template.md`

Write `.flowcode/{path}/artifact.md` using the template as the structural skeleton.
```

**Handle the "already exists" case.** If the agent writes a file, specify what happens when the file already exists: overwrite, merge, or ask the user. Silence here causes data loss on re-runs.

**Define when to stop and wait.** If a step encounters an empty or degenerate state (no source files, missing config, ambiguous input), the agent must stop, report clearly, and wait for user input rather than guessing or generating empty artifacts.

```markdown
**If the project is empty:**
- Report what was found (or not found)
- Ask the user: "{specific question}"
- Stop here and wait for user input before proceeding
```

### Output Format

Every agent must end with a structured report step. Use a consistent format so the main orchestration agent can parse it reliably:

```markdown
### Step N — Report

Output a structured summary using exactly this format:

## {Agent Name} Complete

**Detected / Done**
- {item}: {value}

**Files created / updated**
- {file path} — {what changed}

**Needs manual input**
- {item} — {reason}

**Recommended next steps**
- {action}
```

Unstructured prose reports are harder for the orchestrator to act on and harder for users to scan.

### Rules Section

Every agent's Rules section must include:

| Rule | What to specify |
|------|----------------|
| **Scope** | What the agent may and may not touch (e.g., "Never modify source code. Only write to `.flowcode/`.") |
| **Accuracy policy** | How to handle fields that can't be reliably detected (write "Not detected" — never guess). |
| **Template policy** | Restate "Template First" if the agent generates artifacts. |
| **Conflict policy** | What to do on re-runs when target files already exist. |
| **Sub-agent model** | If the agent dispatches haiku sub-agents for file reads, state it here. The agent's own model is set in frontmatter — don't duplicate it. |

### Model Assignment

The agent's model is set in frontmatter — not in the body. Follow the model routing table in `flowcode-workflow.md`:

- Agent body (synthesis, writing, code review) → `model: sonnet`
- Novel reasoning, architecture decisions → `model: opus` (main orchestrator only)
- Pure file reads dispatched as sub-agents → haiku (state this in the body Rules section)

If the agent dispatches haiku sub-agents for reads, note it in Rules:
> **Sub-agent reads:** Dispatch haiku subagents for pure file reads in Step 1. Do not use opus.

### Common Mistakes

- **Contradicting the Rules section in step body text.** If the Rules say "sonnet" but a step says "use haiku", agents will pick one arbitrarily. Keep model specs only in Rules and reference them from steps.
- **Not specifying the file-exists case.** An agent that silently overwrites a manually edited file destroys work.
- **Unstructured report.** A prose paragraph at the end is hard for the orchestrator to act on.
- **Missing index update.** Any file created inside `.flowcode/` must trigger an update to its parent index file. State this explicitly in the step that creates the file.
- **Skipping Template First for subfiles.** If an agent creates multiple artifact files (e.g., one per service), every file must read its template — not just the first one.

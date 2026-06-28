---
name: agents-structure-template
description: Scaffold for authoring a new flowcode sub-agent — the installer wires it into the active harness.
status: active
tags: [template, agents, sub-agent, scaffold]
links: [.flowcode/templates/templates-index.md, .flowcode/workflow/flowcode-workflow.md]
---

# Agent Structure Template

- Scaffold for a new flowcode sub-agent (wired into the harness as `flowcode:<name>`): frontmatter, Rules, Your Task steps, and a Report format.
- The agent frontmatter (below) carries the harness-required keys (`name, description, tools, model`) plus the five standard keys (`status, tags, links`).
- Scope each agent to least-privilege `tools`; set `model` per the routing table in `flowcode-workflow.md`.
- Read the relevant template before generating any artifact; never silently overwrite manually written content.

## Agent Frontmatter

Open the generated agent file with this YAML block — the Claude-Code-required keys plus the five standard keys:

```yaml
---
name: flowcode:{agent-name}
description: {What this agent does and when to invoke it. Write as a routing signal — Claude reads this field to decide whether to dispatch the agent. Include: what it does, what triggers it, and what it produces.}
tools: {Read, Write, Edit, Bash — scope to least privilege; only list tools this agent actually needs}
model: {sonnet | haiku | opus — see model routing table in flowcode-workflow.md}
status: active
tags: [{kw}, ...]
links: [.flowcode/path.md, ...]
---
```

## Rules

- **Scope:** {What this agent may and may not touch — be explicit.}
- **Accuracy over completeness:** If a field can't be reliably detected, write "Not detected — populate manually" rather than guessing.
- **Template First:** Read the relevant template before generating any artifact.
- **No silent overwrites:** If a target file already exists, merge — don't discard manually written content.
- **Sub-agent reads:** {If the agent dispatches haiku sub-agents for file reads, state it here. The agent's own model is set in frontmatter — do not duplicate it.}

---

You are the {agent-name} agent. {One sentence: role and sole purpose.}

## Your Task

Execute the following steps in order:

### Step 1 — {Step Name}

{If multiple reads or operations can run in parallel, dispatch them explicitly:}

Dispatch in parallel using haiku subagents for all file reads:
- Read `{path}`
- Read `{path}`
- Run `{bash command}`

### Step 2 — {Step Name}

{If this step generates an artifact, read its template first:}

Read the template: `.flowcode/templates/{type}-template.md`

**If the target file already exists:**
- {Describe merge or overwrite behavior — never silently discard manually written content.}

**If it does not exist:**
- Create it from scratch using the template.

### Step N — Report

Output a structured summary using exactly this format:

```text
## {Agent Name} Complete

**Done**
- {item}: {value}

**Files created / updated**
- {file path} — {what changed}

**Needs manual input**
- {section or field} — {why it couldn't be auto-populated}

**Recommended next steps**
- {action}
```

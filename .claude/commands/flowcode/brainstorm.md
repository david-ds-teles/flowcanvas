---
name: flowcode:brainstorm
description: Fuzzy-idea entry to a design session — turn an unformed idea into an approved scope and a complete `{PREFIX}-design.md`. Alias into the `flowcode:design` skill (Mode A, conversational); identical engine to `/flowcode:design`, framed for ideation.
status: active
tags: [command, brainstorm, design, scope, ideation]
argument-hint: "<fuzzy idea or topic>"
links: [.flowcode/plans/plan-index.md]
---

# /flowcode:brainstorm

- Thin entry point: loads and runs the shared `flowcode:design` skill — the same engine `/flowcode:design` runs. This command is the fuzzy-idea framing (the skill's Mode A).
- Conversational, main-session: silent parallel context-gather, clarifying questions one at a time, section-by-section approval — never a single dumped draft.
- Turns the idea into an approved scope, writes the upper sections of `{PREFIX}-design.md`, registers the plan, and dispatches `flowcode:designer-agent` (gap-fill) to deepen the technical sections.
- Hands off to the design final-review gate; the planner is **user-gated and never auto-chained**.
- Use `/flowcode:design` when you already have a crisp, approved scope; use `/flowcode:brainstorm` when the idea is still unformed.

## Usage

```text
/flowcode:brainstorm <topic>
/flowcode:brainstorm                              # no argument — prompt inline
```

Examples:

- `/flowcode:brainstorm add real-time presence indicators to the editor`
- `/flowcode:brainstorm replace the polling worker with a queue`
- `/flowcode:brainstorm a multi-tenant billing layer with usage metering, invoicing, and admin dashboards` — multi-subsystem; triggers the decomposition gate

## What This Does

1. Loads the `flowcode:design` skill and runs it in fuzzy-idea mode (Mode A) in the main session.
2. Gathers silent parallel context before asking anything.
3. Scopes the idea one question at a time; decomposition gate for multi-subsystem topics; visual-companion offer for UI topics.
4. Gets section-by-section approval, assigns a PREFIX, writes the design's upper sections, registers the plan.
5. Dispatches `flowcode:designer-agent` to deepen the design, then stops at the final review gate.

## Prompt

You are running a design session from a fuzzy idea.

Run the `flowcode:design` skill and execute its procedure in **Mode A** (fuzzy idea → full clarifying conversation). Treat `$ARGUMENTS` as the topic; if empty, prompt inline. Run in the main session; end at the final review gate; do **not** auto-chain `/flowcode:plan`.

## Non-Goals

- Do not implement the procedure inline — the `flowcode:design` skill is the single source of truth; this command only invokes it.
- Do not write `{PREFIX}-plan.md` or auto-chain the planner — planning is user-gated after design approval.
- Do not produce DDL, signatures, or mermaid in the conversation — those are designer-owned.
- Do not skip section approval, even for a "simple" topic.
- Do not modify source code.

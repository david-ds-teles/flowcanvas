---
name: flowcode:design
description: Standalone slash command to run a design session — turn a fuzzy idea (or an already-approved scope) into a complete, execution-ready `{PREFIX}-design.md`. Conversational and main-session; runs the `flowcode:design` skill, which scopes the problem then dispatches `flowcode:designer-agent` for technical depth.
status: active
tags: [command, design, brainstorm, scope, session]
argument-hint: "<feature, change, or idea to design>"
links: [.flowcode/plans/plan-index.md]
---

# /flowcode:design

- Thin entry point: loads and runs the shared `flowcode:design` skill — the procedure lives in the skill, not here.
- **Canonical design surface.** `/flowcode:brainstorm` is an alias into the same skill for the fuzzy-idea entry; this command is the general one (fuzzy idea *or* an already-approved scope).
- Conversational, main-session: clarifying questions one at a time, silent parallel context-gather first, section-by-section approval — never a single dumped draft.
- Produces `.flowcode/plans/{PREFIX}/{PREFIX}-design.md` and registers a `draft` plan row; the `flowcode:designer-agent` fills DDL, signatures, mermaid, risks, and (for UI scope) runs the mockup gate.
- Hands off to `/flowcode:plan` at a final review gate — the planner is **user-gated and never auto-chained**.

## Usage

```text
/flowcode:design <feature or idea>
/flowcode:design                                  # no argument — prompt inline for the topic
```

Examples:

- `/flowcode:design add optimistic-locking to the order-update endpoint so concurrent edits stop clobbering each other`
- `/flowcode:design a read-through cache layer in front of the catalog service`
- `/flowcode:design` — empty; the session prompts inline for the topic

## What This Does

1. Loads the `flowcode:design` skill and runs its conversational procedure in the main session.
2. Gathers silent parallel context (`flowcode:code-explorer-agent`, `flowcode:research` when a tech is unknown, Tier-2 reads) before asking anything.
3. Scopes the problem one question at a time; decomposition gate for multi-subsystem topics; per-question visual-companion offer for UI topics.
4. Gets section-by-section approval, assigns a PREFIX, writes the design's upper sections, and registers the plan.
5. Dispatches `flowcode:designer-agent` (gap-fill) for technical depth, then stops at a final review gate before the planner.

## Prompt

You are running a design session.

Run the `flowcode:design` skill and execute its procedure. Treat `$ARGUMENTS` as the topic; if empty, prompt inline for it. Pick the entry mode from what the operator gives you — a fuzzy direction runs the full clarifying conversation (Mode A); a crisp, already-approved problem + scope goes straight to designer deepening after a quick confirmation (Mode B). This runs in the main session (the conversation cannot be delegated to a sub-agent). End at the final review gate; do **not** auto-chain `/flowcode:plan`.

## Non-Goals

- Do not implement the procedure inline — the skill is the single source of truth; this command only invokes it.
- Do not write `{PREFIX}-plan.md` or auto-chain the planner — planning is user-gated after design approval.
- Do not produce DDL, signatures, or mermaid in the conversation — those are designer-owned.
- Do not skip section approval, even for a "simple" topic.
- Do not modify source code.

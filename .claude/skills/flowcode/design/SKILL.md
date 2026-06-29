---
name: flowcode:design
description: Run a standalone design session — turn a fuzzy idea (or an already-approved scope) into a complete, execution-ready `{PREFIX}-design.md`. Conversational, main-session: scopes the problem one question at a time, then dispatches `flowcode:designer-agent` to deepen DDL, signatures, mermaid, risks, and research refs. Use whenever you want to design a feature/change before planning it — the canonical surface `/flowcode:design` and `/flowcode:brainstorm` both run.
status: active
tags: [design, brainstorm, scope, ideation, architecture, session]
links: [.flowcode/templates/design-template.md, .flowcode/plans/plan-index.md, .flowcode/ui/ui-workflow.md]
---

# Design Session

- The operator-facing playbook for producing a complete `{PREFIX}-design.md`: it scopes the problem conversationally, then runs the `flowcode:designer-agent` agent (opus) to fill the technical depth — a senior engineer can plan from the result with no further questions.
- Two entry modes, one engine: **(A) fuzzy idea** → full clarifying conversation that builds the scope from scratch; **(B) approved scope** already in hand → confirm the upper sections fast, then go straight to designer deepening.
- **Main session only, conversational.** Clarifying questions one at a time, multiple-choice preferred. Sub-agents can't host this loop — they have no return channel to the operator mid-run. The designer is dispatched as a sub-agent; the *conversation* is not.
- Silent parallel context-gather first (`flowcode:code-explorer-agent` + `flowcode:research` when a tech is unknown + Tier-2 reads); never ask what the repo already answers — that's a framework breach.
- Multi-subsystem topics hit the decomposition gate (pick one sub-project first); UI-touching topics get a per-question visual-companion offer via `ui/ui-workflow.md`.
- Section-by-section approval (Problem → Success Criteria → In/Out of Scope → Considered Alternatives → Recommended Approach) before a PREFIX is assigned and the plan registered.
- The designer runs in **gap-fill mode**: it preserves every approved section verbatim and writes only the technical gaps (DDL, signatures, enums, mermaid, deliberations, scope boundaries, risks, research refs).
- Hands off to `flowcode:plan` only — the planner is **user-gated and never auto-chained**. The session ends at a final review gate.

## When To Use

Use whenever the goal is to design a feature, change, or debt-paydown into an execution-ready artifact before any plan or code exists. Triggered by `/flowcode:design <topic>` or its alias `/flowcode:brainstorm <topic>` (same engine), or directly when the operator says "design this" / "new feature."

- **Fuzzy idea (Mode A):** the operator has a direction but not a defensible problem/scope yet. Run the full conversation.
- **Approved scope (Mode B):** the operator already states a crisp problem + scope (or a brainstorm already produced the upper sections). Confirm them and move to depth — don't re-litigate settled scope.

Not for: writing the implementation plan (that's `flowcode:plan`, user-gated after design approval), visual mockups in isolation (`/flowcode:mockup`), or pure fact-finding (`flowcode:research`).

## Procedure

Run in the main session, in order. Mode A runs every step; Mode B compresses steps 5–7 into a single confirmation when the scope is genuinely settled, but **never skips section approval entirely** — every upper section appears and is confirmed, even if one sentence each.

### 1 — Capture the topic

Treat the invocation argument as the topic. If empty, ask inline in one short sentence and wait. Decide the entry mode from what the operator gives you: a direction → Mode A; a crisp problem + explicit scope → Mode B.

### 2 — Silent context gather (parallel)

Before asking anything, dispatch in parallel and read the Tier-2 sweep scoped to the topic:

- `flowcode:code-explorer-agent` — survey the modules and existing patterns the topic touches.
- `flowcode:research` — only if the topic references a technology/library/protocol not in `.flowcode/researches/researches-index.md`.
- Read: `project-overview.md`, the likely-in-scope `modules/{name}.md`, `researches-index.md`, `plan-index.md` (overlap detection), `backlog.md` (a `BL-NNN` this design should absorb).

Do not ask the operator anything these files already answer.

### 3 — Scope check (decomposition gate)

If the topic spans multiple independent subsystems, **stop refining details** and present the decomposition: sub-projects (one-line purpose each), their relationships, and a suggested build order with rationale. Have the operator pick the first sub-project to design now. Write no file until they pick.

### 4 — Visual companion offer (UI-touching topics only)

If the topic touches UI, offer the visual companion in its own message: when a question benefits from a visual comparison, you can dispatch the mockup flow (`ui/ui-workflow.md § 1`, the same engine as `/flowcode:mockup`) for low-fidelity comparison iterations. Decide **per question** whether it's visual (layout/comparison) or conceptual (requirements/tradeoffs) — a UI topic does not make every question visual. Token-intensive; fall back to text when the cost is disproportionate.

### 5 — Clarifying conversation

Ask **one question at a time**, multiple-choice preferred, each contextualized by step-2 findings (name the specific module/pattern/constraint the question explores). Keep going until you can defensibly state: the problem (not a feature wish), success criteria (observable outcomes), in/out of scope (explicit boundaries), and a recommended approach with reasoning. In Mode B, this collapses to confirming what the operator already supplied and probing only genuine gaps.

### 6 — Propose 2–3 approaches

Lead with the recommended option and its reasoning; then 1–2 alternatives with tradeoffs. Ask which to refine. The rejected options become the **Considered Alternatives** section.

### 7 — Section-by-section approval

Present and get approval on each upper section before the next:

1. **Problem** — 2–4 sentences; the actual problem, not the feature.
2. **Success Criteria** — observable outcomes.
3. **In Scope / Out of Scope** — explicit lists.
4. **Considered Alternatives** — alternatives from step 6 with one-sentence rejection reasons.
5. **Recommended Approach** — 1–3 paragraphs at a *what/why* level. No DDL, no signatures, no mermaid — those are designer-owned.

If the operator revises a section, replay steps 5–6 as needed.

### 8 — Assign PREFIX and register the plan

Once every section is approved, ask for the PREFIX. Propose the next unused number from `plan-index.md` (zero-padded) + a kebab slug from the topic, format `{NNN}-{slug}`; accept any override (`flowcode-index.md § PREFIX Format` permits any team identifier). Wait for explicit confirmation. Then, same turn:

1. Create `.flowcode/plans/{PREFIX}/`.
2. Read `.flowcode/templates/design-template.md` and `.flowcode/quality-checks/markdown-quality.md`.
3. Write `.flowcode/plans/{PREFIX}/{PREFIX}-design.md`, matching the template's heading shape exactly. Fill the approved upper sections; leave designer-owned sections (Architecture, DDL, Signatures, Enums, Mermaid, formal Deliberations, Risks, Research References, formal Scope Boundaries) as a single `_To be filled by flowcode:designer-agent._` placeholder each — never fabricate content.
4. Append a `draft` row to `plan-index.md` (Progress `0/?`).
5. If absorbing a `BL-NNN`, set that backlog row to `Fold-In` with the PREFIX — only with explicit operator approval.

### 9 — Dispatch the designer (gap-fill)

Dispatch `flowcode:designer-agent` for `{PREFIX}`. It reads the existing design, preserves every filled section verbatim, and writes only the placeholder sections to full depth — DDL for data changes, concrete signatures, enum catalogs, mermaid, one rejected alternative per major decision, explicit scope boundaries, named risks with mitigation, research-ref citations. For UI-touching scope it runs its own UI gate (3 parallel `flowcode:ui-mockups` iterations, grounded in `ui-design-system.md`) and presents iterations for selection. Surface the designer's report.

### 10 — Final review gate

Tell the operator the design is complete at `.flowcode/plans/{PREFIX}/{PREFIX}-design.md` and to review and approve it before the planner runs. Flip the design's `status` to `approved` only on their approval. **Do not auto-chain `flowcode:plan`** — planning is a separate, user-gated phase.

## References

| File | Use |
|------|-----|
| `flowcode:designer-agent` | The depth worker (opus) — gap-fills the technical sections; runs the UI gate for frontend scope |
| `flowcode:code-explorer-agent` | Silent context-gather — surveys modules/patterns the topic touches |
| `flowcode:research` | Fills external knowledge gaps before designing (cache-first) |
| `.flowcode/templates/design-template.md` | The design artifact's section shape — match it exactly |
| `.flowcode/plans/plan-index.md` | Source for the next PREFIX number; receives the new `draft` row |
| `.flowcode/ui/ui-workflow.md` | Visual-companion iterations (step 4) and the designer's UI gate |
| `/flowcode:plan` | The next phase the session hands off to (user-gated) |

## Non-Goals

- Do not write `{PREFIX}-plan.md` or auto-chain the planner — the planner is user-gated after design approval.
- Do not produce DDL, signatures, mermaid, or formal risk analysis in the conversation — those are designer-owned; leave placeholders.
- Do not run the conversation in a sub-agent — it must be the main session.
- Do not skip section approval, even for "simple" topics — short sections are fine, skipped ones are not.
- Do not ask the operator what `project-overview.md` / `modules/*.md` already answer.
- Do not invent a PREFIX — always confirm with the operator.
- Do not modify source code.

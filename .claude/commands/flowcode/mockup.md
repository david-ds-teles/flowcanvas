---
name: flowcode:mockup
description: Standalone slash command to generate high-quality, self-contained HTML mockups/screens on demand — no plan required. Runs the flowcode:ui-mockups composer skill, grounded in the project design system and shaped by the vendored taste lenses.
status: active
tags: [command, ui, mockups, screens, standalone, design]
argument-hint: "<screen/feature description> [--out <dir>] [--states ...] [--breakpoints ...]"
links: [.flowcode/ui/ui-design-system.md, .flowcode/ui/ui-mockup-discipline.md, .flowcode/ui/ui-workflow.md]
---

# /flowcode:mockup

- Thin entry point: loads and runs the shared `flowcode:ui-mockups` skill — the procedure lives in the skill, not here.
- **Standalone, no plan required** — generate or iterate any screen/page/component as self-contained HTML anytime.
- Always grounded: reads `.flowcode/ui/ui-design-system.md` first; if none exists, offers to harvest/generate one before producing HTML (never ungrounded/subjective output).
- Produces 3 iterations per `ui-mockup-discipline.md`, each covering every declared state × breakpoint, with `data-testid` on every interactive element.
- Default output `.flowcode/ui/mockups/{slug}/`; inside an active plan, writes to that plan's `mockups/` instead; `--out <dir>` overrides.
- Same engine the framework dispatches automatically in the UI Design Gate — this is the manual surface of the same capability.

---

## Usage

```text
/flowcode:mockup <description>                              # 3 iterations into .flowcode/ui/mockups/{slug}/
/flowcode:mockup <description> --out path/to/dir            # custom output directory
/flowcode:mockup <description> --states empty,loading,error # restrict states (default: all in §12)
/flowcode:mockup <description> --breakpoints mobile,desktop # restrict breakpoints (default: design-system §6)
```

Examples:

- `/flowcode:mockup "users settings screen with a filterable table and an invite modal"`
- `/flowcode:mockup "premium landing hero for a fintech product" --out marketing/mockups`
- `/flowcode:mockup "onboarding step 1, animation-heavy" --states success,error`

---

## What This Does

1. Loads the `flowcode:ui-mockups` skill and runs its procedure standalone.
2. Grounds in `.flowcode/ui/ui-design-system.md` (offers harvest/generate if missing) and the `.flowcode/ui/references/` ground truth.
3. Selects the taste lens(es) the brief implies via `references/taste/taste-skills-index.md`; composes optional live engines (`frontend-design`, `ui-ux-pro-max`, global `impeccable`) when present.
4. Writes 3 self-contained iterations, then self-checks each against `references/quality-checklist.md` before presenting.
5. Hands back the iteration paths with a one-line rationale each.

---

## Prompt

You are generating UI mockups on demand.

Run the `flowcode:ui-mockups` skill and execute its procedure. Treat `$ARGUMENTS` as the brief: the leading text is the screen/feature description; parse optional `--out`, `--states`, `--breakpoints` flags.

Resolve the output directory:
- If `--out` is given, use it.
- Else if an active flowcode plan is in context, write to `.flowcode/plans/{PREFIX}/mockups/`.
- Else default to `.flowcode/ui/mockups/{slug}/` where `{slug}` is a kebab-case of the brief.

Ground first: read `.flowcode/ui/ui-design-system.md`. If it is missing or still the verbatim shipped starter on a real project, tell the operator and offer to harvest/generate a project design system (`flowcode:bootstrap-agent § Step 6.5`) before proceeding — but if they want to proceed on the starter, do so and say the output uses generic defaults. Never invent tokens.

Produce 3 iterations per `ui-mockup-discipline.md`, self-check each against `references/quality-checklist.md`, and present the paths. This runs in the main session (the operator selects an iteration); do not block on missing optional engines.

---

## Non-Goals

- Do not implement the procedure inline — the skill is the single source of truth; this command only invokes it.
- Do not generate production-framework components — output is self-contained HTML specs.
- Do not invent design tokens — ground in the design system or offer to harvest one first.

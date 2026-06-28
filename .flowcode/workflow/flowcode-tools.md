---
name: flowcode-tools
description: The registry of tools available to the agent and the rule to prefer them over raw underlying commands.
status: active
tags: [tools, registry, git]
links: [.flowcode/workflow/git-workflow.md, .flowcode/workflow/flowcode-rules.md, .flowcode/flowcode-index.md]
---

# Tools Registry

- Registry of every tool available to the agent; when a tool reference exists for an operation, use it as described rather than the raw underlying command.
- Mandatory tools are always available — currently git operations via `git-workflow.md`, loaded on-demand before any git action.
- UI/app tools: the `flowcode:ui-mockups` composer (mockups/screens), `flowcode:browser` (viewport capture + app smoke against the running app), and `/flowcode:render-html` (HTML deliverables) — grounded in `ui-design-system.md`.
- Project-specific tools are appended below by bootstrap or manually.
- **Host overrides:** project tool preferences added via `/flowcode:extend` live in `flowcode-tools.local.md`, loaded after this file and superseding on conflict — see `flowcode-index.md § Local Overrides`.

---

## Mandatory Tools

These tools are always available and must be used as specified:

| Scope | Reference | Load |
|-------|-----------|------|
| Git operations (branch, commit, merge, release) | `.flowcode/workflow/git-workflow.md` | on-demand — load before any git action |

---

## UI Design Tools

Use these for any UI/mockup/HTML-deliverable work; they encapsulate the grounding + taste-composition rules so output is never subjective.

| Scope | Reference | Surface |
|-------|-----------|---------|
| Generate / iterate UI mockups & screens (3 grounded HTML iterations) | the `flowcode:ui-mockups` skill | Skill — framework-triggered (designer agent / UI Gate) **and** standalone via `/flowcode:mockup` |
| Capture viewports + smoke-test the running app (visual parity + e2e) | the `flowcode:browser` skill | Skill — UI/app gate + `flowcode:execute` close **and** standalone via `/flowcode:browser`; resolves a driver via its ladder (boots/walks the app per `project-overview.md § App Run`) |
| Render an artifact as a polished standalone HTML doc | the `/flowcode:render-html` command | `/flowcode:render-html <artifact \| architecture \| flow>` |
| Establish / harvest the project design system | `.flowcode/ui/ui-design-system.md` + `flowcode:bootstrap-agent § Step 6.5` | Bootstrap UI step |

**Composable design engines** (the composer detects and prefers these when present; degrades gracefully when absent):

| Tier | Engines |
|------|---------|
| A — vendored, always available | Taste lenses bundled with the `flowcode:ui-mockups` skill (`references/taste/`) (Emil Kowalski, impeccable docs, design-taste-frontend, high-end-visual-design, minimalist-ui, industrial-brutalist-ui, gpt-taste, redesign-existing-projects, stitch-design-taste, brandkit) — routed by `taste-skills-index.md` |
| B — optional live | `frontend-design` (Anthropic skill) · `ui-ux-pro-max` (`--design-system` CLI) · the full global `impeccable` skill |

---

## Project Specific Tools

---
name: project-log
description: Project-level chronological log of plan completions, bootstraps, and fixes — the brief cross-plan history record.
status: active
tags: [project-log, history, logging, knowledge-base]
links: [.flowcode/templates/project-log-template.md, .flowcode/plans/plan-instructions.md]
---

# Project Log

- Project-level log: reverse chronological, most recent entry on top, new entries always added directly below this header.
- Scope is project-wide only — `[PLAN COMPLETE]`, `[BOOTSTRAP]`, `[BUGFIX]`, `[QUICKFIX]`; per-phase entries belong in the plan's own `{PREFIX}-log.md`.
- Use the entry templates in `.flowcode/templates/project-log-template.md`.

---

## [FEEDBACK] UI design gate + nyx pivot — 2026-06-26

**Dev:** david-ds-teles
**Captured:** 1 decision, 1 convention, 1 workflow-friction (→ 3 UC), 1 KB update, 1 backlog
**Applied:** `project/project-overview.md` (UI = nyx glassmorphic-neon; fonts Geist + JetBrains Mono)
**Logged (not applied):** BL-002 (add `loading`/`error` mockup frames); nyx direction (mockup 04) approved — supersedes dark-minimal, drag-drop upload added to scope — recorded in `001-initial-architecture-ui-design.md` and synced into the design + plan + `ui-design-system.md`
**Routed upstream:** UC-001 (greenfield design-system lock-in starves mockup exploration), UC-002 (mockup content-fidelity: render markdown + use real data), UC-003 (`ui-mockups` large-HTML reliability)
**Rejected/deferred:** none

---

## [BOOTSTRAP] success — 2026-06-25

**Dev:** david-ds-teles
**Detected:** standalone monolith / TypeScript 5 + React 19 / Next.js 15 (App Router) / React Flow `@xyflow/react` ^12 / Zustand ^5 / Tailwind v4 / Geist fonts / vitest (unit) + tsc + ESLint + next build — from `001-initial-architecture-design.md` and `001-initial-architecture-plan.md` (greenfield-from-spec; no source code on disk)
**Files:** `.flowcode/project/project-overview.md`, `.flowcode/quality-checks/quality-gates.md`, `.flowcode/workflow/flowcode-tools.md`, `.flowcode/quality-checks/naming-conventions.md`, `.flowcode/quality-checks/typed-models.md`, `.flowcode/quality-checks/enums-and-constants.md`, `.flowcode/quality-checks/error-handling.md`, `.flowcode/quality-checks/idiomatic-code.md`, `.flowcode/quality-checks/clean-code.md`, `.flowcode/ui/ui-design-system.md`, `.flowcode/project/project-log.md`
**Needs manual input:** Module detail files deferred — `.flowcode/project/modules/{module}.md` files are not generated because no source code exists yet; each will be produced by `flowcode:module-explorer-agent` at the close of the phase that builds it. CI/CD not configured — update `project-overview.md § CI/CD` and `quality-gates.md` when a pipeline is added. `§14` source paths in `ui-design-system.md` reference `app/globals.css` (Phase 1 target) — update to concrete line references once Phase 1 is complete.
**Next steps:** Execute Phase 1 of `001-initial-architecture-plan.md` (project scaffold + dark shell); run `npx tsc --noEmit`, `npm run lint`, `npm run build` at phase close to verify the first three gates green.

---

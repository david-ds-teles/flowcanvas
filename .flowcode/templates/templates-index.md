---
name: templates-index
description: Index of all flowcode artifact templates and the artifact each one scaffolds.
status: active
tags: [index, templates, artifacts, scaffolds]
links: [.flowcode/flowcode-index.md, .flowcode/workflow/file-conventions.md]
---

# Templates Index

- Lists every artifact template in `flowcode/templates/`; each is **on-demand** — loaded only when its artifact is about to be written (Tier 3).
- Use the tables below to find the template for an artifact type, who writes it, and the trigger; read that template before generating the artifact.
- Authoritative index is `.flowcode/flowcode-index.md § Templates`; this file mirrors it for local discovery.
- Every template scaffolds frontmatter + summary so generated artifacts conform to `file-conventions.md` by construction.

---

## Framework Templates

| Template | Used By | Trigger |
|----------|---------|---------|
| `agent-instructions.md` | `flowcode.sh` | Prepended to host `CLAUDE.md` at install time |
| `agents-structure-template.md` | Main agent / developer | Authoring any new flowcode sub-agent (wired into the harness) |

## Plan Lifecycle Templates

| Template | Used By | Trigger |
|----------|---------|---------|
| `design-template.md` | Main agent | Design phase begins |
| `plan-template.md` | Main agent | Plan generation begins |
| `ui-design-template.md` | Main agent | Plan touches frontend; UI design stage begins before implementation |
| `ui-design-system-template.md` | Bootstrap agent / main agent | Harvesting or generating the per-project `.flowcode/ui/ui-design-system.md` design ground truth |
| `html-deliverable-template.html` | `/flowcode:render-html` | Rendering an artifact (design/plan/technical-overview, or architecture/flow) into a self-contained house-style HTML doc |
| `plan-log-template.md` | Main agent | Plan folder creation (`[PLAN CREATED]`), every phase end (`[PHASE]`), plan close (`[PLAN COMPLETE]`) — contains 3 entry templates in one file |
| `qa-report-template.md` | QA pipeline | Post-execution gate report |
| `technical-overview-template.md` | Post-exec pipeline | After all phases complete |
| `changelog-template.md` | Main agent + post-exec parallel step | Each phase close (append per-phase section) and post-exec reconciliation |
| `test-notes-template.md` | Post-exec parallel step | Plan close |

## Project Templates

| Template | Used By | Trigger |
|----------|---------|---------|
| `project-overview-template.md` | Bootstrap agent | `/flowcode:bootstrap` — fresh or re-bootstrap |
| `module-template.md` | `flowcode:module-explorer-agent` + main agent | One `.flowcode/project/modules/{name}.md` per detected module. The explorer generates deep docs (per module, in parallel) at bootstrap or via `/flowcode:module-doc`; phases that change a module's public API, schema, or Key Insights update the corresponding file |
| `project-log-template.md` | Main agent | `[PLAN COMPLETE]`, `[BOOTSTRAP]`, `[BUGFIX]`, `[QUICKFIX]` entries — contains 4 entry templates in one file |
| `backlog-entry-template.md` | Main agent | Adding a new `BL-NNN` row to `.flowcode/project/backlog.md` during brainstorming/design |
| `upstream-contribution-template.md` | Main agent | Adding a new `UC-NNN` row to `.flowcode/upstream-contributions.md` when `/flowcode:extend` routes to the upstream branch |

## Research Templates

| Template | Used By | Trigger |
|----------|---------|---------|
| `research-template.md` | Research sub-agent | Before writing a research artifact to `.flowcode/researches/` |

## Reference Templates

| Template | Used By | Trigger |
|----------|---------|---------|
| `doc-reference-template.md` | `flowcode:docs-researcher-agent` | Before writing a `references/docs/{tech-slug}.md` technology documentation reference (the `docs` type) to `.flowcode/references/` |
| `reference-template.md` | `flowcode:reference` / main agent | Before writing a `references/{type}/{slug}.md` reference card for registered material (design, spec, example, …) to `.flowcode/references/` |

## Review Templates

| Template | Used By | Trigger |
|----------|---------|---------|
| `review-report-template.md` | `flowcode:code-reviewer-agent` | Before a standalone `/flowcode:review` writes a new `{slug}-review.md` to `.flowcode/reviews/` (plan-bound reviews use `qa-report-template.md`) |

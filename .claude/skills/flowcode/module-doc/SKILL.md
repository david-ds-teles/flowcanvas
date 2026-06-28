---
name: flowcode:module-doc
description: (Re)generate a single module's deep knowledge-base doc (`.flowcode/project/modules/{name}.md`) on demand — without a full re-bootstrap. Dispatches `flowcode:module-explorer-agent` (sonnet) in merge-mode to refresh a stale doc or backfill a module missing its file. Use when one module changed, a module doc went stale, or a module present in code is missing its `modules/{name}.md` (a `flowcode-rules.md §7a` breach).
status: active
tags: [module, knowledge-base, refresh, bootstrap, public-api]
links: [.claude/agents/flowcode/module-explorer-agent.md, .flowcode/project/modules/README.md, .flowcode/templates/module-template.md, .flowcode/project/project-overview.md, .claude/commands/flowcode/module-doc.md, .claude/skills/flowcode/bootstrap/SKILL.md]
---

# Module Doc Session

- Operator-facing surface for (re)generating ONE module's deep doc — the same depth bootstrap produces, scoped to a single module, no full re-bootstrap.
- Runs `flowcode:module-explorer-agent` (sonnet): it reads that module's source and writes `.flowcode/project/modules/{name}.md` to the § Module Doc Completeness Bar (real signatures, usage example, config/env, traced deps, conventions, insights).
- **Merge-mode always:** human-authored sections are preserved verbatim; only empty / placeholder / "Not detected" sections fill, and code/doc conflicts become `> Conflict:` notes.
- Accepts a module name or path; with no arg, lists modules whose docs are missing or stale and asks which to refresh (or "all").
- This skill owns the *which module / when* decision and the handoff; the explorer agent holds the full procedure.
- Surfaced via `/flowcode:module-doc`.

## When To Use

Run when a module's knowledge base needs to catch up to its code, short of a full bootstrap:

- **Stale doc:** a module's API/schema/config moved on and `modules/{name}.md` no longer matches the code.
- **Missing doc (framework breach):** a module exists in code but has no `modules/{name}.md` (`flowcode-rules.md §7a`).
- **Targeted refresh:** you just changed one module and want its doc regenerated at depth without re-running bootstrap over the whole project.

Not for: first-time project setup or a project-wide refresh (that's `/flowcode:bootstrap`), or a contract change made *inside* an active plan phase (a phase close updates the touched `modules/{name}.md` directly via the artifact-updater).

## Procedure

### 1 — Resolve the target module(s)

- **Arg given** (module name or path): resolve it against the Modules table in `.flowcode/project/project-overview.md`. If it isn't listed, confirm the path is a real module before proceeding.
- **No arg:** read the Modules table and `.flowcode/project/modules/`. List modules whose doc is missing or looks stale (skeleton/placeholder), and ask which to refresh — a name, a list, or "all".

### 2 — Dispatch the module explorer

For each target, dispatch `flowcode:module-explorer-agent` (sonnet), passing the module's `name`, `path`, `purpose`, and `stack` from the Modules table. **Dispatch independent modules in parallel** — one agent per module in the same turn. Each runs in merge-mode and writes its own `modules/{name}.md`.

### 3 — Relay the report

Surface each explorer's short report: file created/merged, depth counts, sections preserved, anything left as `Needs manual input`. If a module came back `skipped` / `candidate-for-merge`, say so. If a refreshed module's `Purpose` changed, update its row in the `project-overview.md` Modules table.

## References

| File | Use |
|------|-----|
| `.claude/agents/flowcode/module-explorer-agent.md` | The worker (sonnet) — deeply explores one module and writes its doc; holds the § Module Doc Completeness Bar |
| `.flowcode/project/project-overview.md` | Source of the Modules table (name / path / purpose / stack) |
| `.flowcode/project/modules/README.md` | Naming + sync conventions for module docs |
| `.flowcode/templates/module-template.md` | The doc shape the explorer fills |
| `.claude/skills/flowcode/bootstrap/SKILL.md` | The project-wide alternative when many modules need (re)generation |

## Non-Goals

- Do not re-bootstrap the project — this refreshes module docs only; the rest of the knowledge base is untouched.
- Do not touch source code — the explorer reads source and writes only `.flowcode/project/modules/{name}.md`.
- Do not clobber human-authored sections — the explorer runs merge-mode; conflicts surface as `> Conflict:` notes.
- Do not reimplement the per-module procedure here — dispatch the explorer; this skill owns the target selection and handoff.

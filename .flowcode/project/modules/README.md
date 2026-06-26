---
name: README
description: Convention marker for the per-module detail-file directory — naming, template, generation, and sync rules for module docs.
status: active
tags: [modules, conventions, knowledge-base, bootstrap]
links: [.flowcode/project/project-overview.md, .flowcode/templates/module-template.md, .flowcode/templates/plan-template.md]
---

# Modules

- One detail file per module detected by the bootstrap agent; this README is a convention marker (no behavioral content of its own) and the module docs are siblings in this directory.
- **Naming:** `{module-name}.md` — lowercase kebab-case, matching the module's code-level identifier.
- **Template:** `.flowcode/templates/module-template.md` — loaded before writing any module detail file.
- **Generation:** the bootstrap agent dispatches `flowcode:module-explorer-agent` (one per detected module) to generate a deep, self-contained doc meeting its § Module Doc Completeness Bar — real signatures, usage example, config/env, traced deps, conventions, insights. Refresh one on demand with `/flowcode:module-doc`. Human-authored sections are preserved on re-run (merge mode).
- **Sync rule:** a module present in code but missing `{name}.md` here is a framework breach (`flowcode-rules.md § 7a`). Phases that change a module's public API, DB schema, or Key Insights must update the corresponding file in the same edit (`flowcode-rules.md § 7b`).
- Plans reference module files through the per-phase **Touched Modules** field (see `plan-template.md`); the same sync discipline as `project-overview.md` applies.

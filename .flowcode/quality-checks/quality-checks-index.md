---
name: quality-checks-index
description: File map for the quality-checks subsystem — the gate registry plus the per-stack code-quality and markdown conventions.
status: active
tags: [quality, index, gates, code-quality, markdown]
links: [.flowcode/quality-checks/quality-gates.md, .flowcode/quality-checks/markdown-quality.md, .flowcode/workflow/flowcode-rules.md, .flowcode/flowcode-index.md]
---

# Quality Checks Index

- Router for the quality-checks subsystem; start here, then read only the sub-file you need (frontmatter first).
- `quality-gates.md` holds the executable gate registry; the remaining files hold authoring conventions.
- Code-quality conventions — `naming-conventions.md`, `typed-models.md`, `enums-and-constants.md`, `error-handling.md`, `clean-code.md`, `idiomatic-code.md` — load when planning or executing code-touching work.
- `markdown-quality.md` is the rendering contract for every markdown artifact — load when producing or editing markdown.
- The table below lists every file with its Load Type and purpose; gate registry and authoring rules live in the files themselves, not here.

---

| File | Load Type | Purpose |
|------|-----------|---------|
| `quality-checks-index.md` | context | This file — router for the quality-checks subsystem |
| `quality-gates.md` | context | Gate registry, gate types, when-run rules, adding-a-gate procedure, default-gates note |
| `naming-conventions.md` | context | Classes, methods, variables, constants, files, packages — universal principles + per-stack rules populated by bootstrap |
| `typed-models.md` | context | DTOs, entities, request/response shapes — no raw dicts |
| `enums-and-constants.md` | context | Enum patterns; no hardcoded strings or magic numbers |
| `error-handling.md` | context | Exception / error-response patterns; boundary-level handling |
| `clean-code.md` | context | SRP, dead-code removal, encapsulation, imports, scope discipline |
| `idiomatic-code.md` | context | Language-specific idioms (comprehensions, optional chaining, streams) |
| `markdown-quality.md` | context | Heading progression, table width, mermaid, fenced-block language tags, list/link/badge conventions, finding-as-section format |

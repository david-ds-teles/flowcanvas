---
name: references-index
description: Cache index of all technology documentation references gathered for this project — check here before working on a stack technology or dispatching the docs researcher.
status: active
tags: [references, docs, documentation, index, cache]
links: [.flowcode/templates/doc-reference-template.md, .flowcode/project/project-overview.md, .flowcode/flowcode-index.md]
---

# References Index

- Cache of every technology documentation reference gathered for this project; check here before working on a technology from `project-overview.md § Technology Stack`.
- Each row points to a `docs/{tech-slug}.md` reference — read its summary before writing code against that technology; gather it (dispatch `flowcode:docs-researcher-agent`) only when the row is missing or its status is `stale`.
- Lifecycle (cache check, gather, version-pin, update mode, naming) lives in the `flowcode:docs-researcher-agent` sub-agent and `.flowcode/templates/doc-reference-template.md`; gather on demand with `/flowcode:docs`.
- The table below is the file listing; keep it to one row per technology reference.

---

| Technology | Version | Status | Summary | File |
|------------|---------|--------|---------|------|

---
name: naming-conventions
description: Universal naming principles plus per-stack rules for classes, methods, variables, constants, files, and packages.
status: active
tags: [quality, naming, conventions, code-quality]
links: [.flowcode/quality-checks/quality-checks-index.md, .flowcode/quality-checks/clean-code.md, .flowcode/flowcode-index.md]
---

# Naming Conventions

- Load before writing or renaming any class, method, variable, constant, file, or package.
- Universal principles: descriptive over clever, match the codebase, no abbreviations/Hungarian/opaque acronyms, booleans as predicates, collections plural.
- Per-stack rules and project-specific additions are populated by bootstrap from the detected stack; on conflict, match the codebase's existing choices.

---

## Universal Principles

- **Descriptive, not clever.** A name should tell the reader what the symbol does or represents without requiring them to read its body.
- **Match the codebase.** Before introducing a new name, look at 2–3 adjacent files and follow the existing pattern.
- **No abbreviations unless standard in the domain.** `HttpClient` is fine; `HClnt` is not.
- **Booleans read as predicates.** `isReady`, `hasAccess`, `shouldRetry` — not `ready`, `access`, `retry`.
- **Collections are plural.** `users`, not `userList`. The collection type is obvious from the declaration.
- **No Hungarian or type-prefix notation.** `IUser`, `strName`, `oConfig` — all bad.
- **No opaque acronyms.** If the reader needs a dictionary, rename it.

---

## Per-Stack Rules

| Concept | TypeScript / React |
|---------|--------------------|
| Types / Interfaces | `PascalCase` — e.g. `CanvasNode`, `FlowcanvasDoc`, `MergeReport`, `BriefNode` |
| React Components | `PascalCase` — e.g. `MarkdownNode`, `CanvasShell`, `LabeledEdge`, `CommentThread` |
| Functions / Methods | `camelCase` — e.g. `nodeKind`, `buildBrief`, `applyResponse`, `deriveLinkEdges` |
| Variables | `camelCase` — e.g. `briefId`, `canvasRef`, `byPath` |
| Constants / Sets / Caps | `UPPER_SNAKE_CASE` — e.g. `BODY_CAP`, `IMAGE_EXT`, `ROOT`, `AGENT_CONTRACT` |
| Files | `kebab-case.ts(x)` — e.g. `canvas-shell.tsx`, `labeled-edge.tsx`, `fs-guard.ts`, `brief.test.ts` |
| Packages / Modules | `kebab-case` directories — e.g. `lib/canvas/`, `components/canvas/nodes/` |
| DTOs / Requests / Responses | `PascalCase` — e.g. `DesignBrief`, `AgentResponse`, `BriefEdge`, `GeneratedFile` |
| Store hooks | `use` prefix + `PascalCase` — e.g. `useCanvasStore` |
| Type guards | `is` prefix + PascalCase — e.g. `isFileNode` |

---

## Project-Specific Additions

**Flowcanvas naming contracts:**

- **Derived edge IDs** follow the deterministic pattern `lk:${fromNode}->${toNode}` — never deviate; idempotency depends on it.
- **Agent-minted IDs** carry the `ag-` prefix (e.g., `ag-tests`); user-minted edge IDs carry `e-`; comment IDs carry `c-`.
- **Brief/response schema fields** match the spec exactly (`briefVersion`, `briefId`, `canvasRef`, `baseRevision`, `responseVersion`) — do not camelCase-rename them.
- **Store selectors** are named after the data they expose, not the component that consumes them: `bodyFor(id)`, not `getBodyForMarkdownCard`.
- **`NodeKind` values** are lowercase string literals (`'markdown'`, `'image'`, `'file'`, `'link'`, `'note'`, `'group'`) — match `nodeKind()` return values exactly when writing `switch` or type guards.

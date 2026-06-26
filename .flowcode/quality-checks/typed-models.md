---
name: typed-models
description: Rules for modeling data contracts as typed DTOs, entities, and request/response shapes rather than raw dicts.
status: active
tags: [quality, typed-models, dtos, contracts, code-quality]
links: [.flowcode/quality-checks/quality-checks-index.md, .flowcode/quality-checks/naming-conventions.md, .flowcode/flowcode-index.md]
---

# Typed Models

- Load before defining a data contract — DTO, entity, request/response shape, API payload, or message schema.
- Prefer typed models over raw dicts/maps; keep Request, Response, and Entity as separate types; pass objects, not loose positional fields.
- Validate at the boundary; never type a contract as `any`/`object`/`dict[str, Any]`; type as optional only what is truly optional.

---

## Universal Principles

- **Prefer typed models over raw dicts / maps / objects.** Anonymous data shapes lose meaning across function calls; typed models carry intent.
- **Request ≠ Response ≠ Entity.** Separate classes. Do not reuse the ORM entity as the API payload; do not reuse the request DTO as the response.
- **Service methods take objects, not loose positional fields.** A method with 5 positional arguments is a DTO waiting to be born.
- **Validation at the boundary.** Validate once at the system edge (HTTP handler, queue consumer, CLI arg parser). Trust internal calls.
- **No `any` / `object` / `interface{}` / `dict[str, Any]` for contracts.** If you don't know the shape, design it — don't erase it.
- **Optional means optional.** If a field is always present, don't type it as optional; the unnecessary null-check is a code smell.

---

## Project-Specific Additions

**TypeScript / Flowcanvas patterns:**

- **Discriminated unions for the node schema.** `CanvasNode` is `FileNode | LinkNode | TextNode | GroupNode`, discriminated by the literal `type` field. Always narrow with `isFileNode(n)` or a `switch (n.type)` — never cast with `as FileNode` without a guard.

- **Separate schema from brief/merge types.** `lib/canvas/jsoncanvas.ts` owns the on-disk schema types (`CanvasNode`, `CanvasEdge`, `FlowcanvasDoc`). `lib/canvas/brief.ts` owns the agent protocol types (`DesignBrief`, `AgentResponse`, `BriefNode`, etc.). These are related but distinct contracts; do not conflate them.

- **No `any` on route handler bodies.** Parse and assert the shape explicitly:
  ```typescript
  const { path: rel, doc } = (await req.json()) as { path: string; doc: FlowcanvasDoc }
  // then validate doc.nodes + doc.flowcanvas.session before using
  ```

- **`NodeMeta.frontmatter` is a cache, not a contract.** Its type is `Record<string, unknown>` intentionally — it holds arbitrary YAML. Callers narrow individual fields (e.g., `fm.links as string[] | undefined`) rather than asserting a strong type.

- **`MergeReport` is the merge function's typed return.** Always destructure `{ next, report }` from `applyResponse` — don't ignore the report; the caller must surface `report.stale` and `report.conflicts` to the user.

- **Route handler response types.** All route handlers return `NextResponse.json(...)` with explicit shapes. Never return `Response.json` with an untyped object.

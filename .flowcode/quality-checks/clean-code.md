---
name: clean-code
description: Universal, stack-agnostic clean-code rules covering dead code, single responsibility, encapsulation, imports, and scope discipline.
status: active
tags: [quality, clean-code, code-quality]
links: [.flowcode/quality-checks/quality-checks-index.md, .flowcode/quality-checks/idiomatic-code.md, .flowcode/flowcode-index.md]
---

# Clean Code

- Load on any code edit; these rules apply universally regardless of stack.
- No dead code, no debug output, no half-finished implementations; one responsibility per function; encapsulate intent.
- Imports ordered and minimal; no premature abstractions; stay in scope; comments explain WHY, not WHAT.

---

## Universal Principles

- **No dead code.** Unreferenced functions, unused imports, commented-out blocks, stale `TODO`s — delete.
- **No debug output in committed code.** `console.log`, `print`, `System.out.println` — gone before commit.
- **Single Responsibility.** A function does one thing. If its name needs "and", split it.
- **Encapsulation.** Don't expose internals just because something needs them — expose intent via a method.
- **Imports ordered and minimal.** Follow the linter's import order. No wildcard imports unless the stack's convention demands it.
- **No premature abstractions.** Three similar lines is fine. Abstract on the fourth occurrence when the pattern is clear.
- **Stay in scope.** A bug fix doesn't clean up surrounding code. A one-shot operation doesn't grow a helper class.
- **Comments explain WHY, not WHAT.** Well-named identifiers already say what. Comment only when there's a non-obvious constraint, subtle invariant, or workaround.
- **No half-finished implementations.** If it's not done, don't land it.

---

## Project-Specific Additions

**Flowcanvas architecture-level clean-code contracts:**

- **`lib/canvas/*` is a pure-code zone.** No DOM APIs, no `window`, no React imports, no `fetch` calls in `jsoncanvas.ts`, `adapter.ts`, `brief.ts`, `edges.ts`, or `frontmatter.ts`. Pure TypeScript in, pure TypeScript out. This is what makes vitest run them without a browser or Next.js runtime. Any cross-cutting concern (logging, API calls, persistence) belongs in the store wrapper or a route handler.

- **React components are thin shells over the store.** A component that reaches into `fs`, calls a route, or contains merge logic is wrong. Components call store actions (e.g., `toggleCollapsed(id)`, `addComment(anchor, text, author)`) and render store state. The store does the coordination.

- **Route handlers contain no business logic.** A route handler guards the path, reads/writes the file, and returns a typed response. If any logic beyond that appears in a route handler, extract it to `lib/`.

- **No `@ts-ignore` or `@ts-expect-error` without an inline reason comment.** If the type system is fighting you, fix the type — do not suppress. The only exception is a third-party type bug, and that requires a `// TODO: remove when {lib}@{version} ships the fix` comment.

- **`any` is banned on contracts.** `NodeMeta.frontmatter` is `Record<string, unknown>` by design (arbitrary YAML); that is not `any`. Everything with a known shape gets a real interface.

- **`eslint-disable` blocks are prohibited in committed code** unless added with a one-line reason and a ticket/issue reference. `next lint` runs as a quality gate — all violations must be fixed, not suppressed.

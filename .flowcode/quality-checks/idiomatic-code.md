---
name: idiomatic-code
description: Rules for writing in each language's native dialect and matching the codebase's established idioms.
status: active
tags: [quality, idiomatic-code, language, code-quality]
links: [.flowcode/quality-checks/quality-checks-index.md, .flowcode/quality-checks/clean-code.md, .flowcode/flowcode-index.md]
---

# Idiomatic Code

- Load before writing new language-specific code, especially new files, new modules, or changes to established patterns.
- Write in the language's dialect; when a general best practice conflicts with the codebase idiom, match the codebase.
- Prefer the standard library, follow the project's async/concurrency model, lean on the type system, avoid premature micro-optimization.

---

## Universal Principles

- **Write in the language's dialect.** Python gets list comprehensions and context managers. TypeScript gets optional chaining and destructuring. Go gets early returns and explicit error values. Don't write Java in Python.
- **Match the codebase's idiom when it conflicts with general "best practice".** Consistency beats ideology at the style level.
- **Prefer standard library over custom utilities.** If the language ships it, use it.
- **Async/concurrency: follow the project's model.** Don't mix `async/await` with callback-based code in a file that picked a side.
- **No premature micro-optimization.** Readability over cleverness unless a profiler says otherwise.
- **Lean on the type system.** If the compiler or type checker can enforce an invariant, don't hand-roll a runtime check.

---

## Project-Specific Additions

**TypeScript / React idioms used in Flowcanvas:**

- **Optional chaining and nullish coalescing over verbose null guards.**
  ```typescript
  // good
  const links = (n.meta?.frontmatter?.links as string[] | undefined) ?? []
  // avoid
  const links = n.meta && n.meta.frontmatter && n.meta.frontmatter.links ? (n.meta.frontmatter.links as string[]) : []
  ```

- **Type-guard narrowing, not casting.** Use `isFileNode(n)` before accessing `n.file`; use `n.type === 'text'` in a `switch` arm; never `(n as FileNode).file` without a prior guard.

- **`Map` for O(1) lookups in adapter/derive functions.** Both `toReactFlow` and `deriveLinkEdges` build a `Map` from id/path → object. Never scan arrays with `find` inside a loop over another array.

- **Pure functions for merge/derive.** `buildBrief`, `applyResponse`, `deriveLinkEdges`, `reconcileEdges`, `colorVar`, `nodeKind` are all pure — same inputs → same output, no side effects. The store wrapper owns the side effects (API calls, `set`). Keep this split.

- **`Promise.all` for parallel file resolution.** The resolve route uses `Promise.all(paths.map(...))` — never sequential `await` inside a `for` loop for independent IO.

- **`memo()` on node components.** React Flow re-renders all nodes on viewport change unless nodes are memoized. Every node component (`MarkdownNode`, `ImageNode`, etc.) is wrapped in `memo()`.

- **`useEffect` cleanup for keyboard shortcuts.** `useSaveShortcut` registers `window.addEventListener` in `useEffect` and returns the cleanup `() => window.removeEventListener(...)` — always, without exception.

- **Zustand selectors are narrow.** Subscribe only to what the component needs: `useCanvasStore((s) => s.bodyFor(id))` rather than `useCanvasStore()` and destructuring. This prevents unnecessary re-renders on unrelated store updates.

- **`void` on fire-and-forget async in JSX event handlers.** `onClick={() => { void save() }}` — not `onClick={() => save()}`. Surfacing unhandled promise rejections is correct behavior; silently dropping them is not.

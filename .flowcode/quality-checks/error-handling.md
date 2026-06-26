---
name: error-handling
description: Patterns for boundary-level error handling, typed exceptions, and contextful error messages.
status: active
tags: [quality, error-handling, exceptions, code-quality]
links: [.flowcode/quality-checks/quality-checks-index.md, .flowcode/quality-checks/typed-models.md, .flowcode/flowcode-index.md]
---

# Error Handling

- Load before adding error handling, exception types, or error response shapes.
- Raise at boundaries and propagate internally; never swallow errors; messages must carry context.
- Distinguish expected failures (typed) from bugs (let them surface); own logging in one place; don't use exceptions for control flow.

---

## Universal Principles

- **Errors at boundaries, not internals.** Raise/throw at system edges; let internal calls assume success.
- **Don't swallow errors.** A `catch` without action is a bug unless a comment explains why.
- **Error messages carry context.** Not `"Invalid input"` — `"Invalid input: expected non-empty email, got ''"`.
- **Distinguish expected failures from bugs.** Business-rule violations (validation, auth, not-found) are expected and have typed errors. Bugs are unhandled — let them surface.
- **Never log-and-rethrow at every layer.** Pick one place that owns the logging. Everywhere else, propagate.
- **Don't use exceptions for control flow.** If the "exception" is the normal case, model it as a return value.
- **Fail loud in development, fail safe in production.** Only if the project's operational model is explicit about this split.

---

## Project-Specific Additions

**TypeScript / Next.js Route Handler patterns:**

- **`GuardError` is the typed path-traversal error.** Every route handler catches `GuardError` and returns `NextResponse.json({ error: e.message }, { status: 400 })`. It is the only expected error class from `guardPath`; treat it the same way in every route.

- **Standard error mapping in all route handlers:**
  ```typescript
  } catch (e) {
    if (e instanceof GuardError)
      return NextResponse.json({ error: e.message }, { status: 400 })
    if ((e as NodeJS.ErrnoException).code === 'ENOENT')
      return NextResponse.json({ error: 'not found' }, { status: 404 })
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
  ```
  Do not vary from this mapping per route. Every new route handler follows this exact tri-branch pattern.

- **`guardPath` throws, never returns an error.** Callers treat it as "returns abs path or throws `GuardError`" — never wrap it in an `if (!abs)` style check.

- **Pure library functions (`buildBrief`, `applyResponse`, `deriveLinkEdges`) do not throw on bad input** — they receive typed inputs and trust callers. Runtime validation is the route handler's responsibility.

- **`MergeReport.stale` is not an error — surface it as a warning.** A stale `briefId` still applies the response (last-writer-wins in v0.1). The store wrapper must expose `report.stale` and `report.conflicts` to the UI (toast) — never silently discard them.

- **`applyResponse` skips unknown node IDs gracefully** rather than throwing. An `AgentResponse` referencing a node that doesn't exist in `prev.nodes` mints a new node — it is not an error case.

- **Do not swallow `Promise` rejections in the store.** All async store methods (`load`, `save`, `applyResponse`) should propagate rejections so the component can catch them and surface an error state.

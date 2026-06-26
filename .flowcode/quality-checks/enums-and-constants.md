---
name: enums-and-constants
description: Rules for modeling fixed value sets as enums and replacing magic numbers and hardcoded strings with named constants.
status: active
tags: [quality, enums, constants, code-quality]
links: [.flowcode/quality-checks/quality-checks-index.md, .flowcode/quality-checks/typed-models.md, .flowcode/flowcode-index.md]
---

# Enums & Constants

- Load before introducing a fixed value set, or a numeric/string literal used in more than one place.
- No hardcoded strings or magic numbers in logic; use the language's enum primitive; enums serialize by name, not ordinal.
- One enum equals one concept; constants live next to their usage and prefer immutable (`const`/`final`/frozen).

---

## Universal Principles

- **No hardcoded strings or magic numbers in logic.** If a value has meaning, name it.
- **Use the language's enum primitive.** Not `const FOO = 'foo'` scattered across files — a real enum.
- **Enums serialize by name, not ordinal.** Ordinals change when you reorder; names survive.
- **Constants live next to their usage class** unless genuinely cross-cutting. Don't create a `Constants.java` dumping ground.
- **One enum = one concept.** If unrelated values are drifting into an enum, split it.
- **Prefer immutable.** Constants are `const` / `final` / `Readonly`; collections are frozen.

---

## Project-Specific Additions

**TypeScript / Flowcanvas patterns:**

- **String-literal union types over TypeScript `enum`.** Flowcanvas uses `type Side = 'top' | 'right' | 'bottom' | 'left'` and `type NodeKind = 'markdown' | 'image' | 'file' | 'link' | 'note' | 'group'` — not `enum Side {}`. This serializes cleanly as JSON and avoids TypeScript enum footguns (reverse mapping, numeric leak). Follow this pattern for new fixed value sets.

- **`const` objects / Sets for allowlists.** Membership checks use a `Set` constant:
  ```typescript
  const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif'])
  ```
  Not a scattered array literal at each call site. Readonly/frozen where the type allows.

- **Named version constants.** Schema versions (`schemaVersion: '0.1'`, `briefVersion: '0.1'`, `responseVersion: '0.1'`) are string literals asserted on both sides of the wire — never compared as free strings in logic. If the version bumps, update the type literal and the comparison together.

- **`BODY_CAP` is the single source of truth for truncation.** Defined once in `lib/canvas/frontmatter.ts` as `export const BODY_CAP = 40_000`. Referenced by the resolve route and the brief builder — never redeclared elsewhere.

- **Origin values are string-literal types.** `NodeOrigin = 'user' | 'agent' | 'import'` and `EdgeOrigin = 'links' | 'user' | 'agent'` — not strings. Narrowing in components (`origin === 'links'`) is type-safe without casts.

- **Preset color map.** The JSONCanvas color presets (`'1'`..`'6'`) map to hex via a `const PRESET: Record<string, string>` in `adapter.ts`. Do not inline the hex literals elsewhere — always go through `colorVar()`.

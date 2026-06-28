---
name: Schema — Extended JSONCanvas
status: stable
tags: [lib, schema, jsoncanvas, types]
description: The on-disk type root — JSONCanvas 1.0 core plus the namespaced `flowcanvas` extension. Source of truth for every other module's types.
links:
  - docs/architecture/adapter.md
  - docs/architecture/edges.md
---

## Responsibility

`lib/canvas/jsoncanvas.ts` defines the on-disk format: **JSONCanvas 1.0** at the `nodes`/`edges` level (so the board opens in Obsidian) plus one extension key, `flowcanvas`, holding session metadata and comment threads, and an optional per-node `meta` (a re-derivable frontmatter cache + provenance).

## Key types

- `CanvasNode` — `file` · `text` · `link` · `group` (an image is a `file` whose extension sniffs as an image).
- `CanvasEdge` — `fromNode`/`toNode`, sides, `toEnd`, free-form `label`.
- `FlowcanvasExt` — `schemaVersion`, `session`, `comments[]`.
- `nodeKind(n)` — the single discriminator the adapter + node components branch on.

## Why

Decision 1 (On-disk schema): the gaps in core JSONCanvas close cleanly with **one** top-level key — everything outside core JSONCanvas is re-derivable or non-fatal to lose, so the file degrades gracefully if a JSONCanvas-only tool rewrites it.

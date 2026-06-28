---
name: Frontmatter — gray-matter wrapper
status: stable
tags: [lib, frontmatter, gray-matter]
description: Thin parse/stringify wrapper over gray-matter — the only place YAML frontmatter is read or written.
links:
  - docs/architecture/schema.md
  - docs/architecture/api.md
---

## Responsibility

`lib/canvas/frontmatter.ts` is a thin wrapper over **gray-matter**: parse a markdown file into `{ frontmatter, body }`, and stringify back. It is the single choke-point for YAML frontmatter handling so the cache in `meta.frontmatter` and the on-disk file never diverge in format.

## Key behaviour

- `BODY_CAP` truncates very large bodies for the brief (the full file still renders in the reader).
- The parsed frontmatter is a **cache only** — the file on disk is the source of truth, repopulated on every load via `/api/canvas/resolve`.

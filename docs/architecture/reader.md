---
name: Reader — full-fidelity drawer
status: stable
tags: [ui, reader, shiki, markdown]
description: The read-only right drawer that renders a node's markdown at full fidelity with server-side shiki syntax highlighting.
links:
  - docs/architecture/canvas-shell.md
  - docs/architecture/api.md
---

## Responsibility

`components/canvas/reader-drawer.tsx` opens a glass drawer with the full, syntax-highlighted view of a markdown node, fetched rendered from the API. The node's comment thread sits beneath the prose.

## Why (perf)

Decision 4 (Markdown rendering split): running an async shiki highlighter inside **every** card does not scale. Node bodies use the lightweight client renderer (styled, not tokenized); the heavy `rehype-shiki` renderer runs **only** in the reader, for one node at a time.

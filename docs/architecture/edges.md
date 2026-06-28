---
name: Edges — derivation & provenance
status: stable
tags: [lib, edges, links, provenance]
description: deriveLinkEdges turns links: frontmatter into deterministic-id edges; reconcileEdges replaces the derived set on every load without touching user/agent edges.
links:
  - docs/architecture/schema.md
  - docs/architecture/store.md
---

## Responsibility

`lib/canvas/edges.ts` turns the flowcode `links:` graph into diagram edges.

- **`deriveLinkEdges`** — every `links:` entry becomes an edge with a **deterministic id** (`lk:<from>-><to>`).
- **`reconcileEdges`** — recomputing on every load replaces the whole derived set: links removed from frontmatter drop their edges; links added create them; user/agent edges (other origins) are never touched. A derived edge that duplicates a manual pair is suppressed (manual wins).

## Why

Decision 6 (Edge derivation & provenance): flowcode files already declare their neighbours in `links:`, so the graph becomes the diagram for free and self-heals. `meta.origin` tags each edge by provenance for styling.

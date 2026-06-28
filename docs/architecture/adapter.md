---
name: Adapter — Doc ↔ React Flow
status: stable
tags: [lib, adapter, react-flow]
description: The ~30-line bridge that maps a FlowcanvasDoc onto React Flow's {nodes,edges} and back, preserving absolute coords and meta.
links:
  - docs/architecture/schema.md
  - docs/architecture/canvas-shell.md
---

## Responsibility

`lib/canvas/adapter.ts` converts the persisted `FlowcanvasDoc` into React Flow's `{ nodes, edges }` (`toReactFlow`) and maps the live React Flow geometry back onto the doc (`toJSONCanvas`), preserving `meta`, type, comments, and session.

## Key behaviour

- Doc coords are **absolute**; React Flow wants a child positioned **relative** to its parent — the adapter converts both ways (single nesting level).
- `nodeKind` picks the React component type; markdown nodes auto-measure their height.
- Edge `meta.origin` maps to stroke colour; `meta.rel` rides on `edge.data` for typed-edge styling.

## Why

Decision 2 (React Flow): the only engine that is both license-free (MIT) and architecturally correct — nodes are arbitrary React components — and its JSON maps onto extended-JSONCanvas with a tiny adapter.

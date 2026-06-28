---
name: Comments — pins + threads
status: stable
tags: [ui, comments, threads]
description: The comment pin overlay and flat thread UI — Figma-style dual anchors, flat parent/reply threads with sequential badges.
links:
  - docs/architecture/store.md
  - docs/architecture/schema.md
---

## Responsibility

`components/canvas/comment-layer.tsx` + `comment-thread.tsx` render comment pins over the canvas and their threads. A comment anchors either to a **node** (`{nodeId, offsetX, offsetY}` as 0..1 fractions, so it follows and scales with the node) or to **canvas** coordinates.

## Model

Decision 5 (Comment model): threads are flat — `parentId === null` is a root (gets a sequential `badge`), otherwise it is a reply. Comments live in `flowcanvas.comments[]`, not as graph nodes, so they never pollute the diagram.

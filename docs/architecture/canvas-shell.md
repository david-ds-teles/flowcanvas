---
name: Canvas shell + nodes
status: stable
tags: [ui, canvas, react-flow, nodes]
description: The React Flow provider host and the per-kind node components — markdown / image / link / note cards rendered as real DOM.
links:
  - docs/architecture/store.md
  - docs/architecture/reader.md
---

## Responsibility

`components/canvas/canvas-shell.tsx` mounts the React Flow provider, background, controls, and minimap, and wires the controlled node/edge state to the store. The node components in `components/canvas/nodes/*` render each kind as **real DOM**:

- markdown card → `react-markdown` + `remark-gfm` (client, fast)
- image card → a real `<img>`
- link chip, note (text), group container

## Why

Decision 3 (Application shape): a standalone Next.js app whose canvas is a single screen. Because nodes are React components, a markdown card and an image are just JSX — the thing tldraw/Excalidraw cannot do.

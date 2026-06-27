---
name: Extended JSONCanvas
status: stable
tags:
  - schema
  - jsoncanvas
  - adapter
description: Flowcanvas stores boards as an extended JSONCanvas document.
links:
  - examples/welcome.md
---

## Nodes

`file` (markdown / image / other), `text`, `link`, and `group`. The kind is **derived** — a `file`
node ending in `.md` renders as a markdown card, an image extension renders inline, everything else
falls back to a labelled chip.

## Round trip

The adapter maps `FlowcanvasDoc → React Flow` for display and back again on save, preserving the
fields React Flow does not model (edge colour, comments, session).

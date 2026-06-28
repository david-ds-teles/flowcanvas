---
name: Store — Zustand state
status: stable
tags: [lib, store, zustand, state]
description: The single Zustand store — nodes, edges, comments, session, selection, dirty — and every action that loads, mutates, and persists the board.
links:
  - docs/architecture/adapter.md
  - docs/architecture/brief.md
  - docs/architecture/edges.md
  - docs/architecture/api.md
---

## Responsibility

`lib/canvas/store.ts` is the one Zustand store the whole UI subscribes to. It owns the in-memory `FlowcanvasDoc`, the resolved markdown bodies, transient UI state (mode, selection, reader, dirty), and every action.

## Load pipeline

`load(path)` → `GET /api/canvas` → `POST /api/canvas/resolve` (batch frontmatter + body) → hydrate `meta.frontmatter` → `deriveLinkEdges` + `reconcileEdges` → `toReactFlow()` → render.

## Agent round-trip

`buildBrief` (Export) and `applyResponse` (Import) call the pure brief/merge functions, write generated files via the API, re-resolve, and persist with `revision++`.

## Why

A single store keeps the canvas, inspector, reader, and toolbar reading one source of truth; selection and dirty are UI-only and never persisted.

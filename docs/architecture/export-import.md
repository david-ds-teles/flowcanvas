---
name: Export / Import panel
status: stable
tags: [ui, agent, export, import]
description: The UI for the clipboard agent loop — copy the DesignBrief out, paste the AgentResponse back in.
links:
  - docs/architecture/brief.md
  - docs/architecture/store.md
---

## Responsibility

`components/canvas/export-panel.tsx` is the agent round-trip surface. **Export** builds the `DesignBrief` (via the store's `buildBrief`) and offers it as copy/download. **Import** takes a pasted/uploaded `AgentResponse` and runs `applyResponse`, then the merged board re-renders and persists.

## Why

The brief is self-contained, so the entire loop is a clipboard round-trip — no filesystem or MCP access required for the agent. (v2 adds a native MCP sidecar alongside this fallback.)

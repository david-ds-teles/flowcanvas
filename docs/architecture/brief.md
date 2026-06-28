---
name: Brief / Merge — the agent loop
status: stable
tags: [lib, brief, merge, agent]
description: buildBrief packages the board into a self-contained DesignBrief; applyResponse runs the idempotent id-keyed merge of an AgentResponse.
links:
  - docs/architecture/schema.md
  - docs/architecture/frontmatter.md
  - docs/architecture/store.md
---

## Responsibility

`lib/canvas/brief.ts` is the point of the tool — the agent round-trip.

- **`buildBrief(doc, …)`** packages the board into a `DesignBrief`: a fat, self-contained JSON that embeds each markdown file's parsed **frontmatter + body**, the edges with their relationship labels, the comment threads addressed by id, and the human's high-level `intent`. The agent needs no filesystem access.
- **`applyResponse(doc, resp)`** runs an idempotent, id-keyed 8-step merge: write generated files, upsert nodes + edges, attach replies by id, re-resolve, persist — so re-importing the same response is a no-op.

## Why

Embedding parsed content (not just paths) keeps the brief filesystem-independent, so the loop is a clipboard round-trip the agent can answer with one JSON.

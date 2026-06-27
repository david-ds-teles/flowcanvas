# Flowcanvas Agent Contract

This is the contract an AI agent follows when answering a Flowcanvas **DesignBrief**. The same text ships
inline on every brief as `DesignBrief.responseContract` (source of truth: `AGENT_CONTRACT` in
`lib/canvas/brief.ts`) — keep the two in sync.

## The loop

1. The human exports a **DesignBrief**: a self-contained JSON snapshot of the board — every markdown
   node's parsed `frontmatter` + `body` embedded, the edges with their relationship labels, the comment
   threads addressed by id, and the human's high-level `intent`. No filesystem access is needed to read it.
2. You (the agent) reply with **exactly one** `AgentResponse` JSON object.
3. The human imports it. An idempotent, id-keyed merge writes any files you authored, upserts your nodes
   and edges, attaches your comment replies, re-derives the `links:` edges, and persists — so re-importing
   the same response is a no-op.

## Rules

- Return **exactly one** JSON object matching `AgentResponse` — no prose, no code fence, nothing outside it.
- **Echo `briefId`** from the brief (it is the concurrency token; a mismatch raises a stale warning).
- **Mint new ids with the `ag-` prefix.** Reuse an existing brief id to *update* that item.
- **To add a markdown file:** include it in `generatedFiles` (full content **including** YAML frontmatter)
  **and** a matching `upsertNodes` entry with `type:"file"`, `file:"<same path>"`.
- **Reply to a comment** by setting `parentId` to that comment's `id` from the brief and copying its `anchor`.
- **Prefer frontmatter `links:`** over manual edges for structural relationships. Never reference a `links:`
  target that is neither an existing node nor a file you also generate.
- **Keep coordinates on a 20px grid** and place new nodes in empty regions (the brief's positions reveal the
  occupied layout).

## AgentResponse schema

```typescript
interface AgentResponse {
  responseVersion: '0.1'
  briefId: string                 // echoes DesignBrief.briefId
  summary: string                 // human-readable changelog of what you did
  upsertNodes?: AgentNode[]
  removeNodeIds?: string[]        // explicit removals only
  upsertEdges?: AgentEdge[]
  removeEdgeIds?: string[]
  comments?: AgentComment[]
  generatedFiles?: { path: string; content: string }[]   // content includes YAML frontmatter
}

interface AgentNode {
  id?: string                     // present + known → update; absent or new "ag-*" → create
  type: 'file' | 'link' | 'text'
  x: number; y: number; width: number; height: number
  file?: string                   // type:'file'  (markdown/image/other, by extension)
  url?: string                    // type:'link'
  text?: string                   // type:'text'  (note, markdown)
  color?: string                  // "#RRGGBB" or preset "1".."6"
}

interface AgentEdge {
  id?: string
  fromNode: string; toNode: string
  fromSide?: 'top' | 'right' | 'bottom' | 'left'
  toSide?: 'top' | 'right' | 'bottom' | 'left'
  label?: string
}

interface AgentComment {
  id?: string
  parentId: string | null         // set → reply to that thread; null → new annotation
  anchor:
    | { kind: 'node'; nodeId: string; offsetX: number; offsetY: number }   // 0..1 fractions of the node box
    | { kind: 'canvas'; x: number; y: number }                              // canvas coordinates
  author: string                  // "agent:<model>" e.g. "agent:opus-4.8"
  text: string                    // markdown
  createdAt?: string              // ISO 8601 (optional; tool stamps if absent)
}
```

## Worked example

A brief that contains a `design ↔ plan` pair and a question on `n-plan`:

```json
{
  "responseVersion": "0.1",
  "briefId": "brief-77a1",
  "summary": "Added a test-notes node + answered the file-API question.",
  "upsertNodes": [
    { "id": "ag-tests", "type": "file", "file": "examples/test-notes.md", "x": 460, "y": -200, "width": 380, "height": 320 }
  ],
  "generatedFiles": [
    { "path": "examples/test-notes.md", "content": "---\nname: test-notes\nstatus: active\nlinks: [\"examples/plan.md\"]\n---\n## Test notes\n…" }
  ],
  "comments": [
    {
      "parentId": "c-1",
      "anchor": { "kind": "node", "nodeId": "n-plan", "offsetX": 0.5, "offsetY": 0.9 },
      "author": "agent:opus-4.8",
      "text": "Yes — guardPath + the POST handler are reused verbatim."
    }
  ]
}
```

The frontmatter `links: ["examples/plan.md"]` on the generated file auto-derives a `links` edge from the new
`ag-tests` node to `n-plan` — no manual `upsertEdges` entry needed.

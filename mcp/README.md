---
name: flowcanvas-mcp
description: Flowcanvas stdio MCP sidecar — exposes 7 tools over stdio so an MCP-capable harness can drive agent design rounds against a running Flowcanvas app.
status: active
tags: [mcp, sidecar, stdio, tools, agent-round-trip]
links: [.flowcode/plans/002-system-design-studio/002-system-design-studio-design.md]
---

# Flowcanvas MCP Sidecar

- Standalone Node.js stdio MCP server; implements the 7-tool surface defined in Decision 5 of the system-design-studio plan.
- The harness spawns it as a subprocess over stdio; all MCP JSON-RPC traffic flows over stdin/stdout.
- All diagnostic output goes to **stderr only** — stdout is owned by the MCP transport.
- Reaches the running Next.js app exclusively over HTTP (no direct file reads from the sidecar).
- The active-board pointer (`canvasRef`, `baseRevision`, `intent`) is written by the app on every `load`/`openBoard` (Phase 4) and read by `get_active_board`.
- `get_board`/`apply_response` call the pure `buildBrief`/`applyResponse` from `lib/canvas/brief.ts`; all file I/O is delegated to the guarded API routes.
- The Next.js app must be running before any tool call; if unreachable, tools return `{ error }` with `isError: true`.

---

## Prerequisites

1. **Next.js app running.** Start it with `next dev` or `next start` before spawning the sidecar. Default: `http://localhost:3000`. Override with `FLOWCANVAS_BASE_URL`.
2. **A board open.** The app writes the active-board pointer on load/openBoard. Without it, `get_board`, `apply_response`, and `get_active_board` (without an explicit `canvasRef`) will return an error.
3. **Node.js 18+.** The sidecar uses the native `fetch` API and `node:crypto`.

---

## Running the Sidecar

### Launch (no build step)

```bash
npm run mcp            # → tsx mcp/flowcanvas-mcp.ts  (tsx is a devDependency)
# or directly:
npx tsx mcp/flowcanvas-mcp.ts
```

`tsx` runs the TypeScript entry directly — no separate compile step is configured. A precompiled
(`tsc` → `node dist/...`) path is not set up yet; add a `build:mcp` script if a build artifact is needed.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `FLOWCANVAS_BASE_URL` | `http://localhost:3000` | Base URL of the running Next.js app. Change this if the app runs on a different port or host. |

---

## Harness Configuration

The harness (Claude for Desktop or any MCP client) spawns the sidecar as a subprocess via stdio. Example `claude_desktop_config.json` entry:

```json
{
  "mcpServers": {
    "flowcanvas": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/flowcanvas/mcp/flowcanvas-mcp.ts"],
      "env": {
        "FLOWCANVAS_BASE_URL": "http://localhost:3000"
      }
    }
  }
}
```

For a compiled build:

```json
{
  "mcpServers": {
    "flowcanvas": {
      "command": "node",
      "args": ["/absolute/path/to/flowcanvas/dist/mcp/flowcanvas-mcp.js"],
      "env": {
        "FLOWCANVAS_BASE_URL": "http://localhost:3000"
      }
    }
  }
}
```

---

## Tools

### 1. `get_board`

Build and return a `DesignBrief` for the specified (or active) board.

**Input**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `canvasRef` | `string` | No | Root-relative path to the `.canvas` file (e.g. `boards/design.canvas`). Omit to use the active-board pointer. |

**Output** — `DesignBrief` (JSON stringified)

```json
{
  "briefVersion": "0.1",
  "briefId": "brief-a1b2c3d4",
  "canvasRef": "boards/design.canvas",
  "baseRevision": 3,
  "generatedAt": "2026-06-28T12:00:00.000Z",
  "intent": "Extract the architecture into a board",
  "nodes": [ ... ],
  "edges": [ ... ],
  "comments": [ ... ],
  "responseContract": "..."
}
```

**Notes:** Resolves all `file` node markdown (frontmatter + body) via `POST /api/canvas/resolve`. Calls the pure `buildBrief` from `lib/canvas/brief.ts`.

---

### 2. `apply_response`

Apply an `AgentResponse` to the board: merge nodes/edges/comments, write generated files, persist the merged `.canvas`. Returns a `MergeReport`.

**Input**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `canvasRef` | `string` | No | Root-relative path to the `.canvas` file. Omit to use the active-board pointer. |
| `response` | `AgentResponse` | Yes | The agent's response object (must echo `briefId`). |

`AgentResponse` shape:

```typescript
{
  responseVersion: "0.1"
  briefId: string          // echo of DesignBrief.briefId (concurrency token)
  summary: string          // human-readable changelog
  upsertNodes?: AgentNode[]
  removeNodeIds?: string[]
  upsertEdges?: AgentEdge[]
  removeEdgeIds?: string[]
  comments?: AgentComment[]
  generatedFiles?: { path: string; content: string }[]
}
```

**Output** — `MergeReport` (JSON stringified)

```json
{
  "stale": false,
  "generatedFiles": ["boards/design.nodes/overview.md"],
  "created": { "nodes": 5, "edges": 3, "comments": 0 },
  "updated": { "nodes": 0, "edges": 0 },
  "removed": { "nodes": 0, "edges": 0 },
  "conflicts": []
}
```

**Notes:** Writes `generatedFiles` via `POST /api/file` before persisting the canvas via `POST /api/canvas`. The app detects the revision bump and reloads into change-review (Decision 6).

---

### 3. `read_file`

Read the raw content of a file by root-relative path.

**Input**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `path` | `string` | Yes | Root-relative path (e.g. `docs/overview.md`). |

**Output** — `{ content: string }` — full raw file content.

**Notes:** Routes through `GET /api/file?path=...` (the guarded raw-read endpoint added in Phase 4).

---

### 4. `write_file`

Write content to a `.md` or `.mdx` file.

**Input**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `path` | `string` | Yes | Root-relative path; must end in `.md` or `.mdx`. |
| `content` | `string` | Yes | Full file content including YAML frontmatter. |

**Output** — `{ ok: true }`

**Notes:** Routes through `POST /api/file`. Non-markdown extensions are rejected server-side. Use `apply_response.generatedFiles` when writing multiple files as part of a round — it writes them atomically before canvas persistence.

---

### 5. `list_dir`

List directory entries under the project root.

**Input**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `path` | `string` | No | Root-relative directory path. Defaults to `'.'` (project root). |

**Output** — `DirEntry[]`

```json
[
  { "name": "overview.md", "path": "docs/overview.md", "type": "file", "ext": ".md" },
  { "name": "boards", "path": "boards", "type": "directory" }
]
```

---

### 6. `resolve_paths`

Resolve file paths and return frontmatter + body for markdown files.

**Input**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `paths` | `string[]` | Yes | List of root-relative file paths to resolve. |

**Output** — `ResolvedFile[]`

```json
[
  {
    "path": "docs/overview.md",
    "exists": true,
    "frontmatter": { "title": "Overview", "links": [] },
    "body": "# Overview\n...",
    "truncated": false
  }
]
```

---

### 7. `get_active_board`

Read the active-board pointer. The app writes this on every `load`/`openBoard` call (Phase 4). The harness typically calls this first to discover which board is currently open.

**Input** — none

**Output** — `{ canvasRef: string; baseRevision: number; intent: string }`

```json
{
  "canvasRef": "boards/design.canvas",
  "baseRevision": 3,
  "intent": "Extract the architecture into a board"
}
```

Returns `{ error: "No active board — ..." }` with `isError: true` when `GET /api/canvas/active` returns `{ active: null }`.

**Notes:** The active-board pointer is written by the Flowcanvas app (not the sidecar) on every `load`/`openBoard`. The sidecar only reads it. See Phase 4 for the write-side implementation.

---

## Round-Trip Flow

The typical agent round (Decision 5 + 6):

```
1. App: save board (POST /api/canvas, rev=N)
        write review snapshot (POST /api/canvas/review)
        write active-board pointer (POST /api/canvas/active)

2. Harness: get_active_board()          → { canvasRef, baseRevision, intent }
3. Harness: get_board(canvasRef)         → DesignBrief
4. Agent:   (processes brief, replies)
5. Harness: apply_response(canvasRef, AgentResponse)
            → writes generated files + merged .canvas (rev=N+1)
            ← MergeReport

6. App: detects revision bump → reload → open change-review (Decision 6)
7. Human: Accept (DELETE /api/canvas/review) or Discard (restore snapshot)
```

For an extraction import (no prior board state):

```
1. App: new empty board + save + write active-board pointer
2. Harness: get_active_board() → { canvasRef, intent: "extract design.md" }
3. Harness: read_file("design.md") → { content }
4. Agent:   (reads design, builds AgentResponse with nodes+edges+generatedFiles)
5. Harness: apply_response(AgentResponse) → MergeReport
6. App: reload → decomposed board in change-review
```

---

## Error Handling

Every tool returns `{ error: string }` (JSON text) with `isError: true` on failure. The harness should inspect `isError` and surface the error message to the user.

Common errors:

| Error | Cause |
|-------|-------|
| `No active board` | No board is open in the app (`GET /api/canvas/active` → `{ active: null }`) |
| `fetch failed` / `ECONNREFUSED` | The Next.js app is not running at `FLOWCANVAS_BASE_URL` |
| `403` / `path outside root` | The path escapes `FLOWCANVAS_ROOT` (server-side guard) |
| `422` / `not a markdown file` | `write_file` called with a non-.md/.mdx path |

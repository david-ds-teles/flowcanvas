---
name: nextjs-node-runtime-mcp-sidecar-research
description: Pattern for a standalone Node.js process (MCP stdio sidecar) that reaches a running Next.js 15 app's guarded HTTP route handlers to read/write shared state (active board).
status: complete
tags: [architecture, next.js, node.js, mcp, http-client, sidecar, ipc]
links: [.flowcode/templates/research-template.md]
---

# Research: Next.js + Node Runtime MCP Sidecar (HTTP-Based)

- **Decision-ready finding:** Use HTTP `fetch` from the sidecar to reach app-side route handlers at `GET/POST /api/canvas/active`; pass `FLOWCANVAS_BASE_URL` (default `http://localhost:3000`) as an environment variable; avoid direct file reads from the sidecar to `.flowcanvas/active-board.json` because it creates race conditions and file-lock burden.
- Status: `complete`; dated 2026-06-27.
- Triggered by: Flowcanvas architecture question — how should an MCP stdio sidecar communicate with the running Next.js app?
- Sources consulted: Next.js 15 Route Handlers docs (v16.2.9, 2026-03-03), Node.js process.env & HTTP docs (v26.4.0), MCP stdio spec, Medium articles on MCP stdio transport.

---

## Summary

A standalone Node.js process (the MCP sidecar) should **reach the Next.js app exclusively over HTTP** using environment-variable discovery and the native `fetch` API. The sidecar reads `FLOWCANVAS_BASE_URL` (env var, default `http://localhost:3000`) at startup, then makes authenticated HTTP calls to guarded app-side routes (e.g. `GET /api/canvas/active`, `POST /api/canvas/active`) to read and update the active board state. This pattern avoids tight coupling to Next.js internals, prevents file-lock races, and keeps the sidecar launchable independently of the Next.js build/runtime.

---

## Findings

### Environment Variable Discovery (FLOWCANVAS_BASE_URL)

The sidecar reads `process.env.FLOWCANVAS_BASE_URL` at startup. If not set, default to `http://localhost:3000`.

**How the variable is passed:**
- When the MCP harness spawns the sidecar subprocess (via `child_process.spawn()` or similar), it passes an `env` object in the spawn options. Example:
  ```javascript
  spawn('node', ['path/to/sidecar.js'], {
    env: { ...process.env, FLOWCANVAS_BASE_URL: 'http://localhost:3000' }
  })
  ```
- The sidecar's entry point reads it at startup:
  ```javascript
  const baseUrl = process.env.FLOWCANVAS_BASE_URL || 'http://localhost:3000';
  ```

**Why env var over file config or CLI args:**
- Env vars are the standard pattern for process discovery (12-factor app model).
- Avoids requiring the sidecar to read a `.env` file or config on disk (reduces startup coupling).
- Works seamlessly with container runtimes and CI environments.

### Sidecar Launch Pattern (Independent of Next.js)

The sidecar is **not** spawned by the Next.js app or build process. Instead:

1. **Package.json entry point** (or `tsx` script entry):
   ```json
   {
     "scripts": {
       "sidecar": "node dist/sidecar.js",
       "sidecar:dev": "tsx src/sidecar.ts"
     }
   }
   ```

2. **MCP harness spawns the sidecar** as a subprocess (over stdio):
   - The harness calls `spawn('npm', ['run', 'sidecar'])` or `spawn('tsx', ['src/sidecar.ts'])`.
   - The sidecar's stdio is connected to the harness for MCP message transport (JSON-RPC, newline-delimited).
   - The Next.js app (started separately with `next dev` or `next start`) is running on `http://localhost:3000`.

3. **Handshake & startup check** (optional but recommended):
   - The sidecar can probe `GET /api/canvas/active` on startup to verify the Next.js app is reachable.
   - If unreachable, log a warning or fail gracefully.

**Why independent launch:**
- The sidecar has a different lifecycle than the Next.js app (may restart independently, e.g., for configuration changes).
- Avoids bundling the sidecar into the Next build output (keeps `dist/` smaller, avoids `next/server` leaking into standalone sidecar).
- Allows testing the sidecar against a running app without rebuilding Next.

### Active Board Access: API Route vs Direct File Read

**Tradeoff: API Route (recommended) vs Direct File Read**

#### **API Route Approach (Recommended)**

The app exposes routes:
```
GET  /api/canvas/active       → read active board metadata
POST /api/canvas/active       → write active board pointer / refresh
```

**Sidecar fetch call example:**
```javascript
async function getActiveBoard() {
  const res = await fetch(`${baseUrl}/api/canvas/active`);
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
  return res.json(); // { boardId: '...', path: '...', ... }
}

async function setActiveBoard(boardId, path) {
  const res = await fetch(`${baseUrl}/api/canvas/active`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ boardId, path })
  });
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
  return res.json();
}
```

**Advantages:**
- **Concurrency-safe:** The app-side route handler owns serialization (write-once semantics, atomic updates if using `Atomics` or file locks).
- **No race conditions:** Multiple processes (app, sidecar, tools) coordinate through a single write path.
- **Separation of concerns:** Sidecar doesn't need to know about `.flowcanvas/` file structure; app owns the contract.
- **Easier to extend:** Add new fields, versioning, or hooks in the route without sidecar code changes.
- **Works in serverless:** If deployed to a serverless platform, the file-based approach breaks; API routes remain valid.

#### **Direct File Read Approach (Not Recommended for Sidecar)**

The sidecar reads `.flowcanvas/active-board.json` directly from the project filesystem.

**Drawbacks:**
- **Race conditions:** The sidecar and app may read/write simultaneously without coordination.
  - Example: Sidecar reads a stale pointer while the app is updating it.
  - Multiple writes can corrupt the JSON if not locked.
- **File-lock complexity:** Must implement OS-level locking (fcntl on Unix, LockFileEx on Windows) to ensure atomicity — adds cross-platform fragility.
- **Tight coupling:** The sidecar must know the exact file location and format; changing the schema requires sidecar updates.
- **Testing friction:** Unit tests of the sidecar require setting up a fake `.flowcanvas/` directory; harder to isolate.
- **Bundling risk:** Sidecar shipping with Next.js may accidentally bundle filesystem paths tied to the app's structure.

**When direct file read is acceptable:**
- Only in a monolithic development setup where the sidecar and app always share the same filesystem (e.g., local `next dev` + local sidecar on the same machine).
- Even then, recommend the app expose the route and have the sidecar use it; the route can delegate to file I/O internally.

**Recommendation:** Always use the API route. The app-side route handler can still read/write the `.flowcanvas/active-board.json` file directly; the sidecar just doesn't know about it.

### Pitfalls & Mitigations

#### **1. Next.js Server Must Be Running**

**Risk:** If `http://localhost:3000` is not reachable, the sidecar's API calls fail.

**Mitigation:**
- Sidecar checks connectivity at startup: `await fetch(`${baseUrl}/api/canvas/active`).catch(...)`.
- Graceful degradation: If the app is unreachable, the sidecar continues but queues or logs a warning.
- Developer experience: Document that `next dev` or `next start` must be running before the sidecar.

#### **2. CORS on Localhost**

**Risk:** If the sidecar makes cross-origin fetch calls, the browser console warns; serverless environments may have stricter CORS policies.

**Mitigation:**
- **Localhost never has CORS issues** for same-origin calls (localhost:3000 to localhost:3000). However, if the sidecar runs on a different port (unlikely), configure the route:
  ```javascript
  // app/api/canvas/active/route.ts
  export async function GET(request: Request) {
    return Response.json({ boardId: '...' }, {
      headers: {
        'Access-Control-Allow-Origin': 'http://localhost:*', // or specific port
        'Access-Control-Allow-Methods': 'GET, POST',
      },
    });
  }
  ```
- For production sidecar deployments (e.g., containerized), set CORS to the sidecar's actual origin.

#### **3. Relative Path Safety in Shared State**

**Risk:** The active board pointer (`.flowcanvas/active-board.json`) might contain a relative path like `./boards/my-board.md`. If the sidecar and app resolve relative paths differently (different working directories), they load different files.

**Mitigation:**
- **Store absolute paths** in the active board pointer:
  ```json
  {
    "boardId": "abc123",
    "path": "/Users/davidteles/Projects/2flow/flowcanvas/boards/my-board.md"
  }
  ```
- Or store **project-relative paths** and have both the sidecar and app resolve them against the project root:
  ```json
  {
    "boardId": "abc123",
    "path": "boards/my-board.md",
    "projectRoot": "/Users/davidteles/Projects/2flow/flowcanvas"
  }
  ```
- Validate in the route that the resolved path is within the project (prevent directory traversal).

#### **4. Not Bundling the Sidecar into the Next Build**

**Risk:** If the sidecar is imported/bundled by the Next.js build (e.g., via a shared module), the sidecar may accidentally ship with server-only code or internal Next.js APIs.

**Mitigation:**
- Keep the sidecar in a **separate entry point** (e.g., `src/sidecar.ts`, separate from `src/app/`).
- Do **not** import Next.js internals (no `next/server`, `next/headers`, etc.) in sidecar code.
- In `next.config.js`, explicitly exclude the sidecar from the build:
  ```javascript
  // next.config.js (if needed)
  module.exports = {
    webpack: (config) => {
      config.externals.push('path-to-sidecar-entry');
      return config;
    },
  };
  ```
- Run the sidecar with `tsx src/sidecar.ts` or `node dist/sidecar.js` (compiled separately), never through `next build`.

---

## Conclusions & Recommendations

1. **Use HTTP `fetch` exclusively.** The sidecar reaches the app via route handlers at `GET/POST /api/canvas/active`. This is the standard pattern for inter-process communication on localhost and scales to containerized/serverless deployments.

2. **Pass `FLOWCANVAS_BASE_URL` as an environment variable.** Default to `http://localhost:3000` if not set. This allows developers and deployment scripts to override the target URL without code changes.

3. **Implement `/api/canvas/active` as a guarded route.** Both GET (fetch state) and POST (update state) should:
   - Check authentication/session (if needed).
   - Own the `.flowcanvas/active-board.json` file I/O internally.
   - Validate the board path (prevent directory traversal).
   - Return JSON with `{ boardId, path, updatedAt, ... }`.

4. **Keep the sidecar independent of the Next.js build.** Use a separate entry point (`src/sidecar.ts`) and launch it with `tsx` or a compiled `node` process, not through `next dev` or `next build`.

5. **Gracefully handle connectivity failures.** If the app is unreachable at startup, log a warning and continue; the sidecar may reconnect later.

6. **Use absolute or project-relative paths in the active board pointer** to ensure both the app and sidecar resolve the same file.

---

## Caveats & Expiry

- **Next.js version:** Research conducted against Next.js 16.2.9 (docs dated 2026-03-03). The Route Handlers API is stable since v13.2.0 and unlikely to change materially; these findings are durable.
- **Node.js version:** Assumes Node.js 18.0.0+ for native `fetch` API. Older Node.js requires `node-fetch` or similar polyfill.
- **MCP sidecar lifecycle:** Research assumes the sidecar is spawned by an MCP-capable host and communicates via stdio. If the harness changes its launch mechanism, update the sidecar launch pattern.
- **File I/O concurrency:** If multiple processes (app, sidecar, tools) attempt simultaneous file writes to `.flowcanvas/active-board.json`, the API route must serialize them. Direct file locking was not covered here; if needed, consult Node.js `fs` locking libraries or database-backed state.
- **Refresh timestamp:** Before Next.js 17.0 or Node.js 22.0 releases, revisit to confirm API stability.

---

## Raw Sources

| Source | URL | Relevance |
|--------|-----|-----------|
| Next.js Route Handlers (v16.2.9) | https://nextjs.org/docs/app/api-reference/file-conventions/route | Next.js 15 app-router route handler specification; HTTP methods, Request/Response APIs, CORS headers. |
| Node.js process.env API (v26.4.0) | https://nodejs.org/api/process.html | Reading and setting environment variables in Node.js; how child processes inherit env. |
| Node.js HTTP docs (v26.4.0) | https://nodejs.org/api/http.html | Native `fetch` API (v18.0.0+) and `http` module for making HTTP requests. |
| MCP Stdio Transport Specification | https://modelcontextprotocol.info/specification/draft/basic/transports/ | MCP stdio protocol: JSON-RPC, newline-delimited messages, stdin/stdout, launch environment. |
| Build an MCP Server (Official Docs) | https://modelcontextprotocol.io/docs/develop/build-server | Overview of MCP server development; how servers are launched and configured. |
| Understanding MCP Stdio Transport | https://medium.com/@laurentkubaski/understanding-mcp-stdio-transport-protocol-ae3d5daf64db | Medium article explaining MCP stdio transport mechanics and client-server handshake. |
| Node.js Environment Variables Guide | https://nodejs.org/learn/command-line/how-to-read-environment-variables-from-nodejs | How to read environment variables in Node.js; best practices for configuration. |

---

## Update Discipline (append-only)

(No prior updates.)

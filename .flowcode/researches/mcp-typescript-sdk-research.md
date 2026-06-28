---
name: mcp-typescript-sdk-research
description: How to build a stdio MCP server in TypeScript using the official SDK — package, setup, API signatures, and running.
status: complete
tags: [mcp, typescript, sdk, stdio-server, node]
links: []
---

# Research: Building a Stdio MCP Server in TypeScript

- **Use `@modelcontextprotocol/sdk` v1.29.0 (latest stable, March 2026); install with `zod@3`.**
- Tool registration via `server.registerTool(name, {description, inputSchema}, handler)`.
- Handler input validated by Zod schema; must return `{content: [{type: 'text', text: string}]}`.
- Build TypeScript to ESM JavaScript, run with `node`, spawned via CLI config with absolute path.
- Status `complete`; dated 2026-06-27.
- Triggered by: Flowcanvas project needs to expose tools (`get_board`, `apply_response`, `read_file`, `write_file`, `list_dir`, `resolve_paths`, `get_active_board`) over stdio to an MCP client.
- Sources: [modelcontextprotocol.io build-server guide](https://modelcontextprotocol.io/docs/develop/build-server), [MCP TypeScript SDK repo](https://github.com/modelcontextprotocol/typescript-sdk).

---

## Summary

Use `@modelcontextprotocol/sdk` (latest stable v1.29.0) to build stdio MCP servers in TypeScript. Register tools with `McpServer.registerTool()` accepting a Zod-validated input schema and async handler. The handler receives validated input and must return `{content: [{type: 'text', text}]}`. Build your TypeScript to ESM JavaScript (`type: "module"` in `package.json`), run with `node build/index.js`, and the MCP client spawns it via absolute path in a config file.

---

## Findings

### Package & Installation

**Package name:** `@modelcontextprotocol/sdk`  
**Latest stable version:** v1.29.0 (released 2026-03-30); v2 is pre-alpha and not recommended for production yet.

**Install command:**
```bash
npm install @modelcontextprotocol/sdk zod@3
npm install -D @types/node typescript
```

**Peer dependencies:** Zod v3 is required for schema validation. Alternative Standard Schema libraries (Valibot, ArkType) are compatible but Zod is the primary choice in examples.

**Dev setup (TypeScript):**
- Set `"type": "module"` in `package.json` for ESM support.
- Configure `tsconfig.json` with `"target": "ES2022"`, `"module": "Node16"`, `"moduleResolution": "Node16"`.
- Add a build script: `"scripts": { "build": "tsc && chmod 755 build/index.js" }`.

---

### Minimal Stdio Server Skeleton

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "my-server",
  version: "1.0.0",
});

// Register a single tool
server.registerTool(
  "get_board",
  {
    description: "Retrieve the current board state",
    inputSchema: {
      boardId: z.string().describe("The board identifier"),
    },
  },
  async ({ boardId }) => {
    // Your handler logic here
    const result = await getBoard(boardId);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP server running on stdio"); // Use stderr, never stdout
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
```

**Key points:**
- Imports use `.js` extensions (ESM).
- `McpServer` constructor takes config with `name` and `version`.
- `StdioServerTransport` handles JSON-RPC over stdio.
- `server.connect(transport)` is async and blocks until the server exits.
- Always log to `console.error()` (stderr); never use `console.log()` in stdio servers.

---

### Tool Registration API

**Method signature:**
```typescript
server.registerTool(
  toolName: string,
  config: {
    description: string;
    inputSchema: Record<string, ZodSchema> | ZodObject<any>;
  },
  handler: (input: ValidatedInput) => Promise<{
    content: Array<{type: 'text'; text: string} | {type: 'image'; data: string; mimeType: string}>;
  }>
): void
```

**Example with multiple parameters:**
```typescript
server.registerTool(
  "apply_response",
  {
    description: "Apply a response to the canvas and return the new state",
    inputSchema: {
      boardId: z.string(),
      response: z.object({
        action: z.enum(["update", "delete", "create"]),
        payload: z.record(z.any()),
      }),
    },
  },
  async ({ boardId, response }) => {
    const newState = await applyResponse(boardId, response);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(newState),
        },
      ],
    };
  }
);
```

**Input schemas:**
- Declared as a plain object with Zod validators: `{ fieldName: z.string() }`.
- Or as a full Zod object: `z.object({ fieldName: z.string() })`.
- The SDK validates input automatically; handler receives typed object.
- Use `.describe()` on Zod fields to add descriptions for the client.

---

### Handler Function & Response Format

**Handler signature (implicit via TypeScript inference):**
```typescript
async (input: Record<string, any>) => Promise<{
  content: Array<ContentBlock>
}>
```

**ContentBlock types:**
- **Text:** `{ type: 'text', text: string }`
- **Image:** `{ type: 'image', data: string, mimeType: string }` (base64-encoded data)
- **Error:** Throw an error; SDK converts it to an error response to the client.

**Return shape is always:**
```typescript
{
  content: [
    { type: 'text', text: '...' },
    // ... more blocks as needed
  ]
}
```

**Example returning structured JSON:**
```typescript
return {
  content: [
    {
      type: 'text',
      text: JSON.stringify({
        success: true,
        data: { /* ... */ },
      }, null, 2),
    },
  ],
};
```

---

### Running the Server

**Build step:**
```bash
npm run build
```
This compiles `src/` TypeScript to `build/` ESM JavaScript.

**Running directly (development):**
```bash
node build/index.js
```

**Running via tsx (faster iteration, no build step):**
```bash
npx tsx src/index.ts
```
Requires `tsx` installed: `npm install -D tsx`.

**Shebang for direct execution (Linux/macOS):**
Add to the top of `build/index.js` after compilation:
```javascript
#!/usr/bin/env node
```
Then:
```bash
chmod +x build/index.js
./build/index.js
```

**ESM vs CJS gotchas:**
- `type: "module"` in `package.json` makes all `.js` files ESM.
- Import statements must include `.js` extensions: `from "@modelcontextprotocol/sdk/server/mcp.js"`.
- `__dirname` and `__filename` are not available; use `import.meta.url` and `fileURLToPath(import.meta.url)` if needed.
- No `require()`; use `import` only.

---

### How an MCP Client Spawns the Server

**Claude for Desktop config (`claude_desktop_config.json`):**
```json
{
  "mcpServers": {
    "flowcanvas": {
      "command": "node",
      "args": ["/absolute/path/to/build/index.js"]
    }
  }
}
```

**Client code (e.g., another Node.js process):**
```typescript
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

const transport = new StdioClientTransport({
  command: "node",
  args: ["/absolute/path/to/build/index.js"],
});

const client = new Client({
  name: "flowcanvas-client",
  version: "1.0.0",
}, { capabilities: {} });

await client.connect(transport);

const tools = await client.listTools();
const result = await client.callTool({
  name: "get_board",
  arguments: { boardId: "123" },
});

await client.close();
```

**Key points:**
- Client passes absolute path; always use `process.env.HOME` or `path.resolve()` to compute it.
- The spawned server process inherits stdio from the client; all communication is JSON-RPC over pipes.
- Server must never write to stdout (only stderr for logging).
- Server startup is synchronous for the client; errors during `server.connect()` will propagate.

---

## Conclusions & Recommendations

**For Flowcanvas:**
1. **Use `@modelcontextprotocol/sdk` v1.29.0** with `zod@3` (no alternatives needed; Zod is standard).
2. **Structure your seven tools** (`get_board`, `apply_response`, `read_file`, `write_file`, `list_dir`, `resolve_paths`, `get_active_board`) as separate `server.registerTool()` calls in one file or split across modules imported into a single server instance.
3. **Use TypeScript + ESM** (`type: "module"`), build to JavaScript, run via `node build/index.js`.
4. **Log only to stderr** via `console.error()` to avoid corrupting stdio JSON-RPC traffic.
5. **Return structured JSON** in the `text` field if tools need to return complex data; the client can parse it.
6. **Validate all inputs** with Zod schemas; the SDK automatically rejects invalid requests before your handler runs.
7. **Test locally** by building, running `node build/index.js`, then spawning it as a client (or via `tsx` for faster iteration during development).

---

## Caveats & Expiry

- **Version lock:** Recommended to pin `@modelcontextprotocol/sdk@^1.29.0` in `package.json` until v2 is stable (estimated Q3 2026).
- **Zod version:** `zod@3` is tightly coupled; upgrading Zod may require SDK updates. Check release notes.
- **Node.js version:** Requires Node.js 16+; 18+ recommended for full ESM stability.
- **TypeScript:** 5.0+ for best ESM/resolution support.
- **Stdio exclusivity:** The API shown here is for stdio transport. SSE (server-sent events) and HTTP transports exist but are separate; this research covers only stdio.
- **Refresh before:** v2 stable release (expected Q3 2026) or when `@modelcontextprotocol/sdk` jumps to 2.x.

---

## Raw Sources

| Source | URL | Relevance |
|--------|-----|-----------|
| MCP Build Server Guide (TypeScript) | https://modelcontextprotocol.io/docs/develop/build-server | Official TypeScript quickstart, complete working example, tool registration, server lifecycle |
| MCP SDK Repository | https://github.com/modelcontextprotocol/typescript-sdk | SDK source, version history, class definitions |
| Model Context Protocol Homepage | https://modelcontextprotocol.io | Protocol overview, links to all SDKs and documentation index |

---
name: mcp-sampling-research
description: Research artifact on MCP sampling/createMessage protocol — mechanics, initiation model, SDK API surface, and constraints for v1.29.0
status: complete
tags: [research, mcp, sampling, createMessage, protocol-mechanics]
links: []
---

# Research: MCP Sampling (`sampling/createMessage`)

- **Decision-ready digest:** MCP sampling lets a *server* request an LLM completion FROM the connected *client* (model lives on the client). Use `ctx.mcpReq.requestSampling()` **only within tool handlers** in TypeScript SDK v1.29.0; outside tool context, sampling cannot be initiated. Client must declare `{ sampling: {} }` during initialization. Human approval is required before the response reaches the server.
- Status: `complete`; dated 2026-06-29.
- Triggered by: Investigating MCP sampling mechanics for MCP-native agent round-trip in Flowcanvas; determining whether a chat UI hosted inside an MCP server can drive sampling (spoiler: no, not without routing through a tool call).
- Sources consulted: Official MCP spec (2025-11-25), TypeScript SDK v1.29.0 docs and source, protocol schema, JSON-RPC 2.0.

---

## Summary

MCP sampling (`sampling/createMessage`) inverts the typical flow: an MCP *server* (not the client/host) requests an LLM completion from the connected *client*, which controls model access and enforces user approval. The TypeScript SDK v1.29.0 exposes this via `ctx.mcpReq.requestSampling()` **only within tool handler contexts**—no server can initiate sampling outside of a tool invocation. The client must declare the `sampling` capability at initialization. The protocol sends a JSON-RPC request with messages, systemPrompt, maxTokens, and optional modelPreferences/tools, and the client returns the LLM response only after **human-in-the-loop review** of both the request and the response. This design prevents servers from using sampling to "speak to the LLM directly" in a chat UI; a chat UI inside a server must either route through a tool call or make raw JSON-RPC requests outside the SDK.

---

## Findings

### Protocol Mechanics: What `sampling/createMessage` Does

`sampling/createMessage` is a JSON-RPC 2.0 request sent *from server to client* (opposite of typical tool calls). The server describes a prompt it wants the LLM to handle, and the client forwards it to the LLM, applies human approval gates, and returns the model's response.

**This is the inversion rule:** Normally the client (host/harness) drives all LLM interactions. Sampling flips that: the server (e.g., an MCP tool) says "I need the model to do X" and the client's LLM satisfies it.

**Message structure:**

Request (server → client):
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "sampling/createMessage",
  "params": {
    "messages": [
      {
        "role": "user",
        "content": {
          "type": "text",
          "text": "Summarize this text..."
        }
      }
    ],
    "systemPrompt": "You are a helpful assistant.",
    "maxTokens": 500,
    "modelPreferences": {
      "hints": [{ "name": "claude-3-sonnet" }],
      "intelligencePriority": 0.8,
      "speedPriority": 0.5,
      "costPriority": 0.3
    },
    "tools": [{ /* optional tool array */ }],
    "toolChoice": { "mode": "auto" },
    "includeContext": "none"
  }
}
```

Response (client → server, after human approval):
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "role": "assistant",
    "content": {
      "type": "text",
      "text": "The summary is..."
    },
    "model": "claude-3-sonnet-20240307",
    "stopReason": "endTurn"
  }
}
```

### Initiation Model: LOAD-BEARING — When Can a Server Call Sampling?

**CRITICAL FINDING:** In the TypeScript SDK v1.29.0, `ctx.mcpReq.requestSampling()` is **ONLY available inside tool handler contexts**. It is accessed via the `ServerContext` parameter (`ctx`) that is passed to handler functions. A server cannot initiate sampling at arbitrary times—only during the execution of a tool that the client has invoked.

Example pattern (the ONLY way to call sampling in v1.29.0):

```typescript
server.registerTool(
    'summarize',
    {
        description: 'Summarize text using the client LLM',
        inputSchema: z.object({ text: z.string() })
    },
    async ({ text }, ctx): Promise<CallToolResult> => {
        // THIS IS THE ONLY CONTEXT WHERE requestSampling IS AVAILABLE
        const response = await ctx.mcpReq.requestSampling({
            messages: [{
                role: 'user',
                content: {
                    type: 'text',
                    text: `Please summarize:\n\n${text}`
                }
            }],
            maxTokens: 500
        });
        return {
            type: 'text',
            text: response.content.text
        };
    }
);
```

**What this means for a chat UI inside a server:** A chat interface cannot directly drive sampling. The server cannot respond to a user's chat message with "let me ask the LLM" and then call `requestSampling()`. The chat UI would need to either:
1. Route user input through a tool invocation (tool handler gets `ctx.mcpReq.requestSampling`)
2. Bypass the SDK and send raw JSON-RPC `sampling/createMessage` requests directly (not recommended, requires manual request-ID tracking)
3. Not use sampling at all for chat—instead, have the client send the chat context to the server via a resource or prompt, and let the client's LLM handle the conversation

**Protocol-level specification does NOT restrict sampling to tool handlers** — the spec says "servers send a sampling/createMessage request" without mandating when. But the SDK's design exposes sampling *only* during tool execution via `ctx`, effectively enforcing this constraint at the API level.

### Capability Negotiation: Client Declaration is MANDATORY

For a server to use sampling, the connected client **MUST** declare the `sampling` capability during the initialization handshake. The server can check this before attempting to sample.

Client initialization capability:
```json
{
  "capabilities": {
    "sampling": {}
  }
}
```

Optional: if the client supports tool use within sampling (the LLM can call tools as part of the sampling request):
```json
{
  "capabilities": {
    "sampling": {
      "tools": {}
    }
  }
}
```

If a server tries to call `ctx.mcpReq.requestSampling()` on a client that has not declared `sampling` capability, the request will fail. The server can inspect `client.capabilities.sampling` (or equivalent in the SDK) to confirm support before invoking a tool that uses sampling.

### Request/Response Shape: Messages, Prompts, Tokens, and Preferences

The sampling request (`CreateMessageRequest`) carries:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `messages` | `SamplingMessage[]` | Yes | Array of message objects with `role` ("user" \| "assistant") and `content` (text, image, audio, tool_use, tool_result) |
| `systemPrompt` | `string` | No | System instruction for the LLM; client may modify or omit |
| `maxTokens` | `integer` | Yes | Token limit for response generation |
| `modelPreferences` | `ModelPreferences` | No | Hints for model selection (see below) |
| `tools` | `Tool[]` | No | Array of tools the LLM can invoke during sampling |
| `toolChoice` | `{ mode: "auto" \| "required" \| "none" }` | No | Controls whether the LLM can/must use tools; `"auto"` (default), `"required"`, `"none"` |
| `includeContext` | `"none"` \| `"thisServer"` \| `"allServers"` | No | Whether to include MCP context; `"none"` (default, recommended); `"thisServer"`/`"allServers"` soft-deprecated |

**Model preferences structure:**
```typescript
modelPreferences: {
  hints: [{ name: "claude-3-sonnet" }, { name: "claude" }],  // Substring matching; evaluated in order
  costPriority: 0.3,        // 0–1; higher = prefer cheaper models
  speedPriority: 0.8,       // 0–1; higher = prefer faster models
  intelligencePriority: 0.5 // 0–1; higher = prefer more capable models
}
```

The response (`CreateMessageResult`) includes:

| Field | Type | Notes |
|-------|------|-------|
| `role` | `"assistant"` | Always "assistant" (or "user" if tool results follow) |
| `content` | `SamplingMessageContentBlock[]` | Text, image, audio, or tool_use content; may be array or single object |
| `model` | `string` | Name of the model that generated the response (e.g., "claude-3-sonnet-20240307") |
| `stopReason` | `"endTurn"` \| `"stopSequence"` \| `"maxTokens"` \| `"toolUse"` | Why generation stopped |

### Human-in-the-Loop: REQUIRED User Approval

The MCP specification and implementation **require** human review at two checkpoints:

1. **Request review (before LLM):** The client SHOULD present the sampling request to the user for approval before sending it to the LLM. This allows the user to inspect the prompt (and modify it if the implementation supports that).

2. **Response review (after LLM):** The client SHOULD present the LLM's response to the user for approval before returning it to the server. This allows the user to see what the server will receive and deny if problematic.

Quote from the MCP spec: *"For trust & safety and security, there **SHOULD** always be a human in the loop with the ability to deny sampling requests. Applications **SHOULD** provide UI that makes it easy and intuitive to review sampling requests, allow users to view and edit prompts before sending, and present generated responses for review before delivery."*

**UX implication:** A chat UI hosted in a server cannot use sampling to transparently run LLM completions—each one will be gated by human approval, making the flow synchronous and blocking from the server's perspective.

### TypeScript SDK v1.29.0 API Surface

**Server-side (calling sampling):**

```typescript
// In a tool handler, only location where sampling is available
async (inputParams, ctx): Promise<CallToolResult> => {
    const response = await ctx.mcpReq.requestSampling({
        messages: [...],
        maxTokens: 500,
        systemPrompt?: "...",
        modelPreferences?: { ... },
        tools?: [...],
        toolChoice?: { mode: "auto" },
        includeContext?: "none"
    });
    // response.role, response.content, response.model, response.stopReason
}
```

**Client-side (registering handler):**

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

const client = new Client({...});

client.setRequestHandler('sampling/createMessage', async (request) => {
    // request.params contains the sampling request from the server
    const { messages, maxTokens, systemPrompt, modelPreferences } = request.params;
    
    // Forward to your LLM (e.g., Claude API)
    const llmResponse = await yourLLM.generateMessage(messages, { maxTokens, system: systemPrompt });
    
    // Return response
    return {
        role: 'assistant',
        content: { type: 'text', text: llmResponse.text },
        model: 'claude-3-sonnet-20240307',
        stopReason: 'endTurn'
    };
});
```

**No direct `server.createMessage()` method exists.** Sampling is accessed *only* via `ctx.mcpReq.requestSampling()` within tool handlers.

### Constraints & Limitations

1. **Sampling is tool-handler-scoped:** `ctx.mcpReq.requestSampling()` only available inside `registerTool` handler functions. Cannot be called from resources, prompts, or arbitrary server code.

2. **Client capability declaration is mandatory:** Server cannot sample if client doesn't declare `{ sampling: {} }` during initialization.

3. **Human approval gates all requests:** Each sampling request and response is subject to user review (implementation-dependent, but required by spec).

4. **Model preferences are hints, not directives:** The server can suggest model families, but the client makes the final choice.

5. **Tool-result content mixing is forbidden:** When a message contains tool results (type: "tool_result"), it MUST contain ONLY tool results—no mixing with text, images, or other content types.

6. **Deprecation path:** Sampling is deprecated as of protocol version 2026-07-28 (draft). Servers should plan to migrate to calling LLM APIs directly. v1.29.0 (2025-11-25 schema) remains the stable release with sampling fully supported.

---

## Conclusions & Recommendations

**For Flowcanvas MCP round-trip (agent loop):**

1. **Do not use sampling for a server-hosted chat UI.** Sampling is tool-scoped in the SDK, and routing user chat through tool calls is awkward. Instead, architect the agent loop so the harness/client controls the LLM and sends context to the server via resources or prompts.

2. **If the server-side code needs LLM assistance during a tool execution**, use `ctx.mcpReq.requestSampling()` without hesitation—this is the intended use case and fully supported by v1.29.0.

3. **Declare `sampling` capability** in your MCP server initialization response if you use sampling in tools. Clients will check this before engaging.

4. **Plan for deprecation:** Sampling is soft-deprecated in the 2026-07-28 draft. If building a long-lived system, monitor the MCP roadmap and be ready to shift to direct LLM API calls in tools when 2026-07-28 becomes stable.

5. **Human approval is non-negotiable:** Do not expect to use sampling for transparent, silent LLM invocations. Every request will be surfaced to the user for review in a well-behaved client implementation.

---

## Caveats & Expiry

- **SDK version:** These findings are specific to @modelcontextprotocol/sdk v1.29.0 and the MCP specification schema dated 2025-11-25.
- **Deprecation imminent:** Sampling is deprecated as of 2026-07-28 draft. Current stable is 2025-11-25; plan for migration within 12–18 months.
- **Protocol vs. implementation gap:** The MCP specification does not explicitly restrict sampling to tool handlers, but the TypeScript SDK's `ctx`-based API enforces this constraint at runtime. Other SDK implementations (Python, Go, Rust) may differ.
- **Human-in-the-loop detail:** The spec requires user review; actual enforcement depends on the client implementation. Some clients may bypass it (insecure) or implement it differently (e.g., approve-all by default in batch mode). Always assume the user *can* deny.
- **Refresh before:** Next MCP specification release (2026-07-28 or later); SDK major version bump (v2.x); or if Flowcanvas upgrades @modelcontextprotocol/sdk beyond v1.29.0.

---

## Raw Sources

| Source | URL | Relevance |
|--------|-----|-----------|
| MCP Specification: Sampling | https://modelcontextprotocol.io/specification/2025-11-25/client/sampling | Authoritative protocol mechanics, message structure, human-in-the-loop requirements, tool use in sampling. |
| MCP Specification: Architecture | https://modelcontextprotocol.io/specification/2025-11-25/architecture | Capability negotiation, server-client design principles, sampling as a client feature. |
| MCP Protocol Schema (TypeScript) | https://raw.githubusercontent.com/modelcontextprotocol/specification/main/schema/2025-11-25/schema.ts | `CreateMessageRequest`, `CreateMessageResult` type definitions. |
| TypeScript SDK: Server Documentation | https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/server.md | `ctx.mcpReq.requestSampling()` usage in tool handlers (v1.29.0). |
| TypeScript SDK: Client Documentation | https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/client.md | `client.setRequestHandler('sampling/createMessage', ...)` for client-side handler. |
| MCP Cheat Sheet (2026) | https://www.webfuse.com/mcp-cheat-sheet | Quick reference; confirms tool handler scope and deprecation timeline. |
| Agentailor MCP TypeScript SDK Guide | https://blog.agentailor.com/posts/mcp-typescript-sdk-complete-guide | Context on tool use in sampling and SDK patterns. |

---
name: mcp-elicitation-research
description: Research on MCP elicitation (elicitation/create) — protocol mechanics, SDK API surface, and functional scope
status: complete
tags: [mcp, elicitation, protocol, user-input, sdk]
links: []
---

# Research: MCP Elicitation (elicitation/create)

- Elicitation is a server-initiated protocol mechanism to request structured input FROM THE USER (not an LLM) during active request handling. Introduced in MCP 2025-06-18 spec. Form-based for non-sensitive data; URL-based for OAuth/credential flows. Do NOT use for sensitive data or model completions — it is purely a user-input gathering tool.
- Status: complete; dated 2026-06-29.
- Triggered by: Design phase for flowcanvas agent loop — clarifying whether elicitation can serve as a "brain" for in-app user feedback.

---

## Summary

MCP elicitation (`elicitation/create`) is a protocol feature added in the **June 18, 2025 MCP specification**. It enables servers to pause request handling and ask the client to solicit structured input from the *user*. The server sends a message + JSON Schema; the client presents this to the user with three response actions (accept/decline/cancel). The `@modelcontextprotocol/sdk` v1.29.0 provides `Server.request()` for servers to initiate elicitation and client-side handlers to process responses. **Critically: elicitation gathers user input, not LLM completions — it is NOT a "model brain" but a structured interactive input-gathering mechanism, intentionally restricted to non-sensitive data in form mode (passwords/tokens must use URL elicitation).**

---

## Findings

### Specification Timeline & Intro

The **elicitation** capability was introduced in the **Model Context Protocol specification version 2025-06-18**, released June 18, 2025. It became a stable, first-class protocol feature, distinct from prior ad-hoc workarounds. A subsequent November 25, 2025 update added URL-mode elicitation for OAuth and other credential-acquisition flows.

### Protocol Mechanics: Request Shape

A server initiates elicitation by sending an `elicitation/create` JSON-RPC request message containing:

1. **Message** — a human-readable explanation of what the server needs (e.g., "Please provide your GitHub username").
2. **Requested Schema** — a JSON Schema (restricted subset) defining the shape of expected user input:
   - Top-level properties only (no deep nesting)
   - Common field types: `string`, `number`, `boolean`, `array` (flat, single-type elements)
   - String constraints: `minLength`, `maxLength`, `format` (email, URI, date)
   - Number constraints: `minimum`, `maximum`
   - Enum options and default values
   - `required` array specifying mandatory fields
   - No complex nested objects or recursive structures (intentionally simplified to lower client implementation burden)

**Example request shape** (pseudo-JSON-RPC):
```json
{
  "jsonrpc": "2.0",
  "id": "req-123",
  "method": "elicitation/create",
  "params": {
    "message": "Please enter your GitHub username and API token scope.",
    "requestedSchema": {
      "type": "object",
      "properties": {
        "username": { "type": "string", "minLength": 1 },
        "scope": { "type": "string", "enum": ["read", "write", "admin"] }
      },
      "required": ["username"]
    }
  }
}
```

### Protocol Mechanics: Response Actions

The client presents the elicitation to the user and routes one of three responses back to the server:

1. **Accept** — user approved and provided data conforming to the requested schema:
   ```json
   { "status": "accept", "content": { "username": "alice", "scope": "read" } }
   ```

2. **Decline** — user explicitly refused the request (e.g., dismissed the form):
   ```json
   { "status": "decline" }
   ```

3. **Cancel** — user cancelled the operation (semantically distinct from decline; may be used to halt the entire workflow):
   ```json
   { "status": "cancel" }
   ```

The server consumes the response and either proceeds with the provided data, handles the declination gracefully, or stops the workflow.

### Initiation Model: Server-Driven, During Request Handling

Elicitation is **server-initiated** and occurs **during active request handling**. A typical flow:

1. Client sends a tool call, resource read, or prompt evaluation request to the server.
2. Server begins processing the request.
3. Server detects missing required context (e.g., a database query needs a timezone to resolve "today's date," or an API key is needed before proceeding).
4. Server sends an `elicitation/create` request to pause and ask the client/user for the missing information.
5. Client shows the elicitation form/dialog to the user.
6. User responds (accept/decline/cancel).
7. Server receives the response and either continues with the provided data, handles the error, or aborts the operation.

This is **not** asynchronous background communication — it is a synchronous request/response pause-and-ask mechanism embedded in active request flow.

### Dual Modes: Form vs. URL Elicitation

The protocol defines two elicitation modes:

**Form Elicitation (Non-Sensitive Data)**
- The client renders a schema-driven form for the user to fill in.
- Used for non-sensitive structured input: timezone, user preferences, action confirmation, business data (order ID, customer name, etc.).
- JSON Schema constraints and defaults are enforced by the client.
- Examples: "Which region?" | "Approve deletion of X?" | "Enter project name."

**URL Elicitation (Sensitive Data: OAuth, Credentials)**
- The server supplies a browser-navigable URL (typically an OAuth authorization endpoint, API key entry form, payment gateway, etc.).
- The client opens the URL in the user's browser; the user interacts with that external flow (authenticates, grants consent, enters secrets).
- Credentials are handled entirely by the external service; the client never sees them.
- The server sends a `notifications/elicitation/complete` notification to signal completion and dismiss pending UI.
- Examples: "Approve access to your Google Calendar?" → redirect to Google OAuth → user grants consent → callback → notification → server continues.

**Key restriction**: Form elicitation MUST NOT request personally identifiable information (PII), passwords, API tokens, or other sensitive credentials. These MUST use URL elicitation or out-of-band flows (e.g., environment variables, secure key manager).

### @modelcontextprotocol/sdk v1.29.0 API Surface

The TypeScript SDK v1.29.0 provides:

**For Servers:**
- `Server.request(method, params)` — generic method to send requests (including elicitation/create) to the client.
- Examples in the SDK repository demonstrate server-side initiation: `elicitationFormExample.ts` (form-based) and `elicitationUrlExample.ts` (URL-based).
- Servers register handlers to process elicitation responses and continue/abort the original request.

**For Clients:**
- Handler registration for `elicitation/create` requests (via `setRequestHandler` or similar mechanism).
- Response dispatch: call the callback with the user's chosen action and data.
- Examples in `elicitationUrlExample.ts` (client side) show browser navigation and completion notification handling.

**Schema Validation:**
- The SDK uses `zod` (or similar) for input validation — responses are validated against the requested schema before being passed to the server handler.

**Concrete method signature** (indicative; exact names may vary):
```typescript
// Server side: initiate elicitation during tool execution
async function executeTool(req: ToolRequest): Promise<ToolResult> {
  // ... initial processing ...
  
  // Missing data detected; ask the user
  const response = await server.request({
    method: "elicitation/create",
    params: {
      message: "Enter your timezone:",
      requestedSchema: {
        type: "object",
        properties: { timezone: { type: "string", format: "timezone" } },
        required: ["timezone"]
      }
    }
  });
  
  if (response.status === "accept") {
    // Proceed with response.content.timezone
  } else {
    // Handle decline/cancel — retry, error, or abort
  }
}

// Client side: handle elicitation requests
client.setRequestHandler(
  "elicitation/create",
  async (request) => {
    // Present form/URL to user, collect response
    const userResponse = await getUserInput(request.params);
    return userResponse; // { status: "accept"|"decline"|"cancel", content?: {...} }
  }
);
```

The v1.29.0 SDK bundles runnable examples in `examples/` demonstrating both form and URL patterns.

### NOT a Model Brain

**This is the critical distinction for design decisions:**

Elicitation does **NOT** provide an LLM/model completion or "brain." It is purely a **user-input gathering mechanism**:

- **What it is:** structured user input collection, interactive workflow support, dynamic context acquisition from the human operator.
- **What it is NOT:** a model inference capability, a generative completion tool, a "smart" system that synthesizes answers.
- **Use case:** agent asks user to fill in fields during a workflow (e.g., "Pick an action," "Provide context," "Approve this change").
- **Non-use case:** agent asking the model for structured output or reasoning; for that, use tool results, resource reads, or synchronous model inference (outside the MCP scope).

If a design requires the agent to reason or generate structured completions, that is a **model sampling or tool invocation concern**, not an elicitation concern. Elicitation is the **human-in-the-loop** primitive for workflows that need to pause and ask the user — not the AI — for context.

---

## Conclusions & Recommendations

1. **For in-app user feedback loops:** Elicitation is appropriate if the workflow needs the *user* to provide structured input during an agent task (e.g., "Approve this change?", "Pick a timezone", "Enter a filter value"). It is NOT appropriate for model-to-model or model-to-agent reasoning.

2. **Form vs. URL:** Use form elicitation for non-sensitive data (preferences, confirmations, business values). Use URL elicitation for sensitive flows (API key entry, OAuth, payments) — never ask for secrets via form.

3. **SDK usage:** The `@modelcontextprotocol/sdk` v1.29.0 provides full support. Servers use `Server.request()` to initiate elicitation during active request handling; clients register handlers to present UI and route responses. The v1 API documentation and bundled examples (`elicitationFormExample.ts`, `elicitationUrlExample.ts`) are the definitive reference.

4. **Initiation timing:** Elicitation is server-initiated and synchronous (pause-and-wait). It is NOT for background, asynchronous, or fire-and-forget flows.

5. **Design clarity:** If the flowcanvas design requires an agent to ask the user for input, elicitation is a fit. If it requires the agent to reason over structured data or generate completions, that is a distinct concern (model sampling, tool results, or custom messaging) outside the elicitation scope.

---

## Caveats & Expiry

- **MCP Spec Version Pinned:** Findings are grounded in MCP 2025-06-18 and 2025-11-25 specifications. If a future version (e.g., 2026-Q3) significantly changes elicitation semantics, findings should be refreshed.
- **SDK Version Pinned:** Tested against TypeScript SDK v1.29.0 (current v1 production release). V2 is alpha and may introduce breaking changes to the elicitation API.
- **URL Mode Addition:** URL-mode elicitation was added in November 2025 as an enhancement; form mode remains the core capability.
- **Schema Restrictions:** The intentionally simplified JSON Schema subset (no deep nesting, flat arrays) is by protocol design to reduce implementation burden on clients. This may constrain complex workflows — confirm the schema restrictions fit your use case.
- **No Sensitive Data:** This is a firm protocol rule, not a guideline. Servers attempting to request passwords, API keys, or PII via form elicitation will fail client validation.

---

## Raw Sources

| Source | URL | Relevance |
|--------|-----|-----------|
| MCP Specification Index | https://modelcontextprotocol.info/specification/ | Overview of MCP versions; confirms June 18, 2025 introduction. |
| MCP 2025-06-18 Release | https://blog.modelcontextprotocol.io/posts/2025-09-26-mcp-next-version-update/ | Official announcement of elicitation feature in mid-2025 spec. |
| MCP TypeScript SDK v1 Docs | https://ts.sdk.modelcontextprotocol.io/ | V1 API reference for `Server.request()` and handler registration. |
| TypeScript SDK Repository | https://github.com/modelcontextprotocol/typescript-sdk | Source code, examples (`elicitationFormExample.ts`, `elicitationUrlExample.ts`), and v1.x branch. |
| SDK Capabilities Docs | https://github.com/modelcontextprotocol/typescript-sdk/blob/v1.x/docs/capabilities.md | Form and URL elicitation conceptual overview, validation patterns, examples. |
| WorkOS Blog: MCP Elicitation | https://workos.com/blog/mcp-elicitation | Clear explanation of elicitation as user-input mechanism (not LLM completion), timeline, and use cases. |
| MCP Message Types Reference | https://portkey.ai/blog/mcp-message-types-complete-json-rpc-reference-guide/ | JSON-RPC request/response structure for elicitation/create. |
| Portkey: MCP Message Types | https://portkey.ai/blog/mcp-message-types-complete-json-rpc-reference-guide/ | Complete JSON-RPC message format reference. |
| MCP-Go Elicitation Docs | https://mcp-go.dev/servers/elicitation/ | Server-side implementation reference showing pause-and-ask flow. |
| MCP In .NET Docs | https://mcpindotnet.github.io/docs/concepts/client-concepts/elicitation/ | Client-side elicitation handling and response routing. |
| npm Package: @modelcontextprotocol/sdk | https://www.npmjs.com/package/@modelcontextprotocol/sdk | v1.29.0 release artifact and version history. |

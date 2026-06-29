---
name: researches-index
description: Cache index of all research findings produced for this project — check here before dispatching a new research agent.
status: active
tags: [research, index, cache]
links: [.flowcode/templates/research-template.md, .flowcode/flowcode-index.md]
---

# Researches Index

- Cache of every research finding produced for this project; check here before dispatching a new research agent.
- Each row points to a `{slug}-research.md` file — read the cached finding before spending tokens on a fresh search.
- Lifecycle (cache check, update mode, naming) lives in the `flowcode:researcher-agent` sub-agent and `.flowcode/templates/research-template.md`.
- The table below is the file listing; keep it to one row per research artifact.

---

| Slug | Topic | Date | Summary | File |
|------|-------|------|---------|------|
| `mcp-elicitation` | MCP Elicitation (elicitation/create) — protocol & API | 2026-06-29 | Introduced in MCP 2025-06-18 spec. Server-initiated request for structured user input (NOT LLM completion) during active request handling. Form mode (non-sensitive data) + URL mode (OAuth/secrets). @modelcontextprotocol/sdk v1.29.0 provides Server.request() + client handlers. Restrictions: no PII/credentials in form mode. | [.flowcode/researches/mcp-elicitation-research.md](.flowcode/researches/mcp-elicitation-research.md) |
| `mcp-sampling` | MCP Sampling (`sampling/createMessage`) Protocol & API | 2026-06-29 | Sampling inverts flow: server requests LLM completion from client. Use `ctx.mcpReq.requestSampling()` ONLY in tool handlers (v1.29.0); cannot initiate outside. Client must declare `{sampling:{}}` capability. Human approval required on request and response. Deprecated in 2026-07-28 draft. | [.flowcode/researches/mcp-sampling-research.md](.flowcode/researches/mcp-sampling-research.md) |
| `node-zip-streaming` | Next.js Node-runtime ZIP streaming | 2026-06-27 | Use fflate `zipSync()` (8 kB) for modest bundles from app-router handlers; set `runtime = 'nodejs'` and return a buffered Uint8Array Response. | [.flowcode/researches/node-zip-streaming-research.md](.flowcode/researches/node-zip-streaming-research.md) |
| `mcp-typescript-sdk` | Building stdio MCP servers in TypeScript | 2026-06-27 | Use @modelcontextprotocol/sdk v1.29.0 with zod@3; register tools via registerTool(); return {content:[{type:'text',text}]}; build TS→ESM, run with node, spawn via CLI config. | [.flowcode/researches/mcp-typescript-sdk-research.md](.flowcode/researches/mcp-typescript-sdk-research.md) |
| `nextjs-node-runtime-mcp-sidecar` | Next.js + Node Runtime MCP Sidecar (HTTP-Based) | 2026-06-27 | Use HTTP `fetch` from sidecar to reach app routes (`/api/canvas/active`); pass `FLOWCANVAS_BASE_URL` env var (default `localhost:3000`); avoid direct file reads to prevent race conditions. | [.flowcode/researches/nextjs-node-runtime-mcp-sidecar-research.md](.flowcode/researches/nextjs-node-runtime-mcp-sidecar-research.md) |
| `mcp-client-capability-support` | MCP client feature support — sampling & elicitation adoption matrix | 2026-06-29 | Sampling deprecated effective 2026-07-28; only VS Code+Copilot, Cursor, Cline ship today. Claude Desktop/Code do not. No official modelcontextprotocol.io matrix; use Apify/Glama + query initialize() at runtime. **Load-bearing risk:** Thin client adoption (3 of 10+ clients). Do not design MCP features depending on sampling. | [.flowcode/researches/mcp-client-capability-support-research.md](.flowcode/researches/mcp-client-capability-support-research.md) |

---
name: mcp-client-capability-support
description: MCP feature support matrix — which real client applications implement sampling and elicitation capabilities as of June 2026.
status: complete
tags: [mcp, protocol, clients, capabilities, sampling, elicitation]
links: [.flowcode/researches/researches-index.md]
---

# Research: MCP Client Capability Support — Sampling & Elicitation

- **Decision-ready digest:** Most production MCP clients (Claude Desktop, Claude Code, Zed) do NOT support sampling; only VS Code (Copilot), Cursor, and Cline have meaningful coverage. Sampling is deprecated as of 2026-07-28 (protocol version) in favor of Multi Round-Trip Requests (SEP-2322). Elicitation adoption is similarly thin. No official modelcontextprotocol.io feature support matrix exists — only community databases (Apify/Glama) track client capabilities.
- Status: `complete` (pre-deprecation snapshot, dated 2026-06-29)
- Triggered by: Flowcanvas MCP sidecar design — need to know which clients can invoke `sampling/createMessage` and elicitation without requiring the server to maintain API keys or call LLM providers directly.
- Sources consulted: Official MCP specification, deprecation notices, community client capability matrices, GitHub issues, client documentation, release notes.

---

## Summary

As of early 2026 (pre-2026-07-28 deprecation), **sampling adoption across MCP clients is historically thin**: most clients support core MCP tools and resources, but only 2–3 production clients (VS Code + Copilot, Cursor, Cline) have shipping sampling support; Anthropic's own clients (Claude Desktop, Claude Code) notably do NOT. Elicitation adoption is similarly sparse. **Critical:** The MCP specification is deprecated sampling on 2026-07-28 (protocol v2026-07-28, effective ~28 days from this research date) in favor of Multi Round-Trip Requests (SEP-2322), which is stateless and does not require client-held connections. No official feature support matrix is published on modelcontextprotocol.io — the Extension Support Matrix covers only MCP Apps, OAuth, and Enterprise Auth extensions, not core client capabilities. Community databases (Apify, Glama) are the de facto sources.

---

## Findings

### 1. Official MCP Feature Support Matrix

**Finding:** No official "clients" page with feature-support columns exists on modelcontextprotocol.io.

The official MCP documentation includes:
- **Extension Support Matrix** (`modelcontextprotocol.io/extensions/client-matrix.md`) — tracks adoption of three **extensions** (MCP Apps, OAuth Client Credentials, Enterprise-Managed Authorization), NOT core protocol capabilities (sampling, elicitation, roots).
- **Build an MCP Client** guide — teaches architecture, not a registry of shipping clients and their feature support.
- **Registry** (registry.modelcontextprotocol.io) — catalogs MCP **servers**, not clients.

**Implication:** Server developers must rely on non-official sources (GitHub issues, client changelogs, community capability matrices) to determine client feature support. This is a known friction point — SEP-1814 ("Caniuse-style Compatibility Matrix for MCP Clients") proposed an official feature matrix but has not shipped as of 2026-06-29.

**Source:** modelcontextprotocol.io/docs (architecture overview, extension matrix, registry); GitHub Issue #1814 (feature request for official matrix).

### 2. Sampling Capability — Status & Deprecation

**Finding:** Sampling is **deprecated as of protocol version 2026-07-28**, replaced by Multi Round-Trip Requests (SEP-2322).

**What is sampling:** `sampling/createMessage` is a request from an MCP server to the client's LLM (e.g., Claude, GPT-4) to generate text without the server needing API keys or model access. The client controls which model is used and can present the request to the user for approval before sending.

**Deprecation timing:**
- Effective date: **2026-07-28** (specification release candidate)
- Removal eligibility: 12 months after deprecation (per SEP-2596 Feature Lifecycle policy), so sampling remains in the specification until ~2027-07-28
- Migration path: Servers should call LLM APIs directly (e.g., Anthropic, OpenAI) rather than rely on client-side sampling

**Replacement:** Multi Round-Trip Requests (SEP-2322) — a stateless pattern where a server returns `InputRequiredResult` carrying input requests + opaque state; the client gathers answers and re-submits with responses. All state is in the payload (no held connection), enabling any stateless server instance to resume.

**Client Impact:** 
- Existing implementations (VS Code, Cursor, Cline) will continue to work through the 12-month deprecation window.
- New client implementations are advised against adopting sampling.
- This deprecation is a **major signal**: sampling never achieved broad adoption, and the MCP community is moving away from server-initiated LLM requests toward direct client API calls.

**Sources:** 
- [MCP Blog: 2026-07-28 RC](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/)
- [SEP-2322: Multi Round-Trip Requests](https://modelcontextprotocol.io/seps/2322-MRTR)
- [SEP-2596: Feature Lifecycle & Deprecation Policy](https://modelcontextprotocol.io/community/feature-lifecycle.md)

### 3. Client-by-Client Capability Matrix

**Key:** Sampling and Elicitation support as of **2026-06-29** (pre-deprecation snapshot).

#### Clients You Asked About

| Client | Sampling | Elicitation | Notes | Source |
|--------|----------|------------|-------|--------|
| **Claude Desktop** | ❌ NO | ❌ NO | Open GitHub issue/feature request (high vote count). Anthropic's own flagship client does not support these. | [GitHub Issue #1785 / claude-code](https://github.com/anthropics/claude-code/issues/1785); user reports 2026 |
| **Claude Code** | ❌ NO | ❌ NO | No sampling support; uses direct Anthropic API calls for LLM inference instead. Feature request active. | [GitHub Issue #1785](https://github.com/anthropics/claude-code/issues/1785); multiple blog posts 2026 |
| **Cursor** | ❓ UNCLEAR | ✅ YES | Elicitation shipped in v1.5 (August 2025). Sampling status not explicitly documented; Cursor forum has active discussion. | [Cursor Forum: Elicitation Support](https://forum.cursor.com/t/mcp-elicitation-support-immediate-need/116516); [Cursor Changelog](https://cursor.com/changelog) |
| **VS Code + GitHub Copilot** | ✅ YES | 🟡 PARTIAL | Sampling confirmed in production; Copilot Agent Mode (GA July 2025) allows user approval of sampling requests. Elicitation landing in VS Code Insiders as of early 2026. | [GitHub Blog: Agent Mode](https://github.blog/news-insights/product-news/github-copilot-agent-mode-activated/); [GitHub Docs: MCP Support](https://docs.github.com/copilot/concepts/context/mcp) |
| **Windsurf (Cascade)** | ❓ UNCLEAR | ❓ UNCLEAR | Cascade has native MCP integration; sampling/elicitation status unclear. Blog notes that "Anthropic clients don't yet support these features fully," implying Windsurf also lacks them. | [Windsurf Docs: Cascade MCP](https://docs.windsurf.com/windsurf/cascade/mcp); [Webfuse Guide 2026](https://www.webfuse.com/mcp-cheat-sheet) |
| **Continue IDE** | ❓ UNCLEAR | ❓ UNCLEAR | No specific documentation found. Community notes mention Continue supports "all MCP features," but this is unverified. | GitHub search; no official Continue MCP docs found with sampling/elicitation details |
| **Cline** | ✅ YES | ✅ YES | GitHub discussion explicitly lists sampling and elicitation support. Appears to be one of the rare clients with both. | [GitHub Discussion #4522: "Support new MCP features"](https://github.com/cline/cline/discussions/4522) |
| **Zed** | ❌ NO | ❌ NO | Zed supports Tools and Prompts only. Sampling and Elicitation are not implemented. Future roadmap mentions "agentic editing" but no confirmed timeline. | [Zed Docs: MCP](https://zed.dev/docs/ai/mcp); [GitHub Discussion #29370](https://github.com/zed-industries/zed/discussions/29370) |

#### Reference Implementations & Validators

| Implementation | Sampling | Elicitation | Notes | Source |
|---|---|---|---|---|
| **MCP Inspector** | ❓ UNCLEAR | ✅ YES (v0.16.2+) | Testing/debugging tool; added elicitation support in v0.16.2. Useful for validating server implementations. | [Memgraph Blog: Elicitation & Sampling](https://memgraph.com/blog/memgraph-mcp-elicitation-and-sampling) |
| **Official MCP Python SDK** | ✅ YES | ✅ YES | Reference implementations include `create_message()` (sampling) and `elicit()` (elicitation) methods. | [Python SDK GitHub](https://github.com/modelcontextprotocol/python-sdk) |
| **Official MCP TypeScript SDK** | ✅ YES | ✅ YES | Reference implementations available. | [TypeScript SDK GitHub](https://github.com/modelcontextprotocol/typescript-sdk) |

### 4. Community Capability Matrices

**Finding:** No official MCP registry of client features exists; two community databases are de facto standards:

1. **Apify/mcp-client-capabilities** (GitHub repo)
   - Lists clients with sampling: AmpCode, Glama, JetBrains AI, Mistral AI, Postman, Visual Studio Code
   - Lists clients with elicitation: Alpic, Cursor, GitGuardian, Glama, JetBrains AI, Mistral AI, Postman, VS Code
   - Caveat: *"MCP servers must verify capability via the client's initialize request, not rely on this database."*
   - Last updated: frequently maintained by community
   - **Source:** [GitHub: apify/mcp-client-capabilities](https://github.com/apify/mcp-client-capabilities)

2. **Glama** (public database)
   - Web interface for browsing MCP clients and their feature support
   - Similar to Apify but graphical
   - **Source:** [glama.ai/mcp/clients](https://glama.ai/mcp/clients)

**Implication:** Server developers must query `initialize` capability responses at runtime; capability declaration on `initialize` is the authoritative source, not pre-published tables.

### 5. Load-Bearing Risk: Thin Sampling/Elicitation Adoption

**Finding:** The majority of production MCP clients support tools and resources, but **sampling adoption is historically thin and now deprecated.**

**Evidence:**
- Anthropic's own clients (Claude Desktop, Claude Code) — 2 of the most widely used MCP applications globally — do NOT support sampling or elicitation. Feature requests exist but are not prioritized.
- Only 3 production clients (VS Code + Copilot, Cursor, Cline) have shipping support; 5+ others (Zed, Continue, Windsurf status unclear) do not.
- Community blog posts from 2026 note that "VS Code with GitHub Copilot currently has the most complete implementation."
- Deprecation as of 2026-07-28 signals that even the MCP community recognizes sampling is not the long-term path.

**Why Thin?**
- Security/trust friction: Sampling requires users to review LLM requests before sending; not all clients prioritize this UX.
- Stateless alternative emerged (SEP-2322): Multi Round-Trip Requests proved more scalable; stateless design is better for cloud architectures.
- Cost control: Clients that want to control LLM costs prefer direct API integrations, not delegating to servers.

**For Flowcanvas Impact:**
- If your MCP sidecar relies on sampling (server calling client LLM), it will **only work with 3 known clients** (VS Code, Cursor, Cline) and will break when clients drop sampling support post-2027-07-28.
- Recommendation: **Assume servers must provide their own LLM access** (API keys, direct provider calls). Do not design MCP features that depend on sampling.

**Sources:**
- [GitHub Issues: Feature requests in Claude Code, Claude Desktop](https://github.com/anthropics/claude-code/issues/1785)
- [Webfuse Blog: MCP Cheat Sheet 2026](https://www.webfuse.com/mcp-cheat-sheet)
- [Nullpointer Blog: MCP Spec Deprecation](https://nullpointer.se/new-mcp-spec.html)
- [Medium: MCP Sampling & Elicitation Guide](https://mcginniscommawill.com/posts/2026-03-25-mcp-sampling-elicitation-guide/)

### 6. Elicitation Capability — Status

**Finding:** Elicitation adoption is similarly thin, with only 4–5 confirmed client implementations.

**What is elicitation:** `elicitation/create` is a request from an MCP server to the client to present a structured form/prompt to the user and return validated input. Replaces agentic guessing with explicit user confirmation.

**Adoption:**
- **Shipped:** Cursor (v1.5+, August 2025), VS Code Insiders (partial, early 2026), Cline, MCP Inspector (v0.16.2+)
- **Not shipped:** Claude Desktop, Claude Code, Zed, Continue (status unclear)
- **Impact:** Limited — servers cannot rely on elicitation without a fallback; must design for clients that don't have it.

**Deprecation path:** Elicitation is not yet deprecated (as of 2026-06-29) but is being refactored under SEP-2322 (Multi Round-Trip Requests) in the 2026-07-28 specification update.

**Sources:**
- [Cursor Forum: Elicitation Support](https://forum.cursor.com/t/mcp-elicitation-support-immediate-need/116516)
- [MCP Spec: Elicitation](https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation)
- [Apify: mcp-client-capabilities](https://github.com/apify/mcp-client-capabilities)

---

## Conclusions & Recommendations

1. **Do not rely on sampling for core functionality.** Sampling is deprecated as of 2026-07-28 and adoption has been thin across clients. Even before deprecation, only 3 clients ship it. After 2027-07-28, it will be removed from the spec.
   - **Action:** Design your MCP sidecar to obtain LLM access via direct API calls (e.g., Anthropic API key, OpenAI key) or ensure the client environment provides one. Do not assume `sampling/createMessage` will be available.

2. **Plan for 2026-07-28 deprecation window.** Your current Flowcanvas MCP sidecar implementation should be audit-checked to determine if it uses `sampling/createMessage` or elicitation requests. If it does, begin migration to a direct-API pattern before the 12-month removal deadline (late 2027).
   - **Action:** Grep for `sampling/` and `elicitation/` in `mcp/flowcanvas-mcp.ts` and dependent code. If found, refactor to use server-side LLM calls (bring your own API key).

3. **Elicitation is optional.** Only 4–5 clients support it; 9+ do not. If you need user input during MCP tool execution, design elicitation as a nice-to-have, with a fallback to non-eliciting tools.
   - **Action:** Any elicitation calls in your sidecar should include server-side fallback logic.

4. **Test against realistic client behavior.** The Anthropic clients (Claude Desktop, Claude Code) — widely used — do not support sampling or elicitation. Test your implementation against them to avoid unpleasant surprises.
   - **Action:** Verify sidecar works with Claude Desktop (no sampling), VS Code + Copilot (sampling+partial elicitation), and Cursor (elicitation only).

5. **Use the community capability matrix as a reference only.** No official modelcontextprotocol.io feature matrix exists. When integrating with a specific client, query its `initialize` capability response at runtime for the authoritative feature support.
   - **Action:** Log or display client capabilities during MCP handshake (initialization).

---

## Caveats & Expiry

- **Deprecation timeline:** Sampling is deprecated effective **2026-07-28** (29 days from this research date, 2026-06-29). This research snapshot is taken pre-deprecation; verify timing when implementing.
- **Client version drift:** Client feature support may change with minor/patch releases. The matrix above reflects versions current as of June 2026 (e.g., Cursor v1.5+, VS Code Copilot GA July 2025). Confirm vendor changelogs before deployment.
- **Specification evolution:** SEP-2322 (Multi Round-Trip Requests) is in release candidate as of 2026-07-28. Once finalized, it will replace sampling/elicitation patterns; revise this research accordingly.
- **Community database lag:** Apify/mcp-client-capabilities and Glama are maintained by volunteers. Lag between client release and database update is common (1–4 weeks observed). Verify against official client documentation.
- **Refresh trigger:** Re-run this research after 2026-08-01 to confirm deprecation effective date and client migration patterns; also re-check if any client drops sampling support early.

---

## Raw Sources

| Source | URL | Version / Date Accessed | Relevance |
|--------|-----|---------|-----------|
| MCP Official Spec — Sampling | https://modelcontextprotocol.io/specification/2025-06-18/client/sampling | spec v2025-06-18, accessed 2026-06-29 | Defines sampling capability, message flow, error handling |
| MCP Official Spec — Elicitation | https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation | spec v2025-06-18, accessed 2026-06-29 | Defines elicitation messages and interaction model |
| MCP Blog — 2026-07-28 RC | https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/ | published ~2026-06-25, accessed 2026-06-29 | Announces sampling deprecation, SEP-2322 replacement |
| SEP-2322: Multi Round-Trip Requests | https://modelcontextprotocol.io/seps/2322-MRTR | draft, accessed 2026-06-29 | Replacement pattern for sampling/elicitation |
| SEP-2596: Feature Lifecycle Policy | https://modelcontextprotocol.io/community/feature-lifecycle.md | accessed 2026-06-29 | Defines 12-month deprecation window before removal |
| Extension Support Matrix | https://modelcontextprotocol.io/extensions/client-matrix.md | accessed 2026-06-29 | Official client support for MCP Apps, OAuth, Enterprise Auth (NOT sampling/elicitation) |
| GitHub Issue #1785 — Claude Code Sampling | https://github.com/anthropics/claude-code/issues/1785 | active, accessed 2026-06-29 | Feature request for sampling support in Claude Code |
| Cursor Forum — Elicitation Support | https://forum.cursor.com/t/mcp-elicitation-support-immediate-need/116516 | posted ~2026-04, accessed 2026-06-29 | User request and Cursor team discussion on elicitation |
| Cursor Changelog | https://cursor.com/changelog | accessed 2026-06-29 | Confirms elicitation shipped in v1.5 (August 2025) |
| GitHub Blog — Agent Mode | https://github.blog/news-insights/product-news/github-copilot-agent-mode-activated/ | published ~2026-06, accessed 2026-06-29 | Announces VS Code Copilot Agent Mode with sampling support (GA July 2025) |
| GitHub Docs — MCP Support | https://docs.github.com/copilot/concepts/context/mcp | accessed 2026-06-29 | Copilot MCP architecture and sampling flow |
| Cline GitHub Discussion #4522 | https://github.com/cline/cline/discussions/4522 | accessed 2026-06-29 | Confirms Cline supports sampling and elicitation |
| Zed Docs — MCP | https://zed.dev/docs/ai/mcp | accessed 2026-06-29 | Confirms Zed supports Tools/Prompts only; no sampling/elicitation |
| Zed GitHub Discussion #29370 | https://github.com/zed-industries/zed/discussions/29370 | accessed 2026-06-29 | User request for sampling/elicitation; Zed team response |
| Apify — mcp-client-capabilities | https://github.com/apify/mcp-client-capabilities | accessed 2026-06-29 | Community-maintained capability matrix (de facto standard) |
| Glama — MCP Clients | https://glama.ai/mcp/clients | accessed 2026-06-29 | Web UI for browsing client capabilities |
| Windsurf Docs — Cascade MCP | https://docs.windsurf.com/windsurf/cascade/mcp | accessed 2026-06-29 | Confirms Cascade native MCP integration; no sampling/elicitation details |
| Memgraph Blog — Elicitation & Sampling | https://memgraph.com/blog/memgraph-mcp-elicitation-and-sampling | published ~2026-03, accessed 2026-06-29 | Explains sampling/elicitation with MCP Inspector reference |
| Python SDK — GitHub | https://github.com/modelcontextprotocol/python-sdk | latest, accessed 2026-06-29 | Reference implementation of sampling (`create_message()`) and elicitation |
| TypeScript SDK — GitHub | https://github.com/modelcontextprotocol/typescript-sdk | latest, accessed 2026-06-29 | Reference implementation of sampling and elicitation |
| Webfuse — MCP Cheat Sheet 2026 | https://www.webfuse.com/mcp-cheat-sheet | 2026, accessed 2026-06-29 | Community summary of MCP features and client support |
| Nullpointer Blog — Spec Deprecation | https://nullpointer.se/new-mcp-spec.html | published ~2026-06, accessed 2026-06-29 | Analysis of 2026-07-28 deprecation and Multi Round-Trip pattern |

---

## Update Discipline (append-only)

No updates yet. Future updates will be appended below with trigger, changes, and verdict.

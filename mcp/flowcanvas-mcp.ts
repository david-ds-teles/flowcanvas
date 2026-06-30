#!/usr/bin/env node
// mcp/flowcanvas-mcp.ts — Flowcanvas stdio MCP server (Decision 5)
//
// Exposes 7 tools that wrap the guarded HTTP API surface and the pure brief.ts functions.
// Run: tsx mcp/flowcanvas-mcp.ts
// Or: compile + node dist/mcp/flowcanvas-mcp.js
//
// The Next.js app MUST be running at FLOWCANVAS_BASE_URL (default http://localhost:3000).
// All diagnostic output goes to stderr only — stdout is owned by the MCP JSON-RPC transport.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { buildBrief, applyResponse } from "../lib/canvas/brief";
import type { AgentResponse } from "../lib/canvas/brief";
import { buildKit } from "../lib/canvas/generation-kit";
import { organizeByType } from "../lib/canvas/layout";
import type { FileNode } from "../lib/canvas/jsoncanvas";
import type { FlowcanvasDoc } from "../lib/canvas/jsoncanvas";
import type { ResolvedFile, DirEntry, ActiveBoard } from "../lib/api";

// ── Config ─────────────────────────────────────────────────────────────────

const BASE = process.env.FLOWCANVAS_BASE_URL ?? "http://localhost:3000";

/** Short random suffix for minting brief/node/edge ids. */
const rid = (): string => randomUUID().slice(0, 8);

// ── HTTP helpers ────────────────────────────────────────────────────────────

/** GET `path` (absolute URL built from BASE + path), throw on non-2xx. */
async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    const detail = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(detail.error ?? `${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

/** POST `path` with JSON body, throw on non-2xx. */
async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(detail.error ?? `${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

/** Resolve the `canvasRef`: use the given value or fall back to the active-board pointer.
 *  READ-ONLY tools only (get_board) — writes require an explicit ref (see apply_response). */
async function resolveRef(canvasRef?: string): Promise<string> {
  if (canvasRef) return canvasRef;
  const data = await apiGet<ActiveBoard | { active: null }>("/api/canvas/active");
  if ("active" in data) {
    throw new Error("No active board — open a board in Flowcanvas first, then retry.");
  }
  return data.canvasRef;
}

/** GET the board doc, or null when the file does not exist yet (HTTP 404) — lets apply_response
 *  create a board from scratch instead of 404ing. Throws on any other failure. */
async function getCanvasDoc(ref: string): Promise<FlowcanvasDoc | null> {
  const res = await fetch(`${BASE}/api/canvas?path=${encodeURIComponent(ref)}`);
  if (res.status === 404) return null;
  if (!res.ok) {
    const detail = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(detail.error ?? `${res.status} ${res.statusText}`);
  }
  const { doc } = (await res.json()) as { doc: FlowcanvasDoc };
  return doc;
}

/** A fresh empty board (schema 0.4) — the from-scratch starting point when apply_response targets a
 *  canvasRef that does not exist yet. Mirrors store.newBoard so an agent-created board is identical
 *  to a human File→New. */
function emptyBoard(title: string, now: string): FlowcanvasDoc {
  return {
    nodes: [],
    edges: [],
    flowcanvas: {
      schemaVersion: "0.4",
      session: { title, intent: "", createdAt: now, updatedAt: now, revision: 0 },
      comments: [],
    },
  };
}

// ── MCP server ──────────────────────────────────────────────────────────────

const server = new McpServer({
  name: "flowcanvas-mcp",
  version: "0.1.0",
});

// ── Tool 1: get_board ───────────────────────────────────────────────────────
// Resolves the board, resolves all file-node markdown content, and builds the
// self-contained DesignBrief that is the agent's context packet for a round.

server.registerTool(
  "get_board",
  {
    description:
      "Build and return a DesignBrief for the specified (or active) board. " +
      "The brief embeds all markdown content, edges, comments, and the agent contract " +
      "— everything the agent needs for a round.",
    inputSchema: {
      canvasRef: z
        .string()
        .optional()
        .describe(
          "Root-relative path to the .canvas file (e.g. 'boards/design.canvas'). " +
            "Omit to use the active-board pointer written by the app on load/openBoard."
        ),
    },
  },
  async ({ canvasRef }) => {
    try {
      const ref = await resolveRef(canvasRef);
      const { doc } = await apiGet<{ doc: FlowcanvasDoc }>(
        `/api/canvas?path=${encodeURIComponent(ref)}`
      );

      // Gather file-node paths for bulk markdown resolution
      const filePaths = (doc.nodes as FlowcanvasDoc["nodes"])
        .filter((n): n is FileNode => n.type === "file")
        .map((n) => n.file);

      let resolvedMap = new Map<
        string,
        { frontmatter?: Record<string, unknown>; body?: string; truncated?: boolean }
      >();
      if (filePaths.length > 0) {
        const { resolved } = await apiPost<{ resolved: ResolvedFile[] }>(
          "/api/canvas/resolve",
          { paths: filePaths }
        );
        resolvedMap = new Map(
          resolved.map((r) => [
            r.path,
            { frontmatter: r.frontmatter, body: r.body, truncated: r.truncated },
          ])
        );
      }

      const briefId = "brief-" + rid();
      const brief = buildBrief(
        doc,
        ref,
        resolvedMap,
        briefId,
        new Date().toISOString()
      );

      // Stamp lastBriefId so a subsequent apply_response echoing this briefId is NOT flagged stale
      // (Decision 5 concurrency token). bump:false keeps the revision, so brief.baseRevision stays
      // valid. Non-fatal — a failed stamp only means the round reports stale:true (merge is correct).
      doc.flowcanvas.session.lastBriefId = briefId;
      await apiPost("/api/canvas", { path: ref, doc, bump: false }).catch((e) =>
        console.error("get_board: failed to stamp lastBriefId:", e)
      );

      return { content: [{ type: "text" as const, text: JSON.stringify(brief) }] };
    } catch (e) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: String(e) }) }],
        isError: true,
      };
    }
  }
);

// ── Tool 2: apply_response ──────────────────────────────────────────────────
// Runs the pure applyResponse merge, writes generated markdown files, and
// persists the merged .canvas doc (bumping the revision).  Returns MergeReport.

server.registerTool(
  "apply_response",
  {
    description:
      "Apply an AgentResponse to a board: merge nodes/edges/comments via the pure idempotent merge, " +
      "write any generated markdown files, and persist the .canvas (revision + 1). Returns a MergeReport. " +
      "A canvasRef to a path that does not exist yet is CREATED as a fresh board (and surfaced to the app). " +
      "canvasRef is REQUIRED — there is no active-board fallback for writes, so a generation never " +
      "overwrites the board the human has open.",
    inputSchema: {
      canvasRef: z
        .string()
        .optional()
        .describe(
          "Root-relative path to the .canvas file (REQUIRED for writes — the handler rejects an omitted " +
            "ref rather than falling back to the open board). A NEW path (e.g. 'boards/foo.canvas') is " +
            "created as a fresh board; an existing path is edited in place."
        ),
      response: z
        .object({
          responseVersion: z.literal("0.1"),
          briefId: z.string().describe("Echo of DesignBrief.briefId — the concurrency token."),
          summary: z.string().describe("Human-readable changelog of what the agent did."),
          upsertNodes: z.array(z.any()).optional(),
          removeNodeIds: z.array(z.string()).optional(),
          upsertEdges: z.array(z.any()).optional(),
          removeEdgeIds: z.array(z.string()).optional(),
          comments: z.array(z.any()).optional(),
          generatedFiles: z
            .array(z.object({ path: z.string(), content: z.string() }))
            .optional()
            .describe("New/updated markdown files (full content including YAML frontmatter)."),
          coreDocPath: z
            .string()
            .optional()
            .describe(
              "Root-relative path of the core spec doc. The tool binds it as the living spine AND places " +
                "a readable markdown card for it on the canvas — do NOT add your own node for it."
            ),
        })
        .describe("AgentResponse object matching the v0.1 agent contract."),
    },
  },
  async ({ canvasRef, response }) => {
    try {
      // Writes REQUIRE an explicit canvasRef — no silent active-board fallback. This is what prevents a
      // generation from clobbering whatever board the human happens to have open (the active-board latch
      // that overwrote examples/commerce-platform.canvas). To edit the open board, the agent calls
      // get_active_board first and passes the canvasRef it returns.
      if (!canvasRef) {
        throw new Error(
          "apply_response requires an explicit canvasRef. Pass a NEW path (e.g. 'boards/foo.canvas') to " +
            "create a board, or an existing path to edit one. Call get_active_board to target the open board."
        );
      }
      const ref = canvasRef;
      const now = new Date().toISOString();

      // Create-from-scratch: a canvasRef to a not-yet-existent file starts from a fresh empty board
      // (identical to File→New) instead of 404ing — closing the human/agent board-creation parity gap.
      const existing = await getCanvasDoc(ref);
      const created = existing === null;
      const stem = ref.split("/").pop()?.replace(/\.(canvas|json)$/, "") ?? "board";
      const doc = existing ?? emptyBoard(stem, now);
      // A brand-new board has no prior get_board, so stamp the echoed briefId to keep the round non-stale.
      if (created) doc.flowcanvas.session.lastBriefId = response.briefId;

      const { next, report } = applyResponse(
        doc,
        response as unknown as AgentResponse,
        (prefix) => prefix + rid(),
        now
      );

      // #7/#8 — first extraction (the board was empty) → auto-arrange the merged board into readable
      // type bands server-side, mirroring the client importDoc / applyResponse path (the Zustand
      // organizeByType never runs for an MCP apply). Skipped (idempotent) for an incremental round on
      // an already-populated board, so it never disturbs an operator's existing arrangement.
      if (doc.nodes.length === 0 && next.nodes.length > 0) {
        const { positions, sizes } = organizeByType(next.nodes, next.flowcanvas.session.coreDocPath);
        next.nodes = next.nodes.map((n) => ({
          ...n,
          ...(positions[n.id] ? { x: positions[n.id].x, y: positions[n.id].y } : null),
          ...(sizes[n.id] ? { width: sizes[n.id].width, height: sizes[n.id].height } : null),
        }));
      }

      // Write generated files before persisting the canvas so the next resolve has them
      for (const gf of response.generatedFiles ?? []) {
        await apiPost<{ ok: true }>("/api/file", { path: gf.path, content: gf.content });
      }

      // Persist the merged canvas (server bumps the revision)
      const { revision } = await apiPost<{ ok: true; revision: number }>("/api/canvas", {
        path: ref,
        doc: next,
      });

      // Surface a newly-created board to the app by pointing the active-board pointer at it, so the
      // operator can open and iterate on what the agent just generated. An edit to an existing board
      // leaves the active pointer untouched (it never yanks the operator off the board they have open).
      if (created) {
        await apiPost("/api/canvas/active", {
          canvasRef: ref,
          baseRevision: revision,
          intent: next.flowcanvas.session.intent ?? "",
        }).catch((e) => console.error("apply_response: failed to set active board:", e));
      }

      return { content: [{ type: "text" as const, text: JSON.stringify(report) }] };
    } catch (e) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: String(e) }) }],
        isError: true,
      };
    }
  }
);

// ── Tool 3: read_file ───────────────────────────────────────────────────────

server.registerTool(
  "read_file",
  {
    description:
      "Read the raw content of a file by its root-relative path via the guarded /api/file route.",
    inputSchema: {
      path: z.string().describe("Root-relative path to the file (e.g. 'docs/overview.md')."),
    },
  },
  async ({ path }) => {
    try {
      const { content } = await apiGet<{ content: string }>(
        `/api/file?path=${encodeURIComponent(path)}`
      );
      return { content: [{ type: "text" as const, text: JSON.stringify({ content }) }] };
    } catch (e) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: String(e) }) }],
        isError: true,
      };
    }
  }
);

// ── Tool 4: write_file ──────────────────────────────────────────────────────

server.registerTool(
  "write_file",
  {
    description:
      "Write content to a .md or .mdx file via the guarded /api/file route. " +
      "Non-.md/.mdx paths are rejected server-side.",
    inputSchema: {
      path: z
        .string()
        .describe("Root-relative path; must end in .md or .mdx (e.g. 'docs/overview.md')."),
      content: z
        .string()
        .describe("Full file content including YAML frontmatter."),
    },
  },
  async ({ path, content }) => {
    try {
      const result = await apiPost<{ ok: true }>("/api/file", { path, content });
      return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
    } catch (e) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: String(e) }) }],
        isError: true,
      };
    }
  }
);

// ── Tool 5: list_dir ────────────────────────────────────────────────────────

server.registerTool(
  "list_dir",
  {
    description:
      "List directory entries under FLOWCANVAS_ROOT via /api/files. " +
      "Returns an array of DirEntry objects (name, path, type, ext).",
    inputSchema: {
      path: z
        .string()
        .optional()
        .describe(
          "Root-relative directory path to list. Defaults to the project root ('.')."
        ),
    },
  },
  async ({ path }) => {
    try {
      const p = path ?? ".";
      const { entries } = await apiGet<{ entries: DirEntry[] }>(
        `/api/files?path=${encodeURIComponent(p)}`
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(entries) }] };
    } catch (e) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: String(e) }) }],
        isError: true,
      };
    }
  }
);

// ── Tool 6: resolve_paths ───────────────────────────────────────────────────

server.registerTool(
  "resolve_paths",
  {
    description:
      "Resolve one or more root-relative file paths via /api/canvas/resolve. " +
      "Returns ResolvedFile objects with frontmatter and body for markdown files.",
    inputSchema: {
      paths: z
        .array(z.string())
        .describe("List of root-relative file paths to resolve (e.g. ['docs/a.md', 'docs/b.md'])."),
    },
  },
  async ({ paths }) => {
    try {
      const { resolved } = await apiPost<{ resolved: ResolvedFile[] }>(
        "/api/canvas/resolve",
        { paths }
      );
      return { content: [{ type: "text" as const, text: JSON.stringify(resolved) }] };
    } catch (e) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: String(e) }) }],
        isError: true,
      };
    }
  }
);

// ── Tool 7: get_active_board ────────────────────────────────────────────────
// Reads the active-board pointer written by the app on load/openBoard (Phase 4).
// The harness calls this first to discover which board is currently open.

server.registerTool(
  "get_active_board",
  {
    description:
      "Read the active-board pointer written by the Flowcanvas app on load/openBoard. " +
      "Returns { canvasRef, baseRevision, intent }. " +
      "Returns an error if no board is open.",
    inputSchema: {},
  },
  async () => {
    try {
      const data = await apiGet<ActiveBoard | { active: null }>("/api/canvas/active");
      if ("active" in data) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: "No active board — open a board in Flowcanvas first, then retry.",
              }),
            },
          ],
          isError: true,
        };
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(data) }] };
    } catch (e) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: String(e) }) }],
        isError: true,
      };
    }
  }
);

// ── Tool 8: get_generation_kit ──────────────────────────────────────────────
// 004 — the load-bearing kit surface. Returns the full Agent Generation Kit (system prompt +
// schema contracts + MCP loop how-to + worked example) from the single-source buildKit(). Pass
// markdownPath to attach that document (read via the guarded /api/file route) as the doc-to-convert.

server.registerTool(
  "get_generation_kit",
  {
    description:
      "Return the full Flowcanvas Agent Generation Kit (system prompt + schema contracts + MCP loop " +
      "how-to + worked example). Pass markdownPath to attach that document as the payload to convert.",
    inputSchema: {
      markdownPath: z
        .string()
        .optional()
        .describe(
          "Root-relative .md/.mdx to attach as the doc-to-convert; omit for the base kit."
        ),
    },
  },
  async ({ markdownPath }) => {
    try {
      const md = markdownPath
        ? (await apiGet<{ content: string }>(`/api/file?path=${encodeURIComponent(markdownPath)}`)).content
        : undefined;
      return { content: [{ type: "text" as const, text: buildKit(md) }] };
    } catch (e) {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ error: String(e) }) }],
        isError: true,
      };
    }
  }
);

// ── Resource: flowcanvas://generation-kit ─────────────────────────────────────
// 004 — passive discovery. The base, payload-less kit served as a static-URI resource
// (registerResource signature verified against @modelcontextprotocol/sdk@1.29.0 — design Q1).

server.registerResource(
  "generation-kit",
  "flowcanvas://generation-kit",
  {
    title: "Flowcanvas Agent Generation Kit",
    description: "Turn a markdown design doc into a typed system-design .canvas",
    mimeType: "text/markdown",
  },
  async (uri) => ({
    contents: [{ uri: uri.href, mimeType: "text/markdown", text: buildKit() }],
  })
);

// ── Startup ─────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`Flowcanvas MCP server running on stdio (base: ${BASE})`);
}

main().catch((e) => {
  console.error("Fatal error in Flowcanvas MCP server:", e);
  process.exit(1);
});

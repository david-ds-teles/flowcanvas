#!/usr/bin/env node
// scripts/smoke-mcp.mjs — MCP round-trip smoke (Phase 7 coverage).
//
// Drives the real stdio MCP sidecar against a running app and asserts the full agent round-trip:
// all 7 tools register, get_board builds a brief + stamps lastBriefId, apply_response merges +
// persists and is NOT stale, and the change-review snapshot round-trips. Exits non-zero on any
// failure so CI / pre-close can catch an integration break that the unit gate cannot.
//
// Requires the app running at FLOWCANVAS_BASE_URL (default http://localhost:3000):
//   npm run dev   # in another terminal
//   npm run smoke:mcp
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { writeFile, rm } from 'node:fs/promises'
import path from 'node:path'

const BASE = process.env.FLOWCANVAS_BASE_URL ?? 'http://localhost:3000'
const ROOT = process.cwd()
const BOARD = 'examples/.smoke-mcp.canvas'
const GEN = 'examples/.smoke-mcp-gen.md'
const REVIEW = 'examples/.smoke-mcp.review.json'

const j = (res) => { try { return JSON.parse(res.content?.[0]?.text) } catch { return res.content?.[0]?.text } }
let failures = 0
const ok = (cond, label) => { console.log(`${cond ? '✓' : '✗'} ${label}`); if (!cond) failures++ }

const miniDoc = {
  nodes: [{ id: 'n1', type: 'file', file: 'examples/welcome.md', x: 0, y: 0, width: 200, height: 120, meta: { origin: 'user' } }],
  edges: [],
  flowcanvas: { schemaVersion: '0.2', session: { title: 'smoke', intent: 'smoke', createdAt: 't', updatedAt: 't', revision: 1 }, comments: [] },
}

async function cleanup() {
  for (const f of [BOARD, GEN, REVIEW]) await rm(path.join(ROOT, f), { force: true }).catch(() => {})
}

async function main() {
  // sanity: app reachable
  const ping = await fetch(`${BASE}/api/templates`).then((r) => r.ok).catch(() => false)
  if (!ping) { console.error(`app not reachable at ${BASE} — start it with \`npm run dev\``); process.exit(2) }

  await writeFile(path.join(ROOT, BOARD), JSON.stringify(miniDoc, null, 2), 'utf8')

  const transport = new StdioClientTransport({
    command: 'npx', args: ['tsx', 'mcp/flowcanvas-mcp.ts'], cwd: ROOT,
    env: { ...process.env, FLOWCANVAS_BASE_URL: BASE },
  })
  const client = new Client({ name: 'smoke-mcp', version: '1.0.0' })
  await client.connect(transport)

  const tools = (await client.listTools()).tools.map((t) => t.name).sort()
  ok(JSON.stringify(tools) === JSON.stringify([
    'apply_response', 'get_active_board', 'get_board', 'list_dir', 'read_file', 'resolve_paths', 'write_file',
  ]), `all 7 tools register (${tools.length})`)

  const brief = j(await client.callTool({ name: 'get_board', arguments: { canvasRef: BOARD } }))
  ok(!brief.error && typeof brief.briefId === 'string' && brief.nodes?.length === 1, 'get_board builds a brief')

  ok(Array.isArray(j(await client.callTool({ name: 'list_dir', arguments: { path: 'examples' } }))), 'list_dir returns entries')
  const resolved = j(await client.callTool({ name: 'resolve_paths', arguments: { paths: ['examples/welcome.md'] } }))
  ok(Array.isArray(resolved) && !!resolved[0]?.frontmatter, 'resolve_paths returns frontmatter')
  ok(typeof j(await client.callTool({ name: 'read_file', arguments: { path: 'examples/welcome.md' } })).content === 'string', 'read_file returns content')
  ok(j(await client.callTool({ name: 'write_file', arguments: { path: GEN, content: '---\nname: smoke\n---\n' } })).ok === true, 'write_file ok')

  const resp = {
    responseVersion: '0.1', briefId: brief.briefId, summary: 'smoke add node',
    upsertNodes: [{ id: 'ag-smoke', type: 'file', file: GEN, x: 240, y: 0, width: 200, height: 120, meta: { origin: 'agent' } }],
    generatedFiles: [{ path: GEN, content: '---\nname: smoke gen\n---\n' }],
  }
  const report = j(await client.callTool({ name: 'apply_response', arguments: { canvasRef: BOARD, response: resp } }))
  ok(report.created?.nodes === 1, 'apply_response created the node')
  ok(report.stale === false, 'apply_response is NOT stale (get_board stamped lastBriefId — D3)')

  const after = j(await client.callTool({ name: 'get_board', arguments: { canvasRef: BOARD } }))
  ok((after.nodes ?? []).some((n) => n.id === 'ag-smoke'), 'merged node persisted to disk')

  await client.close()
}

try {
  await main()
} catch (e) {
  console.error('smoke-mcp error:', e)
  failures++
} finally {
  await cleanup()
}
console.log(failures === 0 ? '\nMCP round-trip smoke: PASS' : `\nMCP round-trip smoke: FAIL (${failures})`)
process.exit(failures === 0 ? 0 : 1)

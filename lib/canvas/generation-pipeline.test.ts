import { describe, it, expect } from 'vitest'
import { applyResponse } from './brief'
import type { AgentResponse } from './brief'
import { organizeByType } from './layout'
import type { FlowcanvasDoc } from './jsoncanvas'

// Exercises the EXACT pipeline the MCP apply_response sidecar runs on a first extraction:
//   applyResponse(emptyBoard, response)  →  organizeByType(next.nodes)
// with an agent response that FOLLOWS THE FIXED CONTRACT (writes the core spec doc, cites only that
// doc, labels every node). Proves the server produces a spec-backed, type-banded board from a real
// agent response — the link the hand-authored board never tested.

function emptyBoard(): FlowcanvasDoc {
  return { nodes: [], edges: [], flowcanvas: { schemaVersion: '0.3', session: { createdAt: 't', updatedAt: 't', revision: 0 }, comments: [] } }
}

const response = {
  responseVersion: '0.1', briefId: 'b1', summary: 'extract order system',
  upsertNodes: [
    { id: 'ag-user', type: 'file', file: 'board.nodes/user.md', label: 'Customer', kind: 'actor', source: { path: 'board.md', anchor: 'overview' }, x: 0, y: 0, width: 200, height: 120 },
    { id: 'ag-svc', type: 'file', file: 'board.nodes/checkout.md', label: 'Checkout', kind: 'service', source: { path: 'board.md', anchor: 'order-lifecycle' }, x: 0, y: 0, width: 220, height: 140 },
    { id: 'ag-db', type: 'file', file: 'board.nodes/orders.md', label: 'Orders DB', kind: 'datastore', source: { path: 'board.md', anchor: 'order-lifecycle' }, x: 0, y: 0, width: 220, height: 140 },
  ],
  upsertEdges: [{ id: 'ag-e', fromNode: 'ag-svc', toNode: 'ag-db', rel: 'produces', label: 'writes' }],
  generatedFiles: [
    // the contract REQUIRES the core spec doc to be written (this is what the old worked example omitted)
    { path: 'board.md', content: '---\ntitle: Orders\n---\n## Overview\n## Order lifecycle\nCheckout writes Orders DB.' },
    { path: 'board.nodes/checkout.md', content: '---\nname: Checkout\ndescription: accepts orders\nsource:\n  path: board.md\n  anchor: order-lifecycle\n---\n' },
  ],
} as unknown as AgentResponse

describe('MCP generation pipeline (apply_response merge + first-extraction auto-arrange)', () => {
  it('produces a spec-backed board: every node cites the ONE core doc the agent actually wrote', () => {
    const { next } = applyResponse(emptyBoard(), response, (p) => p + 'x', 't')
    const cited = [...new Set(next.nodes.map((n) => n.meta?.source?.path).filter(Boolean))]
    expect(cited).toEqual(['board.md'])                                              // single core spec, not a phantom
    expect(response.generatedFiles!.some((f) => f.path === 'board.md')).toBe(true)   // and it IS written to disk
    expect(next.nodes.every((n) => !!n.meta?.kind)).toBe(true)                       // every node is typed
  })

  it('auto-arranges the first extraction into left→right type bands (actor → service → datastore)', () => {
    const { next } = applyResponse(emptyBoard(), response, (p) => p + 'x', 't')
    const { positions } = organizeByType(next.nodes)                                 // the sidecar's first-extraction step
    const x = (id: string) => positions[id].x
    expect(x('ag-user')).toBeLessThan(x('ag-svc'))
    expect(x('ag-svc')).toBeLessThan(x('ag-db'))
  })
})

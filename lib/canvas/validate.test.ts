import { describe, it, expect } from 'vitest'
import { parseFlowcanvasDoc } from './validate'
import type { FlowcanvasDoc } from './jsoncanvas'

const docAt = (schemaVersion: string, nodes: unknown[] = []): unknown => ({
  nodes,
  edges: [],
  flowcanvas: {
    schemaVersion,
    session: { createdAt: '2026-01-01', updatedAt: '2026-01-01', revision: 0 },
    comments: [],
  },
})

const groupNode = (extra: Record<string, unknown> = {}) => ({
  id: 'g', type: 'group', x: 0, y: 0, width: 9, height: 9, ...extra,
})
const fileNode = (extra: Record<string, unknown> = {}) => ({
  id: 'f', type: 'file', file: 'a.md', x: 0, y: 0, width: 9, height: 9, ...extra,
})

describe('parseFlowcanvasDoc', () => {
  it('accepts valid 0.1 / 0.2 / 0.3 / 0.4 / 0.5 docs', () => {
    for (const v of ['0.1', '0.2', '0.3', '0.4', '0.5']) {
      const doc = parseFlowcanvasDoc(docAt(v)) as FlowcanvasDoc
      expect(doc.flowcanvas.schemaVersion).toBe(v)
    }
  })

  it('preserves 006 port/edgeType fields via .passthrough() (0.5)', () => {
    const doc = parseFlowcanvasDoc({
      nodes: [fileNode({ meta: { ports: [{ id: 'p1', side: 'right', t: 0.5 }] } })],
      edges: [{ id: 'e1', fromNode: 'f', toNode: 'f', fromPort: 'p1', toPort: 'p1', meta: { edgeType: 'request' } }],
      flowcanvas: {
        schemaVersion: '0.5',
        session: { createdAt: '2026-01-01', updatedAt: '2026-01-01', revision: 0 },
        comments: [],
      },
    }) as FlowcanvasDoc
    expect(doc.edges[0].fromPort).toBe('p1')
    expect(doc.edges[0].toPort).toBe('p1')
    expect(doc.edges[0].meta?.edgeType).toBe('request')
    expect(doc.nodes[0].meta?.ports).toEqual([{ id: 'p1', side: 'right', t: 0.5 }])
  })

  it('accepts a known ComponentKind on a leaf node and boundary on a group', () => {
    expect(() => parseFlowcanvasDoc(docAt('0.3', [fileNode({ meta: { kind: 'service' } })]))).not.toThrow()
    expect(() => parseFlowcanvasDoc(docAt('0.3', [groupNode({ meta: { kind: 'boundary' } })]))).not.toThrow()
  })

  it('rejects malformed JSON / non-doc input', () => {
    expect(() => parseFlowcanvasDoc(null)).toThrow()
    expect(() => parseFlowcanvasDoc({ nodes: 'nope' })).toThrow()
    expect(() => parseFlowcanvasDoc(docAt('0.9'))).toThrow()   // unknown schemaVersion
  })

  it('rejects an unknown ComponentKind', () => {
    expect(() => parseFlowcanvasDoc(docAt('0.3', [fileNode({ meta: { kind: 'gateway' } })]))).toThrow()
  })

  it("rejects meta.kind:'boundary' on a non-group node (Q3)", () => {
    expect(() => parseFlowcanvasDoc(docAt('0.3', [fileNode({ meta: { kind: 'boundary' } })])))
      .toThrow(/boundary/)
  })
})

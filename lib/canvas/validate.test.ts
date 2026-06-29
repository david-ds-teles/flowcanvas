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
  it('accepts valid 0.1 / 0.2 / 0.3 docs', () => {
    for (const v of ['0.1', '0.2', '0.3']) {
      const doc = parseFlowcanvasDoc(docAt(v)) as FlowcanvasDoc
      expect(doc.flowcanvas.schemaVersion).toBe(v)
    }
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

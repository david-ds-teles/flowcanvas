import { describe, it, expect } from 'vitest'
import type { FlowcanvasDoc } from './jsoncanvas'
import { toReactFlow, toJSONCanvas, colorVar } from './adapter'

// design § Data Models — Worked example (subset: 2 markdown + 1 image + 1 note, 2 edges).
const doc: FlowcanvasDoc = {
  nodes: [
    {
      id: 'n-design', type: 'file', file: 'mdview/001-initial-architecture-design.md',
      x: -480, y: -200, width: 380, height: 320, color: '5',
      meta: {
        origin: 'user', collapsed: false,
        frontmatter: { name: '001-initial-architecture-design', status: 'approved', tags: ['design'], links: ['mdview/001-initial-architecture-plan.md'] },
      },
    },
    {
      id: 'n-plan', type: 'file', file: 'mdview/001-initial-architecture-plan.md',
      x: 40, y: -200, width: 380, height: 320,
      meta: { origin: 'user', frontmatter: { name: '001-initial-architecture-plan', status: 'active', links: [] } },
    },
    { id: 'n-arch-img', type: 'file', file: 'docs/architecture.png', x: 40, y: 200, width: 380, height: 240, meta: { origin: 'user' } },
    { id: 'n-note', type: 'text', text: '## Open question\nShould the canvas store get its own slice?', x: -480, y: 200, width: 320, height: 160, color: '#5ef2ff', meta: { origin: 'user' } },
  ],
  edges: [
    { id: 'lk:n-design->n-plan', fromNode: 'n-design', toNode: 'n-plan', fromSide: 'right', toSide: 'left', toEnd: 'arrow', label: 'links', color: '6', meta: { origin: 'links' } },
    { id: 'e-user-1', fromNode: 'n-plan', toNode: 'n-arch-img', fromSide: 'bottom', toSide: 'top', toEnd: 'arrow', label: 'realizes', meta: { origin: 'user' } },
  ],
  flowcanvas: {
    schemaVersion: '0.1',
    session: { title: 'mdview 001', intent: 'map', createdAt: '2026-06-25T10:00:00Z', updatedAt: '2026-06-25T10:42:00Z', revision: 7 },
    comments: [],
  },
}

describe('adapter / colorVar', () => {
  it('resolves all six JSONCanvas presets and passes hex through', () => {
    expect(colorVar('1')).toBe('#ff516a')   // red
    expect(colorVar('2')).toBe('#f59f00')   // orange
    expect(colorVar('3')).toBe('#e3b341')   // yellow
    expect(colorVar('4')).toBe('#b6f36a')   // green
    expect(colorVar('5')).toBe('#5ef2ff')   // cyan
    expect(colorVar('6')).toBe('#a371f7')   // purple
    expect(colorVar('#abcdef')).toBe('#abcdef')
    expect(colorVar(undefined)).toBeUndefined()
  })
})

describe('adapter / toReactFlow', () => {
  it('discriminates node kind from type + extension', () => {
    const { nodes } = toReactFlow(doc)
    expect(nodes.find((n) => n.id === 'n-design')!.type).toBe('markdown')
    expect(nodes.find((n) => n.id === 'n-arch-img')!.type).toBe('image')
    expect(nodes.find((n) => n.id === 'n-note')!.type).toBe('note')
  })

  it('maps geometry and carries the source node in data', () => {
    const { nodes } = toReactFlow(doc)
    const md = nodes.find((n) => n.id === 'n-design')!
    expect(md.position).toEqual({ x: -480, y: -200 })
    expect(md.width).toBe(380)
    expect(md.height).toBeUndefined() // markdown is content-sized so the collapse toggle shrinks the card
    expect((md.style as Record<string, string>)['--fc-body-max']).toBe('232px') // authored 320 − 88 chrome
    expect((md.data as { node: { id: string } }).node.id).toBe('n-design')
  })

  it('keeps the authored box for non-markdown nodes', () => {
    const img = toReactFlow(doc).nodes.find((n) => n.id === 'n-arch-img')!
    expect(img.width).toBe(380)
    expect(img.height).toBe(240) // image/note/link/group are not auto-sized
  })

  it('maps edges with origin in data, label, and an arrow marker', () => {
    const lk = toReactFlow(doc).edges.find((e) => e.id === 'lk:n-design->n-plan')!
    expect(lk.source).toBe('n-design')
    expect(lk.target).toBe('n-plan')
    expect(lk.type).toBe('labeled')
    expect(lk.label).toBe('links')
    expect((lk.data as { origin: string }).origin).toBe('links')
    expect(lk.markerEnd).toBeTruthy()
  })
})

describe('adapter / round-trip', () => {
  it('toJSONCanvas(toReactFlow(doc)) preserves node ids, positions, and meta', () => {
    const { nodes, edges } = toReactFlow(doc)
    const back = toJSONCanvas(nodes, edges, doc)
    expect(back.nodes.map((n) => n.id)).toEqual(doc.nodes.map((n) => n.id))
    for (const orig of doc.nodes) {
      const rt = back.nodes.find((n) => n.id === orig.id)!
      expect({ x: rt.x, y: rt.y }).toEqual({ x: orig.x, y: orig.y })
      expect(rt.meta).toEqual(orig.meta)
    }
  })

  it('preserves edge origin provenance through the round-trip', () => {
    const { nodes, edges } = toReactFlow(doc)
    const back = toJSONCanvas(nodes, edges, doc)
    expect(back.edges.find((e) => e.id === 'lk:n-design->n-plan')!.meta?.origin).toBe('links')
    expect(back.edges.find((e) => e.id === 'e-user-1')!.meta?.origin).toBe('user')
  })

  it('preserves edge color/toEnd that React Flow state does not model', () => {
    const { nodes, edges } = toReactFlow(doc)
    const back = toJSONCanvas(nodes, edges, doc)
    const lk = back.edges.find((e) => e.id === 'lk:n-design->n-plan')!
    expect(lk.color).toBe('6')        // dropped before the prevEdgeById fix
    expect(lk.toEnd).toBe('arrow')
    expect(lk.fromSide).toBe('right') // geometry comes back from RF handles
    expect(lk.toSide).toBe('left')
  })

  it('keeps session + schema metadata untouched', () => {
    const { nodes, edges } = toReactFlow(doc)
    const back = toJSONCanvas(nodes, edges, doc)
    expect(back.flowcanvas).toBe(doc.flowcanvas)
    expect(back.flowcanvas.session.revision).toBe(7)
  })
})

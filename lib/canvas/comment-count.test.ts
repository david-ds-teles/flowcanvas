import { describe, expect, it } from 'vitest'
import { selectNodeCommentCount } from './store'
import type { Comment } from './jsoncanvas'

type SelectorState = Parameters<ReturnType<typeof selectNodeCommentCount>>[0]

const nodeAnchor = (nodeId: string): Comment['anchor'] => ({ kind: 'node', nodeId, offsetX: 0, offsetY: 0 })
const root = (id: string, nodeId: string, resolved = false): Comment =>
  ({ id, anchor: nodeAnchor(nodeId), parentId: null, author: 'human:you', text: 't', createdAt: '', resolvedAt: resolved ? '2026-01-01' : null })

const stateWith = (comments: Comment[]) =>
  ({ doc: { nodes: [], edges: [], flowcanvas: { schemaVersion: '0.2', session: { createdAt: '', updatedAt: '', revision: 0 }, comments } } }) as unknown as SelectorState

describe('selectNodeCommentCount', () => {
  it('counts only UNRESOLVED ROOT node-anchored comments for the given node', () => {
    const s = stateWith([
      root('c1', 'n1'),
      root('c2', 'n1'),
      { ...root('c3', 'n1'), parentId: 'c1' },                            // a reply → excluded
      root('c4', 'n1', true),                                            // resolved → excluded
      root('c5', 'n2'),                                                  // other node
      { ...root('c6', 'n1'), anchor: { kind: 'canvas', x: 0, y: 0 } },    // canvas anchor → excluded
    ])
    expect(selectNodeCommentCount('n1')(s)).toBe(2)
    expect(selectNodeCommentCount('n2')(s)).toBe(1)
    expect(selectNodeCommentCount('n3')(s)).toBe(0)
  })

  it('returns a primitive 0 when no doc is loaded', () => {
    expect(selectNodeCommentCount('n1')({ doc: null } as unknown as SelectorState)).toBe(0)
  })
})

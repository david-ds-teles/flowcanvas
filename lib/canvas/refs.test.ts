import { describe, it, expect } from 'vitest'
import { extractRefs } from './refs'
import type { DocRef } from './refs'

// extractRefs (Decision 9) — pure reference extraction over frontmatter links: + body links/images.
// Frontmatter links: are root-relative (flowcode convention); body ./ ../ links resolve against the
// source file's directory; http(s) URLs are flagged external; #anchors captured; identical refs dedup.

describe('extractRefs', () => {
  it('reads a frontmatter links: entry with an anchor (root-relative, not resolved against basePath)', () => {
    const refs = extractRefs('plans/design.md', { links: ['plans/plan.md#phase-1'] }, undefined)
    expect(refs).toEqual<DocRef[]>([
      { kind: 'frontmatter', target: 'plans/plan.md', anchor: 'phase-1', isExternal: false },
    ])
  })

  it('resolves a body relative link (../) against the source file directory and captures its anchor', () => {
    const refs = extractRefs('plans/sub/design.md', undefined, 'see [x](../sib/x.md#h)')
    expect(refs).toEqual<DocRef[]>([
      { kind: 'link', target: 'plans/sib/x.md', anchor: 'h', isExternal: false },
    ])
  })

  it('resolves a body ./ relative link against the source file directory', () => {
    const refs = extractRefs('plans/design.md', undefined, 'see [the plan](./plan.md)')
    expect(refs).toEqual<DocRef[]>([
      { kind: 'link', target: 'plans/plan.md', anchor: undefined, isExternal: false },
    ])
  })

  it('classifies an image embed as kind:image', () => {
    const refs = extractRefs('plans/design.md', undefined, '![arch](../assets/arch.png)')
    expect(refs).toEqual<DocRef[]>([
      { kind: 'image', target: 'assets/arch.png', anchor: undefined, isExternal: false },
    ])
  })

  it('flags an http(s) URL as external and keeps it verbatim (anchor split off)', () => {
    const refs = extractRefs('plans/design.md', undefined, '[RF](https://reactflow.dev/learn#install)')
    expect(refs).toEqual<DocRef[]>([
      { kind: 'link', target: 'https://reactflow.dev/learn', anchor: 'install', isExternal: true },
    ])
  })

  it('skips pure in-document anchor links (#heading)', () => {
    const refs = extractRefs('plans/design.md', undefined, 'jump to [here](#heading)')
    expect(refs).toEqual<DocRef[]>([])
  })

  it('dedups identical (kind,target,anchor) refs', () => {
    const refs = extractRefs(
      'plans/design.md',
      { links: ['plans/plan.md', 'plans/plan.md'] },
      '[a](./plan.md) and again [b](./plan.md)',
    )
    expect(refs).toEqual<DocRef[]>([
      { kind: 'frontmatter', target: 'plans/plan.md', anchor: undefined, isExternal: false },
      { kind: 'link', target: 'plans/plan.md', anchor: undefined, isExternal: false },
    ])
  })

  it('ignores non-string / blank frontmatter links and a missing links: key', () => {
    expect(extractRefs('a.md', {}, undefined)).toEqual([])
    expect(extractRefs('a.md', { links: ['', '   ', 42 as unknown as string] }, undefined)).toEqual([])
  })

  it('worked example from the plan — frontmatter + body link + image + external URL', () => {
    const refs = extractRefs(
      'plans/design.md',
      { links: ['plans/plan.md#phase-1'] },
      'See [the plan](./plan.md) and ![arch](../assets/arch.png) and [RF](https://reactflow.dev).',
    )
    expect(refs).toEqual<DocRef[]>([
      { kind: 'frontmatter', target: 'plans/plan.md', anchor: 'phase-1', isExternal: false },
      { kind: 'link', target: 'plans/plan.md', anchor: undefined, isExternal: false },
      { kind: 'image', target: 'assets/arch.png', anchor: undefined, isExternal: false },
      { kind: 'link', target: 'https://reactflow.dev', anchor: undefined, isExternal: true },
    ])
  })
})

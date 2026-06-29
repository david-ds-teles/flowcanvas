import { describe, it, expect } from 'vitest'
import { kitSections, buildKit } from './generation-kit'
import { COMPONENT_KINDS } from './jsoncanvas'

describe('generation-kit', () => {
  it('kitSections returns four non-empty sections', () => {
    const k = kitSections()
    expect(k.systemPrompt.length).toBeGreaterThan(0)
    expect(k.schemaContract.length).toBeGreaterThan(0)
    expect(k.mcpHowTo.length).toBeGreaterThan(0)
    expect(k.workedExample.length).toBeGreaterThan(0)
  })

  it('schemaContract names every COMPONENT_KIND, the slug rule, and the boundary group-only line', () => {
    const c = kitSections().schemaContract
    for (const kind of COMPONENT_KINDS) expect(c).toContain(kind)
    expect(c).toContain('github-slug')
    expect(c).toMatch(/boundary.+GROUP-ONLY|GROUP-ONLY/)
    expect(c).toContain('Allowed set: ' + COMPONENT_KINDS.join(', '))
  })

  it('buildKit(md) appends the markdown payload; buildKit() omits it', () => {
    const md = '## Order lifecycle\nCheckout calls Payments.'
    const withDoc = buildKit(md)
    expect(withDoc).toContain('Your document to convert')
    expect(withDoc).toContain(md)
    const base = buildKit()
    expect(base).not.toContain('Your document to convert')
  })

  it('buildKit renders all four numbered sections', () => {
    const base = buildKit()
    expect(base).toContain('## 1 · System prompt')
    expect(base).toContain('## 2 · Schema contract')
    expect(base).toContain('## 3 · MCP loop')
    expect(base).toContain('## 4 · Worked example')
  })
})

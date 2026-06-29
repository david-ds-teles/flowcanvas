import { describe, expect, it } from 'vitest'
import { nodeDisplayName } from './node-name'
import type { CanvasNode } from './jsoncanvas'

const base = { x: 0, y: 0, width: 1, height: 1 }

describe('nodeDisplayName', () => {
  it('group → label, falling back to "Group"', () => {
    expect(nodeDisplayName({ id: 'g', type: 'group', label: 'Core Services', ...base })).toBe('Core Services')
    expect(nodeDisplayName({ id: 'g', type: 'group', ...base } as CanvasNode)).toBe('Group')
  })

  it('link → url', () => {
    expect(nodeDisplayName({ id: 'l', type: 'link', url: 'https://x.dev/docs', ...base })).toBe('https://x.dev/docs')
  })

  it('text (note) → first line capped, falling back to "Note"', () => {
    expect(nodeDisplayName({ id: 't', type: 'text', text: 'hello\nworld', ...base })).toBe('hello')
    expect(nodeDisplayName({ id: 't', type: 'text', text: 'a'.repeat(80), ...base })).toBe('a'.repeat(50))
    expect(nodeDisplayName({ id: 't', type: 'text', text: '', ...base })).toBe('Note')
  })

  it('markdown file → frontmatter.name, else basename', () => {
    expect(nodeDisplayName({ id: 'f', type: 'file', file: 'docs/auth-service.md', meta: { frontmatter: { name: 'Auth Service' } }, ...base })).toBe('Auth Service')
    expect(nodeDisplayName({ id: 'f', type: 'file', file: 'docs/auth-service.md', ...base })).toBe('auth-service.md')
  })

  it('non-markdown file → basename', () => {
    expect(nodeDisplayName({ id: 'f', type: 'file', file: 'img/diagram.png', ...base })).toBe('diagram.png')
  })
})

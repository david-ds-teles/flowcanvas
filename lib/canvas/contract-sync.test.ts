// contract-sync.test.ts — the "visible sync" guard. The MCP serves the contract live from
// kitSections(); the committed docs/flowcanvas-agent-contract.md must never silently drift from it.
// If this fails: run `npm run gen:contract`.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildContractDoc, kitSections } from './generation-kit'

describe('agent contract sync', () => {
  it('committed contract doc equals buildContractDoc() (no drift)', () => {
    const committed = readFileSync(resolve(process.cwd(), 'docs/flowcanvas-agent-contract.md'), 'utf8')
    expect(committed).toBe(buildContractDoc())
  })

  it('the schema contract front-loads the load-bearing visual rules', () => {
    const c = kitSections().schemaContract
    expect(c).toContain('RETURN CHECKLIST')
    expect(c).toMatch(/parentId/)
    expect(c).toMatch(/fromEnd\/toEnd OMITTED/)
  })
})

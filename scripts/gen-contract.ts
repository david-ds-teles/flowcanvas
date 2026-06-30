// scripts/gen-contract.ts — regenerate docs/flowcanvas-agent-contract.md from the single source of
// truth (buildContractDoc() in lib/canvas/generation-kit.ts). Run: npm run gen:contract.
// contract-sync.test.ts fails CI if the committed file drifts from this output.
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildContractDoc } from '../lib/canvas/generation-kit'

const out = resolve(process.cwd(), 'docs/flowcanvas-agent-contract.md')
writeFileSync(out, buildContractDoc(), 'utf8')
console.log(`wrote ${out}`)

import { defineConfig } from 'vitest/config'
import path from 'node:path'

// Unit-test runner for the pure modules (adapter, edges, brief) AND the HTTP route contracts
// (app/api/**) added in Phase 7 — route handlers are imported and invoked directly with a real
// NextRequest, so a silently-broken route fails the gate instead of passing as "green static". Node
// environment — no DOM. Component tests still run via the headless-Chrome render smoke (scripts/).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts', 'app/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname) },
  },
})

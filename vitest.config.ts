import { defineConfig } from 'vitest/config'

// Unit-test runner for the pure modules (adapter, edges, brief). Node environment —
// the pure canvas logic has no DOM dependency. Component tests are out of scope for v0.1.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
})

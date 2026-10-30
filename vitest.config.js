import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    // Bound jsdom processes so the full suite does not exhaust memory or starve UI tests.
    maxWorkers: 2,
    setupFiles: ['./tests/setup.js'],
    restoreMocks: true,
    clearMocks: true,
    coverage: { enabled: false },
  },
})

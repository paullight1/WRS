import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'admin-console.spec.js',
  fullyParallel: true,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:5175',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev:admin',
    url: 'http://127.0.0.1:5175',
    reuseExistingServer: true,
    timeout: 30_000,
  },
})

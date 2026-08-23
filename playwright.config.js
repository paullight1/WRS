import { defineConfig, devices } from '@playwright/test'

const externalBaseURL = String(process.env.WRS_E2E_BASE_URL || '').replace(/\/$/, '')
const baseURL = externalBaseURL || 'http://127.0.0.1:5173'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
  ],
  webServer: externalBaseURL
    ? undefined
    : {
        command: 'npm run dev -- --host 127.0.0.1',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
})

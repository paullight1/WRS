import { defineConfig, devices } from '@playwright/test'

const baseURL = String(process.env.WRS_STAGING_URL || '').trim().replace(/\/$/, '')
if (!baseURL.startsWith('https://') || /localhost|127\.0\.0\.1|\.invalid/i.test(baseURL)) {
  throw new Error('WRS_STAGING_URL must be a real HTTPS staging deployment URL.')
}

export default defineConfig({
  testDir: './tests/staging',
  fullyParallel: false,
  forbidOnly: true,
  retries: 1,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-staging-report', open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },
  projects: [
    { name: 'staging-desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'staging-mobile-chromium', use: { ...devices['Pixel 7'] } },
  ],
})

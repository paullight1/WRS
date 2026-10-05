import { expect, test } from '@playwright/test'

const criticalRoutes = [
  '/',
  '/app',
  '/login',
  '/packages',
  '/wallet',
  '/deploy',
  '/settings',
  '/onboarding',
  '/robot',
  '/robot/passport',
]

for (const route of criticalRoutes) {
  test(`${route} renders without browser errors`, async ({ page }) => {
    const errors = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto(route)
    await expect(page.locator('body')).not.toBeEmpty()
    expect(errors).toEqual([])
  })
}

test('workspace hides demo labels and notices', async ({ page }) => {
  await page.goto('/wallet')
  await expect(page.getByRole('status', { name: 'Demo data' })).toHaveCount(0)
  await expect(page.locator('main')).not.toContainText(/\bdemo\b/i)
})

test('demo robot lifecycle persists onboarding, customization and passport state', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => window.localStorage.removeItem('wrs.demo.robot-state.v1'))
  await page.goto('/onboarding')

  await expect(page.getByRole('heading', { name: 'Set up your robot' })).toBeVisible()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByRole('heading', { name: /Select the package/i })).toBeVisible()
  await page.getByRole('button').filter({ hasText: 'Professional' }).filter({ hasText: '$100' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()

  const name = page.getByLabel('Robot name')
  await name.fill('WRS-E2E-ROBOT')
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByRole('heading', { name: 'Choose appearance' })).toBeVisible()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByRole('heading', { name: 'Pick a personality' })).toBeVisible()
  await page.getByRole('button', { name: 'Logical' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByRole('heading', { name: /Ready to provision WRS-E2E-ROBOT/ })).toBeVisible()
  await page.getByRole('button', { name: 'Create Robot' }).click()

  await expect(page).toHaveURL(/\/home$/)
  await expect(page.getByText('WRS-E2E-ROBOT').first()).toBeVisible()

  await page.goto('/robot/customize')
  await expect(page.getByText(/WRS-E2E-ROBOT/i)).toBeVisible()
  await page.getByRole('button', { name: 'Colors' }).click()
  await page.getByRole('button', { name: /Neon Genesis/i }).click()
  await page.getByRole('button', { name: 'Save Robot' }).click()
  await expect(page.getByText(/Configuration saved/i)).toBeVisible()

  await page.reload()
  await expect(page.getByText(/Neon Genesis/i).first()).toBeVisible()

  await page.goto('/robot/passport')
  await expect(page.getByRole('heading', { name: /Robot Passport/i })).toBeVisible()
  await expect(page.locator('main')).not.toContainText(/\bdemo\b/i)
  await expect(page.getByRole('button', { name: /PDF unavailable for passport/i })).toBeDisabled()
})

test('free onboarding creates a basic robot and preserves its tier after reload', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => window.localStorage.removeItem('wrs.demo.robot-state.v1'))
  await page.goto('/onboarding')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button').filter({ hasText: 'Basic Robot' }).filter({ hasText: 'Free' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByLabel('Robot name').fill('WRS-FREE-ROBOT')
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByText(/Logical · Basic Robot/)).toBeVisible()
  await page.getByRole('button', { name: 'Create Robot' }).click()
  await expect(page).toHaveURL(/\/home$/)
  await page.reload()
  await expect(page.getByText('WRS-FREE-ROBOT').first()).toBeVisible()
  await expect(page.getByText(/Basic Robot · free/)).toBeVisible()
})

test('training and data deep links are locked while Mining remains available', async ({ page }) => {
  for (const route of [
    '/training/voice',
    '/data/voice-recording',
    '/data/quality',
    '/wallet/data-revenue',
    '/marketplace',
    '/rewards/boosts',
    '/academy',
    '/community',
    '/referrals',
    '/packages/starter/checkout',
  ]) {
    await page.goto(route)
    await expect(page.getByText('This feature is locked', { exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Open Mining' })).toHaveAttribute('href', '/deploy')
  }
  await page.getByRole('link', { name: 'Open Mining' }).click()
  await expect(page).toHaveURL(/\/deploy$/)
  await expect(page.getByText('This feature is locked', { exact: true })).toHaveCount(0)
})

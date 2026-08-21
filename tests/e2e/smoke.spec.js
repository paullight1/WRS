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

test('application surfaces clearly identify demo data', async ({ page }) => {
  await page.goto('/wallet')
  await expect(page.getByText(/Demo data · illustrative only/i)).toBeVisible()
})

test('demo robot lifecycle persists onboarding, customization and passport state', async ({ page }) => {
  await page.addInitScript(() => window.localStorage.removeItem('wrs.demo.robot-state.v1'))
  await page.goto('/onboarding')

  await expect(page.getByRole('heading', { name: 'Set up your robot' })).toBeVisible()
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByRole('heading', { name: /Select the package/i })).toBeVisible()
  await page.getByRole('button', { name: /Professional Package/i }).click()
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
  await page.getByRole('button', { name: 'Create Demo Robot' }).click()

  await expect(page).toHaveURL(/\/home$/)
  await expect(page.getByText('WRS-E2E-ROBOT').first()).toBeVisible()

  await page.goto('/robot/customize')
  await expect(page.getByText(/WRS-E2E-ROBOT · demo state/i)).toBeVisible()
  await page.getByRole('button', { name: 'Colors' }).click()
  await page.getByRole('button', { name: /Neon Genesis/i }).click()
  await page.getByRole('button', { name: 'Save Robot' }).click()
  await expect(page.getByText(/Demo configuration stored on this device/i)).toBeVisible()

  await page.reload()
  await expect(page.getByText(/Neon Genesis/i).first()).toBeVisible()

  await page.goto('/robot/passport')
  await expect(page.getByRole('heading', { name: /Demo Robot Passport/i })).toBeVisible()
  await expect(page.getByText(/This is a local demo projection/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /PDF unavailable for demo passport/i })).toBeDisabled()
})
